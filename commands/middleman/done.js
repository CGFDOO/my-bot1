// =========================================================================================================
// 🛡️ أمر تقييم الوسيط (MIDDLEMAN DONE COMMAND - NO TICKET CLOSING)
// ---------------------------------------------------------------------------------------------------------
// المسار: commands/middleman/done.js
// الوظيفة: التحقق من الرتب (من الداشبورد)، إرسال التقييم في الخاص، وترك التذكرة مفتوحة بالكامل.
// =========================================================================================================

const discordLibrary = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = discordLibrary;

module.exports = {
    name: 'done', 
    aliases: ['إنهاء', 'تقييم'], 
    
    async execute(incomingMessageObject, commandArgumentsArray, discordClientObject, activeGuildConfigurationDocument) {
        
        // =========================================================================================================
        // 🛡️ 1. فحوصات نوع التذكرة والأمان
        // =========================================================================================================
        const currentExecutedChannelObject = incomingMessageObject.channel;
        const currentExecutedChannelNameString = currentExecutedChannelObject.name;

        // التحقق من أن الأمر يُنفذ داخل تذكرة
        const isChannelATicketBoolean = currentExecutedChannelNameString.startsWith('ticket-') || currentExecutedChannelNameString.startsWith('claim-');
        
        if (isChannelATicketBoolean === false) {
            try { 
                return await incomingMessageObject.reply({ content: '**❌ عذراً، هذا الأمر مخصص للاستخدام داخل تذاكر الوساطة فقط.**' }); 
            } catch (replyException) { return; }
        }

        // =========================================================================================================
        // 👮 2. فحص الرتب المسموح لها باستخدام الأمر (من المصفوفات في الداشبورد)
        // =========================================================================================================
        const dashboardConfiguredDoneRolesArray = activeGuildConfigurationDocument.commands.doneAllowedRoles || [];
        let doesMemberHavePermissionToUseDoneBoolean = false;
        
        const executingMemberPermissionsObject = incomingMessageObject.member.permissions;
        const executingMemberRolesCacheObject = incomingMessageObject.member.roles.cache;

        if (executingMemberPermissionsObject.has(PermissionFlagsBits.Administrator) === true) {
            doesMemberHavePermissionToUseDoneBoolean = true;
        } else {
            for (let roleIndex = 0; roleIndex < dashboardConfiguredDoneRolesArray.length; roleIndex++) {
                const currentRoleIdToCheckString = dashboardConfiguredDoneRolesArray[roleIndex];
                if (currentRoleIdToCheckString && executingMemberRolesCacheObject.has(currentRoleIdToCheckString)) {
                    doesMemberHavePermissionToUseDoneBoolean = true; 
                    break;
                }
            }
            
            // دعم احتياطي (Fallback) في حال كانت المصفوفة فارغة في الداشبورد
            const fallbackMiddlemanRoleIdString = activeGuildConfigurationDocument.roles.middlemanRoleId;
            if (doesMemberHavePermissionToUseDoneBoolean === false && fallbackMiddlemanRoleIdString && executingMemberRolesCacheObject.has(fallbackMiddlemanRoleIdString)) {
                doesMemberHavePermissionToUseDoneBoolean = true;
            }
        }
        
        if (doesMemberHavePermissionToUseDoneBoolean === false) {
            try { 
                return await incomingMessageObject.reply({ content: '**❌ عذراً، لا تمتلك صلاحية لاستخدام هذا الأمر. تأكد من إعدادات الرتب.**' }); 
            } catch (replyException) { return; }
        }

        // =========================================================================================================
        // 🎟️ 3. فحص نوع التذكرة واستخراج المالك
        // =========================================================================================================
        const currentTicketChannelTopicString = currentExecutedChannelObject.topic;
        let targetTicketOwnerDiscordIdString = null;
        let currentTicketTypeString = null;
        
        if (currentTicketChannelTopicString) {
            const topicExtractedDataPartsArray = currentTicketChannelTopicString.split('_');
            targetTicketOwnerDiscordIdString = topicExtractedDataPartsArray[0];
            currentTicketTypeString = topicExtractedDataPartsArray[1];
        }
        
        if (currentTicketTypeString !== 'middleman') {
            try { 
                return await incomingMessageObject.reply({ content: '**❌ هذا الأمر لتذاكر "الوساطة" فقط. تذاكر الدعم يتم إغلاقها من زر (Close).**' }); 
            } catch (replyException) { return; }
        }

        if (!targetTicketOwnerDiscordIdString || targetTicketOwnerDiscordIdString === 'none') {
            try { 
                return await incomingMessageObject.reply({ content: '**❌ لم أتمكن من العثور على مالك التذكرة في السجلات لإرسال التقييم.**' }); 
            } catch (replyException) { return; }
        }

        // =========================================================================================================
        // ⭐ 4. إرسال التقييم للعميل (بدون سحب الصلاحيات أو إغلاق التكت)
        // =========================================================================================================
        try { 
            await incomingMessageObject.reply({ content: '**⏳ جاري إرسال طلب التقييم للعميل (التذكرة ستظل مفتوحة ولن يتم إغلاقها)...**' }); 
        } catch (replyException) {}

        const operatingDiscordGuildObject = incomingMessageObject.guild;
        const interactingMiddlemanUserIdString = incomingMessageObject.author.id;
        const doesGuildHaveMiddlemanRatingChannelBoolean = (activeGuildConfigurationDocument.ratings.middlemanLogChannelId !== null);

        if (doesGuildHaveMiddlemanRatingChannelBoolean === true) {
            try {
                const targetClientDiscordMemberObject = await operatingDiscordGuildObject.members.fetch(targetTicketOwnerDiscordIdString);
                
                const middlemanRatingRequestEmbedObject = new EmbedBuilder();
                middlemanRatingRequestEmbedObject.setTitle('تقييم الوسيط (MiddleMan Review)');
                
                let ratingDescriptionString = `شكراً لتعاملك معنا في سيرفر **${operatingDiscordGuildObject.name}**\n\n`;
                ratingDescriptionString += `يرجى تقييم مستوى الأمان والسرعة في المعاملة التي تمت مع الوسيط <@${interactingMiddlemanUserIdString}>.`;
                middlemanRatingRequestEmbedObject.setDescription(ratingDescriptionString);
                
                middlemanRatingRequestEmbedObject.setColor(activeGuildConfigurationDocument.ratings.middlemanEmbedColor || '#f2a658');
                middlemanRatingRequestEmbedObject.setFooter({ text: operatingDiscordGuildObject.name, iconURL: operatingDiscordGuildObject.iconURL({ dynamic: true }) });
                middlemanRatingRequestEmbedObject.setTimestamp();
                
                const ratingButtonsActionRowObject = new ActionRowBuilder();
                const star1Button = new ButtonBuilder().setCustomId(`rate_mediator_1_${interactingMiddlemanUserIdString}_${operatingDiscordGuildObject.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary);
                const star2Button = new ButtonBuilder().setCustomId(`rate_mediator_2_${interactingMiddlemanUserIdString}_${operatingDiscordGuildObject.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary);
                const star3Button = new ButtonBuilder().setCustomId(`rate_mediator_3_${interactingMiddlemanUserIdString}_${operatingDiscordGuildObject.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                const star4Button = new ButtonBuilder().setCustomId(`rate_mediator_4_${interactingMiddlemanUserIdString}_${operatingDiscordGuildObject.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                const star5Button = new ButtonBuilder().setCustomId(`rate_mediator_5_${interactingMiddlemanUserIdString}_${operatingDiscordGuildObject.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                
                ratingButtonsActionRowObject.addComponents(star1Button, star2Button, star3Button, star4Button, star5Button);
                
                await targetClientDiscordMemberObject.send({ embeds: [middlemanRatingRequestEmbedObject], components: [ratingButtonsActionRowObject] });
                
                await incomingMessageObject.channel.send('**✅ تم إرسال رسالة التقييم للعميل في الخاص بنجاح.**');
                
            } catch (clientDirectMessageClosedException) {
                await incomingMessageObject.channel.send('**⚠️ العميل يغلق الرسائل الخاصة، لم أتمكن من إرسال التقييم.**');
            }
        }
    }
};
