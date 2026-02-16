const { EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (client) => {
    // 1. الربط المباشر بالمفتاح من Railway
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // 2. استخدام الموديل الأكثر استقراراً في العالم حالياً
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    client.on('messageCreate', async (message) => {
        // تجاهل البوتات والأوامر غير الصحيحة
        if (message.author.bot || !message.content.startsWith('!سؤال')) return;

        const input = message.content.replace('!سؤال', '').trim();
        if (!input) return message.reply('**❓ اكتب سؤالك يا وحش!**');

        await message.channel.sendTyping();

        try {
            // أسرع وأبسط طريقة للطلب لضمان تخطي أخطاء الـ 404 و 400
            const result = await model.generateContent(input);
            const response = result.response.text();

            // نظام تقطيع الردود الضخمة
            const chunks = response.match(/[\s\S]{1,1900}/g) || [response];

            for (let i = 0; i < chunks.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor('#2B2D31')
                    .setDescription(chunks[i]);
                
                if (i === 0) embed.setAuthor({ name: 'MNC TERMINATOR SYSTEM', iconURL: client.user.displayAvatarURL() });
                if (i === chunks.length - 1) embed.setFooter({ text: 'MNC Ultimate Intelligence | V12 Stable' });

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('🔥 [TERMINATOR ERROR]:', error);
            
            let advice = "تأكد من المفتاح الجديد في Railway.";
            if (error.message.includes('404')) advice = "جوجل لسه مش شايفة المشروع الجديد، استنى دقيقتين.";
            if (error.message.includes('400')) advice = "فيه مشكلة في صياغة السؤال أو إعدادات الحماية.";

            message.reply(`⚠️ **حدث خطأ:** \`${error.message}\`\n💡 **نصيحة:** ${advice}`);
        }
    });
};
