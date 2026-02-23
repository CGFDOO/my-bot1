const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    
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

    ticketPanels: { type: Array, default: [] },

    ticketControls: {
        ticketCounter: { type: Number, default: 1 }, 
        twoStepClose: { type: Boolean, default: true }, 
        transcriptChannelId: String,
        ticketLogChannelId: String,
        hideTicketOnClaim: { type: Boolean, default: false },
        readOnlyStaffOnClaim: { type: Boolean, default: false }
    },

    middlemanSystem: { type: Object, default: {} },

    ratings: {
        middlemanLogChannelId: String,
        staffLogChannelId: String,
        middlemanEmbedColor: { type: String, default: '#f2a658' },
        staffEmbedColor: { type: String, default: '#3ba55d' }
    },

    roles: {
        adminRoleId: String,
        highAdminRoles: { type: Array, default: [] },
        middlemanRoleId: String,
        tradePingRoleIds: { type: Array, default: [] },
        tradeApproveRoleIds: { type: Array, default: [] }
    },

    // ترسانة الأوامر الجديدة
    commands: {
        clearCmd: { type: String, default: 'clear' },
        comeCmd: { type: String, default: 'come' },
        taxCmd: { type: String, default: 'tax' },
        banCmd: { type: String, default: 'ban' },
        unbanCmd: { type: String, default: 'unban' }, 
        timeoutCmd: { type: String, default: 'timeout' },
        untimeoutCmd: { type: String, default: 'untimeout' }, 
        warnCmd: { type: String, default: 'warn' },
        unwarnCmd: { type: String, default: 'unwarn' }, 
        muteCmd: { type: String, default: 'mute' }, // الميوت الكتابي
        unmuteCmd: { type: String, default: 'unmute' },
        moveCmd: { type: String, default: 'move' }, // سحب للفويس
        lockCmd: { type: String, default: 'lock' }, // قفل الروم
        unlockCmd: { type: String, default: 'unlock' },
        hideCmd: { type: String, default: 'hide' }, // إخفاء الروم
        showCmd: { type: String, default: 'show' },
        tradeCmd: { type: String, default: 'trade' },
        doneCmd: { type: String, default: 'done' }, 
        approveCmd: { type: String, default: 'approve' },
        allowedRoles: { type: Object, default: {} } // لتخزين الصلاحيات
    },

    // السجلات شاملة كل التفاصيل
    serverLogs: {
        messageDeleteLogId: String, msgDelColor: { type: String, default: '#ed4245' },
        messageEditLogId: String, msgEditColor: { type: String, default: '#fee75c' },
        imageDeleteLogId: String, imgDelColor: { type: String, default: '#e67e22' },
        memberJoinLeaveLogId: String, joinColor: { type: String, default: '#3ba55d' }, leaveColor: { type: String, default: '#ed4245' },
        voiceStateLogId: String, voiceColor: { type: String, default: '#5865F2' },
        roleGiveTakeLogId: String, roleColor: { type: String, default: '#9b59b6' },
        channelCreateDeleteLogId: String, channelColor: { type: String, default: '#1abc9c' }, 
        threadCreateDeleteLogId: String, threadColor: { type: String, default: '#34495e' }, 
        reactionLogId: String, reactionColor: { type: String, default: '#e74c3c' }, 
        banKickLogId: String, banColor: { type: String, default: '#992d22' },
        unbanLogId: String, unbanColor: { type: String, default: '#2ecc71' }, // لوج فك الباند
        timeoutLogId: String, timeoutColor: { type: String, default: '#e67e22' }, // لوج التايم
        untimeoutLogId: String, untimeoutColor: { type: String, default: '#2ecc71' }, // لوج فك التايم
        warningsLogId: String, warnColor: { type: String, default: '#f1c40f' },
        unwarningsLogId: String, unwarnColor: { type: String, default: '#2ecc71' } 
    },

    warnings: { type: Object, default: {} },
    welcomeSystem: { type: Object, default: {} },
    protection: { type: Object, default: {} },
    economy: { type: Object, default: {} },
    leveling: { type: Object, default: {} },
    autoRoles: { type: Array, default: [] },
    autoResponders: { type: Array, default: [] },
    
    aiSystem: { type: Object, default: {} }
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
