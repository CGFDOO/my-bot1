const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;

        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config) return;

        if (config.autoResponders && config.autoResponders.length > 0) {
            const responder = config.autoResponders.find(r => message.content.includes(r.word));
            if (responder) message.reply(responder.reply).catch(() => {});
        }

        const prefix = config.prefix || '!';
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const fullCommand = prefix + commandName; 

        const hasRole = (allowedRoles) => {
            if (!allowedRoles || allowedRoles.length === 0) return message.member.permissions.has('Administrator');
            return allowedRoles.some(roleId => message.member.roles.cache.has(roleId)) || message.member.permissions.has('Administrator');
        };

        const sendLog = async (logChannelId, title, desc, color) => {
            if (!logChannelId) return;
            const logChannel = message.guild.channels.cache.get(logChannelId);
            if (!logChannel) return;
            const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color).setTimestamp();
            await logChannel.send({ embeds: [embed] }).catch(()=>{});
        };

        // ==========================================
        // ⚖️ أمر تفاصيل التريد والموافقة (!trade)
        // ==========================================
        if (fullCommand === config.cmdTrade) {
            if (!hasRole(config.cmdTradeRoles)) return message.reply('❌ لا تملك صلاحية استخدام هذا الأمر.');
            
            const tradeDetails = args.join(' ');
            if (!tradeDetails) return message.reply('⚠️ يرجى كتابة تفاصيل التريد بعد الأمر. (مثال: !trade حساب مقابل 1000 روبوكس)');

            const embed = new EmbedBuilder()
                .setTitle('⚖️ طلب موافقة على تريد')
                .setDescription(`**الوسيط المستلم:** <@${message.author.id}>\n\n**تفاصيل التريد:**\n${tradeDetails}\n\n⏳ *في انتظار موافقة الإدارة العليا/الوساطة العليا...*`)
                .setColor('#f2a658')
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('trade_approve').setLabel('موافقة ✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('trade_reject').setLabel('رفض ❌').setStyle(ButtonStyle.Danger)
            );

            // البوت هيعمل منشن لرتب الوساطة العليا اللي أنت حددتها في الداشبورد
            const highMentions = config.highMediatorRoles.map(id => `<@&${id}>`).join(' ');
            
            return message.channel.send({ content: `${highMentions} مطلوب مراجعة!`, embeds: [embed], components: [row] });
        }

        // ==========================================
        // باقي الأوامر القديمة كما هي (تقييم، باند، مسح، تايم... الخ)
        // ==========================================
        if (fullCommand === config.cmdDone) {
            if (!hasRole(config.cmdDoneRoles)) return message.reply('❌ لا تملك الصلاحية.');
            const ticketOwnerId = message.channel.topic;
            if (!ticketOwnerId) return message.reply('❌ هذا الأمر يعمل داخل التكتات فقط.');
            try {
                const owner = await message.guild.members.fetch(ticketOwnerId);
                const ratingEmbed = new EmbedBuilder().setTitle('🌟 تقييم الوسيط').setDescription(`لقد أتممت معاملتك في سيرفر **${message.guild.name}**.\nيرجى تقييم الوسيط <@${message.author.id}>:`).setColor('#3ba55d');
                const ratingRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`rate_mediator_5_${message.author.id}_${message.guild.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`rate_mediator_1_${message.author.id}_${message.guild.id}`).setLabel('⭐').setStyle(ButtonStyle.Danger)
                );
                await owner.send({ embeds: [ratingEmbed], components: [ratingRow] });
                message.reply('✅ تم إرسال طلب التقييم للعضو في الخاص.');
            } catch (err) { message.reply('❌ لا يمكن إرسال رسالة لهذا العضو (الخاص مغلق).'); }
            return;
        }

        if (fullCommand === config.cmdBan) {
            if (!hasRole(config.cmdBanRoles)) return message.reply('❌ لا تملك صلاحية الباند.');
            const userToBan = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!userToBan) return message.reply('⚠️ يرجى عمل منشن للعضو.');
            const reason = args.slice(1).join(' ') || 'بدون سبب';
            await userToBan.ban({ reason: `${reason} - By: ${message.author.tag}` }).then(() => {
                message.reply(`✅ تم إعطاء باند للعضو ${userToBan.user.tag}.`);
                sendLog(config.logBanId, '🔨 تم إعطاء باند', `**العضو:** ${userToBan}\n**بواسطة:** ${message.author}\n**السبب:** ${reason}`, '#ed4245');
            }).catch(() => message.reply('❌ لا يمكنني حظر هذا العضو.'));
            return;
        }

        if (fullCommand === config.cmdTimeout) {
            if (!hasRole(config.cmdTimeoutRoles)) return message.reply('❌ لا تملك الصلاحية.');
            const userToMute = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!userToMute) return message.reply('⚠️ يرجى عمل منشن للعضو.');
            const durationMins = parseInt(args[1]) || 5; 
            const reason = args.slice(2).join(' ') || 'بدون سبب';
            await userToMute.timeout(durationMins * 60 * 1000, `${reason} - By: ${message.author.tag}`).then(() => {
                message.reply(`✅ تم إعطاء تايم أوت لـ ${userToMute.user.tag} لمدة ${durationMins} دقائق.`);
                sendLog(config.logTimeoutId, '⏳ إعطاء تايم أوت', `**العضو:** ${userToMute}\n**بواسطة:** ${message.author}\n**المدة:** ${durationMins} دقائق\n**السبب:** ${reason}`, '#f2a658');
            }).catch(() => message.reply('❌ لا يمكنني إعطاء تايم أوت لهذا العضو.'));
            return;
        }

        if (fullCommand === config.cmdClear) {
            if (!hasRole(config.cmdClearRoles)) return message.reply('❌ لا تملك صلاحية مسح الشات.');
            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('⚠️ يرجى كتابة رقم بين 1 و 100.');
            await message.channel.bulkDelete(amount, true).catch(()=>Object);
            return message.channel.send(`✅ تم مسح ${amount} رسالة.`).then(m => setTimeout(() => m.delete().catch(()=>Object), 3000));
        }

        if (fullCommand === config.cmdVmove) {
            if (!hasRole(config.cmdVmoveRoles)) return message.reply('❌ لا تملك صلاحية.');
            const targetUser = message.mentions.members.first();
            if (!targetUser || !targetUser.voice.channel) return message.reply('⚠️ يرجى منشن عضو متواجد في روم صوتي.');
            if (!message.member.voice.channel) return message.reply('⚠️ يجب أن تكون في روم صوتي لسحب العضو إليك.');
            await targetUser.voice.setChannel(message.member.voice.channel).then(() => message.reply(`✅ تم سحب ${targetUser} بنجاح.`)).catch(() => message.reply('❌ حدث خطأ.'));
        }
    });
};
