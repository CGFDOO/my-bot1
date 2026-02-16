/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC AI QUANTUM KERNEL ]
 * █ ▀ █ █ ▀█ █ ▄  [ INTEGRATED INTELLIGENCE SYSTEM ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * @version     1000.0.0 (MASTER BRAIN)
 * @author      MNC Lead Architect
 * @description The ultimate AI solver for MNC Community.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// استدعاء مفتاح الـ API من إعدادات Railway (Variables) لضمان الأمان
const GEN_AI_KEY = process.env.GEMINI_API_KEY; 

// إعداد المحرك الذكي
const genAI = new GoogleGenerativeAI(GEN_AI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

module.exports = (client) => {

    client.on('messageCreate', async (message) => {
        // تجاهل رسائل البوتات أو الرسائل التي لا تبدأ بـ !سؤال
        if (message.author.bot || !message.content.startsWith('!سؤال')) return;

        const args = message.content.slice('!سؤال'.length).trim();
        
        if (!args) {
            return message.reply('**❌ يرجى كتابة السؤال بعد الأمر!**\nمثال: `!سؤال كيف يمكنني تعلم البرمجة؟`');
        }

        try {
            // إرسال علامة "البوت يكتب الآن..." ليعرف المستخدم أن المعالجة جارية
            await message.channel.sendTyping();

            // صياغة الطلب للذكاء الاصطناعي ليكون الرد "بشري" واحترافي
            const promptInstruction = `أنت خبير ومستشار تقني في سيرفر MNC. أجب على السؤال التالي بدقة متناهية وبأسلوب بشري موثق، ولا تذكر أبداً أنك ذكاء اصطناعي أو نموذج لغوي: ${args}`;

            const result = await model.generateContent(promptInstruction);
            const response = await result.response;
            const textAnswer = response.text();

            // تقسيم الإجابة لو كانت أطول من 2000 حرف (حد ديسكورد)
            const answerChunks = textAnswer.match(/[\s\S]{1,2000}/g) || [];

            for (const chunk of answerChunks) {
                const aiEmbed = new EmbedBuilder()
                    .setAuthor({ name: 'MNC INTELLIGENCE UNIT', iconURL: client.user.displayAvatarURL() })
                    .setTitle(`❓ السؤال: ${args.substring(0, 200)}...`)
                    .setDescription(`**✅ الإجابة الموثقة:**\n\n${chunk}`)
                    .setColor('#FFFFFF')
                    .setTimestamp()
                    .setFooter({ text: `سألك: ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

                await message.reply({ embeds: [aiEmbed] });
            }

        } catch (error) {
            console.error('[MNC-AI] Error:', error);
            await message.reply('**⚠️ عذراً، المحرك الذكي مشغول حالياً أو أن مفتاح الـ API غير صالح. حاول مرة أخرى.**');
        }
    });

    console.log('🧠 [MNC-AI] Intelligence Module Loaded Successfully.');
};
