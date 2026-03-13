require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

console.clear();
console.log(`\n====================================================`);
console.log(`🚀 جاري تشغيل إمبراطورية البوت...`);
console.log(`====================================================\n`);

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

if (!process.env.MONGO_URI) {
    console.log(`🔴 [DATABASE ERROR] MONGO_URI مفقود!`);
} else {
    mongoose.connect(process.env.MONGO_URI).then(() => {
        console.log(`🟢 [DATABASE] تم الاتصال بقاعدة بيانات MongoDB بنجاح!`);
    }).catch((err) => console.log(`🔴 [DATABASE] فشل الاتصال:`, err));
}

// تحميل الأوامر
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
    console.log(`✅ [COMMANDS] الأوامر جاهزة.`);
}

// تحميل الأحداث
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
    console.log(`✅ [EVENTS] الأحداث جاهزة.`);
}

// تشغيل الداشبورد
try {
    const dashboardPath = path.join(__dirname, 'dashboard', 'server.js');
    if (fs.existsSync(dashboardPath)) {
        require(dashboardPath)(client); 
    }
} catch (error) {
    console.error(`🔴 [WEB DASHBOARD ERROR] خطأ:`, error);
}

process.on('unhandledRejection', (reason) => console.log('🔴 [ANTI-CRASH] Unhandled Rejection:', reason));
process.on('uncaughtException', (err) => console.log('🔴 [ANTI-CRASH] Uncaught Exception:', err));

// تشغيل ملف الضريبة
require('./tax.js')(client);

require('./roulette.js')(client);

if (process.env.TOKEN) {
    client.login(process.env.TOKEN).then(() => console.log(`🚀 [SYSTEM ONLINE] البوت متصل بالديسكورد!`));
}
