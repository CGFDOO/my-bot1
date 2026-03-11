const Level = require('../../models/Level');

module.exports = {
    name: 'levelup',
    aliases: ['اعطاء_لفل'],
    async execute(message, args, client, config) {
        // التحقق من الصلاحيات (هل معاه الرتبة المطلوبة في الداشبورد؟)
        const allowedRoles = config?.commands?.allowedRoles?.levelUp || [];
        const hasRole = message.member.roles.cache.some(r => allowedRoles.includes(r.id));
        const isAdmin = message.member.permissions.has('Administrator');
        
        if (!hasRole && !isAdmin) return; // لو معندوش صلاحية ميردش

        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target) return message.reply("❌ يرجى منشن العضو! `!levelup @user 10`");
        if (isNaN(amount) || amount < 0) return message.reply("❌ يرجى كتابة رقم صحيح!");

        // تحديث الداتابيز
        let userLevel = await Level.findOne({ guildId: message.guild.id, userId: target.id });
        if (!userLevel) {
            userLevel = new Level({ guildId: message.guild.id, userId: target.id });
        }

        userLevel.level = amount;
        userLevel.xp = amount * amount * 100; // ظبطنا الـ XP عشان يتوافق مع اللفل الجديد
        await userLevel.save();

        message.reply(`✅ تم تعديل مستوى **${target.username}** بنجاح إلى المستوى **${amount}**!`);
    }
};
