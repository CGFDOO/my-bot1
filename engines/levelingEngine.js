const Level = require('../models/Level'); // مسار قاعدة البيانات

module.exports = async (message, client, config) => {
    // لو مفيش سيرفر أو العضو بوت، نوقف
    if (!message.guild || message.author.bot) return;
    
    // لو النظام مقفول من الداشبورد
    if (config?.leveling?.enabled === false) return;

    const guildId = message.guild.id;
    const userId = message.author.id;

    let userLevel = await Level.findOne({ guildId, userId });
    if (!userLevel) {
        userLevel = new Level({ guildId, userId });
    }

    const now = new Date();
    // نظام الـ Cooldown عشان السبام (ياخد خبرة كل 60 ثانية بس)
    if (userLevel.lastMessageTime) {
        const timeDiff = now - userLevel.lastMessageTime;
        if (timeDiff < 60000) return;
    }

    // إعطاء XP عشوائي من 15 لـ 25
    const randomXp = Math.floor(Math.random() * 11) + 15;

    userLevel.xp += randomXp;
    userLevel.textXp += randomXp;
    userLevel.dailyXp += randomXp;
    userLevel.weeklyXp += randomXp;
    userLevel.monthlyXp += randomXp;
    userLevel.lastMessageTime = now;

    // حساب الـ XP المطلوب للفل القادم (مثال: اللفل * اللفل * 100)
    const xpNeeded = (userLevel.level + 1) * (userLevel.level + 1) * 100;

    if (userLevel.xp >= xpNeeded) {
        userLevel.level += 1;

        // إرسال رسالة التلفيل
        let levelUpMsg = config?.leveling?.levelUpMessage || '🎉 مبروك {user}، وصلت للمستوى **{level}**!';
        levelUpMsg = levelUpMsg.replace('{user}', `<@${userId}>`).replace('{level}', userLevel.level);

        const channelId = config?.leveling?.levelUpChannelId;
        const channel = message.guild.channels.cache.get(channelId) || message.channel;
        
        if (channel) channel.send(levelUpMsg).catch(() => {});

        // إعطاء رتبة لو متحددة في الداشبورد
        if (config?.leveling?.roleRewards) {
            const reward = config.leveling.roleRewards.find(r => r.levelRequired === userLevel.level);
            if (reward && reward.roleId) {
                const member = message.guild.members.cache.get(userId);
                const role = message.guild.roles.cache.get(reward.roleId);
                if (member && role) member.roles.add(role).catch(() => {});
            }
        }
    }

    await userLevel.save();
};
