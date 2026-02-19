const mongoose = require('mongoose');

// =====================================================================
// 📝 تصميم أسئلة النوافذ (Modal) داخل التكت
// =====================================================================
const modalFieldSchema = new mongoose.Schema({
    label: { 
        type: String, 
        required: true 
    }, 
    placeholder: { 
        type: String, 
        default: '' 
    },
    required: { 
        type: Boolean, 
        default: true 
    }
});

// =====================================================================
// 🔘 تصميم زراير التكت (كل زرار له إعداداته الخاصة جداً)
// =====================================================================
const ticketButtonSchema = new mongoose.Schema({
    id: { 
        type: String, 
        required: true 
    },
    label: { 
        type: String, 
        required: true 
    },
    color: { 
        type: String, 
        default: 'Primary' 
    },
    categoryId: { 
        type: String, 
        default: null 
    }, 
    insideEmbedTitle: { 
        type: String, 
        default: 'Ticket Info' 
    },
    insideEmbedDesc: { 
        type: String, 
        default: 'Please write your request clearly.' 
    },
    insideEmbedColor: { 
        type: String, 
        default: '#2b2d31' 
    },
    requireModal: { 
        type: Boolean, 
        default: false 
    },
    modalTitle: { 
        type: String, 
        default: 'Ticket Details' 
    },
    modalFields: [modalFieldSchema], 
    isMediator: { 
        type: Boolean, 
        default: false 
    },
    enableRating: { 
        type: Boolean, 
        default: true 
    },
    // 🔥 تحديد من يمكنه استلام هذا التكت تحديداً (اختياري)
    allowedClaimRoles: {
        type: [String],
        default: []
    }
});

// =====================================================================
// 💬 تصميم الردود التلقائية
// =====================================================================
const autoResponderSchema = new mongoose.Schema({
    word: { 
        type: String, 
        required: true 
    },
    reply: { 
        type: String, 
        required: true 
    }
});

// =====================================================================
// 👑 المخزن الرئيسي للسيرفر (Guild Config)
// =====================================================================
const guildConfigSchema = new mongoose.Schema({
    guildId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    
    // ⚙️ الإعدادات العامة والحماية
    prefix: { type: String, default: '!' },
    antiLinks: { type: Boolean, default: false },
    antiSpam: { type: Boolean, default: false },
    autoRoleId: { type: String, default: null },
    
    // 🎮 الألعاب والاقتراحات
    gamesEnabled: { type: Boolean, default: false },
    gamesChannelId: { type: String, default: null },
    levelingEnabled: { type: Boolean, default: false },
    levelUpChannelId: { type: String, default: null },
    suggestionChannelId: { type: String, default: null },
    
    // 🖼️ الترحيب بالصور
    welcomeChannelId: { type: String, default: null }, 
    welcomeMessage: { type: String, default: 'Welcome [user] to [server]! You are member #[memberCount].' },
    welcomeBgImage: { type: String, default: null }, 
    welcomeAvatarBorderColor: { type: String, default: '#ffffff' },
    
    // ⚠️ نظام التحذيرات (Warn Panel)
    warnPanelChannelId: { type: String, default: null }, 
    warnLogChannelId: { type: String, default: null }, 
    warnPanelTitle: { type: String, default: 'Warn Control Panel' },
    warnPanelDesc: { type: String, default: 'Use buttons below.' },
    warnPanelColor: { type: String, default: '#ed4245' },
    warnMax: { type: Number, default: 3 },
    warnAction: { type: String, default: 'timeout' },
    warnReasons: { type: [String], default: ['Rule Violation', 'Spam'] }, 
    
    // 🎟️ بانر التكتات الخارجي
    panelChannelId: { type: String, default: null }, 
    defaultCategoryId: { type: String, default: null }, 
    ticketEmbedTitle: { type: String, default: 'SUPPORT TICKETS' },
    ticketEmbedDesc: { type: String, default: 'Click a button below to open a ticket.' },
    ticketEmbedColor: { type: String, default: '#0099ff' },
    ticketEmbedImage: { type: String, default: null },
    ticketCount: { type: Number, default: 0 },
    maxTicketsPerUser: { type: Number, default: 1 }, 
    
    customButtons: [ticketButtonSchema], 
    autoResponders: [autoResponderSchema],

    // 👨‍⚖️ نظام الرتب
    adminRoleId: { type: String, default: null }, 
    highAdminRoles: { type: [String], default: [] }, 
    mediatorRoleId: { type: String, default: null }, 
    highMediatorRoles: { type: [String], default: [] }, 
    
    hideTicketOnClaim: { type: Boolean, default: true },
    readOnlyStaffOnClaim: { type: Boolean, default: false },
    
    // ⌨️ الأوامر
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
    
    // 🔥 الأوامر الجديدة للفك والنقل
    cmdUnban: { type: String, default: '!unban' }, cmdUnbanRoles: { type: [String], default: [] },
    cmdUntimeout: { type: String, default: '!untimeout' }, cmdUntimeoutRoles: { type: [String], default: [] },
    cmdMove: { type: String, default: '!move' }, cmdMoveRoles: { type: [String], default: [] },

    // 🎨 تخصيص ألوان جميع الإيمبدات
    logEmbedColor: { type: String, default: '#2b2d31' },
    transcriptEmbedColor: { type: String, default: '#2b2d31' },
    basicRatingColor: { type: String, default: '#f2a658' },
    
    // ⭐ تخصيص التقييم في الخاص
    ratingStyle: { type: String, default: 'basic' }, // 'basic' أو 'custom'
    customRatingText: { type: String, default: 'Please rate your experience with [staff]' },

    // 📁 اللوجات
    transcriptChannelId: { type: String, default: null }, ticketLogChannelId: { type: String, default: null }, staffRatingChannelId: { type: String, default: null }, mediatorRatingChannelId: { type: String, default: null }, 
    logRoleCreateDeleteId: { type: String, default: null }, logMemberRoleUpdateId: { type: String, default: null }, logJoinLeaveId: { type: String, default: null }, logMsgDeleteId: { type: String, default: null }, logMsgUpdateId: { type: String, default: null }, logImgDeleteId: { type: String, default: null }, logVoiceId: { type: String, default: null }, 
    logInviteId: { type: String, default: null }, logChannelThreadId: { type: String, default: null }, logBanId: { type: String, default: null }, logTimeoutId: { type: String, default: null }, logUnwarnId: { type: String, default: null },
    
    // 📊 العدادات
    staffRatingsCount: { type: Map, of: Number, default: {} },
    mediatorRatingsCount: { type: Map, of: Number, default: {} },
    totalServerRatings: { type: Number, default: 0 }
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
