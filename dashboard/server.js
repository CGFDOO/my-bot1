// =========================================================================
// 🌟 الأساسيات والمكاتب (Dependencies)
// =========================================================================
require('dotenv').config(); // جلب المتغيرات السرية (التوكن وقاعدة البيانات)
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

console.clear();
console.log(`\n====================================================`);
console.log(`🚀 جاري تشغيل إمبراطورية البوت... يرجى الانتظار`);
console.log(`====================================================\n`);

// =========================================================================
// 🤖 إعدادات الكلاينت (Client Setup & Intents)
// =========================================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // مهم جداً عشان البوت يقرأ رسائل الأعضاء (كلمة "خط" وغيرها)
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [
        Partials.Message, 
        Partials.Channel, 
        Partials.GuildMember, 
        Partials.User, 
        Partials.Reaction
    ],
});

// إنشاء كوليكشن لحفظ الأوامر في الذاكرة
client.commands = new Collection();
client.aliases = new Collection();

// =========================================================================
// 🗄️ الاتصال بقاعدة البيانات (MongoDB Connection)
// =========================================================================
if (!process.env.MONGO_URI) {
    console.log(`🔴 [DATABASE ERROR] لم يتم العثور على رابط MONGO_URI في المتغيرات!`);
} else {
    mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }).then(() => {
        console.log(`🟢 [DATABASE] تم الاتصال بقاعدة بيانات MongoDB بنجاح!`);
    }).catch((err) => {
        console.log(`🔴 [DATABASE] فشل الاتصال بقاعدة البيانات:`);
        console.error(err);
    });

    // مراقبة حالة قاعدة البيانات
    mongoose.connection.on('disconnected', () => {
        console.log(`⚠️ [DATABASE] انقطع الاتصال بقاعدة البيانات!`);
    });
    mongoose.connection.on('reconnected', () => {
        console.log(`🟢 [DATABASE] تم إعادة الاتصال بقاعدة البيانات!`);
    });
}

// =========================================================================
// 📂 نظام الهاندلر الإضافي (Extra Handlers System)
// =========================================================================
const handlersPath = path.join(__dirname, 'handlers');
if (fs.existsSync(handlersPath)) {
    const handlerFiles = fs.readdirSync(handlersPath).filter(file => file.endsWith('.js'));
    for (const file of handlerFiles) {
        try {
            require(path.join(handlersPath, file))(client);
        } catch (error) {
            console.log(`🔴 [HANDLER ERROR] فشل تحميل الهاندلر: ${file}`);
            console.error(error);
        }
    }
    console.log(`✅ [HANDLERS] تم تحميل أنظمة الهاندلر الإضافية.`);
}

// =========================================================================
// ⌨️ نظام التشغيل التلقائي للأوامر (Command Handler)
// =========================================================================
const commandsPath = path.join(__dirname, 'commands');
let cmdCount = 0;

if (fs.existsSync(commandsPath)) {
    const commandFilesOrFolders = fs.readdirSync(commandsPath);
    
    for (const item of commandFilesOrFolders) {
        const itemPath = path.join(commandsPath, item);
        
        // لو كان مجلد (عشان لو مقسم الأوامر: admin, general, الخ)
        if (fs.statSync(itemPath).isDirectory()) {
            const commandFiles = fs.readdirSync(itemPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                try {
                    const command = require(path.join(itemPath, file));
                    if (command.name) {
                        client.commands.set(command.name, command);
                        cmdCount++;
                        if (command.aliases && Array.isArray(command.aliases)) {
                            command.aliases.forEach(alias => client.aliases.set(alias, command.name));
                        }
                    }
                } catch (err) {
                    console.log(`🔴 [COMMAND ERROR] فشل تحميل الأمر: ${file}`);
                }
            }
        } 
        // لو كان ملف .js مباشر
        else if (item.endsWith('.js')) {
            try {
                const command = require(itemPath);
                if (command.name) {
                    client.commands.set(command.name, command);
                    cmdCount++;
                    if (command.aliases && Array.isArray(command.aliases)) {
                        command.aliases.forEach(alias => client.aliases.set(alias, command.name));
                    }
                }
            } catch (err) {
                console.log(`🔴 [COMMAND ERROR] فشل تحميل الأمر: ${item}`);
            }
        }
    }
    console.log(`✅ [COMMANDS] تم تحميل ${cmdCount} أمر بنجاح.`);
} else {
    console.log(`⚠️ [COMMANDS] لم يتم العثور على مجلد commands!`);
}

