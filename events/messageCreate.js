const { Events } = require('discord.js');
const GuildSettings = require('../models/GuildSettings'); 

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        try {
            // 1. جلب الإعدادات من الداتابيز للسيرفر ده
            let config = await GuildSettings.findOne({ guildId: message.guild.id });
            if (!config) config = { prefix: '!' }; // لو مفيش، البادئة الافتراضية !

            // 2. فحص نظام الخط التلقائي
            if (config.autoLine && config.autoLine.trigger && message.content === config.autoLine.trigger) {
                if (config.autoLine.deleteTrigger) message.delete().catch(() => {});
                if (config.autoLine.imageUrl) message.channel.send({ content: config.autoLine.imageUrl }).catch(() => {});
                return; 
            }

            // 3. فحص نظام الردود التلقائية (Auto Responders)
            if (config.autoResponders && config.autoResponders.length > 0) {
                const responder = config.autoResponders.find(r => r.word === message.content);
                if (responder) {
                    message.reply({ content: responder.reply }).catch(() => {});
                    return;
                }
            }

            // 4. تشغيل الأوامر بناءً على بادئة الداشبورد
            const prefix = config.prefix || '!';
            if (!message.content.startsWith(prefix)) return;

            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
            if (!command) return;

            // تنفيذ الأمر وتمرير الـ config عشانه يحتاج ألوان الإيمبد
            await command.execute(message, args, client, config);

        } catch (error) {
            console.error("🔴 [MESSAGE ERROR]:", error);
        }
    },
};
