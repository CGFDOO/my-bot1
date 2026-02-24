require('dotenv').config(); // جلب المتغيرات السرية (التوكن والداتابيز)
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// ==========================================
// 1. إعدادات البوت الأساسية (الصلاحيات)
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // مهم جداً عشان البوت يقرأ رسائل الأعضاء (كلمة "خط" وغيرها)
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User],
});

// إنشاء كوليكشن لحفظ الأوامر في الذاكرة
client.commands = new Collection();
client.aliases = new Collection();

// ==========================================
// 2. الاتصال بقاعدة البيانات (MongoDB) 🗄️
// ==========================================
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('🟢 [DATABASE] تم الاتصال بقاعدة بيانات MongoDB بنجاح! الإمبراطورية جاهزة.');
}).catch((err) => {
    console.log('🔴 [DATABASE] فشل الاتصال بقاعدة البيانات:', err);
});

// ==========================================
// 3. نظام التشغيل التلقائي للأوامر (Command Handler) ⌨️
// ==========================================
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    // يقرأ كل الملفات والمجلدات اللي جوه مجلد commands
    const commandFilesOrFolders = fs.readdirSync(commandsPath);
    
    for (const item of commandFilesOrFolders) {
        const itemPath = path.join(commandsPath, item);
        
        // لو كان مجلد (عشان لو مقسم الأوامر: admin, general, الخ)
        if (fs.statSync(itemPath).isDirectory()) {
            const commandFiles = fs.readdirSync(itemPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const command = require(path.join(itemPath, file));
                if (command.name) {
                    client.commands.set(command.name, command);
                    if (command.aliases && Array.isArray(command.aliases)) {
                        command.aliases.forEach(alias => client.aliases.set(alias, command.name));
                    }
                }
            }
        } 
        // لو كان ملف .js مباشر
        else if (item.endsWith('.js')) {
            const command = require(itemPath);
            if (command.name) {
                client.commands.set(command.name, command);
                if (command.aliases && Array.isArray(command.aliases)) {
                    command.aliases.forEach(alias => client.aliases.set(alias, command.name));
                }
            }
        }
    }
    console.log(`✅ [COMMANDS] تم تحميل جميع الأوامر بنجاح.`);
}

// ==========================================
// 4. نظام التشغيل التلقائي للأحداث (Event Handler) 📡
// ==========================================
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);
        
        // ربط الإيفينت بالبوت تلقائياً (زي messageCreate, ready, interactionCreate)
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
    console.log(`✅ [EVENTS] تم تحميل جميع الأحداث (Events) بنجاح.`);
}

// ==========================================
// 5. ربط الداشبورد بالبوت (Express & EJS) 🌐
// ==========================================
// ⚠️ عشان ملف index.ejs بتاعك يشتغل، لازم نستدعي ملف السيرفر هنا
try {
    // افتراض أن كود الداشبورد بتاعك موجود في ملف اسمه server.js أو dashboard.js
    // وبياخد الـ client كمتغير عشان يقدر يقرأ الرومات والرتب في الداشبورد
    const dashboard = require('./server.js'); // لو ملفك اسمه مختلف، غير 'server.js' للاسم الصح
    dashboard(client);
    console.log(`✅ [DASHBOARD] تم تشغيل الداشبورد وربطها بالبوت.`);
} catch (error) {
    console.log(`⚠️ [DASHBOARD] لم يتم العثور على ملف السيرفر (server.js) أو حدث خطأ في تشغيله.`);
    console.error(error);
}

// ==========================================
// 6. نظام الحماية من انهيار البوت (Anti-Crash) 🛡️
// ==========================================
process.on('unhandledRejection', (reason, p) => {
    console.log(' [ANTI-CRASH] 🔴 خطأ غير معالج (Unhandled Rejection):');
    console.log(reason);
});
process.on('uncaughtException', (err, origin) => {
    console.log(' [ANTI-CRASH] 🔴 خطأ غير متوقع (Uncaught Exception):');
    console.log(err);
});
process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.log(' [ANTI-CRASH] 🔴 خطأ مراقب (Uncaught Exception Monitor):');
    console.log(err);
});

// ==========================================
// 7. تسجيل الدخول (Login) 🔑
// ==========================================
client.login(process.env.TOKEN).then(() => {
    console.log(`🚀 [SYSTEM] البوت متصل الآن بالديسكورد!`);
}).catch((err) => {
    console.log(`❌ [SYSTEM] فشل تسجيل الدخول، تأكد من التوكن!`);
});
