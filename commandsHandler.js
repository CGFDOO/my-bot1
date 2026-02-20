// =====================================================================
// استدعاء المكاتب الأساسية (مفرودة بالكامل بدون أي اختصار)
// =====================================================================
const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} = require('discord.js');

// استدعاء الداتابيز
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    
    // =====================================================================
    // الحدث الرئيسي لقراءة الرسائل والأوامر في السيرفر
    // =====================================================================
    client.on('messageCreate', async message => {
        
        // 1. تجاهل رسائل البوتات لتخفيف الضغط على السيرفر
        if (message.author.bot) {
            return;
        }

        // 2. تجاهل رسائل الخاص (الأوامر تعمل فقط داخل السيرفرات)
        if (!message.guild) {
            return;
        }

        // 3. جلب الإعدادات من الداتابيز للسيرفر الحالي
        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        
        if (!config) {
            return;
        }

        // 4. نظام الردود التلقائية (Auto Responders)
        if (config.autoResponders && config.autoResponders.length > 0) {
            for (let i = 0; i < config.autoResponders.length; i++) {
                
                const responderObj = config.autoResponders[i];
                
                if (message.content.includes(responderObj.word)) {
                    message.reply({ content: `**${responderObj.reply}**` }).catch(() => {});
                }
            }
        }

        // 5. إعداد البريفكس (Prefix)
        let prefix = config.prefix;
        if (!prefix) {
            prefix = '!';
        }
        
        // إذا الرسالة لا تبدأ بالبريفكس، نتجاهلها
        if (!message.content.startsWith(prefix)) {
            return;
        }

        // 6. فصل اسم الأمر عن محتوى الرسالة
        const argsArray = message.content.slice(prefix.length).trim().split(/ +/);
        const commandNameStr = argsArray.shift().toLowerCase();
        
        // تجميع الأمر كاملاً (مثال: !ban)
        const fullCommand = prefix + commandNameStr; 

        // =====================================================================
        // 🛠️ دالة التحقق من الصلاحيات (لفحص رتبة المستخدم)
        // =====================================================================
        const checkUserRole = (allowedRolesArray) => {
            
            // إذا لم يتم تحديد رتب من الداشبورد، نسمح للأدمن فقط
            if (!allowedRolesArray || allowedRolesArray.length === 0) {
                if (message.member.permissions.has('Administrator')) {
                    return true;
                } else {
                    return false;
                }
            }
            
            // الأدمن دائماً مسموح له باستخدام أي أمر
            if (message.member.permissions.has('Administrator')) {
                return true;
            }
            
            // فحص باقي الرتب المحددة في الداشبورد
            for (let i = 0; i < allowedRolesArray.length; i++) {
                if (message.member.roles.cache.has(allowedRolesArray[i])) {
                    return true;
                }
            }
            
            return false;
        };

        // =====================================================================
        // 🛠️ دالة إرسال اللوجات للرومات المخصصة
        // =====================================================================
        const sendActionLog = async (logChannelIdStr, logTitleStr, logDescStr, logColorHex) => {
            
            if (!logChannelIdStr) {
                return;
            }
            
            const targetLogChannel = message.guild.channels.cache.get(logChannelIdStr);
            
            if (!targetLogChannel) {
                return;
            }
            
            const logEmbedObj = new EmbedBuilder();
            logEmbedObj.setTitle(logTitleStr);
            logEmbedObj.setDescription(logDescStr);
            logEmbedObj.setColor(logColorHex);
            logEmbedObj.setTimestamp();
            logEmbedObj.setFooter({ 
                text: message.guild.name, 
                iconURL: message.guild.iconURL({ dynamic: true }) 
            });
            
            await targetLogChannel.send({ embeds: [logEmbedObj] }).catch(()=>{});
        };

        // =====================================================================
        // 📢 أمر النداء واستدعاء عضو (!come) - [تمت الإضافة]
        // =====================================================================
        if (fullCommand === config.cmdCome) {
            
            let hasPerm = checkUserRole(config.cmdComeRoles);
            
            if (!hasPerm) {
                return message.reply('**❌ You do not have permission to use this command.**');
            }
            
            let targetUser = message.mentions.members.first();
            
            if (!targetUser) {
                targetUser = message.guild.members.cache.get(argsArray[0]);
            }
            
            if (!targetUser) {
                return message.reply('**⚠️ Please mention a user or provide their ID to summon them.**');
            }

            const comeEmbed = new EmbedBuilder();
            comeEmbed.setTitle('📢 استدعاء إداري (Summon)');
            
            let comeDescription = `**مرحباً <@${targetUser.id}>،**\n\n`;
            comeDescription += `يرجى التوجه فوراً إلى هذه الروم: <#${message.channel.id}>\n`;
            comeDescription += `تم استدعائك بواسطة الإداري: <@${message.author.id}>`;
            
            comeEmbed.setDescription(comeDescription);
            
            // استخدام اللون الأساسي أو لون مخصص
            comeEmbed.setColor('#5865F2'); 
            comeEmbed.setThumbnail(targetUser.user.displayAvatarURL({ dynamic: true }));
            comeEmbed.setTimestamp();

            // مسح رسالة الأمر نفسه
            await message.delete().catch(()=>{});

            // إرسال الإيمبد مع منشن العضو خارج الإيمبد لكي يصله الإشعار
            return message.channel.send({ 
                content: `<@${targetUser.id}>`, 
                embeds: [comeEmbed] 
            });
        }

        // =====================================================================
        // 🤝 أمر تقييم الوسيط (!done) وسحب تفاصيل التريد واللون
        // =====================================================================
        if (fullCommand === config.cmdDone) {
            
            let hasPerm = checkUserRole(config.cmdDoneRoles);
            
            if (!hasPerm) {
                return message.reply('**❌ You do not have permission to use this command.**');
            }
            
            let currentTopic = message.channel.topic;
            
            if (!currentTopic) {
                return message.reply('**❌ This command can only be used inside a ticket.**');
            }
            
            const topicPartsArr = currentTopic.split('_');
            const ticketOwnerIdStr = topicPartsArr[0]; 
            
            if (!ticketOwnerIdStr || ticketOwnerIdStr === 'none') {
                return message.reply('**❌ This command can only be used inside a ticket.**');
            }
            
            try {
                // سحب تفاصيل التريد من الشات لدمجها في التقييم
                let extractedTradeText = 'لا يوجد تفاصيل مسجلة (تم التقييم بدون نافذة تريد).';
                
                const pastMessages = await message.channel.messages.fetch({ limit: 100 });
                
                const tradeMessageFound = pastMessages.find(msg => {
                    let hasEmbed = msg.embeds && msg.embeds.length > 0;
                    if (hasEmbed) {
                        return msg.embeds[0].title === '⚖️ Trade Approval Request';
                    }
                    return false;
                });
                
                if (tradeMessageFound) {
                    const embedDescStr = tradeMessageFound.embeds[0].description;
                    const descSplitByDetails = embedDescStr.split('**Details:**\n```');
                    
                    if (descSplitByDetails.length > 1) {
                        let textAfterDetails = descSplitByDetails[1];
                        let finalDetailsText = textAfterDetails.split('```')[0]; 
                        extractedTradeText = finalDetailsText;
                    }
                }

                const ticketOwnerMember = await message.guild.members.fetch(ticketOwnerIdStr);
                const currentGuildName = message.guild.name;
                
                const finalRatingEmbed = new EmbedBuilder();
                
                let finalEmbedTitle = '';
                let finalEmbedDesc = '';
                
                // اختيار تصميم التقييم (يدوي أو بيسك)
                if (config.ratingStyle === 'custom' && config.customMedRatingText) {
                    finalEmbedTitle = config.customMedRatingTitle;
                    if (!finalEmbedTitle) {
                        finalEmbedTitle = 'تقييم الوساطة';
                    }
                    
                    finalEmbedDesc = config.customMedRatingText;
                    finalEmbedDesc = finalEmbedDesc.replace(/\[staff\]/g, `<@${message.author.id}>`);
                    finalEmbedDesc = finalEmbedDesc.replace(/\[user\]/g, `<@${ticketOwnerMember.id}>`);
                    finalEmbedDesc = finalEmbedDesc.replace(/\[server\]/g, currentGuildName);
                } else {
                    finalEmbedTitle = 'تقييم الوساطة';
                    finalEmbedDesc = `لقد أتممت معاملتك بنجاح في سيرفر **${currentGuildName}**.\n\n`;
                    finalEmbedDesc += `يرجى تقييم خدمة الوسيط <@${message.author.id}> بالضغط على النجوم في الأسفل.\n`;
                }
                
                // دمج تفاصيل التريد
                finalEmbedDesc += `\n-------------------------\n`;
                finalEmbedDesc += `> **📦 تفاصيل المعاملة:**\n`;
                finalEmbedDesc += `> ${extractedTradeText}\n`;
                
                finalRatingEmbed.setTitle(finalEmbedTitle);
                finalRatingEmbed.setDescription(finalEmbedDesc);
                
                // 🔥 تطبيق لون إيمبد التقييم المسحوب من الداشبورد
                let mediatorColor = config.basicRatingColor;
                if (!mediatorColor) {
                    mediatorColor = '#f2a658';
                }
                finalRatingEmbed.setColor(mediatorColor);
                
                finalRatingEmbed.setFooter({ 
                    text: currentGuildName, 
                    iconURL: message.guild.iconURL({ dynamic: true }) 
                });
                
                const starsActionRow = new ActionRowBuilder();
                
                const btnStar1 = new ButtonBuilder();
                btnStar1.setCustomId(`rate_mediator_1_${message.author.id}_${message.guild.id}`);
                btnStar1.setLabel('⭐');
                btnStar1.setStyle(ButtonStyle.Secondary);
                
                const btnStar2 = new ButtonBuilder();
                btnStar2.setCustomId(`rate_mediator_2_${message.author.id}_${message.guild.id}`);
                btnStar2.setLabel('⭐⭐');
                btnStar2.setStyle(ButtonStyle.Secondary);
                
                const btnStar3 = new ButtonBuilder();
                btnStar3.setCustomId(`rate_mediator_3_${message.author.id}_${message.guild.id}`);
                btnStar3.setLabel('⭐⭐⭐');
                btnStar3.setStyle(ButtonStyle.Secondary);
                
                const btnStar4 = new ButtonBuilder();
                btnStar4.setCustomId(`rate_mediator_4_${message.author.id}_${message.guild.id}`);
                btnStar4.setLabel('⭐⭐⭐⭐');
                btnStar4.setStyle(ButtonStyle.Secondary);
                
                const btnStar5 = new ButtonBuilder();
                btnStar5.setCustomId(`rate_mediator_5_${message.author.id}_${message.guild.id}`);
                btnStar5.setLabel('⭐⭐⭐⭐⭐');
                btnStar5.setStyle(ButtonStyle.Secondary);
                
                starsActionRow.addComponents(btnStar1, btnStar2, btnStar3, btnStar4, btnStar5);
                
                await ticketOwnerMember.send({ 
                    embeds: [finalRatingEmbed], 
                    components: [starsActionRow] 
                });
                
                return message.reply('**✅ تم إرسال طلب التقييم (مع تفاصيل التريد) للعضو في الخاص بنجاح.**');
                
            } catch (err) { 
                return message.reply('**❌ لا يمكن إرسال رسالة لهذا العضو (الخاص مغلق).**'); 
            }
        }

        // =====================================================================
        // ⚖️ أمر التريد والموافقة (!trade) والمنشن التلقائي
        // =====================================================================
        if (fullCommand === config.cmdTrade) {
            
            let hasPerm = checkUserRole(config.cmdTradeRoles);
            
            if (!hasPerm) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            const tradeInitEmbed = new EmbedBuilder();
            tradeInitEmbed.setTitle('📝 تفاصيل التريد');
            tradeInitEmbed.setDescription('يرجى الضغط على الزر أدناه لكتابة تفاصيل التريد.');
            
            // سحب لون التريد من الداشبورد
            let tradeCol = config.tradeEmbedColor;
            if (!tradeCol) {
                tradeCol = '#f2a658';
            }
            tradeInitEmbed.setColor(tradeCol);

            const tradeRow = new ActionRowBuilder();
            
            const openTradeModalBtn = new ButtonBuilder();
            openTradeModalBtn.setCustomId('open_trade_modal');
            openTradeModalBtn.setLabel('كتابة تفاصيل التريد ✍️');
            openTradeModalBtn.setStyle(ButtonStyle.Primary);
            
            tradeRow.addComponents(openTradeModalBtn);

            // عمل منشن للرتب العليا المحددة
            let mentionString = '';
            if (config.tradeMentionRoles && config.tradeMentionRoles.length > 0) {
                for (let i = 0; i < config.tradeMentionRoles.length; i++) {
                    mentionString += `<@&${config.tradeMentionRoles[i]}> `;
                }
            }

            await message.delete().catch(()=>{});
            
            let msgContentToDrop = '';
            if (mentionString !== '') {
                msgContentToDrop = `**🔔 نداء للموافقات العليا:** ${mentionString}`;
            }

            return message.channel.send({ 
                content: msgContentToDrop !== '' ? msgContentToDrop : null,
                embeds: [tradeInitEmbed], 
                components: [tradeRow] 
            });
        }

        // =====================================================================
        // ⏳ أمر التايم أوت (!timeout) مع مُحلل الوقت والتصميم الفخم
        // =====================================================================
        if (fullCommand === config.cmdTimeout) {
            
            let hasPerm = checkUserRole(config.cmdTimeoutRoles);
            if (!hasPerm) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            let userToMute = message.mentions.members.first();
            if (!userToMute) {
                userToMute = message.guild.members.cache.get(argsArray[0]);
            }
            
            if (!userToMute) {
                return message.reply('**⚠️ Please mention a user or provide their ID.**');
            }
            
            let timeStringInput = argsArray[1];
            if (!timeStringInput) {
                timeStringInput = '5m'; 
            }
            
            let calculatedDurationMs = 0;
            let displayTimeString = '';

            // مُحلل الوقت 
            if (timeStringInput.endsWith('d')) {
                let numberValue = parseInt(timeStringInput.replace('d', ''));
                calculatedDurationMs = numberValue * 24 * 60 * 60 * 1000;
                displayTimeString = `${numberValue} Days (أيام)`;
            } 
            else if (timeStringInput.endsWith('h')) {
                let numberValue = parseInt(timeStringInput.replace('h', ''));
                calculatedDurationMs = numberValue * 60 * 60 * 1000;
                displayTimeString = `${numberValue} Hours (ساعات)`;
            } 
            else if (timeStringInput.endsWith('m')) {
                let numberValue = parseInt(timeStringInput.replace('m', ''));
                calculatedDurationMs = numberValue * 60 * 1000;
                displayTimeString = `${numberValue} Minutes (دقائق)`;
            } 
            else if (timeStringInput.endsWith('s')) {
                let numberValue = parseInt(timeStringInput.replace('s', ''));
                calculatedDurationMs = numberValue * 1000;
                displayTimeString = `${numberValue} Seconds (ثواني)`;
            } 
            else {
                let numberValue = parseInt(timeStringInput); 
                calculatedDurationMs = numberValue * 60 * 1000;
                displayTimeString = `${numberValue} Minutes (دقائق)`;
            }

            if (isNaN(calculatedDurationMs) || calculatedDurationMs <= 0) {
                return message.reply('**⚠️ Invalid time format. Use: 3d, 12h, 5m**');
            }

            let punishmentReason = argsArray.slice(2).join(' ');
            if (!punishmentReason) {
                punishmentReason = 'بدون سبب (No reason provided)';
            }

            try {
                await userToMute.timeout(calculatedDurationMs, `${punishmentReason} - By: ${message.author.tag}`);
                
                const muteReplyEmbed = new EmbedBuilder();
                
                // سحب لون التايم أوت
                let tOutColor = config.timeoutEmbedColor;
                if (!tOutColor) {
                    tOutColor = '#f2a658';
                }

                if (config.punishmentStyle === 'custom') {
                    
                    let customTitleStr = config.customTimeoutTitle;
                    if (!customTitleStr) customTitleStr = '⏳ Timed Out';
                    
                    let customDescStr = config.customTimeoutDesc;
                    if (!customDescStr) customDescStr = 'User [user] timed out by [moderator] for [duration].\nReason: [reason]';
                    
                    customDescStr = customDescStr.replace(/\[user\]/g, `<@${userToMute.id}>`);
                    customDescStr = customDescStr.replace(/\[moderator\]/g, `<@${message.author.id}>`);
                    customDescStr = customDescStr.replace(/\[reason\]/g, punishmentReason);
                    customDescStr = customDescStr.replace(/\[duration\]/g, displayTimeString);
                    
                    muteReplyEmbed.setTitle(customTitleStr);
                    muteReplyEmbed.setDescription(customDescStr);
                    
                } else {
                    
                    muteReplyEmbed.setAuthor({ 
                        name: '⏳ تمت المعاقبة بالتايم أوت', 
                        iconURL: userToMute.user.displayAvatarURL({ dynamic: true }) 
                    });
                    
                    let formattedDesc = ``;
                    formattedDesc += `**👤 العضو:** <@${userToMute.id}>\n`;
                    formattedDesc += `**🛡️ بواسطة:** <@${message.author.id}>\n\n`;
                    formattedDesc += `**⏱️ المدة:** \`${displayTimeString}\`\n`;
                    formattedDesc += `**📝 السبب:** \n> ${punishmentReason}\n`;
                    
                    muteReplyEmbed.setDescription(formattedDesc);
                    muteReplyEmbed.setThumbnail(message.guild.iconURL({ dynamic: true }));
                }
                
                muteReplyEmbed.setColor(tOutColor);
                muteReplyEmbed.setTimestamp();
                
                message.reply({ embeds: [muteReplyEmbed] });

                let logDescString = `**User:** ${userToMute}\n**By:** ${message.author}\n**Duration:** ${displayTimeString}\n**Reason:** ${punishmentReason}`;
                sendActionLog(config.logTimeoutId, '⏳ Member Timed Out', logDescString, tOutColor);
                
            } catch (err) { 
                message.reply('**❌ I cannot timeout this user. Check my roles hierarchy.**'); 
            }
            return;
        }

        if (fullCommand === config.cmdUntimeout) {
            
            let hasPerm = checkUserRole(config.cmdUntimeoutRoles);
            if (!hasPerm) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            let userToUnmute = message.mentions.members.first();
            if (!userToUnmute) {
                userToUnmute = message.guild.members.cache.get(argsArray[0]);
            }
            
            if (!userToUnmute) {
                return message.reply('**⚠️ Please mention a user or provide their ID.**');
            }

            try {
                await userToUnmute.timeout(null, `Untimeout by: ${message.author.tag}`);
                
                const unmuteReplyEmbed = new EmbedBuilder();
                
                // سحب لون فك التايم
                let unMuteColor = config.untimeoutEmbedColor;
                if (!unMuteColor) {
                    unMuteColor = '#3ba55d';
                }
                
                if (config.punishmentStyle === 'custom') {
                    
                    let customTitleStr = config.customUntimeoutTitle;
                    if (!customTitleStr) customTitleStr = '🔊 Untimed Out';
                    
                    let customDescStr = config.customUntimeoutDesc;
                    if (!customDescStr) customDescStr = 'User [user] untimed out by [moderator].';
                    
                    customDescStr = customDescStr.replace(/\[user\]/g, `<@${userToUnmute.id}>`);
                    customDescStr = customDescStr.replace(/\[moderator\]/g, `<@${message.author.id}>`);
                    
                    unmuteReplyEmbed.setTitle(customTitleStr);
                    unmuteReplyEmbed.setDescription(customDescStr);
                    
                } else {
                    unmuteReplyEmbed.setTitle('🔊 تم فك التايم أوت بنجاح');
                    unmuteReplyEmbed.setDescription(`**👤 العضو:** <@${userToUnmute.id}>\n**🛡️ بواسطة:** <@${message.author.id}>`);
                }
                
                unmuteReplyEmbed.setColor(unMuteColor);
                message.reply({ embeds: [unmuteReplyEmbed] });

                let logDescString = `**User:** ${userToUnmute}\n**By:** ${message.author}`;
                sendActionLog(config.logTimeoutId, '🔊 Timeout Removed', logDescString, unMuteColor);
                
            } catch (err) { 
                message.reply('**❌ Could not remove timeout for this user.**'); 
            }
            return;
        }

        // =====================================================================
        // 🔨 أمر الباند وفكه (!ban / !unban) مع الإيمبدات والألوان
        // =====================================================================
        if (fullCommand === config.cmdBan) {
            
            let hasPerm = checkUserRole(config.cmdBanRoles);
            if (!hasPerm) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            let userToBan = message.mentions.members.first();
            if (!userToBan) {
                userToBan = message.guild.members.cache.get(argsArray[0]);
            }
            
            if (!userToBan) {
                return message.reply('**⚠️ Please mention a user or provide their ID.**');
            }
            
            let punishmentReason = argsArray.slice(1).join(' ');
            if (!punishmentReason) {
                punishmentReason = 'بدون سبب (No reason provided)';
            }
            
            try {
                await userToBan.ban({ reason: `${punishmentReason} - By: ${message.author.tag}` });
                
                const banReplyEmbed = new EmbedBuilder();
                
                // سحب لون الباند
                let banColorHex = config.banEmbedColor;
                if (!banColorHex) {
                    banColorHex = '#ed4245';
                }
                
                if (config.punishmentStyle === 'custom') {
                    
                    let customTitleStr = config.customBanTitle;
                    if (!customTitleStr) customTitleStr = '🔨 Banned';
                    
                    let customDescStr = config.customBanDesc;
                    if (!customDescStr) customDescStr = 'User [user] was banned by [moderator].\nReason: [reason]';
                    
                    customDescStr = customDescStr.replace(/\[user\]/g, `<@${userToBan.id}>`);
                    customDescStr = customDescStr.replace(/\[moderator\]/g, `<@${message.author.id}>`);
                    customDescStr = customDescStr.replace(/\[reason\]/g, punishmentReason);
                    
                    banReplyEmbed.setTitle(customTitleStr);
                    banReplyEmbed.setDescription(customDescStr);
                    
                } else {
                    
                    banReplyEmbed.setAuthor({ 
                        name: '🔨 تمت المعاقبة بالحظر (Ban)', 
                        iconURL: userToBan.user.displayAvatarURL({ dynamic: true }) 
                    });
                    
                    let formattedDesc = ``;
                    formattedDesc += `**👤 العضو:** <@${userToBan.id}>\n`;
                    formattedDesc += `**🛡️ بواسطة:** <@${message.author.id}>\n\n`;
                    formattedDesc += `**📝 السبب:** \n> ${punishmentReason}\n`;
                    
                    banReplyEmbed.setDescription(formattedDesc);
                    banReplyEmbed.setThumbnail(message.guild.iconURL({ dynamic: true }));
                }
                
                banReplyEmbed.setColor(banColorHex);
                banReplyEmbed.setTimestamp();

                message.reply({ embeds: [banReplyEmbed] });

                let logDescString = `**User:** ${userToBan}\n**By:** ${message.author}\n**Reason:** ${punishmentReason}`;
                sendActionLog(config.logBanId, '🔨 Member Banned', logDescString, banColorHex);
                
            } catch (err) { 
                message.reply('**❌ I cannot ban this user. Check my roles hierarchy.**'); 
            }
            return;
        }

        if (fullCommand === config.cmdUnban) {
            
            let hasPerm = checkUserRole(config.cmdUnbanRoles);
            if (!hasPerm) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            const userIdToUnban = argsArray[0];
            if (!userIdToUnban) {
                return message.reply('**⚠️ Please provide the user ID to unban.**');
            }
            
            try {
                await message.guild.members.unban(userIdToUnban);
                
                const unbanReplyEmbed = new EmbedBuilder();
                
                // سحب لون فك الباند
                let unbanColorHex = config.unbanEmbedColor;
                if (!unbanColorHex) {
                    unbanColorHex = '#3ba55d';
                }
                
                if (config.punishmentStyle === 'custom') {
                    
                    let customTitleStr = config.customUnbanTitle;
                    if (!customTitleStr) customTitleStr = '🕊️ Unbanned';
                    
                    let customDescStr = config.customUnbanDesc;
                    if (!customDescStr) customDescStr = 'User [user] was unbanned by [moderator].';
                    
                    customDescStr = customDescStr.replace(/\[user\]/g, `<@${userIdToUnban}>`);
                    customDescStr = customDescStr.replace(/\[moderator\]/g, `<@${message.author.id}>`);
                    
                    unbanReplyEmbed.setTitle(customTitleStr);
                    unbanReplyEmbed.setDescription(customDescStr);
                    
                } else {
                    unbanReplyEmbed.setTitle('🕊️ تم فك الحظر بنجاح');
                    unbanReplyEmbed.setDescription(`**👤 ايدي العضو:** <@${userIdToUnban}>\n**🛡️ بواسطة:** <@${message.author.id}>`);
                }
                
                unbanReplyEmbed.setColor(unbanColorHex);
                message.reply({ embeds: [unbanReplyEmbed] });

                let logDescString = `**User ID:** ${userIdToUnban}\n**By:** ${message.author}`;
                sendActionLog(config.logBanId, '🕊️ Member Unbanned', logDescString, unbanColorHex);
                
            } catch (err) { 
                message.reply('**❌ Could not unban this user. Are you sure they are banned?**'); 
            }
            return;
        }

        // =====================================================================
        // 🎙️ أوامر النقل الصوتي (!move / !vmove)
        // =====================================================================
        if (fullCommand === config.cmdVmove) {
            
            let hasPerm = checkUserRole(config.cmdVmoveRoles);
            if (!hasPerm) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            const targetUser = message.mentions.members.first();
            if (!targetUser || !targetUser.voice.channel) {
                return message.reply('**⚠️ Please mention a user who is currently in a voice channel.**');
            }
            
            const authorVoiceChannel = message.member.voice.channel;
            if (!authorVoiceChannel) {
                return message.reply('**⚠️ You must be in a voice channel yourself.**');
            }
            
            try {
                await targetUser.voice.setChannel(authorVoiceChannel);
                message.reply(`**✅ Moved ${targetUser} to your channel successfully.**`);
            } catch (err) { 
                message.reply('**❌ An error occurred while moving the user.**'); 
            }
            return;
        }

        if (fullCommand === config.cmdMove) {
            
            let hasPerm = checkUserRole(config.cmdMoveRoles);
            if (!hasPerm) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            let targetUser = message.mentions.members.first();
            if (!targetUser) {
                targetUser = message.guild.members.cache.get(argsArray[0]);
            }
            
            if (!targetUser || !targetUser.voice.channel) {
                return message.reply('**⚠️ Please mention a user who is currently in a voice channel.**');
            }

            let targetChannel = message.mentions.channels.first();
            if (!targetChannel) {
                targetChannel = message.guild.channels.cache.get(argsArray[1]);
            }
            
            if (!targetChannel || targetChannel.type !== 2) { 
                return message.reply('**⚠️ Please mention a valid voice channel. (e.g., !move @user #Voice-1)**');
            }

            try {
                await targetUser.voice.setChannel(targetChannel);
                message.reply(`**✅ Moved ${targetUser} to ${targetChannel} successfully.**`);
            } catch (err) { 
                message.reply('**❌ An error occurred while moving the user.**'); 
            }
            return;
        }

        // =====================================================================
        // 🧹 أوامر المسح والقفل
        // =====================================================================
        if (fullCommand === config.cmdClear) {
            
            let hasPerm = checkUserRole(config.cmdClearRoles);
            if (!hasPerm) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            let amountToDelete = parseInt(argsArray[0]);
            if (isNaN(amountToDelete) || amountToDelete < 1 || amountToDelete > 100) {
                return message.reply('**⚠️ Please provide a valid number between 1 and 100.**');
            }
            
            try {
                await message.channel.bulkDelete(amountToDelete, true);
                
                const replyMsg = await message.channel.send(`**✅ Successfully deleted ${amountToDelete} messages.**`);
                
                setTimeout(() => { 
                    replyMsg.delete().catch(()=>{}); 
                }, 3000);
                
            } catch (err) {}
            return;
        }

        if (fullCommand === config.cmdLock) {
            
            let hasPerm = checkUserRole(config.cmdLockRoles);
            if (!hasPerm) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            try {
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { 
                    SendMessages: false 
                });
                message.reply('**🔒 Channel has been Locked.**');
            } catch (err) {}
            return;
        }

        if (fullCommand === config.cmdUnlock) {
            
            let hasPerm = checkUserRole(config.cmdUnlockRoles);
            if (!hasPerm) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            try {
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { 
                    SendMessages: true 
                });
                message.reply('**🔓 Channel has been Unlocked.**');
            } catch (err) {}
            return;
        }

        // =====================================================================
        // 📢 أمر النداء المباشر (!req-high) مع المنشن
        // =====================================================================
        if (fullCommand === config.cmdReqHigh) {
            
            let hasPerm = checkUserRole(config.cmdReqHighRoles);
            if (!hasPerm) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            let mentionRolesString = '';
            
            if (config.tradeMentionRoles && config.tradeMentionRoles.length > 0) {
                for (let i = 0; i < config.tradeMentionRoles.length; i++) {
                    mentionRolesString += `<@&${config.tradeMentionRoles[i]}> `;
                }
            } else if (config.highMediatorRoles && config.highMediatorRoles.length > 0) {
                for (let i = 0; i < config.highMediatorRoles.length; i++) {
                    mentionRolesString += `<@&${config.highMediatorRoles[i]}> `;
                }
            }
            
            return message.channel.send(`**🚨 نداء للإدارة والموافقات العليا!** ${mentionRolesString}\nRequested by: ${message.author}`);
        }
    });
};