// =========================================================================
// 📡 نظام التشغيل التلقائي للأحداث (Event Handler)
// =========================================================================
const eventsPath = path.join(__dirname, 'events');
let eventCount = 0;

if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        try {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath);
            
            if (event.name) {
                if (event.once) {
                    client.once(event.name, (...args) => event.execute(...args, client));
                } else {
                    client.on(event.name, (...args) => event.execute(...args, client));
                }
                eventCount++;
            }
        } catch (err) {
            console.log(`🔴 [EVENT ERROR] فشل تحميل الحدث: ${file}`);
        }
    }
    console.log(`✅ [EVENTS] تم تحميل ${eventCount} حدث (Events) بنجاح.`);
} else {
    console.log(`⚠️ [EVENTS] لم يتم العثور على مجلد events!`);
}

// =========================================================================
// 🌐 ربط الداشبورد بالبوت (Dashboard Integration)
// =========================================================================
try {
    // ⚠️ السطر ده هو اللي كان عامل الشاشة السودة! دلوقتي اتعدل للمسار الصح بناءً على صورتك ⚠️
    const dashboardPath = path.join(__dirname, 'dashboard', 'server.js');
    
    if (fs.existsSync(dashboardPath)) {
        const dashboard = require(dashboardPath); 
        // تشغيل الداشبورد وتمرير الكلاينت ليها عشان تقرأ الرومات
        dashboard(client);
        console.log(`✅ [WEB DASHBOARD] تم العثور على ملف الداشبورد وجاري تشغيله...`);
    } else {
        console.log(`🔴 [WEB DASHBOARD] لم يتم العثور على ملف: ./dashboard/server.js`);
    }
} catch (error) {
    console.log(`🔴 [WEB DASHBOARD ERROR] حدث خطأ أثناء محاولة تشغيل الداشبورد!`);
    console.error(error);
}

// =========================================================================
// 🛡️ نظام الحماية من انهيار البوت (Anti-Crash System)
// =========================================================================
process.on('unhandledRejection', (reason, p) => {
    console.log('\n[ANTI-CRASH] 🔴 خطأ غير معالج (Unhandled Rejection):');
    console.log(reason);
});

process.on('uncaughtException', (err, origin) => {
    console.log('\n[ANTI-CRASH] 🔴 خطأ غير متوقع (Uncaught Exception):');
    console.log(err);
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.log('\n[ANTI-CRASH] 🔴 خطأ مراقب (Uncaught Exception Monitor):');
    console.log(err);
});

// =========================================================================
// 🔑 تسجيل الدخول (Discord Login)
// =========================================================================
if (!process.env.TOKEN) {
    console.log(`🔴 [SYSTEM ERROR] لم يتم العثور على توكن البوت (TOKEN) في المتغيرات!`);
} else {
    client.login(process.env.TOKEN).then(() => {
        console.log(`\n====================================================`);
        console.log(`🚀 [SYSTEM ONLINE] البوت ${client.user.tag} متصل الآن بالديسكورد!`);
        console.log(`====================================================\n`);
    }).catch((err) => {
        console.log(`🔴 [SYSTEM ERROR] فشل تسجيل الدخول، تأكد من صحة التوكن الخاص بالبوت!`);
        console.error(err);
    });
}
