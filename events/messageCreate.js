const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // ==========================================
        // 1. فلاتر الأمان الأساسية (تجاهل البوتات والخاص)
        // ==========================================
        if (message.author.bot || !message.guild) return;

        // ==========================================
        // 2. جلب إعدادات السيرفر من الداتابيز (الداشبورد)
        // ==========================================
        // ⚠️ هنا بتستخدم قاعدة البيانات بتاعتك (مثال: quick.db أو mongoose)
        // أنا هفترض إنك بتجيبها بالشكل ده، عدلها حسب الكود بتاعك لو مختلف:
        let config = await client.db?.get(`settings_${message.guild.id}`) || {}; 
        
        // لو مفيش إعدادات، هنعمل قيم افتراضية عشان البوت ميوقفش
        const prefix = config.prefix || '!';

        // ==========================================
        // 3. نظام الخط التلقائي (Auto Line) - الجديد 🚀
        // ==========================================
        if (config.autoLine && config.autoLine.trigger && message.content === config.autoLine.trigger) {
            
            // أ) مسح رسالة العضو لو إنت مفعلها من الداشبورد
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
                    console.log('❌ خطأ في إرسال صورة الخط');
                }
            }
            
            // نوقف الكود هنا عشان ميكملش باقي الحاجات
            return; 
        }

        // ==========================================
        // 4. نظام الردود التلقائية (Auto Responders) 💬
        // ==========================================
        const autoResponders = config.autoResponders || [];
        const matchedResponder = autoResponders.find(r => r.trigger === message.content);
        
        if (matchedResponder) {
            try {
                await message.reply({ content: matchedResponder.reply });
            } catch (error) {
                console.log('❌ خطأ في إرسال الرد التلقائي');
            }
            return; // نوقف الكود بعد الرد
        }

        // ==========================================
        // 5. نظام اللفلات واكتساب الخبرة (XP) 📈
        // ==========================================
        if (config.leveling && config.leveling.enabled !== false) {
            // هنا بتنادي على الفانكشن أو الكود بتاع إضافة الـ XP للعضو
            // مثال:
            // const randomXP = Math.floor(Math.random() * 11) + 15; // من 15 لـ 25 نقطة
            // await client.levelingSystem.addXP(message.author.id, message.guild.id, randomXP);
        }

        // ==========================================
        // 6. نظام الذكاء الاصطناعي (AI Hybrid System) ✨
        // ==========================================
        if (config.aiSystem && config.aiSystem.enabled !== false) {
            // لو الرسالة في روم الذكاء الاصطناعي، أو حد عمل منشن للبوت
            if (message.channel.id === config.aiSystem.chatChannelId || message.mentions.has(client.user)) {
                // هنا بتشغل كود الذكاء الاصطناعي (Gemini أو ChatGPT) اللي هيرد على العضو
                // return; (ممكن توقف الكود هنا عشان ميعتبرهاش أمر عادي)
            }
        }

        // ==========================================
        // 7. نظام الأوامر العادية (Prefix Commands) 🛠️
        // ==========================================
        
        // لو الرسالة مش بتبدأ بالبادئة (البريفكس)، نوقف الكود
        if (!message.content.startsWith(prefix)) return;

        // فصل البادئة عن اسم الأمر وتحويله لحروف صغيرة
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // البحث عن الأمر في الكوليكشن الخاص بالبوت
        const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

        // لو الأمر مش موجود، تجاهل
        if (!command) return;

        // ==========================================
        // 8. تشغيل الأمر (Execute Command) 🚀
        // ==========================================
        try {
            // نرسل الـ config مع الـ execute عشان نستخدمه جوه الأوامر (للون الإيمبد والرتب)
            await command.execute(message, args, client, config);
        } catch (error) {
            console.error(`❌ حدث خطأ أثناء تنفيذ الأمر ${commandName}:`, error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(config.embedSetup?.errorColor || '#ed4245')
                .setDescription('❌ حدث خطأ أثناء تنفيذ هذا الأمر! يرجى إبلاغ الإدارة.');

            message.reply({ embeds: [errorEmbed] }).catch(() => null);
        }
    },
};
