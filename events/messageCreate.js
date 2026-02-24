const { Events } = require('discord.js');
// ربطنا ملف الداتابيز اللي لسه عاملينه فوق تلقائياً
const GuildSettings = require('../models/GuildSettings'); 

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // 1. فلاتر الأمان: تجاهل رسائل البوتات والخاص
        if (message.author.bot || !message.guild) return;

        try {
            // ==========================================
            // 2. جلب الإعدادات من MongoDB 🗄️
            // ==========================================
            const config = await GuildSettings.findOne({ guildId: message.guild.id });
            
            // لو السيرفر لسه ملوش ملف في الداتابيز، نوقف الكود
            if (!config) return; 

            // ==========================================
            // 3. نظام الخط التلقائي (Auto Line) ➖
            // ==========================================
            if (config.autoLine && config.autoLine.trigger && message.content === config.autoLine.trigger) {
                
                // أ) مسح رسالة العضو لو إنت مفعل الزرار من الداشبورد
                if (config.autoLine.deleteTrigger) {
                    try {
                        await message.delete();
                    } catch (error) {
                        // تجاهل الخطأ لو البوت معندوش رتبة مسح الرسائل
                    }
                }

                // ب) إرسال صورة الخط
                if (config.autoLine.imageUrl) {
                    try {
                        await message.channel.send({ content: config.autoLine.imageUrl });
                    } catch (error) {
                        console.log('❌ خطأ في إرسال صورة الخط');
                    }
                }
                
                // نوقف الكود هنا عشان ميكملش باقي الحاجات
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
                        console.log('❌ خطأ في إرسال الرد التلقائي');
                    }
                    return; // نوقف الكود بعد الرد
                }
            }

            // ==========================================
            // 5. نظام الأوامر العادية (Prefix Commands) 🛠️
            // ==========================================
            const prefix = config.prefix || '!';
            
            // لو الرسالة مش بتبدأ بالبادئة، نوقف الكود
            if (!message.content.startsWith(prefix)) return;

            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            const command = client.commands?.get(commandName) || client.commands?.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
            if (!command) return;

            // تشغيل الأمر وإرسال الإعدادات ليه
            await command.execute(message, args, client, config);

        } catch (error) {
            console.error("❌ حدث خطأ في حدث الرسائل:", error);
        }
    },
};
