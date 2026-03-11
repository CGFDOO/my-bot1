const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    
    // إجمالي المستوى والخبرة
    level: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    
    // تفصيل الخبرة (نصي وصوتي) زي برو بوت
    textXp: { type: Number, default: 0 },
    voiceXp: { type: Number, default: 0 },
    
    // أنظمة التوب (تتريست حسب الوقت)
    dailyXp: { type: Number, default: 0 },
    weeklyXp: { type: Number, default: 0 },
    monthlyXp: { type: Number, default: 0 },
    
    // لتفادي السبام (Cooldown)
    lastMessageTime: { type: Date, default: null }
});

module.exports = mongoose.model('Level', levelSchema);
