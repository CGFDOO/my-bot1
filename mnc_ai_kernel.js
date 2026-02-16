/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC NEBULA - V1.0 OPENAI ]
 * █ ▀ █ █ ▀█ █ ▄  [ THE UNSTOPPABLE EDITION ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { EmbedBuilder } = require('discord.js');
const OpenAI = require('openai');

const MNC_CORE = {
    // المفتاح اللي هتحطه في Railway
    API_KEY: process.env.OPENAI_API_KEY, 
    // الموديل الأكثر استقراراً وذكاءً
    MODEL: "gpt-3.5-turbo", 
    PREFIX: "!سؤال",
    // شخصية البوت
    SYSTEM_PROMPT: "أنت MNC AI، المساعد الذكي والمستشار التقني لسيرفر MNC Community. إجاباتك يجب أن تكون مفصلة جداً، طويلة، ومنظمة بتنسيق Markdown احترافي."
};

const openai = new OpenAI({ apiKey: MNC_CORE.API_KEY });

module.exports = async (client) => {
    // فحص وجود المفتاح في Variables
    if (!MNC_CORE.API_KEY) {
        console.error('🚨 [MNC ERROR] OPENAI_API_KEY is missing in Railway Variables!');
        return;
    }

    console.log('🌌 [MNC SYSTEM] OpenAI Engine is Online and Stable.');

    client.on('messageCreate', async (message) => {
        // تجاهل البوتات والرسائل اللي مش بتبدأ بالبريفكس
        if (message.author.bot || !message.content.startsWith(MNC_CORE.PREFIX)) return;

        const query = message.content.slice(MNC_CORE.PREFIX.length).trim();
        if (!query) return message.reply('**❓ مصفوفة البيانات فارغة. اسأل سؤالك يا بطل!**');

        // إظهار حالة "يكتب الآن"
        await message.channel.sendTyping();
        const typingInterval = setInterval(() => message.channel.sendTyping().catch(() => {}), 4000);

        try {
            const completion = await openai.chat.completions.create({
                model: MNC_CORE.MODEL,
                messages: [
                    { role: "system", content: MNC_CORE.SYSTEM_PROMPT },
                    { role: "user", content: query }
                ],
            });

            const response = completion.choices[0].message.content;
            clearInterval(typingInterval);

            // --- [ نظام التقطيع الذكي ] ---
            // لضمان إرسال الإجابات الضخمة دون تخطي ليميت ديسكورد
            const chunks = response.match(/[\s\S]{1,1900}/g) || [response];

            for (let i = 0; i < chunks.length; i++) {
                const embed = new EmbedBuilder()
                    .setColor('#2B2D31')
                    .setDescription(chunks[i]);

                if (i === 0) {
                    embed.setAuthor({ name: 'MNC NEBULA INTELLIGENCE', iconURL: client.user.displayAvatarURL() });
                    embed.setTitle(`🧠 معالجة: ${query.substring(0, 40)}...`);
                }

                if (i === chunks.length - 1) {
                    embed.setFooter({ text: 'Powered by OpenAI | MNC Stable Build' });
                    embed.setTimestamp();
                }

                await message.reply({ embeds: [embed] });
            }

        } catch (error) {
            clearInterval(typingInterval);
            console.error('🔥 [MNC CRASH]:', error);
            message.reply(`⚠️ **حدث خطأ تقني:** \`${error.message}\`\nتأكد من شحن الرصيد في OpenAI.`);
        }
    });
};
