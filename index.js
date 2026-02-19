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
    console.log(`🚀 ${client.user.username} is Online & Ready!`);
    
    // 2. مناداة ملف التكتات (المساعد الأول)
    try {
        require('./ticketsystem.js')(client);
        console.log('✅ Ticket System Loaded');
    } catch (e) {
        console.error('❌ Error loading ticketsystem.js:', e.message);
    }

    // 3. مناداة ملف الأوامر والردود التلقائية (المساعد الثاني - الملف التالت اللي سألت عليه)
    try {
        require('./commandsHandler.js')(client);
        console.log('✅ Commands Handler Loaded');
    } catch (e) {
        console.error('❌ Error loading commandsHandler.js:', e.message);
    }

    // 4. مناداة ملف الداشبورد (المساعد الثالث)
    try {
        require('./dashboard/server.js')(client);
        console.log('✅ Dashboard Server Loaded');
    } catch (e) {
        console.error('❌ Error loading dashboard server:', e.message);
    }
});

client.login(process.env.TOKEN);
