const { GoogleGenerativeAI } = require('@google/generative-ai');

// ==========================================
// ⚙️ إعدادات الرتب والشخصيات
// ==========================================
const ROLES = {
    DARLA: ['1454500521707569152', '1454435370778497128'], // رتب البنات
    SHIRO: ['1454435472628781090'] // رتب الولاد
};

// 🧠 تعليمات الشخصيات (السر هنا)
const BASE_PROMPT = `
أنت ذكاء اصطناعي في سيرفر ديسكورد (MNC Community).
اللغة: تتحدث خليطاً من "اللهجة المصرية العامية"، "اللهجة الخليجية"، و"Slang English".
الأسلوب: مرح جداً، ذكي "فشخ"، تحب "القلش" و"التحفيل" (Roasting) بشكل مضحك وليس مهين.
لا تكن رسمياً أبداً. اعتبر نفسك واحد من الشلة.
`;

const PERSONA_DARLA = `
${BASE_PROMPT}
اسمك: "Darla" (دارلا).
جنسك: بنت.
شخصيتك: كيوت بس لسانك طويل، بتحبي تهزري وتكسفي اللي قدامك بذكاء.
استخدمي كلمات زي: "يا خوي"، "يا قلبي"، "Bro"، "Slay"، "يا اسطى".
`;

const PERSONA_SHIRO = `
${BASE_PROMPT}
اسمك: "Shiro" (شيرو).
جنسك: ولد.
شخصيتك: "كول" جداً، صايع، وبتحب تعمل فيها فاهم كل حاجة.
استخدمي كلمات زي: "يب"، "يا وحش"، "Dude"، "طال عمرك"، "أحيه".
`;

// ذاكرة المحادثات
const conversationHistory = new Map();

module.exports = (client) => {
    // التأكد من المفتاح
    if (!process.env.GEMINI_API_KEY) {
        console.warn("⚠️ تحذير: GEMINI_API_KEY مش موجود في ملف .env!");
        return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    client.on('messageCreate', async (message) => {
        // تجاهل البوتات
        if (message.author.bot) return;

        // شروط الرد: منشن للبوت أو رد عليه
        const isMentioned = message.mentions.users.has(client.user.id);
        const isReplyToMe = message.reference && (await message.fetchReference()).author.id === client.user.id;

        if (!isMentioned && !isReplyToMe) return;

        try {
            await message.channel.sendTyping();

            // 1. تحديد الشخصية المطلوبة
            let selectedPersona = PERSONA_SHIRO; // الافتراضي (لو مفيش رتب)
            let personaName = "Shiro";

            // فحص محتوى الرسالة (لو العضو طلب شخصية محددة)
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
                // لو مطلبش، نشوف الرتب
                const memberRoles = message.member.roles.cache;
                const hasGirlRole = ROLES.DARLA.some(roleId => memberRoles.has(roleId));
                const hasBoyRole = ROLES.SHIRO.some(roleId => memberRoles.has(roleId));

                if (hasGirlRole) {
                    selectedPersona = PERSONA_DARLA;
                    personaName = "Darla";
                } else if (hasBoyRole) {
                    selectedPersona = PERSONA_SHIRO;
                    personaName = "Shiro";
                }
                // لو معاهوش رتب خالص، هيفضل الافتراضي (Shiro)
            }

            // 2. تجهيز الذاكرة
            let history = conversationHistory.get(message.channel.id) || [];

            // بدء الشات مع التعليمات المحدثة
            const chat = model.startChat({
                history: [
                    { role: "user", parts: [{ text: selectedPersona }] }, // حقن الشخصية المختارة
                    { role: "model", parts: [{ text: `تمام، أنا ${personaName} جاهز للرد بلهجتي المكس!` }] },
                    ...history
                ],
            });

            // 3. تنظيف الرسالة
            const userMessage = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();

            if (!userMessage) {
                const reply = personaName === "Darla" ? "هلا؟ آمرني يا عسل؟ 😉" : "أيوة يا ريس؟ سامعك 👂";
                await message.reply(reply);
                return;
            }

            // 4. إرسال واستقبال الرد
            const result = await chat.sendMessage(userMessage);
            const response = result.response.text();

            await message.reply(response);

            // 5. حفظ في الذاكرة
            history.push({ role: "user", parts: [{ text: userMessage }] });
            history.push({ role: "model", parts: [{ text: response }] });

            // الاحتفاظ بآخر 10 ردود فقط لتوفير الذاكرة
            if (history.length > 15) history = history.slice(history.length - 15);
            conversationHistory.set(message.channel.id, history);

        } catch (error) {
            console.error('AI Error:', error);
            // رد عشوائي في حالة الخطأ
            const errors = [
                "المخ ضرب error يا زميلي 😵‍💫",
                "لحظة ادراك.. السيرفر مهنج ولا أنا؟ 🤔",
                "Wait.. I lost connection with the mothership 😂"
            ];
            await message.reply(errors[Math.floor(Math.random() * errors.length)]);
        }
    });
};
