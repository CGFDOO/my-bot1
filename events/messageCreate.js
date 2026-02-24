const { Events } = require('discord.js');
const GuildSettings = require('../models/GuildSettings'); 

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        // 1. جهاز تنصت: هل البوت شاف رسالتك أصلاً؟
        console.log(`\n💬 [DEBUG] وصلت رسالة من ${message.author.username}: ${message.content}`);

        try {
            let config = await GuildSettings.findOne({ guildId: message.guild.id });
            
            // 2. جهاز تنصت: هل السيرفر ليه إعدادات؟
            if (!config) {
                console.log(`⚠️ [DEBUG] السيرفر ده ملوش إعدادات في الداتابيز! (البوت مش هيرد لحد ما تحفظ من الداشبورد)`);
                // هندي للبوت بادئة افتراضية مؤقتة عشان يشتغل معاك للتجربة
                config = { prefix: '!' }; 
            } else {
                console.log(`✅ [DEBUG] تم العثور على إعدادات السيرفر، البادئة هي: "${config.prefix || '!'}"`);
            }

            // ==========================================
            // نظام الخط التلقائي
            // ==========================================
            if (config.autoLine && config.autoLine.trigger && message.content === config.autoLine.trigger) {
                console.log(`➖ [DEBUG] تم تفعيل أمر الخط التلقائي!`);
                if (config.autoLine.deleteTrigger) message.delete().catch(() => {});
                if (config.autoLine.imageUrl) message.channel.send({ content: config.autoLine.imageUrl }).catch(() => {});
                return; 
            }

            // ==========================================
            // نظام الأوامر العادية
            // ==========================================
            const prefix = config.prefix || '!';
            
            // 3. جهاز تنصت: هل الرسالة بتبدأ بالبادئة؟
            if (!message.content.startsWith(prefix)) {
                console.log(`❌ [DEBUG] الرسالة لا تبدأ بالبادئة (${prefix})، تم التجاهل.`);
                return;
            }

            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            console.log(`🔍 [DEBUG] جاري البحث عن الأمر: ${commandName}`);

            // 4. جهاز تنصت: هل الأمر موجود في ملفات البوت؟
            const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
            
            if (!command) {
                console.log(`❌ [DEBUG] الأمر (${commandName}) غير موجود في ملفات البوت!`);
                return;
            }

            console.log(`🚀 [DEBUG] تم العثور على الأمر، جاري التشغيل...`);
            await command.execute(message, args, client, config);

        } catch (error) {
            console.error("🔴 [DEBUG] حدث خطأ أثناء تنفيذ الرسالة:", error);
        }
    },
};
