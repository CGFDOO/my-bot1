const { Client, GatewayIntentBits, Partials } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User],
});

// 1. الاتصال بقاعدة البيانات
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to Database!'))
  .catch((err) => console.error('❌ Database Connection Error:', err));

client.once('ready', () => {
    // اللوج ده ديناميكي هيجيب اسم البوت بتاعك أياً كان
    console.log(`🚀 ${client.user.username} is Online & Ready!`);
    
    // تشغيل نظام التكتات
    try {
        require('./ticketsystem.js')(client);
    } catch (e) {
        console.error('❌ Error loading ticketsystem.js:', e.message);
    }

    // ✅ تشغيل الداشبورد (تم تفعيلها الآن)
    try {
        require('./dashboard/server.js')(client);
    } catch (e) {
        console.error('❌ Error loading dashboard server:', e.message);
    }
});

client.login(process.env.TOKEN);
