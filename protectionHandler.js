// =========================================================================================================
// 🛡️ نظام الحماية والتحذيرات العالمي (UNIVERSAL PROTECTION & WARNING SYSTEM)
// =========================================================================================================

const discordLibrary = require('discord.js');
const EmbedBuilder = discordLibrary.EmbedBuilder;
const ActionRowBuilder = discordLibrary.ActionRowBuilder;
const ButtonBuilder = discordLibrary.ButtonBuilder;
const ButtonStyle = discordLibrary.ButtonStyle;
const ModalBuilder = discordLibrary.ModalBuilder;
const TextInputBuilder = discordLibrary.TextInputBuilder;
const TextInputStyle = discordLibrary.TextInputStyle;
const StringSelectMenuBuilder = discordLibrary.StringSelectMenuBuilder;

const GuildConfig = require('./models/GuildConfig');

// خريطة في الذاكرة لتتبع السبام (لضمان السرعة القصوى)
const globalSpamTrackingMemoryMap = new Map();

module.exports = (client) => {

    // =========================================================================================================
    // 🛡️ 1. نظام الحماية من الروابط والسبام (Anti-Links & Anti-Spam)
    // =========================================================================================================
    client.on('messageCreate', async (message) => {
        
        const isMessageAuthorBot = message.author.bot;
        if (isMessageAuthorBot === true) return;
        
        const targetGuildObject = message.guild;
        if (!targetGuildObject) return;
        
        const targetMemberObject = message.member;
        if (!targetMemberObject) return;

        // استثناء الإدارة من الحماية
        const hasAdminPermission = targetMemberObject.permissions.has('Administrator');
        if (hasAdminPermission === true) return;

        const currentGuildIdString = targetGuildObject.id;
        let guildConfigurationDocument = null;
        
        try {
            guildConfigurationDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        } catch (dbError) { return; }
        
        if (!guildConfigurationDocument) return;

        const messageContentLowerCaseString = message.content.toLowerCase();

        // 🔗 منع الروابط (Anti-Links)
        const isAntiLinksEnabled = guildConfigurationDocument.antiLinks;
        if (isAntiLinksEnabled === true) {
            const containsHttp = messageContentLowerCaseString.includes('http://');
            const containsHttps = messageContentLowerCaseString.includes('https://');
            const containsDiscordInvite = messageContentLowerCaseString.includes('discord.gg/') || messageContentLowerCaseString.includes('discord.com/invite/');
            
            const hasForbiddenLink = (containsHttp || containsHttps || containsDiscordInvite);
            
            if (hasForbiddenLink === true) {
                try { await message.delete(); } catch (deletionException) {}
                try {
                    const warningReplyMessage = await message.channel.send(`**⚠️ يمنع نشر الروابط في هذا السيرفر يا <@${message.author.id}>!**`);
                    setTimeout(() => { 
                        try { warningReplyMessage.delete(); } catch (e) {} 
                    }, 5000);
                } catch (replyException) {}
                return; // إيقاف التنفيذ
            }
        }

        // 🛑 منع السبام (Anti-Spam)
        const isAntiSpamEnabled = guildConfigurationDocument.antiSpam;
        if (isAntiSpamEnabled === true) {
            const messageAuthorIdString = message.author.id;
            const currentTimestampNumber = Date.now();
            
            let userSpamRecordObject = globalSpamTrackingMemoryMap.get(messageAuthorIdString);
            
            if (!userSpamRecordObject) {
                globalSpamTrackingMemoryMap.set(messageAuthorIdString, { messageCount: 1, lastMessageTime: currentTimestampNumber });
            } else {
                const timeDifferencePassedNumber = currentTimestampNumber - userSpamRecordObject.lastMessageTime;
                
                // إذا أرسل رسالة أخرى في أقل من 5 ثواني
                if (timeDifferencePassedNumber < 5000) {
                    userSpamRecordObject.messageCount += 1;
                    userSpamRecordObject.lastMessageTime = currentTimestampNumber;
                    globalSpamTrackingMemoryMap.set(messageAuthorIdString, userSpamRecordObject);
                    
                    if (userSpamRecordObject.messageCount >= 5) {
                        try { await message.delete(); } catch (e) {}
                        globalSpamTrackingMemoryMap.delete(messageAuthorIdString); // تصفير العداد
                        
                        try {
                            const timeoutDurationMs = 5 * 60 * 1000; // 5 دقائق
                            await targetMemberObject.timeout(timeoutDurationMs, 'نظام الحماية: إرسال رسائل متكررة (Spam)');
                            await message.channel.send(`**🔇 تم إعطاء <@${messageAuthorIdString}> تايم أوت لمدة 5 دقائق بسبب السبام.**`);
                        } catch (timeoutException) {}
                    }
                } else {
                    // إذا مر أكثر من 5 ثواني، نصفر العداد
                    globalSpamTrackingMemoryMap.set(messageAuthorIdString, { messageCount: 1, lastMessageTime: currentTimestampNumber });
                }
            }
        }
    });

    // =========================================================================================================
    // ⚠️ 2. تفاعلات لوحة التحذيرات الأساسية (Zero Interaction Failed Mechanism)
    // السر هنا أننا لا نطلب قاعدة البيانات قبل فتح النافذة، بل نفتح النافذة فوراً.
    // =========================================================================================================
    client.on('interactionCreate', async (interaction) => {
        
        const isButtonInteraction = interaction.isButton();
        if (isButtonInteraction === false) return;
        
        const buttonCustomIdString = interaction.customId;
        
        const isGiveWarnButton = (buttonCustomIdString === 'sys_warn_give');
        const isRemoveWarnButton = (buttonCustomIdString === 'sys_warn_remove');
        const isViewWarnButton = (buttonCustomIdString === 'sys_warn_view');
        
        const isAnyWarnPanelButton = (isGiveWarnButton || isRemoveWarnButton || isViewWarnButton);
        if (isAnyWarnPanelButton === false) return;
        
        // 1. التحقق السريع من الصلاحيات محلياً (بدون تأخير)
        const hasAdministratorPermission = interaction.member.permissions.has('Administrator');
        if (hasAdministratorPermission === false) {
            const noPermissionMessageString = '**❌ عذراً، الإدارة فقط يمكنها استخدام هذه اللوحة!**';
            try { return await interaction.reply({ content: noPermissionMessageString, ephemeral: true }); } catch(e) { return; }
        }
        
        // 2. بناء النافذة المنبثقة فوراً وإرسالها
        const warnActionModalObject = new ModalBuilder();
        
        let targetModalCustomIdString = '';
        let targetModalTitleString = '';
        
        if (isGiveWarnButton === true) {
            targetModalCustomIdString = 'modal_sys_warn_give';
            targetModalTitleString = 'تحذير عضو (Give Warn)';
        } else if (isRemoveWarnButton === true) {
            targetModalCustomIdString = 'modal_sys_warn_remove';
            targetModalTitleString = 'إزالة تحذيرات (Remove Warns)';
        } else if (isViewWarnButton === true) {
            targetModalCustomIdString = 'modal_sys_warn_view';
            targetModalTitleString = 'عرض السجل (View Warns)';
        }
        
        warnActionModalObject.setCustomId(targetModalCustomIdString);
        warnActionModalObject.setTitle(targetModalTitleString);
        
        const targetUserIdTextInputObject = new TextInputBuilder();
        targetUserIdTextInputObject.setCustomId('target_user_id_field');
        targetUserIdTextInputObject.setLabel('أيدي العضو (User ID):');
        targetUserIdTextInputObject.setStyle(TextInputStyle.Short);
        targetUserIdTextInputObject.setRequired(true);
        targetUserIdTextInputObject.setPlaceholder('مثال: 123456789012345678');
        
        const modalInputRowObject = new ActionRowBuilder().addComponents(targetUserIdTextInputObject);
        warnActionModalObject.addComponents(modalInputRowObject);
        
        // إظهار النافذة بسرعة فائقة
        try {
            await interaction.showModal(warnActionModalObject);
        } catch (showModalException) {
            console.log("[UNIVERSAL PROTECTION] Error showing warn modal: ", showModalException);
        }
    });

    // =========================================================================================================
    // ⚠️ 3. استلام بيانات النوافذ ومعالجتها بالداتابيز
    // =========================================================================================================
    client.on('interactionCreate', async (interaction) => {
        
        const isModalSubmitInteraction = interaction.isModalSubmit();
        if (isModalSubmitInteraction === false) return;
        
        const submittedModalCustomIdString = interaction.customId;
        
        const isGiveWarnModal = (submittedModalCustomIdString === 'modal_sys_warn_give');
        const isRemoveWarnModal = (submittedModalCustomIdString === 'modal_sys_warn_remove');
        const isViewWarnModal = (submittedModalCustomIdString === 'modal_sys_warn_view');
        
        const isAnyWarnModal = (isGiveWarnModal || isRemoveWarnModal || isViewWarnModal);
        if (isAnyWarnModal === false) return;

        // الآن يمكننا تأجيل الرد بأمان لأن النافذة قد تم إرسالها بالفعل
        try {
            await interaction.deferReply({ ephemeral: true });
        } catch (deferReplyException) { return; }

        const extractedTargetUserIdString = interaction.fields.getTextInputValue('target_user_id_field').trim();
        const interactingGuildObject = interaction.guild;
        
        let serverConfigDocument = null;
        try {
            serverConfigDocument = await GuildConfig.findOne({ guildId: interactingGuildObject.id });
        } catch (dbError) {}
        
        if (!serverConfigDocument) {
            try { return await interaction.editReply('**❌ حدث خطأ، لم أجد إعدادات السيرفر في قاعدة البيانات.**'); } catch(e) { return; }
        }

        let targetDiscordMemberObject = null;
        try {
            targetDiscordMemberObject = await interactingGuildObject.members.fetch(extractedTargetUserIdString);
        } catch (memberFetchException) {
            try { return await interaction.editReply('**❌ لم أتمكن من العثور على هذا العضو في السيرفر. يرجى التأكد من الأيدي.**'); } catch(e) { return; }
        }

        const isTargetMemberBot = targetDiscordMemberObject.user.bot;
        if (isTargetMemberBot === true) {
            try { return await interaction.editReply('**❌ لا يمكنك تطبيق هذا الإجراء على بوت!**'); } catch(e) { return; }
        }

        // -------------------------------------------------------------------------
        // إجراء إعطاء التحذير: عرض قائمة اللغات
        // -------------------------------------------------------------------------
        if (isGiveWarnModal === true) {
            
            const isTargetingSelf = (targetDiscordMemberObject.id === interaction.user.id);
            if (isTargetingSelf === true) {
                try { return await interaction.editReply('**❌ لا يمكنك تحذير نفسك!**'); } catch(e) { return; }
            }

            const selectLanguageEmbedObject = new EmbedBuilder();
            selectLanguageEmbedObject.setTitle('🌐 اختيار لغة التحذير');
            selectLanguageEmbedObject.setDescription('بأي لغة تريد إرسال التحذير لهذا العضو في الخاص؟\n(What language do you want to use?)');
            selectLanguageEmbedObject.setColor('#5865F2');

            const languageSelectionRowObject = new ActionRowBuilder();
            
            const arabicLanguageButton = new ButtonBuilder();
            arabicLanguageButton.setCustomId(`warnlang_ar_${extractedTargetUserIdString}`);
            arabicLanguageButton.setLabel('العربية 🇸🇦');
            arabicLanguageButton.setStyle(ButtonStyle.Success);
            
            const englishLanguageButton = new ButtonBuilder();
            englishLanguageButton.setCustomId(`warnlang_en_${extractedTargetUserIdString}`);
            englishLanguageButton.setLabel('English 🇺🇸');
            englishLanguageButton.setStyle(ButtonStyle.Primary);
            
            languageSelectionRowObject.addComponents(arabicLanguageButton, englishLanguageButton);
            
            try {
                return await interaction.editReply({ 
                    embeds: [selectLanguageEmbedObject], 
                    components: [languageSelectionRowObject] 
                });
            } catch (editReplyException) {}
        }

        // -------------------------------------------------------------------------
        // إجراء إزالة التحذيرات
        // -------------------------------------------------------------------------
        else if (isRemoveWarnModal === true) {
            
            let allUsersWarnsMapObject = serverConfigDocument.userWarnsRecords;
            if (!allUsersWarnsMapObject) {
                allUsersWarnsMapObject = new Map();
            }
            
            const doesUserHaveExistingWarns = allUsersWarnsMapObject.has(extractedTargetUserIdString);
            let specificUserWarnsArray = [];
            
            if (doesUserHaveExistingWarns === true) {
                specificUserWarnsArray = allUsersWarnsMapObject.get(extractedTargetUserIdString);
            }
            
            const isUserWarnsArrayEmpty = (specificUserWarnsArray.length === 0);
            
            if (doesUserHaveExistingWarns === false || isUserWarnsArrayEmpty === true) {
                try { return await interaction.editReply('**✅ لا يوجد تحذيرات سابقة لهذا العضو لإزالتها.**'); } catch(e) { return; }
            }
            
            // حذف السجل بالكامل من الخريطة
            allUsersWarnsMapObject.delete(extractedTargetUserIdString);
            serverConfigDocument.userWarnsRecords = allUsersWarnsMapObject;
            
            try {
                await serverConfigDocument.save();
            } catch (saveDbException) {}
            
            try {
                await interaction.editReply(`**✅ تم إزالة جميع التحذيرات الخاصة بالعضو <@${extractedTargetUserIdString}> بنجاح.**`);
            } catch (editReplyException) {}
            
            // إرسال لوج إزالة التحذير
            const designatedWarnLogChannelIdString = serverConfigDocument.warnLogChannelId;
            if (designatedWarnLogChannelIdString) {
                const officialWarnLogChannelObject = interactingGuildObject.channels.cache.get(designatedWarnLogChannelIdString);
                
                if (officialWarnLogChannelObject) {
                    const warnRemovalLogEmbedObject = new EmbedBuilder();
                    warnRemovalLogEmbedObject.setTitle('🟢 إزالة تحذيرات');
                    
                    let removalLogDescriptionString = `تم إزالة جميع التحذيرات للعضو <@${extractedTargetUserIdString}>.\n\n`;
                    removalLogDescriptionString += `**بواسطة المشرف:**\n<@${interaction.user.id}>`;
                    
                    warnRemovalLogEmbedObject.setDescription(removalLogDescriptionString);
                    warnRemovalLogEmbedObject.setColor('#3ba55d'); // لون أخضر
                    warnRemovalLogEmbedObject.setTimestamp();
                    
                    try { 
                        await officialWarnLogChannelObject.send({ embeds: [warnRemovalLogEmbedObject] }); 
                    } catch(sendLogException) {}
                }
            }
        }

        // -------------------------------------------------------------------------
        // إجراء عرض سجل التحذيرات (View Warns)
        // -------------------------------------------------------------------------
        else if (isViewWarnModal === true) {
            
            let allUsersWarnsMapObject = serverConfigDocument.userWarnsRecords;
            if (!allUsersWarnsMapObject) {
                allUsersWarnsMapObject = new Map();
            }
            
            const specificUserWarnsHistoryArray = allUsersWarnsMapObject.get(extractedTargetUserIdString);
            
            if (!specificUserWarnsHistoryArray || specificUserWarnsHistoryArray.length === 0) {
                const emptyWarnsHistoryEmbedObject = new EmbedBuilder();
                emptyWarnsHistoryEmbedObject.setTitle(`سجل تحذيرات ${targetDiscordMemberObject.user.username}`);
                emptyWarnsHistoryEmbedObject.setDescription('لا يوجد سجل تحذيرات مسجل لهذا العضو في الوقت الحالي.');
                emptyWarnsHistoryEmbedObject.setColor('#2b2d31'); 
                
                try { return await interaction.editReply({ embeds: [emptyWarnsHistoryEmbedObject] }); } catch(e) { return; }
            }
            
            const populatedWarnsHistoryEmbedObject = new EmbedBuilder();
            populatedWarnsHistoryEmbedObject.setTitle(`سجل تحذيرات ${targetDiscordMemberObject.user.username}`);
            
            let historyRecordsDescriptionBuilderString = '';
            
            for (let recordIndex = 0; recordIndex < specificUserWarnsHistoryArray.length; recordIndex++) {
                const currentRecordObject = specificUserWarnsHistoryArray[recordIndex];
                const displayRecordNumber = recordIndex + 1;
                
                const recordTimestampDateObject = new Date(currentRecordObject.date);
                const elegantlyFormattedDateString = recordTimestampDateObject.toLocaleString('en-US'); 
                
                historyRecordsDescriptionBuilderString += `**${displayRecordNumber}. السبب:** ${currentRecordObject.reason}\n`;
                historyRecordsDescriptionBuilderString += `التاريخ: ${elegantlyFormattedDateString}\n\n`;
            }
            
            populatedWarnsHistoryEmbedObject.setDescription(historyRecordsDescriptionBuilderString);
            populatedWarnsHistoryEmbedObject.setColor('#f2a658'); // لون برتقالي
            
            try { 
                await interaction.editReply({ embeds: [populatedWarnsHistoryEmbedObject] }); 
            } catch (editReplyException) {}
        }
    });

    // =========================================================================================================
    // ⚠️ 4. تفاعل اختيار اللغة وفتح القائمة المنسدلة (Select Menu) للأسباب
    // =========================================================================================================
    client.on('interactionCreate', async (interaction) => {
        
        const isButtonInteractionEvent = interaction.isButton();
        if (isButtonInteractionEvent === false) return;
        
        const languageButtonCustomIdString = interaction.customId;
        const isArabicLanguageSelected = languageButtonCustomIdString.startsWith('warnlang_ar_');
        const isEnglishLanguageSelected = languageButtonCustomIdString.startsWith('warnlang_en_');
        
        const isAnyLanguageSelected = (isArabicLanguageSelected || isEnglishLanguageSelected);
        if (isAnyLanguageSelected === false) return;
        
        const activeGuildConfigDocument = await GuildConfig.findOne({ guildId: interaction.guild.id }).catch(()=>{});
        if (!activeGuildConfigDocument) return;

        let targetViolatorUserIdString = '';
        let dashboardConfiguredReasonsListArray = [];
        let selectMenuPlaceholderDisplayString = '';
        let finalSelectMenuCustomIdString = '';
        
        if (isArabicLanguageSelected === true) {
            
            targetViolatorUserIdString = languageButtonCustomIdString.replace('warnlang_ar_', '');
            dashboardConfiguredReasonsListArray = activeGuildConfigDocument.warnReasonsAR;
            selectMenuPlaceholderDisplayString = 'اختر سبب التحذير...';
            finalSelectMenuCustomIdString = `selectwarn_ar_${targetViolatorUserIdString}`;
            
            if (!dashboardConfiguredReasonsListArray || dashboardConfiguredReasonsListArray.length === 0) {
                try { return await interaction.reply({ content: '**❌ لم يتم إضافة أسباب عربية في الداشبورد.**', ephemeral: true }); } catch(e) { return; }
            }
            
        } else {
            
            targetViolatorUserIdString = languageButtonCustomIdString.replace('warnlang_en_', '');
            dashboardConfiguredReasonsListArray = activeGuildConfigDocument.warnReasonsEN;
            selectMenuPlaceholderDisplayString = 'Select warning reason...';
            finalSelectMenuCustomIdString = `selectwarn_en_${targetViolatorUserIdString}`;
            
            if (!dashboardConfiguredReasonsListArray || dashboardConfiguredReasonsListArray.length === 0) {
                try { return await interaction.reply({ content: '**❌ No English reasons added in dashboard.**', ephemeral: true }); } catch(e) { return; }
            }
        }

        const reasonsDropdownMenuObject = new StringSelectMenuBuilder();
        reasonsDropdownMenuObject.setCustomId(finalSelectMenuCustomIdString);
        reasonsDropdownMenuObject.setPlaceholder(selectMenuPlaceholderDisplayString);
        
        for (let reasonIndex = 0; reasonIndex < dashboardConfiguredReasonsListArray.length; reasonIndex++) {
            const currentReasonTextString = dashboardConfiguredReasonsListArray[reasonIndex];
            
            reasonsDropdownMenuObject.addOptions({ 
                label: currentReasonTextString, 
                value: `reason_${reasonIndex}` 
            });
        }
        
        const dropdownMenuActionRowObject = new ActionRowBuilder().addComponents(reasonsDropdownMenuObject);
        
        try {
            await interaction.update({ 
                content: '**رجاءً، اختر السبب من القائمة أدناه:**', 
                embeds: [], 
                components: [dropdownMenuActionRowObject] 
            });
        } catch (updateMessageException) {}
    });

    // =========================================================================================================
    // ⚠️ 5. تنفيذ التحذير النهائي بعد اختيار السبب من القائمة المنسدلة
    // =========================================================================================================
    client.on('interactionCreate', async (interaction) => {
        
        const isSelectMenuInteractionEvent = interaction.isStringSelectMenu();
        if (isSelectMenuInteractionEvent === false) return;
        
        const submittedSelectMenuCustomIdString = interaction.customId;
        const isArabicReasonSelected = submittedSelectMenuCustomIdString.startsWith('selectwarn_ar_');
        const isEnglishReasonSelected = submittedSelectMenuCustomIdString.startsWith('selectwarn_en_');
        
        const isAnyReasonSelected = (isArabicReasonSelected || isEnglishReasonSelected);
        if (isAnyReasonSelected === false) return;
        
        try {
            await interaction.deferUpdate();
        } catch (deferUpdateException) {}
        
        const currentInteractionGuildObject = interaction.guild;
        const activeGuildConfigDocument = await GuildConfig.findOne({ guildId: currentInteractionGuildObject.id }).catch(()=>{});
        if (!activeGuildConfigDocument) return;

        let targetViolatorUserIdString = '';
        let officiallyChosenReasonTextString = '';
        
        const firstSelectedOptionValueString = interaction.values[0];
        const extractedReasonIndexNumber = parseInt(firstSelectedOptionValueString.replace('reason_', ''));

        if (isArabicReasonSelected === true) {
            targetViolatorUserIdString = submittedSelectMenuCustomIdString.replace('selectwarn_ar_', '');
            officiallyChosenReasonTextString = activeGuildConfigDocument.warnReasonsAR[extractedReasonIndexNumber];
        } else {
            targetViolatorUserIdString = submittedSelectMenuCustomIdString.replace('selectwarn_en_', '');
            officiallyChosenReasonTextString = activeGuildConfigDocument.warnReasonsEN[extractedReasonIndexNumber];
        }

        let violatorMemberObject = null;
        try { 
            violatorMemberObject = await currentInteractionGuildObject.members.fetch(targetViolatorUserIdString); 
        } catch (memberFetchException) { 
            try { return await interaction.editReply({ content: '**❌ لم أتمكن من العثور على العضو في السيرفر.**', components: [] }); } catch(e) { return; }
        }

        let globalWarnsMapObject = activeGuildConfigDocument.userWarnsRecords;
        if (!globalWarnsMapObject) {
            globalWarnsMapObject = new Map();
        }
        
        let targetUserWarnsHistoryArray = globalWarnsMapObject.get(targetViolatorUserIdString);
        if (!targetUserWarnsHistoryArray) {
            targetUserWarnsHistoryArray = [];
        }
        
        const newWarnRecordEntryObject = { 
            reason: officiallyChosenReasonTextString, 
            date: new Date(), 
            moderatorId: interaction.user.id 
        };
        
        targetUserWarnsHistoryArray.push(newWarnRecordEntryObject);
        globalWarnsMapObject.set(targetViolatorUserIdString, targetUserWarnsHistoryArray);
        
        activeGuildConfigDocument.userWarnsRecords = globalWarnsMapObject;
        
        try {
            await activeGuildConfigDocument.save();
        } catch (saveWarnException) {}
        
        const totalAccumulatedWarnsNumber = targetUserWarnsHistoryArray.length;
        const dashboardConfiguredMaxWarningsNumber = activeGuildConfigDocument.warnMax;
        const dashboardConfiguredAutoPunishmentString = activeGuildConfigDocument.warnAction;
        
        let finalActionDescriptionString = isArabicReasonSelected ? 'تم إعطاء تحذير فقط.' : 'Warned only.';
        
        // تطبيق العقاب التلقائي عند بلوغ الحد الأقصى
        if (totalAccumulatedWarnsNumber >= dashboardConfiguredMaxWarningsNumber) {
            
            globalWarnsMapObject.delete(targetViolatorUserIdString);
            activeGuildConfigDocument.userWarnsRecords = globalWarnsMapObject;
            
            try { await activeGuildConfigDocument.save(); } catch(e) {}
            
            const formalPunishmentReasonString = `Max warnings reached. Last reason: ${officiallyChosenReasonTextString}`;
            
            try {
                if (dashboardConfiguredAutoPunishmentString === 'timeout') {
                    const oneDayTimeoutDurationMs = 24 * 60 * 60 * 1000;
                    await violatorMemberObject.timeout(oneDayTimeoutDurationMs, formalPunishmentReasonString);
                    finalActionDescriptionString = isArabicReasonSelected ? 'تجاوز الحد الأقصى! تم تطبيق Timeout ليوم كامل.' : 'Max reached! Timeout applied for 1 day.';
                    
                } else if (dashboardConfiguredAutoPunishmentString === 'kick') {
                    await violatorMemberObject.kick(formalPunishmentReasonString);
                    finalActionDescriptionString = isArabicReasonSelected ? 'تجاوز الحد الأقصى! تم طرده من السيرفر.' : 'Max reached! Kicked from server.';
                    
                } else if (dashboardConfiguredAutoPunishmentString === 'ban') {
                    await violatorMemberObject.ban({ reason: formalPunishmentReasonString });
                    finalActionDescriptionString = isArabicReasonSelected ? 'تجاوز الحد الأقصى! تم حظره نهائياً.' : 'Max reached! Banned from server.';
                }
            } catch (punishmentExecutionException) {
                finalActionDescriptionString = isArabicReasonSelected ? 'تجاوز الحد، ولكن فشل العقاب بسبب نقص الصلاحيات.' : 'Max reached, but punishment failed due to permissions.';
            }
            
        } else {
            finalActionDescriptionString = isArabicReasonSelected ? `تحذير رقم ${totalAccumulatedWarnsNumber} من أصل ${dashboardConfiguredMaxWarningsNumber}.` : `Warn ${totalAccumulatedWarnsNumber}/${dashboardConfiguredMaxWarningsNumber}.`;
        }
        
        // إرسال اللوج الخاص بالتحذير
        const designatedWarnLogChannelIdString = activeGuildConfigDocument.warnLogChannelId;
        if (designatedWarnLogChannelIdString) {
            const officialWarnLogChannelObject = currentInteractionGuildObject.channels.cache.get(designatedWarnLogChannelIdString);
            
            if (officialWarnLogChannelObject) {
                const officialWarnLogEmbedObject = new EmbedBuilder();
                officialWarnLogEmbedObject.setTitle('🔴 تحذير جديد (New Warning)');
                
                let logDescriptionBuilderString = `**العضو المخالف:**\n<@${targetViolatorUserIdString}>\n\n`;
                logDescriptionBuilderString += `**السبب:**\n${officiallyChosenReasonTextString}\n\n`;
                logDescriptionBuilderString += `**بواسطة المشرف:**\n<@${interaction.user.id}>\n\n`;
                logDescriptionBuilderString += `**التاريخ:**\n${new Date().toLocaleString('en-US')}`;
                
                officialWarnLogEmbedObject.setDescription(logDescriptionBuilderString);
                officialWarnLogEmbedObject.setColor('#ed4245'); // لون أحمر
                
                try { await officialWarnLogChannelObject.send({ embeds: [officialWarnLogEmbedObject] }); } catch (e) {}
            }
        }
        
        // إرسال رسالة في الخاص للعضو وإخفاء هوية المشرف تماماً (Privacy)
        try {
            const violatorDirectMessageEmbedObject = new EmbedBuilder();
            
            const serverNameDynamicString = currentInteractionGuildObject.name;
            const dmTitleTextString = isArabicReasonSelected ? `⚠️ لقد تلقيت تحذيراً في سيرفر ${serverNameDynamicString}` : `⚠️ You have been warned in ${serverNameDynamicString}`;
            
            violatorDirectMessageEmbedObject.setTitle(dmTitleTextString);
            
            let dmDescriptionBuilderString = `**${isArabicReasonSelected ? 'السبب:' : 'Reason:'}** ${officiallyChosenReasonTextString}\n\n`;
            dmDescriptionBuilderString += `**${isArabicReasonSelected ? 'الحالة:' : 'Status:'}** ${finalActionDescriptionString}\n`;
            dmDescriptionBuilderString += `${isArabicReasonSelected ? 'يرجى الالتزام بالقوانين لتجنب العقوبات.' : 'Please follow the rules to avoid punishments.'}`;
            
            violatorDirectMessageEmbedObject.setDescription(dmDescriptionBuilderString);
            violatorDirectMessageEmbedObject.setColor('#ed4245');
            
            await violatorMemberObject.send({ embeds: [violatorDirectMessageEmbedObject] });
        } catch (dmSendException) {}
        
        const successfulWarnReplyMessageString = isArabicReasonSelected ? `**✅ تم إرسال التحذير بنجاح إلى <@${targetViolatorUserIdString}>.**` : `**✅ Warning successfully sent to <@${targetViolatorUserIdString}>.**`;
        
        try {
            await interaction.editReply({ 
                content: successfulWarnReplyMessageString, 
                components: [] 
            });
        } catch (editFinalReplyException) {}
    });
}; // نهاية ملف التحذيرات
