const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;

        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config) return;

        // نظام الردود التلقائية
        if (config.autoResponders && config.autoResponders.length > 0) {
            const responder = config.autoResponders.find(r => message.content.includes(r.word));
            if (responder) message.reply(responder.reply).catch(() => {});
        }

        const prefix = config.prefix || '!';
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        const fullCommand = prefix + commandName; 

        // دالة التحقق من الرتب المتعددة (اللي اخترتها من الداشبورد)
        const hasRole = (allowedRoles) => {
            if (!allowedRoles || allowedRoles.length === 0) return message.member.permissions.has('Administrator');
            return allowedRoles.some(roleId => message.member.roles.cache.has(roleId)) || message.member.permissions.has('Administrator');
        };

        // دالة مساعدة لإرسال اللوجات
        const sendLog = async (logChannelId, title, desc, color) => {
            if (!logChannelId) return;
            const logChannel = message.guild.channels.cache.get(logChannelId);
            if (!logChannel) return;
            const embed = new EmbedBuilder().setTitle(title).setDescription(desc).setColor(color).setTimestamp();
            await logChannel.send({ embeds: [embed] }).catch(()=>{});
        };

        // 🔨 1. أمر مسح الشات (Clear)
        if (fullCommand === config.cmdClear) {
            if (!hasRole(config.cmdClearRoles)) return message.reply('❌ لا تملك صلاحية.');
            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('⚠️ يرجى كتابة رقم بين 1 و 100.');
            await message.channel.bulkDelete(amount, true).catch(()=>Object);
            return message.channel.send(`✅ تم مسح ${amount} رسالة.`).then(m => setTimeout(() => m.delete().catch(()=>Object), 3000));
        }

        // 🔒 2. أمر قفل الشات (Lock)
        if (fullCommand === config.cmdLock) {
            if (!hasRole(config.cmdLockRoles)) return message.reply('❌ لا تملك صلاحية.');
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
            return message.reply('🔒 تم قفل هذه الروم بنجاح.');
        }

        // 🔓 3. أمر فتح الشات (Unlock)
        if (fullCommand === config.cmdUnlock) {
            if (!hasRole(config.cmdUnlockRoles)) return message.reply('❌ لا تملك صلاحية.');
            await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
            return message.reply('🔓 تم فتح هذه الروم بنجاح.');
        }

        // 🔨 4. أمر الباند (Ban) + اللوج
        if (fullCommand === config.cmdBan) {
            if (!hasRole(config.cmdBanRoles)) return message.reply('❌ لا تملك صلاحية الباند.');
            const userToBan = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!userToBan) return message.reply('⚠️ يرجى منشن العضو.');
            const reason = args.slice(1).join(' ') || 'بدون سبب';
            
            await userToBan.ban({ reason: `${reason} - By: ${message.author.tag}` })
                .then(() => {
                    message.reply(`✅ تم حظر ${userToBan.user.tag} بنجاح.`);
                    sendLog(config.logBanId, '🔨 تم إعطاء باند', `**العضو:** ${userToBan}\n**بواسطة:** ${message.author}\n**السبب:** ${reason}`, '#ed4245');
                })
                .catch(() => message.reply('❌ لا يمكنني حظر هذا العضو (قد تكون رتبته أعلى مني).'));
            return;
        }

        // ⏳ 5. أمر التايم أوت (Timeout) + اللوج
        if (fullCommand === config.cmdTimeout) {
            if (!hasRole(config.cmdTimeoutRoles)) return message.reply('❌ لا تملك صلاحية التايم أوت.');
            const userToMute = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
            if (!userToMute) return message.reply('⚠️ يرجى منشن العضو.');
            const duration = parseInt(args[1]) || 5; // الافتراضي 5 دقايق
            const reason = args.slice(2).join(' ') || 'بدون سبب';

            await userToMute.timeout(duration * 60 * 1000, `${reason} - By: ${message.author.tag}`)
                .then(() => {
                    message.reply(`✅ تم إعطاء تايم أوت لـ ${userToMute.user.tag} لمدة ${duration} دقائق.`);
                    sendLog(config.logTimeoutId, '⏳ إعطاء تايم أوت', `**العضو:** ${userToMute}\n**بواسطة:** ${message.author}\n**المدة:** ${duration} دقائق\n**السبب:** ${reason}`, '#f2a658');
                })
                .catch(() => message.reply('❌ لا يمكنني إعطاء تايم أوت لهذا العضو.'));
            return;
        }

        // 🎙️ 6. أمر سحب عضو فويس (Vmove)
        if (fullCommand === config.cmdVmove) {
            if (!hasRole(config.cmdVmoveRoles)) return message.reply('❌ لا تملك صلاحية.');
            const targetUser = message.mentions.members.first();
            if (!targetUser || !targetUser.voice.channel) return message.reply('⚠️ يرجى منشن عضو متواجد في روم صوتي.');
            if (!message.member.voice.channel) return message.reply('⚠️ يجب أن تكون في روم صوتي لسحب العضو إليك.');
            
            await targetUser.voice.setChannel(message.member.voice.channel)
                .then(() => message.reply(`✅ تم سحب ${targetUser} بنجاح.`))
                .catch(() => message.reply('❌ حدث خطأ أثناء السحب.'));
            return;
        }

        // 🤝 7. أمر تقييم الوسيط (Done)
        if (fullCommand === config.cmdDone) {
            if (!hasRole(config.cmdDoneRoles)) return message.reply('❌ لا تملك صلاحية.');
            // سحب صاحب التكت من الوصف
            const ticketOwnerId = message.channel.topic;
            if (!ticketOwnerId) return message.reply('❌ هذا الأمر يعمل داخل التكتات فقط.');
            
            try {
                const owner = await message.guild.members.fetch(ticketOwnerId);
                const embed = new EmbedBuilder()
                    .setTitle('🌟 تقييم الوساطة')
                    .setDescription(`يرجى تقييم الوسيط <@${message.author.id}> لخدمته في سيرفر ${message.guild.name}\nاكتب تقييمك في رسالة هنا وسيقوم البوت بإرسالها للإدارة.`)
                    .setColor('#f2a658');
                await owner.send({ embeds: [embed] });
                message.reply('✅ تم إرسال طلب التقييم للعضو في الخاص.');
            } catch (err) {
                message.reply('❌ لا يمكن إرسال رسالة لهذا العضو (الخاص مغلق).');
            }
            return;
        }

        // 🚨 8. أمر استدعاء وساطة عليا
        if (fullCommand === config.cmdReqHigh) {
            if (!hasRole(config.cmdReqHighRoles)) return message.reply('❌ لا تملك صلاحية.');
            const rolesMentions = config.highMediatorRoles.map(id => `<@&${id}>`).join(' ');
            return message.reply(`🚨 **نداء وساطة عليا!** ${rolesMentions}\nمطلوب التدخل في هذا التكت بواسطة ${message.author}`);
        }
    });
};
