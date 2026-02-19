const mongoose = require('mongoose');

const configSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true }, // أيدي السيرفر
    ticketChannelId: { type: String, default: null },        // كاتيجوري التكتات
    logsChannelId: { type: String, default: null },          // روم اللوجات
    transcriptChannelId: { type: String, default: null },    // روم الترانسكريبت
    staffRoleId: { type: String, default: null },            // رتبة الدعم
    adminRoleId: { type: String, default: null },            // رتبة الإدارة العليا
    ticketCount: { type: Number, default: 0 },               // عداد التكتات
    middlemanRatings: { type: Number, default: 0 },          // تقييمات الوسطاء
    serverRatings: { type: Number, default: 0 }              // تقييمات السيرفر
});

module.exports = mongoose.model('GuildConfig', configSchema);
