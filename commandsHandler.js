// =========================================================================================================
// 🚀 نظام الأوامر الشامل (UNIVERSAL COMMANDS HANDLER - EXTREME VERBOSITY EDITION)
// تم بناء هذا النظام ليكون عاماً (Public Bot) لجميع السيرفرات.
// الكود مفرود بالكامل (Fully Expanded) لضمان عدم حدوث أي تداخل ولتسهيل الصيانة والعمل تحت الضغط.
// =========================================================================================================

// =========================================================================================================
// 📦 1. المكاتب الأساسية (Core Dependencies)
// =========================================================================================================
const discordLibrary = require('discord.js');

const EmbedBuilder = discordLibrary.EmbedBuilder;
const ActionRowBuilder = discordLibrary.ActionRowBuilder;
const ButtonBuilder = discordLibrary.ButtonBuilder;
const ButtonStyle = discordLibrary.ButtonStyle;
const PermissionFlagsBits = discordLibrary.PermissionFlagsBits;

// استدعاء قاعدة البيانات
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    
    // =========================================================================================================
    // 🎧 الحدث الرئيسي لقراءة الرسائل في السيرفر (Message Create)
    // =========================================================================================================
    client.on('messageCreate', async (message) => {
        
        // -----------------------------------------------------------------------------------------
        // 🛡️ فحوصات الأمان الأساسية (Basic Security Checks)
        // -----------------------------------------------------------------------------------------
        
        // 1. هل مرسل الرسالة بوت؟
        const isMessageAuthorBotBoolean = message.author.bot;
        if (isMessageAuthorBotBoolean === true) {
            return; // تجاهل البوتات فوراً
        }

        // 2. هل الرسالة داخل سيرفر أم في الخاص؟
        const currentGuildObject = message.guild;
        if (!currentGuildObject) {
            return; // تجاهل رسائل الخاص
        }

        // 3. هل العضو متاح ككائن برمجي؟
        const currentMemberObject = message.member;
        if (!currentMemberObject) {
            return;
        }

        // -----------------------------------------------------------------------------------------
        // 📥 جلب إعدادات السيرفر من قاعدة البيانات (Database Fetch)
        // -----------------------------------------------------------------------------------------
        const currentGuildIdString = currentGuildObject.id;
        let activeGuildConfigDocument = null;
        
        try {
            activeGuildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        } catch (databaseFetchException) {
            console.log("[COMMANDS HANDLER] Exception fetching DB for guild: ", databaseFetchException);
            return;
        }
        
        // إذا لم يكن السيرفر مسجلاً في الداشبورد، نوقف التنفيذ
        if (!activeGuildConfigDocument) {
            return; 
        }

        // =========================================================================================================
        // 💬 نظام الردود التلقائية (Dynamic Auto Responders)
        // =========================================================================================================
        const configuredAutoRespondersArray = activeGuildConfigDocument.autoResponders;
        const hasAutoRespondersBoolean = (configuredAutoRespondersArray && configuredAutoRespondersArray.length > 0);
        
        if (hasAutoRespondersBoolean === true) {
            
            for (let responderIndex = 0; responderIndex < configuredAutoRespondersArray.length; responderIndex++) {
                
                const currentResponderObject = configuredAutoRespondersArray[responderIndex];
                
                const rawMessageContentTextString = message.content;
                const targetWordToMatchString = currentResponderObject.word;
                
                const doesMessageContainTargetWordBoolean = rawMessageContentTextString.includes(targetWordToMatchString);
                
                if (doesMessageContainTargetWordBoolean === true) {
                    
                    const configuredReplyTextString = currentResponderObject.reply;
                    const beautifullyFormattedReplyString = `**${configuredReplyTextString}**`;
                    
                    try {
                        await message.reply({ content: beautifullyFormattedReplyString });
                    } catch (autoResponderReplyException) {
                        // التجاهل بأمان في حال قام العضو بمسح رسالته بسرعة
                    }
                }
            }
        }

        // =========================================================================================================
        // ⚙️ معالجة الأوامر والبريفكس (Prefix Parsing & Processing)
        // =========================================================================================================
        let configuredGuildPrefixString = activeGuildConfigDocument.prefix;
        
        // وضع بريفكس افتراضي لتجنب الأخطاء
        if (!configuredGuildPrefixString || configuredGuildPrefixString.trim() === '') {
            configuredGuildPrefixString = '!'; 
        }
        
        const rawMessageContentForPrefixCheckString = message.content;
        const doesMessageStartWithPrefixBoolean = rawMessageContentForPrefixCheckString.startsWith(configuredGuildPrefixString);
        
        if (doesMessageStartWithPrefixBoolean === false) {
            return; // إنهاء التنفيذ مبكراً إذا لم تكن الرسالة أمراً
        }

        // قص البريفكس واستخراج الأمر
        const prefixLengthNumber = configuredGuildPrefixString.length;
        const messageContentWithoutPrefixString = rawMessageContentForPrefixCheckString.slice(prefixLengthNumber);
        
        const trimmedMessageContentWithoutPrefixString = messageContentWithoutPrefixString.trim();
        const extractedCommandArgumentsArray = trimmedMessageContentWithoutPrefixString.split(/ +/);
        
        const rawExtractedCommandNameString = extractedCommandArgumentsArray.shift();
        
        if (!rawExtractedCommandNameString) {
            return;
        }
        
        const lowerCaseExtractedCommandNameString = rawExtractedCommandNameString.toLowerCase();
        
        // دمج البريفكس مع الأمر لتسهيل المطابقة اللاحقة (مثال: !come)
        const fullExecutedCommandWithPrefixString = configuredGuildPrefixString + lowerCaseExtractedCommandNameString; 

        // =========================================================================================================
        // 🛠️ دالة التحقق من الصلاحيات الهرمية الشاملة (Permission Validator Helper)
        // =========================================================================================================
        const checkUserRolePermissionFunction = (allowedRolesIdArray) => {
            
            const commandExecutingMemberObject = message.member;
            const commandExecutingMemberPermissionsObject = commandExecutingMemberObject.permissions;
            
            // 1. تخطي جميع الشروط إذا كان يمتلك Administrator
            const hasAdministratorOverridePermissionBoolean = commandExecutingMemberPermissionsObject.has(PermissionFlagsBits.Administrator);
            if (hasAdministratorOverridePermissionBoolean === true) {
                return true; 
            }
            
            // 2. إذا لم يتم تسجيل رتب في الداشبورد، نكتفي بالـ Administrator
            const isAllowedRolesArrayEmptyBoolean = (!allowedRolesIdArray || allowedRolesIdArray.length === 0);
            if (isAllowedRolesArrayEmptyBoolean === true) {
                return false; 
            }
            
            // 3. فحص الرتبة رتبة
            const memberAssignedRolesCacheManager = commandExecutingMemberObject.roles.cache;
            
            for (let roleIndex = 0; roleIndex < allowedRolesIdArray.length; roleIndex++) {
                
                const targetRequiredRoleIdString = allowedRolesIdArray[roleIndex];
                const doesMemberHaveThisSpecificRoleBoolean = memberAssignedRolesCacheManager.has(targetRequiredRoleIdString);
                
                if (doesMemberHaveThisSpecificRoleBoolean === true) {
                    return true;
                }
            }
            
            return false; 
        };

        // =========================================================================================================
        // 📢 1. أمر الاستدعاء الفخم (Dynamic Summon Command - !come)
        // =========================================================================================================
        let dashboardConfiguredComeCommandString = activeGuildConfigDocument.cmdCome;
        
        if (!dashboardConfiguredComeCommandString) {
            dashboardConfiguredComeCommandString = `${configuredGuildPrefixString}come`;
        }

        const isComeCommandExecutedBoolean = (fullExecutedCommandWithPrefixString === dashboardConfiguredComeCommandString);
        
        if (isComeCommandExecutedBoolean === true) {
            
            // 1. فحص الصلاحيات
            const allowedComeRolesFromDashboardArray = activeGuildConfigDocument.cmdComeRoles;
            const hasPermissionToUseComeCommandBoolean = checkUserRolePermissionFunction(allowedComeRolesFromDashboardArray);
            
            if (hasPermissionToUseComeCommandBoolean === false) {
                const noPermissionMessageContentString = '**❌ عذراً، لا تمتلك صلاحية لاستخدام أمر الاستدعاء.**';
                try { 
                    await message.reply(noPermissionMessageContentString); 
                } catch (noPermReplyException) {}
                return;
            }
            
            // 2. محاولة جلب العضو المستهدف
            const messageMentionsMembersCollection = message.mentions.members;
            let targetSummonedUserObject = messageMentionsMembersCollection.first();
            
            if (!targetSummonedUserObject) {
                const providedFirstArgumentUserIdString = extractedCommandArgumentsArray[0];
                const guildMembersCacheManager = message.guild.members.cache;
                targetSummonedUserObject = guildMembersCacheManager.get(providedFirstArgumentUserIdString);
            }
            
            if (!targetSummonedUserObject) {
                const userNotFoundMessageContentString = '**⚠️ الرجاء منشن العضو أو كتابة الأيدي الخاص به بشكل صحيح.**';
                try { 
                    await message.reply(userNotFoundMessageContentString); 
                } catch (notFoundReplyException) {}
                return;
            }

            // 3. بناء الإيمبد الفخم مطابق للصورة رقم 2
            const summonRequestEmbedObject = new EmbedBuilder();
            
            const currentGuildDynamicNameString = message.guild.name;
            const currentGuildDynamicIconUrlString = message.guild.iconURL({ dynamic: true });
            const explicitTextOutsideEmbedString = 'استدعاء عاجل! 🚨';
            
            summonRequestEmbedObject.setAuthor({ 
                name: currentGuildDynamicNameString, 
                iconURL: currentGuildDynamicIconUrlString 
            });
            
            let comprehensiveSummonDescriptionBuilderString = '';
            comprehensiveSummonDescriptionBuilderString += `🚨 **تم طلب استدعاءك!**\n`;
            comprehensiveSummonDescriptionBuilderString += `-----------------------------\n`;
            comprehensiveSummonDescriptionBuilderString += `-----------------------------\n\n`;
            comprehensiveSummonDescriptionBuilderString += `👋 مرحباً <@${targetSummonedUserObject.id}>!\n\n`;
            comprehensiveSummonDescriptionBuilderString += `⚠️ لقد قام طاقم الإدارة بطلب حضورك فوراً.\n\n`;
            comprehensiveSummonDescriptionBuilderString += `📍 الروم: <#${message.channel.id}>\n\n`;
            
            const targetChannelQuickLinkUrlString = `https://discord.com/channels/${message.guild.id}/${message.channel.id}`;
            comprehensiveSummonDescriptionBuilderString += `🔗 رابط سريع: [اضغط هنا للدخول](${targetChannelQuickLinkUrlString})\n\n`;
            
            comprehensiveSummonDescriptionBuilderString += `-----------------------------\n`;
            comprehensiveSummonDescriptionBuilderString += `-----------------------------`;
            
            summonRequestEmbedObject.setDescription(comprehensiveSummonDescriptionBuilderString);
            
            const darkThemeColorHexCode = '#2b2d31';
            summonRequestEmbedObject.setColor(darkThemeColorHexCode); 
            summonRequestEmbedObject.setThumbnail(currentGuildDynamicIconUrlString);
            
            summonRequestEmbedObject.setFooter({ 
                text: `${currentGuildDynamicNameString} Administration`, 
                iconURL: currentGuildDynamicIconUrlString 
            });
            
            summonRequestEmbedObject.setTimestamp();

            // 4. حذف رسالة المشرف للتنظيف
            try { 
                await message.delete(); 
            } catch (deleteSummonCommandMessageException) {}

            // 5. إرسال الإيمبد للعضو في الخاص
            try {
                await targetSummonedUserObject.send({ 
                    content: explicitTextOutsideEmbedString, 
                    embeds: [summonRequestEmbedObject] 
                });
                
                const summonSuccessReplyEmbedObject = new EmbedBuilder();
                const successNotificationTextString = `**✅ تم إرسال الاستدعاء للعضو <@${targetSummonedUserObject.id}> في الخاص بنجاح.**`;
                
                summonSuccessReplyEmbedObject.setDescription(successNotificationTextString);
                
                const successGreenColorHexCode = '#3ba55d';
                summonSuccessReplyEmbedObject.setColor(successGreenColorHexCode);
                
                await message.channel.send({ embeds: [summonSuccessReplyEmbedObject] });
                
            } catch (dmClosedOrBlockedByClientException) {
                
                // في حال غلق الخاص
                const fallbackSummonNotificationMessageString = `**❌ العضو <@${targetSummonedUserObject.id}> يغلق الرسائل الخاصة، هذا نداء له هنا:**`;
                const combinedFallbackMessageString = `${fallbackSummonNotificationMessageString}\n${explicitTextOutsideEmbedString}`;
                
                try {
                    await message.channel.send({ 
                        content: combinedFallbackMessageString, 
                        embeds: [summonRequestEmbedObject] 
                    });
                } catch (fallbackSummonSendException) {}
            }
            return; 
        }

        // =========================================================================================================
        // 🛡️ 2. أمر إغلاق تذكرة الوساطة وتقييم الوسيط (Dynamic Done Command)
        // =========================================================================================================
        let dashboardConfiguredDoneCommandString = activeGuildConfigDocument.cmdDone;
        
        if (!dashboardConfiguredDoneCommandString) {
            dashboardConfiguredDoneCommandString = `${configuredGuildPrefixString}done`;
        }
        
        const isDoneCommandExecutedBoolean = (fullExecutedCommandWithPrefixString === dashboardConfiguredDoneCommandString);
        
        if (isDoneCommandExecutedBoolean === true) {
            
            // 1. التحقق من مكان التنفيذ
            const executedChannelNameTextString = message.channel.name;
            const isChannelATicketChannelBoolean = executedChannelNameTextString.startsWith('ticket-');
            
            if (isChannelATicketChannelBoolean === false) {
                const notInTicketMessageContentString = '**❌ عذراً، هذا الأمر مخصص للاستخدام داخل تذاكر الوساطة فقط.**';
                try { 
                    await message.reply({ content: notInTicketMessageContentString }); 
                } catch(e) {}
                return;
            }

            // 2. فحص صلاحيات الوسيط
            const allowedMiddlemanRolesConfiguredArray = [
                activeGuildConfigDocument.middlemanRoleId,
                ...activeGuildConfigDocument.highMiddlemanRoles
            ];
            
            let doesMemberHaveMiddlemanPermissionBoolean = false;
            const executingMemberPermissionsDataObj = message.member.permissions;
            
            if (executingMemberPermissionsDataObj.has(PermissionFlagsBits.Administrator) === true) {
                doesMemberHaveMiddlemanPermissionBoolean = true;
            } else {
                const executingMemberAssignedRolesCache = message.member.roles.cache;
                for (let roleIndex = 0; roleIndex < allowedMiddlemanRolesConfiguredArray.length; roleIndex++) {
                    const requiredMiddlemanRoleIdString = allowedMiddlemanRolesConfiguredArray[roleIndex];
                    if (requiredMiddlemanRoleIdString && executingMemberAssignedRolesCache.has(requiredMiddlemanRoleIdString)) {
                        doesMemberHaveMiddlemanPermissionBoolean = true;
                        break;
                    }
                }
            }
            
            if (doesMemberHaveMiddlemanPermissionBoolean === false) {
                const noMiddlemanPermissionMessageString = '**❌ عذراً، لا تمتلك صلاحية (الوساطة) لاستخدام هذا الأمر.**';
                try { 
                    await message.reply({ content: noMiddlemanPermissionMessageString }); 
                } catch(e) {}
                return;
            }

            // 3. استخراج بيانات مالك التذكرة من الـ Topic
            const currentTicketChannelTopicDataString = message.channel.topic;
            let targetTicketOwnerExtractedUserIdString = null;
            
            if (currentTicketChannelTopicDataString) {
                const topicExtractedDataPartsArray = currentTicketChannelTopicDataString.split('_');
                targetTicketOwnerExtractedUserIdString = topicExtractedDataPartsArray[0];
            }
            
            const isOwnerMissingOrNoneBoolean = (!targetTicketOwnerExtractedUserIdString || targetTicketOwnerExtractedUserIdString === 'none');
            
            if (isOwnerMissingOrNoneBoolean === true) {
                const missingOwnerMessageString = '**❌ لم أتمكن من العثور على مالك هذه التذكرة في السجلات لإرسال التقييم.**';
                try { 
                    await message.reply({ content: missingOwnerMessageString }); 
                } catch(e) {}
                return;
            }

            // إرسال تنبيه البدء
            const closingInProgressMessageString = '**🔒 جاري إغلاق التذكرة وسحب الصلاحيات وإرسال التقييم للعميل...**';
            try { 
                await message.reply({ content: closingInProgressMessageString }); 
            } catch(e) {}

            const operatingDiscordGuildTargetObject = message.guild;
            const dynamicallyFetchedTargetGuildNameString = operatingDiscordGuildTargetObject.name;
            const interactingMiddlemanUserDiscordIdString = message.author.id;

            // 4. إرسال التقييم في الخاص
            const hasMiddlemanRatingLogChannelConfiguredString = activeGuildConfigDocument.middlemanRatingChannelId;
            
            if (hasMiddlemanRatingLogChannelConfiguredString) {
                try {
                    const targetClientDiscordMemberObject = await operatingDiscordGuildTargetObject.members.fetch(targetTicketOwnerExtractedUserIdString);
                    const middlemanRatingRequestEmbedObject = new EmbedBuilder();
                    
                    let customRatingEmbedDescriptionTextBuilder = `شكراً لتعاملك معنا في سيرفر **${dynamicallyFetchedTargetGuildNameString}**\n\n`;
                    customRatingEmbedDescriptionTextBuilder += `يرجى تقييم مستوى الأمان والسرعة في المعاملة التي تمت مع الوسيط <@${interactingMiddlemanUserDiscordIdString}>.`;
                    
                    const ratingEmbedTitleString = 'تقييم الوسيط (MiddleMan Review)';
                    middlemanRatingRequestEmbedObject.setTitle(ratingEmbedTitleString);
                    middlemanRatingRequestEmbedObject.setDescription(customRatingEmbedDescriptionTextBuilder);
                    
                    let dashboardConfiguredBasicRatingColorHexCode = activeGuildConfigDocument.basicRatingColor;
                    if (!dashboardConfiguredBasicRatingColorHexCode) {
                        dashboardConfiguredBasicRatingColorHexCode = '#f2a658';
                    }
                    middlemanRatingRequestEmbedObject.setColor(dashboardConfiguredBasicRatingColorHexCode);
                    
                    const dynamicGuildIconUrlForRatingEmbed = operatingDiscordGuildTargetObject.iconURL({ dynamic: true });
                    middlemanRatingRequestEmbedObject.setFooter({ 
                        text: dynamicallyFetchedTargetGuildNameString, 
                        iconURL: dynamicGuildIconUrlForRatingEmbed 
                    });
                    middlemanRatingRequestEmbedObject.setTimestamp();
                    
                    const ratingStarsActionRowButtonsContainerObject = new ActionRowBuilder();
                    const currentGuildIdStringForRatingAction = operatingDiscordGuildTargetObject.id;
                    
                    const star1ActionBtn = new ButtonBuilder().setCustomId(`rate_mediator_1_${interactingMiddlemanUserDiscordIdString}_${currentGuildIdStringForRatingAction}`).setLabel('⭐').setStyle(ButtonStyle.Secondary);
                    const star2ActionBtn = new ButtonBuilder().setCustomId(`rate_mediator_2_${interactingMiddlemanUserDiscordIdString}_${currentGuildIdStringForRatingAction}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary);
                    const star3ActionBtn = new ButtonBuilder().setCustomId(`rate_mediator_3_${interactingMiddlemanUserDiscordIdString}_${currentGuildIdStringForRatingAction}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                    const star4ActionBtn = new ButtonBuilder().setCustomId(`rate_mediator_4_${interactingMiddlemanUserDiscordIdString}_${currentGuildIdStringForRatingAction}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                    const star5ActionBtn = new ButtonBuilder().setCustomId(`rate_mediator_5_${interactingMiddlemanUserDiscordIdString}_${currentGuildIdStringForRatingAction}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                    
                    ratingStarsActionRowButtonsContainerObject.addComponents(star1ActionBtn, star2ActionBtn, star3ActionBtn, star4ActionBtn, star5ActionBtn);
                    
                    await targetClientDiscordMemberObject.send({ 
                        embeds: [middlemanRatingRequestEmbedObject], 
                        components: [ratingStarsActionRowButtonsContainerObject] 
                    });
                    
                } catch (clientDirectMessageIsClosedOrBlockedException) {
                    console.log("[COMMANDS] Could not send MM rating. DM is closed.");
                }
            }

            // 5. عملية الإغلاق
            const currentTicketChannelTargetObject = message.channel;
            const currentTicketChannelNameTextString = currentTicketChannelTargetObject.name;
            const channelNameSplitIntoPartsArray = currentTicketChannelNameTextString.split('-');
            
            let ticketSequenceIdentifierFoundString = channelNameSplitIntoPartsArray[1];
            if (!ticketSequenceIdentifierFoundString) {
                ticketSequenceIdentifierFoundString = '0';
            }
            
            const officiallyClosedChannelRenamedString = `closed-${ticketSequenceIdentifierFoundString}`;
            
            try { 
                await currentTicketChannelTargetObject.setName(officiallyClosedChannelRenamedString); 
            } catch (channelRenameException) {}
            
            try {
                await currentTicketChannelTargetObject.permissionOverwrites.edit(targetTicketOwnerExtractedUserIdString, { 
                    SendMessages: false, 
                    ViewChannel: false 
                });
            } catch (permissionsUpdateException) {}
            
            if (currentTicketChannelTopicDataString) {
                const topicDataSeparatedPartsArray = currentTicketChannelTopicDataString.split('_');
                
                while(topicDataSeparatedPartsArray.length < 6) {
                    topicDataSeparatedPartsArray.push('none');
                }
                
                topicDataSeparatedPartsArray[4] = interactingMiddlemanUserDiscordIdString; 
                
                const fullyUpdatedTopicRejoinedString = topicDataSeparatedPartsArray.join('_');
                try { 
                    await currentTicketChannelTargetObject.setTopic(fullyUpdatedTopicRejoinedString); 
                } catch (topicUpdateException) {}
            }
            
            // 6. بانل الكنترول للإدارة
            const officiallyClosedTicketControlPanelEmbedObject = new EmbedBuilder();
            
            const controlPanelFinalTitleString = 'Ticket control';
            officiallyClosedTicketControlPanelEmbedObject.setTitle(controlPanelFinalTitleString);
            
            const controlPanelFinalDescriptionString = `Closed By: <@${interactingMiddlemanUserDiscordIdString}>\n(${interactingMiddlemanUserDiscordIdString})`;
            officiallyClosedTicketControlPanelEmbedObject.setDescription(controlPanelFinalDescriptionString);
            
            let dashboardConfiguredCloseEmbedThemeColorHex = activeGuildConfigDocument.closeEmbedColor;
            if (!dashboardConfiguredCloseEmbedThemeColorHex) {
                dashboardConfiguredCloseEmbedThemeColorHex = '#2b2d31';
            }
            officiallyClosedTicketControlPanelEmbedObject.setColor(dashboardConfiguredCloseEmbedThemeColorHex);
            
            const controlPanelTopActionRowContainerObject = new ActionRowBuilder();
            
            const reopenClosedTicketActionBtnObject = new ButtonBuilder();
            reopenClosedTicketActionBtnObject.setCustomId('ticket_reopen');
            reopenClosedTicketActionBtnObject.setLabel('Reopen ticket');
            reopenClosedTicketActionBtnObject.setStyle(ButtonStyle.Secondary);
            
            const directDeleteClosedTicketActionBtnObject = new ButtonBuilder();
            directDeleteClosedTicketActionBtnObject.setCustomId('ticket_delete');
            directDeleteClosedTicketActionBtnObject.setLabel('Delete ticket');
            directDeleteClosedTicketActionBtnObject.setStyle(ButtonStyle.Danger);
            
            controlPanelTopActionRowContainerObject.addComponents(reopenClosedTicketActionBtnObject, directDeleteClosedTicketActionBtnObject);
            
            const controlPanelBottomActionRowContainerObject = new ActionRowBuilder();
            
            const deleteClosedTicketWithReasonActionBtnObject = new ButtonBuilder();
            deleteClosedTicketWithReasonActionBtnObject.setCustomId('ticket_delete_reason');
            deleteClosedTicketWithReasonActionBtnObject.setLabel('Delete With Reason');
            deleteClosedTicketWithReasonActionBtnObject.setStyle(ButtonStyle.Danger);
            
            controlPanelBottomActionRowContainerObject.addComponents(deleteClosedTicketWithReasonActionBtnObject);
            
            try {
                await currentTicketChannelTargetObject.send({ 
                    embeds: [officiallyClosedTicketControlPanelEmbedObject], 
                    components: [controlPanelTopActionRowContainerObject, controlPanelBottomActionRowContainerObject] 
                });
            } catch (sendControlPanelException) {}
            
            return;
        }

        // =========================================================================================================
        // ⚖️ 3. أمر طلب معلومات التريد وإرسال بانل المعاملة (Dynamic Trade Command)
        // =========================================================================================================
        let dashboardConfiguredTradeCommandString = activeGuildConfigDocument.cmdTrade;
        
        if (!dashboardConfiguredTradeCommandString) {
            dashboardConfiguredTradeCommandString = `${configuredGuildPrefixString}trade`;
        }
        
        const isTradeCommandExecutedBoolean = (fullExecutedCommandWithPrefixString === dashboardConfiguredTradeCommandString);
        
        if (isTradeCommandExecutedBoolean === true) {
            
            const allowedTradeMiddlemanRolesConfiguredArray = [
                activeGuildConfigDocument.middlemanRoleId,
                ...activeGuildConfigDocument.highMiddlemanRoles
            ];
            
            let doesMemberHaveTradeCommandPermissionBoolean = false;
            const commandExecutingMemberPermissionsObjectForTrade = message.member.permissions;
            
            if (commandExecutingMemberPermissionsObjectForTrade.has(PermissionFlagsBits.Administrator) === true) {
                doesMemberHaveTradeCommandPermissionBoolean = true;
            } else {
                const executingMemberAssignedRolesManagerForTrade = message.member.roles.cache;
                for (let roleIndexCount = 0; roleIndexCount < allowedTradeMiddlemanRolesConfiguredArray.length; roleIndexCount++) {
                    const requiredMmRoleIdForTradeString = allowedTradeMiddlemanRolesConfiguredArray[roleIndexCount];
                    if (requiredMmRoleIdForTradeString && executingMemberAssignedRolesManagerForTrade.has(requiredMmRoleIdForTradeString)) {
                        doesMemberHaveTradeCommandPermissionBoolean = true;
                        break;
                    }
                }
            }
            
            if (doesMemberHaveTradeCommandPermissionBoolean === false) {
                const noTradePermissionMessageString = '**❌ عذراً، لا تمتلك صلاحية لاستخدام هذا الأمر.**';
                try { 
                    await message.reply({ content: noTradePermissionMessageString }); 
                } catch(e) {}
                return;
            }

            try { 
                await message.delete(); 
            } catch (deleteTradeCommandException) {}

            const provideTradeDetailsToClientEmbedObject = new EmbedBuilder();
            
            const tradeEmbedTitleDisplayLabelString = '⚖️ تفاصيل المعاملة (Trade Details)';
            provideTradeDetailsToClientEmbedObject.setTitle(tradeEmbedTitleDisplayLabelString);
            
            let comprehensiveTradeEmbedDescriptionDisplayString = `مرحباً بك عزيزي العميل.\n`;
            comprehensiveTradeEmbedDescriptionDisplayString += `يرجى الضغط على الزر أدناه وكتابة جميع تفاصيل المعاملة بدقة (الحسابات، الأسعار، الشروط).\n\n`;
            comprehensiveTradeEmbedDescriptionDisplayString += `سيتم إرسال طلبك فوراً للإدارة العليا للموافقة عليه.`;
            
            provideTradeDetailsToClientEmbedObject.setDescription(comprehensiveTradeEmbedDescriptionDisplayString);
            
            let dashboardConfiguredTradeThemeColorHex = activeGuildConfigDocument.tradeEmbedColor;
            if (!dashboardConfiguredTradeThemeColorHex) {
                dashboardConfiguredTradeThemeColorHex = '#f2a658'; 
            }
            provideTradeDetailsToClientEmbedObject.setColor(dashboardConfiguredTradeThemeColorHex);
            
            const openTradeModalActionRowContainerUiObject = new ActionRowBuilder();
            
            const openTradeModalInteractiveButtonObject = new ButtonBuilder();
            openTradeModalInteractiveButtonObject.setCustomId('open_trade_modal'); 
            openTradeModalInteractiveButtonObject.setLabel('إدخال تفاصيل التريد 📝');
            openTradeModalInteractiveButtonObject.setStyle(ButtonStyle.Primary);
            
            openTradeModalActionRowContainerUiObject.addComponents(openTradeModalInteractiveButtonObject);
            
            try {
                await message.channel.send({ 
                    embeds: [provideTradeDetailsToClientEmbedObject], 
                    components: [openTradeModalActionRowContainerUiObject] 
                });
            } catch (sendTradePanelException) {}
            return;
        }

// ==================== نهاية الجزء الأول من ملف الأوامر ====================

              // =========================================================================================================
        // 🚨 4. حزمة الأوامر الإدارية الشاملة (ULTIMATE MODERATION COMMANDS - FULLY EXPANDED)
        // تشمل: Clear, Lock, Unlock, Ban, Unban, Timeout, Untimeout, Kick, Move, VoiceMute.
        // جميع الأوامر تعتمد على البريفكس الديناميكي لكل سيرفر.
        // =========================================================================================================
        
        // -----------------------------------------------------------------------------------------
        // 🧹 4.1. أمر مسح الشات (Clear Command - !clear)
        // -----------------------------------------------------------------------------------------
        const clearCommandTriggerString = `${configuredGuildPrefixString}clear`;
        
        if (fullExecutedCommandWithPrefixString === clearCommandTriggerString) {
            
            // التحقق من صلاحية إدارة الرسائل
            const canMemberManageMessagesBoolean = message.member.permissions.has(PermissionFlagsBits.ManageMessages);
            
            if (canMemberManageMessagesBoolean === false) {
                try { 
                    return await message.reply('**❌ لا تمتلك صلاحية مسح الرسائل (Manage Messages).**'); 
                } catch(clearNoPermException) { return; }
            }
            
            const amountToPurgeRawString = extractedCommandArgumentsArray[0];
            const amountToPurgeNumber = parseInt(amountToPurgeRawString);
            
            const isInvalidAmountBoolean = (!amountToPurgeNumber || isNaN(amountToPurgeNumber) || amountToPurgeNumber < 1 || amountToPurgeNumber > 100);
            
            if (isInvalidAmountBoolean === true) {
                try { 
                    const usageHintString = `**⚠️ يرجى كتابة عدد صحيح بين 1 و 100.**\nمثال: \`${configuredGuildPrefixString}clear 50\``;
                    return await message.reply(usageHintString); 
                } catch(clearUsageException) { return; }
            }
            
            try {
                // حذف رسالة الأمر أولاً
                await message.delete(); 
                
                // تنفيذ المسح (bulkDelete) مع تجاهل الرسائل القديمة (أكثر من 14 يوم)
                const deletedMessagesCollection = await message.channel.bulkDelete(amountToPurgeNumber, true);
                
                const clearSuccessNotificationString = `**🧹 تم مسح ${deletedMessagesCollection.size} رسالة بنجاح بواسطة <@${message.author.id}>.**`;
                const successTemporaryMessage = await message.channel.send(clearSuccessNotificationString);
                
                // حذف رسالة النجاح تلقائياً بعد 4 ثوانٍ
                setTimeout(async () => { 
                    try { 
                        await successTemporaryMessage.delete(); 
                    } catch(tempDeleteException) {} 
                }, 4000);
                
            } catch (bulkDeleteGeneralException) {
                try { 
                    await message.channel.send('**❌ حدث خطأ، قد يكون السبب وجود رسائل قديمة جداً (أكثر من 14 يوم) لا يمكنني حذفها.**'); 
                } catch(e) {}
            }
            return;
        }

        // -----------------------------------------------------------------------------------------
        // 🔒 4.2. أمر قفل الشات (Lock Command - !lock)
        // -----------------------------------------------------------------------------------------
        const lockCommandTriggerString = `${configuredGuildPrefixString}lock`;
        
        if (fullExecutedCommandWithPrefixString === lockCommandTriggerString) {
            
            if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                try { 
                    return await message.reply('**❌ لا تمتلك صلاحية إدارة الرومات (Manage Channels).**'); 
                } catch(e) { return; }
            }
            
            try {
                const guildEveryoneRoleObject = message.guild.roles.everyone;
                
                // منع إرسال الرسائل للجميع
                await message.channel.permissionOverwrites.edit(guildEveryoneRoleObject.id, {
                    SendMessages: false
                });
                
                const lockStatusEmbedObject = new EmbedBuilder();
                lockStatusEmbedObject.setTitle('🔒 تم قفل الشات');
                lockStatusEmbedObject.setDescription(`**تم قفل هذه الروم بواسطة:** <@${message.author.id}>`);
                lockStatusEmbedObject.setColor('#ed4245');
                lockStatusEmbedObject.setTimestamp();
                    
                await message.reply({ embeds: [lockStatusEmbedObject] });
                
            } catch (lockOperationException) {
                try { 
                    await message.reply('**❌ فشلت عملية القفل، يرجى التأكد من صلاحيات البوت فوق رتبة الجميع.**'); 
                } catch(e) {}
            }
            return;
        }

        // -----------------------------------------------------------------------------------------
        // 🔓 4.3. أمر فتح الشات (Unlock Command - !unlock)
        // -----------------------------------------------------------------------------------------
        const unlockCommandTriggerString = `${configuredGuildPrefixString}unlock`;
        
        if (fullExecutedCommandWithPrefixString === unlockCommandTriggerString) {
            
            if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                try { 
                    return await message.reply('**❌ لا تمتلك صلاحية إدارة الرومات (Manage Channels).**'); 
                } catch(e) { return; }
            }
            
            try {
                const guildEveryoneRoleTarget = message.guild.roles.everyone;
                
                // إعادة الصلاحية للوضع الافتراضي (Neutral)
                await message.channel.permissionOverwrites.edit(guildEveryoneRoleTarget.id, {
                    SendMessages: null 
                });
                
                const unlockStatusEmbedObject = new EmbedBuilder();
                unlockStatusEmbedObject.setTitle('🔓 تم فتح الشات');
                unlockStatusEmbedObject.setDescription(`**تم فتح هذه الروم بواسطة:** <@${message.author.id}>`);
                unlockStatusEmbedObject.setColor('#3ba55d');
                unlockStatusEmbedObject.setTimestamp();
                    
                await message.reply({ embeds: [unlockStatusEmbedObject] });
                
            } catch (unlockOperationException) {
                try { 
                    await message.reply('**❌ حدث خطأ أثناء محاولة فتح الشات.**'); 
                } catch(e) {}
            }
            return;
        }

        // -----------------------------------------------------------------------------------------
        // ⛔ 4.4. أمر الحظر (Ban Command - !ban)
        // -----------------------------------------------------------------------------------------
        const banCommandTriggerString = `${configuredGuildPrefixString}ban`;
        
        if (fullExecutedCommandWithPrefixString === banCommandTriggerString) {
            
            if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                try { 
                    return await message.reply('**❌ لا تمتلك صلاحية الحظر (Ban Members).**'); 
                } catch(e) { return; }
            }
            
            const targetMemberToBan = message.mentions.members.first() || message.guild.members.cache.get(extractedCommandArgumentsArray[0]);
            
            if (!targetMemberToBan) {
                try { 
                    return await message.reply(`**⚠️ يرجى منشن العضو أو كتابة الأيدي.**\nمثال: \`${configuredGuildPrefixString}ban @user سبام\``); 
                } catch(e) { return; }
            }
            
            if (targetMemberToBan.id === message.author.id) {
                try { return await message.reply('**❌ متهزرش.. مش هحظر الأونر/الإداري لنفسه!**'); } catch(e) {}
                return;
            }
            
            // فحص الهرم الوظيفي للرتب
            const isTargetHigherThanExecutorBoolean = (targetMemberToBan.roles.highest.position >= message.member.roles.highest.position);
            const isNotGuildOwnerBoolean = (message.author.id !== message.guild.ownerId);
            
            if (isTargetHigherThanExecutorBoolean === true && isNotGuildOwnerBoolean === true) {
                try { return await message.reply('**❌ لا يمكنك حظر شخص يمتلك رتبة أعلى منك أو مساوية لك.**'); } catch(e) {}
                return;
            }
            
            if (targetMemberToBan.bannable === false) {
                try { return await message.reply('**❌ لا يمكنني حظر هذا الشخص (رتبته أعلى من رتبة البوت).**'); } catch(e) {}
                return;
            }
            
            const rawBanReasonTextString = extractedCommandArgumentsArray.slice(1).join(' ');
            const finalBanReasonString = rawBanReasonTextString || 'بدون سبب (No Reason Provided)';
            
            try {
                const auditLogReasonString = `بواسطة ${message.author.tag} | السبب: ${finalBanReasonString}`;
                await targetMemberToBan.ban({ reason: auditLogReasonString });
                
                const banSuccessEmbedObject = new EmbedBuilder();
                banSuccessEmbedObject.setTitle('⛔ تم حظر العضو');
                banSuccessEmbedObject.setDescription(`**العضو:** <@${targetMemberToBan.id}>\n**بواسطة:** <@${message.author.id}>\n**السبب:** ${finalBanReasonString}`);
                banSuccessEmbedObject.setColor('#ed4245');
                banSuccessEmbedObject.setThumbnail(targetMemberToBan.user.displayAvatarURL({ dynamic: true }));
                    
                await message.reply({ embeds: [banSuccessEmbedObject] });
                
            } catch (banExecutionException) {
                try { await message.reply('**❌ حدث خطأ غير متوقع أثناء محاولة تنفيذ الحظر.**'); } catch(e) {}
            }
            return;
        }

        // -----------------------------------------------------------------------------------------
        // 🕊️ 4.5. أمر فك الحظر (Unban Command - !unban)
        // -----------------------------------------------------------------------------------------
        const unbanCommandTriggerString = `${configuredGuildPrefixString}unban`;
        
        if (fullExecutedCommandWithPrefixString === unbanCommandTriggerString) {
            
            if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
                try { return await message.reply('**❌ لا تمتلك صلاحية فك الحظر (Ban Members).**'); } catch(e) { return; }
            }
            
            const targetIdToUnbanString = extractedCommandArgumentsArray[0];
            
            if (!targetIdToUnbanString) {
                try { 
                    const unbanUsageString = `**⚠️ يرجى كتابة الأيدي الخاص بالشخص.**\nمثال: \`${configuredGuildPrefixString}unban 123456789\``;
                    return await message.reply(unbanUsageString); 
                } catch(e) { return; }
            }
            
            try {
                await message.guild.members.unban(targetIdToUnbanString);
                
                const unbanEmbedObject = new EmbedBuilder();
                unbanEmbedObject.setDescription(`**✅ تم فك الحظر عن الأيدي (${targetIdToUnbanString}) بواسطة <@${message.author.id}>.**`);
                unbanEmbedObject.setColor('#3ba55d');
                
                await message.reply({ embeds: [unbanEmbedObject] });
                
            } catch (unbanOperationException) {
                try { 
                    await message.reply('**❌ لم أتمكن من فك الحظر. تأكد من صحة الأيدي وأن الشخص محظور فعلاً.**'); 
                } catch(e) {}
            }
            return;
        }

        // -----------------------------------------------------------------------------------------
        // ⏱️ 4.6. أمر التايم أوت (Timeout Command - !timeout)
        // -----------------------------------------------------------------------------------------
        const timeoutCommandTriggerString = `${configuredGuildPrefixString}timeout`;
        
        if (fullExecutedCommandWithPrefixString === timeoutCommandTriggerString) {
            
            if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                try { return await message.reply('**❌ لا تمتلك صلاحية التايم أوت (Moderate Members).**'); } catch(e) { return; }
            }
            
            const targetMemberToTimeout = message.mentions.members.first() || message.guild.members.cache.get(extractedCommandArgumentsArray[0]);
            
            if (!targetMemberToTimeout) {
                try { 
                    const timeoutUsageString = `**⚠️ يرجى منشن العضو أو إدخال الأيدي.**\nمثال: \`${configuredGuildPrefixString}timeout @user 10 شتيمة\``;
                    return await message.reply(timeoutUsageString); 
                } catch(e) { return; }
            }
            
            // فحص الرتب
            if (targetMemberToTimeout.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
                try { return await message.reply('**❌ لا يمكنك إعطاء تايم أوت لشخص رتبته أعلى منك أو مساوية لك.**'); } catch(e) {}
                return;
            }
            
            const timeoutMinutesRawString = extractedCommandArgumentsArray[1];
            const timeoutMinutesInt = parseInt(timeoutMinutesRawString);
            
            if (!timeoutMinutesInt || isNaN(timeoutMinutesInt) || timeoutMinutesInt < 1) {
                try { 
                    return await message.reply(`**⚠️ يرجى تحديد الدقائق.**\nمثال: \`${configuredGuildPrefixString}timeout @user 10\``); 
                } catch(e) { return; }
            }
            
            // تحويل الدقائق إلى ميللي ثانية
            const finalTimeoutMilliseconds = timeoutMinutesInt * 60 * 1000;
            const rawTimeoutReasonString = extractedCommandArgumentsArray.slice(2).join(' ');
            const finalTimeoutReasonString = rawTimeoutReasonString || 'بدون سبب';
            
            try {
                const auditLogTimeoutString = `بواسطة ${message.author.tag} | السبب: ${finalTimeoutReasonString}`;
                await targetMemberToTimeout.timeout(finalTimeoutMilliseconds, auditLogTimeoutString);
                
                const timeoutEmbedObject = new EmbedBuilder();
                timeoutEmbedObject.setTitle('⏱️ تم إعطاء تايم أوت');
                timeoutEmbedObject.setDescription(`**العضو:** <@${targetMemberToTimeout.id}>\n**المدة:** ${timeoutMinutesInt} دقيقة\n**بواسطة:** <@${message.author.id}>\n**السبب:** ${finalTimeoutReasonString}`);
                timeoutEmbedObject.setColor('#f2a658');
                    
                await message.reply({ embeds: [timeoutEmbedObject] });
                
            } catch (timeoutExecException) {
                try { await message.reply('**❌ فشلت العملية، قد تكون رتبة الشخص أعلى من رتبة البوت.**'); } catch(e) {}
            }
            return;
        }

        // -----------------------------------------------------------------------------------------
        // 🔊 4.7. أمر فك التايم أوت (Untimeout Command - !untimeout)
        // -----------------------------------------------------------------------------------------
        const untimeoutCommandTriggerString = `${configuredGuildPrefixString}untimeout`;
        
        if (fullExecutedCommandWithPrefixString === untimeoutCommandTriggerString) {
            
            if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                try { return await message.reply('**❌ لا تمتلك صلاحية التايم أوت.**'); } catch(e) { return; }
            }
            
            const targetMemberToUntimeout = message.mentions.members.first() || message.guild.members.cache.get(extractedCommandArgumentsArray[0]);
            
            if (!targetMemberToUntimeout) {
                try { return await message.reply('**⚠️ يرجى منشن العضو أو إدخال الأيدي.**'); } catch(e) { return; }
            }
            
            try {
                await targetMemberToUntimeout.timeout(null, `تم فك التايم بواسطة ${message.author.tag}`);
                
                const untimeoutEmbed = new EmbedBuilder()
                    .setDescription(`**✅ تم فك التايم أوت عن العضو <@${targetMemberToUntimeout.id}> بنجاح.**`)
                    .setColor('#3ba55d');
                await message.reply({ embeds: [untimeoutEmbed] });
                
            } catch (untimeoutOperationException) {
                try { await message.reply('**❌ حدث خطأ أثناء فك التايم أوت.**'); } catch(e){}
            }
            return;
        }

        // -----------------------------------------------------------------------------------------
        // 🚷 4.8. أمر الطرد (Kick Command - !kick)
        // -----------------------------------------------------------------------------------------
        const kickCommandTriggerString = `${configuredGuildPrefixString}kick`;
        
        if (fullExecutedCommandWithPrefixString === kickCommandTriggerString) {
            
            if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
                try { return await message.reply('**❌ لا تمتلك صلاحية الطرد (Kick Members).**'); } catch(e) { return; }
            }
            
            const targetMemberToKick = message.mentions.members.first() || message.guild.members.cache.get(extractedCommandArgumentsArray[0]);
            
            if (!targetMemberToKick) {
                try { return await message.reply('**⚠️ يرجى منشن العضو للطرد.**'); } catch(e) { return; }
            }
            
            if (targetMemberToKick.kickable === false) {
                try { return await message.reply('**❌ لا يمكنني طرد هذا العضو بسبب الرتب.**'); } catch(e) { return; }
            }
            
            const kickReasonRawString = extractedCommandArgumentsArray.slice(1).join(' ');
            const finalKickReasonString = kickReasonRawString || 'بدون سبب';
            
            try {
                await targetMemberToKick.kick(`بواسطة ${message.author.tag} | السبب: ${finalKickReasonString}`);
                
                const kickEmbed = new EmbedBuilder()
                    .setDescription(`**🚷 تم طرد <@${targetMemberToKick.id}> بنجاح.\nالسبب: ${finalKickReasonString}**`)
                    .setColor('#ed4245');
                await message.reply({ embeds: [kickEmbed] });
                
            } catch (kickException) {
                try { await message.reply('**❌ حدث خطأ أثناء محاولة الطرد.**'); } catch(e){}
            }
            return;
        }

        // -----------------------------------------------------------------------------------------
        // 🚚 4.9. أمر سحب العضو (Move Command - !move)
        // -----------------------------------------------------------------------------------------
        const moveCommandTriggerString = `${configuredGuildPrefixString}move`;
        
        if (fullExecutedCommandWithPrefixString === moveCommandTriggerString) {
            
            if (!message.member.permissions.has(PermissionFlagsBits.MoveMembers)) {
                try { return await message.reply('**❌ لا تمتلك صلاحية نقل الأعضاء (Move Members).**'); } catch(e) { return; }
            }
            
            const targetToMove = message.mentions.members.first() || message.guild.members.cache.get(extractedCommandArgumentsArray[0]);
            
            if (!targetToMove) {
                try { return await message.reply('**⚠️ يرجى منشن العضو لسحبه إلى رومك.**'); } catch(e) { return; }
            }
            
            const targetVoiceState = targetToMove.voice;
            if (!targetVoiceState.channel) {
                try { return await message.reply('**❌ العضو المستهدف ليس متواجداً في أي روم صوتي الآن.**'); } catch(e) { return; }
            }
            
            const executorVoiceState = message.member.voice;
            if (!executorVoiceState.channel) {
                try { return await message.reply('**❌ يجب أن تكون متواجداً أنت أولاً في الروم الصوتي المستهدف.**'); } catch(e) { return; }
            }
            
            try {
                await targetVoiceState.setChannel(executorVoiceState.channelId);
                await message.reply(`**🚚 تم سحب <@${targetToMove.id}> إلى رومك الصوتي بنجاح.**`);
            } catch (moveOpException) {
                try { await message.reply('**❌ فشلت العملية، قد لا أمتلك صلاحية الدخول لتلك الروم.**'); } catch(e){}
            }
            return;
        }

        // -----------------------------------------------------------------------------------------
        // 🎙️ 4.10. أمر كتم صوت الفويس (Voice Mute - !vmute / !vunmute)
        // -----------------------------------------------------------------------------------------
        const voiceMuteTriggerString = `${configuredGuildPrefixString}vmute`;
        const voiceUnmuteTriggerString = `${configuredGuildPrefixString}vunmute`;
        
        const isVoiceMuteAction = (fullExecutedCommandWithPrefixString === voiceMuteTriggerString);
        const isVoiceUnmuteAction = (fullExecutedCommandWithPrefixString === voiceUnmuteTriggerString);
        
        if (isVoiceMuteAction === true || isVoiceUnmuteAction === true) {
            
            if (!message.member.permissions.has(PermissionFlagsBits.MuteMembers)) {
                try { return await message.reply('**❌ لا تمتلك صلاحية كتم الأعضاء صوتياً.**'); } catch(e) { return; }
            }
            
            const targetVoiceMember = message.mentions.members.first() || message.guild.members.cache.get(extractedCommandArgumentsArray[0]);
            
            if (!targetVoiceMember) {
                try { return await message.reply('**⚠️ يرجى منشن العضو.**'); } catch(e) { return; }
            }
            
            const currentVoiceState = targetVoiceMember.voice;
            if (!currentVoiceState.channel) {
                try { return await message.reply('**❌ العضو ليس متواجداً في روم صوتي حالياً.**'); } catch(e) { return; }
            }
            
            try {
                // تنفيذ الكتم أو فكه بناءً على الأمر المستخدم
                await currentVoiceState.setMute(isVoiceMuteAction);
                
                const statusLabelString = isVoiceMuteAction ? 'كتم صوت' : 'فك كتم صوت';
                await message.reply(`**🎙️ تم ${statusLabelString} <@${targetVoiceMember.id}> في الفويس بنجاح.**`);
                
            } catch (voiceMuteOpException) {
                try { await message.reply('**❌ حدث خطأ، تأكد من صلاحيات البوت في الرومات الصوتية.**'); } catch(e){}
            }
            return;
        }

    });
}; // نهاية الموديول الشامل
