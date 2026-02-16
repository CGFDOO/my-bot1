/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC GOD MODE ARCHITECTURE ]
 * █ ▀ █ █ ▀█ █ ▄  [ MODEL: GEMINI 1.5 PRO (LATEST) ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * @version     10000.0.0 (ULTIMATE)
 * @author      MNC Lead Architect
 * @description The closest architecture to the real Gemini experience.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// =====================================================================================
// [ZONE 1] SYSTEM MATRIX (الإعدادات العقلية)
// =====================================================================================
const GOD_CONFIG = {
    API_KEY: process.env.GEMINI_API_KEY, 
    
    // 🧠 استخدام الموديل الأقوى والأذكى على الإطلاق
    MODEL_NAME: "gemini-1.5-flash", 
    
    PREFIX: "!سؤال",
    RESET_CMD: "!مسح", // أمر لمسح ذاكرة البوت
    
    // إعدادات الشخصية (System Instructions) - ده اللي بيخليه يتصرف بذكاء خارق
    PERSONA: `
    أنت المساعد الشخصي الذكي لمجتمع MNC Community.
    - اسمك: MNC AI.
    - صفتك: خبير برمجيات، ومساعد إداري، ومستشار ذكي.
    - أسلوبك: دقيق جداً، مباشر، وتستخدم تنسيق Markdown ببراعة (عناوين، قوائم، أكواد).
    - الذاكرة: أنت تتذكر سياق الحديث جيداً.
    - ممنوع: لا تذكر أنك "نموذج لغوي كبير"، تصرف ككيان ذكي خاص بـ MNC.
    `,

    COLORS: {
        THINKING: '#FFD700',
        ANSWER: '#2B2D31',
        ERROR: '#FF0000'
    }
};

// =====================================================================================
// [ZONE 2] DYNAMIC MEMORY STREAM (نظام الذاكرة المتصلة)
// =====================================================================================
const chatSessions = new Map(); // تخزين جلسات المحادثة لكل عضو

module.exports = async (client) => {

    // 1. التحقق الأمني
    if (!GOD_CONFIG.API_KEY) {
        console.error('🚨 [CRITICAL] GEMINI_API_KEY is missing in Railway!');
        return;
    }

    const genAI = new GoogleGenerativeAI(GOD_CONFIG.API_KEY);
    
    // 2. إعداد الموديل مع معايير الأمان (عشان ميعلقش على حاجات بسيطة)
    const model = genAI.getGenerativeModel({ 
        model: GOD_CONFIG.MODEL_NAME,
        systemInstruction: GOD_CONFIG.PERSONA,
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
    });

    console.log(`🧠 [MNC GOD MODE] ONLINE using ${GOD_CONFIG.MODEL_NAME}`);

    client.on('messageCreate', async (message) => {
        try {
            if (message.author.bot) return;

            // --- A. أمر مسح الذاكرة (Reset) ---
            if (message.content === GOD_CONFIG.RESET_CMD) {
                chatSessions.delete(message.author.id);
                return message.reply('**🧹 تم مسح ذاكرة المحادثة. أنا جاهز لموضوع جديد!**');
            }

            // --- B. استقبال الأسئلة ---
            if (!message.content.startsWith(GOD_CONFIG.PREFIX)) return;

            const query = message.content.replace(GOD_CONFIG.PREFIX, '').trim();
            if (!query) return message.reply('❓ **اكتب سؤالك يا وحش!**');

            await message.channel.sendTyping();
            
            // مؤشر التفكير (عشان الأسئلة الطويلة)
            const typingInterval = setInterval(() => message.channel.sendTyping().catch(() => {}), 4000);

            // 3. إدارة الجلسة (Chat Session Management)
            let chatSession = chatSessions.get(message.author.id);
            
            // لو مفيش جلسة سابقة، ابدأ واحدة جديدة
            if (!chatSession) {
                chatSession = model.startChat({
                    history: [], // يبدأ بذاكرة نظيفة
                    generationConfig: {
                        maxOutputTokens: 4000, // يسمح بإجابات طويلة جداً
                    },
                });
                chatSessions.set(message.author.id, chatSession);
            }

            // 4. إرسال السؤال للمخ
            const result = await chatSession.sendMessage(query);
            const response = result.response;
            const text = response.text();

            clearInterval(typingInterval);

            // 5. نظام التقطيع الذكي (MNC Splitter V2)
            // يقطع الرسائل الطويلة مع الحفاظ على شكل الكود (Code Blocks)
            const chunks = splitMessage(text);

            for (let i = 0; i < chunks.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor(GOD_CONFIG.COLORS.ANSWER)
                    .setDescription(chunks[i]);

                if (i === 0) {
                    embed.setAuthor({ 
                        name: 'MNC ADVANCED INTELLIGENCE', 
                        iconURL: client.user.displayAvatarURL() 
                    });
                }
                
                if (i === chunks.length - 1) {
                    embed.setFooter({ 
                        text: `Context Active | Type ${GOD_CONFIG.RESET_CMD} to clear memory`, 
                        iconURL: message.author.displayAvatarURL() 
                    });
                    embed.setTimestamp();
                }

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('🔥 [AI FATAL ERROR]:', error);
            
            // إعادة تعيين الجلسة في حالة الخطأ
            chatSessions.delete(message.author.id);

            const errEmbed = new EmbedBuilder()
                .setColor(GOD_CONFIG.COLORS.ERROR)
                .setTitle('⚠️ خطأ في الاتصال العصبي')
                .setDescription(`**حدث خطأ أثناء معالجة البيانات.**\nالسبب المحتمل: ${error.message}\n\n*تم إعادة تعيين ذاكرتي تلقائياً، حاول مرة أخرى.*`);
            
            await message.reply({ embeds: [errEmbed] });
        }
    });
};

/**
 * دالة تقطيع الرسائل الذكية
 * تحافظ على تنسيق الأكواد حتى لو الرسالة اتقسمت
 */
function splitMessage(text, maxLength = 1900) {
    if (text.length <= maxLength) return [text];
    const chunks = [];
    while (text.length > 0) {
        let chunk = text.substring(0, maxLength);
        const lastNewLine = chunk.lastIndexOf('\n');
        
        if (lastNewLine > 0 && text.length > maxLength) {
            chunk = text.substring(0, lastNewLine);
        }
        chunks.push(chunk);
        text = text.substring(chunk.length).trim();
    }
    return chunks;
}
