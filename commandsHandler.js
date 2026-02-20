const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} = require('discord.js');

const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    
    client.on('messageCreate', async message => {
        
        // 1. تجاهل رسائل البوتات
        if (message.author.bot) {
            return;
        }

        // 2. تجاهل رسائل الخاص (يجب أن تكون في سيرفر)
        if (!message.guild) {
            return;
        }

        // 3. جلب الإعدادات من الداتابيز
        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config) {
            return;
        }

        // 4. نظام الردود التلقائية
        if (config.autoResponders && config.autoResponders.length > 0) {
            for (let i = 0; i < config.autoResponders.length; i++) {
                const responder = config.autoResponders[i];
                if (message.content.includes(responder.word)) {
                    message.reply({ content: `**${responder.reply}**` }).catch(() => {});
                }
            }
        }

        // 5. إعداد البريفكس والتحقق منه
        let prefix = config.prefix;
        if (!prefix) {
            prefix = '!';
        }
        
        if (!message.content.startsWith(prefix)) {
            return;
        }

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const fullCommand = prefix + commandName; 

        // =====================================================================
        // 🛠️ دالة التحقق من الصلاحيات
        // =====================================================================
        const hasRole = (allowedRoles) => {
            if (!allowedRoles || allowedRoles.length === 0) {
                return message.member.permissions.has('Administrator');
            }
            
            let isAllowed = false;
            
            if (message.member.permissions.has('Administrator')) {
                isAllowed = true;
            } else {
                for (let i = 0; i < allowedRoles.length; i++) {
                    if (message.member.roles.cache.has(allowedRoles[i])) {
                        isAllowed = true;
                        break;
                    }
                }
            }
            return isAllowed;
        };

        // =====================================================================
        // 🛠️ دالة إرسال اللوجات للرومات المخصصة
        // =====================================================================
        const sendLog = async (logChannelId, title, desc, color) => {
            if (!logChannelId) return;
            
            const logChannel = message.guild.channels.cache.get(logChannelId);
            if (!logChannel) return;
            
            const logEmbed = new EmbedBuilder();
            logEmbed.setTitle(title);
            logEmbed.setDescription(desc);
            logEmbed.setColor(color);
            logEmbed.setTimestamp();
            logEmbed.setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) });
            
            await logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
        };

        // =====================================================================
        // 🤝 أمر تقييم الوسيط (!done)
        // =====================================================================
        if (fullCommand === config.cmdDone) {
            
            if (!hasRole(config.cmdDoneRoles)) {
                return message.reply('**❌ You do not have permission to use this command.**');
            }
            
            const topicData = message.channel.topic;
            if (!topicData) {
                return message.reply('**❌ This command can only be used inside a ticket.**');
            }
            
            const parts = topicData.split('_');
            const ticketOwnerId = parts[0]; 
            
            if (!ticketOwnerId || ticketOwnerId === 'none') {
                return message.reply('**❌ This command can only be used inside a ticket.**');
            }
            
            try {
                const owner = await message.guild.members.fetch(ticketOwnerId);
                const guildName = message.guild.name;
                
                const ratingEmbed = new EmbedBuilder();
                
                let embedTitle = 'تقييم الوساطة';
                let descText = '';
                
                if (config.ratingStyle === 'custom' && config.customRatingText) {
                    embedTitle = config.customRatingTitle;
                    if (!embedTitle) embedTitle = 'تقييم فريق العمل';
                    
                    descText = config.customRatingText
                        .replace(/\[staff\]/g, `<@${message.author.id}>`)
                        .replace(/\[user\]/g, `<@${owner.id}>`)
                        .replace(/\[server\]/g, guildName);
                } else {
                    descText = `لقد أتممت معاملتك بنجاح في سيرفر **${guildName}**.\n\nيرجى تقييم خدمة الوسيط <@${message.author.id}> بالضغط على النجوم في الأسفل.`;
                }
                
                ratingEmbed.setTitle(embedTitle);
                ratingEmbed.setDescription(descText);
                
                let embedColor = config.basicRatingColor;
                if (!embedColor) embedColor = '#f2a658';
                ratingEmbed.setColor(embedColor);
                
                ratingEmbed.setFooter({ 
                    text: guildName, 
                    iconURL: message.guild.iconURL({ dynamic: true }) 
                });
                
                const ratingRow = new ActionRowBuilder();
                
                const star1 = new ButtonBuilder().setCustomId(`rate_mediator_1_${message.author.id}_${message.guild.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary);
                const star2 = new ButtonBuilder().setCustomId(`rate_mediator_2_${message.author.id}_${message.guild.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary);
                const star3 = new ButtonBuilder().setCustomId(`rate_mediator_3_${message.author.id}_${message.guild.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                const star4 = new ButtonBuilder().setCustomId(`rate_mediator_4_${message.author.id}_${message.guild.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                const star5 = new ButtonBuilder().setCustomId(`rate_mediator_5_${message.author.id}_${message.guild.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                
                ratingRow.addComponents(star1, star2, star3, star4, star5);
                
                await owner.send({ embeds: [ratingEmbed], components: [ratingRow] });
                
                return message.reply('**✅ تم إرسال طلب التقييم للعضو في الخاص بنجاح.**');
                
            } catch (err) { 
                return message.reply('**❌ لا يمكن إرسال رسالة لهذا العضو (الخاص مغلق).**'); 
            }
        }

        // =====================================================================
        // ⚖️ أمر التريد والموافقة (!trade)
        // =====================================================================
        if (fullCommand === config.cmdTrade) {
            
            if (!hasRole(config.cmdTradeRoles)) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            const tradeInitEmbed = new EmbedBuilder();
            tradeInitEmbed.setTitle('📝 تفاصيل التريد');
            tradeInitEmbed.setDescription('يرجى الضغط على الزر أدناه لكتابة تفاصيل التريد.');
            
            let tColor = config.tradeEmbedColor;
            if (!tColor) tColor = '#f2a658';
            tradeInitEmbed.setColor(tColor);

            const tradeRow = new ActionRowBuilder();
            
            const tradeBtn = new ButtonBuilder();
            tradeBtn.setCustomId('open_trade_modal');
            tradeBtn.setLabel('كتابة تفاصيل التريد ✍️');
            tradeBtn.setStyle(ButtonStyle.Primary);
            
            tradeRow.addComponents(tradeBtn);

            return message.channel.send({ 
                embeds: [tradeInitEmbed], 
                components: [tradeRow] 
            });
        }

        // =====================================================================
        // 🔨 أوامر الباند وفكه (!ban / !unban) مع الإيمبدات المخصصة
        // =====================================================================
        if (fullCommand === config.cmdBan) {
            
            if (!hasRole(config.cmdBanRoles)) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            let userToBan = message.mentions.members.first();
            if (!userToBan) {
                userToBan = message.guild.members.cache.get(args[0]);
            }
            
            if (!userToBan) {
                return message.reply('**⚠️ Please mention a user or provide their ID.**');
            }
            
            let reason = args.slice(1).join(' ');
            if (!reason) {
                reason = 'No reason provided';
            }
            
            try {
                await userToBan.ban({ reason: `${reason} - By: ${message.author.tag}` });
                
                const banReplyEmbed = new EmbedBuilder();
                let banColor = '#ed4245';
                
                if (config.punishmentStyle === 'custom') {
                    let customTitle = config.customBanTitle || '🔨 Banned';
                    let customDesc = config.customBanDesc || 'User [user] was banned by [moderator].';
                    
                    customDesc = customDesc.replace(/\[user\]/g, `<@${userToBan.id}>`);
                    customDesc = customDesc.replace(/\[moderator\]/g, `<@${message.author.id}>`);
                    customDesc = customDesc.replace(/\[reason\]/g, reason);
                    
                    banReplyEmbed.setTitle(customTitle);
                    banReplyEmbed.setDescription(customDesc);
                } else {
                    banReplyEmbed.setTitle('🔨 Banned Successfully');
                    banReplyEmbed.setDescription(`**User:** <@${userToBan.id}>\n**Moderator:** <@${message.author.id}>\n**Reason:** ${reason}`);
                }
                
                banReplyEmbed.setColor(banColor);
                message.reply({ embeds: [banReplyEmbed] });

                sendLog(config.logBanId, '🔨 Member Banned', `**User:** ${userToBan}\n**By:** ${message.author}\n**Reason:** ${reason}`, banColor);
                
            } catch (err) { 
                message.reply('**❌ I cannot ban this user.**'); 
            }
            return;
        }

        if (fullCommand === config.cmdUnban) {
            
            if (!hasRole(config.cmdUnbanRoles)) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            const userId = args[0];
            if (!userId) {
                return message.reply('**⚠️ Please provide the user ID to unban.**');
            }
            
            try {
                await message.guild.members.unban(userId);
                
                const unbanReplyEmbed = new EmbedBuilder();
                let unbanColor = '#3ba55d';
                
                if (config.punishmentStyle === 'custom') {
                    let customTitle = config.customUnbanTitle || '🕊️ Unbanned';
                    let customDesc = config.customUnbanDesc || 'User [user] was unbanned by [moderator].';
                    
                    customDesc = customDesc.replace(/\[user\]/g, `<@${userId}>`);
                    customDesc = customDesc.replace(/\[moderator\]/g, `<@${message.author.id}>`);
                    
                    unbanReplyEmbed.setTitle(customTitle);
                    unbanReplyEmbed.setDescription(customDesc);
                } else {
                    unbanReplyEmbed.setTitle('🕊️ Unbanned Successfully');
                    unbanReplyEmbed.setDescription(`**User ID:** <@${userId}>\n**Moderator:** <@${message.author.id}>`);
                }
                
                unbanReplyEmbed.setColor(unbanColor);
                message.reply({ embeds: [unbanReplyEmbed] });

                sendLog(config.logBanId, '🕊️ Member Unbanned', `**User ID:** ${userId}\n**By:** ${message.author}`, unbanColor);
                
            } catch (err) { 
                message.reply('**❌ Could not unban this user.**'); 
            }
            return;
        }

        // =====================================================================
        // ⏳ أوامر التايم أوت وفكه (!timeout / !untimeout) مع الإيمبدات المخصصة
        // =====================================================================
        if (fullCommand === config.cmdTimeout) {
            
            if (!hasRole(config.cmdTimeoutRoles)) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            let userToMute = message.mentions.members.first();
            if (!userToMute) {
                userToMute = message.guild.members.cache.get(args[0]);
            }
            
            if (!userToMute) {
                return message.reply('**⚠️ Please mention a user or provide their ID.**');
            }
            
            let durationMins = parseInt(args[1]);
            if (isNaN(durationMins)) {
                durationMins = 5; 
            }
            
            let reason = args.slice(2).join(' ');
            if (!reason) {
                reason = 'No reason provided';
            }

            try {
                await userToMute.timeout(durationMins * 60 * 1000, `${reason} - By: ${message.author.tag}`);
                
                const muteReplyEmbed = new EmbedBuilder();
                let muteColor = '#f2a658';
                
                if (config.punishmentStyle === 'custom') {
                    let customTitle = config.customTimeoutTitle || '⏳ Timed Out';
                    let customDesc = config.customTimeoutDesc || 'User [user] timed out by [moderator] for [duration] mins.';
                    
                    customDesc = customDesc.replace(/\[user\]/g, `<@${userToMute.id}>`);
                    customDesc = customDesc.replace(/\[moderator\]/g, `<@${message.author.id}>`);
                    customDesc = customDesc.replace(/\[reason\]/g, reason);
                    customDesc = customDesc.replace(/\[duration\]/g, durationMins);
                    
                    muteReplyEmbed.setTitle(customTitle);
                    muteReplyEmbed.setDescription(customDesc);
                } else {
                    muteReplyEmbed.setTitle('⏳ Timed Out Successfully');
                    muteReplyEmbed.setDescription(`**User:** <@${userToMute.id}>\n**Moderator:** <@${message.author.id}>\n**Duration:** ${durationMins} Mins\n**Reason:** ${reason}`);
                }
                
                muteReplyEmbed.setColor(muteColor);
                message.reply({ embeds: [muteReplyEmbed] });

                sendLog(config.logTimeoutId, '⏳ Member Timed Out', `**User:** ${userToMute}\n**By:** ${message.author}\n**Duration:** ${durationMins} mins\n**Reason:** ${reason}`, muteColor);
                
            } catch (err) { 
                message.reply('**❌ I cannot timeout this user.**'); 
            }
            return;
        }

        if (fullCommand === config.cmdUntimeout) {
            
            if (!hasRole(config.cmdUntimeoutRoles)) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            let userToUnmute = message.mentions.members.first();
            if (!userToUnmute) {
                userToUnmute = message.guild.members.cache.get(args[0]);
            }
            
            if (!userToUnmute) {
                return message.reply('**⚠️ Please mention a user or provide their ID.**');
            }

            try {
                await userToUnmute.timeout(null, `Untimeout by: ${message.author.tag}`);
                
                const unmuteReplyEmbed = new EmbedBuilder();
                let unmuteColor = '#3ba55d';
                
                if (config.punishmentStyle === 'custom') {
                    let customTitle = config.customUntimeoutTitle || '🔊 Untimed Out';
                    let customDesc = config.customUntimeoutDesc || 'User [user] untimed out by [moderator].';
                    
                    customDesc = customDesc.replace(/\[user\]/g, `<@${userToUnmute.id}>`);
                    customDesc = customDesc.replace(/\[moderator\]/g, `<@${message.author.id}>`);
                    
                    unmuteReplyEmbed.setTitle(customTitle);
                    unmuteReplyEmbed.setDescription(customDesc);
                } else {
                    unmuteReplyEmbed.setTitle('🔊 Untimed Out Successfully');
                    unmuteReplyEmbed.setDescription(`**User:** <@${userToUnmute.id}>\n**Moderator:** <@${message.author.id}>`);
                }
                
                unmuteReplyEmbed.setColor(unmuteColor);
                message.reply({ embeds: [unmuteReplyEmbed] });

                sendLog(config.logTimeoutId, '🔊 Timeout Removed', `**User:** ${userToUnmute}\n**By:** ${message.author}`, unmuteColor);
                
            } catch (err) { 
                message.reply('**❌ Could not remove timeout.**'); 
            }
            return;
        }

        // =====================================================================
        // 🎙️ أوامر النقل الصوتي (!move / !vmove)
        // =====================================================================
        if (fullCommand === config.cmdVmove) {
            
            if (!hasRole(config.cmdVmoveRoles)) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            const targetUser = message.mentions.members.first();
            if (!targetUser || !targetUser.voice.channel) {
                return message.reply('**⚠️ Please mention a user in a voice channel.**');
            }
            
            const authorVoice = message.member.voice.channel;
            if (!authorVoice) {
                return message.reply('**⚠️ You must be in a voice channel.**');
            }
            
            try {
                await targetUser.voice.setChannel(authorVoice);
                message.reply(`**✅ Moved ${targetUser} to your channel.**`);
            } catch (err) { 
                message.reply('**❌ An error occurred.**'); 
            }
            return;
        }

        if (fullCommand === config.cmdMove) {
            
            if (!hasRole(config.cmdMoveRoles)) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            let targetUser = message.mentions.members.first();
            if (!targetUser) {
                targetUser = message.guild.members.cache.get(args[0]);
            }
            
            if (!targetUser || !targetUser.voice.channel) {
                return message.reply('**⚠️ Please mention a user in a voice channel.**');
            }

            let targetChannel = message.mentions.channels.first();
            if (!targetChannel) {
                targetChannel = message.guild.channels.cache.get(args[1]);
            }
            
            if (!targetChannel || targetChannel.type !== 2) { 
                return message.reply('**⚠️ Please mention a valid voice channel. (e.g., !move @user #Voice-1)**');
            }

            try {
                await targetUser.voice.setChannel(targetChannel);
                message.reply(`**✅ Moved ${targetUser} to ${targetChannel}.**`);
            } catch (err) { 
                message.reply('**❌ An error occurred.**'); 
            }
            return;
        }

        // =====================================================================
        // 🧹 أوامر المسح والقفل والنداء
        // =====================================================================
        if (fullCommand === config.cmdClear) {
            
            if (!hasRole(config.cmdClearRoles)) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            let amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1 || amount > 100) {
                return message.reply('**⚠️ Provide a number between 1-100.**');
            }
            
            try {
                await message.channel.bulkDelete(amount, true);
                const replyMsg = await message.channel.send(`**✅ Deleted ${amount} messages.**`);
                setTimeout(() => { 
                    replyMsg.delete().catch(()=>{}); 
                }, 3000);
            } catch (err) {}
            return;
        }

        if (fullCommand === config.cmdLock) {
            if (!hasRole(config.cmdLockRoles)) {
                return message.reply('**❌ You do not have permission.**');
            }
            try {
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { 
                    SendMessages: false 
                });
                message.reply('**🔒 Channel Locked.**');
            } catch (err) {}
            return;
        }

        if (fullCommand === config.cmdUnlock) {
            if (!hasRole(config.cmdUnlockRoles)) {
                return message.reply('**❌ You do not have permission.**');
            }
            try {
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { 
                    SendMessages: true 
                });
                message.reply('**🔓 Channel Unlocked.**');
            } catch (err) {}
            return;
        }

        if (fullCommand === config.cmdReqHigh) {
            if (!hasRole(config.cmdReqHighRoles)) {
                return message.reply('**❌ You do not have permission.**');
            }
            
            let highMentions = '';
            if (config.highMediatorRoles && config.highMediatorRoles.length > 0) {
                highMentions = config.highMediatorRoles.map(id => `<@&${id}>`).join(' ');
            }
            
            return message.channel.send(`**🚨 High Staff Required!** ${highMentions}\nRequested by: ${message.author}`);
        }
    });
};
