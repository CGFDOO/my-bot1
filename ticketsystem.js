// =====================================================================
// استدعاء المكاتب الأساسية من ديسكورد
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

// مكتبة الترانسكريبت (حفظ المحادثات)
const discordTranscripts = require('discord-html-transcripts');

// استدعاء قاعدة البيانات الخاصة بالسيرفرات
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    
    // =====================================================================
    // الحدث الرئيسي: عند تفاعل العضو مع أي زر أو نافذة
    // =====================================================================
    client.on('interactionCreate', async interaction => {

        // =====================================================================
        // ⭐ الجزء الأول: نظام التقييم في الخاص (عند الضغط على النجوم)
        // =====================================================================
        if (interaction.isButton()) {
            
            // التحقق إذا كان الزر هو زر تقييم
            let isRateButton = interaction.customId.startsWith('rate_');
            
            if (isRateButton) {
                
                // استخراج البيانات من معرف الزر
                const customIdParts = interaction.customId.split('_');
                const ratingType = customIdParts[1]; 
                const ratingStars = customIdParts[2];
                const ratedTargetId = customIdParts[3];
                const currentGuildId = customIdParts[4]; 

                // بناء نافذة (Modal) لأخذ تعليق العميل
                const feedbackModal = new ModalBuilder();
                
                // تعيين المعرف الخاص بالنافذة لنقل البيانات
                let modalId = `modalrate_${ratingType}_${ratingStars}_${ratedTargetId}_${currentGuildId}`;
                feedbackModal.setCustomId(modalId);
                
                // عنوان النافذة
                feedbackModal.setTitle('Add Comment (Optional)');

                // بناء حقل النص للتعليق
                const commentTextInput = new TextInputBuilder();
                commentTextInput.setCustomId('rating_comment');
                commentTextInput.setLabel('هل لديك أي تعليق إضافي؟');
                commentTextInput.setStyle(TextInputStyle.Paragraph);
                commentTextInput.setRequired(false); // حقل اختياري

                // إضافة الحقل إلى صف الأزرار
                const modalActionRow = new ActionRowBuilder();
                modalActionRow.addComponents(commentTextInput);
                
                // إضافة الصف إلى النافذة
                feedbackModal.addComponents(modalActionRow);

                // إظهار النافذة للمستخدم
                await interaction.showModal(feedbackModal);
                
                // إيقاف تنفيذ باقي الكود
                return;
            }
        }

        // =====================================================================
        // ⭐ الجزء الثاني: استلام تعليق التقييم وإرسال اللوج
        // =====================================================================
        if (interaction.isModalSubmit()) {
            
            let isRateModal = interaction.customId.startsWith('modalrate_');
            
            if (isRateModal) {
                
                // استخراج البيانات من معرف النافذة
                const customIdParts = interaction.customId.split('_');
                const ratingType = customIdParts[1];
                const ratingStars = parseInt(customIdParts[2]);
                const ratedTargetId = customIdParts[3];
                const currentGuildId = customIdParts[4];
                
                // جلب التعليق الذي كتبه العضو
                let userFeedback = interaction.fields.getTextInputValue('rating_comment');
                
                // إذا لم يكتب شيئاً، نضع نص افتراضي
                if (!userFeedback || userFeedback.trim() === '') {
                    userFeedback = 'لا يوجد تعليق.';
                }

                // جلب إعدادات السيرفر من قاعدة البيانات
                let serverConfig = await GuildConfig.findOne({ guildId: currentGuildId });
                
                if (!serverConfig) {
                    return;
                }

                // تحديد روم اللوج بناءً على نوع التقييم (إدارة أم وساطة)
                let targetLogChannelId = null;
                if (ratingType === 'staff') {
                    targetLogChannelId = serverConfig.staffRatingChannelId;
                } else if (ratingType === 'mediator') {
                    targetLogChannelId = serverConfig.mediatorRatingChannelId;
                }

                // جلب السيرفر من الكاش
                const discordGuild = client.guilds.cache.get(currentGuildId);
                
                if (discordGuild && targetLogChannelId) {
                    
                    const logChannel = discordGuild.channels.cache.get(targetLogChannelId);
                    
                    if (logChannel) {
                        
                        // 📊 تحديث الإحصائيات الشاملة في قاعدة البيانات
                        let currentServerTotal = serverConfig.totalServerRatings;
                        if (!currentServerTotal) currentServerTotal = 0;
                        currentServerTotal = currentServerTotal + 1;
                        serverConfig.totalServerRatings = currentServerTotal;

                        let individualRatingCount = 1;

                        // تحديث إحصائيات الإداري أو الوسيط
                        if (ratingType === 'staff') {
                            let oldStaffCount = serverConfig.staffRatingsCount.get(ratedTargetId);
                            if (!oldStaffCount) oldStaffCount = 0;
                            individualRatingCount = oldStaffCount + 1;
                            serverConfig.staffRatingsCount.set(ratedTargetId, individualRatingCount);
                        } else {
                            let oldMedCount = serverConfig.mediatorRatingsCount.get(ratedTargetId);
                            if (!oldMedCount) oldMedCount = 0;
                            individualRatingCount = oldMedCount + 1;
                            serverConfig.mediatorRatingsCount.set(ratedTargetId, individualRatingCount);
                        }
                        
                        // حفظ البيانات
                        await serverConfig.save();

                        // رسم النجوم كنص
                        let starsEmojiText = '';
                        for(let i = 0; i < ratingStars; i++) {
                            starsEmojiText += '⭐';
                        }

                        // إعداد نصوص وألوان اللوج
                        let logAuthorTitle = '';
                        let logEmbedColor = '';
                        let ratedPersonLabel = '';

                        if (ratingType === 'staff') {
                            logAuthorTitle = `${discordGuild.name} STAFF REVIEW`;
                            
                            let staffColor = serverConfig.staffRatingColor;
                            if (!staffColor) staffColor = '#3ba55d';
                            logEmbedColor = staffColor;
                            
                            ratedPersonLabel = 'الإداري 👮';
                        } else {
                            logAuthorTitle = `${discordGuild.name} MIDDLEMAN REVIEW`;
                            
                            let medColor = serverConfig.basicRatingColor;
                            if (!medColor) medColor = '#f2a658';
                            logEmbedColor = medColor;
                            
                            ratedPersonLabel = 'الوسيط 🛡️';
                        }

                        // بناء إيمبد اللوج الفخم خطوة بخطوة
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

                        // إرسال اللوج للروم المخصصة
                        let logMessageContent = `**New Rating for <@${ratedTargetId}>!**`;
                        await logChannel.send({ 
                            content: logMessageContent, 
                            embeds: [ratingLogEmbed] 
                        }).catch(()=>{});
                    }
                }
                
                // تعديل رسالة التقييم في الخاص لإخفاء الأزرار وإظهار الشكر
                const thankYouEmbed = new EmbedBuilder();
                thankYouEmbed.setDescription(`**✅ شكراً لك! تم إرسال تقييمك بنجاح.**\n\nالنجوم: ${ratingStars}/5`);
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
        // إيقاف التفاعلات إذا لم تكن في سيرفر (خاصة بنظام التكتات)
        // =====================================================================
        if (!interaction.guild) {
            return;
        }
        
        // جلب الإعدادات من الداتابيز
        const guildConfig = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!guildConfig) {
            return;
        }

        // =====================================================================
        // ⚖️ تفاعلات نافذة أمر التريد (!trade)
        // =====================================================================
        if (interaction.isButton()) {
            if (interaction.customId === 'open_trade_modal') {
                
                // بناء نافذة تفاصيل التريد
                const tradeModal = new ModalBuilder();
                tradeModal.setCustomId('submit_trade_modal');
                tradeModal.setTitle('Trade Details');
                
                // بناء حقل النص
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
                
                // جلب التفاصيل التي كتبها الوسيط
                const tradeDetailsText = interaction.fields.getTextInputValue('trade_details_input');
                
                // بناء إيمبد الموافقة
                const tradeRequestEmbed = new EmbedBuilder();
                tradeRequestEmbed.setTitle('⚖️ Trade Approval Request');
                
                let tradeDesc = '';
                tradeDesc += `**Middleman:** <@${interaction.user.id}>\n\n`;
                tradeDesc += `**Details:**\n\`\`\`${tradeDetailsText}\`\`\`\n\n`;
                tradeDesc += `⏳ *Waiting for approval...*`;
                tradeRequestEmbed.setDescription(tradeDesc);
                
                let tColor = guildConfig.tradeEmbedColor;
                if (!tColor) tColor = '#f2a658';
                tradeRequestEmbed.setColor(tColor);
                
                tradeRequestEmbed.setTimestamp();

                // بناء أزرار الموافقة والرفض
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

                // إرسال الإيمبد الجديد
                await interaction.reply({ embeds: [tradeRequestEmbed], components: [approvalRow] });
                
                // مسح رسالة الزر القديمة لتنظيف الشات
                await interaction.message.delete().catch(()=>{});
                return;
            }
        }

        if (interaction.isButton()) {
            let isTradeAction = (interaction.customId === 'trade_approve' || interaction.customId === 'trade_reject');
            if (isTradeAction) {
                
                // التحقق من الرتب المسموح لها بالموافقة
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
                    return interaction.reply({ content: '**❌ You do not have permission to approve or reject.**', ephemeral: true });
                }

                // تعديل الإيمبد بناءً على الضغطة
                const oldEmbed = interaction.message.embeds[0];
                const updatedTradeEmbed = EmbedBuilder.from(oldEmbed);
                
                if (interaction.customId === 'trade_approve') {
                    updatedTradeEmbed.setColor('#3ba55d');
                    updatedTradeEmbed.addFields({ name: 'Status:', value: `**✅ Approved by <@${interaction.user.id}>**` });
                } else {
                    updatedTradeEmbed.setColor('#ed4245');
                    updatedTradeEmbed.addFields({ name: 'Status:', value: `**❌ Rejected by <@${interaction.user.id}>**` });
                }

                // إزالة الأزرار وتحديث الرسالة
                await interaction.update({ embeds: [updatedTradeEmbed], components: [] });
                return;
            }
        }

        // =====================================================================
        // 🟢 فتح التكت من البانر الخارجي
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
                    return interaction.reply({ content: '**❌ This button is no longer available.**', ephemeral: true });
                }

                // التحقق من الحد الأقصى للتكتات المفتوحة
                let maximumTickets = guildConfig.maxTicketsPerUser;
                if (!maximumTickets) maximumTickets = 1;

                const existingTickets = interaction.guild.channels.cache.filter(channel => {
                    let isTicket = channel.name.startsWith('ticket-');
                    let isOwnedByUser = channel.topic && channel.topic.startsWith(interaction.user.id);
                    return isTicket && isOwnedByUser;
                });
                
                if (existingTickets.size >= maximumTickets) {
                    return interaction.reply({ content: `**❌ You can only open ${maximumTickets} ticket(s) at a time.**`, ephemeral: true });
                }

                // فتح نافذة الأسئلة إذا كانت مفعلة
                let hasModalFields = targetButtonData.modalFields && targetButtonData.modalFields.length > 0;
                
                if (targetButtonData.requireModal && hasModalFields) {
                    
                    const ticketModal = new ModalBuilder();
                    ticketModal.setCustomId(`modalticket_${buttonRealId}`);
                    
                    let mTitle = targetButtonData.modalTitle;
                    if (!mTitle) mTitle = 'Ticket Details';
                    ticketModal.setTitle(mTitle);

                    // إضافة الأسئلة للنافذة
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
                        if (!safePlaceholder) safePlaceholder = 'Type here...';
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
                    // فتح التكت مباشرة دون نافذة
                    await openNewTicket(interaction, targetButtonData, guildConfig, []);
                }
            }
        }

        // =====================================================================
        // استلام إجابات نافذة التكت لفتحه
        // =====================================================================
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('modalticket_')) {
                
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
        // ⚙️ أزرار التحكم داخل التكت (Claim, Close, Add User, Delete)
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

            // ❌ إلغاء الإغلاق
            if (interaction.customId === 'cancel_close') {
                await interaction.update({ 
                    content: '**✅ Cancelled.**', 
                    components: [] 
                });
            }

            // -------------------------------------------------------------
            // ✅ تأكيد الإغلاق الفعلي (السرعة والتقييم)
            // -------------------------------------------------------------
            if (interaction.customId === 'confirm_close') {
                
                // إرسال رد فوري لديسكورد لتجنب التأخير
                await interaction.deferUpdate(); 
                
                let currentTopic = interaction.channel.topic;
                if (!currentTopic) currentTopic = '';
                
                const topicParts = currentTopic.split('_');
                
                // Format: OwnerID_BtnID_ClaimerID_AddedUsers_CloserID
                const ticketOwnerId = topicParts[0];
                const usedBtnId = topicParts[1];
                
                let claimedByAdminId = null;
                if (topicParts.length > 2 && topicParts[2] !== 'none') {
                    claimedByAdminId = topicParts[2];
                }

                // إرسال رسالة الإغلاق بخط عريض
                const closingMessage = `**🔒 The ticket has been closed by <@${interaction.user.id}>**`;
                await interaction.channel.send(closingMessage);

                // فحص نظام التقييم (هل يجب إرسال تقييم للإدارة أم لا؟)
                let isRatingEnabled = true;
                
                let specificBtnData = null;
                for (let i = 0; i < guildConfig.customButtons.length; i++) {
                    if (guildConfig.customButtons[i].id === usedBtnId) {
                        specificBtnData = guildConfig.customButtons[i];
                        break;
                    }
                }
                
                if (specificBtnData) {
                    if (specificBtnData.isMediator === true) {
                        isRatingEnabled = false; 
                    }
                    if (specificBtnData.enableRating === false) {
                        isRatingEnabled = false;
                    }
                }

                // إرسال التقييم إلى خاص العضو (إذا توفرت الشروط)
                let hasRatingChannel = guildConfig.staffRatingChannelId;
                
                if (isRatingEnabled && ticketOwnerId && claimedByAdminId && hasRatingChannel) {
                    try {
                        const ticketOwnerUser = await interaction.guild.members.fetch(ticketOwnerId);
                        const guildNameStr = interaction.guild.name;
                        
                        const ratingEmbed = new EmbedBuilder();
                        
                        // اختيار نوع التقييم (مخصص أم أساسي عربي)
                        let embedTitleStr = '';
                        let embedDescStr = '';
                        
                        let isCustomStyle = (guildConfig.ratingStyle === 'custom');
                        let hasCustomText = guildConfig.customRatingText;
                        
                        if (isCustomStyle && hasCustomText) {
                            embedTitleStr = guildConfig.customRatingTitle;
                            if (!embedTitleStr) embedTitleStr = 'Feedback';
                            
                            embedDescStr = guildConfig.customRatingText;
                            embedDescStr = embedDescStr.replace(/\[staff\]/g, `<@${claimedByAdminId}>`);
                            embedDescStr = embedDescStr.replace(/\[user\]/g, `<@${ticketOwnerUser.id}>`);
                            embedDescStr = embedDescStr.replace(/\[server\]/g, guildNameStr);
                        } else {
                            // التقييم العربي الأساسي كما في الصورة
                            embedTitleStr = 'تقييم فريق العمل';
                            embedDescStr = `شكرا لتواصلك مع الدعم الفني الخاص بسيرفر **${guildNameStr}**\n\nيرجى تقييم مستوى الخدمة التي تلقيتها من <@${claimedByAdminId}>، رأيك يهمنا ويساعدنا في تحسين جودة الخدمة، اضغط على الزر الموافق لتقييمك وسيتم ارسال التقييم للادارة.`;
                        }
                        
                        ratingEmbed.setTitle(embedTitleStr);
                        ratingEmbed.setDescription(embedDescStr);
                        
                        let staffColor = guildConfig.staffRatingColor;
                        if (!staffColor) staffColor = '#3ba55d';
                        ratingEmbed.setColor(staffColor);
                        
                        ratingEmbed.setFooter({ 
                            text: guildNameStr, 
                            iconURL: interaction.guild.iconURL({ dynamic: true }) 
                        });
                        ratingEmbed.setTimestamp();
                        
                        // بناء أزرار التقييم
                        const starsRow = new ActionRowBuilder();
                        
                        const s1 = new ButtonBuilder().setCustomId(`rate_staff_1_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary);
                        const s2 = new ButtonBuilder().setCustomId(`rate_staff_2_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary);
                        const s3 = new ButtonBuilder().setCustomId(`rate_staff_3_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        const s4 = new ButtonBuilder().setCustomId(`rate_staff_4_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        const s5 = new ButtonBuilder().setCustomId(`rate_staff_5_${claimedByAdminId}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        
                        starsRow.addComponents(s1, s2, s3, s4, s5);
                        
                        await ticketOwnerUser.send({ embeds: [ratingEmbed], components: [starsRow] });
                        
                    } catch (errorLog) { 
                        // الخاص مغلق
                    }
                }

                // سحب صلاحيات الكتابة من العضو
                if (ticketOwnerId) {
                    await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { 
                        SendMessages: false, 
                        ViewChannel: false 
                    }).catch(()=>{});
                }

                // تحديث الـ Topic لحفظ الإداري الذي أغلق التكت
                while(topicParts.length < 5) {
                    topicParts.push('none');
                }
                topicParts[4] = interaction.user.id;
                
                let newTopicString = topicParts.join('_');
                await interaction.channel.setTopic(newTopicString).catch(()=>{});

                // 🔥 إرسال بانر التحكم الأخير (نفس شكل صورتك رقم 3)
                const controlEmbed = new EmbedBuilder();
                controlEmbed.setTitle('Ticket control');
                controlEmbed.setDescription(`Closed By: <@${interaction.user.id}>\n(${interaction.user.id})`);
                
                let cColor = guildConfig.closeEmbedColor;
                if (!cColor) cColor = '#2b2d31';
                controlEmbed.setColor(cColor);
                
                const cRow1 = new ActionRowBuilder();
                const reopenBtn = new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen ticket').setStyle(ButtonStyle.Secondary);
                const deleteBtn = new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete ticket').setStyle(ButtonStyle.Danger);
                cRow1.addComponents(reopenBtn, deleteBtn);
                
                const cRow2 = new ActionRowBuilder();
                const delReasonBtn = new ButtonBuilder().setCustomId('ticket_delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger);
                cRow2.addComponents(delReasonBtn);
                
                await interaction.channel.send({ embeds: [controlEmbed], components: [cRow1, cRow2] });
                
                // مسح رسالة التحذير الخاصة بقفل الخطوتين
                await interaction.message.delete().catch(()=>{});
            }

            // -------------------------------------------------------------
            // 🛡️ زر الاستلام (Claim) الصاروخي (مع الرتب المخصصة)
            // -------------------------------------------------------------
            if (interaction.customId === 'ticket_claim') {
                
                let currentTopic = interaction.channel.topic;
                if (!currentTopic) currentTopic = '';
                
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
                
                let hasCustomClaimRoles = specificBtnData && specificBtnData.allowedClaimRoles && specificBtnData.allowedClaimRoles.length > 0;
                
                if (hasCustomClaimRoles) {
                    allowedToClaimRoles = specificBtnData.allowedClaimRoles;
                } else {
                    const allStaffArr = [
                        guildConfig.adminRoleId, 
                        guildConfig.mediatorRoleId, 
                        ...guildConfig.highAdminRoles, 
                        ...guildConfig.highMediatorRoles
                    ];
                    
                    for(let i=0; i<allStaffArr.length; i++) {
                        if (allStaffArr[i]) allowedToClaimRoles.push(allStaffArr[i]);
                    }
                }

                // فحص الصلاحية
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

                // ⚡ السرعة الصاروخية: الرد الفوري لديسكورد
                await interaction.deferUpdate(); 
                
                // تطبيق نظام الخصوصية على الإدارة
                for (let i = 0; i < allowedToClaimRoles.length; i++) {
                    const staffRoleId = allowedToClaimRoles[i];
                    
                    if (guildConfig.hideTicketOnClaim) {
                        await interaction.channel.permissionOverwrites.edit(staffRoleId, { 
                            ViewChannel: false 
                        }).catch(()=>{});
                    } else if (guildConfig.readOnlyStaffOnClaim) {
                        await interaction.channel.permissionOverwrites.edit(staffRoleId, { 
                            SendMessages: false 
                        }).catch(()=>{});
                    }
                }
                
                // إعطاء المستلم الصلاحية الكاملة
                await interaction.channel.permissionOverwrites.edit(interaction.user.id, { 
                    ViewChannel: true, 
                    SendMessages: true 
                });
                
                // تحديث Topic لحفظ الإداري
                while(topicParts.length < 5) {
                    topicParts.push('none');
                }
                topicParts[2] = interaction.user.id;
                
                let newTopicString = topicParts.join('_');
                await interaction.channel.setTopic(newTopicString).catch(()=>{});
                
                // تعديل زر الاستلام ليكون شفاف
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
                
                await interaction.message.edit({ components: newComponentsArr });
                
                // رسالة التأكيد
                const claimMsg = `**✅ Ticket has been claimed by <@${interaction.user.id}>**`;
                await interaction.channel.send(claimMsg);
            }

            // -------------------------------------------------------------
            // 🔓 باقي الأزرار (إعادة فتح، حذف، إضافة) - بخط عريض وإنجليزي
            // -------------------------------------------------------------
            if (interaction.customId === 'ticket_reopen') {
                
                let currentTopic = interaction.channel.topic;
                if (!currentTopic) currentTopic = '';
                
                const ticketOwnerId = currentTopic.split('_')[0];
                
                if (ticketOwnerId && ticketOwnerId !== 'none') {
                    await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { 
                        SendMessages: true, 
                        ViewChannel: true 
                    });
                }
                
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
                    
                    // تحديث Topic لحفظ العضو المضاف
                    let currentTopic = interaction.channel.topic;
                    if (!currentTopic) currentTopic = '';
                    
                    const topicParts = currentTopic.split('_');
                    while(topicParts.length < 5) {
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
    // 🛠️ Helper Function: فتح تكت جديد وبناء الإيمبدات المفصولة
    // =====================================================================
    async function openNewTicket(interaction, buttonData, config, answersArray) {
        
        await interaction.deferReply({ ephemeral: true });
        
        // تحديث العداد
        await GuildConfig.findOneAndUpdate({ guildId: interaction.guild.id }, { $inc: { ticketCount: 1 } });
        
        let currentTicketCount = config.ticketCount;
        if (!currentTicketCount) currentTicketCount = 0;
        
        const newTicketNumber = currentTicketCount + 1;
        
        // تحديد القسم
        let targetCategoryId = buttonData.categoryId;
        if (!targetCategoryId) {
            targetCategoryId = config.defaultCategoryId;
        }
        
        // بناء الصلاحيات المبدئية
        const permsArray = [];
        
        // منع الجميع
        permsArray.push({ 
            id: interaction.guild.id, 
            deny: [PermissionFlagsBits.ViewChannel] 
        });
        
        // السماح لصاحب التكت
        permsArray.push({ 
            id: interaction.user.id, 
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
        });
        
        // السماح للإدارة
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

        // حفظ بيانات التكت
        const initialTopicData = `${interaction.user.id}_${buttonData.id}_none_none_none`;

        // إنشاء الروم
        const createdChannel = await interaction.guild.channels.create({
            name: `ticket-${newTicketNumber}`, 
            type: ChannelType.GuildText, 
            parent: targetCategoryId, 
            topic: initialTopicData, 
            permissionOverwrites: permsArray
        });

        // 🔥 الرسالة الخارجية بالخط العريض
        const msgContent = `**Welcome <@${interaction.user.id}>**\n**Reason:** ${buttonData.label}`;
        
        const embedsList = [];

        // 🔥 الإيمبد الأول: القوانين والمعلومات
        const infoEmbed = new EmbedBuilder();
        
        let titleVal = buttonData.insideEmbedTitle;
        if (!titleVal) titleVal = 'Support Ticket';
        infoEmbed.setTitle(titleVal);
        
        let descVal = buttonData.insideEmbedDesc;
        if (!descVal) descVal = 'Please detail your issue.';
        infoEmbed.setDescription(descVal);
        
        let colorVal = buttonData.insideEmbedColor;
        if (!colorVal) colorVal = '#2b2d31';
        infoEmbed.setColor(colorVal);
        
        embedsList.push(infoEmbed);

        // 🔥 الإيمبد الثاني: أسئلة النافذة (مفصول تماماً)
        if (answersArray && answersArray.length > 0) {
            
            const answersEmbed = new EmbedBuilder();
            
            let ansColor = config.answersEmbedColor;
            if (!ansColor) ansColor = '#2b2d31';
            answersEmbed.setColor(ansColor);
            
            for (let i = 0; i < answersArray.length; i++) {
                const singleAnswer = answersArray[i];
                
                let valToDisplay = singleAnswer.value;
                if (!valToDisplay || valToDisplay === '') {
                    valToDisplay = 'N/A';
                }
                
                // جعل العنوان بخط عريض
                answersEmbed.addFields({ 
                    name: `**${singleAnswer.label}**`, 
                    value: valToDisplay 
                });
            }
            
            embedsList.push(answersEmbed);
        }

        // بناء أزرار التحكم الخاصة بالتكت
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
        btnDelReason.setLabel('Delete (Reason)');
        btnDelReason.setStyle(ButtonStyle.Danger);
        
        controlsRow2.addComponents(btnDelReason);
        
        // إرسال الإيمبدات المدمجة للروم
        await createdChannel.send({ 
            content: msgContent, 
            embeds: embedsList, 
            components: [controlsRow1, controlsRow2] 
        });
        
        // رسالة التأكيد
        const successReply = `**✅ Ticket opened successfully: <#${createdChannel.id}>**`;
        await interaction.editReply(successReply);
    }

    // =====================================================================
    // 🛠️ Helper Function: اللوجات والترانسكريبت المفصول
    // =====================================================================
    async function executeDeleteAndLog(ticketChannel, closedByUser, config, deleteReasonText) {
        
        let currentTopic = ticketChannel.topic;
        if (!currentTopic) currentTopic = '';
        
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

        // بناء إيمبد اللوج
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
        if (!defaultLogColor) defaultLogColor = '#ed4245';
        mainLogEmbed.setColor(defaultLogColor);
        
        mainLogEmbed.setTimestamp();

        // 1. إرسال إلى روم اللوج العادي (بدون ملف)
        if (config.ticketLogChannelId) { 
            const pureLogChannel = ticketChannel.guild.channels.cache.get(config.ticketLogChannelId); 
            if(pureLogChannel) {
                await pureLogChannel.send({ embeds: [mainLogEmbed] }).catch(()=>{}); 
            }
        }
        
        // 2. إرسال الترانسكريبت إلى روم الترانسكريبت
        if (config.transcriptChannelId && config.transcriptChannelId !== config.ticketLogChannelId) { 
            const transcriptChannel = ticketChannel.guild.channels.cache.get(config.transcriptChannelId); 
            
            if(transcriptChannel) {
                
                // إنشاء ملف الـ HTML
                const htmlAttachment = await discordTranscripts.createTranscript(ticketChannel, { 
                    limit: -1, 
                    returnType: 'attachment', 
                    filename: `${ticketChannel.name}.html`, 
                    saveImages: true, 
                    poweredBy: false 
                });
                
                // تغيير لون الإيمبد الخاص بالترانسكريبت
                let transColor = config.transcriptEmbedColor;
                if (!transColor) transColor = '#2b2d31';
                mainLogEmbed.setColor(transColor);
                
                const directBtnRow = new ActionRowBuilder();
                
                const fakeDirectBtn = new ButtonBuilder();
                fakeDirectBtn.setCustomId('fake_btn');
                fakeDirectBtn.setLabel('Direct Transcript');
                fakeDirectBtn.setStyle(ButtonStyle.Secondary);
                fakeDirectBtn.setDisabled(true); // زر شكلي كما طلبت
                
                directBtnRow.addComponents(fakeDirectBtn);

                const msgToTransChannel = `**📄 Transcript for ${ticketChannel.name}**`;
                
                await transcriptChannel.send({ 
                    content: msgToTransChannel, 
                    files: [htmlAttachment], 
                    embeds: [mainLogEmbed], 
                    components: [directBtnRow] 
                }).catch(()=>{}); 
            }
        }
        
        // الانتظار 3 ثواني ثم حذف الروم
        setTimeout(() => { 
            ticketChannel.delete().catch(()=>{}); 
        }, 3000);
    }
};
