const mongoose = require('mongoose');

// =====================================================================
// 📝 Schema for Modal Fields (أسئلة النوافذ)
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
// 🔘 Schema for Ticket Buttons (زراير التكت)
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
// 👑 THE MAIN GUILD CONFIGURATION (الإعدادات الشاملة)
// =====================================================================
const guildConfigSchema = new mongoose.Schema({
    
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
    
    welcomeChannelId: { 
        type: String, 
        default: null 
    }, 
    welcomeMessage: { 
        type: String, 
        default: 'حياك الله يا [user] في [server]! أنت العضو رقم [memberCount].' 
    },
    welcomeBgImage: { 
        type: String, 
        default: null 
    }, 
    welcomeAvatarBorderColor: { 
        type: String, 
        default: '#ffffff' 
    },
    welcomeEmbedColor: { 
        type: String, 
        default: '#5865F2' 
    }, 
    
    warnPanelChannelId: { 
        type: String, 
        default: null 
    }, 
    warnLogChannelId: { 
        type: String, 
        default: null 
    }, 
    warnPanelTitle: { 
        type: String, 
        default: 'لوحة تحكم التحذيرات' 
    },
    warnPanelDesc: { 
        type: String, 
        default: 'استخدم الأزرار أدناه.' 
    },
    warnPanelColor: { 
        type: String, 
        default: '#ed4245' 
    },
    warnMax: { 
        type: Number, 
        default: 3 
    },
    warnAction: { 
        type: String, 
        default: 'timeout' 
    },
    warnReasons: { 
        type: [String], 
        default: ['مخالفة القوانين', 'ألفاظ خارجة', 'سرقة زبائن'] 
    }, 
    
    panelChannelId: { 
        type: String, 
        default: null 
    }, 
    defaultCategoryId: { 
        type: String, 
        default: null 
    }, 
    ticketEmbedTitle: { 
        type: String, 
        default: 'MNC COMMUNITY' 
    },
    ticketEmbedDesc: { 
        type: String, 
        default: 'اضغط لفتح تذكرة.' 
    },
    ticketEmbedColor: { 
        type: String, 
        default: '#0099ff' 
    },
    ticketEmbedImage: { 
        type: String, 
        default: null 
    },
    ticketCount: { 
        type: Number, 
        default: 0 
    },
    maxTicketsPerUser: { 
        type: Number, 
        default: 1 
    }, 
    
    customButtons: { 
        type: [ticketButtonSchema], 
        default: [] 
    }, 
    autoResponders: { 
        type: [autoResponderSchema], 
        default: [] 
    },

    adminRoleId: { 
        type: String, 
        default: null 
    }, 
    highAdminRoles: { 
        type: [String], 
        default: [] 
    }, 
    mediatorRoleId: { 
        type: String, 
        default: null 
    }, 
    highMediatorRoles: { 
        type: [String], 
        default: [] 
    }, 
    
    hideTicketOnClaim: { 
        type: Boolean, 
        default: true 
    },
    readOnlyStaffOnClaim: { 
        type: Boolean, 
        default: false 
    },
    
    cmdAdd: { type: String, default: '!add' }, 
    cmdAddRoles: { type: [String], default: [] },
    cmdDone: { type: String, default: '!done' }, 
    cmdDoneRoles: { type: [String], default: [] },
    cmdReqHigh: { type: String, default: '!req-high' }, 
    cmdReqHighRoles: { type: [String], default: [] },
    cmdCome: { type: String, default: '!come' }, 
    cmdComeRoles: { type: [String], default: [] },
    
    // ==================================================
    // 🔥 إعدادات أمر التريد والموافقات العليا
    // ==================================================
    cmdTrade: { type: String, default: '!trade' }, 
    cmdTradeRoles: { type: [String], default: [] },
    tradeApproveRoles: { type: [String], default: [] }, // من يضغط على أزرار الموافقة
    tradeMentionRoles: { type: [String], default: [] }, // من يتم عمل منشن لهم عند الطلب
    
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
    cmdUnban: { type: String, default: '!unban' }, 
    cmdUnbanRoles: { type: [String], default: [] },
    cmdUntimeout: { type: String, default: '!untimeout' }, 
    cmdUntimeoutRoles: { type: [String], default: [] },
    cmdMove: { type: String, default: '!move' }, 
    cmdMoveRoles: { type: [String], default: [] },

    // ==================================================
    // 🎨 تحكم الألوان الشامل
    // ==================================================
    logEmbedColor: { type: String, default: '#ed4245' }, 
    transcriptEmbedColor: { type: String, default: '#2b2d31' }, 
    basicRatingColor: { type: String, default: '#f2a658' }, 
    staffRatingColor: { type: String, default: '#3ba55d' }, 
    closeEmbedColor: { type: String, default: '#2b2d31' }, 
    answersEmbedColor: { type: String, default: '#2b2d31' }, 
    tradeEmbedColor: { type: String, default: '#f2a658' }, 
    banEmbedColor: { type: String, default: '#ed4245' },
    unbanEmbedColor: { type: String, default: '#3ba55d' },
    timeoutEmbedColor: { type: String, default: '#f2a658' },
    untimeoutEmbedColor: { type: String, default: '#3ba55d' },
    
    // ==================================================
    // ⭐ التقييمات
    // ==================================================
    ratingStyle: { type: String, default: 'basic' }, 
    customRatingTitle: { type: String, default: 'تقييم فريق العمل' },
    customRatingText: { type: String, default: 'مرحباً [user]، يرجى تقييم خدمة الإداري [staff].' },
    customMedRatingTitle: { type: String, default: 'تقييم الوساطة' },
    customMedRatingText: { type: String, default: 'مرحباً [user]، يرجى تقييم خدمة الوسيط [staff].' },

    // ==================================================
    // 🔨 العقوبات
    // ==================================================
    punishmentStyle: { type: String, default: 'basic' },
    customBanTitle: { type: String, default: '🔨 تم حظر عضو' },
    customBanDesc: { type: String, default: 'تم حظر [user] بواسطة [moderator].\nالسبب: [reason]' },
    customUnbanTitle: { type: String, default: '🕊️ تم فك الحظر' },
    customUnbanDesc: { type: String, default: 'تم فك الحظر عن [user] بواسطة [moderator].' },
    customTimeoutTitle: { type: String, default: '⏳ تم إعطاء تايم أوت' },
    customTimeoutDesc: { type: String, default: 'تم معاقبة [user] بواسطة [moderator] لمدة [duration].\nالسبب: [reason]' },
    customUntimeoutTitle: { type: String, default: '🔊 تم فك التايم أوت' },
    customUntimeoutDesc: { type: String, default: 'تم فك التايم أوت عن [user] بواسطة [moderator].' },

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
    
    staffRatingsCount: { type: Map, of: Number, default: {} },
    mediatorRatingsCount: { type: Map, of: Number, default: {} },
    totalServerRatings: { type: Number, default: 0 }
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
