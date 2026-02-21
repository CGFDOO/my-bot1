// =========================================================================================================
// 🚀 نظام التشغيل الأساسي والقلب النابض (MAIN ENTRY POINT - ENTERPRISE EDITION)
// ---------------------------------------------------------------------------------------------------------
// هذا الملف هو نقطة البداية. يقوم بالاتصال بخوادم ديسكورد، يربط قاعدة البيانات،
// ويحتوي على "المحرك الديناميكي" الذي يقوم بربط جميع ملفات المشروع ببعضها تلقائياً.
// كما يحتوي على درع حماية (Anti-Crash) لمنع توقف البوت عند حدوث أي خطأ برمجي.
// =========================================================================================================

// =========================================================================================================
// 📦 1. استدعاء المكاتب الأساسية (Core Dependencies)
// =========================================================================================================
const discordLibrary = require('discord.js');
const mongooseDatabase = require('mongoose');
const fileSystem = require('fs');
const pathModule = require('path');
require('dotenv').config(); // تحميل المتغيرات السرية (التوكن ورابط الداتابيز) من ملف .env

// =========================================================================================================
// 🤖 2. إعداد الكلاينت والصلاحيات (Client Setup & Intents)
// =========================================================================================================
const botClient = new discordLibrary.Client({
    // الصلاحيات (Intents) التي يحتاجها البوت لرؤية ما يحدث في السيرفر
    intents: [
        discordLibrary.GatewayIntentBits.Guilds,                      // قراءة السيرفرات (أساسي)
        discordLibrary.GatewayIntentBits.GuildMessages,               // قراءة الرسائل في الرومات
        discordLibrary.GatewayIntentBits.MessageContent,              // قراءة محتوى الرسائل (ضروري للأوامر بالبريفكس)
        discordLibrary.GatewayIntentBits.GuildMembers,                // قراءة بيانات الأعضاء (للترحيب والرتب)
        discordLibrary.GatewayIntentBits.GuildVoiceStates,            // قراءة حالات الفويس (للوجات الصوت والنقل)
        discordLibrary.GatewayIntentBits.GuildMessageReactions,       // قراءة التفاعلات
        discordLibrary.GatewayIntentBits.GuildPresences               // قراءة حالة التواجد
    ],
    // البارشالز (Partials) للتعامل مع البيانات القديمة التي لم يتم تحميلها في الذاكرة
    partials: [
        discordLibrary.Partials.Message, 
        discordLibrary.Partials.Channel, 
        discordLibrary.Partials.GuildMember, 
        discordLibrary.Partials.User
    ]
});

// =========================================================================================================
// 🧠 3. إنشاء حاويات الذاكرة للأوامر (Memory Collections)
// =========================================================================================================
botClient.commands = new discordLibrary.Collection(); // لحفظ الأوامر الديناميكية
botClient.aliases = new discordLibrary.Collection();  // لحفظ اختصارات الأوامر إن وجدت

// =========================================================================================================
// 🛡️ 4. نظام الحماية الفولاذي من السقوط (Anti-Crash System)
// يمنع البوت من التوقف عن العمل (Crash) إذا حدث خطأ برمجي غير متوقع في أي ملف آخر.
// =========================================================================================================
process.on('unhandledRejection', (rejectionReason, rejectedPromise) => {
    console.log('\n[CRITICAL ERROR] Unhandled Rejection detected at:', rejectedPromise);
    console.log('[CRITICAL ERROR] Reason:', rejectionReason);
    // لا نقوم بإيقاف البوت، بل نسجل الخطأ فقط لضمان الاستمرارية
});

process.on('uncaughtException', (uncaughtError) => {
    console.log('\n[CRITICAL ERROR] Uncaught Exception detected:');
    console.error(uncaughtError);
});

process.on('uncaughtExceptionMonitor', (uncaughtError, errorOrigin) => {
    console.log('\n[CRITICAL ERROR] Uncaught Exception Monitor triggered at:', errorOrigin);
    console.error(uncaughtError);
});

