const { EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const CORE_MATRIX = {
    API_KEY: process.env.GEMINI_API_KEY, 
    // 👇 التعديل هنا: استخدام فلاش لضمان الاستقرار والسرعة
    MODEL: "gemini-1.5-flash", 
    PREFIX: "!سؤال",
    RESET_CMD: "!مسح",
    SYSTEM_INSTRUCTION: "أنت MNC OMNI، المساعد الذكي لسيرفر MNC. إجاباتك مفصلة واحترافية.",
    COLORS: { SUCCESS: '#2B2D31', DANGER: '#ED4245' }
};

const neuralSessions = new Map();

module.exports = async (client) => {
    if (!CORE_MATRIX.API_KEY) return console.error('⚠️ API KEY MISSING IN RAILWAY!');

    const genAI = new GoogleGenerativeAI(CORE_MATRIX.API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: CORE_MATRIX.MODEL,
        systemInstruction: CORE_MATRIX.SYSTEM_INSTRUCTION,
        safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }],
    });

    client.on('messageCreate', async (message) => {
        try {
            if (message.author.bot) return;
            if (message.content === CORE_MATRIX.RESET_CMD) {
                neuralSessions.delete(message.author.id);
                return message.reply('**🧹 تم تصفير الذاكرة. أنا جاهز!**');
            }
            if (!message.content.startsWith(CORE_MATRIX.PREFIX)) return;

            const prompt = message.content.replace(CORE_MATRIX.PREFIX, '').trim();
            if (!prompt) return message.reply('**❓ اكتب سؤالك!**');

            await message.channel.sendTyping();
            let session = neuralSessions.get(message.author.id);
            if (!session) {
                session = model.startChat({ history: [] });
                neuralSessions.set(message.author.id, session);
            }

            const result = await session.sendMessage(prompt);
            const responseText = result.response.text();

            const chunks = responseText.match(/[\s\S]{1,1900}/g) || [responseText];
            for (let i = 0; i < chunks.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor(CORE_MATRIX.COLORS.SUCCESS)
                    .setDescription(chunks[i]);
                if (i === 0) embed.setTitle(`🧠 MNC Intelligence: ${prompt.substring(0, 40)}...`);
                await message.reply({ embeds: [embed] });
            }
        } catch (error) {
            console.error(error);
            neuralSessions.delete(message.author.id);
            message.reply(`⚠️ **خطأ في المعالجة:** ${error.message}`);
        }
    });
};
