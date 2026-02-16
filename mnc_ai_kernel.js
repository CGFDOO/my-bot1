/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC GOD MODE - STABLE EDITION ]
 * █ ▀ █ █ ▀█ █ ▄  [ MODEL: GEMINI PRO (CLASSIC) ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * @version     FINAL.STABLE
 * @author      MNC Lead Architect
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// =====================================================================================
// [ZONE 1] SYSTEM CONFIGURATION
// =====================================================================================
const GOD_CONFIG = {
    API_KEY: process.env.GEMINI_API_KEY, 
    
    // 👇 الحل الجذري: استخدام الموديل المستقر
    MODEL_NAME: "gemini-pro", 
    
    PREFIX: "!سؤال",
    RESET_CMD: "!مسح",
    
    PERSONA: `
    أنت المساعد الشخصي الذكي لمجتمع MNC Community.
    - اسمك: MNC AI.
    - صفتك: خبير برمجيات، ومساعد إداري.
    - أسلوبك: دقيق جداً، مباشر، وتستخدم تنسيق Markdown.
    - ممنوع: لا تذكر أنك نموذج لغوي كبير.
    `,

    COLORS: {
        ANSWER: '#2B2D31',
        ERROR: '#FF0000'
    }
};

// =====================================================================================
// [ZONE 2] CORE ENGINE
// =====================================================================================
const chatSessions = new Map();

module.exports = async (client) => {

    if (!GOD_CONFIG.API_KEY) {
        console.error('🚨 [CRITICAL] GEMINI_API_KEY is missing!');
        return;
    }

    const genAI = new GoogleGenerativeAI(GOD_CONFIG.API_KEY);
    const model = genAI.getGenerativeModel({ model: GOD_CONFIG.MODEL_NAME });

    console.log(`🧠 [MNC AI] ONLINE using ${GOD_CONFIG.MODEL_NAME}`);

    client.on('messageCreate', async (message) => {
        try {
            if (message.author.bot) return;

            // أمر مسح الذاكرة
            if (message.content === GOD_CONFIG.RESET_CMD) {
                chatSessions.delete(message.author.id);
                return message.reply('**🧹 تم مسح الذاكرة. هات سؤال جديد!**');
            }

            if (!message.content.startsWith(GOD_CONFIG.PREFIX)) return;

            const query = message.content.replace(GOD_CONFIG.PREFIX, '').trim();
            if (!query) return message.reply('❓ **اكتب سؤالك!**');

            await message.channel.sendTyping();
            const typingInterval = setInterval(() => message.channel.sendTyping().catch(() => {}), 4000);

            // إدارة الجلسة
            let chatSession = chatSessions.get(message.author.id);
            if (!chatSession) {
                chatSession = model.startChat({
                    history: [
                        { role: "user", parts: [{ text: GOD_CONFIG.PERSONA }] },
                        { role: "model", parts: [{ text: "تم استلام التعليمات. أنا جاهز." }] }
                    ],
                });
                chatSessions.set(message.author.id, chatSession);
            }

            const result = await chatSession.sendMessage(query);
            const response = result.response;
            const text = response.text();

            clearInterval(typingInterval);

            // تقطيع الرسالة
            const chunks = text.match(/[\s\S]{1,1900}/g) || [];

            for (let i = 0; i < chunks.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor(GOD_CONFIG.COLORS.ANSWER)
                    .setDescription(chunks[i]);

                if (i === 0) embed.setTitle(`🧠 استفسار: ${query.substring(0, 50)}...`);
                if (i === chunks.length - 1) embed.setFooter({ text: `MNC AI | ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('🔥 [AI ERROR]:', error);
            chatSessions.delete(message.author.id);
            
            const errEmbed = new EmbedBuilder()
                .setColor(GOD_CONFIG.COLORS.ERROR)
                .setDescription(`**حدث خطأ تقني:**\n${error.message}\n\n*تم إعادة تعيين الذاكرة.*`);
            
            await message.reply({ embeds: [errEmbed] });
        }
    });
};
