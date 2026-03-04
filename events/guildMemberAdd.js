const { Events, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const GuildSettings = require('../models/GuildSettings'); 

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        try {
            // 1. جلب إعدادات الترحيب من الخزنة
            const config = await GuildSettings.findOne({ guildId: member.guild.id });
            
            // لو مفيش إعدادات أو النظام مقفول، البوت مش هيعمل حاجة
            if (!config || !config.welcomeSystem || !config.welcomeSystem.welcomeEnabled) return;

            const channelId = config.welcomeSystem.welcomeChannelId;
            if (!channelId) return;

            const welcomeChannel = member.guild.channels.cache.get(channelId);
            if (!welcomeChannel) return;

            // 2. تجهيز رسالة الترحيب النصية وتبديل الأكواد
            let welcomeMsg = config.welcomeSystem.welcomeMessage || 'مرحباً بك {user} في سيرفر {server}. أنت العضو رقم {memberCount} !';
            welcomeMsg = welcomeMsg
                .replace(/{user}/g, `<@${member.id}>`)
                .replace(/{server}/g, member.guild.name)
                .replace(/{memberCount}/g, member.guild.memberCount);

            const backgroundImageUrl = config.welcomeSystem.backgroundUrl;
            let attachment = null;

            // 3. 🎨 نظام دمج الصور الاحترافي (Canvas)
            if (backgroundImageUrl) {
                try {
                    // إنشاء لوحة مقاسها 1024 عرض و 450 طول
                    const canvas = createCanvas(1024, 450);
                    const ctx = canvas.getContext('2d');

                    const avatarBorderHex = config.welcomeSystem.avatarBorderHex || '#ffffff';
                    const textColorHex = config.welcomeSystem.textColorHex || '#ffffff';

                    // رسم الخلفية اللي الإمبراطور حطها في الداشبورد
                    const bg = await loadImage(backgroundImageUrl);
                    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

                    // فلتر أسود شفاف عشان الكلام يظهر بوضوح مهما كانت الخلفية فاتحة
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    // رسم لوجو السيرفر فوق على اليمين (اختياري)
                    if (member.guild.iconURL()) {
                        const serverIcon = await loadImage(member.guild.iconURL({ extension: 'png', size: 128 }));
                        ctx.save();
                        ctx.beginPath();
                        ctx.arc(950, 70, 40, 0, Math.PI * 2, true);
                        ctx.closePath();
                        ctx.clip();
                        ctx.drawImage(serverIcon, 910, 30, 80, 80);
                        ctx.restore();
                    }

                    // إعدادات النصوص
                    ctx.fillStyle = textColorHex;
                    ctx.textAlign = 'center';

                    // كتابة Welcome To Server
                    ctx.font = 'bold 45px sans-serif';
                    ctx.fillText(`WELCOME TO ${member.guild.name.toUpperCase()}`, 512, 330);

                    // كتابة اسم العضو
                    ctx.font = '35px sans-serif';
                    ctx.fillText(`@${member.user.username}`, 512, 390);

                    // رسم دائرة الصورة الشخصية للعضو
                    ctx.beginPath();
                    ctx.arc(512, 150, 100, 0, Math.PI * 2, true);
                    ctx.closePath();
                    
                    // رسم الإطار باللون اللي اخترته من الداشبورد
                    ctx.lineWidth = 10;
                    ctx.strokeStyle = avatarBorderHex;
                    ctx.stroke();

                    // قص الصورة على شكل دائرة وتركيبها
                    ctx.clip();
                    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
                    ctx.drawImage(avatar, 412, 50, 200, 200);
                    ctx.restore();

                    // تحويل اللوحة لصورة حقيقية عشان تتبعت في الديسكورد
                    attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'welcome-imprator.png' });
                } catch (canvasErr) {
                    console.error("🔴 [تنبيه] رابط صورة الترحيب غير صالح أو غير مدعوم:", canvasErr.message);
                }
            }

            // 4. إرسال الرسالة والصورة للروم
            if (attachment) {
                await welcomeChannel.send({ content: welcomeMsg, files: [attachment] }).catch(() => {});
            } else {
                await welcomeChannel.send({ content: welcomeMsg }).catch(() => {});
            }

        } catch (error) {
            console.error("🔴 [WELCOME ERROR] حدث خطأ عام في الترحيب:", error);
        }
    },
};
