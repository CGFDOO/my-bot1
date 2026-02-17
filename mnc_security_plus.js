/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC SECURITY PLUS - V2.0 ]
 * █ ▀ █ █ ▀█ █ ▄  [ LOCKDOWN & VOICE CONTROL ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * @features    Advanced Lockdown, Mass Server Mute
 * @security    Administrator Level Only
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        // تقسيم الرسالة
        const args = message.content.split(' ');
        const command = args[0].toLowerCase();

        // قائمة الأوامر
        const cmds = {
            lock: ['!قفل', '!lock'],
            unlock: ['!فتح', '!unlock'],
            muteAll: ['!كتم-الكل', '!mute-all'],
            unmuteAll: ['!فك-كتم-الكل', '!unmute-all']
        };

        // التحقق من أن الرسالة هي أحد أوامرنا
        const isCmd = Object.values(cmds).flat().includes(command);
        if (!isCmd) return;

        // 🛡️ فحص الصلاحيات (Administrator فقط)
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return; // تجاهل تام (Silent)
        }

        // إعدادات التصميم (الألوان والصور)
        const guildIcon = message.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL();
        const adminName = message.member.displayName;
        const adminAvatar = message.author.displayAvatarURL({ dynamic: true });

        try {
            // =================================================================
            // 🔒 1. نظام القفل (LOCKDOWN)
            // =================================================================
            if (cmds.lock.includes(command)) {
                // تعديل صلاحيات القناة الحالية لمنع الكتابة
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false
                });

                const lockEmbed = new EmbedBuilder()
                    .setColor('#FF0000') // أحمر غامق
                    .setTitle('🔒 TACTICAL LOCKDOWN')
                    .setThumbnail(guildIcon) // صورة السيرفر
                    .setDescription(`
                        **⛔ تم إغلاق الشات بأمر إداري.**
                        \nيمنع الحديث هنا لحين انتهاء الإجراءات الأمنية.
                        يرجى الالتزام بالهدوء وانتظار التعليمات.
                    `)
                    .addFields({ name: '👮‍♂️ المسؤول:', value: `${message.author}`, inline: true })
                    .setTimestamp()
                    .setFooter({ text: 'MNC Security System', iconURL: adminAvatar });

                return message.channel.send({ embeds: [lockEmbed] });
            }

            // =================================================================
            // 🔓 2. نظام الفتح (UNLOCK)
            // =================================================================
            if (cmds.unlock.includes(command)) {
                // إعادة السماح بالكتابة
                await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: true
                });

                const unlockEmbed = new EmbedBuilder()
                    .setColor('#00FF00') // أخضر
                    .setTitle('🔓 CHANNEL SECURED')
                    .setThumbnail(guildIcon)
                    .setDescription(`
                        **✅ تم فتح الشات بنجاح.**
                        \nيمكنكم العودة للمشاركة الآن.
                        نتمنى لكم وقتاً ممتعاً في ${message.guild.name}.
                    `)
                    .addFields({ name: '👮‍♂️ المسؤول:', value: `${message.author}`, inline: true })
                    .setTimestamp()
                    .setFooter({ text: 'MNC Security System', iconURL: adminAvatar });

                return message.channel.send({ embeds: [unlockEmbed] });
            }

            // =================================================================
            // 🔇 3. كتم الكل صوتياً (VOICE MUTE ALL)
            // =================================================================
            if (cmds.muteAll.includes(command)) {
                // التأكد أن الأدمن في روم صوتي
                const voiceChannel = message.member.voice.channel;
                if (!voiceChannel) {
                    return message.reply('⚠️ **يجب أن تكون في روم صوتي لتنفيذ هذا الأمر!**');
                }

                const members = voiceChannel.members;
                let count = 0;

                // إرسال رسالة انتظار
                const loadingMsg = await message.reply('⏳ **جاري تنفيذ الإسكات الإجباري (Server Mute)...**');

                // عمل Mute لكل عضو في الروم
                for (const [memberId, member] of members) {
                    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) { // لا تكمم الأدمنز
                        await member.voice.setMute(true);
                        count++;
                    }
                }

                const muteEmbed = new EmbedBuilder()
                    .setColor('#2f3136')
                    .setThumbnail(guildIcon)
                    .setTitle('🔇 VOICE SILENCE PROTOCOL')
                    .setDescription(`**تم تفعيل كتم الصوت الإجباري (Server Mute) على الروم.**\n\n🔊 **الروم:** ${voiceChannel.name}\n👥 **عدد المكتومين:** ${count}`)
                    .setFooter({ text: `Command by ${adminName}`, iconURL: adminAvatar });

                await loadingMsg.delete();
                return message.channel.send({ embeds: [muteEmbed] });
            }

            // =================================================================
            // 🔊 4. فك كتم الكل (UNMUTE ALL)
            // =================================================================
            if (cmds.unmuteAll.includes(command)) {
                const voiceChannel = message.member.voice.channel;
                if (!voiceChannel) {
                    return message.reply('⚠️ **يجب أن تكون في روم صوتي لتنفيذ هذا الأمر!**');
                }

                const members = voiceChannel.members;
                let count = 0;

                const loadingMsg = await message.reply('⏳ **جاري فك القيود الصوتية...**');

                for (const [memberId, member] of members) {
                    if (member.voice.serverMute) { // فك الميوت فقط للي معمول له ميوت
                        await member.voice.setMute(false);
                        count++;
                    }
                }

                const unmuteEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setThumbnail(guildIcon)
                    .setTitle('🔊 VOICE RESTORED')
                    .setDescription(`**تم إلغاء كتم الصوت الإجباري.**\n\n🔊 **الروم:** ${voiceChannel.name}\n👥 **تم الفك عن:** ${count}`)
                    .setFooter({ text: `Command by ${adminName}`, iconURL: adminAvatar });

                await loadingMsg.delete();
                return message.channel.send({ embeds: [unmuteEmbed] });
            }

        } catch (error) {
            console.error('🔥 [SECURITY ERROR]:', error);
            message.reply(`⚠️ **حدث خطأ:** \`${error.message}\`\nتأكد أن البوت يمتلك صلاحيات \`Administrator\` وأن رتبته أعلى من الأعضاء.`);
        }
    });
};

