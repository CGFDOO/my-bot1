// =========================================================================================================
// 🚀 المحرك الرئيسي للبوت (MAIN ENTERPRISE BOT ENGINE)
// ---------------------------------------------------------------------------------------------------------
// الوظيفة: تشغيل البوت، الاتصال بقاعدة البيانات، استدعاء الأوامر والأحداث،
// تشغيل نظام الحماية من الانهيار (Anti-Crash)، وتشغيل الداشبورد المرتبطة به.
// تم التعديل لسحب المتغيرة باسم (TOKEN) مباشرة من بيئة التشغيل.
// =========================================================================================================

// استدعاء مكتبة قراءة المتغيرات السرية (يجب أن تكون في أعلى الملف)
require('dotenv').config();

// استدعاء مكتبات ديسكورد الأساسية
const discordLibrary = require('discord.js');
const { Client, GatewayIntentBits, Partials, Collection } = discordLibrary;

// استدعاء مكتبات النظام وقاعدة البيانات
const mongoose = require('mongoose');
const fileSystem = require('fs');
const path = require('path');

// =========================================================================================================
// 🤖 1. تهيئة عميل ديسكورد (Discord Client Initialization)
// =========================================================================================================

const botClient = new Client({
    // تفعيل جميع البوابات (Intents) اللازمة لعمل البوت بشكل كامل وبدون قيود
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildPresences
    ],
    // تفعيل الأجزاء (Partials) لقراءة الرسائل القديمة التي لم تكن في الذاكرة الحية (RAM)
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
    ]
});

// تهيئة مجموعات (Collections) لحفظ الأوامر والاختصارات في الذاكرة العشوائية لتسريع الاستجابة
botClient.commands = new Collection();
botClient.aliases = new Collection();

// =========================================================================================================
// 🗄️ 2. الاتصال بقاعدة البيانات (MongoDB Connection Engine)
// =========================================================================================================

const establishDatabaseConnection = async () => {
    
    // سحب رابط قاعدة البيانات من ملف .env أو متغيرات Railway
    const mongoDatabaseUriString = process.env.MONGO_URI;

    if (!mongoDatabaseUriString) {
        console.error('====================================================');
        console.error('[DATABASE CRITICAL ERROR] MONGO_URI is missing from your environment variables!');
        console.error('====================================================');
        process.exit(1); // إغلاق البوت فوراً إذا لم يكن هناك رابط لقاعدة البيانات لتجنب الأخطاء
    }

    mongoose.set('strictQuery', false);

    try {
        console.log('[DATABASE] Attempting to connect to MongoDB Cluster...');
        await mongoose.connect(mongoDatabaseUriString, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 15000 // انتظار 15 ثانية كحد أقصى للاتصال قبل إعلان الفشل
        });
        console.log('[DATABASE] ✅ Successfully connected to MongoDB Enterprise Database.');
    } catch (databaseConnectionException) {
        console.error('====================================================');
        console.error('[DATABASE CRITICAL ERROR] Failed to connect to MongoDB!');
        console.error(databaseConnectionException);
        console.error('====================================================');
        process.exit(1);
    }
};

// =========================================================================================================
// 📂 3. معالج الأوامر والأحداث (Dynamic Handlers System)
// =========================================================================================================

const loadSystemHandlers = () => {
    console.log('\n[SYSTEM] Starting to load Event and Command Handlers...');

    // ---------------------------------------------------------------------------------
    // أ. معالج الأحداث (Events Handler)
    // ---------------------------------------------------------------------------------
    const eventsDirectoryPath = path.join(__dirname, 'events');
    const eventFilesArray = fileSystem.readdirSync(eventsDirectoryPath).filter(file => file.endsWith('.js'));

    let loadedEventsCount = 0;
    for (const eventFile of eventFilesArray) {
        const eventModulePath = path.join(eventsDirectoryPath, eventFile);
        const eventModule = require(eventModulePath);

        if (eventModule.once === true) {
            botClient.once(eventModule.name, (...args) => eventModule.execute(...args, botClient));
        } else {
            botClient.on(eventModule.name, (...args) => eventModule.execute(...args, botClient));
        }
        loadedEventsCount++;
    }
    console.log(`[EVENTS HANDLER] ✅ Successfully loaded ${loadedEventsCount} Event modules into memory.`);

    // ---------------------------------------------------------------------------------
    // ب. معالج الأوامر المتقدم (Commands Handler - Subfolder Support)
    // ---------------------------------------------------------------------------------
    const commandsDirectoryPath = path.join(__dirname, 'commands');
    const commandFoldersArray = fileSystem.readdirSync(commandsDirectoryPath);

    let loadedCommandsCount = 0;
    for (const folderName of commandFoldersArray) {
        const specificFolderPath = path.join(commandsDirectoryPath, folderName);
        
        // التأكد من أن المسار هو مجلد فعلي وليس ملف عادي
        const isDirectoryBoolean = fileSystem.statSync(specificFolderPath).isDirectory();
        
        if (isDirectoryBoolean === true) {
            const commandFilesArray = fileSystem.readdirSync(specificFolderPath).filter(file => file.endsWith('.js'));
            
            for (const commandFile of commandFilesArray) {
                const commandModulePath = path.join(specificFolderPath, commandFile);
                const commandModule = require(commandModulePath);
                
                if (commandModule.name) {
                    botClient.commands.set(commandModule.name, commandModule);
                    loadedCommandsCount++;
                    
                    // تحميل الاختصارات (Aliases) إذا وجدت داخل وحدة الأمر
                    if (commandModule.aliases && Array.isArray(commandModule.aliases) === true) {
                        for (let i = 0; i < commandModule.aliases.length; i++) {
                            const currentAliasString = commandModule.aliases[i];
                            botClient.aliases.set(currentAliasString, commandModule.name);
                        }
                    }
                }
            }
        }
    }
    console.log(`[COMMANDS HANDLER] ✅ Successfully loaded ${loadedCommandsCount} Command modules from subfolders.`);
};

