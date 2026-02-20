const { AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    
    client.on('guildMemberAdd', async member => {
        
        // جلب الإعدادات من الداتابيز
        const config = await GuildConfig.findOne({ guildId: member.guild.id });
        if (!config || !config.welcomeChannelId) return;

        // التحقق من وجود روم الترحيب
        const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
        if (!welcomeChannel) return;

        // 1. تجهيز الرسالة النصية وتغيير المتغيرات
        let welcomeText = config.welcomeMessage || 'حياك الله يا [user] في [server]! أنت العضو رقم [memberCount].';
        welcomeText = welcomeText.replace(/\[user\]/g, `<@${member.id}>`)
                                 .replace(/\[server\]/g, member.guild.name)
                                 .replace(/\[memberCount\]/g, member.guild.memberCount);

        // 2. التحقق من وجود صورة خلفية (إذا لم يوجد، نرسل النص فقط)
        if (!config.welcomeBgImage) {
            return welcomeChannel.send({ content: welcomeText }).catch(()=>{});
        }

        try {
            // 3. إنشاء الصورة (Canvas)
            const canvas = Canvas.createCanvas(1024, 450);
            const ctx = canvas.getContext('2d');

            // رسم الخلفية
            const background = await Canvas.loadImage(config.welcomeBgImage);
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // رسم طبقة تظليل خفيفة لجعل الصورة أفخم
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // جلب لون الإطار من الداتابيز
            let borderColor = config.welcomeAvatarBorderColor || '#ffffff';

            // رسم الدائرة الخاصة بالصورة الشخصية
            ctx.beginPath();
            ctx.arc(512, 180, 110, 0, Math.PI * 2, true); // مركز الصورة
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 12; // عرض الإطار
            ctx.stroke();
            ctx.closePath();
            ctx.clip(); // قص ما بداخل الدائرة فقط

            // رسم الصورة الشخصية للعضو
            const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
            const avatar = await Canvas.loadImage(avatarURL);
            ctx.drawImage(avatar, 402, 70, 220, 220);

            // تحويل الـ Canvas إلى ملف صورة
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome-image.png' });

            // إرسال الترحيب النهائي
            await welcomeChannel.send({ content: welcomeText, files: [attachment] }).catch(()=>{});

        } catch (err) {
            console.log('❌ خطأ في صنع صورة الترحيب:', err.message);
            // إرسال النص فقط في حالة فشل الصورة لتجنب توقف البوت
            welcomeChannel.send({ content: welcomeText }).catch(()=>{});
        }
    });
};
