const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const Level = require('../../models/Level');

module.exports = {
    name: 'profile',
    aliases: ['p', 'بروفايل'],
    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;
        if (target.bot) return;

        // جلب الداتا
        const userLevel = await Level.findOne({ guildId: message.guild.id, userId: target.id });
        const level = userLevel ? userLevel.level : 0;
        const credits = 0; // لحد ما نعمل داتابيز الاقتصاد هنخليها 0

        const canvas = createCanvas(400, 400); // مربع زي البروبوت
        const ctx = canvas.getContext('2d');

        // الخلفية
        ctx.fillStyle = '#2b2d31';
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
        ctx.fill();

        // الجزء العلوي (لون أزرق)
        ctx.fillStyle = '#5865F2';
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, 120, { tl: 20, tr: 20, bl: 0, br: 0 });
        ctx.fill();

        // رسم الأفاتار في النص
        const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.arc(200, 120, 60, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 140, 60, 120, 120);
        ctx.restore();

        // إطار الأفاتار
        ctx.beginPath();
        ctx.arc(200, 120, 60, 0, Math.PI * 2);
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#2b2d31';
        ctx.stroke();

        // النصوص
        ctx.font = 'bold 30px "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(target.username, 200, 220);

        ctx.font = 'bold 20px "Segoe UI", sans-serif';
        ctx.fillStyle = '#b5bac1';
        ctx.fillText(`Level: ${level}  |  Credits: $${credits}`, 200, 260);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'profile.png' });
        message.reply({ files: [attachment] });
    }
};
