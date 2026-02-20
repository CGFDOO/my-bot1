// =====================================================================
// 📦 1. استدعاء المكاتب الأساسية من مكتبة ديسكورد (مفرودة بالكامل)
// =====================================================================
const discordLibrary = require('discord.js');

const EmbedBuilder = discordLibrary.EmbedBuilder;
const ActionRowBuilder = discordLibrary.ActionRowBuilder;
const ButtonBuilder = discordLibrary.ButtonBuilder;
const ButtonStyle = discordLibrary.ButtonStyle;
const ModalBuilder = discordLibrary.ModalBuilder;
const TextInputBuilder = discordLibrary.TextInputBuilder;
const TextInputStyle = discordLibrary.TextInputStyle;
const ChannelType = discordLibrary.ChannelType;
const PermissionFlagsBits = discordLibrary.PermissionFlagsBits;
const StringSelectMenuBuilder = discordLibrary.StringSelectMenuBuilder;

// =====================================================================
// 📦 2. استدعاء المكاتب الإضافية
// =====================================================================
const discordTranscripts = require('discord-html-transcripts');

// =====================================================================
// 📦 3. استدعاء قاعدة البيانات الشاملة للمشروع
// =====================================================================
const GuildConfig = require('./models/GuildConfig');

// =====================================================================
// 🚀 4. تصدير الوحدة الرئيسية
// =====================================================================
module.exports = (client) => {
    
    // =====================================================================
    // 🎧 الحدث الرئيسي للتعامل مع أي تفاعل (أزرار / نوافذ / قوائم)
    // =====================================================================
    client.on('interactionCreate', async (interaction) => {

        // =====================================================================
        // ⭐ القسم الأول: نظام التقييم في الخاص (فتح نافذة التعليق عند الضغط على النجوم)
        // =====================================================================
        const isInteractionAButton = interaction.isButton();
        
        if (isInteractionAButton === true) {
            
            const customIdString = interaction.customId;
            const isRateButtonAction = customIdString.startsWith('rate_');
            
            if (isRateButtonAction === true) {
                
                const customIdPartsArray = customIdString.split('_');
                
                const interactionPrefix = customIdPartsArray[0]; 
                const ratingTargetTypeString = customIdPartsArray[1]; 
                const ratingStarsSelectedString = customIdPartsArray[2]; 
                const ratedTargetUserIdString = customIdPartsArray[3]; 
                const currentGuildIdString = customIdPartsArray[4]; 

                const feedbackModalObject = new ModalBuilder();
                
                let generatedModalIdString = '';
                generatedModalIdString += 'modalrate_';
                generatedModalIdString += ratingTargetTypeString + '_';
                generatedModalIdString += ratingStarsSelectedString + '_';
                generatedModalIdString += ratedTargetUserIdString + '_';
                generatedModalIdString += currentGuildIdString;
                
                feedbackModalObject.setCustomId(generatedModalIdString);
                
                const modalTitleString = 'إضافة تعليق (اختياري)';
                feedbackModalObject.setTitle(modalTitleString);

                const commentTextInputObject = new TextInputBuilder();
                
                const inputCustomIdString = 'rating_comment';
                commentTextInputObject.setCustomId(inputCustomIdString);
                
                const inputLabelString = 'هل لديك أي تعليق إضافي للإدارة؟';
                commentTextInputObject.setLabel(inputLabelString);
                
                const inputStyleType = TextInputStyle.Paragraph;
                commentTextInputObject.setStyle(inputStyleType);
                
                const isInputRequiredBoolean = false;
                commentTextInputObject.setRequired(isInputRequiredBoolean); 
                
                const inputPlaceholderString = 'اكتب تعليقك هنا... (يمكنك تركه فارغاً)';
                commentTextInputObject.setPlaceholder(inputPlaceholderString);

                const modalActionRowObject = new ActionRowBuilder();
                modalActionRowObject.addComponents(commentTextInputObject);
                
                feedbackModalObject.addComponents(modalActionRowObject);

                try {
                    await interaction.showModal(feedbackModalObject);
                } catch (showModalError) {
                    console.log("Error showing rating modal.");
                }
                
                return; 
            }
        }

        // =====================================================================
        // ⭐ القسم الثاني: استلام تعليق التقييم وإرسال اللوج (مع سحب تفاصيل التريد)
        // =====================================================================
        const isInteractionAModalSubmit = interaction.isModalSubmit();
        
        if (isInteractionAModalSubmit === true) {
            
            const customIdString = interaction.customId;
            const isRateModalAction = customIdString.startsWith('modalrate_');
            
            if (isRateModalAction === true) {
                
                try {
                    await interaction.deferUpdate();
                } catch (deferError) {}

                const customIdPartsArray = customIdString.split('_');
                
                const ratingTargetTypeString = customIdPartsArray[1];
                const ratingStarsString = customIdPartsArray[2];
                const ratingStarsNumber = parseInt(ratingStarsString);
                const ratedTargetUserIdString = customIdPartsArray[3];
                const currentGuildIdString = customIdPartsArray[4];
                
                const inputCustomIdString = 'rating_comment';
                let userFeedbackTextString = interaction.fields.getTextInputValue(inputCustomIdString);
                
                const isFeedbackEmpty = (!userFeedbackTextString || userFeedbackTextString.trim() === '');
                
                if (isFeedbackEmpty === true) {
                    userFeedbackTextString = 'لا يوجد تعليق مضاف من العضو.';
                }

                const guildConfigFilterObject = { guildId: currentGuildIdString };
                let serverConfigDocument = await GuildConfig.findOne(guildConfigFilterObject);
                
                if (!serverConfigDocument) {
                    return; 
                }

                let targetLogChannelIdString = null;
                
                const isStaffRating = (ratingTargetTypeString === 'staff');
                const isMediatorRating = (ratingTargetTypeString === 'mediator');
                
                if (isStaffRating === true) {
                    targetLogChannelIdString = serverConfigDocument.staffRatingChannelId;
                } else if (isMediatorRating === true) { 
                    targetLogChannelIdString = serverConfigDocument.middlemanRatingChannelId; 
                }

                const discordGuildObject = client.guilds.cache.get(currentGuildIdString);
                
                if (discordGuildObject && targetLogChannelIdString) {
                    
                    const guildChannelsCollection = discordGuildObject.channels.cache;
                    const logChannelObject = guildChannelsCollection.get(targetLogChannelIdString);
                    
                    if (logChannelObject) {
                        
                        let tradeDetailsIncludedTextString = 'لا يوجد تفاصيل (تم التقييم بدون نافذة تريد).';
                        const interactionMessageObject = interaction.message;
                        
                        if (interactionMessageObject && interactionMessageObject.embeds) {
                            
                            const embedsArray = interactionMessageObject.embeds;
                            
                            if (embedsArray.length > 0) {
                                
                                const firstEmbedObject = embedsArray[0];
                                const oldEmbedDescriptionString = firstEmbedObject.description;
                                
                                const hasTradeDetailsSection = oldEmbedDescriptionString && oldEmbedDescriptionString.includes('**📦 تفاصيل المعاملة:**');
                                
                                if (hasTradeDetailsSection === true) {
                                    
                                    const splitDescriptionArray = oldEmbedDescriptionString.split('**📦 تفاصيل المعاملة:**');
                                    
                                    if (splitDescriptionArray.length > 1) {
                                        const rawTradeDetailsString = splitDescriptionArray[1];
                                        tradeDetailsIncludedTextString = rawTradeDetailsString.trim();
                                    }
                                }
                            }
                        }

                        let currentServerTotalCountNumber = serverConfigDocument.totalServerRatings;
                        
                        if (!currentServerTotalCountNumber) {
                            currentServerTotalCountNumber = 0;
                        }
                        
                        currentServerTotalCountNumber = currentServerTotalCountNumber + 1;
                        serverConfigDocument.totalServerRatings = currentServerTotalCountNumber;

                        let individualRatingCountNumber = 1;

                        if (isStaffRating === true) {
                            const staffRatingsMap = serverConfigDocument.staffRatingsCount;
                            let oldStaffCountNumber = staffRatingsMap.get(ratedTargetUserIdString);
                            
                            if (!oldStaffCountNumber) {
                                oldStaffCountNumber = 0;
                            }
                            
                            individualRatingCountNumber = oldStaffCountNumber + 1;
                            serverConfigDocument.staffRatingsCount.set(ratedTargetUserIdString, individualRatingCountNumber);
                            
                        } else if (isMediatorRating === true) {
                            const middlemanRatingsMap = serverConfigDocument.middlemanRatingsCount;
                            let oldMiddlemanCountNumber = middlemanRatingsMap.get(ratedTargetUserIdString);
                            
                            if (!oldMiddlemanCountNumber) {
                                oldMiddlemanCountNumber = 0;
                            }
                            
                            individualRatingCountNumber = oldMiddlemanCountNumber + 1;
                            serverConfigDocument.middlemanRatingsCount.set(ratedTargetUserIdString, individualRatingCountNumber);
                        }
                        
                        try {
                            await serverConfigDocument.save();
                        } catch (saveError) {}

                        let starsEmojiString = '';
                        for (let index = 0; index < ratingStarsNumber; index++) {
                            starsEmojiString = starsEmojiString + '⭐';
                        }

                        let logAuthorTitleString = '';
                        let logEmbedColorHexCode = '';
                        let ratedPersonLabelString = '';

                        if (isStaffRating === true) {
                            logAuthorTitleString = `${discordGuildObject.name} STAFF REVIEW`;
                            
                            let staffColorValueString = serverConfigDocument.staffRatingColor;
                            if (!staffColorValueString) {
                                staffColorValueString = '#3ba55d';
                            }
                            logEmbedColorHexCode = staffColorValueString;
                            ratedPersonLabelString = 'الإداري 👮';
                            
                        } else if (isMediatorRating === true) {
                            logAuthorTitleString = `${discordGuildObject.name} MIDDLEMAN REVIEW`;
                            
                            let middlemanColorValueString = serverConfigDocument.basicRatingColor;
                            if (!middlemanColorValueString) {
                                middlemanColorValueString = '#f2a658';
                            }
                            logEmbedColorHexCode = middlemanColorValueString;
                            ratedPersonLabelString = 'الوسيط (MiddleMan) 🛡️';
                        }

                        const ratingLogEmbedObject = new EmbedBuilder();
                        const guildDynamicIconUrl = discordGuildObject.iconURL({ dynamic: true });
                        
                        ratingLogEmbedObject.setAuthor({ 
                            name: `📊 ${logAuthorTitleString}`, 
                            iconURL: guildDynamicIconUrl 
                        });
                        
                        ratingLogEmbedObject.setThumbnail(guildDynamicIconUrl);
                        
                        let embedDescriptionTextString = '';
                        embedDescriptionTextString += `**العميل (المُقيِّم) 👤**\n`;
                        embedDescriptionTextString += `<@${interaction.user.id}>\n\n`;
                        
                        embedDescriptionTextString += `**${ratedPersonLabelString}**\n`;
                        embedDescriptionTextString += `<@${ratedTargetUserIdString}>\n\n`;
                        
                        if (isMediatorRating === true) {
                            embedDescriptionTextString += `**📦 تفاصيل التريد:**\n`;
                            embedDescriptionTextString += `${tradeDetailsIncludedTextString}\n\n`;
                        }

                        embedDescriptionTextString += `**الإحصائيات 📈**\n`;
                        embedDescriptionTextString += `عدد التقييمات #${individualRatingCountNumber}\n`;
                        embedDescriptionTextString += `إجمالي السيرفر #${currentServerTotalCountNumber}\n\n`;
                        embedDescriptionTextString += `-------------------------\n\n`;
                        embedDescriptionTextString += `**التقييم ⭐**\n`;
                        embedDescriptionTextString += `**${starsEmojiString} (${ratingStarsNumber}/5)**\n\n`;
                        embedDescriptionTextString += `**التعليق 💬**\n`;
                        embedDescriptionTextString += `\`\`\`${userFeedbackTextString}\`\`\``;

                        ratingLogEmbedObject.setDescription(embedDescriptionTextString);
                        ratingLogEmbedObject.setColor(logEmbedColorHexCode);
                        
                        const interactionUserAvatarUrl = interaction.user.displayAvatarURL({ dynamic: true });
                        const footerTextString = `Rated by: ${interaction.user.username}`;
                        
                        ratingLogEmbedObject.setFooter({ 
                            text: footerTextString, 
                            iconURL: interactionUserAvatarUrl 
                        });
                        ratingLogEmbedObject.setTimestamp();

                        const logMessageContentString = `**New Rating for <@${ratedTargetUserIdString}>!**`;
                        
                        try {
                            await logChannelObject.send({ 
                                content: logMessageContentString, 
                                embeds: [ratingLogEmbedObject] 
                            });
                        } catch (logSendError) {}
                    }
                }
                
                const thankYouEmbedObject = new EmbedBuilder();
                let thankYouDescriptionString = `**✅ شكراً لك! تم إرسال تقييمك للإدارة بنجاح.**\n\n`;
                thankYouDescriptionString += `النجوم: ${ratingStarsNumber}/5`;
                
                thankYouEmbedObject.setDescription(thankYouDescriptionString);
                
                const thankYouColorHexCode = '#3ba55d'; 
                thankYouEmbedObject.setColor(thankYouColorHexCode);
                
                try { 
                    const emptyComponentsArray = [];
                    await interaction.editReply({ 
                        embeds: [thankYouEmbedObject], 
                        components: emptyComponentsArray 
                    }); 
                } catch (editReplyError) {}
                
                return; 
            }
        }

        // =====================================================================
        // ⭐ القسم الثالث: التأكد الدائم أن التفاعل داخل سيرفر (ليس في الخاص)
        // =====================================================================
        const interactionGuildObject = interaction.guild;
        
        if (!interactionGuildObject) {
            return; 
        }
        
        const guildIdString = interactionGuildObject.id;
        const guildConfigFilterObject = { guildId: guildIdString };
        const guildConfigDocument = await GuildConfig.findOne(guildConfigFilterObject);
        
        if (!guildConfigDocument) {
            return; 
        }

        // =====================================================================
        // ⚖️ القسم الرابع: تفاعلات نافذة أمر التريد (!trade) والموافقة
        // =====================================================================
        const isTradeInteractionButton = interaction.isButton();
        
        if (isTradeInteractionButton === true) {
            
            const customIdString = interaction.customId;
            const isOpenTradeModalAction = (customIdString === 'open_trade_modal');
            
            if (isOpenTradeModalAction === true) {
                
                const tradeModalObject = new ModalBuilder();
                
                const tradeModalCustomIdString = 'submit_trade_modal';
                tradeModalObject.setCustomId(tradeModalCustomIdString);
                
                const tradeModalTitleString = 'Trade Details';
                tradeModalObject.setTitle(tradeModalTitleString);
                
                const tradeInputObject = new TextInputBuilder();
                
                const tradeInputCustomIdString = 'trade_details_input';
                tradeInputObject.setCustomId(tradeInputCustomIdString);
                
                const tradeInputLabelString = 'ما هي تفاصيل التريد؟ (الحساب، السعر، إلخ..)';
                tradeInputObject.setLabel(tradeInputLabelString);
                
                const tradeInputStyleType = TextInputStyle.Paragraph;
                tradeInputObject.setStyle(tradeInputStyleType);
                
                const isTradeInputRequired = true;
                tradeInputObject.setRequired(isTradeInputRequired);
                
                const tradeActionRowObject = new ActionRowBuilder();
                tradeActionRowObject.addComponents(tradeInputObject);
                
                tradeModalObject.addComponents(tradeActionRowObject);
                
                try {
                    await interaction.showModal(tradeModalObject);
                } catch (tradeModalError) {}
                
                return; 
            }
        }

        const isTradeModalSubmit = interaction.isModalSubmit();
        
        if (isTradeModalSubmit === true) {
            
            const customIdString = interaction.customId;
            const isSubmitTradeModalAction = (customIdString === 'submit_trade_modal');
            
            if (isSubmitTradeModalAction === true) {
                
                const tradeInputCustomIdString = 'trade_details_input';
                const tradeDetailsTextString = interaction.fields.getTextInputValue(tradeInputCustomIdString);
                
                const originalInteractionMessageObject = interaction.message;
                
                if (originalInteractionMessageObject) {
                    const messageComponentsArray = originalInteractionMessageObject.components;
                    
                    if (messageComponentsArray && messageComponentsArray.length > 0) {
                        const originalActionRowObject = messageComponentsArray[0];
                        const rowComponentsArray = originalActionRowObject.components;
                        
                        if (rowComponentsArray && rowComponentsArray.length > 0) {
                            const originalButtonObject = rowComponentsArray[0];
                            const disabledButtonObject = ButtonBuilder.from(originalButtonObject);
                            
                            const isButtonDisabledBoolean = true;
                            disabledButtonObject.setDisabled(isButtonDisabledBoolean);
                            
                            const disabledButtonStyleType = ButtonStyle.Secondary; 
                            disabledButtonObject.setStyle(disabledButtonStyleType); 
                            
                            const newDisabledRowObject = new ActionRowBuilder();
                            newDisabledRowObject.addComponents(disabledButtonObject);
                            
                            try {
                                await originalInteractionMessageObject.edit({ 
                                    components: [newDisabledRowObject] 
                                });
                            } catch (editButtonError) {}
                        }
                    }
                }

                const tradeRequestEmbedObject = new EmbedBuilder();
                const tradeRequestTitleString = '⚖️ Trade Approval Request';
                tradeRequestEmbedObject.setTitle(tradeRequestTitleString);
                
                let tradeDescriptionString = '';
                const interactionUserIdString = interaction.user.id;
                tradeDescriptionString += `**MiddleMan:** <@${interactionUserIdString}>\n\n`;
                tradeDescriptionString += `**Details:**\n`;
                tradeDescriptionString += `>>> ${tradeDetailsTextString}\n\n`;
                tradeDescriptionString += `⏳ *Waiting for approval...*`;
                
                tradeRequestEmbedObject.setDescription(tradeDescriptionString);
                
                let tradeEmbedColorHexCode = guildConfigDocument.tradeEmbedColor;
                if (!tradeEmbedColorHexCode) {
                    tradeEmbedColorHexCode = '#f2a658';
                }
                
                tradeRequestEmbedObject.setColor(tradeEmbedColorHexCode);
                tradeRequestEmbedObject.setTimestamp();

                const approvalActionRowObject = new ActionRowBuilder();
                const approveButtonObject = new ButtonBuilder();
                const approveCustomIdString = 'trade_approve';
                approveButtonObject.setCustomId(approveCustomIdString);
                const approveLabelString = 'Approve ✅';
                approveButtonObject.setLabel(approveLabelString);
                const approveStyleType = ButtonStyle.Success;
                approveButtonObject.setStyle(approveStyleType);
                
                const rejectButtonObject = new ButtonBuilder();
                const rejectCustomIdString = 'trade_reject';
                rejectButtonObject.setCustomId(rejectCustomIdString);
                const rejectLabelString = 'Reject ❌';
                rejectButtonObject.setLabel(rejectLabelString);
                const rejectStyleType = ButtonStyle.Danger;
                rejectButtonObject.setStyle(rejectStyleType);
                
                approvalActionRowObject.addComponents(approveButtonObject, rejectButtonObject);

                let finalMentionString = '';
                const tradeMentionRolesArray = guildConfigDocument.tradeMentionRoles;
                
                if (tradeMentionRolesArray && tradeMentionRolesArray.length > 0) {
                    for (let index = 0; index < tradeMentionRolesArray.length; index++) {
                        const roleIdString = tradeMentionRolesArray[index];
                        finalMentionString += `<@&${roleIdString}> `;
                    }
                }
                
                let messageContentToDrop = null;
                if (finalMentionString !== '') {
                    messageContentToDrop = `**🔔 نداء للموافقات العليا:** ${finalMentionString}`;
                }

                try {
                    await interaction.reply({ 
                        content: messageContentToDrop,
                        embeds: [tradeRequestEmbedObject], 
                        components: [approvalActionRowObject] 
                    });
                } catch (replyError) {}
                
                return; 
            }
        }

        const isApprovalButtonInteraction = interaction.isButton();
        
        if (isApprovalButtonInteraction === true) {
            
            const customIdString = interaction.customId;
            const isTradeApproveAction = (customIdString === 'trade_approve');
            const isTradeRejectAction = (customIdString === 'trade_reject');
            const isAnyTradeAction = (isTradeApproveAction || isTradeRejectAction);
            
            if (isAnyTradeAction === true) {
                
                let tradeAllowedRolesArray = guildConfigDocument.tradeApproveRoles;
                const isTradeApproveRolesEmpty = (!tradeAllowedRolesArray || tradeAllowedRolesArray.length === 0);
                
                if (isTradeApproveRolesEmpty === true) {
                    tradeAllowedRolesArray = guildConfigDocument.highMiddlemanRoles; 
                }
                
                let hasTradePermissionBoolean = false;
                const interactionMemberObject = interaction.member;
                const memberPermissionsObject = interactionMemberObject.permissions;
                const hasAdminPermission = memberPermissionsObject.has('Administrator');
                
                if (hasAdminPermission === true) {
                    hasTradePermissionBoolean = true;
                } else {
                    const memberRolesCollection = interactionMemberObject.roles.cache;
                    if (tradeAllowedRolesArray && tradeAllowedRolesArray.length > 0) {
                        for (let index = 0; index < tradeAllowedRolesArray.length; index++) {
                            const requiredRoleIdString = tradeAllowedRolesArray[index];
                            const memberHasRole = memberRolesCollection.has(requiredRoleIdString);
                            if (memberHasRole === true) {
                                hasTradePermissionBoolean = true;
                                break;
                            }
                        }
                    }
                }
                
                if (hasTradePermissionBoolean === false) {
                    const noPermissionMessageContent = '**❌ عذراً، لا تمتلك صلاحية للموافقة أو الرفض على هذا الطلب!**';
                    try {
                        return await interaction.reply({ content: noPermissionMessageContent, ephemeral: true });
                    } catch (replyError) { return; }
                }

                const originalInteractionMessageObject = interaction.message;
                const originalEmbedsArray = originalInteractionMessageObject.embeds;
                const oldEmbedObject = originalEmbedsArray[0];
                const updatedTradeEmbedObject = EmbedBuilder.from(oldEmbedObject);
                const interactionUserIdString = interaction.user.id;
                
                if (isTradeApproveAction === true) {
                    const approveColorHexCode = '#3ba55d';
                    updatedTradeEmbedObject.setColor(approveColorHexCode);
                    const statusFieldNameString = 'Status:';
                    const statusFieldValueString = `**✅ Approved by <@${interactionUserIdString}>**`;
                    updatedTradeEmbedObject.addFields({ name: statusFieldNameString, value: statusFieldValueString });
                } else if (isTradeRejectAction === true) {
                    const rejectColorHexCode = '#ed4245';
                    updatedTradeEmbedObject.setColor(rejectColorHexCode);
                    const statusFieldNameString = 'Status:';
                    const statusFieldValueString = `**❌ Rejected by <@${interactionUserIdString}>**`;
                    updatedTradeEmbedObject.addFields({ name: statusFieldNameString, value: statusFieldValueString });
                }

                try {
                    const emptyComponentsArray = [];
                    await interaction.update({ embeds: [updatedTradeEmbedObject], components: emptyComponentsArray });
                } catch (updateError) {}
                
                return; 
            }
        }
// ==================== نهاية الجزء الأول ====================

        // =====================================================================
        // 🟢 القسم الخامس: زر تحميل الترانسكريبت المباشر (Direct Transcript)
        // =====================================================================
        const isTranscriptButton = interaction.isButton();
        
        if (isTranscriptButton === true) {
            
            const customIdString = interaction.customId;
            const isDirectTranscriptAction = (customIdString === 'direct_transcript_btn');
            
            if (isDirectTranscriptAction === true) {
                
                try {
                    await interaction.deferReply({ ephemeral: true });
                } catch (deferError) {}
                
                const interactionMessageObject = interaction.message;
                const logMessageContentString = interactionMessageObject.content;
                
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
                    
                    const successTranscriptMessage = '**✅ Here is your direct transcript file:**';
                    
                    await interaction.editReply({ 
                        content: successTranscriptMessage, 
                        files: [htmlFileAttachmentObject] 
                    });
                    
                } catch (transcriptError) {
                    console.log("Error generating transcript: ", transcriptError);
                    const errorTranscriptMessage = '**❌ Error generating the direct transcript.**';
                    await interaction.editReply({ content: errorTranscriptMessage });
                }
                
                return; 
            }
        }

        // =====================================================================
        // 🎟️ القسم السادس: فتح التكت من البانرات المتعددة (Multi-Panels)
        // =====================================================================
        const isTicketOpenButtonInteraction = interaction.isButton();
        
        if (isTicketOpenButtonInteraction === true) {
            
            const customIdString = interaction.customId;
            const isTicketOpenAction = customIdString.startsWith('ticket_open_');
            
            if (isTicketOpenAction === true) {
                
                const buttonRealIdString = customIdString.replace('ticket_open_', '');
                
                let targetButtonDataObject = null;
                let targetPanelDataObject = null;
                
                const ticketPanelsArray = guildConfigDocument.ticketPanels;
                
                if (ticketPanelsArray && ticketPanelsArray.length > 0) {
                    
                    for (let panelIndex = 0; panelIndex < ticketPanelsArray.length; panelIndex++) {
                        
                        const currentPanelObject = ticketPanelsArray[panelIndex];
                        const panelButtonsArray = currentPanelObject.buttons;
                        
                        if (panelButtonsArray && panelButtonsArray.length > 0) {
                            
                            for (let buttonIndex = 0; buttonIndex < panelButtonsArray.length; buttonIndex++) {
                                
                                const currentButtonObject = panelButtonsArray[buttonIndex];
                                
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
                    const noButtonMessage = '**❌ This button is no longer available in the database.**';
                    return interaction.reply({ content: noButtonMessage, ephemeral: true });
                }

                let maximumTicketsAllowedNumber = guildConfigDocument.maxTicketsPerUser;
                
                if (!maximumTicketsAllowedNumber) {
                    maximumTicketsAllowedNumber = 1;
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
                    
                    return (isTicketNameFormat === true && isOwnedByCurrentUser === true);
                });
                
                const existingOpenTicketsCountNumber = existingOpenTicketsCollection.size;
                
                if (existingOpenTicketsCountNumber >= maximumTicketsAllowedNumber) {
                    const maxTicketsMessage = `**❌ You can only have ${maximumTicketsAllowedNumber} open ticket(s) at the same time.**`;
                    return interaction.reply({ content: maxTicketsMessage, ephemeral: true });
                }

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

                    for (let fieldIndex = 0; fieldIndex < buttonModalFieldsArray.length; fieldIndex++) {
                        
                        const currentFieldObject = buttonModalFieldsArray[fieldIndex];
                        const inputFieldObject = new TextInputBuilder();
                        
                        const generatedFieldCustomId = `field_${fieldIndex}`;
                        inputFieldObject.setCustomId(generatedFieldCustomId);
                        
                        let safeLabelString = currentFieldObject.label;
                        if (safeLabelString.length > 45) {
                            safeLabelString = safeLabelString.substring(0, 45); 
                        }
                        
                        inputFieldObject.setLabel(safeLabelString);
                        
                        const textInputStyleType = TextInputStyle.Paragraph;
                        inputFieldObject.setStyle(textInputStyleType);
                        
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
                    
                    try {
                        await interaction.showModal(ticketModalObject);
                    } catch (modalShowError) {
                        console.log("Error showing ticket modal: ", modalShowError);
                    }
                    
                } else {
                    
                    try {
                        await interaction.deferReply({ ephemeral: true });
                    } catch (deferError) {}
                    
                    const emptyAnswersArray = [];
                    await openNewTicketFunction(interaction, targetButtonDataObject, guildConfigDocument, emptyAnswersArray, targetPanelDataObject);
                }
            }
        }

        // =====================================================================
        // 📝 القسم السابع: استلام إجابات النافذة وفتح التكت
        // =====================================================================
        const isModalTicketSubmitInteraction = interaction.isModalSubmit();
        
        if (isModalTicketSubmitInteraction === true) {
            
            const customIdString = interaction.customId;
            const isModalTicketSubmitAction = customIdString.startsWith('modalticket_');
            
            if (isModalTicketSubmitAction === true) {
                
                try {
                    await interaction.deferReply({ ephemeral: true });
                } catch (deferError) {}

                const buttonRealIdString = customIdString.replace('modalticket_', '');
                
                let targetButtonDataObject = null;
                let targetPanelDataObject = null;
                
                const ticketPanelsArray = guildConfigDocument.ticketPanels;
                
                if (ticketPanelsArray && ticketPanelsArray.length > 0) {
                    
                    for (let panelIndex = 0; panelIndex < ticketPanelsArray.length; panelIndex++) {
                        
                        const currentPanelObject = ticketPanelsArray[panelIndex];
                        const panelButtonsArray = currentPanelObject.buttons;
                        
                        if (panelButtonsArray && panelButtonsArray.length > 0) {
                            
                            for (let buttonIndex = 0; buttonIndex < panelButtonsArray.length; buttonIndex++) {
                                
                                const currentButtonObject = panelButtonsArray[buttonIndex];
                                
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
                    return; 
                }
                
                const userAnswersCollectedArray = [];
                const buttonModalFieldsArray = targetButtonDataObject.modalFields;
                
                for (let fieldIndex = 0; fieldIndex < buttonModalFieldsArray.length; fieldIndex++) {
                    
                    const fieldConfigObject = buttonModalFieldsArray[fieldIndex];
                    const generatedFieldCustomId = `field_${fieldIndex}`;
                    
                    const writtenValueString = interaction.fields.getTextInputValue(generatedFieldCustomId);
                    
                    const answerObject = {
                        label: fieldConfigObject.label,
                        value: writtenValueString
                    };
                    
                    userAnswersCollectedArray.push(answerObject);
                }
                
                await openNewTicketFunction(interaction, targetButtonDataObject, guildConfigDocument, userAnswersCollectedArray, targetPanelDataObject);
            }
        }
// ==================== نهاية الجزء الثاني ====================

              // =====================================================================
        // ⚙️ القسم الثامن: أزرار التحكم داخل التكت (Close, Claim, Delete, Add User)
        // =====================================================================
        const isTicketControlButtonInteraction = interaction.isButton();
        
        if (isTicketControlButtonInteraction === true) {
            
            const customIdString = interaction.customId;
            
            // -------------------------------------------------------------
            // 🔒 1. زر الإغلاق المبدئي (رسالة التأكيد)
            // -------------------------------------------------------------
            if (customIdString === 'ticket_close') {
                
                const confirmationActionRowObject = new ActionRowBuilder();
                
                const confirmCloseButtonObject = new ButtonBuilder();
                confirmCloseButtonObject.setCustomId('confirm_close');
                confirmCloseButtonObject.setLabel('Confirm Close');
                confirmCloseButtonObject.setStyle(ButtonStyle.Danger);
                
                const cancelCloseButtonObject = new ButtonBuilder();
                cancelCloseButtonObject.setCustomId('cancel_close');
                cancelCloseButtonObject.setLabel('Cancel');
                cancelCloseButtonObject.setStyle(ButtonStyle.Secondary);
                
                confirmationActionRowObject.addComponents(confirmCloseButtonObject, cancelCloseButtonObject);
                
                const replyMessageString = '**⚠️ Are you sure you want to close this ticket?**';
                
                try {
                    await interaction.reply({ 
                        content: replyMessageString, 
                        components: [confirmationActionRowObject], 
                        ephemeral: true 
                    });
                } catch (replyError) {}
            }

            if (customIdString === 'cancel_close') {
                const cancelMessageString = '**✅ Cancelled.**';
                try {
                    await interaction.update({ 
                        content: cancelMessageString, 
                        components: [] 
                    });
                } catch (updateError) {}
            }

            // -------------------------------------------------------------
            // ✅ 2. تأكيد الإغلاق الفعلي وإرسال بانل التحكم (مطابق للصورة 2)
            // -------------------------------------------------------------
            if (customIdString === 'confirm_close') {
                
                try {
                    await interaction.deferUpdate(); 
                } catch (deferError) {}
                
                const currentChannelObject = interaction.channel;
                
                let currentTopicString = currentChannelObject.topic;
                if (!currentTopicString) {
                    currentTopicString = '';
                }
                
                const topicPartsArray = currentTopicString.split('_');
                
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

                // تغيير اسم الروم إلى closed-
                const oldChannelNameString = currentChannelObject.name;
                const namePartsArray = oldChannelNameString.split('-');
                
                let oldNameNumberString = namePartsArray[1];
                if (!oldNameNumberString) {
                    oldNameNumberString = '0';
                }
                
                const newClosedChannelName = `closed-${oldNameNumberString}`;
                
                try {
                    await currentChannelObject.setName(newClosedChannelName);
                } catch (setNameError) {}

                const interactionUserIdString = interaction.user.id;
                const closingNotificationMessage = `**🔒 The ticket has been closed by <@${interactionUserIdString}>**`;
                
                try {
                    await currentChannelObject.send(closingNotificationMessage);
                } catch (sendError) {}

                // 🔥 منع التقييم المزدوج والتحقق من إعدادات التقييم في الزر
                let specificButtonDataObject = null;
                const ticketPanelsArray = guildConfigDocument.ticketPanels;
                
                if (ticketPanelsArray && ticketPanelsArray.length > 0) {
                    for (let panelIndex = 0; panelIndex < ticketPanelsArray.length; panelIndex++) {
                        const panelObject = ticketPanelsArray[panelIndex];
                        const panelButtonsArray = panelObject.buttons;
                        
                        if (panelButtonsArray && panelButtonsArray.length > 0) {
                            for (let buttonIndex = 0; buttonIndex < panelButtonsArray.length; buttonIndex++) {
                                const currentButtonObject = panelButtonsArray[buttonIndex];
                                
                                if (currentButtonObject.id === usedButtonIdString) {
                                    specificButtonDataObject = currentButtonObject;
                                    break;
                                }
                            }
                        }
                        if (specificButtonDataObject) {
                            break;
                        }
                    }
                }

                let shouldSendStaffRatingBoolean = true;
                
                if (isMiddleManTicketBoolean === true || (specificButtonDataObject && specificButtonDataObject.isMiddleMan === true)) {
                    shouldSendStaffRatingBoolean = false; 
                } else if (specificButtonDataObject && specificButtonDataObject.enableRating === false) {
                    shouldSendStaffRatingBoolean = false;
                }

                const hasRatingChannelString = guildConfigDocument.staffRatingChannelId;
                
                if (shouldSendStaffRatingBoolean === true && ticketOwnerIdString && claimedByAdminIdString && hasRatingChannelString) {
                    
                    try {
                        const interactionGuildObject = interaction.guild;
                        const ticketOwnerUserObject = await interactionGuildObject.members.fetch(ticketOwnerIdString);
                        const guildNameString = interactionGuildObject.name;
                        
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
                        
                        let staffColorHexCode = guildConfigDocument.staffRatingColor;
                        if (!staffColorHexCode) {
                            staffColorHexCode = '#3ba55d';
                        }
                        ratingEmbedObject.setColor(staffColorHexCode);
                        
                        const guildIconUrl = interactionGuildObject.iconURL({ dynamic: true });
                        ratingEmbedObject.setFooter({ text: guildNameString, iconURL: guildIconUrl });
                        ratingEmbedObject.setTimestamp();
                        
                        const starsActionRowObject = new ActionRowBuilder();
                        
                        const star1Button = new ButtonBuilder().setCustomId(`rate_staff_1_${claimedByAdminIdString}_${interactionGuildObject.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary);
                        const star2Button = new ButtonBuilder().setCustomId(`rate_staff_2_${claimedByAdminIdString}_${interactionGuildObject.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary);
                        const star3Button = new ButtonBuilder().setCustomId(`rate_staff_3_${claimedByAdminIdString}_${interactionGuildObject.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        const star4Button = new ButtonBuilder().setCustomId(`rate_staff_4_${claimedByAdminIdString}_${interactionGuildObject.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        const star5Button = new ButtonBuilder().setCustomId(`rate_staff_5_${claimedByAdminIdString}_${interactionGuildObject.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        
                        starsActionRowObject.addComponents(star1Button, star2Button, star3Button, star4Button, star5Button);
                        
                        await ticketOwnerUserObject.send({ 
                            embeds: [ratingEmbedObject], 
                            components: [starsActionRowObject] 
                        });
                        
                    } catch (ratingError) { 
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
                
                topicPartsArray[4] = interactionUserIdString; // خانة الـ Closer
                
                const newTopicStringForChannel = topicPartsArray.join('_');
                
                try {
                    await currentChannelObject.setTopic(newTopicStringForChannel);
                } catch (topicError) {}

                // 🔥 بناء بانل التحكم مطابق للصورة رقم 2 تماماً!
                const controlEmbedObject = new EmbedBuilder();
                const controlTitleString = 'Ticket control';
                controlEmbedObject.setTitle(controlTitleString);
                
                const closedByDescriptionString = `Closed By: <@${interactionUserIdString}>\n(${interactionUserIdString})`;
                controlEmbedObject.setDescription(closedByDescriptionString);
                
                let closeEmbedColorHexCode = guildConfigDocument.closeEmbedColor;
                if (!closeEmbedColorHexCode) {
                    closeEmbedColorHexCode = '#2b2d31';
                }
                controlEmbedObject.setColor(closeEmbedColorHexCode);
                
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
                try {
                    await currentChannelObject.send({ 
                        embeds: [controlEmbedObject], 
                        components: [controlRow1Object, controlRow2Object] 
                    });
                } catch (sendControlError) {}
                
                // حذف الرسالة الأصلية
                const originalInteractionMessageObject = interaction.message;
                try {
                    await originalInteractionMessageObject.delete();
                } catch (deleteMsgError) {}
            }

            // -------------------------------------------------------------
            // 🛡️ 3. زر الاستلام (Claim) السرعة الصاروخية
            // -------------------------------------------------------------
            if (customIdString === 'ticket_claim') {
                
                const currentChannelObject = interaction.channel;
                
                let currentTopicString = currentChannelObject.topic;
                if (!currentTopicString) {
                    currentTopicString = '';
                }
                
                const topicPartsArray = currentTopicString.split('_');
                const usedButtonIdString = topicPartsArray[1];
                
                let specificButtonDataObject = null;
                const ticketPanelsArray = guildConfigDocument.ticketPanels;
                
                if (ticketPanelsArray && ticketPanelsArray.length > 0) {
                    for (let panelIndex = 0; panelIndex < ticketPanelsArray.length; panelIndex++) {
                        const panelObject = ticketPanelsArray[panelIndex];
                        const panelButtonsArray = panelObject.buttons;
                        
                        if (panelButtonsArray && panelButtonsArray.length > 0) {
                            for (let buttonIndex = 0; buttonIndex < panelButtonsArray.length; buttonIndex++) {
                                const currentButtonObject = panelButtonsArray[buttonIndex];
                                
                                if (currentButtonObject.id === usedButtonIdString) {
                                    specificButtonDataObject = currentButtonObject;
                                    break;
                                }
                            }
                        }
                        if (specificButtonDataObject) {
                            break;
                        }
                    }
                }

                let allowedToClaimRolesArray = [];
                
                const hasCustomClaimRoles = (specificButtonDataObject && specificButtonDataObject.allowedClaimRoles && specificButtonDataObject.allowedClaimRoles.length > 0);
                
                if (hasCustomClaimRoles === true) {
                    allowedToClaimRolesArray = specificButtonDataObject.allowedClaimRoles;
                } else {
                    const allStaffRolesArray = [
                        guildConfigDocument.adminRoleId, 
                        guildConfigDocument.middlemanRoleId,
                        ...guildConfigDocument.highAdminRoles, 
                        ...guildConfigDocument.highMiddlemanRoles
                    ];
                    
                    for (let index = 0; index < allStaffRolesArray.length; index++) {
                        const staffRoleIdString = allStaffRolesArray[index];
                        if (staffRoleIdString) {
                            allowedToClaimRolesArray.push(staffRoleIdString);
                        }
                    }
                }

                let canClaimTicketBoolean = false;
                const interactionMemberObject = interaction.member;
                const memberPermissionsObject = interactionMemberObject.permissions;
                const hasAdminPermission = memberPermissionsObject.has('Administrator');
                
                if (hasAdminPermission === true) {
                    canClaimTicketBoolean = true;
                } else {
                    const memberRolesCollection = interactionMemberObject.roles.cache;
                    for (let index = 0; index < allowedToClaimRolesArray.length; index++) {
                        const requiredRoleIdString = allowedToClaimRolesArray[index];
                        const memberHasRole = memberRolesCollection.has(requiredRoleIdString);
                        if (memberHasRole === true) {
                            canClaimTicketBoolean = true;
                            break;
                        }
                    }
                }

                if (canClaimTicketBoolean === false) {
                    const noPermissionMessageContent = '**❌ You do not have permission to claim this ticket.**';
                    return interaction.reply({ content: noPermissionMessageContent, ephemeral: true });
                }

                // تحديث الزرار فوراً (0.001s)
                const originalInteractionMessageObject = interaction.message;
                const originalMessageComponentsArray = originalInteractionMessageObject.components;
                const newComponentsArray = [];
                
                for (let rowIndex = 0; rowIndex < originalMessageComponentsArray.length; rowIndex++) {
                    
                    const oldActionRowObject = originalMessageComponentsArray[rowIndex];
                    const newActionRowObject = new ActionRowBuilder();
                    
                    const rowComponentsArray = oldActionRowObject.components;
                    
                    for (let buttonIndex = 0; buttonIndex < rowComponentsArray.length; buttonIndex++) {
                        
                        const oldButtonObject = rowComponentsArray[buttonIndex];
                        const clonedButtonObject = ButtonBuilder.from(oldButtonObject);
                        
                        if (oldButtonObject.customId === 'ticket_claim') {
                            const isButtonDisabledBoolean = true;
                            clonedButtonObject.setDisabled(isButtonDisabledBoolean); 
                            
                            const successStyleType = ButtonStyle.Success;
                            clonedButtonObject.setStyle(successStyleType); 
                        }
                        
                        newActionRowObject.addComponents(clonedButtonObject);
                    }
                    
                    newComponentsArray.push(newActionRowObject);
                }
                
                try {
                    await interaction.update({ components: newComponentsArray });
                } catch (updateError) {}
                
                const interactionUserIdString = interaction.user.id;
                const claimNotificationMessage = `**✅ The ticket has been claimed by <@${interactionUserIdString}>**`;
                
                try {
                    await currentChannelObject.send(claimNotificationMessage);
                } catch (sendClaimMsgError) {}

                // ==========================================
                // 🔥 تعديل الصلاحيات في الخلفية بناءً على الإعدادات (Hide / Read-Only)
                // ==========================================
                const currentChannelOverwritesCollection = currentChannelObject.permissionOverwrites.cache;
                const newOverwritesDataArray = [];
                
                currentChannelOverwritesCollection.forEach((overwriteObj) => {
                    const mappedOverwriteObject = {
                        id: overwriteObj.id,
                        allow: overwriteObj.allow.toArray(),
                        deny: overwriteObj.deny.toArray()
                    };
                    newOverwritesDataArray.push(mappedOverwriteObject);
                });

                for (let index = 0; index < allowedToClaimRolesArray.length; index++) {
                    
                    const staffRoleIdString = allowedToClaimRolesArray[index];
                    let roleOverwriteObject = null;
                    
                    for (let arrayIndex = 0; arrayIndex < newOverwritesDataArray.length; arrayIndex++) {
                        if (newOverwritesDataArray[arrayIndex].id === staffRoleIdString) {
                            roleOverwriteObject = newOverwritesDataArray[arrayIndex];
                            break;
                        }
                    }
                    
                    if (!roleOverwriteObject) {
                        roleOverwriteObject = { id: staffRoleIdString, allow: [], deny: [] };
                        newOverwritesDataArray.push(roleOverwriteObject);
                    }
                    
                    const hideTicketSettingBoolean = guildConfigDocument.hideTicketOnClaim;
                    const readOnlySettingBoolean = guildConfigDocument.readOnlyStaffOnClaim;
                    
                    if (hideTicketSettingBoolean === true) {
                        
                        const viewChannelPermissionString = 'ViewChannel';
                        const denyArrayIncludesViewChannel = roleOverwriteObject.deny.includes(viewChannelPermissionString);
                        
                        if (denyArrayIncludesViewChannel === false) {
                            roleOverwriteObject.deny.push(viewChannelPermissionString);
                        }
                        
                        roleOverwriteObject.allow = roleOverwriteObject.allow.filter(perm => perm !== viewChannelPermissionString);
                        
                    } else if (readOnlySettingBoolean === true) {
                        
                        const viewChannelPermissionString = 'ViewChannel';
                        const sendMessagesPermissionString = 'SendMessages';
                        
                        const allowArrayIncludesViewChannel = roleOverwriteObject.allow.includes(viewChannelPermissionString);
                        if (allowArrayIncludesViewChannel === false) {
                            roleOverwriteObject.allow.push(viewChannelPermissionString);
                        }
                        
                        const denyArrayIncludesSendMessages = roleOverwriteObject.deny.includes(sendMessagesPermissionString);
                        if (denyArrayIncludesSendMessages === false) {
                            roleOverwriteObject.deny.push(sendMessagesPermissionString);
                        }
                        
                        roleOverwriteObject.allow = roleOverwriteObject.allow.filter(perm => perm !== sendMessagesPermissionString);
                    }
                }
                
                let claimerOverwriteObject = null;
                const claimerUserIdString = interactionUserIdString;
                
                for (let arrayIndex = 0; arrayIndex < newOverwritesDataArray.length; arrayIndex++) {
                    if (newOverwritesDataArray[arrayIndex].id === claimerUserIdString) {
                        claimerOverwriteObject = newOverwritesDataArray[arrayIndex];
                        break;
                    }
                }
                
                if (!claimerOverwriteObject) {
                    const newClaimerPermObject = { 
                        id: claimerUserIdString, 
                        allow: ['ViewChannel', 'SendMessages'], 
                        deny: [] 
                    };
                    newOverwritesDataArray.push(newClaimerPermObject);
                } else {
                    const allowArrayIncludesViewChannel = claimerOverwriteObject.allow.includes('ViewChannel');
                    if (allowArrayIncludesViewChannel === false) {
                        claimerOverwriteObject.allow.push('ViewChannel');
                    }
                    
                    const allowArrayIncludesSendMessages = claimerOverwriteObject.allow.includes('SendMessages');
                    if (allowArrayIncludesSendMessages === false) {
                        claimerOverwriteObject.allow.push('SendMessages');
                    }
                }

                try {
                    await currentChannelObject.permissionOverwrites.set(newOverwritesDataArray);
                } catch (permSetError) {}
                
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
            // 🔓 4. زر إعادة الفتح (Reopen)
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
                try {
                    await interaction.reply(reopenSuccessMessage);
                } catch (replyError) {}
                
                const originalInteractionMessageObject = interaction.message;
                try {
                    await originalInteractionMessageObject.delete();
                } catch (deleteError) {}
            }

            // -------------------------------------------------------------
            // 🗑️ 5. زر الحذف المباشر (Delete)
            // -------------------------------------------------------------
            if (customIdString === 'ticket_delete') {
                
                const deletingMessage = '**🗑️ Deleting the ticket...**';
                
                try {
                    await interaction.reply({ content: deletingMessage, ephemeral: true });
                } catch (replyError) {}
                
                const currentChannelObject = interaction.channel;
                const interactionUserObject = interaction.user;
                const defaultReasonString = "Manual Delete";
                
                await executeDeleteAndLog(currentChannelObject, interactionUserObject, guildConfigDocument, defaultReasonString);
            }

            // -------------------------------------------------------------
            // 📝 6. زر الحذف مع سبب (Delete With Reason)
            // -------------------------------------------------------------
            if (customIdString === 'ticket_delete_reason') {
                
                const deleteModalObject = new ModalBuilder();
                
                const deleteModalCustomIdString = 'modal_delete_reason';
                deleteModalObject.setCustomId(deleteModalCustomIdString);
                
                const deleteModalTitleString = 'Delete Reason';
                deleteModalObject.setTitle(deleteModalTitleString);
                
                const reasonInputObject = new TextInputBuilder();
                
                const reasonInputCustomIdString = 'delete_reason';
                reasonInputObject.setCustomId(reasonInputCustomIdString);
                
                const reasonInputLabelString = 'Reason:';
                reasonInputObject.setLabel(reasonInputLabelString);
                
                const reasonInputStyleType = TextInputStyle.Short;
                reasonInputObject.setStyle(reasonInputStyleType);
                
                const isReasonInputRequiredBoolean = true;
                reasonInputObject.setRequired(isReasonInputRequiredBoolean);
                
                const deleteModalActionRowObject = new ActionRowBuilder();
                deleteModalActionRowObject.addComponents(reasonInputObject);
                
                deleteModalObject.addComponents(deleteModalActionRowObject);
                
                try {
                    await interaction.showModal(deleteModalObject);
                } catch (showModalError) {}
            }

            // -------------------------------------------------------------
            // ➕ 7. زر إضافة عضو (Add User)
            // -------------------------------------------------------------
            if (customIdString === 'ticket_add_user') {
                
                const addUserModalObject = new ModalBuilder();
                
                const addUserModalCustomIdString = 'modal_add_user';
                addUserModalObject.setCustomId(addUserModalCustomIdString);
                
                const addUserModalTitleString = 'Add User';
                addUserModalObject.setTitle(addUserModalTitleString);
                
                const userIdInputObject = new TextInputBuilder();
                
                const userIdInputCustomIdString = 'user_id_to_add';
                userIdInputObject.setCustomId(userIdInputCustomIdString);
                
                const userIdInputLabelString = 'User ID:';
                userIdInputObject.setLabel(userIdInputLabelString);
                
                const userIdInputStyleType = TextInputStyle.Short;
                userIdInputObject.setStyle(userIdInputStyleType);
                
                const isUserIdInputRequiredBoolean = true;
                userIdInputObject.setRequired(isUserIdInputRequiredBoolean);
                
                const addUserActionRowObject = new ActionRowBuilder();
                addUserActionRowObject.addComponents(userIdInputObject);
                
                addUserModalObject.addComponents(addUserActionRowObject);
                
                try {
                    await interaction.showModal(addUserModalObject);
                } catch (showModalError) {}
            }
        }

        // =====================================================================
        // 🧩 القسم التاسع: معالجة النوافذ المنبثقة للإدارة (Delete Reason / Add User)
        // =====================================================================
        const isModalSubmitInteraction = interaction.isModalSubmit();
        
        if (isModalSubmitInteraction === true) {
            
            const customIdString = interaction.customId;
            
            if (customIdString === 'modal_delete_reason') {
                
                const deleteReasonInputCustomId = 'delete_reason';
                const writtenReasonString = interaction.fields.getTextInputValue(deleteReasonInputCustomId);
                
                const deletingMessageContent = '**🗑️ Deleting the ticket...**';
                
                try {
                    await interaction.reply({ content: deletingMessageContent, ephemeral: true });
                } catch (replyError) {}
                
                const currentChannelObject = interaction.channel;
                const interactionUserObject = interaction.user;
                
                await executeDeleteAndLog(currentChannelObject, interactionUserObject, guildConfigDocument, writtenReasonString);
            }

            if (customIdString === 'modal_add_user') {
                
                const userIdInputCustomId = 'user_id_to_add';
                const userIdToAddString = interaction.fields.getTextInputValue(userIdInputCustomId);
                
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
                    
                    try {
                        await currentChannelObject.setTopic(newTopicString);
                    } catch (topicSetError) {}

                    const interactionUserIdString = interaction.user.id;
                    const successAddMessageContent = `**✅ <@${userIdToAddString}> was added to the ticket by <@${interactionUserIdString}>**`;
                    
                    try {
                        await interaction.reply(successAddMessageContent);
                    } catch (replyError) {}
                    
                } catch (addError) { 
                    const notFoundMessageContent = '**❌ User not found in this server.**';
                    try {
                        await interaction.reply({ content: notFoundMessageContent, ephemeral: true }); 
                    } catch (replyError) {}
                }
            }
        }
    });

    // =====================================================================
    // 🛠️ دوال الدعم (Helper Functions)
    // =====================================================================
    
    // دالة فتح تكت جديد وبناء الإيمبدات المفصولة والخطوط
    async function openNewTicketFunction(interactionObject, buttonDataObject, configDocument, answersArray, targetPanelDataObject) {
        
        let currentTicketCountNumber = configDocument.ticketCount;
        
        if (!currentTicketCountNumber) {
            currentTicketCountNumber = 0;
        }
        
        const newTicketNumber = currentTicketCountNumber + 1;
        
        let targetCategoryIdString = null;
        
        if (targetPanelDataObject) {
            targetCategoryIdString = targetPanelDataObject.ticketCategoryId;
        }
        
        if (!targetCategoryIdString) {
            targetCategoryIdString = configDocument.defaultCategoryId;
        }
        
        const permissionsDataArray = [];
        
        const interactionGuildObject = interactionObject.guild;
        const interactionGuildIdString = interactionGuildObject.id;
        const everyoneRolePermissionObject = { 
            id: interactionGuildIdString, 
            deny: [PermissionFlagsBits.ViewChannel] 
        };
        permissionsDataArray.push(everyoneRolePermissionObject);
        
        const interactionUserObject = interactionObject.user;
        const interactionUserIdString = interactionUserObject.id;
        const userPermissionObject = { 
            id: interactionUserIdString, 
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
        };
        permissionsDataArray.push(userPermissionObject);
        
        const staffRolesArrayList = [
            configDocument.adminRoleId, 
            configDocument.middlemanRoleId, 
            ...configDocument.highAdminRoles, 
            ...configDocument.highMiddlemanRoles 
        ];
        
        for (let index = 0; index < staffRolesArrayList.length; index++) {
            const roleIdString = staffRolesArrayList[index];
            if (roleIdString) {
                const rolePermissionObject = { 
                    id: roleIdString, 
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
                };
                permissionsDataArray.push(rolePermissionObject);
            }
        }

        let isMiddleManString = 'false';
        const buttonIsMiddleManBoolean = buttonDataObject.isMiddleMan;
        
        if (buttonIsMiddleManBoolean === true) {
            isMiddleManString = 'true';
        }
        
        const buttonIdString = buttonDataObject.id;
        const initialTopicDataString = `${interactionUserIdString}_${buttonIdString}_none_none_none_${isMiddleManString}`;

        const newChannelNameString = `ticket-${newTicketNumber}`;
        const guildChannelsManager = interactionGuildObject.channels;
        
        let createdChannelObject = null;
        
        try {
            createdChannelObject = await guildChannelsManager.create({
                name: newChannelNameString, 
                type: ChannelType.GuildText, 
                parent: targetCategoryIdString, 
                topic: initialTopicDataString, 
                permissionOverwrites: permissionsDataArray
            });
        } catch (createChannelError) {
            console.log("Error creating ticket channel: ", createChannelError);
            return;
        }
        
        const guildIdFilterObject = { guildId: interactionGuildIdString };
        const incrementUpdateObject = { $inc: { ticketCount: 1 } };
        
        try {
            await GuildConfig.findOneAndUpdate(guildIdFilterObject, incrementUpdateObject);
        } catch (updateDbError) {}

        const buttonLabelString = buttonDataObject.label;
        const welcomeMessageContentString = `**Welcome <@${interactionUserIdString}>**\n**Reason:** ${buttonLabelString}`;
        
        const embedsListArray = [];

        // 🟢 الإيمبد الأول: الترحيب والقوانين
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
        
        let colorValueHexCode = buttonDataObject.insideEmbedColor;
        if (!colorValueHexCode) {
            colorValueHexCode = '#2b2d31';
        }
        infoEmbedObject.setColor(colorValueHexCode);
        
        embedsListArray.push(infoEmbedObject);

        // 🟢 الإيمبد الثاني: إجابات النافذة بالخط الجانبي الشيك (>>> )
        const hasAnswersBoolean = (answersArray && answersArray.length > 0);
        
        if (hasAnswersBoolean === true) {
            
            const answersEmbedObject = new EmbedBuilder();
            
            let answersColorHexCode = configDocument.answersEmbedColor;
            if (!answersColorHexCode) {
                answersColorHexCode = '#2b2d31';
            }
            answersEmbedObject.setColor(answersColorHexCode);
            
            for (let index = 0; index < answersArray.length; index++) {
                
                const singleAnswerObject = answersArray[index];
                
                let valueToDisplayString = singleAnswerObject.value;
                const isValueEmpty = (!valueToDisplayString || valueToDisplayString === '');
                
                if (isValueEmpty === true) {
                    valueToDisplayString = 'N/A';
                }
                
                const formattedAnswerString = `>>> ${valueToDisplayString}`;
                const formattedLabelString = `**${singleAnswerObject.label}**`;
                
                answersEmbedObject.addFields({ 
                    name: formattedLabelString, 
                    value: formattedAnswerString 
                });
            }
            
            embedsListArray.push(answersEmbedObject);
        }

        // 🔥 بناء الزراير لتطابق الصورة الأولى
        const controlsActionRow1Object = new ActionRowBuilder();
        
        const addUserButtonObject = new ButtonBuilder();
        addUserButtonObject.setCustomId('ticket_add_user');
        addUserButtonObject.setLabel('Add User');
        addUserButtonObject.setStyle(ButtonStyle.Secondary); 
        
        const claimButtonObject = new ButtonBuilder();
        claimButtonObject.setCustomId('ticket_claim');
        claimButtonObject.setLabel('Claim');
        claimButtonObject.setStyle(ButtonStyle.Success); 
        
        const closeButtonObject = new ButtonBuilder();
        closeButtonObject.setCustomId('ticket_close');
        closeButtonObject.setLabel('Close');
        closeButtonObject.setStyle(ButtonStyle.Danger); 
        
        controlsActionRow1Object.addComponents(addUserButtonObject, claimButtonObject, closeButtonObject);

        const controlsActionRow2Object = new ActionRowBuilder();
        
        const deleteReasonButtonObject = new ButtonBuilder();
        deleteReasonButtonObject.setCustomId('ticket_delete_reason');
        deleteReasonButtonObject.setLabel('Delete With Reason');
        deleteReasonButtonObject.setStyle(ButtonStyle.Danger); 
        
        controlsActionRow2Object.addComponents(deleteReasonButtonObject);
        
        try {
            await createdChannelObject.send({ 
                content: welcomeMessageContentString, 
                embeds: embedsListArray, 
                components: [controlsActionRow1Object, controlsActionRow2Object] 
            });
        } catch (sendTicketMessageError) {}
        
        const successReplyMessageContent = `**✅ Ticket opened successfully: <#${createdChannelObject.id}>**`;
        
        try {
            await interactionObject.editReply(successReplyMessageContent);
        } catch (editReplyError) {
            try {
                await interactionObject.reply({ content: successReplyMessageContent, ephemeral: true });
            } catch (replyFallbackError) {}
        }
    }

    // دالة اللوجات والترانسكريبت وحذف التكت
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
        
        const closedByUserIdString = closedByUserObject.id;
        let ticketClosedByIdString = closedByUserIdString; 
        
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
            for (let index = 0; index < addedUsersListArray.length; index++) {
                const userIdString = addedUsersListArray[index];
                mentionsArray.push(`<@${userIdString}>`);
            }
            addedDisplayString = mentionsArray.join(', ');
        }

        const mainLogEmbedObject = new EmbedBuilder();
        
        const ticketGuildObject = ticketChannelObject.guild;
        const guildIconUrlString = ticketGuildObject.iconURL({ dynamic: true });
        
        mainLogEmbedObject.setAuthor({ 
            name: 'MNC TICKET LOGS', 
            iconURL: guildIconUrlString 
        });
        
        const logTitleString = '🗑️ Ticket Deleted';
        mainLogEmbedObject.setTitle(logTitleString);
        
        const ticketChannelNameString = ticketChannelObject.name;
        
        let logDescriptionString = '';
        logDescriptionString += `**Ticket:** ${ticketChannelNameString} was deleted.\n\n`;
        logDescriptionString += `👑 **Owner**\n${ownerDisplayString}\n\n`;
        logDescriptionString += `🗑️ **Deleted By**\n<@${closedByUserIdString}>\n\n`;
        logDescriptionString += `🙋 **Claimed By**\n${claimerDisplayString}\n\n`;
        logDescriptionString += `🔒 **Closed By**\n<@${ticketClosedByIdString}>\n\n`;
        logDescriptionString += `➕ **Added Users**\n${addedDisplayString}\n\n`;
        logDescriptionString += `📝 **Reason**\n${deleteReasonTextString}`;
        
        mainLogEmbedObject.setDescription(logDescriptionString);
        
        let defaultLogColorHexCode = configDocument.logEmbedColor;
        if (!defaultLogColorHexCode) {
            defaultLogColorHexCode = '#ed4245';
        }
        
        mainLogEmbedObject.setColor(defaultLogColorHexCode);
        mainLogEmbedObject.setTimestamp();

        const ticketLogChannelIdString = configDocument.ticketLogChannelId;
        const guildChannelsCollection = ticketGuildObject.channels.cache;
        
        if (ticketLogChannelIdString) { 
            const pureLogChannelObject = guildChannelsCollection.get(ticketLogChannelIdString); 
            if (pureLogChannelObject) {
                try {
                    await pureLogChannelObject.send({ embeds: [mainLogEmbedObject] });
                } catch (logSendError) {}
            }
        }
        
        const transcriptChannelIdString = configDocument.transcriptChannelId;
        const isTranscriptChannelDifferent = (transcriptChannelIdString !== ticketLogChannelIdString);
        
        if (transcriptChannelIdString && isTranscriptChannelDifferent === true) { 
            
            const transcriptChannelObject = guildChannelsCollection.get(transcriptChannelIdString); 
            
            if (transcriptChannelObject) {
                
                try {
                    const htmlAttachmentObject = await discordTranscripts.createTranscript(ticketChannelObject, { 
                        limit: -1, 
                        returnType: 'attachment', 
                        filename: `${ticketChannelNameString}.html`, 
                        saveImages: true 
                    });
                    
                    let transcriptColorHexCode = configDocument.transcriptEmbedColor;
                    if (!transcriptColorHexCode) {
                        transcriptColorHexCode = '#2b2d31';
                    }
                    
                    mainLogEmbedObject.setColor(transcriptColorHexCode);
                    
                    const directButtonActionRowObject = new ActionRowBuilder();
                    
                    const directTranscriptButtonObject = new ButtonBuilder();
                    directTranscriptButtonObject.setCustomId('direct_transcript_btn');
                    directTranscriptButtonObject.setLabel('Direct Transcript');
                    directTranscriptButtonObject.setStyle(ButtonStyle.Primary);
                    
                    directButtonActionRowObject.addComponents(directTranscriptButtonObject);

                    const transcriptMessageContentString = `**📄 Transcript for ${ticketChannelNameString}**`;
                    
                    await transcriptChannelObject.send({ 
                        content: transcriptMessageContentString, 
                        files: [htmlAttachmentObject], 
                        embeds: [mainLogEmbedObject], 
                        components: [directButtonActionRowObject] 
                    });
                    
                } catch (transcriptProcessError) {}
            }
        }
        
        setTimeout(() => { 
            try {
                ticketChannelObject.delete();
            } catch (deleteChannelError) {}
        }, 3000);
    }
};
