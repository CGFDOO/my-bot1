const mongoose = require('mongoose');

// 📝 أسئلة نوافذ التكت
const modalFieldSchema = new mongoose.Schema({
    label: { type: String, required: true }, 
    placeholder: { type: String, default: '' },
    required: { type: Boolean, default: true }
});

// 🔘 زراير التكت (كل زرار له كاتيجوري وإيمبد ونافذة)
const ticketButtonSchema = new mongoose.Schema({
    id: { type: String, required: true },
    label: { type: String, required: true },
    color: { type: String, default: 'Primary' },
    categoryId: { type: String, default: null }, // القسم الخاص بالزرار ده
    insideEmbedTitle: { type: String, default: 'مرحباً بك' },
    insideEmbedDesc: { type: String, default: 'يرجى وضع الدلائل هنا...' },
    insideEmbedColor: { type: String, default: '#2b2d31' },
    requireModal: { type: Boolean, default: false },
    modalTitle: { type: String, default: 'بيانات التكت' },
    modalFields: [modalFieldSchema], 
    isMediator: { type: Boolean, default: false } 
});

const autoResponderSchema = new mongoose.Schema({
    word: { type: String, required: true },
    reply: { type: String, required: true }
});

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    
    // ⚙️ الإعدادات العامة (البريفكس ثابت يبدأ بـ ! افتراضياً)
    prefix: { type: String, default: '!' },
    antiLinks: { type: Boolean, default: false },
    antiSpam: { type: Boolean, default: false },
    autoRoleId: { type: String, default: null },
    
    // 🎮 نظام الألعاب (Games System)
    gamesEnabled: { type: Boolean, default: false },
    gamesChannelId: { type: String, default: null },
    
    // 🌟 المستويات والاقتراحات
    levelingEnabled: { type: Boolean, default: false },
    levelUpChannelId: { type: String, default: null },
    suggestionChannelId: { type: String, default: null },
    
    // 🖼️ نظام الترحيب المتطور (بالصور المتغيرة)
    welcomeChannelId: { type: String, default: null }, 
    welcomeMessage: { type: String, default: 'حياك الله يا [user] في [server]! أنت العضو رقم [memberCount].' },
    welcomeBgImage: { type: String, default: null }, 
    welcomeAvatarBorderColor: { type: String, default: '#ffffff' },
    
    // ⚠️ نظام التحذيرات المتطور (Warn Panel)
    warnPanelChannelId: { type: String, default: null }, // روم لوحة التحذيرات (الزراير)
    warnLogChannelId: { type: String, default: null }, // روم سجل التحذيرات
    warnPanelTitle: { type: String, default: 'لوحة تحكم التحذيرات' },
    warnPanelDesc: { type: String, default: 'استخدم الأزرار أدناه لإدارة تحذيرات الأعضاء.' },
    warnPanelColor: { type: String, default: '#ed4245' },
    warnMax: { type: Number, default: 3 },
    warnAction: { type: String, default: 'timeout' },
    warnReasons: { type: [String], default: ['مخالفة القوانين', 'ألفاظ خارجة', 'سرقة زبائن'] }, // الأسباب الجاهزة
    
    // 🎟️ التكتات الأساسية
    panelChannelId: { type: String, default: null }, 
    defaultCategoryId: { type: String, default: null }, // كاتيجوري احتياطي عام
    ticketEmbedTitle: { type: String, default: 'MNC COMMUNITY' },
    ticketEmbedDesc: { type: String, default: 'اضغط لفتح تذكرة.' },
    ticketEmbedColor: { type: String, default: '#0099ff' },
    ticketEmbedImage: { type: String, default: null },
    ticketCount: { type: Number, default: 0 },
    maxTicketsPerUser: { type: Number, default: 1 }, 
    customButtons: [ticketButtonSchema], 
    
    autoResponders: [autoResponderSchema],

    // 👨‍⚖️ الرتب مفصولة
    adminRoleId: { type: String, default: null }, 
    highAdminRoles: { type: [String], default: [] }, 
    mediatorRoleId: { type: String, default: null }, 
    highMediatorRoles: { type: [String], default: [] }, 
    
    hideTicketOnClaim: { type: Boolean, default: true },
    readOnlyStaffOnClaim: { type: Boolean, default: false },
    
    // ⌨️ الأوامر
    cmdDone: { type: String, default: '!done' },
    cmdReqHigh: { type: String, default: '!req-high' },
    cmdCome: { type: String, default: '!come' },
    cmdTrade: { type: String, default: '!trade' },
    cmdClear: { type: String, default: '!clear' },
    cmdLock: { type: String, default: '!lock' },
    cmdUnlock: { type: String, default: '!unlock' },
    cmdVmove: { type: String, default: '!vmove' },
    cmdBan: { type: String, default: '!ban' },
    cmdTimeout: { type: String, default: '!timeout' },
    
    // 📁 اللوجات كاملة
    transcriptChannelId: { type: String, default: null }, 
    ticketLogChannelId: { type: String, default: null }, 
    staffRatingChannelId: { type: String, default: null }, 
    mediatorRatingChannelId: { type: String, default: null }, 
    logRoleCreateDeleteId: { type: String, default: null }, 
    logMemberRoleUpdateId: { type: String, default: null }, 
    logJoinLeaveId: { type: String, default: null }, 
    logMsgDeleteId: { type: String, default: null }, 
    logMsgUpdateId: { type: String, default: null }, 
    logImgDeleteId: { type: String, default: null }, 
    logVoiceId: { type: String, default: null } 
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