// =========================================================================================================
// 🛡️ 4. نظام الحماية من الانهيار المفاجئ (Enterprise Anti-Crash System)
// =========================================================================================================

process.on('unhandledRejection', (rejectionReason, rejectedPromise) => {
    console.log('\n=================== [ANTI-CRASH] UNHANDLED REJECTION ===================');
    console.log('Reason: ', rejectionReason);
    console.log('========================================================================\n');
});

process.on('uncaughtException', (uncaughtExceptionError, exceptionOrigin) => {
    console.log('\n=================== [ANTI-CRASH] UNCAUGHT EXCEPTION ====================');
    console.log('Exception: ', uncaughtExceptionError);
    console.log('Origin: ', exceptionOrigin);
    console.log('========================================================================\n');
});

process.on('uncaughtExceptionMonitor', (uncaughtExceptionError, exceptionOrigin) => {
    console.log('\n================ [ANTI-CRASH] UNCAUGHT EXCEPTION MONITOR ===============');
    console.log('Exception: ', uncaughtExceptionError);
    console.log('========================================================================\n');
});

// =========================================================================================================
// 🚀 5. تشغيل المحرك بالكامل وتفعيل البوت (Full Boot Sequence)
// =========================================================================================================

const startEnterpriseBotEngine = async () => {
    
    // الخطوة الأولى: الاتصال بقاعدة البيانات لضمان حفظ البيانات قبل استلام أي رسالة
    await establishDatabaseConnection();

    // الخطوة الثانية: تحميل جميع الأوامر والأحداث إلى ذاكرة البوت
    loadSystemHandlers();

    // الخطوة الثالثة: تسجيل الدخول إلى خوادم ديسكورد باستخدام التوكن السري
    console.log('\n[SYSTEM] Attempting to login to Discord Gateway...');
    
    // ⚠️ التعديل المطلوب: تم تغيير المتغيرة هنا لتكون TOKEN بدلاً من BOT_TOKEN
    const secretDiscordTokenString = process.env.TOKEN;
    
    if (!secretDiscordTokenString) {
        console.error('====================================================');
        console.error('[DISCORD CRITICAL ERROR] TOKEN is missing from your environment variables!');
        console.error('====================================================');
        process.exit(1);
    }

    try {
        await botClient.login(secretDiscordTokenString);
        
        console.log('====================================================');
        console.log(`[DISCORD] ✅ Successfully logged in and online as: ${botClient.user.tag}`);
        console.log('====================================================');
        console.log('🛡️ BOT IS FULLY OPERATIONAL AND READY FOR COMMANDS.');
        console.log('====================================================\n');
        
        // =================================================================================================
        // 🌐 6. استدعاء وتشغيل خادم لوحة التحكم (Trigger Dashboard Express Server)
        // =================================================================================================
        console.log('[SYSTEM] Triggering Dashboard Web Server Boot Sequence...');
        try {
            const dashboardServerModuleFunction = require('./dashboard/server.js');
            // تمرير البوت للداشبورد للاستفادة من الرومات والرتب في صفحات الـ HTML
            dashboardServerModuleFunction(botClient); 
        } catch (dashboardInitializationException) {
            console.error('[DASHBOARD ERROR] Failed to initialize the dashboard web server:', dashboardInitializationException);
        }

    } catch (discordLoginException) {
        console.error('====================================================');
        console.error('[DISCORD ERROR] ❌ Failed to login. Please verify your TOKEN is valid and intents are enabled.');
        console.error(discordLoginException);
        console.error('====================================================');
    }
};

// إعطاء إشارة البدء النهائية لجميع محركات النظام
startEnterpriseBotEngine();
