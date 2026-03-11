const { EmbedBuilder } = require('discord.js');
const Level = require('../../models/Level');

module.exports = {
    name: 'top',
    aliases: ['توب', 'topd', 'topw', 'topm'], // يدعم كل أشكال الأوامر
    async execute(message, args, client, config) {
        // بنعرف العضو كتب انهي أمر بالظبط عشان نحدد التوب (يومي ولا شهري ولا عام)
        const prefix = config.prefix || '!';
        const commandName = message.content.split(' ')[0].toLowerCase().replace(prefix, '');

        let sortField = 'xp'; // الأساسي هو التوب العام
        let title = '🏆 التوب العام (All Time)';

        // التحقق من الداشبورد (هل العضو كتب أمر اليومي ولا الأسبوعي؟)
        if (commandName === (config.leveling?.topDailyCmd || 'topd')) { 
            sortField = 'dailyXp'; 
            title = '📅 التوب اليومي (Daily)'; 
        }
        else if (commandName === (config.leveling?.topWeeklyCmd || 'topw')) { 
            sortField = 'weeklyXp'; 
            title = '📆 التوب الأسبوعي (Weekly)'; 
        }
        else if (commandName === (config.leveling?.topMonthlyCmd || 'topm')) { 
            sortField = 'monthlyXp'; 
            title = '📊 التوب الشهري (Monthly)'; 
        }

        // جلب أعلى 10 أعضاء من الداتابيز وترتيبهم من الكبير للصغير
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
            // تجاهل الأعضاء اللي خبرتهم صفر
            if (user[sortField] > 0) {
                description += `**#${index + 1}** | <@${user.userId}> ➔ **${user[sortField]} XP** (مستوى ${user.level})\n`;
            }
        });

        if (description === '') description = "لا يوجد تفاعل مسجل حتى الآن.";

        embed.setDescription(description);
        message.reply({ embeds: [embed] });
    }
};
