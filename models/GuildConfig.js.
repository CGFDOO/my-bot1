const mongoose = require('mongoose');

const GuildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    ticketCount: { type: Number, default: 360 }, // عشان يكمل من 360 للأبد
    ticketChannelId: String, // الروم اللي فيها زرار التكت
    staffRoleId: String,     // رتبة الإدارة اللي بتشوف التكتات
    adminRoleId: String,     // رتبة الأدمين
    prefix: { type: String, default: '!' }
});

module.exports = mongoose.model('GuildConfig', GuildConfigSchema);
