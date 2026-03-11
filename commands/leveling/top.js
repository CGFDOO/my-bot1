const { EmbedBuilder } = require('discord.js');
const Level = require('../../models/Level');

module.exports = {
    name: 'top',
    aliases: ['توب', 'topd', 'topw', 'topm'], 
    async execute(message, args, client, config) {
        const prefix = config.prefix || '!';
        // معرفة الأمر الذي تم كتابته بالضبط (مثلاً: topd أو t day)
        const commandName = message.content.split(' ')[0].toLowerCase().replace(prefix, '');

        let sortField = 'xp'; 
        let title = '🏆 التوب العام (All Time)';

        // التحقق من الداشبورد لمعرفة نوع التوب المطلوب
        const dailyCmds = (config.leveling?.topDailyCmd || 'topd').split(',').map(c => c.trim());
        const weeklyCmds = (config.leveling?.topWeeklyCmd || 'topw').split(',').map(c => c.trim());
        const monthlyCmds = (config.leveling?.topMonthlyCmd || 'topm').split(',').map(c => c.trim());

        if (dailyCmds.includes(commandName)) { 
            sortField = 'dailyXp'; 
            title = '📅 التوب اليومي (Daily)'; 
        }
        else if (weeklyCmds.includes(commandName)) { 
            sortField = 'weeklyXp'; 
            title = '📆 التوب الأسبوعي (Weekly)'; 
        }
        else if (monthlyCmds.includes(commandName)) { 
            sortField = 'monthlyXp'; 
            title = '📊 التوب الشهري (Monthly)'; 
        }

        // جلب أعلى 10 أعضاء من الداتابيز
        const topUsers = await Level.find({ guildId: message.guild.id })
            .sort({ [sortField]: -1 })
            .limit(10);

        if (!topUsers || topUsers.length === 0) {
            return message.reply("❌ لا يوجد أعضاء في القائمة بعد!");
        }

        const embedColor = config.embedSetup?.primaryColor || '#5865F2';
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(embedColor)
            .setThumbnail(message.guild.iconURL({ dynamic: true }));

        let description = '';
        topUsers.forEach((user, index) => {
            if (user[sortField] > 0) { // عشان ميجيبش الناس اللي خبرتها 0
                description += `**#${index + 1}** | <@${user.userId}> ➔ **${user[sortField]} XP** (مستوى ${user.level})\n`;
            }
        });

        if (description === '') description = "لا يوجد تفاعل مسجل حتى الآن.";

        embed.setDescription(description);
        message.reply({ embeds: [embed] });
    }
};
