const mongoose = require('mongoose');

// 📝 تصميم أسئلة النوافذ (Modal)
const modalFieldSchema = new mongoose.Schema({
    label: { type: String, required: true }, 
    placeholder: { type: String, default: '' },
    required: { type: Boolean, default: true }
});

// 🔘 تصميم زرار التكت (لوحة تحكم كاملة لكل زرار)
const ticketButtonSchema = new mongoose.Schema({
    id: { type: String, required: true },
    label: { type: String, required: true },
    color: { type: String, default: 'Primary' },
    categoryId: { type: String, default: null }, 
    insideEmbedTitle: { type: String, default: 'مرحباً بك في التكت' },
    insideEmbedDesc: { type: String, default: 'يرجى وضع الدلائل أو وصف طلبك بدقة...' },
    insideEmbedColor: { type: String, default: '#2b2d31' },
    requireModal: { type: Boolean, default: false },
    modalTitle: { type: String, default: 'بيانات التكت' },
    modalFields: [modalFieldSchema], 
    isMediator: { type: Boolean, default: false } 
});

// 💬 تصميم الردود التلقائية
const autoResponderSchema = new mongoose.Schema({
    word: { type: String, required: true },
    reply: { type: String, required: true }
});

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    
    // ⚙️ الإعدادات العامة
    prefix: { type: String, default: '!' },
    antiLinks: { type: Boolean, default: false },
    antiSpam: { type: Boolean, default: false },
    autoRoleId: { type: String, default: null },
    
    // 🌟 المستويات والاقتراحات
    levelingEnabled: { type: Boolean, default: false },
    levelUpChannelId: { type: String, default: null },
    suggestionChannelId: { type: String, default: null },
    
    // 🖼️ نظام الترحيب المتطور (بالصور والمتغيرات)
    welcomeChannelId: { type: String, default: null }, 
    welcomeMessage: { type: String, default: 'مرحباً بك يا [user]! أنت العضو رقم [memberCount] في سيرفر [server].' },
    welcomeBgImage: { type: String, default: null }, 
    welcomeAvatarBorderColor: { type: String, default: '#ffffff' },
    
    // ⚠️ نظام التحذيرات
    warnLogChannelId: { type: String, default: null },
    warnMax: { type: Number, default: 3 },
    warnAction: { type: String, default: 'timeout' },
    
    // 🎟️ التكتات الأساسية (البانر)
    panelChannelId: { type: String, default: null }, 
    ticketEmbedTitle: { type: String, default: 'MNC COMMUNITY' },
    ticketEmbedDesc: { type: String, default: 'اضغط لفتح تذكرة' },
    ticketEmbedColor: { type: String, default: '#0099ff' },
    ticketEmbedImage: { type: String, default: null },
    ticketCount: { type: Number, default: 0 },
    maxTicketsPerUser: { type: Number, default: 1 }, 
    customButtons: [ticketButtonSchema], 
    
    autoResponders: [autoResponderSchema],

    // 👨‍⚖️ الرتب (4 مستويات)
    adminRoleId: { type: String, default: null }, 
    highAdminRoles: { type: [String], default: [] }, 
    mediatorRoleId: { type: String, default: null }, 
    highMediatorRoles: { type: [String], default: [] }, 
    
    // 🔥 التحكم في استلام التكت (Claim)
    hideTicketOnClaim: { type: Boolean, default: true },
    readOnlyStaffOnClaim: { type: Boolean, default: false },
    
    // ⌨️ الأوامر الشاملة
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
    
    // 📁 جميع اللوجات
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
