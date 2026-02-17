/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC IRON LOCK - SECURE CHANNEL CONTROL ]
 * █ ▀ █ █ ▀█ █ ▄  [ HIGH ADMINS ONLY ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * @security    Level 100 (Administrator)
 * @protection  Full Channel Override
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { PermissionsBitField, EmbedBuilder } = require('discord.js');

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        try {
            if (message.author.bot) return;

            // تعريف الأوامر
            const lockCommands = ['!قفل', '!lock'];
            const unlockCommands = ['!فتح', '!unlock'];
            
            const isLock = lockCommands.includes(message.content.split(' ')[0]);
            const isUnlock = unlockCommands.includes(message.content.split(' ')[0]);

            if (!isLock && !isUnlock) return;

            // =================================================================
            // 🛡️ [ZONE 1] نظام الحماية: الإدارة العليا فقط (Administrator)
            // =================================================================
            // هنا استخدمنا "Administrator" عشان نضمن إن محدش غير الرؤوس الكبيرة يستخدمه
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                // تجاهل تام للمتطفلين (Silent Block)
                return;
            }

            const channel = message.channel;

            // =================================================================
            // 🔒 تنفيذ عملية القفل
            // =================================================================
            if (isLock) {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: false, // منع الكتابة
                    Connect: false       // منع دخول الرومات الصوتية (لو كانت روم صوت)
                });

                const lockEmbed = new EmbedBuilder()
                    .setColor('#FF0000') // أحمر خطر
                    .setTitle('🔒 LOCKDOWN PROTOCOL INITIATED')
                    .setDescription(`
                        **⛔ تم إغلاق هذه القناة بأمر إداري عليا.**
                        يمنع التحدث أو التفاعل حتى إشعار آخر.
                        
                        👮‍♂️ **بواسطة:** ${message.author}
                    `)
                    .setTimestamp()
                    .setFooter({ text: 'MNC Security System | High Command', iconURL: message.guild.iconURL() });

                await message.channel.send({ embeds: [lockEmbed] });
            }

            // =================================================================
            // 🔓 تنفيذ عملية الفتح
            // =================================================================
            if (isUnlock) {
                await channel.permissionOverwrites.edit(message.guild.roles.everyone, {
                    SendMessages: true,
                    Connect: true
                });

                const unlockEmbed = new EmbedBuilder()
                    .setColor('#00FF00') // أخضر أمان
                    .setTitle('🔓 CHANNEL SECURED & UNLOCKED')
                    .setDescription(`
                        **✅ تم رفع الحظر عن القناة.**
                        يمكنكم العودة للمشاركة الآن.
                        
                        👮‍♂️ **بواسطة:** ${message.author}
                    `)
                    .setTimestamp()
                    .setFooter({ text: 'MNC Security System | Active', iconURL: message.guild.iconURL() });

                await message.channel.send({ embeds: [unlockEmbed] });
            }

        } catch (error) {
            console.error('🔥 [LOCK ERROR]:', error);
            message.reply('⚠️ **حدث خطأ تقني!** تأكد أن البوت يمتلك صلاحية `Administrator` لتعديل القناة.');
        }
    });
};

