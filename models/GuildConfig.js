const mongoose = require('mongoose');

// =====================================================================
// 📝 1. Schema for Modal Fields (أسئلة النوافذ داخل التكت)
// =====================================================================
const modalFieldSchema = new mongoose.Schema({
    label: { 
        type: String, 
        required: true 
    }, 
    placeholder: { 
        type: String, 
        required: false,
        default: '' 
    },
    required: { 
        type: Boolean, 
        required: false,
        default: true 
    }
});

// =====================================================================
// 🔘 2. Schema for Ticket Buttons (زراير التكتات الفردية داخل البانل)
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
        required: false,
        default: 'Primary' 
    },
    insideEmbedTitle: { 
        type: String, 
        required: false,
        default: 'Ticket Info' 
    },
    insideEmbedDesc: { 
        type: String, 
        required: false,
        default: 'Please write your request clearly.' 
    },
    insideEmbedColor: { 
        type: String, 
        required: false,
        default: '#2b2d31' 
    },
    requireModal: { 
        type: Boolean, 
        required: false,
        default: false 
    },
    modalTitle: { 
        type: String, 
        required: false,
        default: 'Ticket Details' 
    },
    modalFields: { 
        type: [modalFieldSchema], 
        required: false,
        default: [] 
    }, 
    isMiddleMan: { 
        type: Boolean, 
        required: false,
        default: false 
    },
    enableRating: { 
        type: Boolean, 
        required: false,
        default: true 
    },
    allowedClaimRoles: { 
        type: [String], 
        required: false,
        default: [] 
    }
});

// =====================================================================
// 🎟️ 3. Schema for Multiple Ticket Panels (نظام البانلات المتعددة اللانهائي)
// =====================================================================
const ticketPanelSchema = new mongoose.Schema({
    id: { 
        type: String, 
        required: true 
    },
    name: { 
        type: String, 
        required: false,
        default: 'بانل جديد' 
    }, 
    panelChannelId: { 
        type: String, 
        required: false,
        default: null 
    }, 
    ticketCategoryId: { 
        type: String, 
        required: false,
        default: null 
    }, 
    embedTitle: { 
        type: String, 
        required: false,
        default: 'الدعم الفني' 
    },
    embedDesc: { 
        type: String, 
        required: false,
        default: 'اضغط على الزر لفتح تذكرة.' 
    },
    embedColor: { 
        type: String, 
        required: false,
        default: '#0099ff' 
    },
    embedImage: { 
        type: String, 
        required: false,
        default: null 
    },
    buttons: { 
        type: [ticketButtonSchema], 
        required: false,
        default: [] 
    } 
});

// =====================================================================
// 💬 4. Schema for Auto Responders (نظام الردود التلقائية)
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
// ⚠️ 5. Schema for User Warn Records (سجل تحذيرات الأعضاء)
// =====================================================================
const warnRecordSchema = new mongoose.Schema({
    reason: { 
        type: String, 
        required: true 
    },
    date: { 
        type: Date, 
        default: Date.now 
    },
    moderatorId: { 
        type: String, 
        required: true 
    }
});

