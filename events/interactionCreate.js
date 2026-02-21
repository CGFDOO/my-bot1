// =========================================================================================================
// 🎯 محرك التفاعلات الشامل (INTERACTION CREATE EVENT - ULTIMATE ENTERPRISE EDITION)
// ---------------------------------------------------------------------------------------------------------
// هذا الملف هو العقل المدبر لكل (زرار، نافذة، تكت، وموافقة تريد) داخل السيرفر.
// تم تطبيق: المربعات (Boxes)، الإغلاق بخطوتين، الترانسكريبت المنفصل، والتريد المتقدم.
// مفرود بالكامل ومحمي ضد إيرور Interaction Failed.
// =========================================================================================================

const discordLibrary = require('discord.js');
const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits, AttachmentBuilder 
} = discordLibrary;

const GuildConfigDatabaseModel = require('../models/GuildConfig');

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(incomingInteractionObject, discordClientObject) {
        
        // =========================================================================================================
        // 🛡️ 1. فحوصات الأمان الأساسية وجلب البيانات
        // =========================================================================================================
        const targetDiscordGuildObject = incomingInteractionObject.guild;
        if (!targetDiscordGuildObject) {
            return; 
        }

        const currentGuildDiscordIdString = targetDiscordGuildObject.id;
        let activeGuildConfigurationDocument = null;

        try {
            activeGuildConfigurationDocument = await GuildConfigDatabaseModel.findOne({ 
                guildId: currentGuildDiscordIdString 
            });
        } catch (databaseFetchException) {
            console.error('[INTERACTION ERROR] Database fetch failed:', databaseFetchException);
            return;
        }

        if (!activeGuildConfigurationDocument) {
            return; 
        }

        // =========================================================================================================
        // 🖱️ 2. التعامل مع الأزرار (Buttons Handler)
        // =========================================================================================================
        const isInteractionAButtonBoolean = incomingInteractionObject.isButton();
        
        if (isInteractionAButtonBoolean === true) {
            const clickedButtonCustomIdString = incomingInteractionObject.customId;

            // -----------------------------------------------------------------------------------------
            // 🛡️ أ. زر فتح تذكرة الوساطة (Middleman Panel)
            // -----------------------------------------------------------------------------------------
            if (clickedButtonCustomIdString === 'open_middleman_ticket') {
                const middlemanSystemConfigObject = activeGuildConfigurationDocument.middlemanSystem;
                
                if (middlemanSystemConfigObject && middlemanSystemConfigObject.enabled === true) {
                    const middlemanTicketModalBuilderObject = new ModalBuilder();
                    middlemanTicketModalBuilderObject.setCustomId('submit_middleman_ticket');
                    middlemanTicketModalBuilderObject.setTitle((middlemanSystemConfigObject.modalTitle || 'بيانات الوساطة').substring(0, 45));

                    const middlemanModalFieldsArray = middlemanSystemConfigObject.modalFields;
                    
                    for (let fieldIndex = 0; fieldIndex < middlemanModalFieldsArray.length; fieldIndex++) {
                        const currentFieldConfigObject = middlemanModalFieldsArray[fieldIndex];
                        const textInputBuilderObject = new TextInputBuilder();
                        
                        textInputBuilderObject.setCustomId(`mm_field_${fieldIndex}`);
                        textInputBuilderObject.setLabel(currentFieldConfigObject.label.substring(0, 45));
                        textInputBuilderObject.setStyle((currentFieldConfigObject.style === 'Short') ? TextInputStyle.Short : TextInputStyle.Paragraph);
                        
                        if (currentFieldConfigObject.placeholder) {
                            textInputBuilderObject.setPlaceholder(currentFieldConfigObject.placeholder.substring(0, 100));
                        }
                        textInputBuilderObject.setRequired(currentFieldConfigObject.required);

                        const actionRowContainerObject = new ActionRowBuilder().addComponents(textInputBuilderObject);
                        middlemanTicketModalBuilderObject.addComponents(actionRowContainerObject);
                    }

                    try {
                        await incomingInteractionObject.showModal(middlemanTicketModalBuilderObject);
                    } catch (showModalException) { console.error(showModalException); }
                }
                return;
            }

            // -----------------------------------------------------------------------------------------
            // 🎟️ ب. أزرار التذاكر المتعددة العادية (Custom Ticket Panels)
            // -----------------------------------------------------------------------------------------
            if (clickedButtonCustomIdString.startsWith('open_ticket_')) {
                const internalButtonIdString = clickedButtonCustomIdString.replace('open_ticket_', '');
                let matchedTicketButtonConfigObject = null;

                const allTicketPanelsArray = activeGuildConfigurationDocument.ticketPanels;
                for (let panelIndex = 0; panelIndex < allTicketPanelsArray.length; panelIndex++) {
                    const currentPanelObject = allTicketPanelsArray[panelIndex];
                    for (let buttonIndex = 0; buttonIndex < currentPanelObject.buttons.length; buttonIndex++) {
                        if (currentPanelObject.buttons[buttonIndex].id === internalButtonIdString) {
                            matchedTicketButtonConfigObject = currentPanelObject.buttons[buttonIndex];
                            break;
                        }
                    }
                    if (matchedTicketButtonConfigObject !== null) break;
                }

                if (matchedTicketButtonConfigObject !== null && matchedTicketButtonConfigObject.requireModal === true) {
                    const normalTicketModalBuilderObject = new ModalBuilder();
                    normalTicketModalBuilderObject.setCustomId(`submit_normal_ticket_${internalButtonIdString}`);
                    normalTicketModalBuilderObject.setTitle((matchedTicketButtonConfigObject.modalTitle || 'بيانات التذكرة').substring(0, 45));

                    const normalModalFieldsArray = matchedTicketButtonConfigObject.modalFields;
                    for (let fieldIndex = 0; fieldIndex < normalModalFieldsArray.length; fieldIndex++) {
                        const currentNormalFieldObject = normalModalFieldsArray[fieldIndex];
                        const normalTextInputBuilderObject = new TextInputBuilder();
                        
                        normalTextInputBuilderObject.setCustomId(`normal_field_${fieldIndex}`);
                        normalTextInputBuilderObject.setLabel(currentNormalFieldObject.label.substring(0, 45));
                        normalTextInputBuilderObject.setStyle((currentNormalFieldObject.style === 'Short') ? TextInputStyle.Short : TextInputStyle.Paragraph);
                        
                        if (currentNormalFieldObject.placeholder) {
                            normalTextInputBuilderObject.setPlaceholder(currentNormalFieldObject.placeholder.substring(0, 100));
                        }
                        normalTextInputBuilderObject.setRequired(currentNormalFieldObject.required);

                        const normalActionRowContainerObject = new ActionRowBuilder().addComponents(normalTextInputBuilderObject);
                        normalTicketModalBuilderObject.addComponents(normalActionRowContainerObject);
                    }

                    try { await incomingInteractionObject.showModal(normalTicketModalBuilderObject); } catch (e) {}
                }
                return;
            }

            // -----------------------------------------------------------------------------------------
            // ⚖️ ج. زر فتح نافذة التريد (Trade Button)
            // -----------------------------------------------------------------------------------------
            if (clickedButtonCustomIdString === 'open_trade_modal') {
                const tradeDetailsModalBuilderObject = new ModalBuilder();
                tradeDetailsModalBuilderObject.setCustomId('submit_trade_details');
                tradeDetailsModalBuilderObject.setTitle('Trade Details | تفاصيل المعاملة');

                const tradeContentTextInputObject = new TextInputBuilder();
                tradeContentTextInputObject.setCustomId('trade_content_input');
                tradeContentTextInputObject.setLabel('ما هي تفاصيل المعاملة؟ (حسابات، سعر، شروط)');
                tradeContentTextInputObject.setStyle(TextInputStyle.Paragraph);
                tradeContentTextInputObject.setRequired(true);
                tradeContentTextInputObject.setPlaceholder('اكتب كل التفاصيل هنا...');

                const tradeActionRowObject = new ActionRowBuilder().addComponents(tradeContentTextInputObject);
                tradeDetailsModalBuilderObject.addComponents(tradeActionRowObject);
                
                await incomingInteractionObject.showModal(tradeDetailsModalBuilderObject);
                return;
            }

            // -----------------------------------------------------------------------------------------
            // ⚖️ د. أزرار موافقة/رفض التريد (الإدارة العليا)
            // -----------------------------------------------------------------------------------------
            if (clickedButtonCustomIdString === 'trade_approve' || clickedButtonCustomIdString === 'trade_reject') {
                await incomingInteractionObject.deferUpdate(); // Defer فوري

                const allowedApproveRolesArray = activeGuildConfigurationDocument.roles.tradeApproveRoleIds || [];
                const isUserAdminBoolean = incomingInteractionObject.member.permissions.has(PermissionFlagsBits.Administrator);
                const doesUserHaveApproveRoleBoolean = incomingInteractionObject.member.roles.cache.some(role => allowedApproveRolesArray.includes(role.id));

                if (isUserAdminBoolean === false && doesUserHaveApproveRoleBoolean === false) {
                    return await incomingInteractionObject.followUp({ content: '**❌ عذراً، الإدارة العليا المحددة فقط هي من توافق على الطلبات.**', ephemeral: true });
                }

                const originalApprovalEmbedObject = incomingInteractionObject.message.embeds[0];
                const updatedApprovalEmbedObject = EmbedBuilder.from(originalApprovalEmbedObject);
                
                const isApprovedActionBoolean = (clickedButtonCustomIdString === 'trade_approve');

                updatedApprovalEmbedObject.setColor(isApprovedActionBoolean ? '#3ba55d' : '#ed4245'); 
                updatedApprovalEmbedObject.addFields({ 
                    name: 'القرار النهائي:', 
                    value: `${isApprovedActionBoolean ? '✅ تمت الموافقة' : '❌ تم الرفض'} بواسطة <@${incomingInteractionObject.user.id}>` 
                });

                // إزالة الأزرار بعد اتخاذ القرار
                await incomingInteractionObject.message.edit({ embeds: [updatedApprovalEmbedObject], components: [] });
                return;
            }

            // =========================================================================================================
            // 🎛️ 3. أزرار التحكم في التذكرة (Ticket Control Buttons)
            // =========================================================================================================
            const currentInteractionChannelObject = incomingInteractionObject.channel;

            // --- زر الاستلام (Claim) ---
            if (clickedButtonCustomIdString === 'ticket_claim') {
                await incomingInteractionObject.deferReply({ ephemeral: false });
                
                const claimingStaffUserIdString = incomingInteractionObject.user.id;
                const claimedEmbedObject = new EmbedBuilder()
                    .setDescription(`**✅ The ticket has been claimed by <@${claimingStaffUserIdString}>**`)
                    .setColor('#3ba55d');

                try {
                    await currentInteractionChannelObject.permissionOverwrites.edit(claimingStaffUserIdString, {
                        ViewChannel: true, SendMessages: true, ReadMessageHistory: true
                    });
                    await incomingInteractionObject.editReply({ embeds: [claimedEmbedObject] });
                    
                    const originalChannelNameString = currentInteractionChannelObject.name;
                    const channelSequenceMatchArray = originalChannelNameString.match(/\d+/);
                    if (channelSequenceMatchArray) {
                        await currentInteractionChannelObject.setName(`claim-${channelSequenceMatchArray[0]}`);
                    }
                } catch (claimException) {}
                return;
            }

            // --- الإغلاق بخطوتين (Close) ---
            if (clickedButtonCustomIdString === 'ticket_close') {
                await incomingInteractionObject.deferReply({ ephemeral: false });

                const closingStaffUserIdString = incomingInteractionObject.user.id;
                const channelTopicDataString = currentInteractionChannelObject.topic;
                let ticketOwnerDiscordIdString = null;
                let ticketTypeString = 'normal';

                if (channelTopicDataString) {
                    const topicExtractedPartsArray = channelTopicDataString.split('_');
                    ticketOwnerDiscordIdString = topicExtractedPartsArray[0];
                    ticketTypeString = topicExtractedPartsArray[1];
                }

                try {
                    // 1. سحب الصلاحيات وتغيير الاسم
                    if (ticketOwnerDiscordIdString && ticketOwnerDiscordIdString !== 'none') {
                        await currentInteractionChannelObject.permissionOverwrites.edit(ticketOwnerDiscordIdString, {
                            ViewChannel: false, SendMessages: false
                        });
                    }

                    const channelSequenceMatchArray = currentInteractionChannelObject.name.match(/\d+/);
                    if (channelSequenceMatchArray) {
                        await currentInteractionChannelObject.setName(`closed-${channelSequenceMatchArray[0]}`);
                    }

                    // 2. إرسال بانل التحكم (Control Panel)
                    const closedTicketControlEmbedObject = new EmbedBuilder()
                        .setTitle('Ticket control')
                        .setDescription(`Closed By: <@${closingStaffUserIdString}>\n(${closingStaffUserIdString})`)
                        .setColor(activeGuildConfigurationDocument.ticketControls.controlPanelColor || '#2b2d31');

                    const controlPanelTopActionRowObject = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen ticket').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete ticket').setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Primary)
                    );
                    
                    const controlPanelBottomActionRowObject = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ticket_delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
                    );

                    await incomingInteractionObject.editReply({ 
                        content: '**🔒 تم إغلاق التذكرة.**', 
                        embeds: [closedTicketControlEmbedObject], 
                        components: [controlPanelTopActionRowObject, controlPanelBottomActionRowObject] 
                    });

                    // 3. تقييم الإدارة (للدعم الفني العادي فقط)
                    if (ticketTypeString === 'normal' && ticketOwnerDiscordIdString && ticketOwnerDiscordIdString !== 'none') {
                        if (activeGuildConfigurationDocument.ratings.staffLogChannelId) {
                            try {
                                const targetTicketOwnerMemberObject = await targetDiscordGuildObject.members.fetch(ticketOwnerDiscordIdString);
                                const staffRatingEmbedObject = new EmbedBuilder()
                                    .setTitle('تقييم الدعم الفني (Staff Review)')
                                    .setDescription(`شكراً لتواصلك معنا.\nيرجى تقييم أداء الإداري <@${closingStaffUserIdString}> لحل مشكلتك.`)
                                    .setColor(activeGuildConfigurationDocument.ratings.staffEmbedColor || '#3ba55d');

                                const staffRatingRow = new ActionRowBuilder().addComponents(
                                    new ButtonBuilder().setCustomId(`rate_staff_5_${closingStaffUserIdString}_${targetDiscordGuildObject.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary)
                                );
                                await targetTicketOwnerMemberObject.send({ embeds: [staffRatingEmbedObject], components: [staffRatingRow] });
                            } catch (e) {}
                        }
                    }
                } catch (closeException) {}
                return;
            }

            // --- زر إضافة عضو للتذكرة (Add User) ---
            if (clickedButtonCustomIdString === 'ticket_add_user') {
                const addUserModalBuilderObject = new ModalBuilder();
                addUserModalBuilderObject.setCustomId('modal_add_user_submit');
                addUserModalBuilderObject.setTitle('Add User | إضافة عضو');

                const userIdTextInputObject = new TextInputBuilder()
                    .setCustomId('user_id_input')
                    .setLabel('User ID (أيدي العضو):')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                addUserModalBuilderObject.addComponents(new ActionRowBuilder().addComponents(userIdTextInputObject));
                await incomingInteractionObject.showModal(addUserModalBuilderObject);
                return;
            }

            // --- زر الحذف المباشر (Delete) ---
            if (clickedButtonCustomIdString === 'ticket_delete') {
                await incomingInteractionObject.deferReply({ ephemeral: false });
                await incomingInteractionObject.editReply({ content: '**🗑️ سيتم حذف التذكرة نهائياً خلال 5 ثوانٍ.**' });
                setTimeout(async () => { try { await currentInteractionChannelObject.delete(); } catch (e) {} }, 5000);
                return;
            }

            // --- زر الحذف مع السبب (Delete With Reason) ---
            if (clickedButtonCustomIdString === 'ticket_delete_reason') {
                const deleteReasonModalBuilderObject = new ModalBuilder()
                    .setCustomId('modal_delete_reason_submit')
                    .setTitle('Delete Ticket | حذف التذكرة');

                const deleteReasonTextInputObject = new TextInputBuilder()
                    .setCustomId('delete_reason_input')
                    .setLabel('Reason for deletion (سبب الحذف):')
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);

                deleteReasonModalBuilderObject.addComponents(new ActionRowBuilder().addComponents(deleteReasonTextInputObject));
                await incomingInteractionObject.showModal(deleteReasonModalBuilderObject);
                return;
            }

            // --- زر إعادة الفتح (Reopen) ---
            if (clickedButtonCustomIdString === 'ticket_reopen') {
                await incomingInteractionObject.deferReply({ ephemeral: false });

                const channelTopicDataStringForReopen = currentInteractionChannelObject.topic;
                let ticketOwnerDiscordIdForReopenString = null;
                if (channelTopicDataStringForReopen) {
                    ticketOwnerDiscordIdForReopenString = channelTopicDataStringForReopen.split('_')[0];
                }

                try {
                    if (ticketOwnerDiscordIdForReopenString && ticketOwnerDiscordIdForReopenString !== 'none') {
                        await currentInteractionChannelObject.permissionOverwrites.edit(ticketOwnerDiscordIdForReopenString, {
                            ViewChannel: true, SendMessages: true
                        });
                    }
                    const channelSequenceMatchForReopenArray = currentInteractionChannelObject.name.match(/\d+/);
                    if (channelSequenceMatchForReopenArray) {
                        await currentInteractionChannelObject.setName(`ticket-${channelSequenceMatchForReopenArray[0]}`);
                    }
                    try { await incomingInteractionObject.message.delete(); } catch (e) {}
                    await incomingInteractionObject.channel.send(`**🔓 تم إعادة فتح التذكرة بواسطة <@${incomingInteractionObject.user.id}>.**`);
                } catch (e) {}
                return;
            }

            // --- زر الترانسكريبت المنفصل (Direct Transcript) ---
            if (clickedButtonCustomIdString === 'ticket_transcript') {
                await incomingInteractionObject.deferReply({ ephemeral: true });
                try {
                    // جلب رسائل التذكرة الحالية فقط
                    const fetchedMessagesCollection = await currentInteractionChannelObject.messages.fetch({ limit: 100 });
                    const sortedMessagesArray = Array.from(fetchedMessagesCollection.values()).reverse();
                    
                    let transcriptContentString = `Transcript for ${currentInteractionChannelObject.name}\n\n`;
                    sortedMessagesArray.forEach(msg => {
                        transcriptContentString += `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}: ${msg.content}\n`;
                    });

                    const transcriptBuffer = Buffer.from(transcriptContentString, 'utf-8');
                    const transcriptAttachment = new AttachmentBuilder(transcriptBuffer, { name: `${currentInteractionChannelObject.name}-transcript.txt` });
                    
                    await incomingInteractionObject.editReply({ 
                        content: '**📄 تم إنشاء نسخة احتياطية من رسائل هذه التذكرة:**', 
                        files: [transcriptAttachment] 
                    });
                } catch (transcriptException) {
                    await incomingInteractionObject.editReply({ content: '**❌ حدث خطأ أثناء سحب الترانسكريبت.**' });
                }
                return;
            }
        }

        // =========================================================================================================
        // 📝 4. التعامل مع إرسال النوافذ (Modal Submit Handler)
        // =========================================================================================================
        const isInteractionAModalSubmitBoolean = incomingInteractionObject.isModalSubmit();
        
        if (isInteractionAModalSubmitBoolean === true) {
            const submittedModalCustomIdString = incomingInteractionObject.customId;

            // -----------------------------------------------------------------------------------------
            // ⚖️ استقبال نافذة التريد (إخفاء الزر + إرسال طلب)
            // -----------------------------------------------------------------------------------------
            if (submittedModalCustomIdString === 'submit_trade_details') {
                await incomingInteractionObject.deferReply({ ephemeral: false });

                const extractedTradeContentString = incomingInteractionObject.fields.getTextInputValue('trade_content_input');
                
                // 1. جعل الزر شفاف (Disabled)
                try {
                    const originalTradeMessageObject = incomingInteractionObject.message;
                    if (originalTradeMessageObject) {
                        const originalEmbedsArray = originalTradeMessageObject.embeds;
                        const disabledActionRowObject = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('open_trade_modal_disabled').setLabel('تم إدخال البيانات ✅').setStyle(ButtonStyle.Secondary).setDisabled(true)
                        );
                        await originalTradeMessageObject.edit({ embeds: originalEmbedsArray, components: [disabledActionRowObject] });
                    }
                } catch (e) {}

                // 2. إرسال طلب الإدارة العليا في صندوق (Box)
                const tradeApprovalRequestEmbedObject = new EmbedBuilder()
                    .setTitle('🚨 طلب وساطة عليا (Trade Approval Request)')
                    .setColor('#fee75c')
                    .setFooter({ text: `Requested by: ${incomingInteractionObject.user.tag}` });
                
                const boxedTradeDetailsString = "```text\n" + extractedTradeContentString + "\n```";
                tradeApprovalRequestEmbedObject.addFields({ name: 'تفاصيل المعاملة:', value: boxedTradeDetailsString });

                const approvalButtonsActionRowObject = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('trade_approve').setLabel('Approve ✅').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('trade_reject').setLabel('Reject ❌').setStyle(ButtonStyle.Danger)
                );

                const tradePingRolesArray = activeGuildConfigurationDocument.roles.tradePingRoleIds || [];
                let mentionString = '';
                if (tradePingRolesArray.length > 0) {
                    mentionString = tradePingRolesArray.map(roleId => `<@&${roleId}>`).join(' ');
                } else {
                    mentionString = '**[High Middleman Alert]**';
                }

                await incomingInteractionObject.editReply({ 
                    content: mentionString, 
                    embeds: [tradeApprovalRequestEmbedObject], 
                    components: [approvalButtonsActionRowObject] 
                });
                return;
            }

            // -----------------------------------------------------------------------------------------
            // 🛡️ إنشاء تذكرة الوساطة (ووضع البيانات في Box)
            // -----------------------------------------------------------------------------------------
            if (submittedModalCustomIdString === 'submit_middleman_ticket') {
                await incomingInteractionObject.deferReply({ ephemeral: true });

                const middlemanSystemConfigObject = activeGuildConfigurationDocument.middlemanSystem;
                activeGuildConfigurationDocument.ticketCount += 1;
                await activeGuildConfigurationDocument.save();
                
                const ticketSequenceNumberInt = activeGuildConfigurationDocument.ticketCount;
                const formattedTicketSequenceString = ticketSequenceNumberInt.toString().padStart(4, '0');
                const middlemanTicketChannelNameString = `ticket-${formattedTicketSequenceString}`;
                const interactingUserDiscordIdString = incomingInteractionObject.user.id;

                const channelPermissionOverwritesArray = [
                    { id: targetDiscordGuildObject.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: interactingUserDiscordIdString, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: discordClientObject.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
                ];

                const assignedMiddlemanRoleIdString = activeGuildConfigurationDocument.roles.middlemanRoleId;
                if (assignedMiddlemanRoleIdString) {
                    channelPermissionOverwritesArray.push({
                        id: assignedMiddlemanRoleIdString,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    });
                }

                try {
                    const createdMiddlemanTicketChannelObject = await targetDiscordGuildObject.channels.create({
                        name: middlemanTicketChannelNameString,
                        type: ChannelType.GuildText,
                        parent: middlemanSystemConfigObject.categoryId || null,
                        permissionOverwrites: channelPermissionOverwritesArray,
                        topic: `${interactingUserDiscordIdString}_middleman_${ticketSequenceNumberInt}_open_none`
                    });

                    const insideMiddlemanTicketEmbedObject = new EmbedBuilder()
                        .setTitle(middlemanSystemConfigObject.insideTicketTitle || 'تذكرة الوساطة')
                        .setDescription(middlemanSystemConfigObject.insideTicketDescription || 'يرجى انتظار الوسيط.')
                        .setColor(middlemanSystemConfigObject.insideTicketColor || '#f2a658');

                    const middlemanModalFieldsArray = middlemanSystemConfigObject.modalFields;
                    for (let fieldIndex = 0; fieldIndex < middlemanModalFieldsArray.length; fieldIndex++) {
                        const currentFieldConfigObject = middlemanModalFieldsArray[fieldIndex];
                        const extractedUserAnswerString = incomingInteractionObject.fields.getTextInputValue(`mm_field_${fieldIndex}`);
                        
                        // المربع الفخم (Box)
                        const boxedAnswerString = "```text\n" + extractedUserAnswerString + "\n```";
                        
                        insideMiddlemanTicketEmbedObject.addFields({
                            name: currentFieldConfigObject.label,
                            value: boxedAnswerString,
                            inline: false
                        });
                    }

                    const ticketControlTopActionRowObject = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ticket_add_user').setLabel('Add User').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger)
                    );
                    
                    const ticketControlBottomActionRowObject = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ticket_delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
                    );

                    let externalMentionMessageString = `**Welcome <@${interactingUserDiscordIdString}>**\n`;
                    if (assignedMiddlemanRoleIdString) {
                        externalMentionMessageString += `**Reason: تذكرة وساطة** | <@&${assignedMiddlemanRoleIdString}>`;
                    } else {
                        externalMentionMessageString += `**Reason: تذكرة وساطة**`;
                    }

                    await createdMiddlemanTicketChannelObject.send({
                        content: externalMentionMessageString,
                        embeds: [insideMiddlemanTicketEmbedObject],
                        components: [ticketControlTopActionRowObject, ticketControlBottomActionRowObject]
                    });

                    await incomingInteractionObject.editReply({ content: `**✅ تم فتح تذكرة الوساطة بنجاح: <#${createdMiddlemanTicketChannelObject.id}>**` });
                } catch (e) { console.error(e); }
                return;
            }

            // -----------------------------------------------------------------------------------------
            // 🎟️ إنشاء تذكرة الدعم العادية (ووضع البيانات في Box)
            // -----------------------------------------------------------------------------------------
            if (submittedModalCustomIdString.startsWith('submit_normal_ticket_')) {
                await incomingInteractionObject.deferReply({ ephemeral: true });

                const extractedPanelIdString = submittedModalCustomIdString.replace('submit_normal_ticket_', '');
                let targetTicketPanelConfigObject = null;
                let targetTicketButtonConfigObject = null;

                const allTicketPanelsArray = activeGuildConfigurationDocument.ticketPanels;
                for (let panelIndex = 0; panelIndex < allTicketPanelsArray.length; panelIndex++) {
                    const currentPanelObject = allTicketPanelsArray[panelIndex];
                    for (let buttonIndex = 0; buttonIndex < currentPanelObject.buttons.length; buttonIndex++) {
                        if (currentPanelObject.buttons[buttonIndex].id === extractedPanelIdString) {
                            targetTicketPanelConfigObject = currentPanelObject;
                            targetTicketButtonConfigObject = currentPanelObject.buttons[buttonIndex];
                            break;
                        }
                    }
                    if (targetTicketPanelConfigObject !== null) break;
                }

                if (targetTicketButtonConfigObject !== null) {
                    activeGuildConfigurationDocument.ticketCount += 1;
                    await activeGuildConfigurationDocument.save();
                    
                    const ticketSequenceNumberInt = activeGuildConfigurationDocument.ticketCount;
                    const formattedTicketSequenceString = ticketSequenceNumberInt.toString().padStart(4, '0');
                    const normalTicketChannelNameString = `ticket-${formattedTicketSequenceString}`;
                    const interactingUserDiscordIdString = incomingInteractionObject.user.id;

                    const channelPermissionOverwritesArray = [
                        { id: targetDiscordGuildObject.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interactingUserDiscordIdString, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        { id: discordClientObject.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
                    ];

                    const assignedAdminRoleIdString = activeGuildConfigurationDocument.roles.adminRoleId;
                    if (assignedAdminRoleIdString) {
                        channelPermissionOverwritesArray.push({
                            id: assignedAdminRoleIdString, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                        });
                    }

                    try {
                        const createdNormalTicketChannelObject = await targetDiscordGuildObject.channels.create({
                            name: normalTicketChannelNameString,
                            type: ChannelType.GuildText,
                            parent: targetTicketPanelConfigObject.categoryId || null,
                            permissionOverwrites: channelPermissionOverwritesArray,
                            topic: `${interactingUserDiscordIdString}_normal_${ticketSequenceNumberInt}_open_none`
                        });

                        const insideNormalTicketEmbedObject = new EmbedBuilder()
                            .setTitle(targetTicketButtonConfigObject.insideEmbedTitle || 'تذكرة دعم فني')
                            .setDescription(targetTicketButtonConfigObject.insideEmbedDesc || 'فريق الدعم سيقوم بالرد عليك قريباً.')
                            .setColor(targetTicketButtonConfigObject.insideEmbedColor || '#2b2d31');

                        const normalModalFieldsArray = targetTicketButtonConfigObject.modalFields;
                        for (let fieldIndex = 0; fieldIndex < normalModalFieldsArray.length; fieldIndex++) {
                            const currentFieldConfigObject = normalModalFieldsArray[fieldIndex];
                            const extractedUserAnswerString = incomingInteractionObject.fields.getTextInputValue(`normal_field_${fieldIndex}`);
                            
                            // المربع الفخم (Box)
                            const boxedAnswerString = "```text\n" + extractedUserAnswerString + "\n```";
                            
                            insideNormalTicketEmbedObject.addFields({
                                name: currentFieldConfigObject.label,
                                value: boxedAnswerString,
                                inline: false
                            });
                        }

                        const normalTicketControlTopActionRowObject = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('ticket_add_user').setLabel('Add User').setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success),
                            new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger)
                        );
                        
                        const normalTicketControlBottomActionRowObject = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('ticket_delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
                        );

                        let externalMentionMessageString = `**Welcome <@${interactingUserDiscordIdString}>**\n`;
                        if (assignedAdminRoleIdString) {
                            externalMentionMessageString += `**Reason: ${targetTicketButtonConfigObject.label}** | <@&${assignedAdminRoleIdString}>`;
                        } else {
                            externalMentionMessageString += `**Reason: ${targetTicketButtonConfigObject.label}**`;
                        }

                        await createdNormalTicketChannelObject.send({
                            content: externalMentionMessageString,
                            embeds: [insideNormalTicketEmbedObject],
                            components: [normalTicketControlTopActionRowObject, normalTicketControlBottomActionRowObject]
                        });

                        await incomingInteractionObject.editReply({ content: `**✅ تم فتح تذكرة الدعم بنجاح: <#${createdNormalTicketChannelObject.id}>**` });
                    } catch (e) { console.error(e); }
                }
                return;
            }

            // -----------------------------------------------------------------------------------------
            // ➕ استقبال نافذة إضافة عضو
            // -----------------------------------------------------------------------------------------
            if (submittedModalCustomIdString === 'modal_add_user_submit') {
                await incomingInteractionObject.deferReply({ ephemeral: true });
                const providedUserIdString = incomingInteractionObject.fields.getTextInputValue('user_id_input');
                const currentTicketChannelObject = incomingInteractionObject.channel;

                try {
                    const targetUserToAddObject = await targetDiscordGuildObject.members.fetch(providedUserIdString);
                    if (!targetUserToAddObject) return await incomingInteractionObject.editReply({ content: '**❌ لم أتمكن من العثور على العضو.**' });

                    await currentTicketChannelObject.permissionOverwrites.edit(providedUserIdString, {
                        ViewChannel: true, SendMessages: true, ReadMessageHistory: true
                    });

                    await currentTicketChannelObject.send(`**✅ تم إضافة <@${providedUserIdString}> إلى التذكرة.**`);
                    await incomingInteractionObject.editReply({ content: '**✅ تمت الإضافة بنجاح.**' });
                } catch (e) { await incomingInteractionObject.editReply({ content: '**❌ فشلت العملية.**' }); }
                return;
            }

            // -----------------------------------------------------------------------------------------
            // 🗑️ استقبال نافذة الحذف مع السبب
            // -----------------------------------------------------------------------------------------
            if (submittedModalCustomIdString === 'modal_delete_reason_submit') {
                await incomingInteractionObject.deferReply({ ephemeral: false });
                const providedDeleteReasonString = incomingInteractionObject.fields.getTextInputValue('delete_reason_input');
                const currentTicketChannelObject = incomingInteractionObject.channel;

                await incomingInteractionObject.editReply({ content: `**🗑️ سيتم حذف التذكرة بعد 5 ثوانٍ.**\n**السبب:** ${providedDeleteReasonString}` });

                setTimeout(async () => {
                    try { await currentTicketChannelObject.delete(`حذف بواسطة ${incomingInteractionObject.user.tag} - السبب: ${providedDeleteReasonString}`); } catch (e) {}
                }, 5000);
                return;
            }
        }
    }
};
