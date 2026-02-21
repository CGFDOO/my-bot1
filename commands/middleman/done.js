// =========================================================================================================
// 🛡️ أمر إنهاء الوساطة وتقييم الوسيط (MIDDLEMAN DONE COMMAND - ENTERPRISE EDITION)
// ---------------------------------------------------------------------------------------------------------
// المسار: commands/middleman/done.js
// الوظيفة: 
// 1. التحقق من أن التذكرة هي "تذكرة وساطة" (Middleman Ticket) وليست تذكرة دعم فني.
// 2. التحقق من صلاحيات العضو (هل يمتلك رتبة وساطة أو إدارة عليا).
// 3. إرسال طلب تقييم الوسيط في رسالة خاصة (DM) للعميل.
// 4. سحب الصلاحيات من العميل وتغيير اسم الروم إلى (closed-XXXX).
// 5. إرسال لوحة التحكم (Control Panel) في التذكرة للإدارة (إعادة فتح، حذف).
// =========================================================================================================

const discordLibrary = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = discordLibrary;

module.exports = {
    name: 'done', // اسم الأمر
    aliases: ['إنهاء', 'تقييم'], // اختصارات للأمر إن وجدت
    
    // الدالة الرئيسية لتنفيذ الأمر
    async execute(incomingMessageObject, commandArgumentsArray, discordClientObject, activeGuildConfigurationDocument) {
        
        // =========================================================================================================
        // 🛡️ 1. فحوصات الأمان وصلاحيات الاستخدام (Security & Permissions Validations)
        // =========================================================================================================
        
        const currentExecutedChannelObject = incomingMessageObject.channel;
        const currentExecutedChannelNameString = currentExecutedChannelObject.name;

        // التحقق من أن الأمر يُنفذ داخل تذكرة (يبدأ بـ ticket- أو claim-)
        const isChannelATicketBoolean = currentExecutedChannelNameString.startsWith('ticket-') || currentExecutedChannelNameString.startsWith('claim-');
        
        if (isChannelATicketBoolean === false) {
            const notInTicketMessageContentString = '**❌ عذراً، هذا الأمر مخصص للاستخدام داخل تذاكر الوساطة فقط.**';
            try { 
                return await incomingMessageObject.reply({ content: notInTicketMessageContentString }); 
            } catch (replyException) { return; }
        }

        // التحقق من صلاحيات العضو (هل هو وسيط؟)
        const allowedMiddlemanRolesArray = [
            activeGuildConfigurationDocument.roles.middlemanRoleId,
            ...(activeGuildConfigurationDocument.roles.highMiddlemanRoles || [])
        ];
        
        let doesMemberHaveMiddlemanPermissionBoolean = false;
        const executingMemberPermissionsObject = incomingMessageObject.member.permissions;
        
        // الإدارة العليا تتخطى الفحص
        if (executingMemberPermissionsObject.has(PermissionFlagsBits.Administrator) === true) {
            doesMemberHaveMiddlemanPermissionBoolean = true;
        } else {
            const executingMemberAssignedRolesCache = incomingMessageObject.member.roles.cache;
            for (let roleIndexNumber = 0; roleIndexNumber < allowedMiddlemanRolesArray.length; roleIndexNumber++) {
                const requiredMiddlemanRoleIdString = allowedMiddlemanRolesArray[roleIndexNumber];
                if (requiredMiddlemanRoleIdString && executingMemberAssignedRolesCache.has(requiredMiddlemanRoleIdString) === true) {
                    doesMemberHaveMiddlemanPermissionBoolean = true;
                    break;
                }
            }
        }
        
        if (doesMemberHaveMiddlemanPermissionBoolean === false) {
            const accessDeniedMessageContentString = '**❌ عذراً، لا تمتلك صلاحية (الوساطة) لاستخدام هذا الأمر.**';
            try { 
                return await incomingMessageObject.reply({ content: accessDeniedMessageContentString }); 
            } catch (replyException) { return; }
        }

        // =========================================================================================================
        // 🎟️ 2. فحص نوع التذكرة واستخراج بيانات العميل (Ticket Type & Owner Extraction)
        // =========================================================================================================
        
        const currentTicketChannelTopicString = currentExecutedChannelObject.topic;
        let targetTicketOwnerDiscordIdString = null;
        let currentTicketTypeString = null;
        
        // التوبيك محفوظ بهذا الشكل: UserID_TicketType_SequenceNumber_Status_CloserID
        if (currentTicketChannelTopicString) {
            const topicExtractedDataPartsArray = currentTicketChannelTopicString.split('_');
            targetTicketOwnerDiscordIdString = topicExtractedDataPartsArray[0];
            currentTicketTypeString = topicExtractedDataPartsArray[1];
        }
        
        // التحقق من أن التذكرة هي تذكرة "وساطة" وليست "دعم عادي"
        if (currentTicketTypeString !== 'middleman') {
            const notMiddlemanTicketMessageString = '**❌ هذا الأمر مخصص لتذاكر "الوساطة" فقط. تذاكر الدعم يتم إغلاقها من زر (Close).**';
            try { 
                return await incomingMessageObject.reply({ content: notMiddlemanTicketMessageString }); 
            } catch (replyException) { return; }
        }

        if (!targetTicketOwnerDiscordIdString || targetTicketOwnerDiscordIdString === 'none') {
            const cannotFindOwnerMessageString = '**❌ لم أتمكن من العثور على مالك هذه التذكرة في السجلات لإرسال التقييم.**';
            try { 
                return await incomingMessageObject.reply({ content: cannotFindOwnerMessageString }); 
            } catch (replyException) { return; }
        }

        // =========================================================================================================
        // 🔒 3. إرسال التقييم في الخاص (Sending Middleman Rating via DM)
        // =========================================================================================================
        
        const closingTicketInitMessageString = '**🔒 جاري إنهاء الوساطة، سحب الصلاحيات، وإرسال التقييم للعميل...**';
        try { 
            await incomingMessageObject.reply({ content: closingTicketInitMessageString }); 
        } catch (replyException) {}

        const operatingDiscordGuildObject = incomingMessageObject.guild;
        const dynamicallyFetchedGuildNameString = operatingDiscordGuildObject.name;
        const interactingMiddlemanUserDiscordIdString = incomingMessageObject.author.id;

        const doesGuildHaveMiddlemanRatingChannelBoolean = (activeGuildConfigurationDocument.ratings.middlemanLogChannelId !== null);
        
        // إذا كان نظام التقييم مفعلاً في الداشبورد
        if (doesGuildHaveMiddlemanRatingChannelBoolean === true) {
            try {
                // جلب كائن العميل من السيرفر
                const targetClientDiscordMemberObject = await operatingDiscordGuildObject.members.fetch(targetTicketOwnerDiscordIdString);
                
                // بناء إيمبد التقييم الفخم للوساطة
                const middlemanRatingRequestEmbedObject = new EmbedBuilder();
                
                const ratingEmbedTitleTextString = 'تقييم الوسيط (MiddleMan Review)';
                middlemanRatingRequestEmbedObject.setTitle(ratingEmbedTitleTextString);
                
                let customRatingEmbedDescriptionTextBuilderString = `شكراً لتعاملك معنا في سيرفر **${dynamicallyFetchedGuildNameString}**\n\n`;
                customRatingEmbedDescriptionTextBuilderString += `يرجى تقييم مستوى الأمان والسرعة في المعاملة التي تمت مع الوسيط <@${interactingMiddlemanUserDiscordIdString}>.`;
                middlemanRatingRequestEmbedObject.setDescription(customRatingEmbedDescriptionTextBuilderString);
                
                let dashboardConfiguredMiddlemanColorHexCode = activeGuildConfigurationDocument.ratings.middlemanEmbedColor;
                if (!dashboardConfiguredMiddlemanColorHexCode) {
                    dashboardConfiguredMiddlemanColorHexCode = '#f2a658'; // البرتقالي الافتراضي للوساطة
                }
                middlemanRatingRequestEmbedObject.setColor(dashboardConfiguredMiddlemanColorHexCode);
                
                const dynamicGuildIconUrlForRatingEmbedString = operatingDiscordGuildObject.iconURL({ dynamic: true });
                middlemanRatingRequestEmbedObject.setFooter({ 
                    text: dynamicallyFetchedGuildNameString, 
                    iconURL: dynamicGuildIconUrlForRatingEmbedString 
                });
                middlemanRatingRequestEmbedObject.setTimestamp();
                
                // بناء أزرار النجوم للتقييم
                const ratingStarsActionRowButtonsContainerObject = new ActionRowBuilder();
                const currentGuildIdStringForRatingAction = operatingDiscordGuildObject.id;
                
                const star1ActionButtonObject = new ButtonBuilder().setCustomId(`rate_mediator_1_${interactingMiddlemanUserDiscordIdString}_${currentGuildIdStringForRatingAction}`).setLabel('⭐').setStyle(ButtonStyle.Secondary);
                const star2ActionButtonObject = new ButtonBuilder().setCustomId(`rate_mediator_2_${interactingMiddlemanUserDiscordIdString}_${currentGuildIdStringForRatingAction}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary);
                const star3ActionButtonObject = new ButtonBuilder().setCustomId(`rate_mediator_3_${interactingMiddlemanUserDiscordIdString}_${currentGuildIdStringForRatingAction}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                const star4ActionButtonObject = new ButtonBuilder().setCustomId(`rate_mediator_4_${interactingMiddlemanUserDiscordIdString}_${currentGuildIdStringForRatingAction}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                const star5ActionButtonObject = new ButtonBuilder().setCustomId(`rate_mediator_5_${interactingMiddlemanUserDiscordIdString}_${currentGuildIdStringForRatingAction}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                
                ratingStarsActionRowButtonsContainerObject.addComponents(star1ActionButtonObject, star2ActionButtonObject, star3ActionButtonObject, star4ActionButtonObject, star5ActionButtonObject);
                
                // إرسال التقييم للعميل في الخاص
                await targetClientDiscordMemberObject.send({ 
                    embeds: [middlemanRatingRequestEmbedObject], 
                    components: [ratingStarsActionRowButtonsContainerObject] 
                });
                
            } catch (clientDirectMessageClosedException) {
                console.log("[COMMAND EXECUTION WARNING] Could not send Middleman Rating. Client DM is closed.");
            }
        }

        // =========================================================================================================
        // 🔒 4. عملية الإغلاق وإرسال لوحة التحكم (Closing Process & Control Panel)
        // =========================================================================================================
        
        // استخراج رقم التذكرة لتغيير الاسم
        const channelNameSplitIntoPartsArray = currentExecutedChannelNameString.split('-');
        let ticketSequenceIdentifierFoundString = channelNameSplitIntoPartsArray[1];
        if (!ticketSequenceIdentifierFoundString) {
            ticketSequenceIdentifierFoundString = '0000';
        }
        
        const officiallyClosedChannelRenamedString = `closed-${ticketSequenceIdentifierFoundString}`;
        
        try { 
            // تغيير اسم الروم إلى closed
            await currentExecutedChannelObject.setName(officiallyClosedChannelRenamedString); 
        } catch (channelRenameException) {}
        
        try {
            // سحب صلاحية الرؤية والكتابة من العميل
            await currentExecutedChannelObject.permissionOverwrites.edit(targetTicketOwnerDiscordIdString, { 
                SendMessages: false, 
                ViewChannel: false 
            });
        } catch (permissionsUpdateException) {}
        
        // تحديث التوبيك لتسجيل من قام بالإغلاق
        if (currentTicketChannelTopicString) {
            const topicDataSeparatedPartsArray = currentTicketChannelTopicString.split('_');
            while(topicDataSeparatedPartsArray.length < 5) {
                topicDataSeparatedPartsArray.push('none');
            }
            topicDataSeparatedPartsArray[3] = 'closed'; // الحالة
            topicDataSeparatedPartsArray[4] = interactingMiddlemanUserDiscordIdString; // الأيدي الخاص بالوسيط المغلق
            
            const fullyUpdatedTopicRejoinedString = topicDataSeparatedPartsArray.join('_');
            try { 
                await currentExecutedChannelObject.setTopic(fullyUpdatedTopicRejoinedString); 
            } catch (topicUpdateException) {}
        }
        
        // ---------------------------------------------------------
        // 🎛️ بناء لوحة تحكم التذكرة المغلقة (Control Panel)
        // ---------------------------------------------------------
        const officiallyClosedTicketControlPanelEmbedObject = new EmbedBuilder();
        
        const controlPanelFinalTitleString = 'Ticket control';
        officiallyClosedTicketControlPanelEmbedObject.setTitle(controlPanelFinalTitleString);
        
        const controlPanelFinalDescriptionString = `Closed By: <@${interactingMiddlemanUserDiscordIdString}>\n(${interactingMiddlemanUserDiscordIdString})`;
        officiallyClosedTicketControlPanelEmbedObject.setDescription(controlPanelFinalDescriptionString);
        
        let dashboardConfiguredCloseEmbedThemeColorHexCode = activeGuildConfigurationDocument.ticketControls.controlPanelColor;
        if (!dashboardConfiguredCloseEmbedThemeColorHexCode) {
            dashboardConfiguredCloseEmbedThemeColorHexCode = '#2b2d31';
        }
        officiallyClosedTicketControlPanelEmbedObject.setColor(dashboardConfiguredCloseEmbedThemeColorHexCode);
        
        const controlPanelTopActionRowContainerObject = new ActionRowBuilder();
        
        // الأزرار كما في الصور (الإنجليزية)
        const reopenClosedTicketActionButtonObject = new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen ticket').setStyle(ButtonStyle.Secondary);
        const directDeleteClosedTicketActionButtonObject = new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete ticket').setStyle(ButtonStyle.Danger);
        
        controlPanelTopActionRowContainerObject.addComponents(reopenClosedTicketActionButtonObject, directDeleteClosedTicketActionButtonObject);
        
        const controlPanelBottomActionRowContainerObject = new ActionRowBuilder();
        const deleteClosedTicketWithReasonActionButtonObject = new ButtonBuilder().setCustomId('ticket_delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger);
        
        controlPanelBottomActionRowContainerObject.addComponents(deleteClosedTicketWithReasonActionButtonObject);
        
        try {
            await currentExecutedChannelObject.send({ 
                embeds: [officiallyClosedTicketControlPanelEmbedObject], 
                components: [controlPanelTopActionRowContainerObject, controlPanelBottomActionRowContainerObject] 
            });
        } catch (sendControlPanelException) {
            console.error('[COMMAND EXECUTION ERROR] Failed to send Control Panel:', sendControlPanelException);
        }
        
        // حذف رسالة الأمر نفسه لتنظيف الشات
        try {
            await incomingMessageObject.delete();
        } catch (deleteCommandMessageException) {}

        return; // نهاية التنفيذ الناجح
    }
};
