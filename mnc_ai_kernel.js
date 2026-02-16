/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC SUPREME-CORE - V13 ]
 * █ ▀ █ █ ▀█ █ ▄  [ THE UNSTOPPABLE TERMINATOR ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * @version     13.0.0 (ULTIMATE)
 * @engine      Gemini 1.5 Flash (Latest & Stable)
 * @safety      Optimized Zero-Error Matrix
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const SUPREME_CONFIG = {
    // التقاط المفتاح من إعدادات Railway
    API_KEY: process.env.GEMINI_API_KEY, 
    // استخدام فلاش لضمان الاستقرار وتجنب أخطاء 404
    MODEL: "gemini-1.5-flash", 
    PREFIX: "!سؤال",
    // شخصية البوت الجبارة
    SYSTEM: "أنت MNC AI، الكيان الرقمي الأذكى في سيرفر MNC. إجاباتك أسطورية، ضخمة جداً، شاملة لكل التفاصيل، وتستخدم تنسيق Markdown باحترافية عالية."
};

module.exports = async (client) => {
    // التأكد من وجود المفتاح في Variables
    if (!SUPREME_CONFIG.API_KEY) {
        console.error('🚨 [CRITICAL] GEMINI_API_KEY NOT FOUND IN RAILWAY!');
        return;
    }

    const genAI = new GoogleGenerativeAI(SUPREME_CONFIG.API_KEY);
    
    // إعداد الموديل مع إصلاح خطأ الـ 400 (Safety Settings)
    const model = genAI.getGenerativeModel({ 
        model: SUPREME_CONFIG.MODEL,
        systemInstruction: SUPREME_CONFIG.SYSTEM,
        // استخدمنا فقط الفئات التي تدعمها جوجل حالياً لتجنب خطأ 400
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    });

    console.log(`🌌 [MNC SUPREME] KERNEL V13 DEPLOYED. READY FOR ACTION.`);

    client.on('messageCreate', async (message) => {
        try {
            if (message.author.bot || !message.content.startsWith(SUPREME_CONFIG.PREFIX)) return;

            const input = message.content.slice(SUPREME_CONFIG.PREFIX.length).trim();
            if (!input) return message.reply('**❓ مصفوفة البيانات فارغة. اسألني أي شيء يا بطل!**');

            await message.channel.sendTyping();
            const processTick = setInterval(() => message.channel.sendTyping().catch(() => {}), 4000);

            // إرسال الطلب واستقبال الإجابة الضخمة
            const result = await model.generateContent(input);
            const response = result.response.text();

            clearInterval(processTick);

            // نظام تقطيع الردود الضخمة (لضمان وصول الردود الطويلة جداً)
            const chunks = response.match(/[\s\S]{1,1900}/g) || [response];

            for (let i = 0; i < chunks.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor('#2B2D31')
                    .setDescription(chunks[i]);
                
                if (i === 0) embed.setAuthor({ name: 'MNC SUPREME INTELLIGENCE', iconURL: client.user.displayAvatarURL() });
                if (i === chunks.length - 1) embed.setFooter({ text: 'MNC Global Cloud | Singularity Active' });

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('🔥 [SUPREME ERROR]:', error);
            message.reply(`⚠️ **حدث خطأ في النظام:** \`${error.message}\`\n💡 **نصيحة:** تأكد أن المفتاح في Railway هو الذي أنشأته في المشروع الجديد.`);
        }
    });
};
