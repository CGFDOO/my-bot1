/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC OMEGA-STABLE - V11 ]
 * █ ▀ █ █ ▀█ █ ▄  [ THE FINAL MISSION-CRITICAL BUILD ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const MNC_CORE = {
    // المفتاح اللي في Railway
    API_KEY: process.env.GEMINI_API_KEY, 
    // الموديل المستقر والأسرع
    MODEL: "gemini-1.5-flash", 
    PREFIX: "!سؤال",
    SYSTEM: "أنت MNC OMNI، المساعد الفائق لسيرفر MNC. إجاباتك ضخمة، مفصلة جداً، واحترافية وتستخدم تنسيق Markdown."
};

module.exports = async (client) => {
    if (!MNC_CORE.API_KEY) return console.error('🚨 [ERROR] GEMINI_API_KEY MISSING IN RAILWAY!');

    const genAI = new GoogleGenerativeAI(MNC_CORE.API_KEY);
    
    // إعداد الموديل مع تحديد فئات الأمان المدعومة فقط (لحل خطأ 400)
    const model = genAI.getGenerativeModel({ 
        model: MNC_CORE.MODEL,
        systemInstruction: MNC_CORE.SYSTEM,
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
    });

    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.content.startsWith(MNC_CORE.PREFIX)) return;

        const input = message.content.slice(MNC_CORE.PREFIX.length).trim();
        if (!input) return message.reply('**❓ اكتب سؤالك يا وحش!**');

        await message.channel.sendTyping();

        try {
            // طلب الإجابة مباشرة
            const result = await model.generateContent(input);
            const response = result.response.text();

            // نظام تقطيع الردود الضخمة
            const chunks = response.match(/[\s\S]{1,1900}/g) || [response];

            for (let i = 0; i < chunks.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor('#2B2D31')
                    .setDescription(chunks[i]);
                
                if (i === 0) embed.setAuthor({ name: 'MNC OMEGA CORE', iconURL: client.user.displayAvatarURL() });
                if (i === chunks.length - 1) embed.setFooter({ text: 'MNC Intelligence System | V11 Stable' });

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('🔥 [OMEGA ERROR]:', error);
            message.reply(`⚠️ **حدث خطأ في المعالجة:** \`${error.message}\``);
        }
    });
};
