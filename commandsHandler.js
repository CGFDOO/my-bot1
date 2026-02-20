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
        
        if (message.author.bot || !message.guild) return;

        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config) return;

        let prefix = config.prefix || '!';
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const fullCommand = prefix + commandName; 

        // دالة فحص الصلاحيات
        const hasRole = (allowedRoles) => {
            if (!allowedRoles || allowedRoles.length === 0) return message.member.permissions.has('Administrator');
            if (message.member.permissions.has('Administrator')) return true;
            for (let i = 0; i < allowedRoles.length; i++) {
                if (message.member.roles.cache.has(allowedRoles[i])) return true;
            }
            return false;
        };

        // دالة اللوجات
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
        // 🤝 أمر تقييم الوسيط (!done) وسحب تفاصيل التريد
        // =====================================================================
        if (fullCommand === config.cmdDone) {
            if (!hasRole(config.cmdDoneRoles)) return message.reply('**❌ You do not have permission.**');
            
            const topicData = message.channel.topic;
            if (!topicData) return message.reply('**❌ This command can only be used inside a ticket.**');
            
            const parts = topicData.split('_');
            const ticketOwnerId = parts[0]; 
            
            if (!ticketOwnerId || ticketOwnerId === 'none') return message.reply('**❌ This command can only be used inside a ticket.**');
            
            try {
                // سحب تفاصيل التريد من الشات لدمجها في التقييم
                let extractedTradeDetails = 'لا يوجد تفاصيل مسجلة';
                const fetchedMessages = await message.channel.messages.fetch({ limit: 100 });
                const tradeMsg = fetchedMessages.find(m => m.embeds[0] && m.embeds[0].title === '⚖️ Trade Approval Request');
                
                if (tradeMsg) {
                    const descParts = tradeMsg.embeds[0].description.split('**Details:**\n```');
                    if (descParts.length > 1) {
                        extractedTradeDetails = descParts[1].split('```')[0]; 
                    }
                }

                const owner = await message.guild.members.fetch(ticketOwnerId);
                const guildName = message.guild.name;
                
                const ratingEmbed = new EmbedBuilder();
                let embedTitle = config.customMedRatingTitle || 'تقييم الوساطة';
                
                let descText = `لقد أتممت معاملتك بنجاح في سيرفر **${guildName}**.\n\n`;
                descText += `يرجى تقييم خدمة الوسيط <@${message.author.id}> بالضغط على النجوم في الأسفل.\n\n`;
                descText += `> **📦 تفاصيل المعاملة:**\n> ${extractedTradeDetails}\n`;
                
                ratingEmbed.setTitle(embedTitle);
                ratingEmbed.setDescription(descText);
                ratingEmbed.setColor(config.basicRatingColor || '#f2a658');
                ratingEmbed.setFooter({ text: guildName, iconURL: message.guild.iconURL({ dynamic: true }) });
                
                const ratingRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`rate_mediator_1_${message.author.id}_${message.guild.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_mediator_2_${message.author.id}_${message.guild.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_mediator_3_${message.author.id}_${message.guild.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_mediator_4_${message.author.id}_${message.guild.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_mediator_5_${message.author.id}_${message.guild.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary)
                );
                
                await owner.send({ embeds: [ratingEmbed], components: [ratingRow] });
                return message.reply('**✅ تم إرسال طلب التقييم (مع تفاصيل التريد) للعضو في الخاص بنجاح.**');
            } catch (err) { 
                return message.reply('**❌ لا يمكن إرسال رسالة لهذا العضو (الخاص مغلق).**'); 
            }
        }

        // =====================================================================
        // ⚖️ أمر التريد والموافقة (!trade)
        // =====================================================================
        if (fullCommand === config.cmdTrade) {
            if (!hasRole(config.cmdTradeRoles)) return message.reply('**❌ You do not have permission.**');
            
            const tradeInitEmbed = new EmbedBuilder();
            tradeInitEmbed.setTitle('📝 تفاصيل التريد');
            tradeInitEmbed.setDescription('يرجى الضغط على الزر أدناه لكتابة تفاصيل التريد.');
            tradeInitEmbed.setColor(config.tradeEmbedColor || '#f2a658');

            const tradeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_trade_modal').setLabel('كتابة تفاصيل التريد ✍️').setStyle(ButtonStyle.Primary)
            );

            await message.delete().catch(()=>{});
            return message.channel.send({ embeds: [tradeInitEmbed], components: [tradeRow] });
        }

        // =====================================================================
        // ⏳ أمر التايم أوت مع مُحلل الوقت (Time Parser) والتصميم الفخم
        // =====================================================================
        if (fullCommand === config.cmdTimeout) {
            if (!hasRole(config.cmdTimeoutRoles)) return message.reply('**❌ You do not have permission.**');
            
            let userToMute = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!userToMute) return message.reply('**⚠️ Please mention a user or provide their ID.**');
            
            let timeString = args[1] || '5m'; // الافتراضي 5 دقائق
            let durationMs = 0;
            let displayTime = '';

            // 🔥 مُحلل الوقت (حساب الأيام، الساعات، الدقائق)
            if (timeString.endsWith('d')) {
                let val = parseInt(timeString.replace('d', ''));
                durationMs = val * 24 * 60 * 60 * 1000;
                displayTime = `${val} Days`;
            } else if (timeString.endsWith('h')) {
                let val = parseInt(timeString.replace('h', ''));
                durationMs = val * 60 * 60 * 1000;
                displayTime = `${val} Hours`;
            } else if (timeString.endsWith('m')) {
                let val = parseInt(timeString.replace('m', ''));
                durationMs = val * 60 * 1000;
                displayTime = `${val} Minutes`;
            } else if (timeString.endsWith('s')) {
                let val = parseInt(timeString.replace('s', ''));
                durationMs = val * 1000;
                displayTime = `${val} Seconds`;
            } else {
                let val = parseInt(timeString); // لو كتب رقم بس يعتبره دقايق
                durationMs = val * 60 * 1000;
                displayTime = `${val} Minutes`;
            }

            if (isNaN(durationMs) || durationMs <= 0) return message.reply('**⚠️ Invalid time format. Use: 3d, 12h, 5m**');

            let reason = args.slice(2).join(' ') || 'No reason provided';

            try {
                await userToMute.timeout(durationMs, `${reason} - By: ${message.author.tag}`);
                
                // تصميم فخم وكبير لإيمبد التايم أوت
                const muteReplyEmbed = new EmbedBuilder();
                muteReplyEmbed.setAuthor({ name: '⏳ Member Timed Out', iconURL: userToMute.user.displayAvatarURL({ dynamic: true }) });
                
                let desc = ``;
                desc += `**👤 User:** <@${userToMute.id}>\n`;
                desc += `**🛡️ Moderator:** <@${message.author.id}>\n\n`;
                desc += `**⏱️ Duration:** \`${displayTime}\`\n`;
                desc += `**📝 Reason:** \n> ${reason}\n`;
                
                muteReplyEmbed.setDescription(desc);
                muteReplyEmbed.setColor('#f2a658');
                muteReplyEmbed.setThumbnail(message.guild.iconURL({ dynamic: true }));
                muteReplyEmbed.setTimestamp();
                
                message.reply({ embeds: [muteReplyEmbed] });

                sendLog(config.logTimeoutId, '⏳ Member Timed Out', desc, '#f2a658');
            } catch (err) { 
                message.reply('**❌ I cannot timeout this user. Check my roles.**'); 
            }
            return;
        }

        // =====================================================================
        // 🔨 أمر الباند (تصميم فخم)
        // =====================================================================
        if (fullCommand === config.cmdBan) {
            if (!hasRole(config.cmdBanRoles)) return message.reply('**❌ You do not have permission.**');
            let userToBan = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!userToBan) return message.reply('**⚠️ Please mention a user or provide their ID.**');
            let reason = args.slice(1).join(' ') || 'No reason provided';
            
            try {
                await userToBan.ban({ reason: `${reason} - By: ${message.author.tag}` });
                
                const banReplyEmbed = new EmbedBuilder();
                banReplyEmbed.setAuthor({ name: '🔨 Member Banned', iconURL: userToBan.user.displayAvatarURL({ dynamic: true }) });
                
                let desc = ``;
                desc += `**👤 User:** <@${userToBan.id}>\n`;
                desc += `**🛡️ Moderator:** <@${message.author.id}>\n\n`;
                desc += `**📝 Reason:** \n> ${reason}\n`;
                
                banReplyEmbed.setDescription(desc);
                banReplyEmbed.setColor('#ed4245');
                banReplyEmbed.setThumbnail(message.guild.iconURL({ dynamic: true }));
                banReplyEmbed.setTimestamp();

                message.reply({ embeds: [banReplyEmbed] });
                sendLog(config.logBanId, '🔨 Member Banned', desc, '#ed4245');
            } catch (err) { message.reply('**❌ I cannot ban this user.**'); }
            return;
        }

        // باقي أوامر الفك والنقل (نفس القديمة وتعمل بكفاءة)
        if (fullCommand === config.cmdUnban) {
            if (!hasRole(config.cmdUnbanRoles)) return message.reply('**❌ You do not have permission.**');
            const userId = args[0];
            if (!userId) return message.reply('**⚠️ Please provide the user ID to unban.**');
            try {
                await message.guild.members.unban(userId);
                message.reply(`**✅ Successfully unbanned ID: ${userId}.**`);
            } catch (err) { message.reply('**❌ Could not unban this user.**'); }
            return;
        }

        if (fullCommand === config.cmdUntimeout) {
            if (!hasRole(config.cmdUntimeoutRoles)) return message.reply('**❌ You do not have permission.**');
            let userToUnmute = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!userToUnmute) return message.reply('**⚠️ Please mention a user.**');
            try {
                await userToUnmute.timeout(null, `Untimeout by: ${message.author.tag}`);
                message.reply(`**✅ Successfully removed timeout for ${userToUnmute.user.tag}.**`);
            } catch (err) { message.reply('**❌ Could not remove timeout.**'); }
            return;
        }

        if (fullCommand === config.cmdMove) {
            if (!hasRole(config.cmdMoveRoles)) return message.reply('**❌ You do not have permission.**');
            let targetUser = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            let targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
            if (!targetUser || !targetUser.voice.channel || !targetChannel) return message.reply('**⚠️ Invalid user or channel.**');
            try { await targetUser.voice.setChannel(targetChannel); message.reply(`**✅ Moved successfully.**`); } catch (err) {}
            return;
        }
    });
};
