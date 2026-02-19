const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    client.on('messageCreate', async message => {
        // تجاهل رسائل البوتات والرسايل اللي في الخاص
        if (message.author.bot || !message.guild) return;

        // 1️⃣ جلب إعدادات السيرفر من الداتابيز
        const config = await GuildConfig.findOne({ guildId: message.guild.id });
        if (!config) return;

        // 2️⃣ نظام الردود التلقائية
        if (config.autoResponders && config.autoResponders.length > 0) {
            const responder = config.autoResponders.find(r => message.content.includes(r.word));
            if (responder) {
                message.reply(responder.reply).catch(() => {});
            }
        }

        // 3️⃣ التحقق من البريفكس الديناميكي
        const prefix = config.prefix || '!';
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();
        
        // دمج البريفكس مع الكلمة عشان نطابقها باللي متسجل في الداشبورد (مثال: !done)
        const fullCommand = prefix + commandName;

        // دالة للتحقق من الرتب المسموحة
        const hasRole = (allowedRoles) => {
            // لو مفيش رتب متحددة، يبقى للإدارة العليا فقط
            if (!allowedRoles || allowedRoles.length === 0) return message.member.permissions.has('Administrator');
            // لو متحدد رتب، نشوف لو العضو عنده واحدة منهم أو معاه Administrator
            return allowedRoles.some(roleId => message.member.roles.cache.has(roleId)) || message.member.permissions.has('Administrator');
        };

        // ==========================================
        // ⚙️ تنفيذ الأوامر الإدارية والوساطة
        // ==========================================

        // أمر تقييم الوسيط
        if (fullCommand === config.cmdDone) {
            if (!hasRole(config.cmdDoneRoles)) return message.reply('❌ لا تملك الرتبة المخصصة لاستخدام هذا الأمر.');
            // (سيتم إضافة كود إرسال التقييم للخاص هنا لاحقاً)
            return message.reply('✅ تم تشغيل أمر تقييم الوسيط بنجاح (سيتم دمج الكود لاحقاً).');
        }

        // أمر استدعاء الإدارة العليا
        if (fullCommand === config.cmdReqHigh) {
            if (!hasRole(config.cmdReqHighRoles)) return message.reply('❌ لا تملك الرتبة المخصصة.');
            return message.reply('✅ جاري استدعاء الإدارة العليا...');
        }

        // أمر الباند
        if (fullCommand === config.cmdBan) {
            if (!hasRole(config.cmdBanRoles)) return message.reply('❌ لا تملك الرتبة المخصصة للباند.');
            
            const userToBan = message.mentions.members.first();
            if (!userToBan) return message.reply('⚠️ يرجى عمل منشن للعضو المراد حظره.');
            
            // (سيتم إضافة كود تنفيذ الباند وإرسال اللوج هنا لاحقاً)
            return message.reply(`✅ أمر الباند يعمل بشكل صحيح على ${userToBan.user.tag}`);
        }

        // أمر التايم أوت
        if (fullCommand === config.cmdTimeout) {
            if (!hasRole(config.cmdTimeoutRoles)) return message.reply('❌ لا تملك الصلاحية للتايم أوت.');
            
            const userToMute = message.mentions.members.first();
            if (!userToMute) return message.reply('⚠️ يرجى عمل منشن للعضو.');
            
            // (سيتم إضافة كود التايم أوت هنا لاحقاً)
            return message.reply(`✅ أمر التايم أوت يعمل بشكل صحيح.`);
        }

        // أمر مسح الشات (Clear)
        if (fullCommand === config.cmdClear) {
            if (!hasRole(config.cmdClearRoles)) return message.reply('❌ لا تملك صلاحية مسح الشات.');
            
            const amount = parseInt(args[0]);
            if (isNaN(amount) || amount < 1 || amount > 100) return message.reply('⚠️ يرجى كتابة رقم بين 1 و 100.');
            
            await message.channel.bulkDelete(amount, true).catch(err => message.reply('❌ حدث خطأ أثناء مسح الرسائل.'));
            return message.channel.send(`✅ تم مسح ${amount} رسالة.`).then(msg => setTimeout(() => msg.delete().catch(()=>Object), 3000));
        }

        // يمكنك إضافة باقي الأوامر (قفل الشات، سحب الروم، الخ) بنفس الطريقة هنا
    });
};
