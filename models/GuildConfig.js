const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    
    // 1️⃣ الإعدادات العامة والتصميم
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    language: { type: String, default: 'ar' },
    embedSetup: {
        successColor: { type: String, default: '#3ba55d' },
        errorColor: { type: String, default: '#ed4245' },
        primaryColor: { type: String, default: '#5865F2' },
        footerText: { type: String, default: 'Enterprise System © 2024' },
        footerIconUrl: { type: String, default: null },
        thumbnailUrl: { type: String, default: null }
    },

    // 2️⃣ البانلات المتعددة والزراير الديناميكية (صورة 1000064875 - 1000064877)
    ticketPanels: [{
        panelId: String,
        channelId: String,
        categoryId: String,
        panelTitle: String,
        panelDescription: String,
        panelColor: String,
        imageUrl: String,
        maxOpenTickets: { type: Number, default: 1 },
        buttons: [{
            id: String,
            label: String,
            buttonStyle: { type: String, default: 'Primary' }, // أزرق، أحمر، رمادي، أخضر
            emoji: String,
            requireModal: Boolean,
            isMiddleman: { type: Boolean, default: false }, // زرار وساطة (يستخدم أمر done)
            modalTitle: String,
            modalFields: [{ label: String, placeholder: String, style: String, required: Boolean }], // سيتم برمجتها كزراير خضراء وحمراء في الواجهة
            insideEmbedTitle: String,
            insideEmbedDesc: String,
            insideEmbedColor: String
        }]
    }],

    // 3️⃣ تحكم التذاكر والترانسكريبت (صورة 1000064861 و 1000064886)
    ticketControls: {
        ticketCounter: { type: Number, default: 1 }, 
        controlPanelColor: { type: String, default: '#2b2d31' }, 
        transcriptChannelId: String,
        ticketLogChannelId: String,
        hideTicketOnClaim: { type: Boolean, default: false },
        readOnlyStaffOnClaim: { type: Boolean, default: false }
    },

    // 4️⃣ التقييمات المزدوجة (صورة 1000064865)
    ratings: {
        middlemanLogChannelId: String,
        staffLogChannelId: String,
        middlemanEmbedColor: { type: String, default: '#f2a658' },
        staffEmbedColor: { type: String, default: '#3ba55d' },
        customReviewOptions: { type: [String], default: ['تعامل ممتاز 🚀', 'سريع ومضمون 👑'] },
        allowCustomText: { type: Boolean, default: true }
    },

    // 5️⃣ الرتب والصلاحيات (صورة 1000064861 و 1000064952)
    roles: {
        adminRoleId: String,         // Staff Role
        highAdminRoleId: String,     // High Staff (Admin) للموافقة
        middlemanRoleId: String,     // رتبة الوساطة
        tradePingRoleIds: [String]   // رتب المنشن
    },

    // 6️⃣ تخصيص الأوامر (صورة 1000064863)
    commands: {
        clearCmd: { type: String, default: 'clear' },
        clearAllowedRoles: [String],
        banCmd: { type: String, default: 'ban' },
        banAllowedRoles: [String],
        timeoutCmd: { type: String, default: 'timeout' },
        timeoutAllowedRoles: [String],
        comeCmd: { type: String, default: 'come' },       // أمر سحب الإدارة
        comeAllowedRoles: [String],
        doneCmd: { type: String, default: 'done' },       // أمر إغلاق التكت (وساطة)
        doneAllowedRoles: [String], 
        tradeCmd: { type: String, default: 'trade' },     // أمر إضافة تفاصيل التريد
        tradeAllowedRoles: [String], 
        approveCmd: { type: String, default: 'approve' }, // أمر طلب الموافقة العليا
        approveAllowedRoles: [String]
    },

    // 7️⃣ السجلات بدقة متناهية (صورة 1000064878 و 1000064879 و 1000064864)
    serverLogs: {
        messageDeleteLogId: String,
        messageEditLogId: String,
        imageDeleteLogId: String,       // لوج حذف الصور فقط
        memberJoinLeaveLogId: String,
        voiceStateLogId: String,
        roleGiveTakeLogId: String,      // لوج إعطاء/سحب الرتب
        roleCreateDeleteLogId: String,  // لوج إنشاء/حذف الرتب
        banKickLogId: String,
        suggestionsLogId: String,
        warningsLogId: String
    },

    // 8️⃣ نظام التحذيرات المتقدم والقوانين (كما طلبت)
    warnings: {
        maxWarnings: { type: Number, default: 3 },
        autoAction: { type: String, default: 'timeout' },
        presetReasonsAr: { type: [String], default: ['سب وشتم', 'نشر روابط', 'إزعاج الإدارة'] },
        presetReasonsEn: { type: [String], default: ['Swearing', 'Posting Links', 'Spam'] },
        // القوانين التي تظهر مع التحذير ليختار منها الإداري لغة الإرسال للعضو
        serverRulesAr: { type: String, default: 'الرجاء الالتزام بقوانين السيرفر وعدم المخالفة.' },
        serverRulesEn: { type: String, default: 'Please follow the server rules and avoid breaking them.' }
    },

    // 🌟 9. الترحيب الملكي (صورة 1000064881 و 1000064882)
    welcomeSystem: {
        enabled: { type: Boolean, default: false },
        channelId: String,
        messageText: { type: String, default: 'مرحباً بك {user} في سيرفر {server}. أنت العضو رقم {memberCount}!' },
        backgroundUrl: String,
        avatarBorderHex: { type: String, default: '#ffffff' } // لون إطار الصورة
    },

    // 🌟 10. الحماية (Anti-Nuke/Spam) (صورة 1000064872)
    protection: {
        antiLinkEnabled: { type: Boolean, default: false },
        antiLinkAllowedRoles: [String],
        antiSpamEnabled: { type: Boolean, default: false },
        antiSpamAction: { type: String, default: 'mute' },
        antiNukeEnabled: { type: Boolean, default: false },
        maxChannelDeletesPerMinute: { type: Number, default: 3 },
        maxBanPerMinute: { type: Number, default: 3 }
    },

    // 🌟 11. الرتب والرد التلقائي
    autoRoles: [String],
    autoResponders: [{ triggerWord: String, replyMessage: String, exactMatch: Boolean }],

    // 🌟 12. الاقتصاد واللفلات
    economy: { enabled: { type: Boolean, default: true }, dailyMin: Number, dailyMax: Number, tax: Number },
    leveling: { enabled: { type: Boolean, default: true }, levelUpChannelId: String, levelUpMessage: String, roleRewards: [{ levelRequired: Number, roleId: String }] },

    // 🤖 13. نظام الذكاء الاصطناعي (مفاجأة النظام)
    aiSystem: {
        enabled: { type: Boolean, default: true },
        chatChannelId: String,
        autoModToxicity: { type: Boolean, default: false }
    }
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
