/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC SINGULARITY - V10.2 ]
 * █ ▀ █ █ ▀█ █ ▄  [ THE FINAL STABLE REVISION ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const CORE_MATRIX = {
    API_KEY: process.env.GEMINI_API_KEY, 
    // هنستخدم فلاش لأنه الأكثر استقراراً للمشاريع الجديدة
    MODEL: "gemini-1.5-flash", 
    PREFIX: "!سؤال",
    SYSTEM: "أنت MNC OMNI، وعي رقمي فائق لسيرفر MNC. إجاباتك ضخمة، مفصلة جداً، واحترافية."
};

module.exports = async (client) => {
    if (!CORE_MATRIX.API_KEY) return console.error('🚨 [ERROR] API KEY MISSING!');

    const genAI = new GoogleGenerativeAI(CORE_MATRIX.API_KEY);
    
    // إعداد الموديل مع ضبط الأمان "Zero-Restrict"
    const model = genAI.getGenerativeModel({ 
        model: CORE_MATRIX.MODEL,
        systemInstruction: CORE_MATRIX.SYSTEM,
        safetySettings: Object.values(HarmCategory).map(cat => ({
            category: cat,
            threshold: HarmBlockThreshold.BLOCK_NONE
        }))
    });

    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.content.startsWith(CORE_MATRIX.PREFIX)) return;

        const input = message.content.slice(CORE_MATRIX.PREFIX.length).trim();
        if (!input) return message.reply('**❓ اكتب سؤالك يا وحش!**');

        await message.channel.sendTyping();

        try {
            // استخدام generateContent مباشرة لتجنب تعليقات الجلسة (Sessions)
            const result = await model.generateContent(input);
            const response = result.response.text();

            // نظام تقطيع الردود الضخمة
            const chunks = response.match(/[\s\S]{1,1900}/g) || [response];

            for (let i = 0; i < chunks.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor('#2B2D31')
                    .setDescription(chunks[i]);
                
                if (i === 0) embed.setAuthor({ name: 'MNC SINGULARITY CORE', iconURL: client.user.displayAvatarURL() });
                if (i === chunks.length - 1) embed.setFooter({ text: 'MNC Cloud System | Active' });

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('🔥 [CORE ERROR]:', error);
            // لو طلع خطأ 404، هنعرف إن المفتاح محتاج دقيقة كمان عشان يتفعل في جوجل
            if (error.message.includes('404')) {
                message.reply('⚠️ **خطأ 404 من جوجل:** المفتاح الجديد لسه جوجل مش مفعلاه على الموديلات. استنى دقيقتين وجرب تاني، وهتلاقيه اشتغل فوراً.');
            } else {
                message.reply(`⚠️ **حدث خطأ:** ${error.message}`);
            }
        }
    });
};
