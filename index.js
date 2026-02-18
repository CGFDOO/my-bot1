const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// --- 🌐 الاتصال بقاعدة البيانات (MongoDB) ---
const mongoURL = process.env.MONGO_URL; // الرابط اللي حطيناه في ريلواي
mongoose.connect(mongoURL)
    .then(() => console.log('✅ Connected to MNC Database (MongoDB)'))
    .catch(err => console.error('❌ Database Connection Error:', err));

// --- 📁 نظام تحميل الموديلات (Auto-Loader) ---
const modules = fs.readdirSync('./').filter(file => file.endsWith('.js') && file !== 'index.js' && file !== 'package.json');

console.log('--- Loading MNC Modules ---');
modules.forEach(file => {
    try {
        require(`./${file}`)(client);
        console.log(`✅ Module Loaded: ${file}`);
    } catch (error) {
        console.error(`❌ Error Loading ${file}:`, error);
    }
});

client.once('ready', () => {
    console.log(`🔥 MNC System Online: Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);

// --- 💻 تشغيل سيرفر الداشبورد (قريباً) ---
// require('./dashboard/server.js')(client);
