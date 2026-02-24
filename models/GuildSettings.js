const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true }
}, { 
    strict: false // ⬅️ السطر ده سحري! بيخلي الداتابيز تقبل أي إعدادات جديدة من الداشبورد تلقائياً
});

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);
