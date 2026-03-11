const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    userId: { type: String, required: true },
    
    level: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    
    textXp: { type: Number, default: 0 },
    voiceXp: { type: Number, default: 0 },
    
    dailyXp: { type: Number, default: 0 },
    weeklyXp: { type: Number, default: 0 },
    monthlyXp: { type: Number, default: 0 },
    
    lastMessageTime: { type: Date, default: null }
});

module.exports = mongoose.model('Level', levelSchema);
