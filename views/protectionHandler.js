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
const PermissionFlagsBits = discordLibrary.PermissionFlagsBits;

// استدعاء قاعدة البيانات الشاملة
const GuildConfig = require('./models/GuildConfig');

// =====================================================================
// 🧠 خرائط الذاكرة (Memory Maps) لتتبع السبام والتحذيرات
// =====================================================================
const spamTrackingMap = new Map();
const userWarningsMap = new Map();

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
            // تجاهل الإداريين من الحماية، وننتقل لفحص أوامر لوحة التحذيرات
            
            const currentGuildIdString = messageGuildObject.id;
            const guildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
            
            if (!guildConfigDocument) {
                return;
            }
            
            let prefixString = guildConfigDocument.prefix;
            if (!prefixString) {
                prefixString = '!';
            }
            
            const messageContentString = message.content;
            const fullWarnCommand = prefixString + 'warnsetup';
            
            // 🚨 أمر إرسال لوحة التحذيرات
            if (messageContentString === fullWarnCommand) {
                
                const warnPanelEmbedObject = new EmbedBuilder();
                
                let panelTitleString = guildConfigDocument.warnPanelTitle;
                if (!panelTitleString) {
                    panelTitleString = 'لوحة تحكم التحذيرات';
                }
                warnPanelEmbedObject.setTitle(panelTitleString);
                
                let panelDescriptionString = guildConfigDocument.warnPanelDesc;
                if (!panelDescriptionString) {
                    panelDescriptionString = 'استخدم الأزرار أدناه لإعطاء تحذير للأعضاء المخالفين.';
                }
                warnPanelEmbedObject.setDescription(panelDescriptionString);
                
                let panelColorHex = guildConfigDocument.warnPanelColor;
                if (!panelColorHex) {
                    panelColorHex = '#ed4245';
                }
                warnPanelEmbedObject.setColor(panelColorHex);
                
                const guildIconUrl = messageGuildObject.iconURL({ dynamic: true });
                warnPanelEmbedObject.setThumbnail(guildIconUrl);

                const warnReasonsArray = guildConfigDocument.warnReasons;
                const actionRowsArray = [];
                let currentActionRowObject = new ActionRowBuilder();

                if (warnReasonsArray && warnReasonsArray.length > 0) {
                    
                    for (let i = 0; i < warnReasonsArray.length; i++) {
                        
                        const reasonString = warnReasonsArray[i];
                        
                        if (i > 0 && i % 5 === 0) {
                            actionRowsArray.push(currentActionRowObject);
                            currentActionRowObject = new ActionRowBuilder();
                        }
                        
                        const reasonButtonObject = new ButtonBuilder();
                        
                        const buttonCustomIdString = `warnbtn_${i}`;
                        reasonButtonObject.setCustomId(buttonCustomIdString);
                        
                        reasonButtonObject.setLabel(reasonString);
                        reasonButtonObject.setStyle(ButtonStyle.Danger);
                        
                        currentActionRowObject.addComponents(reasonButtonObject);
                    }
                    
                    actionRowsArray.push(currentActionRowObject);
                } else {
                    return message.reply('**❌ لا يوجد أسباب تحذير مسجلة في الداشبورد! يرجى إضافتها أولاً.**');
                }

                try {
                    await message.delete();
                } catch (deleteError) {}

                return message.channel.send({ 
                    embeds: [warnPanelEmbedObject], 
                    components: actionRowsArray 
                });
            }
            
            return; // إنهاء التنفيذ للإدارة
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
                    
                    // إذا أرسل أكثر من 5 رسائل في 5 ثواني
                    if (userSpamDataObject.messageCount >= 5) {
                        
                        try {
                            await message.delete();
                        } catch (deleteSpamError) {}
                        
                        // تصفير العداد لتجنب التكرار
                        spamTrackingMap.delete(messageAuthorIdString);
                        
                        // إعطاء تايم أوت لمدة 5 دقائق (300,000 مللي ثانية)
                        const timeoutDurationNumber = 5 * 60 * 1000;
                        const timeoutReasonString = 'نظام الحماية: إرسال رسائل متكررة (Spam)';
                        
                        try {
                            await interactionMemberObject.timeout(timeoutDurationNumber, timeoutReasonString);
                            
                            const spamTimeoutMessage = `**🔇 تم إعطاء <@${messageAuthorIdString}> تايم أوت لمدة 5 دقائق بسبب السبام.**`;
                            await message.channel.send(spamTimeoutMessage);
                            
                        } catch (timeoutApplyError) {}
                    }
                    
                } else {
                    
                    // مر أكثر من 5 ثواني، تصفير العداد
                    userSpamDataObject.messageCount = 1;
                    userSpamDataObject.lastMessageTime = currentTimeNumber;
                    spamTrackingMap.set(messageAuthorIdString, userSpamDataObject);
                    
                }
            }
        }
    });

    // =====================================================================
    // ⚠️ 2. تفاعلات لوحة التحذيرات (Warn Panel Interactions)
    // =====================================================================
    client.on('interactionCreate', async (interaction) => {
        
        if (interaction.isButton() === false) {
            return;
        }
        
        const customIdString = interaction.customId;
        const isWarnButtonAction = customIdString.startsWith('warnbtn_');
        
        if (isWarnButtonAction === false) {
            return;
        }
        
        // التحقق من صلاحيات من يضغط على زر التحذير
        const interactionMemberObject = interaction.member;
        const memberPermissionsObject = interactionMemberObject.permissions;
        const hasAdminPermission = memberPermissionsObject.has('Administrator');
        
        if (hasAdminPermission === false) {
            const noPermissionMessage = '**❌ عذراً، الإدارة فقط يمكنها إعطاء تحذيرات!**';
            return interaction.reply({ content: noPermissionMessage, ephemeral: true });
        }
        
        // استخراج رقم السبب من الـ ID
        const customIdPartsArray = customIdString.split('_');
        const reasonIndexString = customIdPartsArray[1];
        
        // بناء نافذة لإدخال أيدي العضو المخالف
        const warnModalObject = new ModalBuilder();
        
        const modalCustomIdString = `modalwarn_${reasonIndexString}`;
        warnModalObject.setCustomId(modalCustomIdString);
        
        const modalTitleString = 'تطبيق التحذير على عضو';
        warnModalObject.setTitle(modalTitleString);
        
        const userIdInputObject = new TextInputBuilder();
        userIdInputObject.setCustomId('warn_user_id');
        userIdInputObject.setLabel('أيدي العضو المخالف (User ID):');
        userIdInputObject.setStyle(TextInputStyle.Short);
        userIdInputObject.setRequired(true);
        userIdInputObject.setPlaceholder('مثال: 123456789012345678');
        
        const modalActionRowObject = new ActionRowBuilder();
        modalActionRowObject.addComponents(userIdInputObject);
        
        warnModalObject.addComponents(modalActionRowObject);
        
        await interaction.showModal(warnModalObject);
    });

    // =====================================================================
    // ⚠️ 3. استلام نافذة التحذير وتطبيق العقاب (Warn Logic)
    // =====================================================================
    client.on('interactionCreate', async (interaction) => {
        
        if (interaction.isModalSubmit() === false) {
            return;
        }
        
        const customIdString = interaction.customId;
        const isWarnModalAction = customIdString.startsWith('modalwarn_');
        
        if (isWarnModalAction === false) {
            return;
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        const interactionGuildObject = interaction.guild;
        const currentGuildIdString = interactionGuildObject.id;
        const guildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        
        if (!guildConfigDocument) {
            return interaction.editReply('**❌ لم يتم العثور على إعدادات السيرفر.**');
        }
        
        const customIdPartsArray = customIdString.split('_');
        const reasonIndexString = customIdPartsArray[1];
        const reasonIndexNumber = parseInt(reasonIndexString);
        
        const warnReasonsArray = guildConfigDocument.warnReasons;
        let selectedReasonString = 'مخالفة القوانين';
        
        if (warnReasonsArray && warnReasonsArray.length > reasonIndexNumber) {
            selectedReasonString = warnReasonsArray[reasonIndexNumber];
        }
        
        const targetUserIdString = interaction.fields.getTextInputValue('warn_user_id');
        
        let targetMemberObject = null;
        try {
            targetMemberObject = await interactionGuildObject.members.fetch(targetUserIdString);
        } catch (fetchError) {
            return interaction.editReply('**❌ لم أتمكن من العثور على هذا العضو في السيرفر. تأكد من الأيدي.**');
        }
        
        // التحقق من عدم تحذير البوت أو الإدارة لنفسها
        if (targetMemberObject.user.bot === true) {
            return interaction.editReply('**❌ لا يمكنك تحذير بوت!**');
        }
        
        if (targetMemberObject.id === interaction.user.id) {
            return interaction.editReply('**❌ لا يمكنك تحذير نفسك!**');
        }
        
        // حساب عدد التحذيرات للعضو
        const memoryKeyString = `${currentGuildIdString}_${targetUserIdString}`;
        let currentUserWarnsNumber = userWarningsMap.get(memoryKeyString);
        
        if (!currentUserWarnsNumber) {
            currentUserWarnsNumber = 0;
        }
        
        currentUserWarnsNumber = currentUserWarnsNumber + 1;
        userWarningsMap.set(memoryKeyString, currentUserWarnsNumber);
        
        const maxWarningsAllowedNumber = guildConfigDocument.warnMax;
        const autoPunishmentActionString = guildConfigDocument.warnAction;
        
        let finalActionTakenString = 'تم إعطاء تحذير فقط.';
        
        // التحقق مما إذا وصل العضو للحد الأقصى للتحذيرات
        if (currentUserWarnsNumber >= maxWarningsAllowedNumber) {
            
            // تطبيق العقاب وتصفير العداد
            userWarningsMap.delete(memoryKeyString);
            
            const punishmentReasonString = `تجاوز الحد الأقصى للتحذيرات (${maxWarningsAllowedNumber}). السبب الأخير: ${selectedReasonString}`;
            
            try {
                if (autoPunishmentActionString === 'timeout') {
                    
                    const timeoutDurationMs = 24 * 60 * 60 * 1000; // يوم كامل كافتراضي
                    await targetMemberObject.timeout(timeoutDurationMs, punishmentReasonString);
                    finalActionTakenString = 'تجاوز الحد الأقصى! تم إعطائه Timeout لمدة يوم.';
                    
                } else if (autoPunishmentActionString === 'kick') {
                    
                    await targetMemberObject.kick(punishmentReasonString);
                    finalActionTakenString = 'تجاوز الحد الأقصى! تم طرده من السيرفر (Kick).';
                    
                } else if (autoPunishmentActionString === 'ban') {
                    
                    await targetMemberObject.ban({ reason: punishmentReasonString });
                    finalActionTakenString = 'تجاوز الحد الأقصى! تم حظره من السيرفر (Ban).';
                    
                }
            } catch (punishmentError) {
                finalActionTakenString = 'تجاوز الحد الأقصى، ولكن لم أتمكن من معاقبته (يرجى التحقق من صلاحياتي).';
            }
            
        } else {
            finalActionTakenString = `تحذير رقم ${currentUserWarnsNumber} من أصل ${maxWarningsAllowedNumber}.`;
        }
        
        // إرسال رسالة نجاح للإداري في الخاص
        const successMessageContent = `**✅ تم تحذير العضو بنجاح.**\n**السبب:** ${selectedReasonString}\n**الحالة:** ${finalActionTakenString}`;
        await interaction.editReply(successMessageContent);
        
        // إرسال اللوج إلى روم التحذيرات
        const warnLogChannelIdString = guildConfigDocument.warnLogChannelId;
        
        if (warnLogChannelIdString) {
            
            const warnLogChannelObject = interactionGuildObject.channels.cache.get(warnLogChannelIdString);
            
            if (warnLogChannelObject) {
                
                const warnLogEmbedObject = new EmbedBuilder();
                warnLogEmbedObject.setTitle('⚠️ Member Warned (عضو تلقى تحذيراً)');
                
                let logDescriptionString = '';
                logDescriptionString += `**👤 العضو:** <@${targetUserIdString}>\n`;
                logDescriptionString += `**🛡️ بواسطة الإداري:** <@${interaction.user.id}>\n\n`;
                logDescriptionString += `**📝 السبب:**\n>>> ${selectedReasonString}\n\n`;
                logDescriptionString += `**📊 الحالة:**\n${finalActionTakenString}`;
                
                warnLogEmbedObject.setDescription(logDescriptionString);
                
                let warnPanelColorHex = guildConfigDocument.warnPanelColor;
                if (!warnPanelColorHex) {
                    warnPanelColorHex = '#f2a658';
                }
                warnLogEmbedObject.setColor(warnPanelColorHex);
                
                const targetUserAvatarUrl = targetMemberObject.user.displayAvatarURL({ dynamic: true });
                warnLogEmbedObject.setThumbnail(targetUserAvatarUrl);
                warnLogEmbedObject.setTimestamp();
                
                try {
                    await warnLogChannelObject.send({ embeds: [warnLogEmbedObject] });
                } catch (logSendError) {}
            }
        }
        
        // محاولة إرسال رسالة في الخاص للعضو لتحذيره
        try {
            const userWarningDmEmbed = new EmbedBuilder();
            userWarningDmEmbed.setTitle(`⚠️ لقد تلقيت تحذيراً في سيرفر ${interactionGuildObject.name}`);
            
            let dmDescriptionString = `**السبب:** ${selectedReasonString}\n\n`;
            dmDescriptionString += `**الحالة:** ${finalActionTakenString}\n`;
            dmDescriptionString += `يرجى الالتزام بالقوانين لتجنب العقوبات.`;
            
            userWarningDmEmbed.setDescription(dmDescriptionString);
            userWarningDmEmbed.setColor('#ed4245');
            
            await targetMemberObject.send({ embeds: [userWarningDmEmbed] });
        } catch (dmSendError) {}
        
    });

};
