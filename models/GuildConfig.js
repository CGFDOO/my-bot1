const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    
    // 🎟️ إعدادات التكتات الأساسية
    ticketCount: { type: Number, default: 0 },
    categoryId: { type: String, default: null },
    ticketEmbedTitle: { type: String, default: 'الدعم الفني والوساطة' },
    ticketEmbedDesc: { type: String, default: 'اضغط على الزر لفتح تذكرة جديدة.' },
    ticketEmbedColor: { type: String, default: '#0099ff' },
    ticketEmbedImage: { type: String, default: null },
    
    // 👨‍⚖️ نظام الإدارة والوساطة
    staffRoleId: { type: String, default: null },
    adminRoles: { type: [String], default: [] }, // مصفوفة عشان يختار أكتر من رتبة عليا للمنشن
    
    // ⌨️ الأوامر المخصصة
    cmdDone: { type: String, default: '!done' },
    cmdCome: { type: String, default: '!come' },
    cmdApprove: { type: String, default: '!approve' },
    
    // 📁 سجلات التكتات والتقييمات
    transcriptChannelId: { type: String, default: null },
    ticketLogChannelId: { type: String, default: null }, // لوج التكتات مفصول
    staffRatingChannelId: { type: String, default: null }, // تقييم الإدارة
    mediatorRatingChannelId: { type: String, default: null }, // تقييم الوسطاء
    
    // 🛡️ حماية ولوجات السيرفر (Audit Logs)
    logRoleCreateId: { type: String, default: null },
    logJoinLeaveId: { type: String, default: null },
    logMsgDeleteId: { type: String, default: null },
    logImgDeleteId: { type: String, default: null },
    logVoiceId: { type: String, default: null } // بيشمل الدخول/الخروج/النقل/الديسكونكت
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
