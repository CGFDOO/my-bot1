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
        // ⭐ الجزء الأول: استلام ضغطة النجوم في الخاص (Ratings)
        // =====================================================================
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('rate_')) {
                
                // تقسيم المعرف لاستخراج البيانات: rate_type_stars_targetId_guildId
                const parts = interaction.customId.split('_');
                const type = parts[1]; // 'staff' OR 'mediator'
                const stars = parts[2];
                const targetId = parts[3];
                const guildId = parts[4]; 

                // بناء النافذة المنبثقة (Modal) لأخذ تعليق إضافي
                const modal = new ModalBuilder();
                modal.setCustomId(`modalrate_${type}_${stars}_${targetId}_${guildId}`);
                modal.setTitle('Add Comment (Optional)');

                const commentInput = new TextInputBuilder();
                commentInput.setCustomId('rating_comment');
                commentInput.setLabel('Any extra feedback?');
                commentInput.setStyle(TextInputStyle.Paragraph);
                commentInput.setRequired(false); // غير إجباري

                const actionRow = new ActionRowBuilder();
                actionRow.addComponents(commentInput);
                modal.addComponents(actionRow);

                await interaction.showModal(modal);
                return;
            }
        }

        // =====================================================================
        // ⭐ الجزء الثاني: استلام التعليق وإرسال اللوج (العدادات والإيمبد الفخم)
        // =====================================================================
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('modalrate_')) {
                
                const parts = interaction.customId.split('_');
                const type = parts[1];
                const stars = parseInt(parts[2]);
                const targetId = parts[3];
                const guildId = parts[4];
                
                let feedback = interaction.fields.getTextInputValue('rating_comment');
                if (!feedback || feedback.trim() === '') {
                    feedback = 'No comment provided.';
                }

                let config = await GuildConfig.findOne({ guildId: guildId });
                if (!config) return;

                let logChannelId = null;
                if (type === 'staff') {
                    logChannelId = config.staffRatingChannelId;
                } else if (type === 'mediator') {
                    logChannelId = config.mediatorRatingChannelId;
                }

                const guild = client.guilds.cache.get(guildId);
                
                if (guild && logChannelId) {
                    const logChannel = guild.channels.cache.get(logChannelId);
                    
                    if (logChannel) {
                        // 1. تحديث العدادات الموحدة
                        let currentServerTotal = config.totalServerRatings || 0;
                        currentServerTotal += 1;
                        config.totalServerRatings = currentServerTotal;

                        let userRatingCount = 1;

                        if (type === 'staff') {
                            const currentStaffCount = config.staffRatingsCount.get(targetId) || 0;
                            userRatingCount = currentStaffCount + 1;
                            config.staffRatingsCount.set(targetId, userRatingCount);
                        } else {
                            const currentMedCount = config.mediatorRatingsCount.get(targetId) || 0;
                            userRatingCount = currentMedCount + 1;
                            config.mediatorRatingsCount.set(targetId, userRatingCount);
                        }
                        
                        await config.save();

                        // 2. تحويل الأرقام لنجوم فعلية
                        let starsText = '';
                        for(let i = 0; i < stars; i++) {
                            starsText += '⭐';
                        }

                        // 3. تحديد الألوان والنصوص بناءً على الداتابيز
                        let authorTitle = '';
                        let embedColor = '';
                        let targetLabel = '';

                        if (type === 'staff') {
                            authorTitle = `${guild.name} STAFF REVIEW`;
                            embedColor = config.staffRatingColor || '#3ba55d';
                            targetLabel = 'Admin 👮';
                        } else {
                            authorTitle = `${guild.name} MIDDLEMAN REVIEW`;
                            embedColor = config.basicRatingColor || '#f2a658';
                            targetLabel = 'Middleman 🛡️';
                        }

                        // 4. بناء الإيمبد الفخم للوج
                        const logEmbed = new EmbedBuilder();
                        logEmbed.setAuthor({ name: `📊 ${authorTitle}`, iconURL: guild.iconURL({ dynamic: true }) });
                        logEmbed.setThumbnail(guild.iconURL({ dynamic: true }));
                        
                        const descriptionText = `
**Client 👤**
<@${interaction.user.id}>

**${targetLabel}**
<@${targetId}>

**Statistics 📈**
Staff Ratings #${userRatingCount}
Server Ratings #${currentServerTotal}

-------------------------

**Rating ⭐**
**${starsText} (${stars}/5)**

**Comment 💬**
\`\`\`${feedback}\`\`\`
`;
                        logEmbed.setDescription(descriptionText);
                        logEmbed.setColor(embedColor);
                        
                        logEmbed.setFooter({ 
                            text: `Rated by: ${interaction.user.username}`, 
                            iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                        });
                        logEmbed.setTimestamp();

                        await logChannel.send({ content: `**New Rating for <@${targetId}>!**`, embeds: [logEmbed] }).catch(()=>{});
                    }
                }
                
                // 5. تعديل الرسالة في الخاص لإخفاء الأزرار وشكر العضو
                const thankYouEmbed = new EmbedBuilder();
                thankYouEmbed.setDescription(`✅ **Thank you! Your feedback has been submitted successfully.**\n\nStars: ${stars}/5`);
                thankYouEmbed.setColor('#3ba55d');
                
                try {
                    await interaction.update({ embeds: [thankYouEmbed], components: [] });
                } catch (err) {
                    await interaction.editReply({ embeds: [thankYouEmbed], components: [] }).catch(()=>{});
                }
                
                return;
            }
        }

        // =====================================================================
        // منع باقي التفاعلات إذا لم تكن في سيرفر
        // =====================================================================
        if (!interaction.guild) return;
        
        const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config) return;

        // =====================================================================
        // 🟢 3. فتح التكت
        // =====================================================================
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('ticket_open_')) {
                
                const btnId = interaction.customId.replace('ticket_open_', '');
                const buttonData = config.customButtons.find(b => b.id === btnId);
                
                if (!buttonData) {
                    return interaction.reply({ content: '**❌ This button is no longer available.**', ephemeral: true });
                }

                // السماح للجميع بفتح التكت بشكل افتراضي (مع فحص الحد الأقصى)
                const maxTickets = config.maxTicketsPerUser || 1;
                const userTickets = interaction.guild.channels.cache.filter(c => {
                    return c.name.startsWith('ticket-') && c.topic && c.topic.startsWith(interaction.user.id);
                });
                
                if (userTickets.size >= maxTickets) {
                    return interaction.reply({ content: `**❌ You can only have ${maxTickets} ticket(s) open at a time.**`, ephemeral: true });
                }

                // التحقق إذا كان الزر يحتوي على نافذة أسئلة
                if (buttonData.requireModal && buttonData.modalFields && buttonData.modalFields.length > 0) {
                    
                    const modal = new ModalBuilder();
                    modal.setCustomId(`modalticket_${btnId}`);
                    
                    let modalTitle = buttonData.modalTitle;
                    if (!modalTitle) modalTitle = 'Ticket Details';
                    modal.setTitle(modalTitle);

                    buttonData.modalFields.forEach((field, index) => {
                        const isRequired = (field.required === true || String(field.required) === 'true');
                        
                        const textInput = new TextInputBuilder();
                        textInput.setCustomId(`field_${index}`);
                        
                        let fieldLabel = field.label;
                        if (fieldLabel.length > 45) {
                            fieldLabel = fieldLabel.substring(0, 45); 
                        }
                        textInput.setLabel(fieldLabel);
                        textInput.setStyle(TextInputStyle.Paragraph);
                        
                        let fieldPlaceholder = field.placeholder;
                        if (!fieldPlaceholder) fieldPlaceholder = 'Type here...';
                        textInput.setPlaceholder(fieldPlaceholder);
                        textInput.setRequired(isRequired);

                        const actionRow = new ActionRowBuilder();
                        actionRow.addComponents(textInput);
                        modal.addComponents(actionRow);
                    });

                    await interaction.showModal(modal);
                } else {
                    await createTicket(interaction, buttonData, config, []);
                }
            }
        }

        // =====================================================================
        // استلام إجابات النافذة الخاصة بفتح التكت
        // =====================================================================
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('modalticket_')) {
                
                const btnId = interaction.customId.replace('modalticket_', '');
                const buttonData = config.customButtons.find(b => b.id === btnId);
                if (!buttonData) return;
                
                const answers = [];
                buttonData.modalFields.forEach((field, index) => {
                    const answerValue = interaction.fields.getTextInputValue(`field_${index}`);
                    answers.push({ label: field.label, value: answerValue });
                });
                
                await createTicket(interaction, buttonData, config, answers);
            }
        }

        // =====================================================================
        // ⚙️ 4. أزرار التحكم داخل التكت (السرعة الصاروخية وقفل الخطوتين)
        // =====================================================================
        if (interaction.isButton()) {
            
            // -----------------------------------------
            // 🔒 زر الإغلاق الخطوة الأولى (Ask for confirmation)
            // -----------------------------------------
            if (interaction.customId === 'ticket_close') {
                const confirmRow = new ActionRowBuilder();
                
                const confirmBtn = new ButtonBuilder();
                confirmBtn.setCustomId('confirm_close');
                confirmBtn.setLabel('Confirm Close');
                confirmBtn.setStyle(ButtonStyle.Danger);
                
                const cancelBtn = new ButtonBuilder();
                cancelBtn.setCustomId('cancel_close');
                cancelBtn.setLabel('Cancel');
                cancelBtn.setStyle(ButtonStyle.Secondary);
                
                confirmRow.addComponents(confirmBtn, cancelBtn);
                
                await interaction.reply({ 
                    content: '**⚠️ Are you sure you want to close this ticket?**', 
                    components: [confirmRow], 
                    ephemeral: true 
                });
            }

            // ❌ زر الإلغاء
            if (interaction.customId === 'cancel_close') {
                await interaction.update({ content: '**✅ Ticket closing cancelled.**', components: [] });
            }

            // ✅ زر تأكيد الإغلاق (الخطوة الثانية الفورية)
            if (interaction.customId === 'confirm_close') {
                // السرعة الصاروخية: الرد الفوري على ديسكورد ثم العمل في الخلفية
                await interaction.deferUpdate(); 
                
                const topicData = interaction.channel.topic || '';
                const parts = topicData.split('_');
                
                // Format: OwnerID_BtnID_ClaimerID_AddedUsers_CloserID
                const ticketOwnerId = parts[0];
                const btnId = parts[1];
                const claimedById = parts[2] !== 'none' ? parts[2] : null;

                const closeMessage = `**🔒 The ticket has been closed by <@${interaction.user.id}>**`;
                await interaction.channel.send(closeMessage);

                // فحص نظام التقييم (هل نرسل التقييم أم لا؟)
                let shouldSendRating = true;
                const btnData = config.customButtons.find(b => b.id === btnId);
                
                if (btnData) {
                    if (btnData.isMediator === true) {
                        shouldSendRating = false; // الوساطة تستخدم !done
                    }
                    if (btnData.enableRating === false) {
                        shouldSendRating = false;
                    }
                }

                // 🌟 إرسال التقييم لصاحب التكت فقط، وبداخله منشن الإداري الذي عمل Claim فقط
                if (shouldSendRating && ticketOwnerId && claimedById && config.staffRatingChannelId) {
                    try {
                        const owner = await interaction.guild.members.fetch(ticketOwnerId);
                        const guildName = interaction.guild.name;
                        
                        const ratingEmbed = new EmbedBuilder();
                        
                        // اختيار نوع التقييم (مخصص من الداشبورد أم الأساسي)
                        let embedTitle = 'Ticket Feedback';
                        let descText = '';
                        
                        if (config.ratingStyle === 'custom' && config.customRatingText) {
                            embedTitle = config.customRatingTitle || 'Ticket Feedback';
                            // تغيير المتغيرات
                            descText = config.customRatingText
                                .replace(/\[staff\]/g, `<@${claimedById}>`)
                                .replace(/\[user\]/g, `<@${owner.id}>`)
                                .replace(/\[server\]/g, guildName);
                        } else {
                            descText = `Thank you for contacting support at **${guildName}**.\n\nPlease rate the service provided by <@${claimedById}> by clicking the stars below.`;
                        }
                        
                        ratingEmbed.setTitle(embedTitle);
                        ratingEmbed.setDescription(descText);
                        ratingEmbed.setColor(config.staffRatingColor || '#3ba55d');
                        ratingEmbed.setFooter({ text: guildName, iconURL: interaction.guild.iconURL({ dynamic: true }) });
                        ratingEmbed.setTimestamp();
                        
                        const ratingRow = new ActionRowBuilder();
                        
                        const btn1 = new ButtonBuilder().setCustomId(`rate_staff_1_${claimedById}_${interaction.guild.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary);
                        const btn2 = new ButtonBuilder().setCustomId(`rate_staff_2_${claimedById}_${interaction.guild.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary);
                        const btn3 = new ButtonBuilder().setCustomId(`rate_staff_3_${claimedById}_${interaction.guild.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        const btn4 = new ButtonBuilder().setCustomId(`rate_staff_4_${claimedById}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        const btn5 = new ButtonBuilder().setCustomId(`rate_staff_5_${claimedById}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        
                        ratingRow.addComponents(btn1, btn2, btn3, btn4, btn5);
                        
                        await owner.send({ embeds: [ratingEmbed], components: [ratingRow] });
                    } catch (err) { 
                        // الخاص مغلق
                    }
                }

                // سحب صلاحيات العضو لعدم الكتابة
                if (ticketOwnerId) {
                    await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { 
                        SendMessages: false, 
                        ViewChannel: false 
                    }).catch(()=>{});
                }

                // تحديث Topic لحفظ من قام بالإغلاق (الخانة الخامسة)
                parts[4] = interaction.user.id;
                await interaction.channel.setTopic(parts.join('_')).catch(()=>{});

                // لوحة التحكم النهائية
                const closeEmbed = new EmbedBuilder();
                closeEmbed.setTitle('Ticket Control');
                closeEmbed.setDescription(`**Closed By:** <@${interaction.user.id}>`);
                closeEmbed.setColor('#2b2d31');
                
                const controlRow = new ActionRowBuilder();
                
                const reopenBtn = new ButtonBuilder();
                reopenBtn.setCustomId('ticket_reopen');
                reopenBtn.setLabel('Reopen');
                reopenBtn.setStyle(ButtonStyle.Secondary);
                
                const deleteBtn = new ButtonBuilder();
                deleteBtn.setCustomId('ticket_delete');
                deleteBtn.setLabel('Delete');
                deleteBtn.setStyle(ButtonStyle.Danger);
                
                const deleteReasonBtn = new ButtonBuilder();
                deleteReasonBtn.setCustomId('ticket_delete_reason');
                deleteReasonBtn.setLabel('Delete (Reason)');
                deleteReasonBtn.setStyle(ButtonStyle.Danger);
                
                controlRow.addComponents(reopenBtn, deleteBtn, deleteReasonBtn);
                
                await interaction.channel.send({ embeds: [closeEmbed], components: [controlRow] });
                
                // مسح رسالة التحذير الخاصة بالخطوة الأولى
                await interaction.message.delete().catch(()=>{});
            }

            // -----------------------------------------
            // 🛡️ زر الاستلام (Claim) السريع جداً 
            // -----------------------------------------
            if (interaction.customId === 'ticket_claim') {
                
                const topicData = interaction.channel.topic || '';
                const parts = topicData.split('_');
                const btnId = parts[1];
                const btnData = config.customButtons.find(b => b.id === btnId);

                // فحص الرتب المسموح لها باستلام هذا التكت تحديداً
                let allowedRoles = [
                    config.adminRoleId, 
                    config.mediatorRoleId, 
                    ...config.highAdminRoles, 
                    ...config.highMediatorRoles
                ].filter(Boolean);
                
                if (btnData && btnData.allowedClaimRoles && btnData.allowedClaimRoles.length > 0) {
                    allowedRoles = btnData.allowedClaimRoles;
                }

                let hasPerm = false;
                if (interaction.member.permissions.has('Administrator')) {
                    hasPerm = true;
                } else {
                    for (let i = 0; i < allowedRoles.length; i++) {
                        if (interaction.member.roles.cache.has(allowedRoles[i])) {
                            hasPerm = true;
                            break;
                        }
                    }
                }

                if (!hasPerm) {
                    return interaction.reply({ content: '**❌ You do not have permission to claim this ticket.**', ephemeral: true });
                }

                // ⚡ السرعة الصاروخية: الرد الفوري قبل تعديل الرومات
                await interaction.deferUpdate(); 
                
                // تطبيق نظام الإخفاء أو القراءة فقط لباقي الإدارة
                for (let i = 0; i < allowedRoles.length; i++) {
                    const roleId = allowedRoles[i];
                    if (config.hideTicketOnClaim) {
                        await interaction.channel.permissionOverwrites.edit(roleId, { ViewChannel: false }).catch(()=>{});
                    } else if (config.readOnlyStaffOnClaim) {
                        await interaction.channel.permissionOverwrites.edit(roleId, { SendMessages: false }).catch(()=>{});
                    }
                }
                
                // إعطاء المستلم صلاحيات كاملة
                await interaction.channel.permissionOverwrites.edit(interaction.user.id, { 
                    ViewChannel: true, 
                    SendMessages: true 
                });
                
                // تحديث Topic لحفظ الإداري الذي عمل Claim (الخانة الثالثة)
                parts[2] = interaction.user.id;
                await interaction.channel.setTopic(parts.join('_')).catch(()=>{});
                
                // جعل الزر شفاف
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
                
                const claimMsg = `**✅ Ticket has been claimed by <@${interaction.user.id}>**`;
                await interaction.channel.send(claimMsg);
            }

            // -----------------------------------------
            // 🔓 إعادة الفتح والحذف
            // -----------------------------------------
            if (interaction.customId === 'ticket_reopen') {
                const topicData = interaction.channel.topic || '';
                const ticketOwnerId = topicData.split('_')[0];
                
                if (ticketOwnerId) {
                    await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { 
                        SendMessages: true, 
                        ViewChannel: true 
                    });
                }
                
                await interaction.reply('**✅ Ticket has been reopened.**');
                await interaction.message.delete().catch(() => {});
            }

            if (interaction.customId === 'ticket_delete') {
                await interaction.reply({ content: '**🗑️ Deleting the ticket...**', ephemeral: true });
                await deleteAndLogTicket(interaction.channel, interaction.user, config, "Manual Delete");
            }

            if (interaction.customId === 'ticket_delete_reason') {
                const modal = new ModalBuilder();
                modal.setCustomId('modal_delete_reason');
                modal.setTitle('Delete Reason');
                
                const reasonInput = new TextInputBuilder();
                reasonInput.setCustomId('delete_reason');
                reasonInput.setLabel('Reason:');
                reasonInput.setStyle(TextInputStyle.Short);
                reasonInput.setRequired(true);
                
                const actionRow = new ActionRowBuilder();
                actionRow.addComponents(reasonInput);
                modal.addComponents(actionRow);
                
                await interaction.showModal(modal);
            }

            if (interaction.customId === 'ticket_add_user') {
                const modal = new ModalBuilder();
                modal.setCustomId('modal_add_user');
                modal.setTitle('Add User');
                
                const idInput = new TextInputBuilder();
                idInput.setCustomId('user_id_to_add');
                idInput.setLabel('User ID:');
                idInput.setStyle(TextInputStyle.Short);
                idInput.setRequired(true);
                
                const actionRow = new ActionRowBuilder();
                actionRow.addComponents(idInput);
                modal.addComponents(actionRow);
                
                await interaction.showModal(modal);
            }
        }

        // =====================================================================
        // 🧩 معالجة النوافذ المنبثقة للتحكم (حذف / إضافة)
        // =====================================================================
        if (interaction.isModalSubmit()) {
            
            if (interaction.customId === 'modal_delete_reason') {
                const reason = interaction.fields.getTextInputValue('delete_reason');
                await interaction.reply({ content: '**🗑️ Deleting the ticket...**', ephemeral: true });
                await deleteAndLogTicket(interaction.channel, interaction.user, config, reason);
            }

            if (interaction.customId === 'modal_add_user') {
                const userId = interaction.fields.getTextInputValue('user_id_to_add');
                try {
                    const member = await interaction.guild.members.fetch(userId);
                    await interaction.channel.permissionOverwrites.edit(userId, { 
                        ViewChannel: true, 
                        SendMessages: true 
                    });
                    
                    // تحديث Topic لحفظ العضو المضاف (الخانة الرابعة)
                    const topicData = interaction.channel.topic || '';
                    const parts = topicData.split('_');
                    let added = parts[3];
                    if (added === 'none') {
                        added = userId;
                    } else {
                        added = `${added},${userId}`;
                    }
                    parts[3] = added;
                    await interaction.channel.setTopic(parts.join('_')).catch(()=>{});

                    const addMsg = `**✅ <@${userId}> was added to the ticket by <@${interaction.user.id}>**`;
                    await interaction.reply(addMsg);
                } catch (err) { 
                    await interaction.reply({ content: '**❌ User not found in this server.**', ephemeral: true }); 
                }
            }
        }
    });

    // =====================================================================
    // 🛠️ دالة إنشاء التكت (المنشن العريض والإيمبدات المفصولة)
    // =====================================================================
    async function createTicket(interaction, buttonData, config, answers) {
        
        await interaction.deferReply({ ephemeral: true });
        
        await GuildConfig.findOneAndUpdate({ guildId: interaction.guild.id }, { $inc: { ticketCount: 1 } });
        const ticketNum = config.ticketCount + 1;
        
        let categoryId = buttonData.categoryId;
        if (!categoryId) {
            categoryId = config.defaultCategoryId;
        }
        
        const permissionOverwrites = [
            { 
                id: interaction.guild.id, 
                deny: [PermissionFlagsBits.ViewChannel] 
            },
            { 
                id: interaction.user.id, 
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
            }
        ];
        
        const allStaffRoles = [
            config.adminRoleId, 
            config.mediatorRoleId, 
            ...config.highAdminRoles, 
            ...config.highMediatorRoles
        ].filter(Boolean);
        
        for (let i = 0; i < allStaffRoles.length; i++) {
            permissionOverwrites.push({ 
                id: allStaffRoles[i], 
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
            });
        }

        // حفظ تفاصيل التكت في Topic: OwnerID_BtnID_Claimer_AddedUsers_Closer
        const topicData = `${interaction.user.id}_${buttonData.id}_none_none_none`;

        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${ticketNum}`, 
            type: ChannelType.GuildText, 
            parent: categoryId, 
            topic: topicData, 
            permissionOverwrites: permissionOverwrites
        });

        // 🔥 الرسالة الخارجية بالخط العريض
        const outsideMessage = `**Welcome <@${interaction.user.id}>**\n**Reason:** ${buttonData.label}`;
        
        const embedsToSend = [];

        // 🔥 الإيمبد الأول: القوانين فقط
        const rulesEmbed = new EmbedBuilder();
        rulesEmbed.setTitle(buttonData.insideEmbedTitle || 'Support Ticket');
        rulesEmbed.setDescription(buttonData.insideEmbedDesc || 'Please detail your issue.');
        rulesEmbed.setColor(buttonData.insideEmbedColor || '#2b2d31');
        
        embedsToSend.push(rulesEmbed);

        // 🔥 الإيمبد الثاني: إجابات النافذة (منفصل)
        if (answers.length > 0) {
            const answersEmbed = new EmbedBuilder();
            answersEmbed.setColor('#2b2d31');
            
            for (let i = 0; i < answers.length; i++) {
                const a = answers[i];
                let aVal = a.value;
                if (!aVal) aVal = 'N/A';
                
                // جعل عنوان السؤال بخط عريض
                answersEmbed.addFields({ name: `**${a.label}**`, value: aVal });
            }
            embedsToSend.push(answersEmbed);
        }

        const row1 = new ActionRowBuilder();
        
        const addUserBtn = new ButtonBuilder();
        addUserBtn.setCustomId('ticket_add_user');
        addUserBtn.setLabel('Add User');
        addUserBtn.setStyle(ButtonStyle.Secondary);
        
        const claimBtn = new ButtonBuilder();
        claimBtn.setCustomId('ticket_claim');
        claimBtn.setLabel('Claim');
        claimBtn.setStyle(ButtonStyle.Success);
        
        const closeBtn = new ButtonBuilder();
        closeBtn.setCustomId('ticket_close');
        closeBtn.setLabel('Close');
        closeBtn.setStyle(ButtonStyle.Danger);
        
        row1.addComponents(addUserBtn, claimBtn, closeBtn);

        const row2 = new ActionRowBuilder();
        const deleteReasonBtn = new ButtonBuilder();
        deleteReasonBtn.setCustomId('ticket_delete_reason');
        deleteReasonBtn.setLabel('Delete (Reason)');
        deleteReasonBtn.setStyle(ButtonStyle.Danger);
        
        row2.addComponents(deleteReasonBtn);
        
        await ticketChannel.send({ 
            content: outsideMessage, 
            embeds: embedsToSend, 
            components: [row1, row2] 
        });
        
        await interaction.editReply(`**✅ Ticket opened successfully: <#${ticketChannel.id}>**`);
    }

    // =====================================================================
    // 🛠️ دالة اللوجات الخرافية (المفصولة تماماً كما في الصور)
    // =====================================================================
    async function deleteAndLogTicket(channel, closedBy, config, reason) {
        
        const topicData = channel.topic || '';
        const parts = topicData.split('_');
        
        const ownerId = parts[0] !== 'none' ? parts[0] : null;
        const claimerId = parts[2] !== 'none' ? parts[2] : null;
        
        let addedUsers = [];
        if (parts[3] !== 'none' && parts[3] !== undefined) {
            addedUsers = parts[3].split(',');
        }
        
        // لو مفيش حد قفل التكت (حذف مباشر)، نعتبر اللي حذف هو اللي قفل
        const closedById = (parts[4] !== 'none' && parts[4] !== undefined) ? parts[4] : closedBy.id; 

        let ownerDisplay = 'Unknown';
        if (ownerId) ownerDisplay = `<@${ownerId}>`;
        
        let claimerDisplay = 'None';
        if (claimerId) claimerDisplay = `<@${claimerId}>`;
        
        let addedDisplay = 'None';
        if (addedUsers.length > 0) {
            addedDisplay = addedUsers.map(id => `<@${id}>`).join(', ');
        }

        // بناء الإيمبد الفخم للوج
        const logEmbed = new EmbedBuilder();
        logEmbed.setAuthor({ name: 'MNC TICKET LOGS', iconURL: channel.guild.iconURL({ dynamic: true }) });
        logEmbed.setTitle('🗑️ Ticket Deleted');
        
        const desc = `
**Ticket:** ${channel.name} was deleted.

👑 **Owner**
${ownerDisplay}

🗑️ **Deleted By**
<@${closedBy.id}>

🙋 **Claimed By**
${claimerDisplay}

🔒 **Closed By**
<@${closedById}>

➕ **Added Users**
${addedDisplay}

📝 **Reason**
${reason}
`;
        
        logEmbed.setDescription(desc);
        logEmbed.setColor(config.logEmbedColor || '#ed4245');
        logEmbed.setTimestamp();

        // 1. إرسال الإيمبد فقط إلى روم Ticket Logs (بدون ترانسكريبت HTML)
        if (config.ticketLogChannelId) { 
            const tChannel = channel.guild.channels.cache.get(config.ticketLogChannelId); 
            if(tChannel) {
                await tChannel.send({ embeds: [logEmbed] }).catch(()=>{}); 
            }
        }
        
        // 2. إرسال الترانسكريبت إلى روم Transcript Channel
        if (config.transcriptChannelId && config.transcriptChannelId !== config.ticketLogChannelId) { 
            const transChannel = channel.guild.channels.cache.get(config.transcriptChannelId); 
            if(transChannel) {
                const attachment = await discordTranscripts.createTranscript(channel, { 
                    limit: -1, 
                    returnType: 'attachment', 
                    filename: `${channel.name}.html`, 
                    saveImages: true, 
                    poweredBy: false 
                });
                
                // زر التحميل المباشر
                const transRow = new ActionRowBuilder();
                const fakeBtn = new ButtonBuilder();
                fakeBtn.setCustomId('fake_btn');
                fakeBtn.setLabel('Direct Transcript');
                fakeBtn.setStyle(ButtonStyle.Secondary);
                fakeBtn.setDisabled(true);
                
                transRow.addComponents(fakeBtn);

                await transChannel.send({ 
                    content: `**📄 Transcript for ${channel.name}**`, 
                    files: [attachment], 
                    embeds: [logEmbed], 
                    components: [transRow] 
                }).catch(()=>{}); 
            }
        }
        
        setTimeout(() => { 
            channel.delete().catch(()=>{}); 
        }, 3000);
    }
};
