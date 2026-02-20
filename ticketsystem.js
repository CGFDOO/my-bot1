const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ChannelType, 
    PermissionFlagsBits 
} = require('discord.js');

const discordTranscripts = require('discord-html-transcripts');
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    
    client.on('interactionCreate', async interaction => {

        // =====================================================================
        // ⭐ تشغيل زر الترانسكريبت المباشر (Direct Transcript)
        // =====================================================================
        if (interaction.isButton() && interaction.customId === 'direct_transcript_btn') {
            await interaction.deferReply({ ephemeral: true });
            
            // استخراج اسم التكت من رسالة اللوج
            const logMsg = interaction.message.content;
            const ticketName = logMsg.replace('**📄 Transcript for ', '').replace('**', '');
            
            // إرسال الملف في الخاص أو كرسالة مخفية
            try {
                const attachment = await discordTranscripts.createTranscript(interaction.channel, { limit: -1, returnType: 'attachment', filename: `${ticketName}.html`, saveImages: true });
                await interaction.editReply({ content: '**✅ Here is your transcript:**', files: [attachment] });
            } catch (err) {
                await interaction.editReply({ content: '**❌ Error generating transcript.**' });
            }
            return;
        }

        // (هنا أكواد النجوم واستلام التقييم زي ما هي بالظبط من الرسالة اللي فاتت.. أنا هركز على زراير التكتات)
        
        // =====================================================================
        // 🟢 فتح التكت وحل مشكلة الحد الأقصى
        // =====================================================================
        if (interaction.isButton() && interaction.customId.startsWith('ticket_open_')) {
            const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
            if (!config) return;

            const buttonRealId = interaction.customId.replace('ticket_open_', '');
            const targetButtonData = config.customButtons.find(b => b.id === buttonRealId);
            if (!targetButtonData) return interaction.reply({ content: '**❌ Button not available.**', ephemeral: true });

            // 🔥 فحص الحد الأقصى للتكتات المفتوحة فقط (اسمها يبدأ بـ ticket-)
            let maximumTickets = config.maxTicketsPerUser || 1;
            const existingOpenTickets = interaction.guild.channels.cache.filter(channel => {
                return channel.name.startsWith('ticket-') && channel.topic && channel.topic.startsWith(interaction.user.id);
            });
            
            if (existingOpenTickets.size >= maximumTickets) {
                return interaction.reply({ content: `**❌ You can only have ${maximumTickets} open ticket(s). Please wait for your old ticket to be deleted.**`, ephemeral: true });
            }

            if (targetButtonData.requireModal && targetButtonData.modalFields.length > 0) {
                const ticketModal = new ModalBuilder().setCustomId(`modalticket_${buttonRealId}`).setTitle(targetButtonData.modalTitle || 'Ticket Details');
                targetButtonData.modalFields.forEach((field, index) => {
                    const inputField = new TextInputBuilder().setCustomId(`field_${index}`).setLabel(field.label.substring(0, 45)).setStyle(TextInputStyle.Paragraph).setPlaceholder(field.placeholder || 'Type here...').setRequired(field.required === true || String(field.required) === 'true');
                    ticketModal.addComponents(new ActionRowBuilder().addComponents(inputField));
                });
                await interaction.showModal(ticketModal);
            } else {
                await openNewTicket(interaction, targetButtonData, config, []);
            }
        }

        // =====================================================================
        // ⚙️ أزرار التحكم: السرعة الصاروخية ومنع التقييم المزدوج للوساطة
        // =====================================================================
        if (interaction.isButton()) {
            const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
            if (!config) return;

            // 🔒 الإغلاق الفعلي
            if (interaction.customId === 'confirm_close') {
                await interaction.deferUpdate(); 
                
                let currentTopic = interaction.channel.topic || '';
                const topicParts = currentTopic.split('_');
                
                // Format: OwnerID_BtnID_ClaimerID_AddedUsers_CloserID_IsMediator
                const ticketOwnerId = topicParts[0];
                const usedBtnId = topicParts[1];
                let claimedByAdminId = (topicParts.length > 2 && topicParts[2] !== 'none') ? topicParts[2] : null;
                let isMediatorTicket = (topicParts.length > 5 && topicParts[5] === 'true');

                // 🔥 تغيير اسم الروم ليتمكن العضو من فتح تكت جديد فوراً
                let oldNameNumber = interaction.channel.name.split('-')[1] || '0';
                await interaction.channel.setName(`closed-${oldNameNumber}`).catch(()=>{});

                await interaction.channel.send(`**🔒 The ticket has been closed by <@${interaction.user.id}>**`);

                // 🔥 منع تقييم الإدارة إذا كان التكت وساطة
                let shouldSendStaffRating = true;
                if (isMediatorTicket) {
                    shouldSendStaffRating = false; // الوساطة تستخدم !done فقط
                } else {
                    const btnData = config.customButtons.find(b => b.id === usedBtnId);
                    if (btnData && btnData.enableRating === false) shouldSendStaffRating = false;
                }

                if (shouldSendStaffRating && ticketOwnerId && claimedByAdminId && config.staffRatingChannelId) {
                    try {
                        const ticketOwnerUser = await interaction.guild.members.fetch(ticketOwnerId);
                        const ratingEmbed = new EmbedBuilder();
                        
                        if (config.ratingStyle === 'custom' && config.customRatingText) {
                            ratingEmbed.setTitle(config.customRatingTitle || 'Feedback');
                            ratingEmbed.setDescription(config.customRatingText.replace(/\[staff\]/g, `<@${claimedByAdminId}>`).replace(/\[user\]/g, `<@${ticketOwnerUser.id}>`).replace(/\[server\]/g, interaction.guild.name));
                        } else {
                            ratingEmbed.setTitle('تقييم فريق العمل');
                            ratingEmbed.setDescription(`شكرا لتواصلك مع الدعم الفني الخاص بسيرفر **${interaction.guild.name}**\n\nيرجى تقييم مستوى الخدمة التي تلقيتها من <@${claimedByAdminId}>، رأيك يهمنا ويساعدنا في تحسين جودة الخدمة، اضغط على الزر الموافق لتقييمك وسيتم ارسال التقييم للادارة.`);
                        }
                        
                        ratingEmbed.setColor(config.staffRatingColor || '#3ba55d').setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL({ dynamic: true }) }).setTimestamp();
                        
                        const starsRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId(`rate_staff_1_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`rate_staff_2_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`rate_staff_3_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`rate_staff_4_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`rate_staff_5_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary)
                        );
                        
                        await ticketOwnerUser.send({ embeds: [ratingEmbed], components: [starsRow] });
                    } catch (errorLog) {}
                }

                if (ticketOwnerId) await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { SendMessages: false, ViewChannel: false }).catch(()=>{});

                while(topicParts.length < 6) topicParts.push('none');
                topicParts[4] = interaction.user.id;
                await interaction.channel.setTopic(topicParts.join('_')).catch(()=>{});

                const controlEmbed = new EmbedBuilder().setTitle('Ticket control').setDescription(`Closed By: <@${interaction.user.id}>\n(${interaction.user.id})`).setColor(config.closeEmbedColor || '#2b2d31');
                const cRow1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen ticket').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete ticket').setStyle(ButtonStyle.Danger)
                );
                const cRow2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger));
                
                await interaction.channel.send({ embeds: [controlEmbed], components: [cRow1, cRow2] });
                await interaction.message.delete().catch(()=>{});
            }

            // 🛡️ زر الاستلام الصاروخي (بدون أي تأخير)
            if (interaction.customId === 'ticket_claim') {
                // 1. الاستجابة الفورية لديسكورد لكي لا يعلق الزر
                await interaction.deferUpdate(); 
                
                // 2. تحديث الزر فوراً ليصبح شفاف (Success)
                const updatedComponents = interaction.message.components.map(row => {
                    const newRow = new ActionRowBuilder();
                    row.components.forEach(c => {
                        const btn = ButtonBuilder.from(c);
                        if (c.customId === 'ticket_claim') {
                            btn.setDisabled(true);
                            btn.setStyle(ButtonStyle.Success);
                        }
                        newRow.addComponents(btn);
                    });
                    return newRow;
                });
                await interaction.message.edit({ components: updatedComponents });
                
                // 3. إرسال رسالة التأكيد
                await interaction.channel.send(`**✅ Ticket has been claimed by <@${interaction.user.id}>**`);

                // 4. العمل في الخلفية لتعديل الصلاحيات (دون أن يشعر العضو بأي تأخير)
                const topicParts = (interaction.channel.topic || '').split('_');
                const usedBtnId = topicParts[1];
                const btnData = config.customButtons.find(b => b.id === usedBtnId);
                
                let allowedToClaimRoles = (btnData && btnData.allowedClaimRoles && btnData.allowedClaimRoles.length > 0) ? btnData.allowedClaimRoles : [config.adminRoleId, config.mediatorRoleId, ...config.highAdminRoles, ...config.highMediatorRoles].filter(Boolean);

                const currentOverwrites = interaction.channel.permissionOverwrites.cache;
                const newOverwritesArray = [];
                
                currentOverwrites.forEach((overwrite) => {
                    newOverwritesArray.push({ id: overwrite.id, allow: overwrite.allow.toArray(), deny: overwrite.deny.toArray() });
                });

                for (let i = 0; i < allowedToClaimRoles.length; i++) {
                    const staffRoleId = allowedToClaimRoles[i];
                    let roleOverwrite = newOverwritesArray.find(o => o.id === staffRoleId);
                    if (!roleOverwrite) { roleOverwrite = { id: staffRoleId, allow: [], deny: [] }; newOverwritesArray.push(roleOverwrite); }
                    
                    if (config.hideTicketOnClaim) {
                        if (!roleOverwrite.deny.includes('ViewChannel')) roleOverwrite.deny.push('ViewChannel');
                        roleOverwrite.allow = roleOverwrite.allow.filter(p => p !== 'ViewChannel');
                    } else if (config.readOnlyStaffOnClaim) {
                        if (!roleOverwrite.deny.includes('SendMessages')) roleOverwrite.deny.push('SendMessages');
                        roleOverwrite.allow = roleOverwrite.allow.filter(p => p !== 'SendMessages');
                    }
                }
                
                let claimerOverwrite = newOverwritesArray.find(o => o.id === interaction.user.id);
                if (!claimerOverwrite) newOverwritesArray.push({ id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'], deny: [] });
                else {
                    if (!claimerOverwrite.allow.includes('ViewChannel')) claimerOverwrite.allow.push('ViewChannel');
                    if (!claimerOverwrite.allow.includes('SendMessages')) claimerOverwrite.allow.push('SendMessages');
                }

                await interaction.channel.permissionOverwrites.set(newOverwritesArray).catch(()=>{});
                
                while(topicParts.length < 6) topicParts.push('none');
                topicParts[2] = interaction.user.id;
                await interaction.channel.setTopic(topicParts.join('_')).catch(()=>{});
            }
        }
    });

    // =====================================================================
    // 🛠️ فتح تكت جديد وحفظ نوعه في الـ Topic لمنع التقييم المزدوج
    // =====================================================================
    async function openNewTicket(interaction, buttonData, config, answersArray) {
        await interaction.deferReply({ ephemeral: true });
        
        await GuildConfig.findOneAndUpdate({ guildId: interaction.guild.id }, { $inc: { ticketCount: 1 } });
        const ticketNum = (config.ticketCount || 0) + 1;
        const categoryId = buttonData.categoryId || config.defaultCategoryId;
        
        const permsArray = [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ];
        
        const staffRolesArray = [config.adminRoleId, config.mediatorRoleId, ...config.highAdminRoles, ...config.highMediatorRoles].filter(Boolean);
        for (let i = 0; i < staffRolesArray.length; i++) {
            permsArray.push({ id: staffRolesArray[i], allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
        }

        // 🔥 حفظ نوع التكت في الخانة السادسة: isMediator
        let isMedStr = buttonData.isMediator ? 'true' : 'false';
        const initialTopicData = `${interaction.user.id}_${buttonData.id}_none_none_none_${isMedStr}`;

        const createdChannel = await interaction.guild.channels.create({ name: `ticket-${ticketNum}`, type: ChannelType.GuildText, parent: categoryId, topic: initialTopicData, permissionOverwrites: permsArray });

        const msgContent = `**Welcome <@${interaction.user.id}>**\n**Reason:** ${buttonData.label}`;
        const embedsList = [new EmbedBuilder().setTitle(buttonData.insideEmbedTitle || 'Support Ticket').setDescription(buttonData.insideEmbedDesc || 'Please detail your issue.').setColor(buttonData.insideEmbedColor || '#2b2d31')];

        if (answersArray && answersArray.length > 0) {
            const answersEmbed = new EmbedBuilder().setColor(config.answersEmbedColor || '#2b2d31');
            for (let i = 0; i < answersArray.length; i++) answersEmbed.addFields({ name: `**${answersArray[i].label}**`, value: answersArray[i].value || 'N/A' });
            embedsList.push(answersEmbed);
        }

        const controlsRow1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_add_user').setLabel('Add User').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger)
        );
        const controlsRow2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_delete_reason').setLabel('Delete (Reason)').setStyle(ButtonStyle.Danger));
        
        await createdChannel.send({ content: msgContent, embeds: embedsList, components: [controlsRow1, controlsRow2] });
        await interaction.editReply(`**✅ Ticket opened successfully: <#${createdChannel.id}>**`);
    }

    // =====================================================================
    // 🛠️ اللوجات وإصلاح زر الترانسكريبت
    // =====================================================================
    async function executeDeleteAndLog(ticketChannel, closedByUser, config, deleteReasonText) {
        
        const topicParts = (ticketChannel.topic || '').split('_');
        let tOwnerId = (topicParts[0] && topicParts[0] !== 'none') ? `<@${topicParts[0]}>` : 'Unknown';
        let tClaimerId = (topicParts[2] && topicParts[2] !== 'none') ? `<@${topicParts[2]}>` : 'None';
        let tAddedUsersList = (topicParts[3] && topicParts[3] !== 'none') ? topicParts[3].split(',') : [];
        let tClosedById = (topicParts[4] && topicParts[4] !== 'none') ? `<@${topicParts[4]}>` : `<@${closedByUser.id}>`; 
        let addedDisplayStr = tAddedUsersList.length > 0 ? tAddedUsersList.map(id => `<@${id}>`).join(', ') : 'None';

        const mainLogEmbed = new EmbedBuilder()
            .setAuthor({ name: 'MNC TICKET LOGS', iconURL: ticketChannel.guild.iconURL({ dynamic: true }) })
            .setTitle('🗑️ Ticket Deleted')
            .setDescription(`**Ticket:** ${ticketChannel.name} was deleted.\n\n👑 **Owner**\n${tOwnerId}\n\n🗑️ **Deleted By**\n<@${closedByUser.id}>\n\n🙋 **Claimed By**\n${tClaimerId}\n\n🔒 **Closed By**\n${tClosedById}\n\n➕ **Added Users**\n${addedDisplayStr}\n\n📝 **Reason**\n${deleteReasonText}`)
            .setColor(config.logEmbedColor || '#ed4245')
            .setTimestamp();

        if (config.ticketLogChannelId) { 
            const pureLogChannel = ticketChannel.guild.channels.cache.get(config.ticketLogChannelId); 
            if(pureLogChannel) await pureLogChannel.send({ embeds: [mainLogEmbed] }).catch(()=>{}); 
        }
        
        if (config.transcriptChannelId && config.transcriptChannelId !== config.ticketLogChannelId) { 
            const transcriptChannel = ticketChannel.guild.channels.cache.get(config.transcriptChannelId); 
            if(transcriptChannel) {
                const htmlAttachment = await discordTranscripts.createTranscript(ticketChannel, { limit: -1, returnType: 'attachment', filename: `${ticketChannel.name}.html`, saveImages: true });
                mainLogEmbed.setColor(config.transcriptEmbedColor || '#2b2d31');
                
                // زر حقيقي يعمل الآن
                const directBtnRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('direct_transcript_btn').setLabel('Direct Transcript').setStyle(ButtonStyle.Primary)
                );
                await transcriptChannel.send({ content: `**📄 Transcript for ${ticketChannel.name}**`, files: [htmlAttachment], embeds: [mainLogEmbed], components: [directBtnRow] }).catch(()=>{}); 
            }
        }
        setTimeout(() => { ticketChannel.delete().catch(()=>{}); }, 3000);
    }
};
