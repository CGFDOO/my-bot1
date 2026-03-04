const { Events } = require('discord.js');
const GuildSettings = require('../models/GuildSettings'); 

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // 1. تجاهل رسايل البوتات أو الرسايل اللي في الخاص (DM)
        if (message.author.bot || !message.guild) return;

        try {
            // 2. جلب الإعدادات من الداتابيز للسيرفر ده
            let config = await GuildSettings.findOne({ guildId: message.guild.id });
            if (!config) config = { prefix: '!' }; 

            // بنمسح أي مسافات زايدة قبل أو بعد كلام العضو عشان البوت يقرا صح
            const userMessage = message.content.trim(); 

            // ==========================================
            // 🚀 نظام الخط التلقائي
            // ==========================================
            if (config.autoLine && config.autoLine.trigger && userMessage === config.autoLine.trigger.trim()) {
                
                // لو الإمبراطور مفعل زرار "مسح رسالة العضو" من الداشبورد
                if (config.autoLine.deleteTrigger) {
                    message.delete().catch(() => {
                        console.log("⚠️ [تنبيه] البوت معهوش صلاحية مسح الرسايل (Manage Messages) في الروم دي.");
                    });
                }

                // إرسال رابط الصورة
                if (config.autoLine.imageUrl) {
                    message.channel.send({ content: config.autoLine.imageUrl }).catch(() => {});
                }
                return; // بنوقف الكود هنا عشان ميكملش تدوير في باقي الأوامر
            }

            // ==========================================
            // 💬 نظام الردود التلقائية
            // ==========================================
            if (config.autoResponders && config.autoResponders.length > 0) {
                // تدوير في الداتابيز هل الكلمة اللي اتكتبت موجودة في الردود؟
                const responder = config.autoResponders.find(r => r.trigger && r.trigger.trim() === userMessage);
                
                if (responder && responder.reply) {
                    message.reply({ content: responder.reply }).catch(() => {});
                    return; // بنوقف الكود هنا بعد ما يرد
                }
            }

            // ==========================================
            // ⌨️ نظام الأوامر العادية (اللي بتبدأ بـ Prefix)
            // ==========================================
            const prefix = config.prefix || '!';
            
            // لو الرسالة مفيهاش البادئة، البوت مش هيعمل حاجة
            if (!message.content.startsWith(prefix)) return;

            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // البحث عن الأمر في ملفات البوت
            const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
            if (!command) return;

            // تشغيل الأمر وإرسال إعدادات الداتابيز معاه عشان الألوان والخصائص
            await command.execute(message, args, client, config);

        } catch (error) {
            console.error("🔴 [MESSAGE ERROR] حدث خطأ أثناء قراءة الرسالة:", error);
        }
    },
};
