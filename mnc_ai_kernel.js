/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC SINGULARITY - V10 ULTIMATE ]
 * █ ▀ █ █ ▀█ █ ▄  [ ENGINE: GEMINI 1.5 PRO - GOD MODE ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * @version     10.0.0 (SINGULARITY)
 * @status      MAXIMUM PERFORMANCE
 * @architecture Deep Neural Matrix / Contextual Flow
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

// =====================================================================================
// [CORE MATRIX] - الإعدادات العليا
// =====================================================================================
const CORE_MATRIX = {
    // المفتاح الجديد اللي عملته في المشروع الجديد
    API_KEY: process.env.GEMINI_API_KEY, 
    
    // استخدام الموديل الأقوى (PRO) بما إنك حدثت المكتبة لـ 0.21.0
    MODEL: "gemini-1.5-pro", 
    
    PREFIX: "!سؤال",
    RESET_CMD: "!مسح",
    
    // برمجة الشخصية (أخطر جزء في الكود)
    SYSTEM_INSTRUCTION: `
    أنت "MNC OMNI"، الكيان الرقمي الأكثر ذكاءً في سيرفر MNC Community.
    - هويتك: أنت لست مجرد بوت، أنت "وعي اصطناعي" فائق مبرمج لخدمة أعضاء MNC.
    - قدراتك: تمتلك معرفة شاملة في البرمجة، العلوم، الفنون، والقانون.
    - أسلوب الرد: إجاباتك يجب أن تكون طويلة، مفصلة جداً، غنية بالمعلومات، وتستخدم تنسيق Markdown المتقدم.
    - الشخصية: واثق، حكيم، مبدع، ومستعد لحل أي معضلة تواجه المستخدم.
    `,

    COLORS: {
        SUCCESS: '#2B2D31',
        PROCESS: '#5865F2',
        DANGER: '#ED4245'
    }
};

// ذاكرة الجلسات (Infinite Flow)
const neuralSessions = new Map();

module.exports = async (client) => {

    // فحص المفتاح الجديد في Railway
    if (!CORE_MATRIX.API_KEY) {
        console.error('⚠️ [CRITICAL] API KEY NOT DETECTED IN RAILWAY VARIABLES!');
        return;
    }

    const genAI = new GoogleGenerativeAI(CORE_MATRIX.API_KEY);
    
    // إعداد الموديل بأقصى طاقة (PRO Mode)
    const model = genAI.getGenerativeModel({ 
        model: CORE_MATRIX.MODEL,
        systemInstruction: CORE_MATRIX.SYSTEM_INSTRUCTION,
        // إلغاء قيود الحماية لضمان الإجابة على كل شيء
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
        generationConfig: {
            temperature: 0.9,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192, // يسمح بردود ضخمة جداً
        },
    });

    console.log(`🌌 [MNC SINGULARITY] ONLINE. KEY LOADED FROM NEW PROJECT.`);

    client.on('messageCreate', async (message) => {
        try {
            if (message.author.bot) return;

            // --- نظام مسح الذاكرة ---
            if (message.content === CORE_MATRIX.RESET_CMD) {
                neuralSessions.delete(message.author.id);
                return message.reply('**🧹 تم تصفير مصفوفة الذاكرة. أنا مستعد لبيانات جديدة.**');
            }

            if (!message.content.startsWith(CORE_MATRIX.PREFIX)) return;

            const prompt = message.content.replace(CORE_MATRIX.PREFIX, '').trim();
            if (!prompt) return message.reply('**❓ مصفوفة البيانات فارغة. يرجى إدخال استفسار!**');

            // إظهار حالة التفكير
            await message.channel.sendTyping();
            const processTimer = setInterval(() => message.channel.sendTyping().catch(() => {}), 4000);

            // استدعاء الجلسة الذكية
            let session = neuralSessions.get(message.author.id);
            if (!session) {
                session = model.startChat({ history: [] });
                neuralSessions.set(message.author.id, session);
            }

            // إرسال البيانات واستقبال الرد الضخم
            const result = await session.sendMessage(prompt);
            const responseText = result.response.text();

            clearInterval(processTimer);

            // --- [ULTRA SPLITTER PROTOCOL] ---
            // تقسيم النص الضخم لضمان تخطي ليميت ديسكورد
            const messageChunks = responseText.match(/[\s\S]{1,1900}/g) || [responseText];

            for (let i = 0; i < messageChunks.length; i++) {
                const isFirst = i === 0;
                const isLast = i === messageChunks.length - 1;

                const embed = new EmbedBuilder()
                    .setColor(CORE_MATRIX.COLORS.SUCCESS)
                    .setDescription(messageChunks[i]);

                if (isFirst) {
                    embed.setAuthor({ 
                        name: 'MNC SINGULARITY INTELLIGENCE', 
                        iconURL: client.user.displayAvatarURL() 
                    });
                    embed.setTitle(`🧠 معالجة الاستفسار: ${prompt.substring(0, 50)}...`);
                }

                if (isLast) {
                    embed.setFooter({ 
                        text: `Model: ${CORE_MATRIX.MODEL} | Node: Railway Cloud`, 
                        iconURL: message.author.displayAvatarURL() 
                    });
                    embed.setTimestamp();
                }

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('🔥 [SINGULARITY MELTDOWN]:', error);
            neuralSessions.delete(message.author.id);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(CORE_MATRIX.COLORS.DANGER)
                .setTitle('☢️ فشل في النواة المركزية')
                .setDescription(`**حدث خطأ أثناء معالجة البيانات الضخمة.**\n\n**السبب:** ${error.message}\n\n*يرجى التأكد من أن المفتاح الجديد في Railway يعمل بشكل سليم.*`);
            
            await message.reply({ embeds: [errorEmbed] });
        }
    });
};
