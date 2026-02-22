// =========================================================================================================
// 🗄️ قاعدة البيانات الشاملة والمفصلة (THE ULTIMATE ENTERPRISE GUILD CONFIGURATION SCHEMA)
// ---------------------------------------------------------------------------------------------------------
// هذا الملف يحتوي على كل "أدراج" البيانات التي ستستقبلها الداشبورد.
// تم دمج (الوساطة، التذاكر، التقييمات، اللوجات، البروبوت، الحماية، الكردت، واللفلات) في مخطط واحد عملاق.
// =========================================================================================================

const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    
    // ==========================================
    // 1️⃣ الإعدادات العامة (General Settings)
    // ==========================================
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    language: { type: String, default: 'ar' }, // ar / en (للتحذيرات والرسائل الأساسية)
    
    // ==========================================
    // 2️⃣ التحكم الشامل في الإيمبدات (Global Embeds Control)
    // ==========================================
    embedSetup: {
        successColor: { type: String, default: '#3ba55d' },
        errorColor: { type: String, default: '#ed4245' },
        primaryColor: { type: String, default: '#5865F2' },
        footerText: { type: String, default: 'Enterprise System © 2024' },
        footerIconUrl: { type: String, default: null }, // رابط صورة الفوتر لو العميل عايز يحط لوجو سيرفره
        thumbnailUrl: { type: String, default: null }
    },

    // ==========================================
    // 3️⃣ نظام الوساطة المتقدم (Middleman System)
    // ==========================================
    middlemanSystem: {
        enabled: { type: Boolean, default: false },
        categoryId: { type: String, default: null }, 
        panelChannelId: { type: String, default: null }, 
        
        // إيمبد البانل الخارجي
        panelTitle: { type: String, default: 'تذكرة وساطة آمنة' },
        panelDescription: { type: String, default: 'لطلب وسيط معتمد، يرجى فتح تذكرة.' },
        panelColor: { type: String, default: '#f2a658' },
        buttonLabel: { type: String, default: 'طلب وسيط 🛡️' },
        
        // النافذة المنبثقة (Modal)
        modalTitle: { type: String, default: 'بيانات الوساطة' },
        modalFields: [{
            label: { type: String, required: true },
            placeholder: { type: String, default: 'اكتب هنا...' },
            style: { type: String, default: 'Paragraph' }, 
            required: { type: Boolean, default: true }
        }],
        
        // التذكرة من الداخل
        insideTicketTitle: { type: String, default: 'تذكرة الوساطة' },
        insideTicketDescription: { type: String, default: 'يرجى انتظار الوسيط وكتابة التفاصيل.' },
        insideTicketColor: { type: String, default: '#f2a658' }
    },

    // ==========================================
    // 4️⃣ نظام التذاكر المتعددة (Custom Ticket Panels)
    // ==========================================
    ticketPanels: [{
        panelId: { type: String, required: true },
        channelId: { type: String, default: null },
        categoryId: { type: String, default: null },
        panelTitle: { type: String, default: 'الدعم الفني' },
        panelDescription: { type: String, default: 'افتح تذكرة للتواصل مع الإدارة.' },
        panelColor: { type: String, default: '#2b2d31' },
        buttons: [{
            id: { type: String, required: true },
            label: { type: String, default: 'فتح تذكرة' },
            color: { type: String, default: 'Secondary' },
            emoji: { type: String, default: null },
            requireModal: { type: Boolean, default: false },
            modalTitle: { type: String, default: 'بيانات التذكرة' },
            modalFields: [{
                label: { type: String, required: true },
                placeholder: { type: String, default: '' },
                style: { type: String, default: 'Paragraph' },
                required: { type: Boolean, default: true }
            }],
            insideEmbedTitle: { type: String, default: 'تذكرة دعم فني' },
            insideEmbedDesc: { type: String, default: 'فريق الدعم سيقوم بالرد عليك.' },
            insideEmbedColor: { type: String, default: '#2b2d31' }
        }]
    }],

    // ==========================================
    // 5️⃣ نظام التقييمات المزدوج والمخصص (Dual Ratings)
    // ==========================================
    ratings: {
        // تقييم الوسطاء (Trade Ratings)
        middlemanLogChannelId: { type: String, default: null },
        middlemanEmbedColor: { type: String, default: '#f2a658' },
        
        // تقييم الدعم الفني (Staff Ratings)
        staffLogChannelId: { type: String, default: null },
        staffEmbedColor: { type: String, default: '#3ba55d' },
        
        // التقييمات الجاهزة (Basic Pre-written reviews) ليختار منها العميل
        customReviewOptions: { 
            type: [String], 
            default: ['تعامل سريع جداً 🚀', 'وسيط مضمون ومحترم 👑', 'شكراً على سرعة الرد ❤️'] 
        },
        
        allowCustomText: { type: Boolean, default: true }, // السماح للعميل بكتابة تقييم بنفسه
        totalServerRatings: { type: Number, default: 0 }
    },

    // ==========================================
    // 6️⃣ التحكم الذكي في التذاكر (Ticket Controls)
    // ==========================================
    ticketControls: {
        maxOpenTicketsPerUser: { type: Number, default: 1 },
        controlPanelColor: { type: String, default: '#2b2d31' }, 
        ticketLogChannelId: { type: String, default: null }, // فتح وإغلاق
        transcriptChannelId: { type: String, default: null }, // حفظ المحادثة
        transcriptEmbedColor: { type: String, default: '#2b2d31' },
        hideTicketOnClaim: { type: Boolean, default: false }, // إخفاء التذكرة من الإدارة
        readOnlyStaffOnClaim: { type: Boolean, default: false } // منع الإدارة من الكتابة
    },

    // ==========================================
    // 7️⃣ نظام الرتب والصلاحيات (Roles Hierarchy)
    // ==========================================
    roles: {
        adminRoleId: { type: String, default: null }, // الدعم
        middlemanRoleId: { type: String, default: null }, // الوسيط
        highAdminRoles: { type: [String], default: [] }, // الإدارة العليا
        highMiddlemanRoles: { type: [String], default: [] }, // كبار الوسطاء
        tradePingRoleIds: { type: [String], default: [] }, // رتب المنشن في التريد
        tradeApproveRoleIds: { type: [String], default: [] } // رتب الموافقة
    },

    // ==========================================
    // 8️⃣ الأوامر الديناميكية (Dynamic Commands)
    // ==========================================
    commands: {
        clearCmd: { type: String, default: 'clear' },
        clearAllowedRoles: { type: [String], default: [] },
        banCmd: { type: String, default: 'ban' },
        banAllowedRoles: { type: [String], default: [] },
        timeoutCmd: { type: String, default: 'timeout' },
        timeoutAllowedRoles: { type: [String], default: [] },
        comeCmd: { type: String, default: 'come' },
        comeAllowedRoles: { type: [String], default: [] },
        doneCmd: { type: String, default: 'done' }, 
        doneAllowedRoles: { type: [String], default: [] }, 
        tradeCmd: { type: String, default: 'trade' },
        tradeAllowedRoles: { type: [String], default: [] }, 
        tradeEmbedColor: { type: String, default: '#f2a658' }
    },

    // ==========================================
    // 9️⃣ سجلات السيرفر المفصلة (Unified Logs)
    // ==========================================
    serverLogs: {
        messageLogChannelId: { type: String, default: null }, // حذف/تعديل
        messageLogEmbedColor: { type: String, default: '#fee75c' }, 
        
        memberJoinLeaveLogChannelId: { type: String, default: null },
        memberJoinEmbedColor: { type: String, default: '#3ba55d' }, 
        memberLeaveEmbedColor: { type: String, default: '#ed4245' }, 
        
        voiceStateLogChannelId: { type: String, default: null },
        voiceStateEmbedColor: { type: String, default: '#5865F2' }, 
        
        roleUpdateLogChannelId: { type: String, default: null },
        roleUpdateEmbedColor: { type: String, default: '#ffffff' }, 
        
        banKickLogChannelId: { type: String, default: null },
        banKickEmbedColor: { type: String, default: '#992d22' } 
    },

    // ==========================================
    // 🔟 نظام التحذيرات (Warnings System)
    // ==========================================
    warnings: {
        maxWarnings: { type: Number, default: 3 },
        autoAction: { type: String, default: 'timeout' }, // timeout, kick, ban
        // أسباب التحذيرات الجاهزة بالعربي والإنجليزي
        presetReasons: {
            ar: { type: [String], default: ['سب وشتم', 'نشر روابط', 'إزعاج الإدارة', 'سبام', 'مخالفة قوانين التريد'] },
            en: { type: [String], default: ['Swearing', 'Posting Links', 'Staff Disrespect', 'Spam', 'Scam Attempt'] }
        }
    },

    // ==========================================
    // 🌟 11. نظام الترحيب والمغادرة (Welcome & Leave) - ProBot Feature
    // ==========================================
    welcomeSystem: {
        enabled: { type: Boolean, default: false },
        channelId: { type: String, default: null },
        messageText: { type: String, default: 'مرحباً بك {user} في سيرفر {server}! نورتنا يا غالي. 🎉' },
        embedColor: { type: String, default: '#3ba55d' },
        imageUrl: { type: String, default: null } // رابط صورة الترحيب
    },

    // ==========================================
    // 🌟 12. الرتب التلقائية والرد التلقائي (Auto-Roles & Responders) - ProBot Feature
    // ==========================================
    autoRoles: { type: [String], default: [] }, // رتب يأخذها العضو بمجرد دخوله
    
    autoResponders: [{
        triggerWord: { type: String, required: true },
        replyMessage: { type: String, required: true },
        exactMatch: { type: Boolean, default: false } // هل يجب أن تكون الكلمة مطابقة تماماً؟
    }],

    // ==========================================
    // 🌟 13. نظام الحماية ومكافحة الغزو (Protection & Anti-Nuke) - ProBot Feature
    // ==========================================
    protection: {
        antiLinkEnabled: { type: Boolean, default: false },
        antiLinkAllowedRoles: { type: [String], default: [] }, // رتب مستثناة من منع الروابط
        
        antiSpamEnabled: { type: Boolean, default: false },
        antiSpamAction: { type: String, default: 'mute' }, // ميوت أو تحذير
        
        antiNukeEnabled: { type: Boolean, default: false },
        maxChannelDeletesPerMinute: { type: Number, default: 3 }, // منع حذف الرومات العشوائي
        maxBanPerMinute: { type: Number, default: 3 } // منع الباند العشوائي
    },

    // ==========================================
    // 🌟 14. الاقتصاد والألعاب (Economy & Games)
    // ==========================================
    economy: {
        enabled: { type: Boolean, default: true },
        dailyMin: { type: Number, default: 1000 },
        dailyMax: { type: Number, default: 5000 },
        transferTaxPercentage: { type: Number, default: 5 }, // ضريبة التحويل
        gamesEnabled: { type: Boolean, default: true } // تفعيل ألعاب الكازينو وغيرها
    },

    // ==========================================
    // 🌟 15. نظام المستويات والرتب (Leveling & Role Rewards)
    // ==========================================
    leveling: {
        enabled: { type: Boolean, default: true },
        levelUpChannelId: { type: String, default: null }, // روم إشعارات التلفيل
        levelUpMessage: { type: String, default: 'مبروك {user}! وصلت للمستوى **{level}** 🚀' },
        // رتب يتم إعطاؤها عند الوصول لمستوى معين
        roleRewards: [{
            levelRequired: { type: Number, required: true },
            roleId: { type: String, required: true }
        }]
    }

});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
