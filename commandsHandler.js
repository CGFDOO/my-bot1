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
        
        // =====================================================================
        // 1. تجاهل رسائل البوتات والرسائل في الخاص
        // =====================================================================
        if (message.author.bot) return;
        if (!message.guild) return;

        // =====================================================================
        // 2. جلب إعدادات السيرفر الحالي من قاعدة البيانات (كل سيرفر مستقل تماماً)
        // =====================================================================
        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config) return;

        // =====================================================================
        // 3. نظام الردود التلقائية (Auto Responders)
        // =====================================================================
        if (config.autoResponders && config.autoResponders.length > 0) {
            for (let i = 0; i < config.autoResponders.length; i++) {
                const responder = config.autoResponders[i];
                if (message.content.includes(responder.word)) {
                    message.reply(responder.reply).catch(() => {});
                }
            }
        }

        // =====================================================================
        // 4. التحقق من البريفكس الديناميكي
        // =====================================================================
        let prefix = config.prefix;
        if (!prefix) prefix = '!';
        
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const fullCommand = prefix + commandName; 

        // =====================================================================
        // 🛠️ دالة مساعدة: التحقق من الصلاحيات (ديناميكية من الداشبورد)
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
        // 🛠️ دالة مساعدة: إرسال اللوجات للرومات المخصصة
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
            
            await logChannel.send({ embeds: [logEmbed] }).catch(()=>{});
        };

        // =====================================================================
        // 🤝 أمر تقييم الوسيط (!done) - تم إصلاح القراءة من Topic
        // =====================================================================
        if (fullCommand === config.cmdDone) {
            if (!hasRole(config.cmdDoneRoles)) {
                return message.reply('**❌ You do not have permission to use this command.**');
            }
            
            const topicData = message.channel.topic || '';
            const parts = topicData.split('_');
            const ticketOwnerId = parts[0]; // قراءة الأيدي الصحيح من الوصف
            
            if (!ticketOwnerId || ticketOwnerId === 'none') {
                return message.reply('**❌ This command can only be used inside tickets.**');
            }
            
            try {
                const owner = await message.guild.members.fetch(ticketOwnerId);
                const guildName = message.guild.name;
                
                const ratingEmbed = new EmbedBuilder();
                ratingEmbed.setTitle('Middleman Feedback');
                ratingEmbed.setDescription(`Thank you for completing your trade in **${guildName}**.\n\nPlease rate the middleman <@${message.author.id}> by clicking the stars below.`);
                ratingEmbed.setColor(config.basicRatingColor || '#f2a658');
                ratingEmbed.setFooter({ text: guildName, iconURL: message.guild.iconURL({ dynamic: true }) });
                ratingEmbed.setTimestamp();
                
                const ratingRow = new ActionRowBuilder();
                ratingRow.addComponents(
                    new ButtonBuilder().setCustomId(`rate_mediator_1_${message.author.id}_${message.guild.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_mediator_2_${message.author.id}_${message.guild.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_mediator_3_${message.author.id}_${message.guild.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_mediator_4_${message.author.id}_${message.guild.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_mediator_5_${message.author.id}_${message.guild.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary)
                );
                
                await owner.send({ embeds: [ratingEmbed], components: [ratingRow] });
                return message.reply('**✅ Rating request has been sent to the user\'s DM.**');
            } catch (err) { 
                return message.reply('**❌ Cannot send DM to this user (DMs are closed).**'); 
            }
        }

        // =====================================================================
        // ⚖️ أمر التريد والموافقة (!trade)
        // =====================================================================
        if (fullCommand === config.cmdTrade) {
            if (!hasRole(config.cmdTradeRoles)) return message.reply('**❌ You do not have permission.**');
            
            const tradeDetails = args.join(' ');
            if (!tradeDetails) return message.reply('**⚠️ Please provide trade details. (e.g., !trade Account for 10$)**');

            const tradeEmbed = new EmbedBuilder();
            tradeEmbed.setTitle('⚖️ Trade Approval Request');
            tradeEmbed.setDescription(`**Middleman:** <@${message.author.id}>\n\n**Details:**\n${tradeDetails}\n\n⏳ *Waiting for high staff approval...*`);
            tradeEmbed.setColor('#f2a658');
            tradeEmbed.setTimestamp();

            const tradeRow = new ActionRowBuilder();
            tradeRow.addComponents(
                new ButtonBuilder().setCustomId('trade_approve').setLabel('Approve ✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('trade_reject').setLabel('Reject ❌').setStyle(ButtonStyle.Danger)
            );

            let highMentions = '';
            if (config.highMediatorRoles && config.highMediatorRoles.length > 0) {
                highMentions = config.highMediatorRoles.map(id => `<@&${id}>`).join(' ');
            }
            
            return message.channel.send({ content: `${highMentions} **Approval Required!**`, embeds: [tradeEmbed], components: [tradeRow] });
        }

        // =====================================================================
        // 🔨 أوامر الباند وفك الباند (!ban / !unban)
        // =====================================================================
        if (fullCommand === config.cmdBan) {
            if (!hasRole(config.cmdBanRoles)) return message.reply('**❌ You do not have permission.**');
            
            const userToBan = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!userToBan) return message.reply('**⚠️ Please mention a user or provide their ID.**');
            
            let reason = args.slice(1).join(' ');
            if (!reason) reason = 'No reason provided';
            
            try {
                await userToBan.ban({ reason: `${reason} - By: ${message.author.tag}` });
                message.reply(`**✅ Successfully banned ${userToBan.user.tag}.**`);
                sendLog(config.logBanId, '🔨 Member Banned', `**User:** ${userToBan}\n**By:** ${message.author}\n**Reason:** ${reason}`, '#ed4245');
            } catch (err) {
                message.reply('**❌ I cannot ban this user. Check my role hierarchy.**');
            }
            return;
        }

        if (fullCommand === config.cmdUnban) {
            if (!hasRole(config.cmdUnbanRoles)) return message.reply('**❌ You do not have permission.**');
            
            const userId = args[0];
            if (!userId) return message.reply('**⚠️ Please provide the user ID to unban.**');
            
            try {
                await message.guild.members.unban(userId);
                message.reply(`**✅ Successfully unbanned ID: ${userId}.**`);
                sendLog(config.logBanId, '🕊️ Member Unbanned', `**User ID:** ${userId}\n**By:** ${message.author}`, '#3ba55d');
            } catch (err) {
                message.reply('**❌ Could not unban this user. Are they really banned?**');
            }
            return;
        }

        // =====================================================================
        // ⏳ أوامر التايم أوت وفكه (!timeout / !untimeout)
        // =====================================================================
        if (fullCommand === config.cmdTimeout) {
            if (!hasRole(config.cmdTimeoutRoles)) return message.reply('**❌ You do not have permission.**');
            
            const userToMute = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!userToMute) return message.reply('**⚠️ Please mention a user or provide their ID.**');
            
            let durationMins = parseInt(args[1]);
            if (isNaN(durationMins)) durationMins = 5; 
            
            let reason = args.slice(2).join(' ');
            if (!reason) reason = 'No reason provided';

            try {
                await userToMute.timeout(durationMins * 60 * 1000, `${reason} - By: ${message.author.tag}`);
                message.reply(`**✅ Successfully timed out ${userToMute.user.tag} for ${durationMins} minutes.**`);
                sendLog(config.logTimeoutId, '⏳ Member Timed Out', `**User:** ${userToMute}\n**By:** ${message.author}\n**Duration:** ${durationMins} mins\n**Reason:** ${reason}`, '#f2a658');
            } catch (err) {
                message.reply('**❌ I cannot timeout this user.**');
            }
            return;
        }

        if (fullCommand === config.cmdUntimeout) {
            if (!hasRole(config.cmdUntimeoutRoles)) return message.reply('**❌ You do not have permission.**');
            
            const userToUnmute = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!userToUnmute) return message.reply('**⚠️ Please mention a user or provide their ID.**');

            try {
                await userToUnmute.timeout(null, `Untimeout by: ${message.author.tag}`);
                message.reply(`**✅ Successfully removed timeout for ${userToUnmute.user.tag}.**`);
                sendLog(config.logTimeoutId, '🔊 Timeout Removed', `**User:** ${userToUnmute}\n**By:** ${message.author}`, '#3ba55d');
            } catch (err) {
                message.reply('**❌ Could not remove timeout for this user.**');
            }
            return;
        }

        // =====================================================================
        // 🎙️ أوامر السحب الصوتي (!move / !vmove)
        // =====================================================================
        // أمر VMOVE: سحب العضو للروم اللي أنت فيها
        if (fullCommand === config.cmdVmove) {
            if (!hasRole(config.cmdVmoveRoles)) return message.reply('**❌ You do not have permission.**');
            
            const targetUser = message.mentions.members.first();
            if (!targetUser || !targetUser.voice.channel) {
                return message.reply('**⚠️ Please mention a user who is currently in a voice channel.**');
            }
            
            const authorVoice = message.member.voice.channel;
            if (!authorVoice) {
                return message.reply('**⚠️ You must be in a voice channel to pull someone to you.**');
            }
            
            try {
                await targetUser.voice.setChannel(authorVoice);
                message.reply(`**✅ Successfully moved ${targetUser} to your channel.**`);
            } catch (err) {
                message.reply('**❌ An error occurred while moving the user.**');
            }
            return;
        }

        // أمر MOVE: نقل العضو لروم معينة (مثال: !move @user #channel)
        if (fullCommand === config.cmdMove) {
            if (!hasRole(config.cmdMoveRoles)) return message.reply('**❌ You do not have permission.**');
            
            const targetUser = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!targetUser || !targetUser.voice.channel) {
                return message.reply('**⚠️ Please mention a user who is currently in a voice channel.**');
            }

            const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
            if (!targetChannel || targetChannel.type !== 2) { // Type 2 is Voice Channel
                return message.reply('**⚠️ Please mention a valid voice channel. (e.g., !move @user #Voice-1)**');
            }

            try {
                await targetUser.voice.setChannel(targetChannel);
                message.reply(`**✅ Successfully moved ${targetUser} to ${targetChannel}.**`);
            } catch (err) {
                message.reply('**❌ An error occurred while moving the user.**');
            }
            return;
        }

        // =====================================================================
        // 🧹 أوامر المسح والقفل (!clear / !lock / !unlock)
        // =====================================================================
        if (fullCommand === config.cmdClear) {
            if (!hasRole(config.cmdClearRoles)) return message.reply('**❌ You do not have permission.**');
            
            let amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1 || amount > 100) {
                return message.reply('**⚠️ Please specify a number between 1 and 100.**');
            }
            
            try {
                await message.channel.bulkDelete(amount, true);
                const replyMsg = await message.channel.send(`**✅ Successfully deleted ${amount} messages.**`);
                setTimeout(() => { replyMsg.delete().catch(()=>{}); }, 3000);
            } catch (err) {
                message.reply('**❌ An error occurred.**');
            }
            return;
        }

        if (fullCommand === config.cmdLock) {
            if (!hasRole(config.cmdLockRoles)) return message.reply('**❌ You do not have permission.**');
            try {
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
                message.reply('**🔒 This channel has been locked.**');
            } catch (err) {}
            return;
        }

        if (fullCommand === config.cmdUnlock) {
            if (!hasRole(config.cmdUnlockRoles)) return message.reply('**❌ You do not have permission.**');
            try {
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
                message.reply('**🔓 This channel has been unlocked.**');
            } catch (err) {}
            return;
        }

        // =====================================================================
        // 📢 أوامر النداء (!come / !req-high)
        // =====================================================================
        if (fullCommand === config.cmdReqHigh) {
            if (!hasRole(config.cmdReqHighRoles)) return message.reply('**❌ You do not have permission.**');
            let highMentions = '';
            if (config.highMediatorRoles && config.highMediatorRoles.length > 0) {
                highMentions = config.highMediatorRoles.map(id => `<@&${id}>`).join(' ');
            }
            return message.channel.send(`**🚨 High Staff Required!** ${highMentions}\nRequested by: ${message.author}`);
        }
    });
};
