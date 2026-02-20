const mongoose = require('mongoose');

// =====================================================================
// 📝 Schema for Modal Fields (أسئلة النوافذ داخل التكت)
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
// 🔘 Schema for Ticket Buttons (إعدادات زراير التكتات المخصصة)
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
    modalFields: {
        type: [modalFieldSchema],
        default: []
    }, 
    isMediator: { 
        type: Boolean, 
        default: false 
    },
    enableRating: { 
        type: Boolean, 
        default: true 
    },
    // 🔥 تحديد رتب معينة لاستلام هذا التكت (مثلاً: تكت شكاوى للادارة العليا فقط)
    allowedClaimRoles: {
        type: [String],
        default: []
    }
});

// =====================================================================
// 💬 Schema for Auto Responders (الردود التلقائية)
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
// 👑 THE MAIN GUILD CONFIGURATION (إعدادات السيرفر الشاملة)
// =====================================================================
const guildConfigSchema = new mongoose.Schema({
    // ---------------------------------------------------
    // Core Settings
    // ---------------------------------------------------
    guildId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    prefix: { 
        type: String, 
        default: '!' 
    },
    antiLinks: { 
        type: Boolean, 
        default: false 
    },
    antiSpam: { 
        type: Boolean, 
        default: false 
    },
    autoRoleId: { 
        type: String, 
        default: null 
    },
    
    // ---------------------------------------------------
    // Games & Leveling System
    // ---------------------------------------------------
    gamesEnabled: { 
        type: Boolean, 
        default: false 
    },
    gamesChannelId: { 
        type: String, 
        default: null 
    },
    levelingEnabled: { 
        type: Boolean, 
        default: false 
    },
    levelUpChannelId: { 
        type: String, 
        default: null 
    },
    suggestionChannelId: { 
        type: String, 
        default: null 
    },
    
    // ---------------------------------------------------
    // Welcome System (with Images)
    // ---------------------------------------------------
    welcomeChannelId: { 
        type: String, 
        default: null 
    }, 
    welcomeMessage: { 
        type: String, 
        default: 'Welcome [user] to [server]! You are member #[memberCount].' 
    },
    welcomeBgImage: { 
        type: String, 
        default: null 
    }, 
    welcomeAvatarBorderColor: { 
        type: String, 
        default: '#ffffff' 
    },
    
    // ---------------------------------------------------
    // Warn Panel System
    // ---------------------------------------------------
    warnPanelChannelId: { type: String, default: null }, 
    warnLogChannelId: { type: String, default: null }, 
    warnPanelTitle: { type: String, default: 'Warn Control Panel' },
    warnPanelDesc: { type: String, default: 'Use buttons below to manage warnings.' },
    warnPanelColor: { type: String, default: '#ed4245' },
    warnMax: { type: Number, default: 3 },
    warnAction: { type: String, default: 'timeout' },
    warnReasons: { 
        type: [String], 
        default: ['Rule Violation', 'Spam', 'Scamming', 'Disrespect'] 
    }, 
    
    // ---------------------------------------------------
    // External Ticket Panel Settings
    // ---------------------------------------------------
    panelChannelId: { type: String, default: null }, 
    defaultCategoryId: { type: String, default: null }, 
    ticketEmbedTitle: { type: String, default: 'SUPPORT TICKETS' },
    ticketEmbedDesc: { type: String, default: 'Click a button below to open a ticket.' },
    ticketEmbedColor: { type: String, default: '#0099ff' },
    ticketEmbedImage: { type: String, default: null },
    ticketCount: { type: Number, default: 0 },
    maxTicketsPerUser: { type: Number, default: 1 }, 
    
    customButtons: { type: [ticketButtonSchema], default: [] }, 
    autoResponders: { type: [autoResponderSchema], default: [] },

    // ---------------------------------------------------
    // Staff & Mediator Roles
    // ---------------------------------------------------
    adminRoleId: { type: String, default: null }, 
    highAdminRoles: { type: [String], default: [] }, 
    mediatorRoleId: { type: String, default: null }, 
    highMediatorRoles: { type: [String], default: [] }, 
    
    hideTicketOnClaim: { type: Boolean, default: true },
    readOnlyStaffOnClaim: { type: Boolean, default: false },
    
    // ---------------------------------------------------
    // Commands & Permissions (Dynamic Prefix)
    // ---------------------------------------------------
    cmdAdd: { type: String, default: '!add' }, 
    cmdAddRoles: { type: [String], default: [] },
    
    cmdDone: { type: String, default: '!done' }, 
    cmdDoneRoles: { type: [String], default: [] },
    
    cmdReqHigh: { type: String, default: '!req-high' }, 
    cmdReqHighRoles: { type: [String], default: [] },
    
    cmdCome: { type: String, default: '!come' }, 
    cmdComeRoles: { type: [String], default: [] },
    
    cmdTrade: { type: String, default: '!trade' }, 
    cmdTradeRoles: { type: [String], default: [] },
    
    cmdClear: { type: String, default: '!clear' }, 
    cmdClearRoles: { type: [String], default: [] },
    
    cmdLock: { type: String, default: '!lock' }, 
    cmdLockRoles: { type: [String], default: [] },
    
    cmdUnlock: { type: String, default: '!unlock' }, 
    cmdUnlockRoles: { type: [String], default: [] },
    
    cmdVmove: { type: String, default: '!vmove' }, 
    cmdVmoveRoles: { type: [String], default: [] },
    
    cmdBan: { type: String, default: '!ban' }, 
    cmdBanRoles: { type: [String], default: [] },
    
    cmdTimeout: { type: String, default: '!timeout' }, 
    cmdTimeoutRoles: { type: [String], default: [] },
    
    // 🔥 New Commands for Unban, Untimeout, and General Move
    cmdUnban: { type: String, default: '!unban' }, 
    cmdUnbanRoles: { type: [String], default: [] },
    
    cmdUntimeout: { type: String, default: '!untimeout' }, 
    cmdUntimeoutRoles: { type: [String], default: [] },
    
    cmdMove: { type: String, default: '!move' }, 
    cmdMoveRoles: { type: [String], default: [] },

    // ---------------------------------------------------
    // 🎨 Embed Colors Customization (التحكم بألوان كل الإيمبدات)
    // ---------------------------------------------------
    logEmbedColor: { type: String, default: '#ed4245' }, // لون لوجات التكت
    transcriptEmbedColor: { type: String, default: '#2b2d31' }, // لون الترانسكريبت
    basicRatingColor: { type: String, default: '#f2a658' }, // لون تقييم الوساطة الأساسي
    staffRatingColor: { type: String, default: '#3ba55d' }, // لون تقييم الإدارة الأساسي
    
    // ---------------------------------------------------
    // ⭐ Custom Rating Settings (تخصيص رسالة التقييم في الخاص)
    // ---------------------------------------------------
    ratingStyle: { 
        type: String, 
        default: 'basic' // 'basic' OR 'custom'
    }, 
    customRatingTitle: {
        type: String,
        default: 'Server Feedback'
    },
    customRatingText: { 
        type: String, 
        default: 'Hello [user], please rate the service provided by [staff] in our server. Your feedback helps us improve!' 
    },

    // ---------------------------------------------------
    // 📁 Universal Logging Channels
    // ---------------------------------------------------
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
    logUnwarnId: { type: String, default: null },
    
    // ---------------------------------------------------
    // 📊 Global Rating Counters
    // ---------------------------------------------------
    staffRatingsCount: { 
        type: Map, 
        of: Number, 
        default: {} 
    },
    mediatorRatingsCount: { 
        type: Map, 
        of: Number, 
        default: {} 
    },
    totalServerRatings: { 
        type: Number, 
        default: 0 
    }
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