// =====================================================================
// 👑 6. THE MAIN GUILD CONFIGURATION (الإعدادات الشاملة للسيرفر)
// =====================================================================
const guildConfigSchema = new mongoose.Schema({
    
    // ---------------------------------------------------
    // ⚙️ Core Settings (الإعدادات الأساسية)
    // ---------------------------------------------------
    guildId: { 
        type: String, 
        required: true, 
        unique: true 
    },
    prefix: { 
        type: String, 
        required: false,
        default: '!' 
    },
    antiLinks: { 
        type: Boolean, 
        required: false,
        default: false 
    },
    antiSpam: { 
        type: Boolean, 
        required: false,
        default: false 
    },
    autoRoleId: { 
        type: String, 
        required: false,
        default: null 
    },
    
    // ---------------------------------------------------
    // 🎮 Games & Leveling System (نظام الألعاب والمستويات)
    // ---------------------------------------------------
    gamesEnabled: { 
        type: Boolean, 
        required: false,
        default: false 
    },
    gamesChannelId: { 
        type: String, 
        required: false,
        default: null 
    },
    levelingEnabled: { 
        type: Boolean, 
        required: false,
        default: false 
    },
    levelUpChannelId: { 
        type: String, 
        required: false,
        default: null 
    },
    suggestionChannelId: { 
        type: String, 
        required: false,
        default: null 
    },
    
    // ---------------------------------------------------
    // 🖼️ Welcome System (نظام الترحيب)
    // ---------------------------------------------------
    welcomeChannelId: { 
        type: String, 
        required: false,
        default: null 
    }, 
    welcomeMessage: { 
        type: String, 
        required: false,
        default: 'حياك الله يا [user] في [server]! أنت العضو رقم [memberCount].' 
    },
    welcomeBgImage: { 
        type: String, 
        required: false,
        default: null 
    }, 
    welcomeAvatarBorderColor: { 
        type: String, 
        required: false,
        default: '#ffffff' 
    },
    welcomeEmbedColor: { 
        type: String, 
        required: false,
        default: '#5865F2' 
    }, 
    
    // ---------------------------------------------------
    // ⚠️ Warn Panel System (نظام التحذيرات المزدوج عربي/إنجليزي)
    // ---------------------------------------------------
    warnPanelChannelId: { 
        type: String, 
        required: false,
        default: null 
    }, 
    warnLogChannelId: { 
        type: String, 
        required: false,
        default: null 
    }, 
    warnPanelTitle: { 
        type: String, 
        required: false,
        default: 'لوحة تحكم التحذير' 
    },
    warnPanelDesc: { 
        type: String, 
        required: false,
        default: 'استخدم الزر أدناه لإدارة تحذيرات الأعضاء.' 
    },
    warnPanelColor: { 
        type: String, 
        required: false,
        default: '#ed4245' 
    },
    warnMax: { 
        type: Number, 
        required: false,
        default: 3 
    },
    warnAction: { 
        type: String, 
        required: false,
        default: 'timeout' 
    },
    
    // القوائم المزدوجة للغات التحذير (كما طلبت بالنص)
    warnReasonsAR: { 
        type: [String], 
        required: false,
        default: ['مخالفة القوانين', 'ألفاظ خارجة', 'تخريب التريدات', 'إزعاج الإدارة', 'نشر روابط'] 
    }, 
    warnReasonsEN: { 
        type: [String], 
        required: false,
        default: ['Rule Violation', 'Bad Words', 'Trading Disruption', 'Staff Disrespect', 'Sending Links'] 
    }, 
    
    // ---------------------------------------------------
    // 🎟️ MULTI-PANELS SYSTEM (نظام التكتات والبانلات المتعددة)
    // ---------------------------------------------------
    ticketPanels: { 
        type: [ticketPanelSchema], 
        required: false,
        default: [] 
    },
    ticketCount: { 
        type: Number, 
        required: false,
        default: 0 
    },
    maxTicketsPerUser: { 
        type: Number, 
        required: false,
        default: 1 
    }, 
    hideTicketOnClaim: { 
        type: Boolean, 
        required: false,
        default: true 
    },
    readOnlyStaffOnClaim: { 
        type: Boolean, 
        required: false,
        default: false 
    },

    autoResponders: { 
        type: [autoResponderSchema], 
        required: false,
        default: [] 
    },

    // ---------------------------------------------------
    // 👨‍⚖️ Staff & MiddleMan Roles (صلاحيات الرتب والوساطة)
    // ---------------------------------------------------
    adminRoleId: { 
        type: String, 
        required: false,
        default: null 
    }, 
    highAdminRoles: { 
        type: [String], 
        required: false,
        default: [] 
    }, 
    middlemanRoleId: { 
        type: String, 
        required: false,
        default: null 
    }, 
    highMiddlemanRoles: { 
        type: [String], 
        required: false,
        default: [] 
    }, 
    
    // ---------------------------------------------------
    // ⌨️ Commands & Permissions (الأوامر الديناميكية للرومات)
    // ---------------------------------------------------
    cmdAdd: { type: String, default: '!add' }, 
    cmdAddRoles: { type: [String], default: [] },
    
    cmdDone: { type: String, default: '!done' }, 
    cmdDoneRoles: { type: [String], default: [] },
    
    cmdReqHigh: { type: String, default: '!req-high' }, 
    cmdReqHighRoles: { type: [String], default: [] },
    
    cmdCome: { type: String, default: '!come' }, 
    cmdComeRoles: { type: [String], default: [] },
    
    // أوامر وصلاحيات التريد (MiddleMan)
    cmdTrade: { type: String, default: '!trade' }, 
    cmdTradeRoles: { type: [String], default: [] },
    tradeApproveRoles: { type: [String], default: [] }, 
    tradeMentionRoles: { type: [String], default: [] }, 
    
    // أوامر التحكم في الرومات
    cmdClear: { type: String, default: '!clear' }, 
    cmdClearRoles: { type: [String], default: [] },
    
    cmdLock: { type: String, default: '!lock' }, 
    cmdLockRoles: { type: [String], default: [] },
    
    cmdUnlock: { type: String, default: '!unlock' }, 
    cmdUnlockRoles: { type: [String], default: [] },
    
    cmdVmove: { type: String, default: '!vmove' }, 
    cmdVmoveRoles: { type: [String], default: [] },
    
    // أوامر العقوبات
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

    // ---------------------------------------------------
    // 🎨 Embed Colors Customization (تحكم الألوان الشامل)
    // ---------------------------------------------------
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
    
    // ---------------------------------------------------
    // ⭐ Ratings Customization (رسائل التقييم)
    // ---------------------------------------------------
    ratingStyle: { 
        type: String, 
        default: 'basic' 
    }, 
    customRatingTitle: { 
        type: String, 
        default: 'تقييم فريق العمل' 
    },
    customRatingText: { 
        type: String, 
        default: 'مرحباً [user]، يرجى تقييم خدمة الإداري [staff].' 
    },
    customMiddlemanRatingTitle: { 
        type: String, 
        default: 'تقييم الوساطة' 
    }, 
    customMiddlemanRatingText: { 
        type: String, 
        default: 'مرحباً [user]، يرجى تقييم خدمة الوسيط [staff].' 
    }, 

    // ---------------------------------------------------
    // 🔨 Punishments Customization (رسائل العقوبات)
    // ---------------------------------------------------
    punishmentStyle: { 
        type: String, 
        default: 'basic' 
    },
    customBanTitle: { 
        type: String, 
        default: '🔨 تم حظر عضو' 
    },
    customBanDesc: { 
        type: String, 
        default: 'تم حظر [user] بواسطة [moderator].\nالسبب: [reason]' 
    },
    customUnbanTitle: { 
        type: String, 
        default: '🕊️ تم فك الحظر' 
    },
    customUnbanDesc: { 
        type: String, 
        default: 'تم فك الحظر عن [user] بواسطة [moderator].' 
    },
    customTimeoutTitle: { 
        type: String, 
        default: '⏳ تم إعطاء تايم أوت' 
    },
    customTimeoutDesc: { 
        type: String, 
        default: 'تم معاقبة [user] بواسطة [moderator] لمدة [duration].\nالسبب: [reason]' 
    },
    customUntimeoutTitle: { 
        type: String, 
        default: '🔊 تم فك التايم أوت' 
    },
    customUntimeoutDesc: { 
        type: String, 
        default: 'تم فك التايم أوت عن [user] بواسطة [moderator].' 
    },

    // ---------------------------------------------------
    // 📁 Universal Logging Channels (جميع سجلات اللوج)
    // ---------------------------------------------------
    transcriptChannelId: { type: String, default: null }, 
    ticketLogChannelId: { type: String, default: null }, 
    staffRatingChannelId: { type: String, default: null }, 
    middlemanRatingChannelId: { type: String, default: null }, 
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
    // 📊 Global Counters & Warn Records (العدادات وقاعدة البيانات للسجلات)
    // ---------------------------------------------------
    staffRatingsCount: { 
        type: Map, 
        of: Number, 
        default: {} 
    },
    middlemanRatingsCount: { 
        type: Map, 
        of: Number, 
        default: {} 
    },
    totalServerRatings: { 
        type: Number, 
        default: 0 
    },
    
    // الخريطة التي ستحفظ سجل تحذيرات كل عضو (مربوطة بـ ID العضو)
    userWarnsRecords: { 
        type: Map, 
        of: [warnRecordSchema], 
        default: {} 
    }
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
