// استدعاء مكتبة node-fetch بطريقة حديثة (Dynamic Import)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// ==================================================================
// ⚙️ إعدادات الرتب والشخصيات (Configuration)
// ==================================================================

// 1. أرقام الرتب (IDs) - زي ما طلبتها بالظبط
const ROLES = {
    // رتب البنات (لو العضو معاه الرتبة دي، دارلا هترد عليه)
    GIRLS: ['1454500521707569152', '1454435370778497128'], 
    // رتب الولاد (شيرو هيرد عليه)
    BOYS: ['1454435472628781090'] 
};

// 2. تصميم شخصية "شيرو" (للشباب)
const SHIRO_SYSTEM = `
أنت "Shiro" (شيرو)، بوت ذكي ومرح في سيرفر ديسكورد اسمه MNC.
الشخصية: شاب "كول"، "صايع" بس جدع، دمه خفيف، بيحب "القفشات".
اللهجة: مكس بين "العامية المصرية" و"الخليجية الشبابية" (أمثلة: "يا وحش"، "طال عمرك"، "أحيه"، "وش ذا"، "برو").
الأسلوب: ردودك قصيرة، مباشرة، مليانة طاقة، واستخدم إيموجي رجالة (🔥، 😎، 💪).
تنبيه: لا تتكلم لغة عربية فصحى أبداً. خليك طبيعي زي الشباب.
`;

// 3. تصميم شخصية "دارلا" (للبنات)
const DARLA_SYSTEM = `
أنت "Darla" (دارلا)، بوت بنوتي في سيرفر ديسكورد اسمه MNC.
الشخصية: بنت دلوعة جداً، "Sassy" (لسانها طويل بضحك)، كيوت، وبتحب الدراما.
اللهجة: خليجية ومصرية بدلع (أمثلة: "يا روحي"، "وي"، "يا خوي"، "حبيبي"، "OMG"، "يا عسل").
الأسلوب: ردودك فيها دلع، استخدمي إيموجيز بنات كتير (✨، 💅، 💖، 🥺).
تنبيه: ممنوع الفصحى. خليكي "Girl to Girl".
`;

// ذاكرة المحادثات (عشان يفتكر الكلام)
const chatHistory = new Map();

// ==================================================================
// 🚀 المحرك الرئيسي (Main Engine)
// ==================================================================
module.exports = (client) => {
    
    client.on('messageCreate', async (message) => {
        // تجاهل البوتات والرسائل خارج السيرفر
        if (message.author.bot || !message.guild) return;

        // التحقق: هل تم ذكر البوت أو الرد عليه؟
        const isMentioned = message.mentions.users.has(client.user.id);
        const isReply = message.reference && (await message.fetchReference()).author.id === client.user.id;

        if (!isMentioned && !isReply) return;

        // إظهار "Jary el-Ketaba..."
        await message.channel.sendTyping();

        try {
            // 1. تنظيف الرسالة
            let userContent = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
            if (!userContent) userContent = "هلا؟";

            // 2. الذكاء في اختيار الشخصية (Persona Logic) 🧠
            let selectedPersona = SHIRO_SYSTEM; // الافتراضي شيرو
            let logName = "Shiro";

            // أ) فحص "الكلمات المفتاحية" (Override) - ده أقوى حاجة
            const lowerMsg = userContent.toLowerCase();
            if (lowerMsg.includes('darla') || lowerMsg.includes('دارلا') || lowerMsg.includes('بنت') || lowerMsg.includes('انتي')) {
                selectedPersona = DARLA_SYSTEM;
                logName = "Darla (By Request)";
            } 
            else if (lowerMsg.includes('shiro') || lowerMsg.includes('شيرو') || lowerMsg.includes('ولد')) {
                selectedPersona = SHIRO_SYSTEM;
                logName = "Shiro (By Request)";
            }
            // ب) فحص "الرتب" (Roles) - لو مفيش طلب محدد
            else {
                const memberRoles = message.member.roles.cache;
                // هل العضو عنده رتبة من رتب البنات؟
                if (ROLES.GIRLS.some(roleId => memberRoles.has(roleId))) {
                    selectedPersona = DARLA_SYSTEM;
                    logName = "Darla (By Role)";
                }
                // هل العضو عنده رتبة من رتب الولاد؟ (أو الافتراضي)
                else {
                    selectedPersona = SHIRO_SYSTEM;
                    logName = "Shiro (Default/Role)";
                }
            }

            // 3. إدارة الذاكرة (Memory)
            const userId = message.author.id;
            if (!chatHistory.has(userId)) chatHistory.set(userId, []);
            let history = chatHistory.get(userId);

            // إضافة رسالة المستخدم
            history.push({ role: "user", parts: [{ text: userContent }] });
            // الاحتفاظ بآخر 10 رسائل فقط
            if (history.length > 10) history = history.slice(history.length - 10);

            // 4. تجهيز الطلب لـ Google API
            const finalPrompt = `System Instruction: ${selectedPersona}\n\nChat History:\n`;
            
            // دمج الذاكرة مع الطلب
            const contents = [
                { role: "user", parts: [{ text: finalPrompt }] },
                ...history
            ];

            // 5. الاتصال المباشر (Direct Fetch)
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) return message.reply("يا مدير، مفتاح الـ API ضايع! شيك على Railway.");

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: {
                        temperature: 0.9, // إبداع ومرح عالي
                        maxOutputTokens: 400, // طول الرد مناسب
                    }
                })
            });

            const data = await response.json();

            // 6. معالجة الرد والأخطاء
            if (data.error) {
                console.error("⚠️ Gemini Error:", data.error.message);
                // لو حصل خطأ في الذاكرة، نمسحها ونحاول تاني (اختياري)
                chatHistory.delete(userId);
                return message.reply("المخ ضرب Error.. معلش قول تاني؟ 😵‍💫");
            }

            const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!botReply) return message.reply("ما عرفت أرد.. الكلام صعب عليّ 🤔");

            // حفظ رد البوت في الذاكرة
            history.push({ role: "model", parts: [{ text: botReply }] });
            chatHistory.set(userId, history);

            // إرسال الرد
            await message.reply(botReply);
            console.log(`✅ Replied as [${logName}] to ${message.author.tag}`);

        } catch (error) {
            console.error("❌ Fatal Error:", error);
            await message.reply("السيرفر عندي فيه مشكلة.. جرب كمان شوية 🔌");
        }
    });
};
