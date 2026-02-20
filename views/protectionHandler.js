// =====================================================================
// 📦 استدعاء المكاتب الأساسية (مفرودة بالكامل بدون أي اختصار)
// =====================================================================
const discordLibrary = require('discord.js');
const EmbedBuilder = discordLibrary.EmbedBuilder;
const ActionRowBuilder = discordLibrary.ActionRowBuilder;
const ButtonBuilder = discordLibrary.ButtonBuilder;
const ButtonStyle = discordLibrary.ButtonStyle;
const ModalBuilder = discordLibrary.ModalBuilder;
const TextInputBuilder = discordLibrary.TextInputBuilder;
const TextInputStyle = discordLibrary.TextInputStyle;
const StringSelectMenuBuilder = discordLibrary.StringSelectMenuBuilder;
const PermissionFlagsBits = discordLibrary.PermissionFlagsBits;

// استدعاء قاعدة البيانات الشاملة
const GuildConfig = require('./models/GuildConfig');

// خرائط الذاكرة للحماية من السبام
const spamTrackingMap = new Map();

module.exports = (client) => {

    // =====================================================================
    // 🛡️ 1. نظام الحماية من الروابط والسبام (Message Create)
    // =====================================================================
    client.on('messageCreate', async (message) => {
        
        const messageAuthorIsBot = message.author.bot;
        if (messageAuthorIsBot === true) {
            return;
        }

        const messageGuildObject = message.guild;
        if (!messageGuildObject) {
            return;
        }

        const interactionMemberObject = message.member;
        if (!interactionMemberObject) {
            return;
        }

        // استثناء الإدارة من الحماية
        const memberPermissionsObject = interactionMemberObject.permissions;
        const hasAdminPermission = memberPermissionsObject.has('Administrator');
        
        if (hasAdminPermission === true) {
            return; // الإدارة لا يطبق عليها الحماية
        }

        const currentGuildIdString = messageGuildObject.id;
        const guildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        
        if (!guildConfigDocument) {
            return;
        }

        const messageContentLowerCase = message.content.toLowerCase();

        // 🔗 نظام منع الروابط (Anti-Links)
        const antiLinksIsEnabled = guildConfigDocument.antiLinks;
        
        if (antiLinksIsEnabled === true) {
            
            const containsHttpString = messageContentLowerCase.includes('http://');
            const containsHttpsString = messageContentLowerCase.includes('https://');
            const containsDiscordGgString = messageContentLowerCase.includes('discord.gg/');
            const containsDiscordComInviteString = messageContentLowerCase.includes('discord.com/invite/');
            
            const hasAnyLink = (containsHttpString || containsHttpsString || containsDiscordGgString || containsDiscordComInviteString);
            
            if (hasAnyLink === true) {
                
                try {
                    await message.delete();
                } catch (deleteError) {}
                
                const warningMessageContent = `**⚠️ يمنع نشر الروابط في هذا السيرفر يا <@${message.author.id}>!**`;
                
                try {
                    const sentWarningMessage = await message.channel.send(warningMessageContent);
                    
                    setTimeout(() => {
                        try {
                            sentWarningMessage.delete();
                        } catch (timeoutDeleteError) {}
                    }, 5000);
                    
                } catch (sendError) {}
                
                return; // إيقاف التنفيذ حتى لا يكمل للسبام
            }
        }

        // 🛑 نظام منع السبام (Anti-Spam)
        const antiSpamIsEnabled = guildConfigDocument.antiSpam;
        
        if (antiSpamIsEnabled === true) {
            
            const messageAuthorIdString = message.author.id;
            const currentTimeNumber = Date.now();
            
            let userSpamDataObject = spamTrackingMap.get(messageAuthorIdString);
            
            if (!userSpamDataObject) {
                userSpamDataObject = {
                    messageCount: 1,
                    lastMessageTime: currentTimeNumber
                };
                spamTrackingMap.set(messageAuthorIdString, userSpamDataObject);
            } else {
                
                const timeDifferenceNumber = currentTimeNumber - userSpamDataObject.lastMessageTime;
                
                // إذا كانت الرسالة في غضون 5 ثواني
                if (timeDifferenceNumber < 5000) {
                    
                    userSpamDataObject.messageCount = userSpamDataObject.messageCount + 1;
                    userSpamDataObject.lastMessageTime = currentTimeNumber;
                    
                    spamTrackingMap.set(messageAuthorIdString, userSpamDataObject);
                    
                    if (userSpamDataObject.messageCount >= 5) {
                        
                        try {
                            await message.delete();
                        } catch (deleteSpamError) {}
                        
                        spamTrackingMap.delete(messageAuthorIdString);
                        
                        // إعطاء تايم أوت لمدة 5 دقائق
                        const timeoutDurationNumber = 5 * 60 * 1000;
                        const timeoutReasonString = 'نظام الحماية: إرسال رسائل متكررة (Spam)';
                        
                        try {
                            await interactionMemberObject.timeout(timeoutDurationNumber, timeoutReasonString);
                            
                            const spamTimeoutMessage = `**🔇 تم إعطاء <@${messageAuthorIdString}> تايم أوت لمدة 5 دقائق بسبب السبام.**`;
                            await message.channel.send(spamTimeoutMessage);
                            
                        } catch (timeoutApplyError) {}
                    }
                    
                } else {
                    userSpamDataObject.messageCount = 1;
                    userSpamDataObject.lastMessageTime = currentTimeNumber;
                    spamTrackingMap.set(messageAuthorIdString, userSpamDataObject);
                }
            }
        }
    });

    // =====================================================================
    // ⚠️ 2. تفاعلات لوحة التحذيرات (الـ 3 زراير: إعطاء، إزالة، عرض)
    // =====================================================================
    client.on('interactionCreate', async (interaction) => {
        
        if (interaction.isButton() === false) {
            return;
        }
        
        const customIdString = interaction.customId;
        
        const isGiveWarnButton = (customIdString === 'sys_warn_give');
        const isRemoveWarnButton = (customIdString === 'sys_warn_remove');
        const isViewWarnButton = (customIdString === 'sys_warn_view');
        
        const isAnyWarnPanelButton = (isGiveWarnButton || isRemoveWarnButton || isViewWarnButton);
        
        if (isAnyWarnPanelButton === false) {
            return;
        }
        
        // التحقق من صلاحيات الإدارة
        const interactionMemberObject = interaction.member;
        const memberPermissionsObject = interactionMemberObject.permissions;
        const hasAdminPermission = memberPermissionsObject.has('Administrator');
        
        if (hasAdminPermission === false) {
            const noPermissionMessage = '**❌ عذراً، الإدارة فقط يمكنها استخدام هذه اللوحة!**';
            return interaction.reply({ content: noPermissionMessage, ephemeral: true });
        }
        
        // بناء النافذة لطلب الـ ID الخاص بالعضو
        const warnActionModalObject = new ModalBuilder();
        
        let modalCustomIdString = '';
        let modalTitleString = '';
        
        if (isGiveWarnButton === true) {
            modalCustomIdString = 'modal_sys_warn_give';
            modalTitleString = 'إعطاء تحذير لعضو (Give Warn)';
        } else if (isRemoveWarnButton === true) {
            modalCustomIdString = 'modal_sys_warn_remove';
            modalTitleString = 'إزالة تحذيرات عضو (Remove Warns)';
        } else if (isViewWarnButton === true) {
            modalCustomIdString = 'modal_sys_warn_view';
            modalTitleString = 'عرض سجل تحذيرات (View Warns)';
        }
        
        warnActionModalObject.setCustomId(modalCustomIdString);
        warnActionModalObject.setTitle(modalTitleString);
        
        const userIdInputObject = new TextInputBuilder();
        userIdInputObject.setCustomId('target_user_id');
        userIdInputObject.setLabel('أيدي العضو (User ID):');
        userIdInputObject.setStyle(TextInputStyle.Short);
        userIdInputObject.setRequired(true);
        userIdInputObject.setPlaceholder('مثال: 123456789012345678');
        
        const modalActionRowObject = new ActionRowBuilder();
        modalActionRowObject.addComponents(userIdInputObject);
        
        warnActionModalObject.addComponents(modalActionRowObject);
        
        await interaction.showModal(warnActionModalObject);
    });

    // =====================================================================
    // ⚠️ 3. استلام نوافذ التحذير (اختيار اللغة، إزالة التحذير، عرض السجل)
    // =====================================================================
    client.on('interactionCreate', async (interaction) => {
        
        if (interaction.isModalSubmit() === false) {
            return;
        }
        
        const customIdString = interaction.customId;
        const targetUserIdString = interaction.fields.getTextInputValue('target_user_id');
        
        const interactionGuildObject = interaction.guild;
        const currentGuildIdString = interactionGuildObject.id;
        
        const guildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        if (!guildConfigDocument) return;

        // التحقق من وجود العضو
        let targetMemberObject = null;
        try {
            targetMemberObject = await interactionGuildObject.members.fetch(targetUserIdString);
        } catch (fetchError) {
            return interaction.reply({ content: '**❌ لم أتمكن من العثور على هذا العضو. تأكد من الأيدي.**', ephemeral: true });
        }

        if (targetMemberObject.user.bot === true) {
            return interaction.reply({ content: '**❌ لا يمكنك تطبيق هذا الإجراء على بوت!**', ephemeral: true });
        }

        // ==========================================
        // إجراء إعطاء تحذير (خطوة اختيار اللغة)
        // ==========================================
        if (customIdString === 'modal_sys_warn_give') {
            
            if (targetMemberObject.id === interaction.user.id) {
                return interaction.reply({ content: '**❌ لا يمكنك تحذير نفسك!**', ephemeral: true });
            }

            const languageSelectionEmbed = new EmbedBuilder();
            languageSelectionEmbed.setTitle('🌐 اختيار لغة التحذير');
            languageSelectionEmbed.setDescription('بأي لغة تريد إرسال التحذير لهذا العضو؟\n(What language do you want to use?)');
            languageSelectionEmbed.setColor('#5865F2');

            const languageActionRow = new ActionRowBuilder();
            
            const arabicButton = new ButtonBuilder();
            arabicButton.setCustomId(`warnlang_ar_${targetUserIdString}`);
            arabicButton.setLabel('العربية 🇸🇦');
            arabicButton.setStyle(ButtonStyle.Success);
            
            const englishButton = new ButtonBuilder();
            englishButton.setCustomId(`warnlang_en_${targetUserIdString}`);
            englishButton.setLabel('English 🇺🇸');
            englishButton.setStyle(ButtonStyle.Primary);
            
            languageActionRow.addComponents(arabicButton, englishButton);
            
            await interaction.reply({ 
                embeds: [languageSelectionEmbed], 
                components: [languageActionRow], 
                ephemeral: true 
            });
        }

        // ==========================================
        // إجراء إزالة التحذيرات (Remove)
        // ==========================================
        else if (customIdString === 'modal_sys_warn_remove') {
            
            await interaction.deferReply({ ephemeral: true });
            
            let currentWarnsMap = guildConfigDocument.userWarnsRecords;
            if (!currentWarnsMap) {
                currentWarnsMap = new Map();
            }
            
            const hasWarns = currentWarnsMap.has(targetUserIdString);
            
            if (hasWarns === false || currentWarnsMap.get(targetUserIdString).length === 0) {
                return interaction.editReply('**✅ لا يوجد تحذيرات سابقة لهذا العضو لإزالتها.**');
            }
            
            // مسح السجل للعضو
            currentWarnsMap.delete(targetUserIdString);
            guildConfigDocument.userWarnsRecords = currentWarnsMap;
            await guildConfigDocument.save();
            
            interaction.editReply(`**✅ تم إزالة جميع التحذيرات للعضو <@${targetUserIdString}> بنجاح.**`);
            
            // إرسال اللوج الأخضر الفخم
            const warnLogChannelIdString = guildConfigDocument.warnLogChannelId;
            if (warnLogChannelIdString) {
                const warnLogChannelObject = interactionGuildObject.channels.cache.get(warnLogChannelIdString);
                if (warnLogChannelObject) {
                    
                    const removeLogEmbed = new EmbedBuilder();
                    removeLogEmbed.setTitle('إزالة تحذيرات');
                    
                    let removeDesc = `تم إزالة جميع التحذيرات للعضو <@${targetUserIdString}>.\n\n`;
                    removeDesc += `**بواسطة المشرف**\n<@${interaction.user.id}>`;
                    
                    removeLogEmbed.setDescription(removeDesc);
                    removeLogEmbed.setColor('#3ba55d'); // خط أخضر مطابق للصورة
                    removeLogEmbed.setTimestamp();
                    
                    try {
                        await warnLogChannelObject.send({ embeds: [removeLogEmbed] });
                    } catch(e) {}
                }
            }
        }

        // ==========================================
        // إجراء عرض السجل (View) بالخط الأصفر
        // ==========================================
        else if (customIdString === 'modal_sys_warn_view') {
            
            await interaction.deferReply({ ephemeral: true });
            
            let currentWarnsMap = guildConfigDocument.userWarnsRecords;
            if (!currentWarnsMap) {
                currentWarnsMap = new Map();
            }
            
            const userWarnsArray = currentWarnsMap.get(targetUserIdString);
            
            if (!userWarnsArray || userWarnsArray.length === 0) {
                
                const noWarnsEmbed = new EmbedBuilder();
                noWarnsEmbed.setTitle(`سجل تحذيرات ${targetMemberObject.user.username}`);
                noWarnsEmbed.setDescription('لا يوجد سجل تحذيرات سابق لهذا العضو.');
                noWarnsEmbed.setColor('#2b2d31'); // لون داكن
                
                return interaction.editReply({ embeds: [noWarnsEmbed] });
            }
            
            const viewWarnsEmbed = new EmbedBuilder();
            viewWarnsEmbed.setTitle(`سجل تحذيرات ${targetMemberObject.user.username}`);
            
            let recordDescriptionString = '';
            
            for (let i = 0; i < userWarnsArray.length; i++) {
                const recordObj = userWarnsArray[i];
                const recordNumber = i + 1;
                
                const dateObject = new Date(recordObj.date);
                const formattedDateString = dateObject.toLocaleString('en-US'); // تنسيق التاريخ والوقت
                
                recordDescriptionString += `**${recordNumber}. السبب:** ${recordObj.reason}\n`;
                recordDescriptionString += `التاريخ: ${formattedDateString}\n\n`;
            }
            
            viewWarnsEmbed.setDescription(recordDescriptionString);
            viewWarnsEmbed.setColor('#f2a658'); // خط أصفر مطابق للصورة
            
            await interaction.editReply({ embeds: [viewWarnsEmbed] });
        }
    });

    // =====================================================================
    // ⚠️ 4. تفاعل اختيار اللغة وعرض قائمة الأسباب (Select Menu)
    // =====================================================================
    client.on('interactionCreate', async (interaction) => {
        
        if (interaction.isButton() === false) {
            return;
        }
        
        const customIdString = interaction.customId;
        
        const isArabicLanguage = customIdString.startsWith('warnlang_ar_');
        const isEnglishLanguage = customIdString.startsWith('warnlang_en_');
        
        if (isArabicLanguage === false && isEnglishLanguage === false) {
            return;
        }
        
        const currentGuildIdString = interaction.guild.id;
        const guildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        if (!guildConfigDocument) return;

        let targetUserIdString = '';
        let reasonsListArray = [];
        let placeholderString = '';
        let menuCustomId = '';
        
        if (isArabicLanguage === true) {
            targetUserIdString = customIdString.replace('warnlang_ar_', '');
            reasonsListArray = guildConfigDocument.warnReasonsAR;
            placeholderString = 'اختر سبب التحذير...';
            menuCustomId = `selectwarn_ar_${targetUserIdString}`;
            
            if (!reasonsListArray || reasonsListArray.length === 0) {
                return interaction.reply({ content: '**❌ لم يتم إضافة أسباب عربية في الداشبورد.**', ephemeral: true });
            }
        } else {
            targetUserIdString = customIdString.replace('warnlang_en_', '');
            reasonsListArray = guildConfigDocument.warnReasonsEN;
            placeholderString = 'Select warning reason...';
            menuCustomId = `selectwarn_en_${targetUserIdString}`;
            
            if (!reasonsListArray || reasonsListArray.length === 0) {
                return interaction.reply({ content: '**❌ No English reasons added in dashboard.**', ephemeral: true });
            }
        }

        const reasonSelectMenu = new StringSelectMenuBuilder();
        reasonSelectMenu.setCustomId(menuCustomId);
        reasonSelectMenu.setPlaceholder(placeholderString);
        
        for (let i = 0; i < reasonsListArray.length; i++) {
            const reasonString = reasonsListArray[i];
            reasonSelectMenu.addOptions({
                label: reasonString,
                value: `reason_${i}`, // نحفظ الـ Index
            });
        }
        
        const selectMenuActionRow = new ActionRowBuilder();
        selectMenuActionRow.addComponents(reasonSelectMenu);
        
        await interaction.update({ 
            content: '**رجاءً، اختر السبب من القائمة أدناه:**',
            embeds: [], 
            components: [selectMenuActionRow] 
        });
    });

    // =====================================================================
    // ⚠️ 5. تنفيذ التحذير بعد اختيار السبب من القائمة (التطبيق الفعلي)
    // =====================================================================
    client.on('interactionCreate', async (interaction) => {
        
        if (interaction.isStringSelectMenu() === false) {
            return;
        }
        
        const customIdString = interaction.customId;
        const isArabicSelection = customIdString.startsWith('selectwarn_ar_');
        const isEnglishSelection = customIdString.startsWith('selectwarn_en_');
        
        if (isArabicSelection === false && isEnglishSelection === false) {
            return;
        }
        
        await interaction.deferUpdate();
        
        const interactionGuildObject = interaction.guild;
        const guildConfigDocument = await GuildConfig.findOne({ guildId: interactionGuildObject.id });
        if (!guildConfigDocument) return;

        let targetUserIdString = '';
        let chosenReasonString = '';
        
        const selectedValueString = interaction.values[0]; // reason_0
        const selectedIndexNumber = parseInt(selectedValueString.replace('reason_', ''));

        if (isArabicSelection === true) {
            targetUserIdString = customIdString.replace('selectwarn_ar_', '');
            chosenReasonString = guildConfigDocument.warnReasonsAR[selectedIndexNumber];
        } else {
            targetUserIdString = customIdString.replace('selectwarn_en_', '');
            chosenReasonString = guildConfigDocument.warnReasonsEN[selectedIndexNumber];
        }

        let targetMemberObject = null;
        try {
            targetMemberObject = await interactionGuildObject.members.fetch(targetUserIdString);
        } catch (err) {
            return interaction.editReply({ content: '**❌ لم أتمكن من العثور على العضو.**', components: [] });
        }

        // ==========================================
        // حفظ التحذير في الداتابيز
        // ==========================================
        let currentWarnsMap = guildConfigDocument.userWarnsRecords;
        if (!currentWarnsMap) {
            currentWarnsMap = new Map();
        }
        
        let userWarnsArray = currentWarnsMap.get(targetUserIdString);
        if (!userWarnsArray) {
            userWarnsArray = [];
        }
        
        const newWarnRecordObject = {
            reason: chosenReasonString,
            date: new Date(),
            moderatorId: interaction.user.id
        };
        
        userWarnsArray.push(newWarnRecordObject);
        currentWarnsMap.set(targetUserIdString, userWarnsArray);
        
        guildConfigDocument.userWarnsRecords = currentWarnsMap;
        await guildConfigDocument.save();
        
        const totalWarnsNumber = userWarnsArray.length;
        const maxWarningsAllowedNumber = guildConfigDocument.warnMax;
        const autoPunishmentActionString = guildConfigDocument.warnAction;
        
        let finalActionTakenString = isArabicSelection ? 'تم إعطاء تحذير فقط.' : 'Warned only.';
        
        // ==========================================
        // تطبيق العقاب التلقائي إذا لزم الأمر
        // ==========================================
        if (totalWarnsNumber >= maxWarningsAllowedNumber) {
            
            // تصفير العداد
            currentWarnsMap.delete(targetUserIdString);
            guildConfigDocument.userWarnsRecords = currentWarnsMap;
            await guildConfigDocument.save();
            
            const punishmentReasonString = `Max warnings reached. Last reason: ${chosenReasonString}`;
            
            try {
                if (autoPunishmentActionString === 'timeout') {
                    const timeoutDurationMs = 24 * 60 * 60 * 1000; 
                    await targetMemberObject.timeout(timeoutDurationMs, punishmentReasonString);
                    finalActionTakenString = isArabicSelection ? 'تجاوز الحد! تم تطبيق Timeout ليوم.' : 'Max reached! Timeout applied.';
                } else if (autoPunishmentActionString === 'kick') {
                    await targetMemberObject.kick(punishmentReasonString);
                    finalActionTakenString = isArabicSelection ? 'تجاوز الحد! تم طرده.' : 'Max reached! Kicked.';
                } else if (autoPunishmentActionString === 'ban') {
                    await targetMemberObject.ban({ reason: punishmentReasonString });
                    finalActionTakenString = isArabicSelection ? 'تجاوز الحد! تم حظره.' : 'Max reached! Banned.';
                }
            } catch (punishmentError) {
                finalActionTakenString = isArabicSelection ? 'تجاوز الحد، فشل العقاب بسبب الصلاحيات.' : 'Max reached, punishment failed.';
            }
            
        } else {
            finalActionTakenString = isArabicSelection ? `تحذير رقم ${totalWarnsNumber} من ${maxWarningsAllowedNumber}.` : `Warn ${totalWarnsNumber}/${maxWarningsAllowedNumber}.`;
        }
        
        // ==========================================
        // إرسال اللوج الأحمر الفخم
        // ==========================================
        const warnLogChannelIdString = guildConfigDocument.warnLogChannelId;
        if (warnLogChannelIdString) {
            const warnLogChannelObject = interactionGuildObject.channels.cache.get(warnLogChannelIdString);
            if (warnLogChannelObject) {
                
                const warnLogEmbedObject = new EmbedBuilder();
                warnLogEmbedObject.setTitle('تحذير جديد');
                
                let logDescriptionString = '';
                logDescriptionString += `**العضو**\n<@${targetUserIdString}>\n\n`;
                logDescriptionString += `**السبب**\n${chosenReasonString}\n\n`;
                logDescriptionString += `**بواسطة المشرف**\n<@${interaction.user.id}>\n\n`;
                logDescriptionString += `**التاريخ**\n${new Date().toLocaleString('en-US')}`;
                
                warnLogEmbedObject.setDescription(logDescriptionString);
                warnLogEmbedObject.setColor('#ed4245'); // خط أحمر مطابق للصورة
                
                try {
                    await warnLogChannelObject.send({ embeds: [warnLogEmbedObject] });
                } catch (logSendError) {}
            }
        }
        
        // ==========================================
        // رسالة الخاص (بدون اسم الإداري - Privacy)
        // ==========================================
        try {
            const userWarningDmEmbed = new EmbedBuilder();
            
            if (isArabicSelection === true) {
                userWarningDmEmbed.setTitle(`⚠️ لقد تلقيت تحذيراً في سيرفر ${interactionGuildObject.name}`);
                let dmDescriptionString = `**السبب:** ${chosenReasonString}\n\n`;
                dmDescriptionString += `**الحالة:** ${finalActionTakenString}\n`;
                dmDescriptionString += `يرجى الالتزام بالقوانين لتجنب العقوبات.`;
                userWarningDmEmbed.setDescription(dmDescriptionString);
            } else {
                userWarningDmEmbed.setTitle(`⚠️ You have been warned in ${interactionGuildObject.name}`);
                let dmDescriptionString = `**Reason:** ${chosenReasonString}\n\n`;
                dmDescriptionString += `**Status:** ${finalActionTakenString}\n`;
                dmDescriptionString += `Please follow the rules to avoid punishments.`;
                userWarningDmEmbed.setDescription(dmDescriptionString);
            }
            
            userWarningDmEmbed.setColor('#ed4245');
            await targetMemberObject.send({ embeds: [userWarningDmEmbed] });
        } catch (dmSendError) {}
        
        // الرد على الإداري بنجاح العملية
        const finalAdminReplyString = isArabicSelection ? `**✅ تم إرسال التحذير بنجاح إلى <@${targetUserIdString}>.**` : `**✅ Warning successfully sent to <@${targetUserIdString}>.**`;
        await interaction.editReply({ content: finalAdminReplyString, components: [] });
    });

};
