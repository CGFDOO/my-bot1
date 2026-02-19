const mongoose = require('mongoose');

// 📝 أسئلة النوافذ (Modal)
const modalFieldSchema = new mongoose.Schema({
    label: { type: String, required: true },
    placeholder: { type: String, default: '' },
    required: { type: Boolean, default: true }
});

// 🔘 زراير التكت (كل زرار له إيمبد داخلي ونافذة)
const ticketButtonSchema = new mongoose.Schema({
    id: { type: String, required: true },
    label: { type: String, required: true },
    color: { type: String, default: 'Primary' },
    categoryId: { type: String, default: null }, 
    insideEmbedTitle: { type: String, default: 'حياك الله في التكت' },
    insideEmbedDesc: { type: String, default: 'يرجى وضع طلبك والدلائل...' },
    insideEmbedColor: { type: String, default: '#2b2d31' },
    requireModal: { type: Boolean, default: false },
    modalTitle: { type: String, default: 'بيانات التكت' },
    modalFields: [modalFieldSchema],
    isMediator: { type: Boolean, default: false } 
});

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    
    // ⚙️ الإعدادات العامة والحماية
    prefix: { type: String, default: '!' },
    antiLinks: { type: Boolean, default: false },
    antiSpam: { type: Boolean, default: false },
    autoRoleId: { type: String, default: null },
    
    // 🎮 الألعاب والمستويات
    gamesEnabled: { type: Boolean, default: false },
    gamesChannelId: { type: String, default: null },
    levelingEnabled: { type: Boolean, default: false },
    levelUpChannelId: { type: String, default: null },
    suggestionChannelId: { type: String, default: null },
    
    // 🖼️ نظام الترحيب المتطور (بالصور المتغيرة)
    welcomeChannelId: { type: String, default: null }, 
    welcomeMessage: { type: String, default: 'حياك الله يا [user] في [server]! أنت العضو رقم [memberCount].' },
    welcomeBgImage: { type: String, default: null }, 
    welcomeAvatarBorderColor: { type: String, default: '#ffffff' },
    
    // ⚠️ نظام التحذيرات بالزراير
    warnPanelChannelId: { type: String, default: null },
    warnLogChannelId: { type: String, default: null },
    warnPanelTitle: { type: String, default: 'لوحة تحكم التحذيرات' },
    warnPanelDesc: { type: String, default: 'استخدم الأزرار أدناه لإدارة تحذيرات الأعضاء.' },
    warnPanelColor: { type: String, default: '#ed4245' },
    warnMax: { type: Number, default: 3 },
    warnAction: { type: String, default: 'timeout' },
    warnReasons: { type: [String], default: ['مخالفة القوانين', 'ألفاظ خارجة', 'إزعاج الإدارة'] },
    
    // 🎟️ التكتات (البانر الخارجي والإعدادات)
    panelChannelId: { type: String, default: null }, 
    defaultCategoryId: { type: String, default: null }, 
    ticketEmbedTitle: { type: String, default: 'قوانين التكتات لتجنب أي عقوبات' },
    ticketEmbedDesc: { type: String, default: 'عند فتح تذكرة وعدم كتابة استفسارك سيتم حذفها...' },
    ticketEmbedColor: { type: String, default: '#0099ff' },
    ticketEmbedImage: { type: String, default: null },
    ticketCount: { type: Number, default: 0 },
    maxTicketsPerUser: { type: Number, default: 1 }, 
    customButtons: [ticketButtonSchema], 
    
    // 👨‍⚖️ الرتب (4 مستويات)
    adminRoleId: { type: String, default: null }, 
    highAdminRoles: { type: [String], default: [] }, 
    mediatorRoleId: { type: String, default: null }, 
    highMediatorRoles: { type: [String], default: [] }, 
    hideTicketOnClaim: { type: Boolean, default: true },
    readOnlyStaffOnClaim: { type: Boolean, default: false },
    
    // ⌨️ الأوامر والرتب المسموحة لها (تفصيل ممل)
    cmdAdd: { type: String, default: '!add' }, cmdAddRoles: { type: [String], default: [] },
    cmdDone: { type: String, default: '!done' }, cmdDoneRoles: { type: [String], default: [] },
    cmdReqHigh: { type: String, default: '!req-high' }, cmdReqHighRoles: { type: [String], default: [] },
    cmdCome: { type: String, default: '!come' }, cmdComeRoles: { type: [String], default: [] },
    cmdTrade: { type: String, default: '!trade' }, cmdTradeRoles: { type: [String], default: [] },
    cmdClear: { type: String, default: '!clear' }, cmdClearRoles: { type: [String], default: [] },
    cmdLock: { type: String, default: '!lock' }, cmdLockRoles: { type: [String], default: [] },
    cmdUnlock: { type: String, default: '!unlock' }, cmdUnlockRoles: { type: [String], default: [] },
    cmdVmove: { type: String, default: '!vmove' }, cmdVmoveRoles: { type: [String], default: [] },
    cmdBan: { type: String, default: '!ban' }, cmdBanRoles: { type: [String], default: [] },
    cmdTimeout: { type: String, default: '!timeout' }, cmdTimeoutRoles: { type: [String], default: [] },
    
    // 📁 اللوجات الشاملة
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
    logVoiceId: { type: String, default: null },
    logInviteId: { type: String, default: null }, 
    logChannelThreadId: { type: String, default: null }, 
    logBanId: { type: String, default: null }, 
    logTimeoutId: { type: String, default: null },
    logUnwarnId: { type: String, default: null } 
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
