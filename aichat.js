const fetch = require('node-fetch');

// إعدادات الرتب
const ROLES = {
    GIRLS: ['1454500521707569152', '1454435370778497128'], 
    BOYS: ['1454435472628781090'] 
};

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

            // منطق الشخصيات
            let persona = "أنت Shiro ولد صايع وجدع في سيرفر MNC، تتكلم مصري وخليجي شبابي.";
            const lowerMsg = userContent.toLowerCase();

            // فحص الرتب والطلب
            if (lowerMsg.includes('دارلا') || lowerMsg.includes('بنت') || ROLES.GIRLS.some(id => message.member.roles.cache.has(id))) {
                persona = "أنتِ Darla بنت دلوعة ولسانك طويل في سيرفر MNC، تتكلمي خليجي ومصري بدلع.";
            }
            if (lowerMsg.includes('شيرو') || lowerMsg.includes('ولد')) {
                persona = "أنت Shiro ولد صايع وجدع في سيرفر MNC، تتكلم مصري وخليجي شبابي.";
            }

            const apiKey = process.env.GEMINI_API_KEY;
            // التعديل السحري هنا: تغيير v1beta إلى v1
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `${persona}\n\nUser: ${userContent}` }] }]
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error.message);

            const reply = data.candidates[0].content.parts[0].text;
            await message.reply(reply);

        } catch (err) {
            console.error(err);
            await message.reply("المخ ضرب Error.. معلش قول تاني؟ 😵‍💫");
        }
    });
};
