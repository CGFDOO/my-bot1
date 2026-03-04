const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    language: { type: String, default: 'ar' },
    slashCommandsEnabled: { type: Boolean, default: true },
    botOwnerId: { type: String, default: '' },

    embedSetup: {
        primaryColor: { type: String, default: '#5865F2' },
        successColor: { type: String, default: '#3ba55d' },
        errorColor: { type: String, default: '#ed4245' },
        footerText: { type: String, default: 'System Control' },
        footerIconUrl: { type: String, default: '' },
        thumbnailUrl: { type: String, default: '' }
    },

    aiSystem: {
        enabled: { type: Boolean, default: false },
        allowUserChoice: { type: Boolean, default: true },
        defaultBoyName: { type: String, default: 'مروان' },
        defaultGirlName: { type: String, default: 'مريم' },
        chatChannelId: { type: String, default: '' }
    },

    // مصفوفات (عشان النوافذ والردود المتعددة)
    ticketPanels: { type: Array, default: [] },
    autoResponders: { type: Array, default: [] },
    
    autoLine: {
        trigger: { type: String, default: 'خط' },
        imageUrl: { type: String, default: '' },
        deleteTrigger: { type: Boolean, default: false }
    },

    middlemanSystem: {
        enabled: { type: Boolean, default: false },
        categoryId: { type: String, default: '' },
        panelChannelId: { type: String, default: '' },
        panelTitle: { type: String, default: 'وسيط أمن' },
        panelColor: { type: String, default: '#ffffff' },
        panelDescription: { type: String, default: 'اضغط هنا لطلب وسيط' },
        buttonLabel: { type: String, default: 'طلب وسيط' },
        modalTitle: { type: String, default: 'معلومات الوساطة' },
        modalFields: { type: Array, default: [] },
        insideTicketTitle: { type: String, default: 'تذكرة وسيط' },
        insideTicketColor: { type: String, default: '#00ff00' },
        insideTicketDescription: { type: String, default: 'يرجى انتظار الوسيط' },
        modalAnswersEmbedColor: { type: String, default: '#ffff00' }
    },

    ticketControls: {
        twoStepClose: { type: Boolean, default: true },
        ticketCounter: { type: Number, default: 1 },
        transcriptChannelId: { type: String, default: '' },
        ticketLogChannelId: { type: String, default: '' },
        hideTicketOnClaim: { type: Boolean, default: false },
        readOnlyStaffOnClaim: { type: Boolean, default: false }
    },

    warnings: {
        maxWarnings: { type: Number, default: 3 },
        autoAction: { type: String, default: 'mute' },
        panelChannelId: { type: String, default: '' },
        panelColor: { type: String, default: '#ff0000' },
        panelTitle: { type: String, default: 'نظام التحذيرات' },
        panelDescription: { type: String, default: 'تحذيرات الأعضاء' },
        reasonsDataAr: { type: Array, default: [] },
        reasonsDataEn: { type: Array, default: [] }
    },

    roles: {
        adminRoleId: { type: String, default: '' },
        middlemanRoleId: { type: String, default: '' },
        highAdminRoles: { type: Array, default: [] },
        tradePingRoleIds: { type: Array, default: [] },
        tradeApproveRoleIds: { type: Array, default: [] }
    },

    protection: {
        antiLinkEnabled: { type: Boolean, default: false },
        antiSpamEnabled: { type: Boolean, default: false },
        antiNukeEnabled: { type: Boolean, default: false }
    }
});

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);
