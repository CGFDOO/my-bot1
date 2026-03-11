const Level = require('../../models/Level');

module.exports = {
    name: 'levelup',
    aliases: ['اعطاء_لفل'],
    async execute(message, args) {
        // التحقق إن العضو معاه أدمنستريتور (عشان يشتغل معاك فوراً)
        if (!message.member.permissions.has('Administrator')) {
            return message.reply("❌ هذا الأمر للإدارة العليا فقط!");
        }

        const target = message.mentions.users.first();
        const amount = parseInt(args[1]);

        if (!target) return message.reply("❌ الاستخدام الصحيح: `!levelup @user 10`");
        if (isNaN(amount) || amount < 0) return message.reply("❌ يرجى كتابة رقم مستوى صحيح!");

        // تحديث قاعدة البيانات
        let userLevel = await Level.findOne({ guildId: message.guild.id, userId: target.id });
        if (!userLevel) {
            userLevel = new Level({ guildId: message.guild.id, userId: target.id });
        }

        userLevel.level = amount;
        userLevel.xp = (amount * amount * 100); // تظبيط الخبرة عشان تتناسب مع اللفل الجديد
        await userLevel.save();

        message.reply(`✅ تم تعديل مستوى **${target.username}** بنجاح إلى المستوى **${amount}**!`);
    }
};
