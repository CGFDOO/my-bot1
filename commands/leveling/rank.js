const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const Level = require('../../models/Level');

module.exports = {
    name: 'rank',
    aliases: ['r', 'رانك'],
    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;
        if (target.bot) return message.reply("🤖 البوتات ملهاش رانك يا غالي!");

        // جلب الداتا من الداتابيز (عشان الداتا متتمسحش أبداً)
        let userLevel = await Level.findOne({ guildId: message.guild.id, userId: target.id });
        if (!userLevel) {
            userLevel = { level: 0, xp: 0 }; // لو لسه ملوش داتا
        }

        const currentLevel = userLevel.level;
        const currentXp = userLevel.xp;
        const neededXp = (currentLevel + 1) * (currentLevel + 1) * 100; // معادلة البروبوت تقريباً

        // 🎨 تجهيز اللوحة (Canvas)
        const canvas = createCanvas(900, 250);
        const ctx = canvas.getContext('2d');

        // 1. رسم الخلفية (تقدر تغير الكود ده وتحط صورة لو حابب)
        ctx.fillStyle = '#2b2d31'; // لون رمادي فخم زي الديسكورد
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
        ctx.fill();

        // 2. شريط الـ XP (الخلفية الرمادي الغامق)
        ctx.fillStyle = '#1e1f22';
        ctx.beginPath();
        ctx.roundRect(250, 160, 600, 35, 17);
        ctx.fill();

        // 3. شريط الـ XP (الممتلئ - لونه أزرق)
        const progress = Math.min(currentXp / neededXp, 1);
        ctx.fillStyle = '#5865F2'; 
        ctx.beginPath();
        ctx.roundRect(250, 160, Math.max(600 * progress, 35), 35, 17);
        ctx.fill();

        // 4. كتابة الاسم
        ctx.font = 'bold 40px "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(target.username, 260, 120);

        // 5. كتابة اللفل
        ctx.font = 'bold 45px "Segoe UI", sans-serif';
        ctx.fillStyle = '#5865F2';
        ctx.fillText(`LEVEL ${currentLevel}`, 700, 120);

        // 6. كتابة الـ XP (الحالي / المطلوب)
        ctx.font = 'bold 22px "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        const xpText = `${currentXp} / ${neededXp} XP`;
        ctx.fillText(xpText, 830 - ctx.measureText(xpText).width, 186);

        // 7. رسم الأفاتار (دائري احترافي)
        const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(125, 125, 90, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 35, 35, 180, 180);
        ctx.restore();

        // رسم إطار للأفاتار
        ctx.beginPath();
        ctx.arc(125, 125, 90, 0, Math.PI * 2);
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#5865F2';
        ctx.stroke();

        // إرسال الصورة
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
        message.reply({ files: [attachment] });
    }
};
