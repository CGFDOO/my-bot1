const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    
    // 1️⃣ الإعدادات العامة والألوان
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    language: { type: String, default: 'ar' },
    embedSetup: {
        successColor: { type: String, default: '#3ba55d' },
        errorColor: { type: String, default: '#ed4245' },
        primaryColor: { type: String, default: '#5865F2' },
        footerText: { type: String, default: 'Enterprise System ©' },
        footerIconUrl: { type: String, default: null },
        thumbnailUrl: { type: String, default: null }
    },

    // 2️⃣ البانلات الديناميكية (بدون JSON - مجهزة لإجابات النوافذ في Code Blocks)
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
            buttonStyle: { type: String, default: 'Primary' },
            isMiddleman: { type: Boolean, default: false },
            requireModal: Boolean,
            modalTitle: String,
            modalFields: [{ label: String, placeholder: String, style: String }],
            insideEmbedTitle: String,
            insideEmbedDesc: String,
            insideEmbedColor: { type: String, default: '#2b2d31' },
            modalAnswersEmbedColor: { type: String, default: '#2b2d31' } // لون مخصص لإيمبد الإجابات
        }]
    }],

    // 3️⃣ تحكم التذاكر (الخطوتين والقراءة/الإخفاء)
    ticketControls: {
        ticketCounter: { type: Number, default: 1 }, 
        twoStepClose: { type: Boolean, default: true }, // تفعيل القفل على خطوتين
        transcriptChannelId: String,
        ticketLogChannelId: String,
        hideTicketOnClaim: { type: Boolean, default: false },
        readOnlyStaffOnClaim: { type: Boolean, default: false }
    },

    // 4️⃣ نظام الوساطة المعزول
    middlemanSystem: {
        enabled: { type: Boolean, default: false },
        categoryId: String,
        panelChannelId: String,
        panelTitle: { type: String, default: 'تذكرة وساطة آمنة' },
        panelDescription: String,
        panelColor: { type: String, default: '#f2a658' },
        buttonLabel: { type: String, default: 'طلب وسيط' },
        modalTitle: String,
        modalFields: [{ label: String, placeholder: String, style: String }],
        insideTicketTitle: String,
        insideTicketDescription: String,
        insideTicketColor: { type: String, default: '#f2a658' },
        modalAnswersEmbedColor: { type: String, default: '#f2a658' } // لون إيمبد إجابات الوساطة
    },

    // 5️⃣ التقييمات المزدوجة البيسك
    ratings: {
        middlemanLogChannelId: String,
        staffLogChannelId: String,
        middlemanEmbedColor: { type: String, default: '#f2a658' },
        staffEmbedColor: { type: String, default: '#3ba55d' }
    },

    // 6️⃣ الرتب والصلاحيات
    roles: {
        adminRoleId: String,
        highAdminRoles: [String],
        middlemanRoleId: String,
        tradePingRoleIds: [String],
        tradeApproveRoleIds: [String]
    },

    // 7️⃣ الأوامر الكاملة (الأساسية والعقوبات والضريبة)
    commands: {
        clearCmd: { type: String, default: 'clear' },
        comeCmd: { type: String, default: 'come' },
        taxCmd: { type: String, default: 'tax' }, // أمر الضريبة
        banCmd: { type: String, default: 'ban' },
        unbanCmd: { type: String, default: 'unban' }, // فك الباند
        timeoutCmd: { type: String, default: 'timeout' },
        untimeoutCmd: { type: String, default: 'untimeout' }, // فك التايم
        warnCmd: { type: String, default: 'warn' },
        unwarnCmd: { type: String, default: 'unwarn' }, // فك التحذير
        tradeCmd: { type: String, default: 'trade' },
        doneCmd: { type: String, default: 'done' }, 
        approveCmd: { type: String, default: 'approve' },
        allowedRoles: { type: Map, of: [String], default: {} } // تخزين رتب كل أمر
    },

    // 8️⃣ السجلات المرعبة (كل حاجة بلون وروم)
    serverLogs: {
        messageDeleteLogId: String, msgDelColor: { type: String, default: '#ed4245' },
        messageEditLogId: String, msgEditColor: { type: String, default: '#fee75c' },
        imageDeleteLogId: String, imgDelColor: { type: String, default: '#e67e22' },
        memberJoinLeaveLogId: String, joinColor: { type: String, default: '#3ba55d' }, leaveColor: { type: String, default: '#ed4245' },
        voiceStateLogId: String, voiceColor: { type: String, default: '#5865F2' },
        roleGiveTakeLogId: String, roleColor: { type: String, default: '#9b59b6' },
        channelCreateDeleteLogId: String, channelColor: { type: String, default: '#1abc9c' }, // لوج الرومات
        threadCreateDeleteLogId: String, threadColor: { type: String, default: '#34495e' }, // لوج الثريدات
        reactionLogId: String, reactionColor: { type: String, default: '#e74c3c' }, // لوج الريأكت (للتصبيع وغيره)
        banKickLogId: String, banColor: { type: String, default: '#992d22' },
        warningsLogId: String, warnColor: { type: String, default: '#f1c40f' },
        unwarningsLogId: String, unwarnColor: { type: String, default: '#2ecc71' } // لوج فك التحذير
    },

    // 9️⃣ التحذيرات وبانل الإدارة
    warnings: {
        maxWarnings: { type: Number, default: 3 },
        autoAction: { type: String, default: 'timeout' },
        presetReasonsAr: { type: [String], default: ['سب وشتم'] },
        presetReasonsEn: { type: [String], default: ['Swearing'] },
        // بانل التحذيرات (كما في الصورة)
        panelChannelId: String,
        panelTitle: { type: String, default: 'لوحة تحكم التحذير' },
        panelDescription: { type: String, default: 'استخدم الأزرار أدناه لإدارة تحذيرات الأعضاء.' },
        panelColor: { type: String, default: '#ed4245' }
    },

    // 🔟 الترحيب، الحماية، والاقتصاد
    welcomeSystem: { enabled: { type: Boolean, default: false }, channelId: String, messageText: String, backgroundUrl: String, avatarBorderHex: { type: String, default: '#ffffff' } },
    protection: { antiLinkEnabled: Boolean, antiLinkAllowedRoles: [String], antiSpamEnabled: Boolean, antiSpamAction: String, antiNukeEnabled: Boolean, maxChannelDeletes: Number, maxBan: Number },
    economy: { enabled: { type: Boolean, default: true }, taxPercentage: { type: Number, default: 5 } }, // نسبة الضريبة لأمر Tax
    leveling: { enabled: { type: Boolean, default: true }, levelUpChannelId: String, levelUpMessage: String, roleRewards: [{ levelRequired: Number, roleId: String }] },

    // 🤖 الذكاء الاصطناعي (Hybrid)
    aiSystem: {
        enabled: { type: Boolean, default: true },
        chatChannelId: String,
        allowUserChoice: { type: Boolean, default: true }, // السماح للعضو باختيار الشخصية والنوع بأمر
        defaultBoyName: { type: String, default: 'زيزو' },
        defaultGirlName: { type: String, default: 'سوسو' }
    }
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