// =========================================================================================================
// 🗄️ 5. محرك الاتصال بقاعدة البيانات (Database Connection Engine)
// =========================================================================================================
const establishDatabaseConnection = async () => {
    console.log('[SYSTEM] Attempting to connect to MongoDB Database...');
    try {
        mongooseDatabase.set('strictQuery', false);
        await mongooseDatabase.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            autoIndex: true, // بناء الـ Indexes تلقائياً لتسريع البحث
            connectTimeoutMS: 15000, // مهلة الاتصال
            socketTimeoutMS: 45000,
        });
        console.log('[DATABASE] ✅ Successfully connected to MongoDB. Data is secure.');
    } catch (databaseConnectionException) {
        console.log('[DATABASE ERROR] ❌ Failed to connect to MongoDB. The bot cannot operate without a database. Error details:');
        console.error(databaseConnectionException);
        process.exit(1); // إغلاق البوت إجبارياً إذا فشل الاتصال بالقاعدة لأنها العصب الأساسي
    }
};

// =========================================================================================================
// ⚙️ 6. محرك الربط التلقائي الديناميكي (Dynamic Handlers Auto-Loader)
// هذا هو النظام الذي يربط جميع الملفات في المشروع تلقائياً بمجرد إضافتها.
// =========================================================================================================
const loadSystemHandlers = () => {
    console.log('[SYSTEM] Initiating Dynamic Handlers Loading Process...');
    
    // تحديد مسار مجلد المحركات (handlers)
    const handlersDirectoryPath = pathModule.join(__dirname, 'handlers');
    
    // فحص ما إذا كان المجلد موجوداً لتجنب الأخطاء
    if (fileSystem.existsSync(handlersDirectoryPath) === false) {
        console.log('[SYSTEM WARNING] "handlers" directory is missing. Creating it now...');
        fileSystem.mkdirSync(handlersDirectoryPath, { recursive: true });
        console.log('[SYSTEM] "handlers" directory created. Please add your handler files.');
        return;
    }

    // قراءة جميع الملفات التي تنتهي بصيغة .js فقط
    const handlerJavascriptFilesArray = fileSystem.readdirSync(handlersDirectoryPath).filter(fileName => fileName.endsWith('.js'));
    
    let successfullyLoadedHandlersCount = 0;

    for (let fileIndex = 0; fileIndex < handlerJavascriptFilesArray.length; fileIndex++) {
        const currentHandlerFileName = handlerJavascriptFilesArray[fileIndex];
        
        try {
            // استدعاء ملف الهاندلر وتمرير الكلاينت (botClient) له ليعمل داخله
            require(`${handlersDirectoryPath}/${currentHandlerFileName}`)(botClient);
            successfullyLoadedHandlersCount++;
            console.log(`[SYSTEM LOG] 🔗 Successfully loaded and linked handler: ${currentHandlerFileName}`);
        } catch (handlerLoadException) {
            console.log(`[SYSTEM ERROR] ❌ Failed to load or link handler: ${currentHandlerFileName}`);
            console.error(handlerLoadException);
        }
    }
    
    console.log(`[SYSTEM LOG] Finished loading ${successfullyLoadedHandlersCount} system handlers.`);
};

// =========================================================================================================
// 🚀 7. دالة الإقلاع الرئيسية (Main Boot Sequence)
// =========================================================================================================
const startBotEngine = async () => {
    console.log('====================================================');
    console.log('🚀 ENTERPRISE BOT ENGINE IS STARTING...');
    console.log('====================================================');

    // 1. الاتصال بقاعدة البيانات أولاً قبل أي شيء
    await establishDatabaseConnection();
    
    // 2. تحميل المحركات (التي ستقوم بدورها بتحميل الأوامر والأحداث تلقائياً)
    loadSystemHandlers();
    
    // 3. تسجيل الدخول إلى خوادم ديسكورد باستخدام التوكن السري
    console.log('[SYSTEM] Attempting to login to Discord...');
    try {
        await botClient.login(process.env.BOT_TOKEN);
        console.log(`[DISCORD] ✅ Successfully logged in and online as: ${botClient.user?.tag}`);
        console.log('====================================================');
        console.log('🛡️ BOT IS FULLY OPERATIONAL AND READY FOR COMMANDS.');
        console.log('====================================================');
    } catch (discordLoginException) {
        console.log('[DISCORD ERROR] ❌ Failed to login. Please verify your BOT_TOKEN in the .env file.');
        console.error(discordLoginException);
    }
};

// إعطاء إشارة البدء للمحرك
startBotEngine();
