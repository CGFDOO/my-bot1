const mongoose = require('mongoose');

// تصميم شكل "الزرار" المخصص اللي هتعمله من الداشبورد
const ticketButtonSchema = new mongoose.Schema({
    id: { type: String, required: true }, // e.g., btn_support
    label: { type: String, required: true }, // اسم الزرار (مثلاً: زيزو أو دعم فني)
    color: { type: String, default: 'Primary' }, // لون الزرار (Primary, Secondary, Success, Danger)
    categoryId: { type: String, default: null }, // الكاتيجوري اللي التكت هيفتح فيه
    welcomeMessage: { type: String, default: 'مرحباً بك في التكت' }, // رسالة الترحيب الخاصة بالزرار ده
    requireModal: { type: Boolean, default: false }, // هل يفتح نافذة (Modal) يكتب فيها بيانات؟
    modalTitle: { type: String, default: 'اكتب تفاصيلك' }, // عنوان النافذة
    isMediator: { type: Boolean, default: false } // هل التكت ده للوساطة عشان يتبعتله تقييم وسطاء في الآخر؟
});

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    
    // 🎟️ إعدادات لوحة التكتات الأساسية (Panel)
    panelChannelId: { type: String, default: null }, // الروم اللي هيتبعت فيها بانر التكتات
    ticketEmbedTitle: { type: String, default: 'الدعم الفني والوساطة' },
    ticketEmbedDesc: { type: String, default: 'اضغط على الزر لفتح تذكرة.' },
    ticketEmbedColor: { type: String, default: '#0099ff' },
    ticketCount: { type: Number, default: 0 },
    
    // 🔘 الأزرار المخصصة اللي صاحب السيرفر هيصممها
    customButtons: [ticketButtonSchema], 

    // 👨‍⚖️ نظام الإدارة والوساطة
    staffRoleId: { type: String, default: null },
    adminRoles: { type: [String], default: [] }, // مصفوفة عشان تستقبل أكتر من رتبة عليا
    
    // 🔥 زراير التحكم في استلام التكت (Claim)
    hideTicketOnClaim: { type: Boolean, default: true }, // إخفاء التكت عن باقي الإدارة
    readOnlyStaffOnClaim: { type: Boolean, default: false }, // وضع المراقبة: الإدارة تشوف بس متكتبش
    
    // ⌨️ الأوامر المخصصة
    cmdDone: { type: String, default: '!done' },
    cmdCome: { type: String, default: '!come' },
    cmdApprove: { type: String, default: '!req-high' },
    cmdTrade: { type: String, default: '!trade' },
    
    // 📁 السجلات والتقييمات (منفصلة تماماً)
    transcriptChannelId: { type: String, default: null },
    ticketLogChannelId: { type: String, default: null }, // لوج التكتات الأساسي
    staffRatingChannelId: { type: String, default: null }, // روم تقييم الإدارة
    mediatorRatingChannelId: { type: String, default: null }, // روم تقييم الوسطاء
    
    // 🛡️ لوجات حماية السيرفر (Audit Logs)
    logRoleCreateId: { type: String, default: null },
    logJoinLeaveId: { type: String, default: null },
    logMsgDeleteId: { type: String, default: null },
    logImgDeleteId: { type: String, default: null },
    logVoiceId: { type: String, default: null }
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
