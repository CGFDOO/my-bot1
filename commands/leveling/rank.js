const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const Level = require('../../models/Level');

module.exports = {
    name: 'rank',
    aliases: ['r', 'رانك'],
    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;
        if (target.bot) return message.reply("🤖 البوتات ليس لها مستوى!");

        let userLevel = await Level.findOne({ guildId: message.guild.id, userId: target.id });
        if (!userLevel) userLevel = { level: 0, xp: 0 };

        const currentLevel = userLevel.level;
        const currentXp = userLevel.xp;
        const neededXp = (currentLevel + 1) * (currentLevel + 1) * 100;

        // مقاسات البرو بوت بالظبط
        const canvas = createCanvas(934, 282);
        const ctx = canvas.getContext('2d');

        // 1. الخلفية (رمادي غامق ديسكورد)
        ctx.fillStyle = '#23272A';
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
        ctx.fill();

        // 2. رسم شريط الـ XP الخلفي (رمادي فاتح شوية)
        ctx.fillStyle = '#484B4E';
        ctx.beginPath();
        ctx.roundRect(260, 180, 630, 35, 17);
        ctx.fill();

        // 3. رسم شريط الـ XP الممتلئ (أزرق بروبوت)
        const progress = Math.min(currentXp / neededXp, 1);
        ctx.fillStyle = '#5865F2'; 
        ctx.beginPath();
        ctx.roundRect(260, 180, Math.max(630 * progress, 35), 35, 17);
        ctx.fill();

        // 4. كتابة الاسم (بخط عالمي عشان ميجيبش مربعات)
        ctx.font = 'bold 38px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        // مسح الإيموجيز من الاسم عشان مش بتدعمها الـ Canvas في اللينكس
        const cleanName = target.username.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
        ctx.fillText(cleanName, 260, 150);

        // 5. كتابة اللفل (فوق على اليمين)
        ctx.font = 'bold 45px Arial, sans-serif';
        ctx.fillStyle = '#5865F2';
        ctx.fillText(`LEVEL ${currentLevel}`, 680, 100);

        // 6. كتابة الـ XP (فوق البار على اليمين)
        ctx.font = 'bold 25px Arial, sans-serif';
        ctx.fillStyle = '#7f8384';
        const xpText = `${currentXp} / ${neededXp} XP`;
        ctx.fillText(xpText, 890 - ctx.measureText(xpText).width, 165);

        // 7. رسم الأفاتار (دائري على الشمال)
        const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(140, 141, 100, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 40, 41, 200, 200);
        ctx.restore();

        // إرسال الصورة
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'rank.png' });
        message.reply({ files: [attachment] });
    }
};
