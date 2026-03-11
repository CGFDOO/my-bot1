const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const Level = require('../../models/Level');
// const Economy = require('../../models/Economy'); // هنربطه لما نعمل ملف الاقتصاد

module.exports = {
    name: 'profile',
    aliases: ['p', 'بروفايل'], // Aliases
    async execute(message, args, client, config) {
        const target = message.mentions.users.first() || message.author;
        if (target.bot) return message.reply("🤖 البوتات ليس لديها بروفايل!");

        // جلب معلومات اللفل من الداتابيز
        const userLevel = await Level.findOne({ guildId: message.guild.id, userId: target.id });
        const level = userLevel ? userLevel.level : 0;
        
        // جلب معلومات الكريدت (مؤقتاً 0 لحد ما نعمل ملف الاقتصاد في الخطوة الجاية)
        const credits = 0; 

        // 🎨 تجهيز اللوحة (Canvas) للرسم
        const canvas = createCanvas(800, 400); // مقاس كارت البروفايل
        const ctx = canvas.getContext('2d');

        // 1. رسم الخلفية (لون رمادي غامق)
        ctx.fillStyle = '#1e1f22'; 
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, 25);
        ctx.fill();

        // 2. كتابة اسم العضو
        ctx.font = 'bold 45px "Segoe UI", sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(target.username, 300, 100);

        // 3. كتابة اللفل
        ctx.font = 'bold 35px "Segoe UI", sans-serif';
        ctx.fillStyle = '#5865F2'; // أزرق ديسكورد
        ctx.fillText(`Level: ${level}`, 300, 200);

        // 4. كتابة الكريدت
        ctx.font = 'bold 35px "Segoe UI", sans-serif';
        ctx.fillStyle = '#f1c40f'; // لون ذهبي للكريدت
        ctx.fillText(`Credits: $${credits}`, 300, 280);

        // 5. رسم الأفاتار (مربع بحواف دائرية زي البروبوت)
        const avatar = await loadImage(target.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(40, 50, 220, 220, 20); // حواف دائرية للـ Avatar
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 40, 50, 220, 220);
        ctx.restore();

        // إرسال الصورة في الشات
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'profile.png' });
        message.reply({ files: [attachment] });
    }
};
