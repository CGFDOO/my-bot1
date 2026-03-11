const { AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const Level = require('../../models/Level');

module.exports = {
    name: 'profile',
    aliases: ['p', 'بروفايل'],
    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;
        if (target.bot) return;

        let userLevel = await Level.findOne({ guildId: message.guild.id, userId: target.id });
        const level = userLevel ? userLevel.level : 0;
        const credits = 0; // لسه هنربطها لما نعمل الاقتصاد

        const canvas = createCanvas(400, 400); 
        const ctx = canvas.getContext('2d');

        // 1. الخلفية
        ctx.fillStyle = '#23272A';
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, 20);
        ctx.fill();

        // 2. بانر علوي
        ctx.fillStyle = '#1e1f22';
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, 140, { tl: 20, tr: 20, bl: 0, br: 0 });
        ctx.fill();

        // 3. رسم الأفاتار (مربع بحواف دائرية زي برو بوت)
        const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await loadImage(avatarUrl);
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(30, 80, 120, 120, 20); 
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 30, 80, 120, 120);
        ctx.restore();

        // 4. النصوص (الاسم، اللفل، الكريدت)
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        const cleanName = target.username.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
        ctx.fillText(cleanName, 170, 130);

        ctx.font = 'bold 22px Arial, sans-serif';
        ctx.fillStyle = '#5865F2';
        ctx.fillText(`LEVEL ${level}`, 170, 170);

        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.fillStyle = '#f1c40f'; // لون دهبي للفلوس
        ctx.fillText(`💳 Credits: $${credits}`, 30, 260);

        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'profile.png' });
        message.reply({ files: [attachment] });
    }
};
