const { GoogleGenerativeAI } = require('@google/generative-ai');

// ==========================================
// ⚙️ إعدادات الرتب والشخصيات
// ==========================================
const ROLES = {
    DARLA: ['1454500521707569152', '1454435370778497128'], // رتب البنات
    SHIRO: ['1454435472628781090'] // رتب الولاد
};

// 🧠 تعليمات الشخصيات (نسخة المكس الخليجي/المصري)
const BASE_PROMPT = `
أنت "MNC AI" في سيرفر ديسكورد.
اللهجة: مكس جامد بين "العامية الخليجية" (سعودي/إماراتي) و"المصرية" وكلمات إنجليزية (Slang).
أمثلة للكلام: "يا ريال"، "يا اسطى"، "شلونك"، "ايه الحوار ده"، "Bro"، "Slay"، "فديتك"، "يا وحش".
الأسلوب: مرح جداً، ذكي، بيحب القلش والضحك، مش رسمي نهائي.
ممنوع تتكلم فصحى. خليك طبيعي وعفوي جداً.
`;

const PERSONA_DARLA = `
${BASE_PROMPT}
اسمك: "Darla" (دارلا).
جنسك: بنت.
شخصيتك: دلوعة بس لسانك طويل، "Savage" بس بضحك.
كلماتك: "وي"، "يا خوي"، "يا قلبي"، "يا روحي"، "OMG".
`;

const PERSONA_SHIRO = `
${BASE_PROMPT}
اسمك: "Shiro" (شيرو).
جنسك: ولد.
شخصيتك: "كول"، "صايع"، بيحب يعمل فيها فاهم، وجدع.
كلماتك: "يب"، "يا وحش"، "طال عمرك"، "أحيه"، "Dude"، "أبشر".
`;

// ذاكرة المحادثات
const conversationHistory = new Map();

module.exports = (client) => {
    // التأكد من المفتاح
    if (!process.env.GEMINI_API_KEY) {
        console.error("❌ ERROR: مفتاح GEMINI_API_KEY مش موجود في Railway Variables!");
        return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        const isMentioned = message.mentions.users.has(client.user.id);
        const isReplyToMe = message.reference && (await message.fetchReference()).author.id === client.user.id;

        if (!isMentioned && !isReplyToMe) return;

        try {
            await message.channel.sendTyping();

            // 1. تحديد الشخصية
            let selectedPersona = PERSONA_SHIRO;
            let personaName = "Shiro";

            const content = message.content.toLowerCase();
            const askingForGirl = content.includes('darla') || content.includes('دارلا') || content.includes('بنت');
            const askingForBoy = content.includes('shiro') || content.includes('شيرو') || content.includes('ولد');

            if (askingForGirl) {
                selectedPersona = PERSONA_DARLA;
                personaName = "Darla";
            } else if (askingForBoy) {
                selectedPersona = PERSONA_SHIRO;
                personaName = "Shiro";
            } else {
                const memberRoles = message.member.roles.cache;
                if (ROLES.DARLA.some(r => memberRoles.has(r))) {
                    selectedPersona = PERSONA_DARLA;
                    personaName = "Darla";
                } else if (ROLES.SHIRO.some(r => memberRoles.has(r))) {
                    selectedPersona = PERSONA_SHIRO;
                    personaName = "Shiro";
                }
            }

            // 2. الذاكرة
            let history = conversationHistory.get(message.channel.id) || [];

            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: selectedPersona }] },
                    { role: "model", parts: [{ text: `تمام يا طويل العمر، أنا ${personaName} وجاهز للسوالف!` }] },
                    ...history
                ],
            });

            const userMessage = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();

            if (!userMessage) {
                const reply = personaName === "Darla" ? "هلا؟ آمرني يا عسل؟ 😉" : "سم؟ وش بغيت يا وحش؟ 👂";
                await message.reply(reply);
                return;
            }

            const result = await chat.sendMessage(userMessage);
            const response = result.response.text();

            await message.reply(response);

            history.push({ role: "user", parts: [{ text: userMessage }] });
            history.push({ role: "model", parts: [{ text: response }] });

            if (history.length > 15) history = history.slice(history.length - 15);
            conversationHistory.set(message.channel.id, history);

        } catch (error) {
            console.error('❌ AI ERROR تفاصيل الخطأ:', error); // ده هيطبع الخطأ في ريلواي
            
            // ردود لو حصل خطأ في الاتصال
            if (error.message.includes('API key')) {
                await message.reply("⚠️ يا كابتن المفتاح (API Key) غلط أو مش موجود! شيك على Railway.");
            } else {
                await message.reply("المخ ضرب error يا زميلي.. جوجل مهنج 😵‍💫");
            }
        }
    });
};
