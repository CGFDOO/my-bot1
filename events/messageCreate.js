const { Events } = require('discord.js');

// ⚠️ تأكد إن مسار ملف الداتابيز ده صحيح (اللي عملناه في مجلد models)
const GuildSettings = require('../models/GuildSettings'); 

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // ==========================================
        // 1. فلاتر الأمان: تجاهل رسائل البوتات والخاص
        // ==========================================
        if (message.author.bot || !message.guild) return;

        try {
            // ==========================================
            // 2. جلب إعدادات السيرفر من قاعدة البيانات (MongoDB)
            // ==========================================
            const config = await GuildSettings.findOne({ guildId: message.guild.id });
            
            // لو السيرفر ملوش إعدادات في الداشبورد حتى الآن، نوقف الكود
            if (!config) return; 

            // ==========================================
            // 3. نظام الخط التلقائي (Auto Line) ➖
            // ==========================================
            if (config.autoLine && config.autoLine.trigger && message.content === config.autoLine.trigger) {
                
                // أ) مسح رسالة العضو الأصلية (لو متفعلة من الداشبورد)
                if (config.autoLine.deleteTrigger) {
                    try {
                        await message.delete();
                    } catch (error) {
                        // تجاهل الخطأ لو البوت معندوش صلاحية مسح الرسائل
                    }
                }

                // ب) إرسال صورة الخط
                if (config.autoLine.imageUrl) {
                    try {
                        await message.channel.send({ content: config.autoLine.imageUrl });
                    } catch (error) {
                        console.log('❌ خطأ في إرسال صورة الخط:', error);
                    }
                }
                
                // نوقف الكود هنا عشان ميكملش لباقي الأوامر
                return; 
            }

            // ==========================================
            // 4. نظام الردود التلقائية العامة 💬
            // ==========================================
            if (config.autoResponders && config.autoResponders.length > 0) {
                const matchedResponder = config.autoResponders.find(r => r.trigger === message.content);
                
                if (matchedResponder) {
                    try {
                        await message.reply({ content: matchedResponder.reply });
                    } catch (error) {
                        console.log('❌ خطأ في إرسال الرد التلقائي:', error);
                    }
                    return; // نوقف الكود بعد الرد
                }
            }

            // ==========================================
            // 5. نظام الأوامر العادية (Prefix Commands) 🛠️
            // ==========================================
            const prefix = config.prefix || '!';
            
            // لو الرسالة مش بتبدأ بالبادئة (Prefix)، نوقف الكود
            if (!message.content.startsWith(prefix)) return;

            // فصل البادئة عن اسم الأمر
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // البحث عن الأمر في الكوليكشن
            const command = client.commands?.get(commandName) || client.commands?.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
            
            if (!command) return;

            // تشغيل الأمر وإرسال الإعدادات (config) معاه عشان نستخدمها جوه الأمر
            await command.execute(message, args, client, config);

        } catch (error) {
            console.error("❌ حدث خطأ في إيفينت الرسائل (messageCreate):", error);
        }
    },
};
