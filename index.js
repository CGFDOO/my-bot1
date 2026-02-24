// =========================================================================
// 🌟 الأساسيات والمكاتب (Dependencies)
// =========================================================================
require('dotenv').config(); // جلب المتغيرات السرية
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

console.clear();
console.log(`\n====================================================`);
console.log(`🚀 جاري تشغيل إمبراطورية البوت... يرجى الانتظار`);
console.log(`====================================================\n`);

// =========================================================================
// 🤖 إعدادات الكلاينت (Client Setup)
// =========================================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User],
});

client.commands = new Collection();
client.aliases = new Collection();

// =========================================================================
// 🗄️ الاتصال بقاعدة البيانات (MongoDB)
// =========================================================================
if (!process.env.MONGO_URI) {
    console.log(`🔴 [DATABASE ERROR] لم يتم العثور على رابط MONGO_URI!`);
} else {
    mongoose.connect(process.env.MONGO_URI).then(() => {
        console.log(`🟢 [DATABASE] تم الاتصال بقاعدة بيانات MongoDB بنجاح!`);
    }).catch((err) => {
        console.log(`🔴 [DATABASE] فشل الاتصال بقاعدة البيانات:`, err);
    });
}

// =========================================================================
// 📂 نظام التشغيل التلقائي للأوامر (Command Handler)
// =========================================================================
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
    const commandFilesOrFolders = fs.readdirSync(commandsPath);
    for (const item of commandFilesOrFolders) {
        const itemPath = path.join(commandsPath, item);
        if (fs.statSync(itemPath).isDirectory()) {
            const commandFiles = fs.readdirSync(itemPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const command = require(path.join(itemPath, file));
                if (command.name) {
                    client.commands.set(command.name, command);
                    if (command.aliases) command.aliases.forEach(a => client.aliases.set(a, command.name));
                }
            }
        } else if (item.endsWith('.js')) {
            const command = require(itemPath);
            if (command.name) {
                client.commands.set(command.name, command);
                if (command.aliases) command.aliases.forEach(a => client.aliases.set(a, command.name));
            }
        }
    }
    console.log(`✅ [COMMANDS] تم تحميل الأوامر بنجاح.`);
}

// =========================================================================
// 📡 نظام التشغيل التلقائي للأحداث (Event Handler)
// =========================================================================
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        if (event.name) {
            if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
            else client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
    console.log(`✅ [EVENTS] تم تحميل الأحداث بنجاح.`);
}

// =========================================================================
// 🌐 ربط الداشبورد بالبوت (Dashboard Integration)
// =========================================================================
try {
    const dashboardPath = path.join(__dirname, 'dashboard', 'server.js');
    if (fs.existsSync(dashboardPath)) {
        const dashboard = require(dashboardPath); 
        dashboard(client); // إرسال الكلاينت للداشبورد
        console.log(`✅ [WEB DASHBOARD] تم العثور على ملف الداشبورد وجاري تشغيله...`);
    } else {
        console.log(`🔴 [WEB DASHBOARD] لم يتم العثور على ملف: ./dashboard/server.js`);
    }
} catch (error) {
    console.log(`🔴 [WEB DASHBOARD ERROR] حدث خطأ أثناء محاولة تشغيل الداشبورد!`);
    console.error(error);
}

// =========================================================================
// 🛡️ نظام الحماية (Anti-Crash System)
// =========================================================================
process.on('unhandledRejection', (reason) => console.log('🔴 [ANTI-CRASH] Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => console.log('🔴 [ANTI-CRASH] Uncaught Exception:', err));

// =========================================================================
// 🔑 تسجيل الدخول
// =========================================================================
if (process.env.TOKEN) {
    client.login(process.env.TOKEN).then(() => {
        console.log(`🚀 [SYSTEM ONLINE] البوت متصل الآن!`);
    }).catch(err => console.log(`🔴 [SYSTEM ERROR] توكن البوت غير صحيح!`));
}
