const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
require('dotenv').config();

// 1. إعداد العميل (Client Setup)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// 2. نظام التشغيل التلقائي (Auto-Loader)
// الكود ده بيلف على كل الملفات اللي بتنتهي بـ .js (ماعدا ملف الاندكس والباكج) وبيشغلها
const files = fs.readdirSync('./').filter(file => 
    file.endsWith('.js') && 
    file !== 'index.js' && 
    file !== 'package.json'
);

console.log('--- Loading Modules ---');
files.forEach(file => {
    try {
        require(`./${file}`)(client);
        console.log(`✅ Loaded: ${file}`);
    } catch (err) {
        console.error(`❌ Error loading ${file}:`, err);
    }
});
console.log('-----------------------');

// 3. تسجيل الدخول
client.once('ready', () => {
    console.log(`🔥 Logged in as ${client.user.tag}!`);
    console.log(`🤖 MNC SYSTEM ONLINE`);
});

client.login(process.env.TOKEN);
