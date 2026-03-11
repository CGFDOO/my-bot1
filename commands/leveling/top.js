const { EmbedBuilder } = require('discord.js');
const Level = require('../../models/Level');

module.exports = {
    name: 'top',
    aliases: ['topd', 'topw', 'topm', 'توب'],
    async execute(message, args, client, config) {
        const prefix = config.prefix || '!';
        const commandName = message.content.split(' ')[0].toLowerCase().replace(prefix, '');

        let sortField = 'xp'; 
        let title = '🏆 | التوب العام للسيرفر';

        if (commandName === 'topd') { sortField = 'dailyXp'; title = '📅 | التوب اليومي (Daily)'; }
        else if (commandName === 'topw') { sortField = 'weeklyXp'; title = '📆 | التوب الأسبوعي (Weekly)'; }
        else if (commandName === 'topm') { sortField = 'monthlyXp'; title = '📊 | التوب الشهري (Monthly)'; }

        // نجيب أعلى 10 من الداتابيز
        const topUsers = await Level.find({ guildId: message.guild.id }).sort({ [sortField]: -1 }).limit(10);

        if (!topUsers.length) return message.reply("❌ لا يوجد تفاعل في السيرفر حتى الآن.");

        let topText = '';
        topUsers.forEach((user, index) => {
            if (user[sortField] > 0) {
                // شكل نسخة طبق الأصل من البروبوت
                topText += `**#${index + 1}** | <@${user.userId}> ➔ **${user[sortField]} XP** (Level ${user.level})\n`;
            }
        });

        const embed = new EmbedBuilder()
            .setAuthor({ name: title, iconURL: message.guild.iconURL({ dynamic: true }) })
            .setColor('#5865F2')
            .setDescription(topText || "لا يوجد تفاعل بعد.")
            .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL({ dynamic: true }) })
            .setTimestamp();

        message.reply({ embeds: [embed] });
    }
};
