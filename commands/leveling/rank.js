const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const Level = require('../../models/Level');

module.exports = {
    name: 'rank',
    aliases: ['r', 'رانك', 'level'], // الأسماء دي أساسية وهنخليها تقرا من الداشبورد برضو
    async execute(message, args, client, config) {
        const target = message.mentions.users.first() || message.author;
        if (target.bot) return message.reply("🤖 البوتات ليس لديها مستوى!");

        // جلب بيانات العضو
        const userLevel = await Level.findOne({ guildId: message.guild.id, userId: target.id });
        
        const level = userLevel ? userLevel.level : 0;
        const currentXp = userLevel ? userLevel.xp : 0;
        const requiredXp = (level + 1) * (level + 1) * 100; // معادلة الـ XP للفل القادم

        // 🎨 تجهيز اللوحة (Canvas) للرسم زي البروبوت
        const canvas = createCanvas(934, 282); 
        const ctx = canvas.getContext('2d');

        // 1. رسم الخلفية (رمادي غامق ديسكورد)
        ctx.fillStyle = '#23272A'; 
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
        ctx.fill();

        // 2. رسم شريط الـ XP الخلفي (الرمادي)
        ctx.fillStyle = '#484B4E';
        ctx.beginPath();
        ctx.roundRect(250, 180, 600, 30, 15);
        ctx.fill();

        // 3. رسم شريط الـ XP الممتلئ (الأزرق)
        const progress = Math.min(currentXp / requiredXp, 1);
        ctx.fillStyle = config?.embedSetup?.primaryColor || '#5865F2'; // بياخد لون الإيمبد الأساسي بتاعك
        ctx.beginPath();
        ctx.roundRect(250, 180, Math.max(600 * progress, 30), 30, 15);
        ctx.fill();

        // 4. كتابة النصوص
        ctx.font = 'bold 36px "Segoe UI", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(target.username, 260, 150);

        ctx.font = 'bold 45px "Segoe UI", sans-serif';
        ctx.fillStyle = config?.embedSetup?.primaryColor || '#5865F2';
        ctx.fillText(`LEVEL ${level}`, 700, 100);

        ctx.font = 'bold 25px "Segoe UI", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`${currentXp} / ${requiredXp} XP`, 680, 160);

        // 5. رسم الأفاتار (دائري)
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
