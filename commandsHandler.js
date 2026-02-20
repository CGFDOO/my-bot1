// =====================================================================
// 📦 استدعاء المكاتب الأساسية (مفرودة بالكامل بدون أي اختصار)
// =====================================================================
const discordLibrary = require('discord.js');
const EmbedBuilder = discordLibrary.EmbedBuilder;
const ActionRowBuilder = discordLibrary.ActionRowBuilder;
const ButtonBuilder = discordLibrary.ButtonBuilder;
const ButtonStyle = discordLibrary.ButtonStyle;
const PermissionFlagsBits = discordLibrary.PermissionFlagsBits;

// استدعاء قاعدة البيانات الشاملة
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    
    // =====================================================================
    // 🎧 الحدث الرئيسي لقراءة الرسائل والأوامر في السيرفر
    // =====================================================================
    client.on('messageCreate', async (message) => {
        
        // 1. تجاهل رسائل البوتات
        const messageAuthorIsBot = message.author.bot;
        if (messageAuthorIsBot === true) {
            return;
        }

        // 2. التأكد أن الرسالة داخل السيرفر
        const messageGuildObject = message.guild;
        if (!messageGuildObject) {
            return;
        }

        // 3. جلب الإعدادات من الداتابيز
        const currentGuildIdString = messageGuildObject.id;
        const guildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        
        if (!guildConfigDocument) {
            return;
        }

        // 4. نظام الردود التلقائية
        const autoRespondersArray = guildConfigDocument.autoResponders;
        
        if (autoRespondersArray && autoRespondersArray.length > 0) {
            
            for (let i = 0; i < autoRespondersArray.length; i++) {
                
                const responderObject = autoRespondersArray[i];
                const messageContentString = message.content;
                const wordToMatchString = responderObject.word;
                
                if (messageContentString.includes(wordToMatchString) === true) {
                    
                    const replyContentString = `**${responderObject.reply}**`;
                    
                    try {
                        await message.reply({ content: replyContentString });
                    } catch (replyError) {}
                }
            }
        }

        // 5. إعداد البريفكس (Prefix)
        let prefixString = guildConfigDocument.prefix;
        if (!prefixString) {
            prefixString = '!';
        }
        
        const messageStartsWithPrefix = message.content.startsWith(prefixString);
        if (messageStartsWithPrefix === false) {
            return;
        }

        // 6. فصل اسم الأمر
        const messageContentWithoutPrefix = message.content.slice(prefixString.length);
        const trimmedMessageContent = messageContentWithoutPrefix.trim();
        const argumentsArray = trimmedMessageContent.split(/ +/);
        
        const rawCommandName = argumentsArray.shift();
        const commandNameString = rawCommandName.toLowerCase();
        
        const fullCommandString = prefixString + commandNameString; 

        // =====================================================================
        // 🛠️ دالة التحقق من الصلاحيات (لفحص الرتب)
        // =====================================================================
        const checkUserRoleFunction = (allowedRolesArray) => {
            
            const interactionMemberObject = message.member;
            const memberPermissionsObject = interactionMemberObject.permissions;
            
            if (!allowedRolesArray || allowedRolesArray.length === 0) {
                const hasAdminPermission = memberPermissionsObject.has('Administrator');
                if (hasAdminPermission === true) {
                    return true;
                } else {
                    return false;
                }
            }
            
            const hasAdminPermissionOverride = memberPermissionsObject.has('Administrator');
            if (hasAdminPermissionOverride === true) {
                return true;
            }
            
            const memberRolesCollection = interactionMemberObject.roles.cache;
            
            for (let i = 0; i < allowedRolesArray.length; i++) {
                const requiredRoleId = allowedRolesArray[i];
                const memberHasRole = memberRolesCollection.has(requiredRoleId);
                
                if (memberHasRole === true) {
                    return true;
                }
            }
            
            return false;
        };

        // =====================================================================
        // 🛠️ دالة إرسال اللوجات للرومات المخصصة
        // =====================================================================
        const sendActionLogFunction = async (logChannelIdString, logTitleString, logDescriptionString, logColorHex) => {
            
            if (!logChannelIdString) {
                return;
            }
            
            const targetLogChannelObject = message.guild.channels.cache.get(logChannelIdString);
            
            if (!targetLogChannelObject) {
                return;
            }
            
            const logEmbedObject = new EmbedBuilder();
            logEmbedObject.setTitle(logTitleString);
            logEmbedObject.setDescription(logDescriptionString);
            logEmbedObject.setColor(logColorHex);
            logEmbedObject.setTimestamp();
            
            const guildIconUrl = message.guild.iconURL({ dynamic: true });
            logEmbedObject.setFooter({ text: message.guild.name, iconURL: guildIconUrl });
            
            try {
                await targetLogChannelObject.send({ embeds: [logEmbedObject] });
            } catch (logError) {}
        };

        // =====================================================================
        // 📢 أمر النداء واستدعاء عضو (!come) - إرسال في الخاص (DM)
        // =====================================================================
        const cmdComeString = guildConfigDocument.cmdCome;
        
        if (fullCommandString === cmdComeString) {
            
            const allowedComeRolesArray = guildConfigDocument.cmdComeRoles;
            const hasPermissionToCome = checkUserRoleFunction(allowedComeRolesArray);
            
            if (hasPermissionToCome === false) {
                return message.reply('**❌ لا تمتلك صلاحية استخدام هذا الأمر.**');
            }
            
            const messageMentionsCollection = message.mentions.members;
            let targetUserObject = messageMentionsCollection.first();
            
            if (!targetUserObject) {
                const firstArgumentString = argumentsArray[0];
                const guildMembersCollection = message.guild.members.cache;
                targetUserObject = guildMembersCollection.get(firstArgumentString);
            }
            
            if (!targetUserObject) {
                return message.reply('**⚠️ الرجاء منشن العضو أو كتابة الأيدي الخاص به.**');
            }

            const comeEmbedObject = new EmbedBuilder();
            comeEmbedObject.setTitle('📢 استدعاء إداري (Summon)');
            
            let comeDescriptionString = `**مرحباً <@${targetUserObject.id}>،**\n\n`;
            comeDescriptionString += `تم استدعائك للتوجه فوراً إلى سيرفر: **${message.guild.name}**\n`;
            comeDescriptionString += `الروم المطلوبة: <#${message.channel.id}>\n`;
            comeDescriptionString += `بواسطة: <@${message.author.id}>\n\n`;
            comeDescriptionString += `يرجى التوجه هناك في أسرع وقت.`;
            
            comeEmbedObject.setDescription(comeDescriptionString);
            comeEmbedObject.setColor('#5865F2'); 
            
            const guildIconUrl = message.guild.iconURL({ dynamic: true });
            comeEmbedObject.setThumbnail(guildIconUrl);
            comeEmbedObject.setTimestamp();

            try {
                await message.delete();
            } catch (deleteError) {}

            try {
                // محاولة الإرسال في الخاص
                await targetUserObject.send({ embeds: [comeEmbedObject] });
                
                const successComeEmbed = new EmbedBuilder();
                successComeEmbed.setDescription(`**✅ تم إرسال الاستدعاء للعضو <@${targetUserObject.id}> في الخاص بنجاح.**`);
                successComeEmbed.setColor('#3ba55d');
                
                return message.channel.send({ embeds: [successComeEmbed] });
                
            } catch (dmError) {
                // لو قفل الخاص، نبعتها في الروم كبديل مع منشن
                const fallbackMessageContent = `**❌ العضو <@${targetUserObject.id}> قام بإغلاق الرسائل الخاصة، هذا نداء له هنا:**`;
                return message.channel.send({ content: fallbackMessageContent, embeds: [comeEmbedObject] });
            }
        }

        // =====================================================================
        // 🤝 أمر تقييم الـ MiddleMan (!done) وسحب تفاصيل التريد
        // =====================================================================
        const cmdDoneString = guildConfigDocument.cmdDone;
        
        if (fullCommandString === cmdDoneString) {
            
            const allowedDoneRolesArray = guildConfigDocument.cmdDoneRoles;
            const hasPermissionToDone = checkUserRoleFunction(allowedDoneRolesArray);
            
            if (hasPermissionToDone === false) {
                return message.reply('**❌ لا تمتلك صلاحية استخدام هذا الأمر.**');
            }
            
            const currentChannelObject = message.channel;
            let currentTopicString = currentChannelObject.topic;
            
            if (!currentTopicString) {
                return message.reply('**❌ لا يمكن استخدام هذا الأمر إلا داخل تكت مسجل.**');
            }
            
            const topicPartsArray = currentTopicString.split('_');
            const ticketOwnerIdString = topicPartsArray[0]; 
            
            if (!ticketOwnerIdString || ticketOwnerIdString === 'none') {
                return message.reply('**❌ لم أتمكن من التعرف على صاحب التكت.**');
            }
            
            try {
                
                // سحب تفاصيل التريد المكتوبة بخط >>> من الشات
                let extractedTradeTextString = 'لا يوجد تفاصيل مسجلة (تم التقييم بدون نافذة تريد).';
                const pastMessagesCollection = await currentChannelObject.messages.fetch({ limit: 100 });
                
                const tradeMessageFoundObject = pastMessagesCollection.find(msgObj => {
                    const hasEmbeds = msgObj.embeds && msgObj.embeds.length > 0;
                    if (hasEmbeds === true) {
                        const firstEmbedTitle = msgObj.embeds[0].title;
                        if (firstEmbedTitle === '⚖️ Trade Approval Request') {
                            return true;
                        }
                    }
                    return false;
                });
                
                if (tradeMessageFoundObject) {
                    const targetEmbedObject = tradeMessageFoundObject.embeds[0];
                    const embedDescriptionString = targetEmbedObject.description;
                    
                    // استخدام نفس الفاصل اللي عملناه في ملف التكتات (>>> )
                    const splitByDetailsArray = embedDescriptionString.split('**Details:**\n>>> ');
                    
                    if (splitByDetailsArray.length > 1) {
                        const textAfterDetailsString = splitByDetailsArray[1];
                        const finalDetailsTextString = textAfterDetailsString.split('\n\n⏳')[0]; 
                        extractedTradeTextString = finalDetailsTextString;
                    }
                }

                const interactionGuildObject = message.guild;
                const ticketOwnerMemberObject = await interactionGuildObject.members.fetch(ticketOwnerIdString);
                const currentGuildNameString = interactionGuildObject.name;
                
                const finalRatingEmbedObject = new EmbedBuilder();
                let finalEmbedTitleString = '';
                let finalEmbedDescriptionString = '';
                
                const isCustomRatingStyle = (guildConfigDocument.ratingStyle === 'custom');
                const customMiddlemanText = guildConfigDocument.customMiddlemanRatingText;
                
                if (isCustomRatingStyle === true && customMiddlemanText) {
                    
                    finalEmbedTitleString = guildConfigDocument.customMiddlemanRatingTitle;
                    if (!finalEmbedTitleString) {
                        finalEmbedTitleString = 'تقييم الوساطة';
                    }
                    
                    finalEmbedDescriptionString = customMiddlemanText;
                    finalEmbedDescriptionString = finalEmbedDescriptionString.replace(/\[staff\]/g, `<@${message.author.id}>`);
                    finalEmbedDescriptionString = finalEmbedDescriptionString.replace(/\[user\]/g, `<@${ticketOwnerMemberObject.id}>`);
                    finalEmbedDescriptionString = finalEmbedDescriptionString.replace(/\[server\]/g, currentGuildNameString);
                    
                } else {
                    finalEmbedTitleString = 'تقييم الوساطة';
                    
                    finalEmbedDescriptionString = `لقد أتممت معاملتك بنجاح في سيرفر **${currentGuildNameString}**.\n\n`;
                    finalEmbedDescriptionString += `يرجى تقييم خدمة الوسيط <@${message.author.id}> بالضغط على النجوم في الأسفل.\n`;
                }
                
                finalEmbedDescriptionString += `\n-------------------------\n`;
                finalEmbedDescriptionString += `> **📦 تفاصيل المعاملة:**\n`;
                finalEmbedDescriptionString += `>>> ${extractedTradeTextString}\n`;
                
                finalRatingEmbedObject.setTitle(finalEmbedTitleString);
                finalRatingEmbedObject.setDescription(finalEmbedDescriptionString);
                
                let mediatorColorHex = guildConfigDocument.basicRatingColor;
                if (!mediatorColorHex) {
                    mediatorColorHex = '#f2a658';
                }
                finalRatingEmbedObject.setColor(mediatorColorHex);
                
                const guildIconUrl = interactionGuildObject.iconURL({ dynamic: true });
                finalRatingEmbedObject.setFooter({ 
                    text: currentGuildNameString, 
                    iconURL: guildIconUrl 
                });
                
                const starsActionRowObject = new ActionRowBuilder();
                
                const messageAuthorId = message.author.id;
                const guildId = interactionGuildObject.id;
                
                const star1Button = new ButtonBuilder().setCustomId(`rate_mediator_1_${messageAuthorId}_${guildId}`).setLabel('⭐').setStyle(ButtonStyle.Secondary);
                const star2Button = new ButtonBuilder().setCustomId(`rate_mediator_2_${messageAuthorId}_${guildId}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary);
                const star3Button = new ButtonBuilder().setCustomId(`rate_mediator_3_${messageAuthorId}_${guildId}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                const star4Button = new ButtonBuilder().setCustomId(`rate_mediator_4_${messageAuthorId}_${guildId}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                const star5Button = new ButtonBuilder().setCustomId(`rate_mediator_5_${messageAuthorId}_${guildId}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                
                starsActionRowObject.addComponents(star1Button, star2Button, star3Button, star4Button, star5Button);
                
                await ticketOwnerMemberObject.send({ 
                    embeds: [finalRatingEmbedObject], 
                    components: [starsActionRowObject] 
                });
                
                const doneSuccessEmbed = new EmbedBuilder();
                doneSuccessEmbed.setDescription('**✅ تم إرسال طلب التقييم (مع تفاصيل التريد) للعضو في الخاص بنجاح.**');
                doneSuccessEmbed.setColor('#3ba55d');
                
                return message.reply({ embeds: [doneSuccessEmbed] });
                
            } catch (err) { 
                const doneFailEmbed = new EmbedBuilder();
                doneFailEmbed.setDescription('**❌ لا يمكن إرسال رسالة لهذا العضو (الخاص مغلق).**');
                doneFailEmbed.setColor('#ed4245');
                return message.reply({ embeds: [doneFailEmbed] }); 
            }
        }

        // =====================================================================
        // ⚖️ أمر التريد (!trade) - بدون أي منشن هنا
        // =====================================================================
        const cmdTradeString = guildConfigDocument.cmdTrade;
        
        if (fullCommandString === cmdTradeString) {
            
            const allowedTradeRolesArray = guildConfigDocument.cmdTradeRoles;
            const hasPermissionToTrade = checkUserRoleFunction(allowedTradeRolesArray);
            
            if (hasPermissionToTrade === false) {
                return message.reply('**❌ لا تمتلك صلاحية استخدام هذا الأمر.**');
            }
            
            const tradeInitEmbedObject = new EmbedBuilder();
            tradeInitEmbedObject.setTitle('📝 تفاصيل التريد');
            tradeInitEmbedObject.setDescription('يرجى الضغط على الزر أدناه لكتابة تفاصيل التريد (الحساب، السعر، وغيرها).');
            
            let tradeColorHex = guildConfigDocument.tradeEmbedColor;
            if (!tradeColorHex) {
                tradeColorHex = '#f2a658';
            }
            tradeInitEmbedObject.setColor(tradeColorHex);
            
            const authorAvatarUrl = message.author.displayAvatarURL({ dynamic: true });
            tradeInitEmbedObject.setFooter({ 
                text: `Requested by: ${message.author.username}`, 
                iconURL: authorAvatarUrl 
            });

            const tradeActionRowObject = new ActionRowBuilder();
            
            const openTradeModalButton = new ButtonBuilder();
            openTradeModalButton.setCustomId('open_trade_modal');
            openTradeModalButton.setLabel('كتابة تفاصيل التريد ✍️');
            openTradeModalButton.setStyle(ButtonStyle.Primary);
            
            tradeActionRowObject.addComponents(openTradeModalButton);

            try {
                await message.delete();
            } catch (deleteError) {}
            
            return message.channel.send({ 
                embeds: [tradeInitEmbedObject], 
                components: [tradeActionRowObject] 
            });
        }

        // =====================================================================
        // ⏳ أمر التايم أوت (!timeout) وإخفاء هوية المشرف في رسالة الخاص
        // =====================================================================
        const cmdTimeoutString = guildConfigDocument.cmdTimeout;
        
        if (fullCommandString === cmdTimeoutString) {
            
            const allowedTimeoutRolesArray = guildConfigDocument.cmdTimeoutRoles;
            const hasPermissionToTimeout = checkUserRoleFunction(allowedTimeoutRolesArray);
            
            if (hasPermissionToTimeout === false) {
                return message.reply('**❌ لا تمتلك صلاحية استخدام هذا الأمر.**');
            }
            
            const messageMentionsCollection = message.mentions.members;
            let userToMuteObject = messageMentionsCollection.first();
            
            if (!userToMuteObject) {
                const firstArgumentString = argumentsArray[0];
                const guildMembersCollection = message.guild.members.cache;
                userToMuteObject = guildMembersCollection.get(firstArgumentString);
            }
            
            if (!userToMuteObject) {
                return message.reply('**⚠️ الرجاء منشن العضو أو كتابة الأيدي الخاص به.**');
            }
            
            let timeStringInput = argumentsArray[1];
            if (!timeStringInput) {
                timeStringInput = '5m'; 
            }
            
            let calculatedDurationMsNumber = 0;
            let displayTimeString = '';

            const isDays = timeStringInput.endsWith('d');
            const isHours = timeStringInput.endsWith('h');
            const isMinutes = timeStringInput.endsWith('m');
            const isSeconds = timeStringInput.endsWith('s');

            if (isDays === true) {
                const numberValueString = timeStringInput.replace('d', '');
                const numberValueInt = parseInt(numberValueString);
                calculatedDurationMsNumber = numberValueInt * 24 * 60 * 60 * 1000;
                displayTimeString = `${numberValueInt} Days (أيام)`;
                
            } else if (isHours === true) {
                const numberValueString = timeStringInput.replace('h', '');
                const numberValueInt = parseInt(numberValueString);
                calculatedDurationMsNumber = numberValueInt * 60 * 60 * 1000;
                displayTimeString = `${numberValueInt} Hours (ساعات)`;
                
            } else if (isMinutes === true) {
                const numberValueString = timeStringInput.replace('m', '');
                const numberValueInt = parseInt(numberValueString);
                calculatedDurationMsNumber = numberValueInt * 60 * 1000;
                displayTimeString = `${numberValueInt} Minutes (دقائق)`;
                
            } else if (isSeconds === true) {
                const numberValueString = timeStringInput.replace('s', '');
                const numberValueInt = parseInt(numberValueString);
                calculatedDurationMsNumber = numberValueInt * 1000;
                displayTimeString = `${numberValueInt} Seconds (ثواني)`;
                
            } else {
                const numberValueInt = parseInt(timeStringInput); 
                calculatedDurationMsNumber = numberValueInt * 60 * 1000;
                displayTimeString = `${numberValueInt} Minutes (دقائق)`;
            }

            const isDurationNaN = isNaN(calculatedDurationMsNumber);
            if (isDurationNaN === true || calculatedDurationMsNumber <= 0) {
                return message.reply('**⚠️ صيغة الوقت غير صحيحة. أمثلة: 3d, 12h, 5m**');
            }

            const reasonArgumentsArray = argumentsArray.slice(2);
            let punishmentReasonString = reasonArgumentsArray.join(' ');
            
            if (!punishmentReasonString) {
                punishmentReasonString = 'بدون سبب (No reason provided)';
            }

            try {
                const finalReasonString = `${punishmentReasonString} - By: ${message.author.tag}`;
                await userToMuteObject.timeout(calculatedDurationMsNumber, finalReasonString);
                
                const muteReplyEmbedObject = new EmbedBuilder();
                
                let timeoutColorHex = guildConfigDocument.timeoutEmbedColor;
                if (!timeoutColorHex) {
                    timeoutColorHex = '#f2a658';
                }

                // رسالة الشات (تحتوي على اسم المشرف)
                const isCustomPunishmentStyle = (guildConfigDocument.punishmentStyle === 'custom');
                
                if (isCustomPunishmentStyle === true) {
                    let customTitleString = guildConfigDocument.customTimeoutTitle;
                    if (!customTitleString) customTitleString = '⏳ Timed Out';
                    
                    let customDescriptionString = guildConfigDocument.customTimeoutDesc;
                    if (!customDescriptionString) customDescriptionString = 'User [user] timed out by [moderator] for [duration].\nReason: [reason]';
                    
                    customDescriptionString = customDescriptionString.replace(/\[user\]/g, `<@${userToMuteObject.id}>`);
                    customDescriptionString = customDescriptionString.replace(/\[moderator\]/g, `<@${message.author.id}>`);
                    customDescriptionString = customDescriptionString.replace(/\[reason\]/g, punishmentReasonString);
                    customDescriptionString = customDescriptionString.replace(/\[duration\]/g, displayTimeString);
                    
                    muteReplyEmbedObject.setTitle(customTitleString);
                    muteReplyEmbedObject.setDescription(customDescriptionString);
                } else {
                    const mutedUserAvatarUrl = userToMuteObject.user.displayAvatarURL({ dynamic: true });
                    muteReplyEmbedObject.setAuthor({ name: '⏳ تمت المعاقبة بالتايم أوت', iconURL: mutedUserAvatarUrl });
                    
                    let formattedDescriptionString = `**👤 العضو:** <@${userToMuteObject.id}>\n`;
                    formattedDescriptionString += `**🛡️ بواسطة:** <@${message.author.id}>\n\n`;
                    formattedDescriptionString += `**⏱️ المدة:** \`${displayTimeString}\`\n`;
                    formattedDescriptionString += `**📝 السبب:** \n> ${punishmentReasonString}\n`;
                    
                    muteReplyEmbedObject.setDescription(formattedDescriptionString);
                    muteReplyEmbedObject.setThumbnail(message.guild.iconURL({ dynamic: true }));
                }
                
                muteReplyEmbedObject.setColor(timeoutColorHex);
                muteReplyEmbedObject.setTimestamp();
                
                message.reply({ embeds: [muteReplyEmbedObject] });

                // إرسال اللوج
                const logChannelIdString = guildConfigDocument.logTimeoutId;
                let logDescriptionString = `**User:** ${userToMuteObject}\n**By:** ${message.author}\n**Duration:** ${displayTimeString}\n**Reason:** ${punishmentReasonString}`;
                sendActionLogFunction(logChannelIdString, '⏳ Member Timed Out', logDescriptionString, timeoutColorHex);
                
                // 🛑 رسالة الخاص للمخالف (إخفاء هوية الإداري)
                try {
                    const dmEmbedObject = new EmbedBuilder();
                    dmEmbedObject.setTitle(`⚠️ لقد تم إعطائك Timeout في سيرفر ${message.guild.name}`);
                    
                    let dmDescString = `**المدة:** ${displayTimeString}\n`;
                    dmDescString += `**السبب:** ${punishmentReasonString}\n\n`;
                    dmDescString += `يرجى الالتزام بالقوانين لتجنب تكرار العقوبة.`;
                    
                    dmEmbedObject.setDescription(dmDescString);
                    dmEmbedObject.setColor('#ed4245');
                    
                    await userToMuteObject.send({ embeds: [dmEmbedObject] });
                } catch (dmErr) {}

            } catch (timeoutError) { 
                const errorMessage = '**❌ لم أتمكن من إعطاء تايم أوت لهذا العضو. يرجى مراجعة الصلاحيات.**';
                message.reply(errorMessage); 
            }
            return;
        }

        const cmdUntimeoutString = guildConfigDocument.cmdUntimeout;
        
        if (fullCommandString === cmdUntimeoutString) {
            
            const allowedUntimeoutRolesArray = guildConfigDocument.cmdUntimeoutRoles;
            const hasPermissionToUntimeout = checkUserRoleFunction(allowedUntimeoutRolesArray);
            
            if (hasPermissionToUntimeout === false) {
                return message.reply('**❌ لا تمتلك صلاحية استخدام هذا الأمر.**');
            }
            
            const messageMentionsCollection = message.mentions.members;
            let userToUnmuteObject = messageMentionsCollection.first();
            
            if (!userToUnmuteObject) {
                const firstArgumentString = argumentsArray[0];
                const guildMembersCollection = message.guild.members.cache;
                userToUnmuteObject = guildMembersCollection.get(firstArgumentString);
            }
            
            if (!userToUnmuteObject) {
                return message.reply('**⚠️ الرجاء منشن العضو أو كتابة الأيدي الخاص به.**');
            }

            try {
                const untimeoutReasonString = `Untimeout by: ${message.author.tag}`;
                await userToUnmuteObject.timeout(null, untimeoutReasonString);
                
                const unmuteReplyEmbedObject = new EmbedBuilder();
                
                let untimeoutColorHex = guildConfigDocument.untimeoutEmbedColor;
                if (!untimeoutColorHex) {
                    untimeoutColorHex = '#3ba55d';
                }
                
                const isCustomPunishmentStyle = (guildConfigDocument.punishmentStyle === 'custom');
                
                if (isCustomPunishmentStyle === true) {
                    let customTitleString = guildConfigDocument.customUntimeoutTitle;
                    if (!customTitleString) customTitleString = '🔊 Untimed Out';
                    
                    let customDescriptionString = guildConfigDocument.customUntimeoutDesc;
                    if (!customDescriptionString) customDescriptionString = 'User [user] untimed out by [moderator].';
                    
                    customDescriptionString = customDescriptionString.replace(/\[user\]/g, `<@${userToUnmuteObject.id}>`);
                    customDescriptionString = customDescriptionString.replace(/\[moderator\]/g, `<@${message.author.id}>`);
                    
                    unmuteReplyEmbedObject.setTitle(customTitleString);
                    unmuteReplyEmbedObject.setDescription(customDescriptionString);
                } else {
                    unmuteReplyEmbedObject.setTitle('🔊 تم فك التايم أوت بنجاح');
                    unmuteReplyEmbedObject.setDescription(`**👤 العضو:** <@${userToUnmuteObject.id}>\n**🛡️ بواسطة:** <@${message.author.id}>`);
                }
                
                unmuteReplyEmbedObject.setColor(untimeoutColorHex);
                message.reply({ embeds: [unmuteReplyEmbedObject] });

                const logChannelIdString = guildConfigDocument.logTimeoutId;
                let logDescriptionString = `**User:** ${userToUnmuteObject}\n**By:** ${message.author}`;
                sendActionLogFunction(logChannelIdString, '🔊 Timeout Removed', logDescriptionString, untimeoutColorHex);
                
            } catch (untimeoutError) { 
                const errorMessage = '**❌ حدث خطأ، تأكد من صلاحياتي.**';
                message.reply(errorMessage); 
            }
            return;
        }

        // =====================================================================
        // 🔨 أمر الباند وفكه (!ban / !unban) مع إخفاء اسم المشرف
        // =====================================================================
        const cmdBanString = guildConfigDocument.cmdBan;
        
        if (fullCommandString === cmdBanString) {
            
            const allowedBanRolesArray = guildConfigDocument.cmdBanRoles;
            const hasPermissionToBan = checkUserRoleFunction(allowedBanRolesArray);
            
            if (hasPermissionToBan === false) {
                return message.reply('**❌ لا تمتلك صلاحية استخدام هذا الأمر.**');
            }
            
            const messageMentionsCollection = message.mentions.members;
            let userToBanObject = messageMentionsCollection.first();
            
            if (!userToBanObject) {
                const firstArgumentString = argumentsArray[0];
                const guildMembersCollection = message.guild.members.cache;
                userToBanObject = guildMembersCollection.get(firstArgumentString);
            }
            
            if (!userToBanObject) {
                return message.reply('**⚠️ الرجاء منشن العضو أو كتابة الأيدي الخاص به.**');
            }
            
            const reasonArgumentsArray = argumentsArray.slice(1);
            let punishmentReasonString = reasonArgumentsArray.join(' ');
            
            if (!punishmentReasonString) {
                punishmentReasonString = 'بدون سبب (No reason provided)';
            }
            
            try {
                // 🛑 رسالة الخاص للمخالف (إخفاء هوية الإداري) تُرسل قبل الباند لتصل بنجاح
                try {
                    const dmBanEmbedObject = new EmbedBuilder();
                    dmBanEmbedObject.setTitle(`🔨 لقد تم حظرك من سيرفر ${message.guild.name}`);
                    
                    let dmBanDescString = `**السبب:** ${punishmentReasonString}\n\n`;
                    dmBanDescString += `تم حظرك نهائياً من الخادم.`;
                    
                    dmBanEmbedObject.setDescription(dmBanDescString);
                    dmBanEmbedObject.setColor('#ed4245');
                    
                    await userToBanObject.send({ embeds: [dmBanEmbedObject] });
                } catch (dmBanErr) {}

                // تطبيق الباند الفعلي
                const finalBanReasonString = `${punishmentReasonString} - By: ${message.author.tag}`;
                await userToBanObject.ban({ reason: finalBanReasonString });
                
                const banReplyEmbedObject = new EmbedBuilder();
                
                let banColorHex = guildConfigDocument.banEmbedColor;
                if (!banColorHex) {
                    banColorHex = '#ed4245';
                }
                
                const isCustomPunishmentStyle = (guildConfigDocument.punishmentStyle === 'custom');
                
                if (isCustomPunishmentStyle === true) {
                    let customTitleString = guildConfigDocument.customBanTitle;
                    if (!customTitleString) customTitleString = '🔨 Banned';
                    
                    let customDescriptionString = guildConfigDocument.customBanDesc;
                    if (!customDescriptionString) customDescriptionString = 'User [user] was banned by [moderator].\nReason: [reason]';
                    
                    customDescriptionString = customDescriptionString.replace(/\[user\]/g, `<@${userToBanObject.id}>`);
                    customDescriptionString = customDescriptionString.replace(/\[moderator\]/g, `<@${message.author.id}>`);
                    customDescriptionString = customDescriptionString.replace(/\[reason\]/g, punishmentReasonString);
                    
                    banReplyEmbedObject.setTitle(customTitleString);
                    banReplyEmbedObject.setDescription(customDescriptionString);
                } else {
                    const bannedUserAvatarUrl = userToBanObject.user.displayAvatarURL({ dynamic: true });
                    banReplyEmbedObject.setAuthor({ name: '🔨 تمت المعاقبة بالحظر (Ban)', iconURL: bannedUserAvatarUrl });
                    
                    let formattedDescriptionString = `**👤 العضو:** <@${userToBanObject.id}>\n`;
                    formattedDescriptionString += `**🛡️ بواسطة:** <@${message.author.id}>\n\n`;
                    formattedDescriptionString += `**📝 السبب:** \n> ${punishmentReasonString}\n`;
                    
                    banReplyEmbedObject.setDescription(formattedDescriptionString);
                    banReplyEmbedObject.setThumbnail(message.guild.iconURL({ dynamic: true }));
                }
                
                banReplyEmbedObject.setColor(banColorHex);
                banReplyEmbedObject.setTimestamp();
                
                message.reply({ embeds: [banReplyEmbedObject] });

                const logChannelIdString = guildConfigDocument.logBanId;
                let logDescriptionString = `**User:** ${userToBanObject}\n**By:** ${message.author}\n**Reason:** ${punishmentReasonString}`;
                sendActionLogFunction(logChannelIdString, '🔨 Member Banned', logDescriptionString, banColorHex);
                
            } catch (banError) { 
                const errorMessage = '**❌ لم أتمكن من حظر هذا العضو. يرجى مراجعة الصلاحيات.**';
                message.reply(errorMessage); 
            }
            return;
        }

        const cmdUnbanString = guildConfigDocument.cmdUnban;
        
        if (fullCommandString === cmdUnbanString) {
            
            const allowedUnbanRolesArray = guildConfigDocument.cmdUnbanRoles;
            const hasPermissionToUnban = checkUserRoleFunction(allowedUnbanRolesArray);
            
            if (hasPermissionToUnban === false) {
                return message.reply('**❌ لا تمتلك صلاحية استخدام هذا الأمر.**');
            }
            
            const userIdToUnbanString = argumentsArray[0];
            
            if (!userIdToUnbanString) {
                return message.reply('**⚠️ الرجاء إدخال الأيدي الخاص بالعضو لفك الحظر.**');
            }
            
            try {
                await message.guild.members.unban(userIdToUnbanString);
                
                const unbanReplyEmbedObject = new EmbedBuilder();
                
                let unbanColorHex = guildConfigDocument.unbanEmbedColor;
                if (!unbanColorHex) {
                    unbanColorHex = '#3ba55d';
                }
                
                const isCustomPunishmentStyle = (guildConfigDocument.punishmentStyle === 'custom');
                
                if (isCustomPunishmentStyle === true) {
                    let customTitleString = guildConfigDocument.customUnbanTitle;
                    if (!customTitleString) customTitleString = '🕊️ Unbanned';
                    
                    let customDescriptionString = guildConfigDocument.customUnbanDesc;
                    if (!customDescriptionString) customDescriptionString = 'User [user] was unbanned by [moderator].';
                    
                    customDescriptionString = customDescriptionString.replace(/\[user\]/g, `<@${userIdToUnbanString}>`);
                    customDescriptionString = customDescriptionString.replace(/\[moderator\]/g, `<@${message.author.id}>`);
                    
                    unbanReplyEmbedObject.setTitle(customTitleString);
                    unbanReplyEmbedObject.setDescription(customDescriptionString);
                } else {
                    unbanReplyEmbedObject.setTitle('🕊️ تم فك الحظر بنجاح');
                    unbanReplyEmbedObject.setDescription(`**👤 ايدي العضو:** <@${userIdToUnbanString}>\n**🛡️ بواسطة:** <@${message.author.id}>`);
                }
                
                unbanReplyEmbedObject.setColor(unbanColorHex);
                message.reply({ embeds: [unbanReplyEmbedObject] });

                const logChannelIdString = guildConfigDocument.logBanId;
                let logDescriptionString = `**User ID:** ${userIdToUnbanString}\n**By:** ${message.author}`;
                sendActionLogFunction(logChannelIdString, '🕊️ Member Unbanned', logDescriptionString, unbanColorHex);
                
            } catch (unbanError) { 
                const errorMessage = '**❌ لم أتمكن من فك الحظر. تأكد أن العضو محظور فعلاً والأيدي صحيح.**';
                message.reply(errorMessage); 
            }
            return;
        }

        // =====================================================================
        // 🎙️ أوامر النقل الصوتي (!move / !vmove) (إيمبدات فخمة)
        // =====================================================================
        const cmdVmoveString = guildConfigDocument.cmdVmove;
        
        if (fullCommandString === cmdVmoveString) {
            
            const allowedVmoveRolesArray = guildConfigDocument.cmdVmoveRoles;
            const hasPermissionToVmove = checkUserRoleFunction(allowedVmoveRolesArray);
            
            if (hasPermissionToVmove === false) {
                return message.reply('**❌ لا تمتلك صلاحية استخدام هذا الأمر.**');
            }
            
            const messageMentionsCollection = message.mentions.members;
            const targetUserObject = messageMentionsCollection.first();
            
            if (!targetUserObject || !targetUserObject.voice.channel) {
                return message.reply('**⚠️ الرجاء منشن عضو متواجد في روم صوتي.**');
            }
            
            const interactionMemberObject = message.member;
            const authorVoiceChannelObject = interactionMemberObject.voice.channel;
            
            if (!authorVoiceChannelObject) {
                return message.reply('**⚠️ يجب أن تكون متواجداً في روم صوتي لسحب العضو إليك.**');
            }
            
            try {
                await targetUserObject.voice.setChannel(authorVoiceChannelObject);
                
                const successVmoveEmbed = new EmbedBuilder();
                successVmoveEmbed.setDescription(`**✅ تم سحب العضو ${targetUserObject} إلى غرفتك الصوتية بنجاح.**`);
                successVmoveEmbed.setColor('#3ba55d');
                
                message.reply({ embeds: [successVmoveEmbed] });
                
            } catch (vmoveError) { 
                const errorVmoveEmbed = new EmbedBuilder();
                errorVmoveEmbed.setDescription('**❌ حدث خطأ أثناء سحب العضو. يرجى التحقق من صلاحياتي.**');
                errorVmoveEmbed.setColor('#ed4245');
                message.reply({ embeds: [errorVmoveEmbed] }); 
            }
            return;
        }

        const cmdMoveString = guildConfigDocument.cmdMove;
        
        if (fullCommandString === cmdMoveString) {
            
            const allowedMoveRolesArray = guildConfigDocument.cmdMoveRoles;
            const hasPermissionToMove = checkUserRoleFunction(allowedMoveRolesArray);
            
            if (hasPermissionToMove === false) {
                return message.reply('**❌ لا تمتلك صلاحية استخدام هذا الأمر.**');
            }
            
            const messageMentionsCollection = message.mentions.members;
            let targetUserObject = messageMentionsCollection.first();
            
            if (!targetUserObject) {
                const firstArgumentString = argumentsArray[0];
                const guildMembersCollection = message.guild.members.cache;
                targetUserObject = guildMembersCollection.get(firstArgumentString);
            }
            
            if (!targetUserObject || !targetUserObject.voice.channel) {
                return message.reply('**⚠️ الرجاء منشن عضو متواجد في روم صوتي.**');
            }

            const channelMentionsCollection = message.mentions.channels;
            let targetChannelObject = channelMentionsCollection.first();
            
            if (!targetChannelObject) {
                const secondArgumentString = argumentsArray[1];
                const guildChannelsCollection = message.guild.channels.cache;
                targetChannelObject = guildChannelsCollection.get(secondArgumentString);
            }
            
            if (!targetChannelObject || targetChannelObject.type !== 2) { 
                return message.reply('**⚠️ الرجاء منشن روم صوتي صحيح. (مثال: !move @user #Voice-1)**');
            }

            try {
                await targetUserObject.voice.setChannel(targetChannelObject);
                
                const successMoveEmbed = new EmbedBuilder();
                successMoveEmbed.setDescription(`**✅ تم نقل العضو ${targetUserObject} إلى الروم ${targetChannelObject} بنجاح.**`);
                successMoveEmbed.setColor('#3ba55d');
                
                message.reply({ embeds: [successMoveEmbed] });
                
            } catch (moveError) { 
                const errorMoveEmbed = new EmbedBuilder();
                errorMoveEmbed.setDescription('**❌ حدث خطأ أثناء نقل العضو. يرجى التحقق من صلاحياتي.**');
                errorMoveEmbed.setColor('#ed4245');
                message.reply({ embeds: [errorMoveEmbed] }); 
            }
            return;
        }

        // =====================================================================
        // 🧹 أوامر المسح والقفل (إيمبدات فخمة)
        // =====================================================================
        const cmdClearString = guildConfigDocument.cmdClear;
        
        if (fullCommandString === cmdClearString) {
            
            const allowedClearRolesArray = guildConfigDocument.cmdClearRoles;
            const hasPermissionToClear = checkUserRoleFunction(allowedClearRolesArray);
            
            if (hasPermissionToClear === false) {
                return message.reply('**❌ لا تمتلك صلاحية استخدام هذا الأمر.**');
            }
            
            const firstArgumentString = argumentsArray[0];
            const amountToDeleteInt = parseInt(firstArgumentString);
            const isAmountNaN = isNaN(amountToDeleteInt);
            
            if (isAmountNaN === true || amountToDeleteInt < 1 || amountToDeleteInt > 100) {
                return message.reply('**⚠️ الرجاء تحديد رقم بين 1 و 100 لعدد الرسائل المراد مسحها.**');
            }
            
            try {
                const currentChannelObject = message.channel;
                await currentChannelObject.bulkDelete(amountToDeleteInt, true);
                
                const clearSuccessEmbed = new EmbedBuilder();
                clearSuccessEmbed.setDescription(`**✅ تم مسح ${amountToDeleteInt} رسالة بنجاح.**`);
                clearSuccessEmbed.setColor('#3ba55d');
                
                const replyMessageObject = await currentChannelObject.send({ embeds: [clearSuccessEmbed] });
                
                setTimeout(() => { 
                    try {
                        replyMessageObject.delete();
                    } catch (delErr) {}
                }, 3000);
                
            } catch (clearError) {}
            return;
        }

        const cmdLockString = guildConfigDocument.cmdLock;
        
        if (fullCommandString === cmdLockString) {
            
            const allowedLockRolesArray = guildConfigDocument.cmdLockRoles;
            const hasPermissionToLock = checkUserRoleFunction(allowedLockRolesArray);
            
            if (hasPermissionToLock === false) {
                return message.reply('**❌ لا تمتلك صلاحية استخدام هذا الأمر.**');
            }
            
            try {
                const currentChannelObject = message.channel;
                const everyoneRoleObject = message.guild.roles.everyone;
                
                await currentChannelObject.permissionOverwrites.edit(everyoneRoleObject, { 
                    SendMessages: false 
                });
                
                const lockSuccessEmbed = new EmbedBuilder();
                lockSuccessEmbed.setDescription('**🔒 تم إغلاق الروم بنجاح.**');
                lockSuccessEmbed.setColor('#ed4245');
                
                message.reply({ embeds: [lockSuccessEmbed] });
                
            } catch (lockError) {}
            return;
        }

        const cmdUnlockString = guildConfigDocument.cmdUnlock;
        
        if (fullCommandString === cmdUnlockString) {
            
            const allowedUnlockRolesArray = guildConfigDocument.cmdUnlockRoles;
            const hasPermissionToUnlock = checkUserRoleFunction(allowedUnlockRolesArray);
            
            if (hasPermissionToUnlock === false) {
                return message.reply('**❌ لا تمتلك صلاحية استخدام هذا الأمر.**');
            }
            
            try {
                const currentChannelObject = message.channel;
                const everyoneRoleObject = message.guild.roles.everyone;
                
                await currentChannelObject.permissionOverwrites.edit(everyoneRoleObject, { 
                    SendMessages: true 
                });
                
                const unlockSuccessEmbed = new EmbedBuilder();
                unlockSuccessEmbed.setDescription('**🔓 تم فتح الروم بنجاح.**');
                unlockSuccessEmbed.setColor('#3ba55d');
                
                message.reply({ embeds: [unlockSuccessEmbed] });
                
            } catch (unlockError) {}
            return;
        }

        // =====================================================================
        // 📢 أمر النداء المباشر (!req-high) (إيمبد أحمر فخم)
        // =====================================================================
        const cmdReqHighString = guildConfigDocument.cmdReqHigh;
        
        if (fullCommandString === cmdReqHighString) {
            
            const allowedReqHighRolesArray = guildConfigDocument.cmdReqHighRoles;
            const hasPermissionToReqHigh = checkUserRoleFunction(allowedReqHighRolesArray);
            
            if (hasPermissionToReqHigh === false) {
                return message.reply('**❌ لا تمتلك صلاحية استخدام هذا الأمر.**');
            }
            
            let mentionRolesString = '';
            const tradeMentionRolesArray = guildConfigDocument.tradeMentionRoles;
            const highMiddlemanRolesArray = guildConfigDocument.highMiddlemanRoles;
            
            if (tradeMentionRolesArray && tradeMentionRolesArray.length > 0) {
                for (let i = 0; i < tradeMentionRolesArray.length; i++) {
                    const roleIdString = tradeMentionRolesArray[i];
                    mentionRolesString += `<@&${roleIdString}> `;
                }
            } else if (highMiddlemanRolesArray && highMiddlemanRolesArray.length > 0) {
                for (let i = 0; i < highMiddlemanRolesArray.length; i++) {
                    const roleIdString = highMiddlemanRolesArray[i];
                    mentionRolesString += `<@&${roleIdString}> `;
                }
            }
            
            const reqHighEmbed = new EmbedBuilder();
            reqHighEmbed.setTitle('🚨 نداء طارئ للموافقات والإدارة العليا');
            
            let reqDescription = `**هناك طلب أو نداء يرجى التوجه إليه فوراً.**\n\n`;
            reqDescription += `**تم الطلب بواسطة:** <@${message.author.id}>`;
            
            reqHighEmbed.setDescription(reqDescription);
            reqHighEmbed.setColor('#ed4245');
            reqHighEmbed.setTimestamp();
            
            try {
                await message.delete();
            } catch (delErr) {}
            
            return message.channel.send({ 
                content: mentionRolesString !== '' ? mentionRolesString : null,
                embeds: [reqHighEmbed] 
            });
        }
    });
};
