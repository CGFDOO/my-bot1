const fetch = require('node-fetch');

// ⚙️ إعدادات الرتب والشخصيات لـ MNC
const ROLES = {
    GIRLS: ['1454500521707569152', '1454435370778497128'], 
    BOYS: ['1454435472628781090'] 
};

const SHIRO_PROMPT = "أنت Shiro ولد صايع وجدع في سيرفر MNC، تتكلم مصري وخليجي شبابي. أسلوبك مرح وقوي وقصف جبهات.";
const DARLA_PROMPT = "أنتِ Darla بنت دلوعة ولسانك طويل في سيرفر MNC، تتكلمي خليجي ومصري بدلع. أسلوبك Sassy وكيوت.";

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild) return;

        const isMentioned = message.mentions.users.has(client.user.id);
        const isReply = message.reference && (await message.fetchReference()).author.id === client.user.id;

        if (!isMentioned && !isReply) return;

        await message.channel.sendTyping();

        try {
            let userContent = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
            if (!userContent) return message.reply("سم؟ وش بغيت يا وحش؟ 👂");

            // منطق اختيار الشخصية
            let persona = SHIRO_PROMPT;
            const lowerMsg = userContent.toLowerCase();

            // فحص الرتب أو طلب الشخصية بالاسم
            if (lowerMsg.includes('دارلا') || lowerMsg.includes('بنت') || ROLES.GIRLS.some(id => message.member.roles.cache.has(id))) {
                persona = DARLA_PROMPT;
            }
            if (lowerMsg.includes('شيرو') || lowerMsg.includes('ولد')) {
                persona = SHIRO_PROMPT;
            }

            const apiKey = process.env.GEMINI_API_KEY;
            
            // 🛑 الرابط المعدل لضمان التوافق مع v1beta
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${persona}\n\nالعضو يقول: ${userContent}` }] }]
                })
            });

            const data = await response.json();
            
            if (data.error) {
                console.error("Gemini API Error:", data.error.message);
                throw new Error(data.error.message);
            }

            const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!replyText) throw new Error("No response text found");

            await message.reply(replyText);

        } catch (err) {
            console.error("❌ AI Error:", err.message);
            await message.reply("المخ ضرب Error.. جوجل مهنج يا زميلي 😵‍💫");
        }
    });
};
