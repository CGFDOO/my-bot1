// =========================================================================================================
// 🗄️ قاعدة البيانات الشاملة للمشروع (ENTERPRISE GUILD CONFIGURATION SCHEMA)
// ---------------------------------------------------------------------------------------------------------
// هذا الملف يمثل "عقل" البوت. كل سيرفر يتم إضافته سيحصل على نسخة من هذه الإعدادات.
// تم فصل "تذاكر الوساطة" تماماً عن "تذاكر الدعم" لمنع تداخل التقييمات والأوامر.
// =========================================================================================================

const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    // ==========================================
    // 🌐 1. الإعدادات الأساسية (Core Settings)
    // ==========================================
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    language: { type: String, default: 'ar' },

    // ==========================================
    // 🛡️ 2. نظام الوساطة الأساسي (Core Middleman System) - معزول تماماً
    // هذا النظام خاص بطلب الوسيط فقط، ويعمل عليه أمر !done ويرسل تقييم الوسيط
    // ==========================================
    middlemanSystem: {
        enabled: { type: Boolean, default: false },
        categoryId: { type: String, default: null }, // كاتجوري تذاكر الوساطة
        panelChannelId: { type: String, default: null }, // روم إرسال البانل
        
        // إعدادات البانل الخارجي للوساطة
        panelTitle: { type: String, default: 'تذكرة وساطة آمنة' },
        panelDescription: { type: String, default: 'لطلب وسيط معتمد من الإدارة، يرجى فتح تذكرة من هنا.' },
        panelColor: { type: String, default: '#f2a658' },
        panelThumbnail: { type: String, default: null },
        panelImage: { type: String, default: null },
        
        // إعدادات زر الوساطة
        buttonLabel: { type: String, default: 'طلب وسيط 🛡️' },
        buttonColor: { type: String, default: 'Primary' }, 
        
        // نافذة الأسئلة المنبثقة (Modal) للوساطة
        modalTitle: { type: String, default: 'بيانات الوساطة (Trade Info)' },
        modalFields: [{
            label: { type: String, required: true },
            placeholder: { type: String, default: '' },
            style: { type: String, default: 'Paragraph' }, 
            required: { type: Boolean, default: true }
        }],

        // رسالة الترحيب داخل تذكرة الوساطة (بعد الفتح)
        insideTicketTitle: { type: String, default: 'تذكرة الوساطة' },
        insideTicketDescription: { type: String, default: 'يرجى انتظار الوسيط، وكتابة تفاصيل المعاملة بدقة.' },
        insideTicketColor: { type: String, default: '#f2a658' }
    },

    // ==========================================
    // 🎟️ 3. نظام التذاكر المتعددة (Custom Ticket Panels)
    // هذا النظام مخصص للدعم الفني، الشكاوى، وأي شيء آخر (يتم تقييم الإدارة فيه عند الإغلاق)
    // ==========================================
    ticketPanels: [{
        panelId: { type: String, required: true },
        channelId: { type: String, default: null },
        categoryId: { type: String, default: null },
        
        // إعدادات البانل الخارجي
        panelTitle: { type: String, default: 'الدعم الفني' },
        panelDescription: { type: String, default: 'افتح تذكرة للتواصل مع الإدارة.' },
        panelColor: { type: String, default: '#2b2d31' },
        panelThumbnail: { type: String, default: null },
        panelImage: { type: String, default: null },
        
        // الأزرار داخل هذا البانل (يمكن أن يحتوي البانل الواحد على أكثر من زر)
        buttons: [{
            id: { type: String, required: true },
            label: { type: String, default: 'فتح تذكرة' },
            color: { type: String, default: 'Secondary' },
            emoji: { type: String, default: null },
            
            // تفعيل إرسال تقييم للإدارة عند إغلاق هذا النوع من التذاكر؟
            enableStaffRating: { type: Boolean, default: true },
            
            // إعدادات نافذة الأسئلة لهذا الزر المخصص
            requireModal: { type: Boolean, default: false },
            modalTitle: { type: String, default: 'بيانات التذكرة' },
            modalFields: [{
                label: { type: String, required: true },
                placeholder: { type: String, default: '' },
                style: { type: String, default: 'Paragraph' },
                required: { type: Boolean, default: true }
            }],

            // رسالة الترحيب داخل هذا التكت تحديداً
            insideEmbedTitle: { type: String, default: 'تذكرة دعم فني' },
            insideEmbedDesc: { type: String, default: 'فريق الدعم سيقوم بالرد عليك قريباً.' },
            insideEmbedColor: { type: String, default: '#2b2d31' }
        }]
    }],

    // ==========================================
    // ⭐ 4. نظام التقييمات الشامل (Ratings & Feedback)
    // ==========================================
    ratings: {
        // إعدادات تقييم الوساطة (يتم إرساله عبر أمر !done للوسيط)
        middlemanLogChannelId: { type: String, default: null },
        middlemanEmbedColor: { type: String, default: '#f2a658' },
        
        // إعدادات تقييم الإدارة (يتم إرساله تلقائياً عند الضغط على زر Close)
        staffLogChannelId: { type: String, default: null },
        staffEmbedColor: { type: String, default: '#3ba55d' },

        // إحصائيات السيرفر للحفظ في قاعدة البيانات
        totalServerRatings: { type: Number, default: 0 },
        staffRatingsCount: { type: Map, of: Number, default: {} },
        middlemanRatingsCount: { type: Map, of: Number, default: {} }
    },

    // ==========================================
    // ⚙️ 5. إعدادات لوحة تحكم التذاكر (Ticket Controls)
    // ==========================================
    ticketControls: {
        maxOpenTicketsPerUser: { type: Number, default: 1 },
        controlPanelColor: { type: String, default: '#2b2d31' }, // لون لوحة التحكم (إغلاق، استلام، الخ)
        
        // رومات السجلات (اللوجات)
        ticketLogChannelId: { type: String, default: null },
        transcriptChannelId: { type: String, default: null },
        transcriptEmbedColor: { type: String, default: '#2b2d31' },
        
        // نظام الاستلام (Claim Logic)
        hideTicketOnClaim: { type: Boolean, default: false }, // إخفاء التذكرة عن باقي الإدارة عند الاستلام
        readOnlyStaffOnClaim: { type: Boolean, default: false } // منع باقي الإدارة من الكتابة عند الاستلام
    },

    // ==========================================
    // 👮 6. نظام الرتب والصلاحيات (Roles & Permissions)
    // ==========================================
    roles: {
        adminRoleId: { type: String, default: null }, // رتبة الإدارة الأساسية التي ترى تذاكر الدعم
        middlemanRoleId: { type: String, default: null }, // رتبة الوسيط الأساسية التي ترى تذاكر الوساطة
        highAdminRoles: { type: [String], default: [] }, // رتب الإدارة العليا
        highMiddlemanRoles: { type: [String], default: [] } // رتب الوسطاء العليا
    },

    // ==========================================
    // 🛠️ 7. الأوامر المخصصة (Custom Commands)
    // ==========================================
    commands: {
        comeCmd: { type: String, default: '!come' },
        comeAllowedRoles: { type: [String], default: [] },
        
        doneCmd: { type: String, default: '!done' },
        
        tradeCmd: { type: String, default: '!trade' },
        tradeEmbedColor: { type: String, default: '#f2a658' }
    },

    // ==========================================
    // ⚠️ 8. نظام التحذيرات التلقائي (Warning System)
    // ==========================================
    warnings: {
        logChannelId: { type: String, default: null },
        maxWarnings: { type: Number, default: 3 },
        autoAction: { type: String, default: 'timeout' }, // ماذا يفعل البوت عند بلوغ الحد: timeout, kick, ban
        
        // أسباب التحذير المنفصلة للغات
        reasonsArabic: { type: [String], default: [] },
        reasonsEnglish: { type: [String], default: [] },
        
        // سجلات التحذيرات للأعضاء
        userRecords: { type: Map, of: Array, default: {} }
    },

    // ==========================================
    // 🛡️ 9. نظام الحماية التلقائية (Auto Protection)
    // ==========================================
    protection: {
        antiLinksEnabled: { type: Boolean, default: false },
        antiLinksAction: { type: String, default: 'delete_and_warn' }, // الإجراء عند إرسال رابط
        
        antiSpamEnabled: { type: Boolean, default: false },
        antiSpamAction: { type: String, default: 'timeout' } // الإجراء عند السبام
    },

    // ==========================================
    // 🎉 10. نظام الترحيب وسجلات السيرفر (Welcome & Server Logs)
    // ==========================================
    welcome: {
        channelId: { type: String, default: null },
        messageContent: { type: String, default: 'Welcome [user] to [server]!' },
        embedColor: { type: String, default: '#5865F2' },
        backgroundImageUrl: { type: String, default: null },
        autoRoleId: { type: String, default: null }
    },
    
    serverLogs: {
        joinLeaveChannelId: { type: String, default: null },
        messageDeleteChannelId: { type: String, default: null },
        messageUpdateChannelId: { type: String, default: null },
        voiceStateChannelId: { type: String, default: null },
        roleUpdateChannelId: { type: String, default: null }
    },

    // ==========================================
    // 💬 11. الردود التلقائية (Auto Responders)
    // ==========================================
    autoResponders: [{
        triggerWord: { type: String, required: true },
        replyMessage: { type: String, required: true }
    }],

    // ==========================================
    // 📈 12. الإحصائيات العامة للسيرفر (Global Counters)
    // ==========================================
    stats: {
        totalTicketsCreated: { type: Number, default: 0 }
    }
});

// تصدير الموديل للاستخدام في باقي الملفات
module.exports = mongoose.model('GuildConfig', guildConfigSchema);
