/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC OMEGA NEURAL NETWORK ]
 * █ ▀ █ █ ▀█ █ ▄  [ CLASSIFIED: LEVEL 10 INTELLIGENCE ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * @architecture  Deep Learning / Contextual Memory Matrix
 * @version       9999.0.0 (THE SINGULARITY)
 * @author        MNC Lead Architect
 * @security      Quantum Encrypted
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// =====================================================================================
// [ZONE 1] SYSTEM CONFIGURATION (الإعدادات النووية)
// =====================================================================================
const NEURAL_CONFIG = {
    // 🔑 هذا هو الكود المسؤول عن التقاط المفتاح من Railway
    // ⚠️ لا تلمس هذا السطر أبداً!
    API_KEY: process.env.GEMINI_API_KEY, 

    MODEL_NAME: "gemini-pro",
    MAX_TOKENS: 4000,
    MEMORY_DEPTH: 15, // يتذكر آخر 15 رسالة (ذاكرة حديدية)
    COMMAND_PREFIX: '!سؤال',
    EMBED_COLORS: {
        THINKING: '#FFD700', // ذهبي وهو بيفكر
        SUCCESS: '#2B2D31',  // رمادي فخم للرد
        ERROR: '#FF0000'     // أحمر للخطر
    }
};

// =====================================================================================
// [ZONE 2] CORTEX MEMORY SYSTEM (نظام الذاكرة الحية)
// =====================================================================================
class CortexMemory {
    constructor() {
        this.shortTerm = new Map(); // تخزين المحادثات لكل عضو
        console.log('[MNC-CORTEX] Memory Matrix Initialized.');
    }

    getHistory(userId) {
        return this.shortTerm.get(userId) || [];
    }

    updateHistory(userId, userMsg, aiMsg) {
        let history = this.getHistory(userId);
        history.push({ role: "user", parts: [{ text: userMsg }] });
        history.push({ role: "model", parts: [{ text: aiMsg }] });
        
        // تنظيف الذاكرة القديمة عشان اللاب ميهنجش
        if (history.length > NEURAL_CONFIG.MEMORY_DEPTH) {
            history = history.slice(-NEURAL_CONFIG.MEMORY_DEPTH);
        }
        this.shortTerm.set(userId, history);
    }

    clearHistory(userId) {
        this.shortTerm.delete(userId);
    }
}

const MEMORY = new CortexMemory();

// =====================================================================================
// [ZONE 3] THE QUANTUM ENGINE (المحرك الرئيسي)
// =====================================================================================
module.exports = async (client) => {

    // 1. فحص الاتصال بالأقمار الصناعية (Railway Check)
    if (!NEURAL_CONFIG.API_KEY) {
        console.error(`
        🚨 [CRITICAL SYSTEM FAILURE] 🚨
        --------------------------------------------------
        UNABLE TO DETECT 'GEMINI_API_KEY' IN RAILWAY VARIABLES.
        PLEASE ABORT AND CONFIGURE VARIABLES IMMEDIATELY.
        --------------------------------------------------
        `);
        return;
    }

    // 2. تشغيل المفاعل النووي (Google AI)
    const genAI = new GoogleGenerativeAI(NEURAL_CONFIG.API_KEY);
    const model = genAI.getGenerativeModel({ model: NEURAL_CONFIG.MODEL_NAME });

    console.log(`
    🧠 [MNC NEURAL NETWORK] SYSTEM ONLINE.
    📡 [CONNECTION] LINKED TO GOOGLE CLOUD.
    🔐 [SECURITY] RAILWAY TOKEN SECURED.
    `);

    // 3. مراقبة الرسائل
    client.on('messageCreate', async (message) => {
        try {
            // تجاهل البوتات والرسائل العادية
            if (message.author.bot || !message.content.startsWith(NEURAL_CONFIG.COMMAND_PREFIX)) return;

            const query = message.content.replace(NEURAL_CONFIG.COMMAND_PREFIX, '').trim();
            
            // لو العضو كتب الأمر فاضي
            if (!query) {
                const warnEmbed = new EmbedBuilder()
                    .setColor(NEURAL_CONFIG.EMBED_COLORS.ERROR)
                    .setTitle('⚠️ خطأ في الإدخال')
                    .setDescription('**يا بطل، لازم تسألني عشان أجاوبك!**\nمثال: `!سؤال كيف أصنع سيرفر ديسكورد؟`');
                return message.reply({ embeds: [warnEmbed] });
            }

            // إظهار حالة "جاري التفكير"
            await message.channel.sendTyping();
            const typingLoop = setInterval(() => message.channel.sendTyping().catch(()=>{}), 4000);

            // --- [SYSTEM PROMPT INJECTION] ---
            // هنا بنبرمج شخصية البوت عشان ميعترفش إنه روبوت
            const systemPrompt = `
            تعليمات سرية للغاية (Top Secret):
            1. أنت "MNC AI"، العقل المدبر لسيرفر MNC Community.
            2. تتحدث بلهجة "خبير تقني محترف" ولكن ودود.
            3. لا تذكر أبداً أنك نموذج من جوجل أو ذكاء اصطناعي عام.
            4. إجاباتك يجب أن تكون دقيقة، مفصلة، وتستخدم تنسيق Markdown (Bold, Lists, Code Blocks).
            5. إذا سألك أحد عن برمجتك، قل: "أنا نظام خاص تم تطويري لخدمة MNC".
            `;

            // بدء المحادثة مع استدعاء الذاكرة
            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: systemPrompt }] },
                    { role: "model", parts: [{ text: "تم استلام التعليمات. أنا جاهز للعمل كخبير MNC." }] },
                    ...MEMORY.getHistory(message.author.id)
                ],
            });

            // إرسال الرسالة واستقبال الرد
            const result = await chat.sendMessage(query);
            const response = await result.response;
            const text = response.text();

            // حفظ في الذاكرة
            MEMORY.updateHistory(message.author.id, query, text);
            clearInterval(typingLoop); // وقف التايبينج

            // --- [SMART SPLITTER PROTOCOL] ---
            // تقطيع الرسالة لو كانت أطول من 2000 حرف (ديسكورد ليميت)
            const chunks = text.match(/[\s\S]{1,1900}/g) || [];

            for (let i = 0; i < chunks.length; i++) {
                const isFirst = i === 0;
                const isLast = i === chunks.length - 1;

                const embed = new EmbedBuilder()
                    .setColor(NEURAL_CONFIG.EMBED_COLORS.SUCCESS)
                    .setDescription(chunks[i]);

                if (isFirst) {
                    embed.setAuthor({ 
                        name: 'MNC INTELLIGENCE UNIT', 
                        iconURL: client.user.displayAvatarURL(),
                        url: 'https://discord.gg/mnc3'
                    });
                    embed.setTitle(`🧠 استفسار: ${query.substring(0, 50)}...`);
                }

                if (isLast) {
                    embed.setFooter({ 
                        text: `MNC Cortex V9000 | Requested by ${message.author.tag}`, 
                        iconURL: message.author.displayAvatarURL() 
                    });
                    embed.setTimestamp();
                }

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('🔥 [NEURAL MELTDOWN]:', error);
            const errEmbed = new EmbedBuilder()
                .setColor(NEURAL_CONFIG.EMBED_COLORS.ERROR)
                .setTitle('☢️ فشل في المعالجة المركزية')
                .setDescription('**النظام يواجه ضغطاً عالياً أو أن مفتاح الاتصال (API Key) غير صالح.**\nيرجى مراجعة إعدادات Railway.')
                .setFooter({ text: 'Error Code: 500-CORTEX-FAIL' });
            
            await message.reply({ embeds: [errEmbed] });
        }
    });
};
