const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, 
    ChannelType, PermissionFlagsBits 
} = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    client.on('interactionCreate', async interaction => {

        // =====================================================================
        // ⭐ الجزء الأول: نظام استقبال التقييمات في الخاص (زرار النجوم -> نافذة)
        // =====================================================================
        if (interaction.isButton() && interaction.customId.startsWith('rate_')) {
            const parts = interaction.customId.split('_');
            const type = parts[1]; // 'staff' أو 'mediator'
            const stars = parts[2];
            const targetId = parts[3];
            const guildId = parts[4]; 

            // فتح نافذة منبثقة لأخذ تعليق إضافي من العضو (اختياري)
            const modal = new ModalBuilder()
                .setCustomId(`modalrate_${type}_${stars}_${targetId}_${guildId}`)
                .setTitle('تعليق إضافي للتقييم (اختياري)');

            const commentInput = new TextInputBuilder()
                .setCustomId('rating_comment')
                .setLabel('هل لديك أي تعليق أو ملاحظات إضافية؟')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(false); // غير إجباري

            modal.addComponents(new ActionRowBuilder().addComponents(commentInput));
            await interaction.showModal(modal);
            return;
        }

        // =====================================================================
        // ⭐ الجزء الثاني: استلام التعليق من النافذة وإرسال اللوج للسيرفر
        // =====================================================================
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modalrate_')) {
            const parts = interaction.customId.split('_');
            const type = parts[1];
            const stars = parseInt(parts[2]);
            const targetId = parts[3];
            const guildId = parts[4];
            
            const feedback = interaction.fields.getTextInputValue('rating_comment') || 'لم يكتب تعليق إضافي.';

            const config = await GuildConfig.findOne({ guildId: guildId });
            const logChannelId = type === 'staff' ? config?.staffRatingChannelId : config?.mediatorRatingChannelId;
            const guild = client.guilds.cache.get(guildId);
            
            if (guild && logChannelId) {
                const logChannel = guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    let starsText = '⭐'.repeat(stars);
                    const embed = new EmbedBuilder()
                        .setTitle(`🌟 تقييم ${type === 'staff' ? 'إداري' : 'وسيط'} جديد`)
                        .addFields(
                            { name: '👤 العضو المُقيِّم:', value: `<@${interaction.user.id}>`, inline: true },
                            { name: '🛡️ المُقيَّم:', value: `<@${targetId}>`, inline: true },
                            { name: '📊 التقييم:', value: `${starsText} (${stars}/5)`, inline: false },
                            { name: '📝 التعليق:', value: feedback, inline: false }
                        )
                        .setColor(stars >= 4 ? '#3ba55d' : (stars === 3 ? '#f2a658' : '#ed4245'))
                        .setTimestamp()
                        .setFooter({ text: guild.name, iconURL: guild.iconURL({ dynamic: true }) });

                    await logChannel.send({ embeds: [embed] }).catch(()=>{});
                }
            }
            
            // تعديل الرسالة في الخاص لإخفاء الأزرار وشكره
            const thankYouEmbed = new EmbedBuilder()
                .setDescription(`✅ **شكراً لك! تم إرسال تقييمك بنجاح للإدارة.**\n\nالتقييم: ${stars}/5 نجوم\nالتعليق: ${feedback}`)
                .setColor('#3ba55d');
            
            await interaction.update({ embeds: [thankYouEmbed], components: [] }).catch(() => {
                interaction.editReply({ embeds: [thankYouEmbed], components: [] }).catch(()=>{});
            });
            return;
        }

        // إيقاف التفاعلات إذا لم تكن في سيرفر (ما عدا التقييمات في الخاص التي تم معالجتها فوق)
        if (!interaction.guild) return;
        const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config) return;

        // =====================================================================
        // 🟢 الجزء الثالث: فتح التكتات والنوافذ الخاصة بها
        // =====================================================================
        if (interaction.isButton() && interaction.customId.startsWith('ticket_open_')) {
            const btnId = interaction.customId.replace('ticket_open_', '');
            const buttonData = config.customButtons.find(b => b.id === btnId);
            if (!buttonData) return interaction.reply({ content: '❌ هذا الزر غير متوفر حالياً.', ephemeral: true });

            // التحقق من الحد الأقصى للتكتات المفتوحة
            const userTickets = interaction.guild.channels.cache.filter(c => c.name.startsWith('ticket-') && c.topic && c.topic.startsWith(interaction.user.id));
            if (userTickets.size >= (config.maxTicketsPerUser || 1)) {
                return interaction.reply({ content: `❌ الحد الأقصى المسموح به هو ${config.maxTicketsPerUser} تذكرة. الرجاء إغلاق تذكرتك القديمة أولاً.`, ephemeral: true });
            }

            // إذا كان الزر يحتوي على نافذة (Modal)
            if (buttonData.requireModal && buttonData.modalFields && buttonData.modalFields.length > 0) {
                const modal = new ModalBuilder()
                    .setCustomId(`modalticket_${btnId}`)
                    .setTitle(buttonData.modalTitle || 'بيانات التكت');

                buttonData.modalFields.forEach((field, index) => {
                    const isRequired = field.required === true || String(field.required) === 'true';
                    const textInput = new TextInputBuilder()
                        .setCustomId(`field_${index}`)
                        .setLabel(field.label.substring(0, 45)) // ديسكورد يمنع العناوين الطويلة جداً
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder(field.placeholder || 'اكتب إجابتك هنا...')
                        .setRequired(isRequired);
                    
                    modal.addComponents(new ActionRowBuilder().addComponents(textInput));
                });

                await interaction.showModal(modal);
            } else {
                // فتح التكت مباشرة إذا لم يكن هناك نافذة
                await createTicket(interaction, buttonData, config, []);
            }
        }

        // استلام إجابات النافذة الخاصة بفتح التكت
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modalticket_')) {
            const btnId = interaction.customId.replace('modalticket_', '');
            const buttonData = config.customButtons.find(b => b.id === btnId);
            if (!buttonData) return;
            
            const answers = [];
            buttonData.modalFields.forEach((field, index) => {
                answers.push({ label: field.label, value: interaction.fields.getTextInputValue(`field_${index}`) });
            });
            
            await createTicket(interaction, buttonData, config, answers);
        }

        // =====================================================================
        // ⚙️ الجزء الرابع: أزرار التحكم داخل التكت (Claim, Close, Reopen, Delete, Add User, Trade)
        // =====================================================================
        if (interaction.isButton()) {
            
            // 🛡️ زر الاستلام (Claim)
            if (interaction.customId === 'ticket_claim') {
                const hasPerm = [config.adminRoleId, config.mediatorRoleId, ...config.highAdminRoles, ...config.highMediatorRoles]
                                .some(id => interaction.member.roles.cache.has(id)) || interaction.member.permissions.has('Administrator');
                
                if (!hasPerm) return interaction.reply({ content: '❌ هذا الزر مخصص للإدارة فقط.', ephemeral: true });

                await interaction.deferUpdate();

                // سحب الصلاحيات أو تحويلها لمراقبة لباقي الإدارة بناءً على الإعدادات
                const allStaffRoles = [config.adminRoleId, config.mediatorRoleId, ...config.highAdminRoles, ...config.highMediatorRoles].filter(Boolean);
                for (const roleId of allStaffRoles) {
                    if (config.hideTicketOnClaim) {
                        await interaction.channel.permissionOverwrites.edit(roleId, { ViewChannel: false }).catch(()=>{});
                    } else if (config.readOnlyStaffOnClaim) {
                        await interaction.channel.permissionOverwrites.edit(roleId, { SendMessages: false }).catch(()=>{});
                    }
                }
                
                // إعطاء المستلم صلاحيات كاملة للتكت
                await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });

                // جعل زر الكليم معطل (شفاف)
                const updatedComponents = interaction.message.components.map(row => {
                    return new ActionRowBuilder().addComponents(row.components.map(c => {
                        const btn = ButtonBuilder.from(c);
                        if (c.customId === 'ticket_claim') btn.setDisabled(true).setStyle(ButtonStyle.Success);
                        return btn;
                    }));
                });
                await interaction.message.edit({ components: updatedComponents });
                
                // رسالة التأكيد
                await interaction.channel.send(`✅ **The ticket has been claimed successfully by <@${interaction.user.id}>**`);
            }

            // 🔒 زر الإغلاق (Close)
            if (interaction.customId === 'ticket_close') {
                await interaction.deferUpdate();
                
                // جلب صاحب التكت ومعرف الزر الذي فتح التكت منه
                const topicData = interaction.channel.topic || '';
                const parts = topicData.split('_');
                const ticketOwnerId = parts[0];
                const btnId = parts.length > 1 ? parts[1] : null;

                await interaction.channel.send(`🔒 **The ticket has been closed by <@${interaction.user.id}>**`);

                // التحقق هل يجب إرسال تقييم أم لا (التحقق من الداتابيز)
                let shouldSendRating = true;
                if (btnId) {
                    const btnData = config.customButtons.find(b => b.id === btnId);
                    if (btnData) {
                        // إذا كان تكت وساطة أو التقييم التلقائي معطل من الداشبورد
                        if (btnData.isMediator || btnData.enableRating === false) {
                            shouldSendRating = false;
                        }
                    }
                }

                // إرسال التقييم في الخاص إذا كانت الشروط مطابقة
                if (shouldSendRating && ticketOwnerId && config.staffRatingChannelId) {
                    try {
                        const owner = await interaction.guild.members.fetch(ticketOwnerId);
                        const guildName = interaction.guild.name;
                        const guildIcon = interaction.guild.iconURL({ dynamic: true });

                        const ratingEmbed = new EmbedBuilder()
                            .setTitle('تقييم فريق العمل')
                            .setDescription(`شكرا لتواصلك مع الدعم الفني الخاص بسيرفر **${guildName}**\n\nيرجى تقييم مستوى الخدمة التي تلقيتها، رأيك يهمنا ويساعدنا في تحسين جودة الخدمة، اضغط على الزر الموافق لتقييمك وسيتم ارسال التقييم للادارة.`)
                            .setColor('#f2a658')
                            .setFooter({ text: guildName, iconURL: guildIcon })
                            .setTimestamp();
                        
                        const ratingRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId(`rate_staff_1_${interaction.user.id}_${interaction.guild.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`rate_staff_2_${interaction.user.id}_${interaction.guild.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`rate_staff_3_${interaction.user.id}_${interaction.guild.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`rate_staff_4_${interaction.user.id}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId(`rate_staff_5_${interaction.user.id}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary)
                        );
                        await owner.send({ embeds: [ratingEmbed], components: [ratingRow] });
                    } catch (err) { console.log('تعذر إرسال التقييم: الخاص مغلق للمستخدم.'); }
                }

                // سحب صلاحيات العضو من التكت
                if (ticketOwnerId) {
                    await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { SendMessages: false, ViewChannel: false }).catch(()=>{});
                }

                // إرسال لوحة التحكم النهائية
                const closeEmbed = new EmbedBuilder()
                    .setTitle('Ticket control')
                    .setDescription(`Closed By: <@${interaction.user.id}>\n(${interaction.user.id})`)
                    .setColor('#2b2d31');
                
                const controlRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen ticket').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete ticket').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('ticket_delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
                );
                
                await interaction.channel.send({ embeds: [closeEmbed], components: [controlRow] });
            }

            // 🔓 زر إعادة הפتح (Reopen)
            if (interaction.customId === 'ticket_reopen') {
                const topicData = interaction.channel.topic || '';
                const ticketOwnerId = topicData.split('_')[0];
                
                if (ticketOwnerId) {
                    await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { SendMessages: true, ViewChannel: true });
                }
                
                await interaction.reply('✅ **The ticket has been reopened.**');
                await interaction.message.delete().catch(() => {});
            }

            // 🗑️ زر الحذف المباشر (Delete)
            if (interaction.customId === 'ticket_delete') {
                await interaction.reply('جاري حفظ السجل وحذف التذكرة...');
                await deleteAndLogTicket(interaction.channel, interaction.user, config, "بدون سبب (حذف مباشر)");
            }

            // 📝 زر الحذف مع سبب (Delete With Reason)
            if (interaction.customId === 'ticket_delete_reason') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_delete_reason')
                    .setTitle('سبب حذف التذكرة');
                
                const reasonInput = new TextInputBuilder()
                    .setCustomId('delete_reason')
                    .setLabel('اكتب سبب الحذف هنا:')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                
                modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                await interaction.showModal(modal);
            }

            // ➕ زر إضافة عضو للتكت (Add User)
            if (interaction.customId === 'ticket_add_user') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_add_user')
                    .setTitle('إضافة عضو للتكت');
                
                const idInput = new TextInputBuilder()
                    .setCustomId('user_id_to_add')
                    .setLabel('أيدي العضو (User ID):')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                
                modal.addComponents(new ActionRowBuilder().addComponents(idInput));
                await interaction.showModal(modal);
            }

            // ⚖️ زراير الموافقة والرفض لأمر (!trade)
            if (interaction.customId === 'trade_approve' || interaction.customId === 'trade_reject') {
                const isHighStaff = config.highAdminRoles.some(id => interaction.member.roles.cache.has(id)) || 
                                    config.highMediatorRoles.some(id => interaction.member.roles.cache.has(id)) || 
                                    interaction.member.permissions.has('Administrator');

                if (!isHighStaff) {
                    return interaction.reply({ content: '❌ **هذا الزر مخصص للإدارة والوساطة العليا فقط!**', ephemeral: true });
                }

                const oldEmbed = interaction.message.embeds[0];
                const updatedEmbed = EmbedBuilder.from(oldEmbed);

                if (interaction.customId === 'trade_approve') {
                    updatedEmbed.setColor('#3ba55d').addFields({ name: 'حالة الطلب:', value: `✅ تمت الموافقة بواسطة <@${interaction.user.id}>` });
                } else {
                    updatedEmbed.setColor('#ed4245').addFields({ name: 'حالة الطلب:', value: `❌ تم الرفض بواسطة <@${interaction.user.id}>` });
                }

                // مسح الزراير بعد الضغط وتحديث الإيمبد
                await interaction.update({ embeds: [updatedEmbed], components: [] });
            }
        }

        // =====================================================================
        // 🧩 الجزء الخامس: معالجة النوافذ المنبثقة للتحكم (الحذف بالسبب / إضافة عضو)
        // =====================================================================
        if (interaction.isModalSubmit()) {
            
            if (interaction.customId === 'modal_delete_reason') {
                const reason = interaction.fields.getTextInputValue('delete_reason');
                await interaction.reply('جاري حفظ السجل وحذف التذكرة...');
                await deleteAndLogTicket(interaction.channel, interaction.user, config, reason);
            }

            if (interaction.customId === 'modal_add_user') {
                const userId = interaction.fields.getTextInputValue('user_id_to_add');
                try {
                    const member = await interaction.guild.members.fetch(userId);
                    await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true });
                    await interaction.reply(`✅ <@${userId}> **has been added to the ticket by:** <@${interaction.user.id}>`);
                } catch (err) { 
                    await interaction.reply({ content: '❌ لم يتم العثور على العضو، تأكد من صحة الأيدي وأنه موجود بالسيرفر.', ephemeral: true }); 
                }
            }
        }
    });

    // =====================================================================
    // 🛠️ دوال مساعدة: دالة إنشاء التكت
    // =====================================================================
    async function createTicket(interaction, buttonData, config, answers) {
        await interaction.deferReply({ ephemeral: true });
        
        await GuildConfig.findOneAndUpdate({ guildId: interaction.guild.id }, { $inc: { ticketCount: 1 } });
        const ticketNum = config.ticketCount + 1;
        const categoryId = buttonData.categoryId || config.defaultCategoryId;
        
        const permissionOverwrites = [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ];
        
        const allStaffRoles = [config.adminRoleId, config.mediatorRoleId, ...config.highAdminRoles, ...config.highMediatorRoles].filter(Boolean);
        allStaffRoles.forEach(roleId => {
            permissionOverwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
        });

        // حفظ الأيدي ومعرف الزرار في الوصف للرجوع إليه وقت التقييم
        const topicData = `${interaction.user.id}_${buttonData.id}`;

        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${ticketNum}`, 
            type: ChannelType.GuildText, 
            parent: categoryId, 
            topic: topicData, 
            permissionOverwrites: permissionOverwrites
        });

        const outsideMessage = `حياك الله <@${interaction.user.id}>\nReason: ${buttonData.label}`;
        
        const insideEmbed = new EmbedBuilder()
            .setTitle(buttonData.insideEmbedTitle || 'الدعم الفني')
            .setDescription(buttonData.insideEmbedDesc || 'يرجى كتابة طلبك.')
            .setColor(buttonData.insideEmbedColor || '#2b2d31');
        
        if (answers.length > 0) { 
            let fieldsStr = ''; 
            answers.forEach(a => fieldsStr += `**${a.label}:**\n${a.value}\n\n`); 
            insideEmbed.addFields({ name: '📝 بيانات الطلب:', value: fieldsStr }); 
        }

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_add_user').setLabel('Add User').setStyle(ButtonStyle.Secondary), 
            new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success), 
            new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger)
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
        );
        
        await ticketChannel.send({ content: outsideMessage, embeds: [insideEmbed], components: [row1, row2] });
        await interaction.editReply(`✅ تم فتح تذكرتك بنجاح: <#${ticketChannel.id}>`);
    }

    // =====================================================================
    // 🛠️ دوال مساعدة: دالة حذف التكت وإرسال اللوج والترانسكريبت
    // =====================================================================
    async function deleteAndLogTicket(channel, closedBy, config, reason) {
        // سحب الترانسكريبت كملف HTML
        const attachment = await discordTranscripts.createTranscript(channel, { 
            limit: -1, 
            returnType: 'attachment', 
            filename: `${channel.name}.html`, 
            saveImages: true, 
            poweredBy: false 
        });
        
        // استخراج أيدي صاحب التكت من الوصف
        const topicData = channel.topic || '';
        const ticketOwnerId = topicData.split('_')[0];
        
        const logEmbed = new EmbedBuilder()
            .setTitle('📄 سجل إغلاق تذكرة')
            .addFields(
                { name: 'اسم التذكرة:', value: channel.name, inline: true }, 
                { name: 'صاحب التذكرة:', value: ticketOwnerId ? `<@${ticketOwnerId}>` : 'غير معروف', inline: true }, 
                { name: 'أُغلقت بواسطة:', value: `<@${closedBy.id}>`, inline: true }, 
                { name: 'السبب:', value: reason, inline: false }
            )
            .setColor('#ed4245')
            .setTimestamp();
        
        // إرسال اللوج للرومات المخصصة
        if (config.ticketLogChannelId) { 
            const c = channel.guild.channels.cache.get(config.ticketLogChannelId); 
            if(c) await c.send({ embeds: [logEmbed], files: [attachment] }).catch(()=>{}); 
        }
        
        if (config.transcriptChannelId && config.transcriptChannelId !== config.ticketLogChannelId) { 
            const c = channel.guild.channels.cache.get(config.transcriptChannelId); 
            if(c) await c.send({ embeds: [logEmbed], files: [attachment] }).catch(()=>{}); 
        }
        
        // حذف الروم بعد 4 ثواني
        setTimeout(() => channel.delete().catch(()=>{}), 4000);
    }
};
