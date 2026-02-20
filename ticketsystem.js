// =====================================================================
// استدعاء المكاتب الأساسية من ديسكورد (مفرودة بالكامل)
// =====================================================================
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

// استدعاء مكتبة الترانسكريبت
const discordTranscripts = require('discord-html-transcripts');

// استدعاء قاعدة البيانات
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    
    // =====================================================================
    // الحدث الرئيسي للتعامل مع أي تفاعل (أزرار / نوافذ)
    // =====================================================================
    client.on('interactionCreate', async interaction => {

        // =====================================================================
        // ⭐ 1. نظام التقييم في الخاص (عند الضغط على أي نجمة)
        // =====================================================================
        if (interaction.isButton()) {
            
            let isRateButton = interaction.customId.startsWith('rate_');
            
            if (isRateButton) {
                
                // استخراج المتغيرات من المعرف (ID)
                const customIdParts = interaction.customId.split('_');
                const ratingType = customIdParts[1]; 
                const ratingStars = customIdParts[2];
                const ratedTargetId = customIdParts[3];
                const currentGuildId = customIdParts[4]; 

                // بناء نافذة التعليق
                const feedbackModal = new ModalBuilder();
                
                let modalId = `modalrate_${ratingType}_${ratingStars}_${ratedTargetId}_${currentGuildId}`;
                feedbackModal.setCustomId(modalId);
                
                feedbackModal.setTitle('إضافة تعليق (اختياري)');

                // بناء حقل النص
                const commentTextInput = new TextInputBuilder();
                commentTextInput.setCustomId('rating_comment');
                commentTextInput.setLabel('هل لديك أي تعليق إضافي؟');
                commentTextInput.setStyle(TextInputStyle.Paragraph);
                commentTextInput.setRequired(false); 

                const modalActionRow = new ActionRowBuilder();
                modalActionRow.addComponents(commentTextInput);
                
                feedbackModal.addComponents(modalActionRow);

                // إظهار النافذة للعضو
                await interaction.showModal(feedbackModal);
                
                return;
            }
        }

        // =====================================================================
        // ⭐ 2. استلام تعليق التقييم وإرسال اللوج للإدارة
        // =====================================================================
        if (interaction.isModalSubmit()) {
            
            let isRateModal = interaction.customId.startsWith('modalrate_');
            
            if (isRateModal) {
                
                // الرد السريع لتجنب تعليق النافذة
                await interaction.deferUpdate().catch(() => {});

                // استخراج البيانات
                const customIdParts = interaction.customId.split('_');
                const ratingType = customIdParts[1];
                const ratingStars = parseInt(customIdParts[2]);
                const ratedTargetId = customIdParts[3];
                const currentGuildId = customIdParts[4];
                
                // جلب التعليق
                let userFeedback = interaction.fields.getTextInputValue('rating_comment');
                
                if (!userFeedback || userFeedback.trim() === '') {
                    userFeedback = 'لا يوجد تعليق مضاف من العضو.';
                }

                // جلب الإعدادات
                let serverConfig = await GuildConfig.findOne({ guildId: currentGuildId });
                
                if (!serverConfig) {
                    return;
                }

                // تحديد روم اللوج بناءً على نوع التقييم
                let targetLogChannelId = null;
                
                if (ratingType === 'staff') {
                    targetLogChannelId = serverConfig.staffRatingChannelId;
                } else if (ratingType === 'mediator') {
                    targetLogChannelId = serverConfig.mediatorRatingChannelId;
                }

                // جلب السيرفر
                const discordGuild = client.guilds.cache.get(currentGuildId);
                
                if (discordGuild && targetLogChannelId) {
                    
                    const logChannel = discordGuild.channels.cache.get(targetLogChannelId);
                    
                    if (logChannel) {
                        
                        // 🔥 سحب تفاصيل التريد من رسالة التقييم في الخاص (إن وُجدت)
                        let tradeDetailsIncluded = 'لا يوجد تفاصيل للتريد (تقييم مباشر أو إدارة).';
                        
                        if (interaction.message && interaction.message.embeds && interaction.message.embeds.length > 0) {
                            let oldEmbedDesc = interaction.message.embeds[0].description;
                            if (oldEmbedDesc && oldEmbedDesc.includes('**📦 تفاصيل المعاملة:**')) {
                                let splitDesc = oldEmbedDesc.split('**📦 تفاصيل المعاملة:**');
                                if (splitDesc.length > 1) {
                                    tradeDetailsIncluded = splitDesc[1].trim();
                                }
                            }
                        }

                        // تحديث العدادات
                        let currentServerTotal = serverConfig.totalServerRatings;
                        if (!currentServerTotal) {
                            currentServerTotal = 0;
                        }
                        
                        currentServerTotal = currentServerTotal + 1;
                        serverConfig.totalServerRatings = currentServerTotal;

                        let individualRatingCount = 1;

                        if (ratingType === 'staff') {
                            let oldStaffCount = serverConfig.staffRatingsCount.get(ratedTargetId);
                            if (!oldStaffCount) {
                                oldStaffCount = 0;
                            }
                            individualRatingCount = oldStaffCount + 1;
                            serverConfig.staffRatingsCount.set(ratedTargetId, individualRatingCount);
                        } else {
                            let oldMedCount = serverConfig.mediatorRatingsCount.get(ratedTargetId);
                            if (!oldMedCount) {
                                oldMedCount = 0;
                            }
                            individualRatingCount = oldMedCount + 1;
                            serverConfig.mediatorRatingsCount.set(ratedTargetId, individualRatingCount);
                        }
                        
                        // حفظ الداتابيز
                        await serverConfig.save();

                        // بناء النجوم
                        let starsEmojiText = '';
                        for (let i = 0; i < ratingStars; i++) {
                            starsEmojiText += '⭐';
                        }

                        let logAuthorTitle = '';
                        let logEmbedColor = '';
                        let ratedPersonLabel = '';

                        // 🔥 الألوان هنا بتتسحب من الداتابيز سواء كان التقييم بيسك أو مخصص
                        if (ratingType === 'staff') {
                            logAuthorTitle = `${discordGuild.name} STAFF REVIEW`;
                            
                            let staffColor = serverConfig.staffRatingColor;
                            if (!staffColor) {
                                staffColor = '#3ba55d';
                            }
                            logEmbedColor = staffColor;
                            
                            ratedPersonLabel = 'الإداري 👮';
                        } else {
                            logAuthorTitle = `${discordGuild.name} MIDDLEMAN REVIEW`;
                            
                            let medColor = serverConfig.basicRatingColor;
                            if (!medColor) {
                                medColor = '#f2a658';
                            }
                            logEmbedColor = medColor;
                            
                            ratedPersonLabel = 'الوسيط 🛡️';
                        }

                        // بناء إيمبد اللوج
                        const ratingLogEmbed = new EmbedBuilder();
                        
                        ratingLogEmbed.setAuthor({ 
                            name: `📊 ${logAuthorTitle}`, 
                            iconURL: discordGuild.iconURL({ dynamic: true }) 
                        });
                        
                        ratingLogEmbed.setThumbnail(discordGuild.iconURL({ dynamic: true }));
                        
                        let embedDescriptionText = ``;
                        embedDescriptionText += `**العميل (المُقيِّم) 👤**\n`;
                        embedDescriptionText += `<@${interaction.user.id}>\n\n`;
                        embedDescriptionText += `**${ratedPersonLabel}**\n`;
                        embedDescriptionText += `<@${ratedTargetId}>\n\n`;
                        
                        // إضافة التريد للإيمبد إذا كان وساطة
                        if (ratingType === 'mediator') {
                            embedDescriptionText += `**📦 تفاصيل التريد:**\n`;
                            embedDescriptionText += `> ${tradeDetailsIncluded}\n\n`;
                        }

                        embedDescriptionText += `**الإحصائيات 📈**\n`;
                        embedDescriptionText += `عدد التقييمات #${individualRatingCount}\n`;
                        embedDescriptionText += `إجمالي السيرفر #${currentServerTotal}\n\n`;
                        embedDescriptionText += `-------------------------\n\n`;
                        embedDescriptionText += `**التقييم ⭐**\n`;
                        embedDescriptionText += `**${starsEmojiText} (${ratingStars}/5)**\n\n`;
                        embedDescriptionText += `**التعليق 💬**\n`;
                        embedDescriptionText += `\`\`\`${userFeedback}\`\`\``;

                        ratingLogEmbed.setDescription(embedDescriptionText);
                        ratingLogEmbed.setColor(logEmbedColor);
                        
                        ratingLogEmbed.setFooter({ 
                            text: `Rated by: ${interaction.user.username}`, 
                            iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                        });
                        
                        ratingLogEmbed.setTimestamp();

                        let logMessageContent = `**New Rating for <@${ratedTargetId}>!**`;
                        
                        await logChannel.send({ 
                            content: logMessageContent, 
                            embeds: [ratingLogEmbed] 
                        }).catch(()=>{});
                    }
                }
                
                // تعديل رسالة الخاص للعضو
                const thankYouEmbed = new EmbedBuilder();
                thankYouEmbed.setDescription(`**✅ شكراً لك! تم إرسال تقييمك للإدارة بنجاح.**\n\nالنجوم: ${ratingStars}/5`);
                thankYouEmbed.setColor('#3ba55d');
                
                try { 
                    await interaction.editReply({ embeds: [thankYouEmbed], components: [] }).catch(()=>{}); 
                } catch (err) { }
                
                return;
            }
        }

        // =====================================================================
        // التأكد أن التفاعل داخل السيرفر (للتكتات والأوامر)
        // =====================================================================
        if (!interaction.guild) {
            return;
        }
        
        const guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
        
        if (!guildConfig) {
            return;
        }

        // =====================================================================
        // ⚖️ 3. تفاعلات نافذة أمر التريد (!trade)
        // =====================================================================
        if (interaction.isButton()) {
            
            if (interaction.customId === 'open_trade_modal') {
                
                const tradeModal = new ModalBuilder();
                tradeModal.setCustomId('submit_trade_modal');
                tradeModal.setTitle('Trade Details');
                
                const tradeInput = new TextInputBuilder();
                tradeInput.setCustomId('trade_details_input');
                tradeInput.setLabel('ما هي تفاصيل التريد؟ (الحساب، السعر..)');
                tradeInput.setStyle(TextInputStyle.Paragraph);
                tradeInput.setRequired(true);
                
                const tradeActionRow = new ActionRowBuilder();
                tradeActionRow.addComponents(tradeInput);
                
                tradeModal.addComponents(tradeActionRow);
                
                await interaction.showModal(tradeModal);
                return;
            }
        }

        if (interaction.isModalSubmit()) {
            
            if (interaction.customId === 'submit_trade_modal') {
                
                const tradeDetailsText = interaction.fields.getTextInputValue('trade_details_input');
                
                // 🔥 تعطيل زر التريد الأصلي حتى لا يضغط عليه العضو مرة أخرى
                if (interaction.message) {
                    const originalActionRow = interaction.message.components[0];
                    if (originalActionRow) {
                        const originalButton = originalActionRow.components[0];
                        const disabledButton = ButtonBuilder.from(originalButton);
                        
                        // جعله شفاف وغير قابل للضغط
                        disabledButton.setDisabled(true);
                        disabledButton.setStyle(ButtonStyle.Secondary);
                        
                        const newDisabledRow = new ActionRowBuilder();
                        newDisabledRow.addComponents(disabledButton);
                        
                        // تعديل الرسالة القديمة
                        await interaction.message.edit({ components: [newDisabledRow] }).catch(()=>{});
                    }
                }

                // بناء إيمبد الموافقة الجديد
                const tradeRequestEmbed = new EmbedBuilder();
                tradeRequestEmbed.setTitle('⚖️ Trade Approval Request');
                
                let tradeDesc = '';
                tradeDesc += `**Middleman:** <@${interaction.user.id}>\n\n`;
                tradeDesc += `**Details:**\n\`\`\`${tradeDetailsText}\`\`\`\n\n`;
                tradeDesc += `⏳ *Waiting for approval...*`;
                
                tradeRequestEmbed.setDescription(tradeDesc);
                
                let tColor = guildConfig.tradeEmbedColor;
                if (!tColor) {
                    tColor = '#f2a658';
                }
                
                tradeRequestEmbed.setColor(tColor);
                tradeRequestEmbed.setTimestamp();

                const approvalRow = new ActionRowBuilder();
                
                const approveBtn = new ButtonBuilder();
                approveBtn.setCustomId('trade_approve');
                approveBtn.setLabel('Approve ✅');
                approveBtn.setStyle(ButtonStyle.Success);
                
                const rejectBtn = new ButtonBuilder();
                rejectBtn.setCustomId('trade_reject');
                rejectBtn.setLabel('Reject ❌');
                rejectBtn.setStyle(ButtonStyle.Danger);
                
                approvalRow.addComponents(approveBtn, rejectBtn);

                // إرسال طلب الموافقة كرد جديد في الشات
                await interaction.reply({ 
                    embeds: [tradeRequestEmbed], 
                    components: [approvalRow] 
                });
                
                return;
            }
        }

        if (interaction.isButton()) {
            
            let isTradeAction = (interaction.customId === 'trade_approve' || interaction.customId === 'trade_reject');
            
            if (isTradeAction) {
                
                let tradeAllowedRoles = guildConfig.tradeApproveRoles;
                
                if (!tradeAllowedRoles || tradeAllowedRoles.length === 0) {
                    tradeAllowedRoles = guildConfig.highMediatorRoles; 
                }
                
                let hasTradePerm = false;
                
                if (interaction.member.permissions.has('Administrator')) {
                    hasTradePerm = true;
                } else {
                    for (let i = 0; i < tradeAllowedRoles.length; i++) {
                        if (interaction.member.roles.cache.has(tradeAllowedRoles[i])) {
                            hasTradePerm = true;
                            break;
                        }
                    }
                }
                
                if (!hasTradePerm) {
                    return interaction.reply({ 
                        content: '**❌ You do not have permission to approve or reject.**', 
                        ephemeral: true 
                    });
                }

                const oldEmbed = interaction.message.embeds[0];
                const updatedTradeEmbed = EmbedBuilder.from(oldEmbed);
                
                if (interaction.customId === 'trade_approve') {
                    updatedTradeEmbed.setColor('#3ba55d');
                    updatedTradeEmbed.addFields({ 
                        name: 'Status:', 
                        value: `**✅ Approved by <@${interaction.user.id}>**` 
                    });
                } else {
                    updatedTradeEmbed.setColor('#ed4245');
                    updatedTradeEmbed.addFields({ 
                        name: 'Status:', 
                        value: `**❌ Rejected by <@${interaction.user.id}>**` 
                    });
                }

                await interaction.update({ 
                    embeds: [updatedTradeEmbed], 
                    components: [] 
                });
                
                return;
            }
        }

        // =====================================================================
        // 🟢 4. زر تحميل الترانسكريبت المباشر (Direct Transcript)
        // =====================================================================
        if (interaction.isButton()) {
            
            if (interaction.customId === 'direct_transcript_btn') {
                
                await interaction.deferReply({ ephemeral: true });
                
                const logMsgContent = interaction.message.content;
                let ticketChannelName = logMsgContent.replace('**📄 Transcript for ', '');
                ticketChannelName = ticketChannelName.replace('**', '');
                
                try {
                    const htmlFileAttachment = await discordTranscripts.createTranscript(interaction.channel, { 
                        limit: -1, 
                        returnType: 'attachment', 
                        filename: `${ticketChannelName}.html`, 
                        saveImages: true 
                    });
                    
                    await interaction.editReply({ 
                        content: '**✅ Here is your direct transcript file:**', 
                        files: [htmlFileAttachment] 
                    });
                    
                } catch (err) {
                    await interaction.editReply({ 
                        content: '**❌ Error generating the direct transcript.**' 
                    });
                }
                
                return;
            }
        }

        // =====================================================================
        // 🎟️ 5. فتح التكت من البانر الخارجي
        // =====================================================================
        if (interaction.isButton()) {
            
            if (interaction.customId.startsWith('ticket_open_')) {
                
                const buttonRealId = interaction.customId.replace('ticket_open_', '');
                
                let targetButtonData = null;
                
                for (let i = 0; i < guildConfig.customButtons.length; i++) {
                    if (guildConfig.customButtons[i].id === buttonRealId) {
                        targetButtonData = guildConfig.customButtons[i];
                        break;
                    }
                }
                
                if (!targetButtonData) {
                    return interaction.reply({ 
                        content: '**❌ This button is no longer available.**', 
                        ephemeral: true 
                    });
                }

                // فحص الحد الأقصى (للتكتات المفتوحة فقط، يتم تجاهل الـ closed)
                let maximumTickets = guildConfig.maxTicketsPerUser;
                if (!maximumTickets) {
                    maximumTickets = 1;
                }

                const existingOpenTickets = interaction.guild.channels.cache.filter(channel => {
                    let isTicketName = channel.name.startsWith('ticket-');
                    let isOwnedByCurrentUser = false;
                    
                    if (channel.topic && channel.topic.startsWith(interaction.user.id)) {
                        isOwnedByCurrentUser = true;
                    }
                    
                    return isTicketName && isOwnedByCurrentUser;
                });
                
                if (existingOpenTickets.size >= maximumTickets) {
                    return interaction.reply({ 
                        content: `**❌ You can only have ${maximumTickets} open ticket(s) at the same time.**`, 
                        ephemeral: true 
                    });
                }

                let hasModalFields = false;
                if (targetButtonData.modalFields && targetButtonData.modalFields.length > 0) {
                    hasModalFields = true;
                }
                
                if (targetButtonData.requireModal && hasModalFields) {
                    
                    const ticketModal = new ModalBuilder();
                    ticketModal.setCustomId(`modalticket_${buttonRealId}`);
                    
                    let mTitle = targetButtonData.modalTitle;
                    if (!mTitle) {
                        mTitle = 'Ticket Details';
                    }
                    ticketModal.setTitle(mTitle);

                    for (let i = 0; i < targetButtonData.modalFields.length; i++) {
                        const currentField = targetButtonData.modalFields[i];
                        
                        const inputField = new TextInputBuilder();
                        inputField.setCustomId(`field_${i}`);
                        
                        let safeLabel = currentField.label;
                        if (safeLabel.length > 45) {
                            safeLabel = safeLabel.substring(0, 45);
                        }
                        inputField.setLabel(safeLabel);
                        
                        inputField.setStyle(TextInputStyle.Paragraph);
                        
                        let safePlaceholder = currentField.placeholder;
                        if (!safePlaceholder) {
                            safePlaceholder = 'Type your answer here...';
                        }
                        inputField.setPlaceholder(safePlaceholder);
                        
                        let isFieldRequired = false;
                        if (currentField.required === true || String(currentField.required) === 'true') {
                            isFieldRequired = true;
                        }
                        inputField.setRequired(isFieldRequired);
                        
                        const fieldRow = new ActionRowBuilder();
                        fieldRow.addComponents(inputField);
                        
                        ticketModal.addComponents(fieldRow);
                    }
                    
                    await interaction.showModal(ticketModal);
                } else {
                    await interaction.deferReply({ ephemeral: true });
                    await openNewTicket(interaction, targetButtonData, guildConfig, []);
                }
            }
        }

        // =====================================================================
        // 📝 6. استلام إجابات النافذة وفتح التكت
        // =====================================================================
        if (interaction.isModalSubmit()) {
            
            if (interaction.customId.startsWith('modalticket_')) {
                
                // 🔥 الرد الصاروخي لمنع الإيرور (Something went wrong)
                await interaction.deferReply({ ephemeral: true }).catch(()=>{});

                const buttonRealId = interaction.customId.replace('modalticket_', '');
                
                let targetButtonData = null;
                
                for (let i = 0; i < guildConfig.customButtons.length; i++) {
                    if (guildConfig.customButtons[i].id === buttonRealId) {
                        targetButtonData = guildConfig.customButtons[i];
                        break;
                    }
                }
                
                if (!targetButtonData) return;
                
                const userAnswersArray = [];
                
                for (let i = 0; i < targetButtonData.modalFields.length; i++) {
                    const fieldConfig = targetButtonData.modalFields[i];
                    const writtenValue = interaction.fields.getTextInputValue(`field_${i}`);
                    
                    userAnswersArray.push({
                        label: fieldConfig.label,
                        value: writtenValue
                    });
                }
                
                await openNewTicket(interaction, targetButtonData, guildConfig, userAnswersArray);
            }
        }

        // =====================================================================
        // ⚙️ 7. أزرار التحكم داخل التكت (Claim, Close, Add User, Delete)
        // =====================================================================
        if (interaction.isButton()) {
            
            // -------------------------------------------------------------
            // 🔒 زر الإغلاق 1: رسالة التأكيد (2-Step Close)
            // -------------------------------------------------------------
            if (interaction.customId === 'ticket_close') {
                
                const confirmationRow = new ActionRowBuilder();
                
                const confirmButton = new ButtonBuilder();
                confirmButton.setCustomId('confirm_close');
                confirmButton.setLabel('Confirm Close');
                confirmButton.setStyle(ButtonStyle.Danger);
                
                const cancelButton = new ButtonBuilder();
                cancelButton.setCustomId('cancel_close');
                cancelButton.setLabel('Cancel');
                cancelButton.setStyle(ButtonStyle.Secondary);
                
                confirmationRow.addComponents(confirmButton, cancelButton);
                
                await interaction.reply({ 
                    content: '**⚠️ Are you sure you want to close this ticket?**', 
                    components: [confirmationRow], 
                    ephemeral: true 
                });
            }

            if (interaction.customId === 'cancel_close') {
                await interaction.update({ 
                    content: '**✅ Cancelled.**', 
                    components: [] 
                });
            }

            // -------------------------------------------------------------
            // ✅ تأكيد الإغلاق الفعلي
            // -------------------------------------------------------------
            if (interaction.customId === 'confirm_close') {
                
                await interaction.deferUpdate(); 
                
                let currentTopic = interaction.channel.topic;
                if (!currentTopic) {
                    currentTopic = '';
                }
                
                const topicParts = currentTopic.split('_');
                
                const ticketOwnerId = topicParts[0];
                const usedBtnId = topicParts[1];
                
                let claimedByAdminId = null;
                if (topicParts.length > 2 && topicParts[2] !== 'none') {
                    claimedByAdminId = topicParts[2];
                }
                
                let isMediatorTicket = false;
                if (topicParts.length > 5 && topicParts[5] === 'true') {
                    isMediatorTicket = true;
                }

                // تغيير اسم الروم
                let oldChannelName = interaction.channel.name;
                let nameParts = oldChannelName.split('-');
                let oldNameNumber = nameParts[1];
                if (!oldNameNumber) {
                    oldNameNumber = '0';
                }
                
                await interaction.channel.setName(`closed-${oldNameNumber}`).catch(()=>{});

                const closingMessage = `**🔒 The ticket has been closed by <@${interaction.user.id}>**`;
                await interaction.channel.send(closingMessage);

                let shouldSendStaffRating = true;
                
                if (isMediatorTicket) {
                    shouldSendStaffRating = false; 
                } else {
                    let specificBtnData = null;
                    for (let i = 0; i < guildConfig.customButtons.length; i++) {
                        if (guildConfig.customButtons[i].id === usedBtnId) {
                            specificBtnData = guildConfig.customButtons[i];
                            break;
                        }
                    }
                    
                    if (specificBtnData && specificBtnData.enableRating === false) {
                        shouldSendStaffRating = false;
                    }
                }

                let hasRatingChannel = guildConfig.staffRatingChannelId;
                
                if (shouldSendStaffRating && ticketOwnerId && claimedByAdminId && hasRatingChannel) {
                    try {
                        const ticketOwnerUser = await interaction.guild.members.fetch(ticketOwnerId);
                        const guildNameStr = interaction.guild.name;
                        
                        const ratingEmbed = new EmbedBuilder();
                        
                        let embedTitleStr = '';
                        let embedDescStr = '';
                        
                        let isCustomStyle = (guildConfig.ratingStyle === 'custom');
                        let hasCustomText = guildConfig.customRatingText;
                        
                        if (isCustomStyle && hasCustomText) {
                            embedTitleStr = guildConfig.customRatingTitle;
                            if (!embedTitleStr) {
                                embedTitleStr = 'Feedback';
                            }
                            
                            embedDescStr = guildConfig.customRatingText;
                            embedDescStr = embedDescStr.replace(/\[staff\]/g, `<@${claimedByAdminId}>`);
                            embedDescStr = embedDescStr.replace(/\[user\]/g, `<@${ticketOwnerUser.id}>`);
                            embedDescStr = embedDescStr.replace(/\[server\]/g, guildNameStr);
                        } else {
                            embedTitleStr = 'تقييم فريق العمل';
                            embedDescStr = `شكرا لتواصلك مع الدعم الفني الخاص بسيرفر **${guildNameStr}**\n\nيرجى تقييم مستوى الخدمة التي تلقيتها من <@${claimedByAdminId}>، رأيك يهمنا ويساعدنا في تحسين جودة الخدمة، اضغط على الزر الموافق لتقييمك وسيتم ارسال التقييم للادارة.`;
                        }
                        
                        ratingEmbed.setTitle(embedTitleStr);
                        ratingEmbed.setDescription(embedDescStr);
                        
                        let staffColor = guildConfig.staffRatingColor;
                        if (!staffColor) {
                            staffColor = '#3ba55d';
                        }
                        ratingEmbed.setColor(staffColor);
                        
                        ratingEmbed.setFooter({ 
                            text: guildNameStr, 
                            iconURL: interaction.guild.iconURL({ dynamic: true }) 
                        });
                        ratingEmbed.setTimestamp();
                        
                        const starsRow = new ActionRowBuilder();
                        
                        const s1 = new ButtonBuilder().setCustomId(`rate_staff_1_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary);
                        const s2 = new ButtonBuilder().setCustomId(`rate_staff_2_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary);
                        const s3 = new ButtonBuilder().setCustomId(`rate_staff_3_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        const s4 = new ButtonBuilder().setCustomId(`rate_staff_4_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        const s5 = new ButtonBuilder().setCustomId(`rate_staff_5_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        
                        starsRow.addComponents(s1, s2, s3, s4, s5);
                        
                        await ticketOwnerUser.send({ embeds: [ratingEmbed], components: [starsRow] });
                        
                    } catch (errorLog) { }
                }

                if (ticketOwnerId) {
                    await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { 
                        SendMessages: false, 
                        ViewChannel: false 
                    }).catch(()=>{});
                }

                while(topicParts.length < 6) {
                    topicParts.push('none');
                }
                topicParts[4] = interaction.user.id;
                
                let newTopicString = topicParts.join('_');
                await interaction.channel.setTopic(newTopicString).catch(()=>{});

                const controlEmbed = new EmbedBuilder();
                controlEmbed.setTitle('Ticket control');
                controlEmbed.setDescription(`Closed By: <@${interaction.user.id}>\n(${interaction.user.id})`);
                
                let cColor = guildConfig.closeEmbedColor;
                if (!cColor) {
                    cColor = '#2b2d31';
                }
                controlEmbed.setColor(cColor);
                
                const cRow1 = new ActionRowBuilder();
                
                const reopenBtn = new ButtonBuilder();
                reopenBtn.setCustomId('ticket_reopen');
                reopenBtn.setLabel('Reopen ticket');
                reopenBtn.setStyle(ButtonStyle.Secondary);
                
                const deleteBtn = new ButtonBuilder();
                deleteBtn.setCustomId('ticket_delete');
                deleteBtn.setLabel('Delete ticket');
                deleteBtn.setStyle(ButtonStyle.Danger);
                
                cRow1.addComponents(reopenBtn, deleteBtn);
                
                const cRow2 = new ActionRowBuilder();
                
                const delReasonBtn = new ButtonBuilder();
                delReasonBtn.setCustomId('ticket_delete_reason');
                delReasonBtn.setLabel('Delete With Reason');
                delReasonBtn.setStyle(ButtonStyle.Danger);
                
                cRow2.addComponents(delReasonBtn);
                
                await interaction.channel.send({ embeds: [controlEmbed], components: [cRow1, cRow2] });
                
                await interaction.message.delete().catch(()=>{});
            }

            // -------------------------------------------------------------
            // 🛡️ زر الاستلام (Claim) السرعة الجبارة بالـ Update الفوري
            // -------------------------------------------------------------
            if (interaction.customId === 'ticket_claim') {
                
                let currentTopic = interaction.channel.topic;
                if (!currentTopic) {
                    currentTopic = '';
                }
                
                const topicParts = currentTopic.split('_');
                const usedBtnId = topicParts[1];
                
                let specificBtnData = null;
                for (let i = 0; i < guildConfig.customButtons.length; i++) {
                    if (guildConfig.customButtons[i].id === usedBtnId) {
                        specificBtnData = guildConfig.customButtons[i];
                        break;
                    }
                }

                let allowedToClaimRoles = [];
                let hasCustomClaimRoles = false;
                
                if (specificBtnData && specificBtnData.allowedClaimRoles && specificBtnData.allowedClaimRoles.length > 0) {
                    hasCustomClaimRoles = true;
                }
                
                if (hasCustomClaimRoles) {
                    allowedToClaimRoles = specificBtnData.allowedClaimRoles;
                } else {
                    const allStaffArr = [
                        guildConfig.adminRoleId, 
                        guildConfig.mediatorRoleId, 
                        ...guildConfig.highAdminRoles, 
                        ...guildConfig.highMediatorRoles
                    ];
                    
                    for (let i = 0; i < allStaffArr.length; i++) {
                        if (allStaffArr[i]) {
                            allowedToClaimRoles.push(allStaffArr[i]);
                        }
                    }
                }

                let canClaim = false;
                if (interaction.member.permissions.has('Administrator')) {
                    canClaim = true;
                } else {
                    for (let i = 0; i < allowedToClaimRoles.length; i++) {
                        if (interaction.member.roles.cache.has(allowedToClaimRoles[i])) {
                            canClaim = true;
                            break;
                        }
                    }
                }

                if (!canClaim) {
                    return interaction.reply({ 
                        content: '**❌ You do not have permission to claim this ticket.**', 
                        ephemeral: true 
                    });
                }

                // 🔥 الحل السحري: استخدام interaction.update يغير لون الزرار في نفس اللحظة!
                const oldComponents = interaction.message.components;
                const newComponentsArr = [];
                
                for (let i = 0; i < oldComponents.length; i++) {
                    const oldRow = oldComponents[i];
                    const newRow = new ActionRowBuilder();
                    
                    for (let j = 0; j < oldRow.components.length; j++) {
                        const oldBtn = oldRow.components[j];
                        const clonedBtn = ButtonBuilder.from(oldBtn);
                        
                        if (oldBtn.customId === 'ticket_claim') {
                            clonedBtn.setDisabled(true);
                            clonedBtn.setStyle(ButtonStyle.Success);
                        }
                        
                        newRow.addComponents(clonedBtn);
                    }
                    newComponentsArr.push(newRow);
                }
                
                await interaction.update({ components: newComponentsArr }).catch(()=>{});
                
                const claimMsg = `**✅ Ticket has been claimed by <@${interaction.user.id}>**`;
                await interaction.channel.send(claimMsg).catch(()=>{});

                // ==========================================
                // تعديل الصلاحيات في الخلفية (طلقة)
                // ==========================================
                const currentOverwrites = interaction.channel.permissionOverwrites.cache;
                const newOverwritesArray = [];
                
                currentOverwrites.forEach((overwrite) => {
                    newOverwritesArray.push({
                        id: overwrite.id,
                        allow: overwrite.allow.toArray(),
                        deny: overwrite.deny.toArray()
                    });
                });

                for (let i = 0; i < allowedToClaimRoles.length; i++) {
                    const staffRoleId = allowedToClaimRoles[i];
                    let roleOverwrite = null;
                    
                    for (let k = 0; k < newOverwritesArray.length; k++) {
                        if (newOverwritesArray[k].id === staffRoleId) {
                            roleOverwrite = newOverwritesArray[k];
                            break;
                        }
                    }
                    
                    if (!roleOverwrite) {
                        roleOverwrite = { id: staffRoleId, allow: [], deny: [] };
                        newOverwritesArray.push(roleOverwrite);
                    }
                    
                    if (guildConfig.hideTicketOnClaim) {
                        if (!roleOverwrite.deny.includes('ViewChannel')) {
                            roleOverwrite.deny.push('ViewChannel');
                        }
                        roleOverwrite.allow = roleOverwrite.allow.filter(p => p !== 'ViewChannel');
                    } else if (guildConfig.readOnlyStaffOnClaim) {
                        if (!roleOverwrite.deny.includes('SendMessages')) {
                            roleOverwrite.deny.push('SendMessages');
                        }
                        roleOverwrite.allow = roleOverwrite.allow.filter(p => p !== 'SendMessages');
                    }
                }
                
                let claimerOverwrite = null;
                for (let k = 0; k < newOverwritesArray.length; k++) {
                    if (newOverwritesArray[k].id === interaction.user.id) {
                        claimerOverwrite = newOverwritesArray[k];
                        break;
                    }
                }
                
                if (!claimerOverwrite) {
                    newOverwritesArray.push({ 
                        id: interaction.user.id, 
                        allow: ['ViewChannel', 'SendMessages'], 
                        deny: [] 
                    });
                } else {
                    if (!claimerOverwrite.allow.includes('ViewChannel')) {
                        claimerOverwrite.allow.push('ViewChannel');
                    }
                    if (!claimerOverwrite.allow.includes('SendMessages')) {
                        claimerOverwrite.allow.push('SendMessages');
                    }
                }

                await interaction.channel.permissionOverwrites.set(newOverwritesArray).catch(()=>{});
                
                while(topicParts.length < 6) {
                    topicParts.push('none');
                }
                topicParts[2] = interaction.user.id;
                
                let newTopicStr = topicParts.join('_');
                await interaction.channel.setTopic(newTopicStr).catch(()=>{});
            }

            // -------------------------------------------------------------
            // 🔓 باقي الأزرار
            // -------------------------------------------------------------
            if (interaction.customId === 'ticket_reopen') {
                
                let currentTopic = interaction.channel.topic;
                if (!currentTopic) {
                    currentTopic = '';
                }
                
                const ticketOwnerId = currentTopic.split('_')[0];
                
                if (ticketOwnerId && ticketOwnerId !== 'none') {
                    await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { 
                        SendMessages: true, 
                        ViewChannel: true 
                    });
                }
                
                let oldChannelName = interaction.channel.name;
                let nameParts = oldChannelName.split('-');
                let oldNameNumber = nameParts[1];
                if (!oldNameNumber) {
                    oldNameNumber = '0';
                }
                
                await interaction.channel.setName(`ticket-${oldNameNumber}`).catch(()=>{});
                
                await interaction.reply('**✅ Ticket has been reopened.**');
                await interaction.message.delete().catch(() => {});
            }

            if (interaction.customId === 'ticket_delete') {
                
                await interaction.reply({ 
                    content: '**🗑️ Deleting the ticket...**', 
                    ephemeral: true 
                });
                
                await executeDeleteAndLog(interaction.channel, interaction.user, guildConfig, "Manual Delete");
            }

            if (interaction.customId === 'ticket_delete_reason') {
                
                const deleteModal = new ModalBuilder();
                deleteModal.setCustomId('modal_delete_reason');
                deleteModal.setTitle('Delete Reason');
                
                const reasonInputText = new TextInputBuilder();
                reasonInputText.setCustomId('delete_reason');
                reasonInputText.setLabel('Reason:');
                reasonInputText.setStyle(TextInputStyle.Short);
                reasonInputText.setRequired(true);
                
                const delRow = new ActionRowBuilder();
                delRow.addComponents(reasonInputText);
                
                deleteModal.addComponents(delRow);
                
                await interaction.showModal(deleteModal);
            }

            if (interaction.customId === 'ticket_add_user') {
                
                const addModal = new ModalBuilder();
                addModal.setCustomId('modal_add_user');
                addModal.setTitle('Add User');
                
                const userIdInput = new TextInputBuilder();
                userIdInput.setCustomId('user_id_to_add');
                userIdInput.setLabel('User ID:');
                userIdInput.setStyle(TextInputStyle.Short);
                userIdInput.setRequired(true);
                
                const addRow = new ActionRowBuilder();
                addRow.addComponents(userIdInput);
                
                addModal.addComponents(addRow);
                
                await interaction.showModal(addModal);
            }
        }

        // =====================================================================
        // 🧩 معالجة النوافذ المنبثقة للإدارة
        // =====================================================================
        if (interaction.isModalSubmit()) {
            
            if (interaction.customId === 'modal_delete_reason') {
                
                const writtenReason = interaction.fields.getTextInputValue('delete_reason');
                
                await interaction.reply({ 
                    content: '**🗑️ Deleting the ticket...**', 
                    ephemeral: true 
                });
                
                await executeDeleteAndLog(interaction.channel, interaction.user, guildConfig, writtenReason);
            }

            if (interaction.customId === 'modal_add_user') {
                
                const userIdToAdd = interaction.fields.getTextInputValue('user_id_to_add');
                
                try {
                    const memberToAdd = await interaction.guild.members.fetch(userIdToAdd);
                    
                    await interaction.channel.permissionOverwrites.edit(userIdToAdd, { 
                        ViewChannel: true, 
                        SendMessages: true 
                    });
                    
                    let currentTopic = interaction.channel.topic;
                    if (!currentTopic) {
                        currentTopic = '';
                    }
                    
                    const topicParts = currentTopic.split('_');
                    while(topicParts.length < 6) {
                        topicParts.push('none');
                    }
                    
                    let alreadyAdded = topicParts[3];
                    if (alreadyAdded === 'none') {
                        alreadyAdded = userIdToAdd;
                    } else {
                        alreadyAdded = `${alreadyAdded},${userIdToAdd}`;
                    }
                    
                    topicParts[3] = alreadyAdded;
                    
                    let newTopicString = topicParts.join('_');
                    await interaction.channel.setTopic(newTopicString).catch(()=>{});

                    const successAddMsg = `**✅ <@${userIdToAdd}> was added to the ticket by <@${interaction.user.id}>**`;
                    await interaction.reply(successAddMsg);
                    
                } catch (addError) { 
                    await interaction.reply({ 
                        content: '**❌ User not found in this server.**', 
                        ephemeral: true 
                    }); 
                }
            }
        }
    });

    // =====================================================================
    // 🛠️ Helper Function: فتح تكت جديد
    // =====================================================================
    async function openNewTicket(interaction, buttonData, config, answersArray) {
        
        let currentTicketCount = config.ticketCount;
        if (!currentTicketCount) {
            currentTicketCount = 0;
        }
        
        const newTicketNumber = currentTicketCount + 1;
        
        let targetCategoryId = buttonData.categoryId;
        if (!targetCategoryId) {
            targetCategoryId = config.defaultCategoryId;
        }
        
        const permsArray = [];
        
        permsArray.push({ 
            id: interaction.guild.id, 
            deny: [PermissionFlagsBits.ViewChannel] 
        });
        
        permsArray.push({ 
            id: interaction.user.id, 
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
        });
        
        const staffRolesArray = [
            config.adminRoleId, 
            config.mediatorRoleId, 
            ...config.highAdminRoles, 
            ...config.highMediatorRoles
        ];
        
        for (let i = 0; i < staffRolesArray.length; i++) {
            if (staffRolesArray[i]) {
                permsArray.push({ 
                    id: staffRolesArray[i], 
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
                });
            }
        }

        // حفظ نوع التكت في الخانة السادسة
        let isMedStr = 'false';
        if (buttonData.isMediator === true) {
            isMedStr = 'true';
        }
        
        const initialTopicData = `${interaction.user.id}_${buttonData.id}_none_none_none_${isMedStr}`;

        const createdChannel = await interaction.guild.channels.create({
            name: `ticket-${newTicketNumber}`, 
            type: ChannelType.GuildText, 
            parent: targetCategoryId, 
            topic: initialTopicData, 
            permissionOverwrites: permsArray
        });
        
        await GuildConfig.findOneAndUpdate({ guildId: interaction.guild.id }, { $inc: { ticketCount: 1 } });

        const msgContent = `**Welcome <@${interaction.user.id}>**\n**Reason:** ${buttonData.label}`;
        
        const embedsList = [];

        const infoEmbed = new EmbedBuilder();
        
        let titleVal = buttonData.insideEmbedTitle;
        if (!titleVal) {
            titleVal = 'Support Ticket';
        }
        infoEmbed.setTitle(titleVal);
        
        let descVal = buttonData.insideEmbedDesc;
        if (!descVal) {
            descVal = 'Please detail your issue.';
        }
        infoEmbed.setDescription(descVal);
        
        let colorVal = buttonData.insideEmbedColor;
        if (!colorVal) {
            colorVal = '#2b2d31';
        }
        infoEmbed.setColor(colorVal);
        
        embedsList.push(infoEmbed);

        if (answersArray && answersArray.length > 0) {
            
            const answersEmbed = new EmbedBuilder();
            
            let ansColor = config.answersEmbedColor;
            if (!ansColor) {
                ansColor = '#2b2d31';
            }
            answersEmbed.setColor(ansColor);
            
            for (let i = 0; i < answersArray.length; i++) {
                const singleAnswer = answersArray[i];
                
                let valToDisplay = singleAnswer.value;
                if (!valToDisplay || valToDisplay === '') {
                    valToDisplay = 'N/A';
                }
                
                answersEmbed.addFields({ 
                    name: `**${singleAnswer.label}**`, 
                    value: valToDisplay 
                });
            }
            
            embedsList.push(answersEmbed);
        }

        const controlsRow1 = new ActionRowBuilder();
        
        const btnAdd = new ButtonBuilder();
        btnAdd.setCustomId('ticket_add_user');
        btnAdd.setLabel('Add User');
        btnAdd.setStyle(ButtonStyle.Secondary); 
        
        const btnClaim = new ButtonBuilder();
        btnClaim.setCustomId('ticket_claim');
        btnClaim.setLabel('Claim');
        btnClaim.setStyle(ButtonStyle.Success); 
        
        const btnClose = new ButtonBuilder();
        btnClose.setCustomId('ticket_close');
        btnClose.setLabel('Close');
        btnClose.setStyle(ButtonStyle.Danger); 
        
        controlsRow1.addComponents(btnAdd, btnClaim, btnClose);

        const controlsRow2 = new ActionRowBuilder();
        
        const btnDelReason = new ButtonBuilder();
        btnDelReason.setCustomId('ticket_delete_reason');
        btnDelReason.setLabel('Delete With Reason');
        btnDelReason.setStyle(ButtonStyle.Danger); 
        
        controlsRow2.addComponents(btnDelReason);
        
        await createdChannel.send({ 
            content: msgContent, 
            embeds: embedsList, 
            components: [controlsRow1, controlsRow2] 
        });
        
        const successReply = `**✅ Ticket opened successfully: <#${createdChannel.id}>**`;
        
        try {
            await interaction.editReply(successReply);
        } catch (e) {
            await interaction.reply({ content: successReply, ephemeral: true });
        }
    }

    // =====================================================================
    // 🛠️ Helper Function: اللوجات
    // =====================================================================
    async function executeDeleteAndLog(ticketChannel, closedByUser, config, deleteReasonText) {
        
        let currentTopic = ticketChannel.topic;
        if (!currentTopic) {
            currentTopic = '';
        }
        
        const topicParts = currentTopic.split('_');
        
        let tOwnerId = null;
        if (topicParts[0] && topicParts[0] !== 'none') {
            tOwnerId = topicParts[0];
        }
        
        let tClaimerId = null;
        if (topicParts[2] && topicParts[2] !== 'none') {
            tClaimerId = topicParts[2];
        }
        
        let tAddedUsersList = [];
        if (topicParts[3] && topicParts[3] !== 'none') {
            tAddedUsersList = topicParts[3].split(',');
        }
        
        let tClosedById = closedByUser.id;
        if (topicParts[4] && topicParts[4] !== 'none') {
            tClosedById = topicParts[4]; 
        }

        let ownerDisplayStr = 'Unknown';
        if (tOwnerId) {
            ownerDisplayStr = `<@${tOwnerId}>`;
        }
        
        let claimerDisplayStr = 'None';
        if (tClaimerId) {
            claimerDisplayStr = `<@${tClaimerId}>`;
        }
        
        let addedDisplayStr = 'None';
        if (tAddedUsersList.length > 0) {
            const mentionsArr = [];
            for (let i = 0; i < tAddedUsersList.length; i++) {
                mentionsArr.push(`<@${tAddedUsersList[i]}>`);
            }
            addedDisplayStr = mentionsArr.join(', ');
        }

        const mainLogEmbed = new EmbedBuilder();
        
        mainLogEmbed.setAuthor({ 
            name: 'MNC TICKET LOGS', 
            iconURL: ticketChannel.guild.iconURL({ dynamic: true }) 
        });
        
        mainLogEmbed.setTitle('🗑️ Ticket Deleted');
        
        let logDescStr = '';
        logDescStr += `**Ticket:** ${ticketChannel.name} was deleted.\n\n`;
        logDescStr += `👑 **Owner**\n`;
        logDescStr += `${ownerDisplayStr}\n\n`;
        logDescStr += `🗑️ **Deleted By**\n`;
        logDescStr += `<@${closedByUser.id}>\n\n`;
        logDescStr += `🙋 **Claimed By**\n`;
        logDescStr += `${claimerDisplayStr}\n\n`;
        logDescStr += `🔒 **Closed By**\n`;
        logDescStr += `<@${tClosedById}>\n\n`;
        logDescStr += `➕ **Added Users**\n`;
        logDescStr += `${addedDisplayStr}\n\n`;
        logDescStr += `📝 **Reason**\n`;
        logDescStr += `${deleteReasonText}`;
        
        mainLogEmbed.setDescription(logDescStr);
        
        let defaultLogColor = config.logEmbedColor;
        if (!defaultLogColor) {
            defaultLogColor = '#ed4245';
        }
        mainLogEmbed.setColor(defaultLogColor);
        
        mainLogEmbed.setTimestamp();

        if (config.ticketLogChannelId) { 
            const pureLogChannel = ticketChannel.guild.channels.cache.get(config.ticketLogChannelId); 
            if(pureLogChannel) {
                await pureLogChannel.send({ embeds: [mainLogEmbed] }).catch(()=>{}); 
            }
        }
        
        if (config.transcriptChannelId && config.transcriptChannelId !== config.ticketLogChannelId) { 
            const transcriptChannel = ticketChannel.guild.channels.cache.get(config.transcriptChannelId); 
            
            if(transcriptChannel) {
                
                const htmlAttachment = await discordTranscripts.createTranscript(ticketChannel, { 
                    limit: -1, 
                    returnType: 'attachment', 
                    filename: `${ticketChannel.name}.html`, 
                    saveImages: true 
                });
                
                let transColor = config.transcriptEmbedColor;
                if (!transColor) {
                    transColor = '#2b2d31';
                }
                mainLogEmbed.setColor(transColor);
                
                const directBtnRow = new ActionRowBuilder();
                
                const realDirectBtn = new ButtonBuilder();
                realDirectBtn.setCustomId('direct_transcript_btn');
                realDirectBtn.setLabel('Direct Transcript');
                realDirectBtn.setStyle(ButtonStyle.Primary);
                
                directBtnRow.addComponents(realDirectBtn);

                const msgToTransChannel = `**📄 Transcript for ${ticketChannel.name}**`;
                
                await transcriptChannel.send({ 
                    content: msgToTransChannel, 
                    files: [htmlAttachment], 
                    embeds: [mainLogEmbed], 
                    components: [directBtnRow] 
                }).catch(()=>{}); 
            }
        }
        
        setTimeout(() => { 
            ticketChannel.delete().catch(()=>{}); 
        }, 3000);
    }
};
