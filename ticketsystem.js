// =====================================================================
// 📦 استدعاء المكاتب الأساسية (تم فرد كل استدعاء في سطر منفصل لضمان الوضوح)
// =====================================================================
const { EmbedBuilder } = require('discord.js');
const { ActionRowBuilder } = require('discord.js');
const { ButtonBuilder } = require('discord.js');
const { ButtonStyle } = require('discord.js');
const { ModalBuilder } = require('discord.js');
const { TextInputBuilder } = require('discord.js');
const { TextInputStyle } = require('discord.js');
const { ChannelType } = require('discord.js');
const { PermissionFlagsBits } = require('discord.js');

// استدعاء مكتبة الترانسكريبت لحفظ المحادثات (سجلات التكت)
const discordTranscripts = require('discord-html-transcripts');

// استدعاء قاعدة البيانات الشاملة
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    
    // =====================================================================
    // 🎧 الحدث الرئيسي للتعامل مع أي تفاعل (أزرار / نوافذ) في السيرفر
    // =====================================================================
    client.on('interactionCreate', async (interaction) => {

        // =====================================================================
        // ⭐ 1. نظام التقييم في الخاص (فتح نافذة التعليق عند الضغط على النجوم)
        // =====================================================================
        if (interaction.isButton() === true) {
            
            const customIdString = interaction.customId;
            const isRateButton = customIdString.startsWith('rate_');
            
            if (isRateButton === true) {
                
                // استخراج المتغيرات من المعرف (ID) بالتفصيل
                const customIdPartsArray = customIdString.split('_');
                const ratingType = customIdPartsArray[1]; 
                const ratingStars = customIdPartsArray[2];
                const ratedTargetId = customIdPartsArray[3];
                const currentGuildId = customIdPartsArray[4]; 

                // بناء نافذة التعليق الإضافي
                const feedbackModal = new ModalBuilder();
                
                const generatedModalId = `modalrate_${ratingType}_${ratingStars}_${ratedTargetId}_${currentGuildId}`;
                feedbackModal.setCustomId(generatedModalId);
                
                const modalTitleString = 'إضافة تعليق (اختياري)';
                feedbackModal.setTitle(modalTitleString);

                // بناء حقل النص للتعليق
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
                
                return; // إنهاء التنفيذ هنا
            }
        }

        // =====================================================================
        // ⭐ 2. استلام تعليق التقييم وإرسال اللوج للإدارة (مع سحب التريد)
        // =====================================================================
        if (interaction.isModalSubmit() === true) {
            
            const customIdString = interaction.customId;
            const isRateModal = customIdString.startsWith('modalrate_');
            
            if (isRateModal === true) {
                
                // الرد السريع لتجنب تعليق النافذة أو ظهور خطأ
                try {
                    await interaction.deferUpdate();
                } catch (deferError) {
                    console.log("Error deferring update in rating modal:", deferError);
                }

                // استخراج البيانات من الآي دي
                const customIdPartsArray = customIdString.split('_');
                const ratingType = customIdPartsArray[1];
                const ratingStarsString = customIdPartsArray[2];
                const ratingStarsNumber = parseInt(ratingStarsString);
                const ratedTargetId = customIdPartsArray[3];
                const currentGuildId = customIdPartsArray[4];
                
                // جلب التعليق المكتوب من النافذة
                let userFeedbackText = interaction.fields.getTextInputValue('rating_comment');
                
                // التحقق من وجود تعليق أو تعيين قيمة افتراضية
                if (!userFeedbackText || userFeedbackText.trim() === '') {
                    userFeedbackText = 'لا يوجد تعليق مضاف من العضو.';
                }

                // جلب الإعدادات من الداتابيز
                let serverConfigDocument = await GuildConfig.findOne({ guildId: currentGuildId });
                
                if (!serverConfigDocument) {
                    return; // التوقف إذا لم توجد إعدادات
                }

                // تحديد روم اللوج بناءً على نوع التقييم (الإدارة أو الـ MiddleMan)
                let targetLogChannelId = null;
                
                if (ratingType === 'staff') {
                    targetLogChannelId = serverConfigDocument.staffRatingChannelId;
                } else if (ratingType === 'mediator') { 
                    targetLogChannelId = serverConfigDocument.middlemanRatingChannelId; 
                }

                // جلب السيرفر من الكاش
                const discordGuildObject = client.guilds.cache.get(currentGuildId);
                
                if (discordGuildObject && targetLogChannelId) {
                    
                    const logChannelObject = discordGuildObject.channels.cache.get(targetLogChannelId);
                    
                    if (logChannelObject) {
                        
                        // 🔥 سحب تفاصيل التريد من رسالة التقييم في الخاص (إن وُجدت)
                        let tradeDetailsIncludedText = 'لا يوجد تفاصيل (تم التقييم بدون نافذة تريد).';
                        
                        const interactionMessage = interaction.message;
                        
                        if (interactionMessage && interactionMessage.embeds && interactionMessage.embeds.length > 0) {
                            
                            const firstEmbed = interactionMessage.embeds[0];
                            const oldEmbedDescription = firstEmbed.description;
                            
                            if (oldEmbedDescription && oldEmbedDescription.includes('**📦 تفاصيل المعاملة:**')) {
                                
                                const splitDescriptionArray = oldEmbedDescription.split('**📦 تفاصيل المعاملة:**');
                                
                                if (splitDescriptionArray.length > 1) {
                                    const rawTradeDetails = splitDescriptionArray[1];
                                    tradeDetailsIncludedText = rawTradeDetails.trim();
                                }
                            }
                        }

                        // تحديث العدادات الشاملة للسيرفر
                        let currentServerTotalCount = serverConfigDocument.totalServerRatings;
                        
                        if (!currentServerTotalCount) {
                            currentServerTotalCount = 0;
                        }
                        
                        currentServerTotalCount = currentServerTotalCount + 1;
                        serverConfigDocument.totalServerRatings = currentServerTotalCount;

                        // تحديث عدادات التقييم الفردية
                        let individualRatingCountNumber = 1;

                        if (ratingType === 'staff') {
                            
                            let oldStaffCountNumber = serverConfigDocument.staffRatingsCount.get(ratedTargetId);
                            
                            if (!oldStaffCountNumber) {
                                oldStaffCountNumber = 0;
                            }
                            
                            individualRatingCountNumber = oldStaffCountNumber + 1;
                            serverConfigDocument.staffRatingsCount.set(ratedTargetId, individualRatingCountNumber);
                            
                        } else {
                            
                            let oldMiddlemanCountNumber = serverConfigDocument.middlemanRatingsCount.get(ratedTargetId);
                            
                            if (!oldMiddlemanCountNumber) {
                                oldMiddlemanCountNumber = 0;
                            }
                            
                            individualRatingCountNumber = oldMiddlemanCountNumber + 1;
                            serverConfigDocument.middlemanRatingsCount.set(ratedTargetId, individualRatingCountNumber);
                        }
                        
                        // حفظ التغييرات في قاعدة البيانات
                        await serverConfigDocument.save();

                        // بناء شكل النجوم
                        let starsEmojiString = '';
                        for (let i = 0; i < ratingStarsNumber; i++) {
                            starsEmojiString = starsEmojiString + '⭐';
                        }

                        // تجهيز المتغيرات الخاصة باللوج
                        let logAuthorTitleString = '';
                        let logEmbedColorHex = '';
                        let ratedPersonLabelString = '';

                        // سحب الألوان والمسميات (Staff vs MiddleMan)
                        if (ratingType === 'staff') {
                            logAuthorTitleString = `${discordGuildObject.name} STAFF REVIEW`;
                            
                            let staffColorValue = serverConfigDocument.staffRatingColor;
                            if (!staffColorValue) {
                                staffColorValue = '#3ba55d';
                            }
                            logEmbedColorHex = staffColorValue;
                            
                            ratedPersonLabelString = 'الإداري 👮';
                            
                        } else {
                            logAuthorTitleString = `${discordGuildObject.name} MIDDLEMAN REVIEW`;
                            
                            let middlemanColorValue = serverConfigDocument.basicRatingColor;
                            if (!middlemanColorValue) {
                                middlemanColorValue = '#f2a658';
                            }
                            logEmbedColorHex = middlemanColorValue;
                            
                            ratedPersonLabelString = 'الوسيط (MiddleMan) 🛡️';
                        }

                        // بناء إيمبد اللوج للإدارة
                        const ratingLogEmbedObject = new EmbedBuilder();
                        
                        ratingLogEmbedObject.setAuthor({ 
                            name: `📊 ${logAuthorTitleString}`, 
                            iconURL: discordGuildObject.iconURL({ dynamic: true }) 
                        });
                        
                        ratingLogEmbedObject.setThumbnail(discordGuildObject.iconURL({ dynamic: true }));
                        
                        // بناء الوصف بشكل مفصل ومطول
                        let embedDescriptionTextString = ``;
                        embedDescriptionTextString += `**العميل (المُقيِّم) 👤**\n`;
                        embedDescriptionTextString += `<@${interaction.user.id}>\n\n`;
                        
                        embedDescriptionTextString += `**${ratedPersonLabelString}**\n`;
                        embedDescriptionTextString += `<@${ratedTargetId}>\n\n`;
                        
                        // دمج تفاصيل التريد في اللوج إذا كان تقييم وساطة
                        if (ratingType === 'mediator') {
                            embedDescriptionTextString += `**📦 تفاصيل التريد:**\n`;
                            embedDescriptionTextString += `${tradeDetailsIncludedText}\n\n`;
                        }

                        embedDescriptionTextString += `**الإحصائيات 📈**\n`;
                        embedDescriptionTextString += `عدد التقييمات #${individualRatingCountNumber}\n`;
                        embedDescriptionTextString += `إجمالي السيرفر #${currentServerTotalCount}\n\n`;
                        embedDescriptionTextString += `-------------------------\n\n`;
                        
                        embedDescriptionTextString += `**التقييم ⭐**\n`;
                        embedDescriptionTextString += `**${starsEmojiString} (${ratingStarsNumber}/5)**\n\n`;
                        
                        embedDescriptionTextString += `**التعليق 💬**\n`;
                        embedDescriptionTextString += `\`\`\`${userFeedbackText}\`\`\``;

                        ratingLogEmbedObject.setDescription(embedDescriptionTextString);
                        ratingLogEmbedObject.setColor(logEmbedColorHex);
                        
                        ratingLogEmbedObject.setFooter({ 
                            text: `Rated by: ${interaction.user.username}`, 
                            iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                        });
                        
                        ratingLogEmbedObject.setTimestamp();

                        const logMessageContentString = `**New Rating for <@${ratedTargetId}>!**`;
                        
                        // إرسال اللوج إلى الروم المخصصة
                        try {
                            await logChannelObject.send({ 
                                content: logMessageContentString, 
                                embeds: [ratingLogEmbedObject] 
                            });
                        } catch (logSendError) {
                            console.log("Error sending rating log:", logSendError);
                        }
                    }
                }
                
                // تعديل رسالة الخاص للعضو لشكره على التقييم وإخفاء الأزرار
                const thankYouEmbedObject = new EmbedBuilder();
                thankYouEmbedObject.setDescription(`**✅ شكراً لك! تم إرسال تقييمك للإدارة بنجاح.**\n\nالنجوم: ${ratingStarsNumber}/5`);
                thankYouEmbedObject.setColor('#3ba55d');
                
                try { 
                    await interaction.editReply({ 
                        embeds: [thankYouEmbedObject], 
                        components: [] 
                    }); 
                } catch (editReplyError) { 
                    console.log("Error editing reply in DMs:", editReplyError);
                }
                
                return; // إنهاء التنفيذ
            }
        }

        // =====================================================================
        // التأكد الدائم أن التفاعل داخل سيرفر (ليس في الخاص)
        // =====================================================================
        const interactionGuildObject = interaction.guild;
        
        if (!interactionGuildObject) {
            return; // تجاهل التفاعلات القادمة من الخاص للأوامر التالية
        }
        
        const guildIdString = interactionGuildObject.id;
        const guildConfigDocument = await GuildConfig.findOne({ guildId: guildIdString });
        
        if (!guildConfigDocument) {
            return; // التوقف إذا لم توجد إعدادات للسيرفر
        }

        // =====================================================================
        // ⚖️ 3. تفاعلات نافذة أمر التريد (!trade) والموافقة (إغلاق الثغرات)
        // =====================================================================
        if (interaction.isButton() === true) {
            
            const customIdString = interaction.customId;
            
            if (customIdString === 'open_trade_modal') {
                
                const tradeModalObject = new ModalBuilder();
                tradeModalObject.setCustomId('submit_trade_modal');
                tradeModalObject.setTitle('Trade Details');
                
                const tradeInputObject = new TextInputBuilder();
                tradeInputObject.setCustomId('trade_details_input');
                tradeInputObject.setLabel('ما هي تفاصيل التريد؟ (الحساب، السعر..)');
                tradeInputObject.setStyle(TextInputStyle.Paragraph);
                tradeInputObject.setRequired(true);
                
                const tradeActionRowObject = new ActionRowBuilder();
                tradeActionRowObject.addComponents(tradeInputObject);
                
                tradeModalObject.addComponents(tradeActionRowObject);
                
                await interaction.showModal(tradeModalObject);
                return;
            }
        }

        if (interaction.isModalSubmit() === true) {
            
            const customIdString = interaction.customId;
            
            if (customIdString === 'submit_trade_modal') {
                
                const tradeDetailsTextString = interaction.fields.getTextInputValue('trade_details_input');
                
                // 🔥 تعطيل زر التريد الأصلي حتى لا يضغط عليه العضو مرة أخرى (جعله شفافاً)
                const originalInteractionMessage = interaction.message;
                
                if (originalInteractionMessage) {
                    
                    const messageComponentsArray = originalInteractionMessage.components;
                    
                    if (messageComponentsArray && messageComponentsArray.length > 0) {
                        
                        const originalActionRowObject = messageComponentsArray[0];
                        const rowComponentsArray = originalActionRowObject.components;
                        
                        if (rowComponentsArray && rowComponentsArray.length > 0) {
                            
                            const originalButtonObject = rowComponentsArray[0];
                            const disabledButtonObject = ButtonBuilder.from(originalButtonObject);
                            
                            disabledButtonObject.setDisabled(true);
                            disabledButtonObject.setStyle(ButtonStyle.Secondary); // تغيير اللون للرمادي
                            
                            const newDisabledRowObject = new ActionRowBuilder();
                            newDisabledRowObject.addComponents(disabledButtonObject);
                            
                            try {
                                await originalInteractionMessage.edit({ 
                                    components: [newDisabledRowObject] 
                                });
                            } catch (editError) {
                                console.log("Error disabling trade button:", editError);
                            }
                        }
                    }
                }

                // بناء إيمبد طلب الموافقة الجديد
                const tradeRequestEmbedObject = new EmbedBuilder();
                tradeRequestEmbedObject.setTitle('⚖️ Trade Approval Request');
                
                let tradeDescriptionString = '';
                tradeDescriptionString += `**MiddleMan:** <@${interaction.user.id}>\n\n`;
                
                // إضافة الخط الجانبي لتفاصيل التريد لتكون متناسقة وواضحة
                tradeDescriptionString += `**Details:**\n>>> ${tradeDetailsTextString}\n\n`;
                tradeDescriptionString += `⏳ *Waiting for approval...*`;
                
                tradeRequestEmbedObject.setDescription(tradeDescriptionString);
                
                let tradeEmbedColorHex = guildConfigDocument.tradeEmbedColor;
                if (!tradeEmbedColorHex) {
                    tradeEmbedColorHex = '#f2a658';
                }
                
                tradeRequestEmbedObject.setColor(tradeEmbedColorHex);
                tradeRequestEmbedObject.setTimestamp();

                const approvalActionRowObject = new ActionRowBuilder();
                
                const approveButtonObject = new ButtonBuilder();
                approveButtonObject.setCustomId('trade_approve');
                approveButtonObject.setLabel('Approve ✅');
                approveButtonObject.setStyle(ButtonStyle.Success);
                
                const rejectButtonObject = new ButtonBuilder();
                rejectButtonObject.setCustomId('trade_reject');
                rejectButtonObject.setLabel('Reject ❌');
                rejectButtonObject.setStyle(ButtonStyle.Danger);
                
                approvalActionRowObject.addComponents(approveButtonObject, rejectButtonObject);

                // 🔥 عمل منشن للرتب العليا هنا فقط (عند نزول طلب الموافقة وليس في الأمر الأساسي)
                let finalMentionString = '';
                const tradeMentionRolesArray = guildConfigDocument.tradeMentionRoles;
                
                if (tradeMentionRolesArray && tradeMentionRolesArray.length > 0) {
                    for (let i = 0; i < tradeMentionRolesArray.length; i++) {
                        const roleIdString = tradeMentionRolesArray[i];
                        finalMentionString += `<@&${roleIdString}> `;
                    }
                }
                
                let messageContentToDrop = null;
                if (finalMentionString !== '') {
                    messageContentToDrop = `**🔔 نداء للموافقات العليا:** ${finalMentionString}`;
                }

                // إرسال طلب الموافقة كرد جديد في الشات مع المنشن
                await interaction.reply({ 
                    content: messageContentToDrop,
                    embeds: [tradeRequestEmbedObject], 
                    components: [approvalActionRowObject] 
                });
                
                return;
            }
        }

        // =====================================================================
        // تفاعل أزرار الموافقة والرفض للتريد
        // =====================================================================
        if (interaction.isButton() === true) {
            
            const customIdString = interaction.customId;
            const isTradeApproveAction = (customIdString === 'trade_approve');
            const isTradeRejectAction = (customIdString === 'trade_reject');
            const isTradeAction = (isTradeApproveAction || isTradeRejectAction);
            
            if (isTradeAction === true) {
                
                // منع التخطي: فحص صلاحيات من يضغط على الزر
                let tradeAllowedRolesArray = guildConfigDocument.tradeApproveRoles;
                
                if (!tradeAllowedRolesArray || tradeAllowedRolesArray.length === 0) {
                    tradeAllowedRolesArray = guildConfigDocument.highMiddlemanRoles; 
                }
                
                let hasTradePermission = false;
                const interactionMemberObject = interaction.member;
                
                if (interactionMemberObject.permissions.has('Administrator')) {
                    hasTradePermission = true;
                } else {
                    for (let i = 0; i < tradeAllowedRolesArray.length; i++) {
                        const requiredRoleId = tradeAllowedRolesArray[i];
                        if (interactionMemberObject.roles.cache.has(requiredRoleId)) {
                            hasTradePermission = true;
                            break;
                        }
                    }
                }
                
                if (hasTradePermission === false) {
                    return interaction.reply({ 
                        content: '**❌ عذراً، لا تمتلك صلاحية للموافقة أو الرفض على هذا الطلب!**', 
                        ephemeral: true 
                    });
                }

                // تحديث الإيمبد بناءً على الإجراء
                const oldEmbedObject = interaction.message.embeds[0];
                const updatedTradeEmbedObject = EmbedBuilder.from(oldEmbedObject);
                
                if (isTradeApproveAction === true) {
                    updatedTradeEmbedObject.setColor('#3ba55d');
                    updatedTradeEmbedObject.addFields({ 
                        name: 'Status:', 
                        value: `**✅ Approved by <@${interaction.user.id}>**` 
                    });
                } else {
                    updatedTradeEmbedObject.setColor('#ed4245');
                    updatedTradeEmbedObject.addFields({ 
                        name: 'Status:', 
                        value: `**❌ Rejected by <@${interaction.user.id}>**` 
                    });
                }

                await interaction.update({ 
                    embeds: [updatedTradeEmbedObject], 
                    components: [] 
                });
                
                return;
            }
        }

        // =====================================================================
        // 🟢 4. زر تحميل الترانسكريبت المباشر (Direct Transcript)
        // =====================================================================
        if (interaction.isButton() === true) {
            
            const customIdString = interaction.customId;
            
            if (customIdString === 'direct_transcript_btn') {
                
                await interaction.deferReply({ ephemeral: true });
                
                const logMessageContentString = interaction.message.content;
                let ticketChannelNameString = logMessageContentString.replace('**📄 Transcript for ', '');
                ticketChannelNameString = ticketChannelNameString.replace('**', '');
                
                const currentChannelObject = interaction.channel;
                
                try {
                    const htmlFileAttachmentObject = await discordTranscripts.createTranscript(currentChannelObject, { 
                        limit: -1, 
                        returnType: 'attachment', 
                        filename: `${ticketChannelNameString}.html`, 
                        saveImages: true 
                    });
                    
                    await interaction.editReply({ 
                        content: '**✅ Here is your direct transcript file:**', 
                        files: [htmlFileAttachmentObject] 
                    });
                    
                } catch (transcriptError) {
                    console.log("Error generating transcript:", transcriptError);
                    await interaction.editReply({ 
                        content: '**❌ Error generating the direct transcript.**' 
                    });
                }
                
                return;
            }
        }

        // =====================================================================
        // 🎟️ 5. فتح التكت من البانرات المتعددة (Multi-Panels Engine)
        // =====================================================================
        if (interaction.isButton() === true) {
            
            const customIdString = interaction.customId;
            const isTicketOpenButton = customIdString.startsWith('ticket_open_');
            
            if (isTicketOpenButton === true) {
                
                const buttonRealIdString = customIdString.replace('ticket_open_', '');
                
                // البحث التفصيلي عن الزر في جميع البانلات الموجودة في قاعدة البيانات
                let targetButtonDataObject = null;
                let targetPanelDataObject = null;
                
                const ticketPanelsArray = guildConfigDocument.ticketPanels;
                
                if (ticketPanelsArray && ticketPanelsArray.length > 0) {
                    
                    for (let pIndex = 0; pIndex < ticketPanelsArray.length; pIndex++) {
                        
                        const currentPanelObject = ticketPanelsArray[pIndex];
                        const panelButtonsArray = currentPanelObject.buttons;
                        
                        if (panelButtonsArray && panelButtonsArray.length > 0) {
                            
                            for (let bIndex = 0; bIndex < panelButtonsArray.length; bIndex++) {
                                
                                const currentButtonObject = panelButtonsArray[bIndex];
                                
                                if (currentButtonObject.id === buttonRealIdString) {
                                    targetButtonDataObject = currentButtonObject;
                                    targetPanelDataObject = currentPanelObject;
                                    break;
                                }
                            }
                        }
                        
                        if (targetButtonDataObject) {
                            break; // تم العثور على الزر، نخرج من الحلقة الخارجية
                        }
                    }
                }
                
                if (!targetButtonDataObject) {
                    return interaction.reply({ 
                        content: '**❌ This button is no longer available in the database.**', 
                        ephemeral: true 
                    });
                }

                // فحص الحد الأقصى للتكتات المفتوحة للعضو الواحد
                let maximumTicketsNumber = guildConfigDocument.maxTicketsPerUser;
                if (!maximumTicketsNumber) {
                    maximumTicketsNumber = 1;
                }

                const allGuildChannelsCollection = interaction.guild.channels.cache;
                const interactionUserIdString = interaction.user.id;
                
                const existingOpenTicketsCollection = allGuildChannelsCollection.filter(channelObj => {
                    const channelNameString = channelObj.name;
                    const isTicketNameFormat = channelNameString.startsWith('ticket-');
                    
                    let isOwnedByCurrentUser = false;
                    const channelTopicString = channelObj.topic;
                    
                    if (channelTopicString && channelTopicString.startsWith(interactionUserIdString)) {
                        isOwnedByCurrentUser = true;
                    }
                    
                    return isTicketNameFormat && isOwnedByCurrentUser;
                });
                
                const existingOpenTicketsCount = existingOpenTicketsCollection.size;
                
                if (existingOpenTicketsCount >= maximumTicketsNumber) {
                    return interaction.reply({ 
                        content: `**❌ You can only have ${maximumTicketsNumber} open ticket(s) at the same time.**`, 
                        ephemeral: true 
                    });
                }

                // التحقق من وجود أسئلة لتشغيل النافذة
                let hasModalFieldsBoolean = false;
                const buttonModalFieldsArray = targetButtonDataObject.modalFields;
                
                if (buttonModalFieldsArray && buttonModalFieldsArray.length > 0) {
                    hasModalFieldsBoolean = true;
                }
                
                const requireModalBoolean = targetButtonDataObject.requireModal;
                
                if (requireModalBoolean === true && hasModalFieldsBoolean === true) {
                    
                    const ticketModalObject = new ModalBuilder();
                    
                    const generatedModalCustomId = `modalticket_${buttonRealIdString}`;
                    ticketModalObject.setCustomId(generatedModalCustomId);
                    
                    let modalTitleString = targetButtonDataObject.modalTitle;
                    if (!modalTitleString) {
                        modalTitleString = 'Ticket Details';
                    }
                    ticketModalObject.setTitle(modalTitleString);

                    for (let i = 0; i < buttonModalFieldsArray.length; i++) {
                        
                        const currentFieldObject = buttonModalFieldsArray[i];
                        
                        const inputFieldObject = new TextInputBuilder();
                        
                        const generatedFieldCustomId = `field_${i}`;
                        inputFieldObject.setCustomId(generatedFieldCustomId);
                        
                        let safeLabelString = currentFieldObject.label;
                        if (safeLabelString.length > 45) {
                            safeLabelString = safeLabelString.substring(0, 45); // حماية من أخطاء الديسكورد
                        }
                        inputFieldObject.setLabel(safeLabelString);
                        
                        inputFieldObject.setStyle(TextInputStyle.Paragraph);
                        
                        let safePlaceholderString = currentFieldObject.placeholder;
                        if (!safePlaceholderString) {
                            safePlaceholderString = 'Type your answer here...';
                        }
                        inputFieldObject.setPlaceholder(safePlaceholderString);
                        
                        let isFieldRequiredBoolean = false;
                        if (currentFieldObject.required === true || String(currentFieldObject.required) === 'true') {
                            isFieldRequiredBoolean = true;
                        }
                        inputFieldObject.setRequired(isFieldRequiredBoolean);
                        
                        const fieldActionRowObject = new ActionRowBuilder();
                        fieldActionRowObject.addComponents(inputFieldObject);
                        
                        ticketModalObject.addComponents(fieldActionRowObject);
                    }
                    
                    await interaction.showModal(ticketModalObject);
                    
                } else {
                    
                    // الرد السريع لعدم التعليق في حالة عدم وجود نافذة
                    await interaction.deferReply({ ephemeral: true });
                    
                    const emptyAnswersArray = [];
                    await openNewTicket(interaction, targetButtonDataObject, guildConfigDocument, emptyAnswersArray, targetPanelDataObject);
                }
            }
        }

        // =====================================================================
        // 📝 6. استلام إجابات النافذة وفتح التكت (مع البانلات المتعددة)
        // =====================================================================
        if (interaction.isModalSubmit() === true) {
            
            const customIdString = interaction.customId;
            const isModalTicketSubmit = customIdString.startsWith('modalticket_');
            
            if (isModalTicketSubmit === true) {
                
                // 🔥 الرد الصاروخي لمنع ظهور خطأ (Something went wrong) للعضو
                try {
                    await interaction.deferReply({ ephemeral: true });
                } catch (deferErr) {}

                const buttonRealIdString = customIdString.replace('modalticket_', '');
                
                let targetButtonDataObject = null;
                let targetPanelDataObject = null;
                
                const ticketPanelsArray = guildConfigDocument.ticketPanels;
                
                if (ticketPanelsArray && ticketPanelsArray.length > 0) {
                    
                    for (let pIndex = 0; pIndex < ticketPanelsArray.length; pIndex++) {
                        
                        const currentPanelObject = ticketPanelsArray[pIndex];
                        const panelButtonsArray = currentPanelObject.buttons;
                        
                        if (panelButtonsArray && panelButtonsArray.length > 0) {
                            
                            for (let bIndex = 0; bIndex < panelButtonsArray.length; bIndex++) {
                                
                                const currentButtonObject = panelButtonsArray[bIndex];
                                
                                if (currentButtonObject.id === buttonRealIdString) {
                                    targetButtonDataObject = currentButtonObject;
                                    targetPanelDataObject = currentPanelObject;
                                    break;
                                }
                            }
                        }
                        
                        if (targetButtonDataObject) {
                            break;
                        }
                    }
                }
                
                if (!targetButtonDataObject) {
                    return; // إيقاف التنفيذ إذا لم يتم العثور على الزر
                }
                
                const userAnswersCollectedArray = [];
                const buttonModalFieldsArray = targetButtonDataObject.modalFields;
                
                for (let i = 0; i < buttonModalFieldsArray.length; i++) {
                    
                    const fieldConfigObject = buttonModalFieldsArray[i];
                    
                    const generatedFieldCustomId = `field_${i}`;
                    const writtenValueString = interaction.fields.getTextInputValue(generatedFieldCustomId);
                    
                    const answerObject = {
                        label: fieldConfigObject.label,
                        value: writtenValueString
                    };
                    
                    userAnswersCollectedArray.push(answerObject);
                }
                
                await openNewTicket(interaction, targetButtonDataObject, guildConfigDocument, userAnswersCollectedArray, targetPanelDataObject);
            }
        }

        // =====================================================================
        // ⚙️ 7. أزرار التحكم داخل التكت (Claim, Close, Add User, Delete)
        // =====================================================================
        if (interaction.isButton() === true) {
            
            const customIdString = interaction.customId;
            
            // -------------------------------------------------------------
            // 🔒 زر الإغلاق 1: ظهور رسالة التأكيد في الخاص بالعضو (مرحلتين)
            // -------------------------------------------------------------
            if (customIdString === 'ticket_close') {
                
                const confirmationActionRowObject = new ActionRowBuilder();
                
                const confirmButtonObject = new ButtonBuilder();
                confirmButtonObject.setCustomId('confirm_close');
                confirmButtonObject.setLabel('Confirm Close');
                confirmButtonObject.setStyle(ButtonStyle.Danger);
                
                const cancelButtonObject = new ButtonBuilder();
                cancelButtonObject.setCustomId('cancel_close');
                cancelButtonObject.setLabel('Cancel');
                cancelButtonObject.setStyle(ButtonStyle.Secondary);
                
                confirmationActionRowObject.addComponents(confirmButtonObject, cancelButtonObject);
                
                const replyMessageString = '**⚠️ Are you sure you want to close this ticket?**';
                
                await interaction.reply({ 
                    content: replyMessageString, 
                    components: [confirmationActionRowObject], 
                    ephemeral: true 
                });
            }

            if (customIdString === 'cancel_close') {
                
                const cancelMessageString = '**✅ Cancelled.**';
                
                await interaction.update({ 
                    content: cancelMessageString, 
                    components: [] 
                });
            }

            // -------------------------------------------------------------
            // ✅ تأكيد الإغلاق الفعلي وإرسال بانل التحكم (مطابق للصورة 2)
            // -------------------------------------------------------------
            if (customIdString === 'confirm_close') {
                
                await interaction.deferUpdate(); 
                
                const currentChannelObject = interaction.channel;
                
                let currentTopicString = currentChannelObject.topic;
                if (!currentTopicString) {
                    currentTopicString = '';
                }
                
                const topicPartsArray = currentTopicString.split('_');
                
                // الصيغة المعتمدة للتوبيك:
                // OwnerID_BtnID_ClaimerID_AddedUsers_CloserID_IsMiddleMan
                const ticketOwnerIdString = topicPartsArray[0];
                const usedButtonIdString = topicPartsArray[1];
                
                let claimedByAdminIdString = null;
                if (topicPartsArray.length > 2 && topicPartsArray[2] !== 'none') {
                    claimedByAdminIdString = topicPartsArray[2];
                }
                
                let isMiddleManTicketBoolean = false;
                if (topicPartsArray.length > 5 && topicPartsArray[5] === 'true') {
                    isMiddleManTicketBoolean = true;
                }

                // تغيير اسم الروم إلى closed- مع الاحتفاظ بالرقم
                const oldChannelNameString = currentChannelObject.name;
                const namePartsArray = oldChannelNameString.split('-');
                
                let oldNameNumberString = namePartsArray[1];
                if (!oldNameNumberString) {
                    oldNameNumberString = '0';
                }
                
                const newClosedChannelName = `closed-${oldNameNumberString}`;
                
                try {
                    await currentChannelObject.setName(newClosedChannelName);
                } catch (setNameError) {
                    console.log("Error renaming channel to closed:", setNameError);
                }

                const closingNotificationMessage = `**🔒 The ticket has been closed by <@${interaction.user.id}>**`;
                await currentChannelObject.send(closingNotificationMessage);

                // 🔥 منع التقييم المزدوج والتحقق من إعدادات التقييم في الزر
                let specificButtonDataObject = null;
                const ticketPanelsArray = guildConfigDocument.ticketPanels;
                
                if (ticketPanelsArray) {
                    for (let pIndex = 0; pIndex < ticketPanelsArray.length; pIndex++) {
                        const panelObject = ticketPanelsArray[pIndex];
                        const panelButtonsArray = panelObject.buttons;
                        
                        if (panelButtonsArray) {
                            for (let bIndex = 0; bIndex < panelButtonsArray.length; bIndex++) {
                                const currentButtonObject = panelButtonsArray[bIndex];
                                
                                if (currentButtonObject.id === usedButtonIdString) {
                                    specificButtonDataObject = currentButtonObject;
                                    break;
                                }
                            }
                        }
                        if (specificButtonDataObject) break;
                    }
                }

                let shouldSendStaffRatingBoolean = true;
                
                // منع قاطع: لو التكت ميدل مان، مستحيل يبعت تقييم الإدارة
                if (isMiddleManTicketBoolean === true || (specificButtonDataObject && specificButtonDataObject.isMiddleMan === true)) {
                    shouldSendStaffRatingBoolean = false; 
                } else if (specificButtonDataObject && specificButtonDataObject.enableRating === false) {
                    shouldSendStaffRatingBoolean = false;
                }

                const hasRatingChannelString = guildConfigDocument.staffRatingChannelId;
                
                // إرسال تقييم الإدارة في الخاص لو مسموح
                if (shouldSendStaffRatingBoolean === true && ticketOwnerIdString && claimedByAdminIdString && hasRatingChannelString) {
                    try {
                        const ticketOwnerUserObject = await interaction.guild.members.fetch(ticketOwnerIdString);
                        const guildNameString = interaction.guild.name;
                        
                        const ratingEmbedObject = new EmbedBuilder();
                        
                        let embedTitleString = '';
                        let embedDescriptionString = '';
                        
                        const isCustomStyle = (guildConfigDocument.ratingStyle === 'custom');
                        const hasCustomText = guildConfigDocument.customRatingText;
                        
                        if (isCustomStyle === true && hasCustomText) {
                            embedTitleString = guildConfigDocument.customRatingTitle;
                            if (!embedTitleString) {
                                embedTitleString = 'Feedback';
                            }
                            
                            embedDescriptionString = guildConfigDocument.customRatingText;
                            embedDescriptionString = embedDescriptionString.replace(/\[staff\]/g, `<@${claimedByAdminIdString}>`);
                            embedDescriptionString = embedDescriptionString.replace(/\[user\]/g, `<@${ticketOwnerUserObject.id}>`);
                            embedDescriptionString = embedDescriptionString.replace(/\[server\]/g, guildNameString);
                            
                        } else {
                            embedTitleString = 'تقييم فريق العمل';
                            
                            embedDescriptionString = `شكرا لتواصلك مع الدعم الفني الخاص بسيرفر **${guildNameString}**\n\n`;
                            embedDescriptionString += `يرجى تقييم مستوى الخدمة التي تلقيتها من <@${claimedByAdminIdString}>، رأيك يهمنا ويساعدنا في تحسين جودة الخدمة.`;
                        }
                        
                        ratingEmbedObject.setTitle(embedTitleString);
                        ratingEmbedObject.setDescription(embedDescriptionString);
                        
                        let staffColorHex = guildConfigDocument.staffRatingColor;
                        if (!staffColorHex) {
                            staffColorHex = '#3ba55d';
                        }
                        ratingEmbedObject.setColor(staffColorHex);
                        
                        ratingEmbedObject.setFooter({ 
                            text: guildNameString, 
                            iconURL: interaction.guild.iconURL({ dynamic: true }) 
                        });
                        ratingEmbedObject.setTimestamp();
                        
                        const starsActionRowObject = new ActionRowBuilder();
                        
                        const star1Button = new ButtonBuilder().setCustomId(`rate_staff_1_${claimedByAdminIdString}_${interaction.guild.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary);
                        const star2Button = new ButtonBuilder().setCustomId(`rate_staff_2_${claimedByAdminIdString}_${interaction.guild.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary);
                        const star3Button = new ButtonBuilder().setCustomId(`rate_staff_3_${claimedByAdminIdString}_${interaction.guild.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        const star4Button = new ButtonBuilder().setCustomId(`rate_staff_4_${claimedByAdminIdString}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        const star5Button = new ButtonBuilder().setCustomId(`rate_staff_5_${claimedByAdminIdString}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        
                        starsActionRowObject.addComponents(star1Button, star2Button, star3Button, star4Button, star5Button);
                        
                        await ticketOwnerUserObject.send({ 
                            embeds: [ratingEmbedObject], 
                            components: [starsActionRowObject] 
                        });
                        
                    } catch (errorLog) { 
                        console.log("Could not send rating to user.");
                    }
                }

                // سحب صلاحيات العضو لرؤية التكت
                if (ticketOwnerIdString) {
                    try {
                        await currentChannelObject.permissionOverwrites.edit(ticketOwnerIdString, { 
                            SendMessages: false, 
                            ViewChannel: false 
                        });
                    } catch (permError) {}
                }

                // تحديث التوبيك بإضافة من قام بالإغلاق
                while(topicPartsArray.length < 6) {
                    topicPartsArray.push('none');
                }
                
                topicPartsArray[4] = interaction.user.id; // خانة الـ Closer
                
                const newTopicStringForChannel = topicPartsArray.join('_');
                
                try {
                    await currentChannelObject.setTopic(newTopicStringForChannel);
                } catch (topicError) {}

                // 🔥 بناء بانل التحكم مطابق للصورة رقم 2 تماماً!
                const controlEmbedObject = new EmbedBuilder();
                controlEmbedObject.setTitle('Ticket control');
                
                const closedByDescription = `Closed By: <@${interaction.user.id}>\n(${interaction.user.id})`;
                controlEmbedObject.setDescription(closedByDescription);
                
                let closeEmbedColorHex = guildConfigDocument.closeEmbedColor;
                if (!closeEmbedColorHex) {
                    closeEmbedColorHex = '#2b2d31'; // اللون الداكن الافتراضي
                }
                controlEmbedObject.setColor(closeEmbedColorHex);
                
                // الصف الأول: Reopen (رمادي) و Delete (أحمر)
                const controlRow1Object = new ActionRowBuilder();
                
                const reopenButtonObject = new ButtonBuilder();
                reopenButtonObject.setCustomId('ticket_reopen');
                reopenButtonObject.setLabel('Reopen ticket');
                reopenButtonObject.setStyle(ButtonStyle.Secondary);
                
                const deleteButtonObject = new ButtonBuilder();
                deleteButtonObject.setCustomId('ticket_delete');
                deleteButtonObject.setLabel('Delete ticket');
                deleteButtonObject.setStyle(ButtonStyle.Danger);
                
                controlRow1Object.addComponents(reopenButtonObject, deleteButtonObject);
                
                // الصف الثاني: Delete With Reason (أحمر)
                const controlRow2Object = new ActionRowBuilder();
                
                const deleteReasonButtonObject = new ButtonBuilder();
                deleteReasonButtonObject.setCustomId('ticket_delete_reason');
                deleteReasonButtonObject.setLabel('Delete With Reason');
                deleteReasonButtonObject.setStyle(ButtonStyle.Danger);
                
                controlRow2Object.addComponents(deleteReasonButtonObject);
                
                // إرسال البانل
                await currentChannelObject.send({ 
                    embeds: [controlEmbedObject], 
                    components: [controlRow1Object, controlRow2Object] 
                });
                
                // حذف الرسالة الأصلية لتنظيف الشات
                try {
                    await interaction.message.delete();
                } catch (delError) {}
            }

            // -------------------------------------------------------------
            // 🛡️ زر الاستلام (Claim) السرعة الصاروخية الجبارة 0.001s
            // -------------------------------------------------------------
            if (customIdString === 'ticket_claim') {
                
                const currentChannelObject = interaction.channel;
                
                let currentTopicString = currentChannelObject.topic;
                if (!currentTopicString) {
                    currentTopicString = '';
                }
                
                const topicPartsArray = currentTopicString.split('_');
                const usedButtonIdString = topicPartsArray[1];
                
                // البحث عن الزر لمعرفة رتب الاستلام المخصصة
                let specificButtonDataObject = null;
                const ticketPanelsArray = guildConfigDocument.ticketPanels;
                
                if (ticketPanelsArray) {
                    for (let pIndex = 0; pIndex < ticketPanelsArray.length; pIndex++) {
                        const panelObject = ticketPanelsArray[pIndex];
                        const panelButtonsArray = panelObject.buttons;
                        
                        if (panelButtonsArray) {
                            for (let bIndex = 0; bIndex < panelButtonsArray.length; bIndex++) {
                                const currentButtonObject = panelButtonsArray[bIndex];
                                
                                if (currentButtonObject.id === usedButtonIdString) {
                                    specificButtonDataObject = currentButtonObject;
                                    break;
                                }
                            }
                        }
                        if (specificButtonDataObject) break;
                    }
                }

                let allowedToClaimRolesArray = [];
                let hasCustomClaimRolesBoolean = false;
                
                if (specificButtonDataObject && specificButtonDataObject.allowedClaimRoles && specificButtonDataObject.allowedClaimRoles.length > 0) {
                    
                    hasCustomClaimRolesBoolean = true;
                    allowedToClaimRolesArray = specificButtonDataObject.allowedClaimRoles;
                    
                } else {
                    
                    const allStaffRolesArray = [
                        guildConfigDocument.adminRoleId, 
                        guildConfigDocument.middlemanRoleId,
                        ...guildConfigDocument.highAdminRoles, 
                        ...guildConfigDocument.highMiddlemanRoles
                    ];
                    
                    for (let i = 0; i < allStaffRolesArray.length; i++) {
                        const staffRoleId = allStaffRolesArray[i];
                        if (staffRoleId) {
                            allowedToClaimRolesArray.push(staffRoleId);
                        }
                    }
                }

                // التحقق من الصلاحيات
                let canClaimTicketBoolean = false;
                const interactionMemberObject = interaction.member;
                
                if (interactionMemberObject.permissions.has('Administrator')) {
                    canClaimTicketBoolean = true;
                } else {
                    for (let i = 0; i < allowedToClaimRolesArray.length; i++) {
                        const requiredRoleId = allowedToClaimRolesArray[i];
                        if (interactionMemberObject.roles.cache.has(requiredRoleId)) {
                            canClaimTicketBoolean = true;
                            break;
                        }
                    }
                }

                if (canClaimTicketBoolean === false) {
                    return interaction.reply({ 
                        content: '**❌ You do not have permission to claim this ticket.**', 
                        ephemeral: true 
                    });
                }

                // 🔥 الحل السحري للسرعة: تحديث الزرار فوراً لديسكورد (يخضر في 0.001 ثانية)
                const originalMessageComponentsArray = interaction.message.components;
                const newComponentsArray = [];
                
                for (let i = 0; i < originalMessageComponentsArray.length; i++) {
                    
                    const oldActionRowObject = originalMessageComponentsArray[i];
                    const newActionRowObject = new ActionRowBuilder();
                    
                    const rowComponentsArray = oldActionRowObject.components;
                    
                    for (let j = 0; j < rowComponentsArray.length; j++) {
                        
                        const oldButtonObject = rowComponentsArray[j];
                        const clonedButtonObject = ButtonBuilder.from(oldButtonObject);
                        
                        if (oldButtonObject.customId === 'ticket_claim') {
                            clonedButtonObject.setDisabled(true); // تعميم الزر
                            clonedButtonObject.setStyle(ButtonStyle.Success); // تحويله للأخضر
                        }
                        
                        newActionRowObject.addComponents(clonedButtonObject);
                    }
                    
                    newComponentsArray.push(newActionRowObject);
                }
                
                // التحديث الفوري للرسالة
                try {
                    await interaction.update({ components: newComponentsArray });
                } catch (updateError) {}
                
                // إرسال رسالة الاستلام
                const claimNotificationMessage = `**✅ The ticket has been claimed by <@${interaction.user.id}>**`;
                await currentChannelObject.send(claimNotificationMessage).catch(()=>{});

                // ==========================================
                // تعديل الصلاحيات في الخلفية بناءً على الإعدادات
                // ==========================================
                const currentChannelOverwritesCollection = currentChannelObject.permissionOverwrites.cache;
                const newOverwritesDataArray = [];
                
                // نسخ الصلاحيات الحالية
                currentChannelOverwritesCollection.forEach((overwriteObj) => {
                    newOverwritesDataArray.push({
                        id: overwriteObj.id,
                        allow: overwriteObj.allow.toArray(),
                        deny: overwriteObj.deny.toArray()
                    });
                });

                // تعديل صلاحيات باقي الإدارة (إخفاء أو قراءة فقط)
                for (let i = 0; i < allowedToClaimRolesArray.length; i++) {
                    
                    const staffRoleIdString = allowedToClaimRolesArray[i];
                    let roleOverwriteObject = null;
                    
                    for (let k = 0; k < newOverwritesDataArray.length; k++) {
                        if (newOverwritesDataArray[k].id === staffRoleIdString) {
                            roleOverwriteObject = newOverwritesDataArray[k];
                            break;
                        }
                    }
                    
                    if (!roleOverwriteObject) {
                        roleOverwriteObject = { id: staffRoleIdString, allow: [], deny: [] };
                        newOverwritesDataArray.push(roleOverwriteObject);
                    }
                    
                    const hideTicketSetting = guildConfigDocument.hideTicketOnClaim;
                    const readOnlySetting = guildConfigDocument.readOnlyStaffOnClaim;
                    
                    if (hideTicketSetting === true) {
                        // إخفاء كامل
                        if (!roleOverwriteObject.deny.includes('ViewChannel')) {
                            roleOverwriteObject.deny.push('ViewChannel');
                        }
                        // إزالة السماح لو كان موجود
                        roleOverwriteObject.allow = roleOverwriteObject.allow.filter(perm => perm !== 'ViewChannel');
                        
                    } else if (readOnlySetting === true) {
                        // قراءة فقط (السماح بالرؤية، منع الكتابة)
                        if (!roleOverwriteObject.allow.includes('ViewChannel')) {
                            roleOverwriteObject.allow.push('ViewChannel');
                        }
                        if (!roleOverwriteObject.deny.includes('SendMessages')) {
                            roleOverwriteObject.deny.push('SendMessages');
                        }
                        // إزالة السماح بالكتابة لو كان موجود
                        roleOverwriteObject.allow = roleOverwriteObject.allow.filter(perm => perm !== 'SendMessages');
                    }
                }
                
                // إعطاء المستلم الصلاحية الكاملة
                let claimerOverwriteObject = null;
                const claimerUserIdString = interaction.user.id;
                
                for (let k = 0; k < newOverwritesDataArray.length; k++) {
                    if (newOverwritesDataArray[k].id === claimerUserIdString) {
                        claimerOverwriteObject = newOverwritesDataArray[k];
                        break;
                    }
                }
                
                if (!claimerOverwriteObject) {
                    newOverwritesDataArray.push({ 
                        id: claimerUserIdString, 
                        allow: ['ViewChannel', 'SendMessages'], 
                        deny: [] 
                    });
                } else {
                    if (!claimerOverwriteObject.allow.includes('ViewChannel')) {
                        claimerOverwriteObject.allow.push('ViewChannel');
                    }
                    if (!claimerOverwriteObject.allow.includes('SendMessages')) {
                        claimerOverwriteObject.allow.push('SendMessages');
                    }
                }

                // تطبيق الصلاحيات الجديدة على الروم
                try {
                    await currentChannelObject.permissionOverwrites.set(newOverwritesDataArray);
                } catch (permSetError) {}
                
                // تحديث التوبيك لحفظ المستلم
                while(topicPartsArray.length < 6) {
                    topicPartsArray.push('none');
                }
                
                topicPartsArray[2] = claimerUserIdString;
                
                const newTopicStringWithClaimer = topicPartsArray.join('_');
                
                try {
                    await currentChannelObject.setTopic(newTopicStringWithClaimer);
                } catch (topicError) {}
            }

            // -------------------------------------------------------------
            // 🔓 زر إعادة الفتح (Reopen)
            // -------------------------------------------------------------
            if (customIdString === 'ticket_reopen') {
                
                const currentChannelObject = interaction.channel;
                
                let currentTopicString = currentChannelObject.topic;
                if (!currentTopicString) {
                    currentTopicString = '';
                }
                
                const topicPartsArray = currentTopicString.split('_');
                const ticketOwnerIdString = topicPartsArray[0];
                
                if (ticketOwnerIdString && ticketOwnerIdString !== 'none') {
                    try {
                        await currentChannelObject.permissionOverwrites.edit(ticketOwnerIdString, { 
                            SendMessages: true, 
                            ViewChannel: true 
                        });
                    } catch (reopenPermError) {}
                }
                
                const oldChannelNameString = currentChannelObject.name;
                const namePartsArray = oldChannelNameString.split('-');
                
                let oldNameNumberString = namePartsArray[1];
                if (!oldNameNumberString) {
                    oldNameNumberString = '0';
                }
                
                const newOpenChannelName = `ticket-${oldNameNumberString}`;
                
                try {
                    await currentChannelObject.setName(newOpenChannelName);
                } catch (renameError) {}
                
                const reopenSuccessMessage = '**✅ Ticket has been reopened.**';
                await interaction.reply(reopenSuccessMessage);
                
                try {
                    await interaction.message.delete();
                } catch (deleteError) {}
            }

            // -------------------------------------------------------------
            // 🗑️ زر الحذف المباشر (Delete)
            // -------------------------------------------------------------
            if (customIdString === 'ticket_delete') {
                
                const deletingMessage = '**🗑️ Deleting the ticket...**';
                await interaction.reply({ content: deletingMessage, ephemeral: true });
                
                const currentChannelObject = interaction.channel;
                const interactionUserObject = interaction.user;
                const defaultReason = "Manual Delete";
                
                await executeDeleteAndLog(currentChannelObject, interactionUserObject, guildConfigDocument, defaultReason);
            }

            // -------------------------------------------------------------
            // 📝 زر الحذف مع سبب (Delete With Reason)
            // -------------------------------------------------------------
            if (customIdString === 'ticket_delete_reason') {
                
                const deleteModalObject = new ModalBuilder();
                deleteModalObject.setCustomId('modal_delete_reason');
                deleteModalObject.setTitle('Delete Reason');
                
                const reasonInputObject = new TextInputBuilder();
                reasonInputObject.setCustomId('delete_reason');
                reasonInputObject.setLabel('Reason:');
                reasonInputObject.setStyle(TextInputStyle.Short);
                reasonInputObject.setRequired(true);
                
                const deleteModalActionRow = new ActionRowBuilder();
                deleteModalActionRow.addComponents(reasonInputObject);
                
                deleteModalObject.addComponents(deleteModalActionRow);
                
                await interaction.showModal(deleteModalObject);
            }

            // -------------------------------------------------------------
            // ➕ زر إضافة عضو (Add User)
            // -------------------------------------------------------------
            if (customIdString === 'ticket_add_user') {
                
                const addUserModalObject = new ModalBuilder();
                addUserModalObject.setCustomId('modal_add_user');
                addUserModalObject.setTitle('Add User');
                
                const userIdInputObject = new TextInputBuilder();
                userIdInputObject.setCustomId('user_id_to_add');
                userIdInputObject.setLabel('User ID:');
                userIdInputObject.setStyle(TextInputStyle.Short);
                userIdInputObject.setRequired(true);
                
                const addUserActionRow = new ActionRowBuilder();
                addUserActionRow.addComponents(userIdInputObject);
                
                addUserModalObject.addComponents(addUserActionRow);
                
                await interaction.showModal(addUserModalObject);
            }
        }

        // =====================================================================
        // 🧩 معالجة النوافذ المنبثقة للإدارة (إجابات الإدارة)
        // =====================================================================
        if (interaction.isModalSubmit() === true) {
            
            const customIdString = interaction.customId;
            
            if (customIdString === 'modal_delete_reason') {
                
                const writtenReasonString = interaction.fields.getTextInputValue('delete_reason');
                
                const deletingMessage = '**🗑️ Deleting the ticket...**';
                await interaction.reply({ content: deletingMessage, ephemeral: true });
                
                const currentChannelObject = interaction.channel;
                const interactionUserObject = interaction.user;
                
                await executeDeleteAndLog(currentChannelObject, interactionUserObject, guildConfigDocument, writtenReasonString);
            }

            if (customIdString === 'modal_add_user') {
                
                const userIdToAddString = interaction.fields.getTextInputValue('user_id_to_add');
                const interactionGuildObject = interaction.guild;
                const currentChannelObject = interaction.channel;
                
                try {
                    const memberToAddObject = await interactionGuildObject.members.fetch(userIdToAddString);
                    
                    await currentChannelObject.permissionOverwrites.edit(userIdToAddString, { 
                        ViewChannel: true, 
                        SendMessages: true 
                    });
                    
                    let currentTopicString = currentChannelObject.topic;
                    if (!currentTopicString) {
                        currentTopicString = '';
                    }
                    
                    const topicPartsArray = currentTopicString.split('_');
                    
                    while(topicPartsArray.length < 6) {
                        topicPartsArray.push('none');
                    }
                    
                    let alreadyAddedUsersString = topicPartsArray[3];
                    
                    if (alreadyAddedUsersString === 'none') {
                        alreadyAddedUsersString = userIdToAddString;
                    } else {
                        alreadyAddedUsersString = `${alreadyAddedUsersString},${userIdToAddString}`;
                    }
                    
                    topicPartsArray[3] = alreadyAddedUsersString;
                    
                    const newTopicString = topicPartsArray.join('_');
                    
                    await currentChannelObject.setTopic(newTopicString).catch(()=>{});

                    const successAddMessage = `**✅ <@${userIdToAddString}> was added to the ticket by <@${interaction.user.id}>**`;
                    await interaction.reply(successAddMessage);
                    
                } catch (addError) { 
                    const notFoundMessage = '**❌ User not found in this server.**';
                    await interaction.reply({ content: notFoundMessage, ephemeral: true }); 
                }
            }
        }
    });

    // =====================================================================
    // 🛠️ دالة الدعم: فتح تكت جديد وبناء الإيمبدات المفصولة والخطوط
    // =====================================================================
    async function openNewTicket(interaction, buttonDataObject, configDocument, answersArray, targetPanelDataObject) {
        
        let currentTicketCountNumber = configDocument.ticketCount;
        if (!currentTicketCountNumber) {
            currentTicketCountNumber = 0;
        }
        
        const newTicketNumber = currentTicketCountNumber + 1;
        
        // جلب الكتاجوري الخاص بالبانل الحالي، أو الأساسي
        let targetCategoryIdString = null;
        if (targetPanelDataObject) {
            targetCategoryIdString = targetPanelDataObject.ticketCategoryId;
        }
        
        if (!targetCategoryIdString) {
            targetCategoryIdString = configDocument.defaultCategoryId;
        }
        
        const permissionsArray = [];
        
        const everyoneRolePermission = { 
            id: interaction.guild.id, 
            deny: [PermissionFlagsBits.ViewChannel] 
        };
        permissionsArray.push(everyoneRolePermission);
        
        const userPermission = { 
            id: interaction.user.id, 
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
        };
        permissionsArray.push(userPermission);
        
        const staffRolesArrayList = [
            configDocument.adminRoleId, 
            configDocument.middlemanRoleId, 
            ...configDocument.highAdminRoles, 
            ...configDocument.highMiddlemanRoles 
        ];
        
        for (let i = 0; i < staffRolesArrayList.length; i++) {
            const roleIdString = staffRolesArrayList[i];
            if (roleIdString) {
                const rolePermission = { 
                    id: roleIdString, 
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
                };
                permissionsArray.push(rolePermission);
            }
        }

        let isMiddleManString = 'false';
        if (buttonDataObject.isMiddleMan === true) {
            isMiddleManString = 'true';
        }
        
        const initialTopicDataString = `${interaction.user.id}_${buttonDataObject.id}_none_none_none_${isMiddleManString}`;

        const interactionGuildObject = interaction.guild;
        const newChannelNameString = `ticket-${newTicketNumber}`;
        
        const createdChannelObject = await interactionGuildObject.channels.create({
            name: newChannelNameString, 
            type: ChannelType.GuildText, 
            parent: targetCategoryIdString, 
            topic: initialTopicDataString, 
            permissionOverwrites: permissionsArray
        });
        
        // تحديث العداد في الداتابيز
        const guildIdFilter = { guildId: interactionGuildObject.id };
        const incrementUpdate = { $inc: { ticketCount: 1 } };
        await GuildConfig.findOneAndUpdate(guildIdFilter, incrementUpdate);

        const welcomeMessageContent = `**Welcome <@${interaction.user.id}>**\n**Reason:** ${buttonDataObject.label}`;
        
        const embedsListArray = [];

        // 🟢 الإيمبد الأول: الترحيب والقوانين (كما في الصورة)
        const infoEmbedObject = new EmbedBuilder();
        
        let titleValueString = buttonDataObject.insideEmbedTitle;
        if (!titleValueString) {
            titleValueString = 'تذكرة الدعم الفني';
        }
        infoEmbedObject.setTitle(titleValueString);
        
        let descriptionValueString = buttonDataObject.insideEmbedDesc;
        if (!descriptionValueString) {
            descriptionValueString = 'Please detail your issue.';
        }
        infoEmbedObject.setDescription(descriptionValueString);
        
        let colorValueHex = buttonDataObject.insideEmbedColor;
        if (!colorValueHex) {
            colorValueHex = '#2b2d31';
        }
        infoEmbedObject.setColor(colorValueHex);
        
        embedsListArray.push(infoEmbedObject);

        // 🟢 الإيمبد الثاني: إجابات النافذة بالخط الجانبي الشيك (>>>) (كما في الصورة 4)
        if (answersArray && answersArray.length > 0) {
            
            const answersEmbedObject = new EmbedBuilder();
            
            let answersColorHex = configDocument.answersEmbedColor;
            if (!answersColorHex) {
                answersColorHex = '#2b2d31';
            }
            answersEmbedObject.setColor(answersColorHex);
            
            for (let i = 0; i < answersArray.length; i++) {
                
                const singleAnswerObject = answersArray[i];
                
                let valueToDisplayString = singleAnswerObject.value;
                if (!valueToDisplayString || valueToDisplayString === '') {
                    valueToDisplayString = 'N/A';
                }
                
                // 🔥 تطبيق الخط الجانبي (Blockquote) المخصص للديسكورد بإضافة >>> قبل الإجابة
                const formattedAnswerString = `>>> ${valueToDisplayString}`;
                const formattedLabelString = `**${singleAnswerObject.label}**`;
                
                answersEmbedObject.addFields({ 
                    name: formattedLabelString, 
                    value: formattedAnswerString 
                });
            }
            
            embedsListArray.push(answersEmbedObject);
        }

        // 🔥 بناء الزراير لتطابق الصورة الأولى (Row 1 و Row 2)
        const controlsActionRow1 = new ActionRowBuilder();
        
        const addUserButton = new ButtonBuilder();
        addUserButton.setCustomId('ticket_add_user');
        addUserButton.setLabel('Add User');
        addUserButton.setStyle(ButtonStyle.Secondary); // لون رمادي
        
        const claimButton = new ButtonBuilder();
        claimButton.setCustomId('ticket_claim');
        claimButton.setLabel('Claim');
        claimButton.setStyle(ButtonStyle.Success); // لون أخضر
        
        const closeButton = new ButtonBuilder();
        closeButton.setCustomId('ticket_close');
        closeButton.setLabel('Close');
        closeButton.setStyle(ButtonStyle.Danger); // لون أحمر
        
        controlsActionRow1.addComponents(addUserButton, claimButton, closeButton);

        const controlsActionRow2 = new ActionRowBuilder();
        
        const deleteReasonButton = new ButtonBuilder();
        deleteReasonButton.setCustomId('ticket_delete_reason');
        deleteReasonButton.setLabel('Delete With Reason');
        deleteReasonButton.setStyle(ButtonStyle.Danger); // لون أحمر
        
        controlsActionRow2.addComponents(deleteReasonButton);
        
        // إرسال الرسالة الكاملة للروم الجديدة
        await createdChannelObject.send({ 
            content: welcomeMessageContent, 
            embeds: embedsListArray, 
            components: [controlsActionRow1, controlsActionRow2] 
        });
        
        const successReplyMessage = `**✅ Ticket opened successfully: <#${createdChannelObject.id}>**`;
        
        try {
            await interaction.editReply(successReplyMessage);
        } catch (editReplyError) {
            await interaction.reply({ content: successReplyMessage, ephemeral: true });
        }
    }

    // =====================================================================
    // 🛠️ دالة الدعم: اللوجات والترانسكريبت وحذف التكت
    // =====================================================================
    async function executeDeleteAndLog(ticketChannelObject, closedByUserObject, configDocument, deleteReasonTextString) {
        
        let currentTopicString = ticketChannelObject.topic;
        if (!currentTopicString) {
            currentTopicString = '';
        }
        
        const topicPartsArray = currentTopicString.split('_');
        
        let ticketOwnerIdString = null; 
        if (topicPartsArray[0] && topicPartsArray[0] !== 'none') {
            ticketOwnerIdString = topicPartsArray[0];
        }
        
        let ticketClaimerIdString = null; 
        if (topicPartsArray[2] && topicPartsArray[2] !== 'none') {
            ticketClaimerIdString = topicPartsArray[2];
        }
        
        let addedUsersListArray = []; 
        if (topicPartsArray[3] && topicPartsArray[3] !== 'none') {
            addedUsersListArray = topicPartsArray[3].split(',');
        }
        
        let ticketClosedByIdString = closedByUserObject.id; 
        if (topicPartsArray[4] && topicPartsArray[4] !== 'none') {
            ticketClosedByIdString = topicPartsArray[4]; 
        }

        let ownerDisplayString = 'Unknown'; 
        if (ticketOwnerIdString) {
            ownerDisplayString = `<@${ticketOwnerIdString}>`;
        }
        
        let claimerDisplayString = 'None'; 
        if (ticketClaimerIdString) {
            claimerDisplayString = `<@${ticketClaimerIdString}>`;
        }
        
        let addedDisplayString = 'None';
        if (addedUsersListArray.length > 0) {
            const mentionsArray = [];
            for (let i = 0; i < addedUsersListArray.length; i++) {
                const userIdString = addedUsersListArray[i];
                mentionsArray.push(`<@${userIdString}>`);
            }
            addedDisplayString = mentionsArray.join(', ');
        }

        const mainLogEmbedObject = new EmbedBuilder();
        
        const guildIconUrl = ticketChannelObject.guild.iconURL({ dynamic: true });
        mainLogEmbedObject.setAuthor({ 
            name: 'MNC TICKET LOGS', 
            iconURL: guildIconUrl 
        });
        
        mainLogEmbedObject.setTitle('🗑️ Ticket Deleted');
        
        let logDescriptionString = '';
        logDescriptionString += `**Ticket:** ${ticketChannelObject.name} was deleted.\n\n`;
        logDescriptionString += `👑 **Owner**\n${ownerDisplayString}\n\n`;
        logDescriptionString += `🗑️ **Deleted By**\n<@${closedByUserObject.id}>\n\n`;
        logDescriptionString += `🙋 **Claimed By**\n${claimerDisplayString}\n\n`;
        logDescriptionString += `🔒 **Closed By**\n<@${ticketClosedByIdString}>\n\n`;
        logDescriptionString += `➕ **Added Users**\n${addedDisplayString}\n\n`;
        logDescriptionString += `📝 **Reason**\n${deleteReasonTextString}`;
        
        mainLogEmbedObject.setDescription(logDescriptionString);
        
        let defaultLogColorHex = configDocument.logEmbedColor;
        if (!defaultLogColorHex) {
            defaultLogColorHex = '#ed4245';
        }
        mainLogEmbedObject.setColor(defaultLogColorHex);
        
        mainLogEmbedObject.setTimestamp();

        // إرسال اللوج العادي
        const ticketLogChannelIdString = configDocument.ticketLogChannelId;
        if (ticketLogChannelIdString) { 
            const pureLogChannelObject = ticketChannelObject.guild.channels.cache.get(ticketLogChannelIdString); 
            if (pureLogChannelObject) {
                try {
                    await pureLogChannelObject.send({ embeds: [mainLogEmbedObject] });
                } catch (logSendError) {}
            }
        }
        
        // إرسال الترانسكريبت (الملف)
        const transcriptChannelIdString = configDocument.transcriptChannelId;
        if (transcriptChannelIdString && transcriptChannelIdString !== ticketLogChannelIdString) { 
            
            const transcriptChannelObject = ticketChannelObject.guild.channels.cache.get(transcriptChannelIdString); 
            
            if (transcriptChannelObject) {
                
                try {
                    const htmlAttachmentObject = await discordTranscripts.createTranscript(ticketChannelObject, { 
                        limit: -1, 
                        returnType: 'attachment', 
                        filename: `${ticketChannelObject.name}.html`, 
                        saveImages: true 
                    });
                    
                    let transcriptColorHex = configDocument.transcriptEmbedColor;
                    if (!transcriptColorHex) {
                        transcriptColorHex = '#2b2d31';
                    }
                    mainLogEmbedObject.setColor(transcriptColorHex);
                    
                    const directButtonActionRow = new ActionRowBuilder();
                    
                    const directTranscriptButton = new ButtonBuilder();
                    directTranscriptButton.setCustomId('direct_transcript_btn');
                    directTranscriptButton.setLabel('Direct Transcript');
                    directTranscriptButton.setStyle(ButtonStyle.Primary);
                    
                    directButtonActionRow.addComponents(directTranscriptButton);

                    const transcriptMessageContent = `**📄 Transcript for ${ticketChannelObject.name}**`;
                    
                    await transcriptChannelObject.send({ 
                        content: transcriptMessageContent, 
                        files: [htmlAttachmentObject], 
                        embeds: [mainLogEmbedObject], 
                        components: [directButtonActionRow] 
                    });
                    
                } catch (transcriptProcessError) {}
            }
        }
        
        // حذف التكت بعد 3 ثواني
        setTimeout(() => { 
            try {
                ticketChannelObject.delete();
            } catch (deleteChannelError) {}
        }, 3000);
    }
};
