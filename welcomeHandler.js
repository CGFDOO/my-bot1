const { AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    
    client.on('guildMemberAdd', async member => {
        
        console.log(`[Welcome] عـضـو جـديـد دخل: ${member.user.tag}`);
        
        const config = await GuildConfig.findOne({ guildId: member.guild.id });
        if (!config) {
            console.log('[Welcome] لم يتم العثور على إعدادات السيرفر في الداتابيز.');
            return;
        }
        
        if (!config.welcomeChannelId) {
            console.log('[Welcome] روم الترحيب غير محددة.');
            return;
        }

        const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
        if (!welcomeChannel) {
            console.log('[Welcome] روم الترحيب المحددة غير موجودة في السيرفر.');
            return;
        }

        // 1. تجهيز الرسالة النصية
        let welcomeText = config.welcomeMessage;
        if (!welcomeText) {
            welcomeText = 'حياك الله يا [user] في [server]! أنت العضو رقم [memberCount].';
        }
        
        welcomeText = welcomeText.replace(/\[user\]/g, `<@${member.id}>`);
        welcomeText = welcomeText.replace(/\[server\]/g, member.guild.name);
        welcomeText = welcomeText.replace(/\[memberCount\]/g, member.guild.memberCount);

        // 2. إذا لم يكن هناك صورة خلفية، نرسل النص فقط
        if (!config.welcomeBgImage || config.welcomeBgImage.trim() === '') {
            console.log('[Welcome] لا توجد صورة خلفية، سيتم إرسال النص فقط.');
            return welcomeChannel.send({ content: welcomeText }).catch(()=>{});
        }

        // 3. إنشاء الصورة
        try {
            console.log('[Welcome] جاري إنشاء صورة الترحيب...');
            
            const canvas = Canvas.createCanvas(1024, 450);
            const ctx = canvas.getContext('2d');

            // تحميل الصورة (مع التعامل مع الروابط الخاطئة)
            let background;
            try {
                background = await Canvas.loadImage(config.welcomeBgImage);
            } catch (imgError) {
                console.log('❌ خطأ في تحميل صورة الخلفية من الرابط! سيتم إرسال نص فقط.');
                return welcomeChannel.send({ content: welcomeText }).catch(()=>{});
            }
            
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

            // تظليل خفيف
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // لون الإطار
            let borderColor = config.welcomeAvatarBorderColor;
            if (!borderColor) {
                borderColor = '#ffffff';
            }

            // رسم دائرة الصورة
            ctx.beginPath();
            ctx.arc(512, 180, 110, 0, Math.PI * 2, true); 
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 12; 
            ctx.stroke();
            ctx.closePath();
            ctx.clip();

            // رسم الصورة الشخصية للعضو
            const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
            const avatar = await Canvas.loadImage(avatarURL);
            ctx.drawImage(avatar, 402, 70, 220, 220);

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome-image.png' });

            console.log('[Welcome] تم إنشاء الصورة بنجاح! جاري الإرسال...');
            await welcomeChannel.send({ content: welcomeText, files: [attachment] }).catch((e)=>{
                console.log('❌ خطأ أثناء إرسال رسالة الترحيب للروم:', e.message);
            });

        } catch (err) {
            console.log('❌ خطأ غير متوقع في نظام الترحيب:', err.message);
            welcomeChannel.send({ content: welcomeText }).catch(()=>{});
        }
    });
};
