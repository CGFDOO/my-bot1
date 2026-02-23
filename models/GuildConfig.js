const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    
    // 1️⃣ الإعدادات العامة
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    language: { type: String, default: 'ar' },
    
    // 2️⃣ ألوان السيرفر والتصميم
    embedSetup: {
        successColor: { type: String, default: '#3ba55d' },
        errorColor: { type: String, default: '#ed4245' },
        primaryColor: { type: String, default: '#5865F2' },
        footerText: { type: String, default: 'MNC Community © 2024' },
        footerIconUrl: { type: String, default: null },
        thumbnailUrl: { type: String, default: null }
    },

    // 3️⃣ نظام الوساطة الأساسي
    middlemanSystem: {
        enabled: { type: Boolean, default: false },
        categoryId: { type: String, default: null }, 
        panelChannelId: { type: String, default: null }, 
        panelTitle: { type: String, default: 'تذكرة وساطة آمنة' },
        panelDescription: { type: String, default: 'لطلب وسيط معتمد، يرجى فتح تذكرة.' },
        panelColor: { type: String, default: '#f2a658' },
        buttonLabel: { type: String, default: 'طلب وسيط 🛡️' },
        modalTitle: { type: String, default: 'بيانات الوساطة' },
        // تم تغييرها لدعم الإضافة بالزراير بدون JSON
        modalFields: [{
            label: String,
            placeholder: String,
            style: { type: String, default: 'Short' }
        }],
        insideTicketTitle: { type: String, default: 'تذكرة الوساطة' },
        insideTicketDescription: { type: String, default: 'يرجى انتظار الوسيط وكتابة التفاصيل.' },
        insideTicketColor: { type: String, default: '#f2a658' }
    },

    // 4️⃣ البانلات الديناميكية الشاملة (بدون JSON للعميل)
    ticketPanels: [{
        panelId: String,
        channelId: String,
        categoryId: String,
        panelTitle: String,
        panelDescription: String,
        panelColor: String,
        imageUrl: String,
        buttons: [{
            id: String,
            label: String,
            color: String,
            emoji: String,
            requireModal: Boolean,
            isMiddleman: { type: Boolean, default: false }, // هل هو زر وساطة؟
            modalTitle: String,
            modalFields: [{ label: String, placeholder: String, style: String }],
            insideEmbedTitle: String,
            insideEmbedDesc: String,
            insideEmbedColor: String
        }]
    }],

    // 5️⃣ التذاكر والترانسكريبت (مع الـ Counter)
    ticketControls: {
        ticketCounter: { type: Number, default: 1 }, // رقم التكت القادم
        maxOpenTicketsPerUser: { type: Number, default: 1 },
        controlPanelColor: { type: String, default: '#2b2d31' }, 
        ticketLogChannelId: String,
        transcriptChannelId: String,
        hideTicketOnClaim: { type: Boolean, default: false },
        readOnlyStaffOnClaim: { type: Boolean, default: false }
    },

    // 6️⃣ التقييمات الشاملة المزدوجة
    ratings: {
        middlemanLogChannelId: String,
        middlemanEmbedColor: { type: String, default: '#f2a658' },
        staffLogChannelId: String,
        staffEmbedColor: { type: String, default: '#3ba55d' },
        customReviewOptions: { type: [String], default: ['تعامل ممتاز 🚀', 'سريع ومضمون 👑'] },
        allowCustomText: { type: Boolean, default: true }
    },

    // 7️⃣ الرتب والصلاحيات (الأساسية والعليا)
    roles: {
        adminRoleId: String,
        middlemanRoleId: String,
        highAdminRoles: [String],
        tradePingRoleIds: [String],
        tradeApproveRoleIds: [String]
    },

    // 8️⃣ الأوامر الديناميكية
    commands: {
        clearCmd: { type: String, default: 'clear' },
        clearAllowedRoles: [String],
        banCmd: { type: String, default: 'ban' },
        banAllowedRoles: [String],
        timeoutCmd: { type: String, default: 'timeout' },
        timeoutAllowedRoles: [String],
        comeCmd: { type: String, default: 'come' },
        comeAllowedRoles: [String],
        doneCmd: { type: String, default: 'done' }, 
        doneAllowedRoles: [String], 
        tradeCmd: { type: String, default: 'trade' },
        tradeAllowedRoles: [String], 
        approveCmd: { type: String, default: 'approve' } // أمر الموافقة العليا
    },

    // 9️⃣ السجلات الدقيقة (Ultra Logs)
    serverLogs: {
        messageDeleteLogId: String,
        messageEditLogId: String,
        imageDeleteLogId: String,
        memberJoinLeaveLogId: String,
        voiceStateLogId: String,
        roleGiveTakeLogId: String,
        banKickLogId: String,
        suggestionsLogId: String, // روم الاقتراحات
        warningsLogId: String // روم اللوج للتحذيرات
    },

    // 🔟 التحذيرات والمخالفات
    warnings: {
        maxWarnings: { type: Number, default: 3 },
        autoAction: { type: String, default: 'timeout' },
        presetReasonsAr: { type: [String], default: ['سب وشتم', 'نشر روابط', 'إزعاج الإدارة'] },
        presetReasonsEn: { type: [String], default: ['Swearing', 'Posting Links', 'Spam'] }
    },

    // 🌟 11. الترحيب (الملكي)
    welcomeSystem: {
        enabled: { type: Boolean, default: false },
        channelId: String,
        messageText: { type: String, default: 'مرحباً بك {user}!' },
        backgroundUrl: String, // رابط خلفية الصورة
        avatarBorderHex: { type: String, default: '#ffffff' } // لون إطار الصورة
    },

    // 🌟 12. الحماية ومكافحة الغزو
    protection: {
        antiLinkEnabled: { type: Boolean, default: false },
        antiLinkAllowedRoles: [String],
        antiSpamEnabled: { type: Boolean, default: false },
        antiSpamAction: { type: String, default: 'mute' },
        antiNukeEnabled: { type: Boolean, default: false },
        maxChannelDeletesPerMinute: { type: Number, default: 3 },
        maxBanPerMinute: { type: Number, default: 3 }
    },

    // 🌟 13. الرتب والرد التلقائي
    autoRoles: [String],
    autoResponders: [{ triggerWord: String, replyMessage: String, exactMatch: Boolean }],

    // 🌟 14. الاقتصاد واللفلات
    economy: { enabled: { type: Boolean, default: true }, dailyMin: Number, dailyMax: Number, tax: Number },
    leveling: { enabled: { type: Boolean, default: true }, levelUpChannelId: String, levelUpMessage: String, roleRewards: [{ levelRequired: Number, roleId: String }] },

    // 🤖 15. نظام الذكاء الاصطناعي (AI System - The Magic Touch)
    aiSystem: {
        enabled: { type: Boolean, default: true },
        chatChannelId: String, // روم يتحدث فيها الأعضاء مع الـ AI
        autoModToxicity: { type: Boolean, default: false } // فلتر الشتائم الذكي
    }
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
