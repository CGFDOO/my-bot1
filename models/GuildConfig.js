const mongoose = require('mongoose');

// 🔘 تصميم زرار التكت والنوافذ (Modal)
const ticketButtonSchema = new mongoose.Schema({
    id: { type: String, required: true },
    label: { type: String, required: true },
    color: { type: String, default: 'Primary' },
    categoryId: { type: String, default: null },
    welcomeTitle: { type: String, default: 'مرحباً بك' },
    welcomeMessage: { type: String, default: 'يرجى كتابة طلبك...' },
    requireModal: { type: Boolean, default: false },
    modalQuestions: { type: [String], default: [] },
    isMediator: { type: Boolean, default: false }
});

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    
    // ⚙️ الإعدادات العامة والحماية
    prefix: { type: String, default: '!' }, // البريفكس المخصص
    antiLinks: { type: Boolean, default: false }, // منع الروابط
    antiSpam: { type: Boolean, default: false }, // منع التكرار
    autoRoleId: { type: String, default: null }, // رتبة الدخول التلقائية
    welcomeChannelId: { type: String, default: null }, // روم الترحيب
    welcomeMessage: { type: String, default: 'مرحباً بك في السيرفر!' },
    
    // 🎟️ التكتات الأساسية
    panelChannelId: { type: String, default: null },
    ticketEmbedTitle: { type: String, default: 'MNC COMMUNITY' },
    ticketEmbedDesc: { type: String, default: 'اضغط لفتح تذكرة' },
    ticketEmbedColor: { type: String, default: '#0099ff' },
    ticketEmbedImage: { type: String, default: null },
    ticketCount: { type: Number, default: 0 },
    customButtons: [ticketButtonSchema], 

    // 👨‍⚖️ الرتب (4 مستويات مفصولة)
    adminRoleId: { type: String, default: null }, // إدارة صغرى
    highAdminRoles: { type: [String], default: [] }, // إدارة عليا
    mediatorRoleId: { type: String, default: null }, // وساطة صغرى
    highMediatorRoles: { type: [String], default: [] }, // وساطة عليا
    
    // 🔥 التحكم في استلام التكت
    hideTicketOnClaim: { type: Boolean, default: true },
    readOnlyStaffOnClaim: { type: Boolean, default: false },
    
    // ⌨️ الأوامر المخصصة
    cmdDone: { type: String, default: 'done' },
    cmdReqHigh: { type: String, default: 'req-high' },
    cmdCome: { type: String, default: 'come' },
    cmdTrade: { type: String, default: 'trade' },
    cmdClear: { type: String, default: 'clear' },
    cmdLock: { type: String, default: 'lock' },
    cmdUnlock: { type: String, default: 'unlock' },
    cmdVmove: { type: String, default: 'vmove' },
    
    // 📁 اللوجات والتقييمات
    transcriptChannelId: { type: String, default: null }, 
    ticketLogChannelId: { type: String, default: null }, 
    staffRatingChannelId: { type: String, default: null }, 
    mediatorRatingChannelId: { type: String, default: null }, 
    
    // 🛡️ حماية ولوجات السيرفر (Audit Logs)
    logRoleCreateDeleteId: { type: String, default: null }, 
    logMemberRoleUpdateId: { type: String, default: null }, // مين عطى/سحب رتبة لمين
    logJoinLeaveId: { type: String, default: null }, 
    logMsgDeleteId: { type: String, default: null }, 
    logMsgUpdateId: { type: String, default: null }, // تعديل الرسائل
    logImgDeleteId: { type: String, default: null }, 
    logVoiceId: { type: String, default: null } 
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
