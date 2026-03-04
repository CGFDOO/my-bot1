const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    language: { type: String, default: 'ar' },
    slashCommandsEnabled: { type: Boolean, default: true },
    botOwnerId: { type: String, default: '' },

    embedSetup: { primaryColor: String, successColor: String, errorColor: String, footerText: String, footerIconUrl: String, thumbnailUrl: String },
    aiSystem: { enabled: Boolean, allowUserChoice: Boolean, defaultBoyName: String, defaultGirlName: String, chatChannelId: String },
    
    ticketPanels: { type: Array, default: [] },
    autoResponders: { type: Array, default: [] },
    autoLine: { trigger: String, imageUrl: String, deleteTrigger: Boolean },

    middlemanSystem: { enabled: Boolean, categoryId: String, panelChannelId: String, panelTitle: String, panelColor: String, panelDescription: String, buttonLabel: String, modalTitle: String, modalFields: Array, insideTicketTitle: String, insideTicketColor: String, insideTicketDescription: String, modalAnswersEmbedColor: String },
    ticketControls: { twoStepClose: Boolean, ticketCounter: Number, transcriptChannelId: String, ticketLogChannelId: String, hideTicketOnClaim: Boolean, readOnlyStaffOnClaim: Boolean },
    warnings: { maxWarnings: Number, autoAction: String, panelChannelId: String, panelColor: String, panelTitle: String, panelDescription: String, reasonsDataAr: Array, reasonsDataEn: Array },
    roles: { adminRoleId: String, middlemanRoleId: String, highAdminRoles: Array, tradePingRoleIds: Array, tradeApproveRoleIds: Array },
    protection: { antiLinkEnabled: Boolean, antiSpamEnabled: Boolean, antiNukeEnabled: Boolean },
    
    welcomeSystem: { welcomeEnabled: Boolean, welcomeChannelId: String, backgroundUrl: String, welcomeMessage: String, avatarBorderHex: String, textColorHex: String, leaveEnabled: Boolean, leaveChannelId: String, leaveMessage: String },
    economy: { enabled: Boolean, taxPercentage: Number, dailyMin: Number, dailyMax: Number },
    leveling: { enabled: Boolean, levelUpChannelId: String, levelUpMessage: String, topDailyCmd: String, topWeeklyCmd: String, topMonthlyCmd: String, topGlobalCmd: String, roleRewards: Array },
    commands: { banCmd: String, unbanCmd: String, timeoutCmd: String, untimeoutCmd: String, warnCmd: String, unwarnCmd: String, muteCmd: String, unmuteCmd: String, taxCmd: String, clearCmd: String, comeCmd: String, moveCmd: String, lockCmd: String, unlockCmd: String, tradeCmd: String, approveCmd: String, doneCmd: String, allowedRoles: Object },
    serverLogs: { reactionLogId: String, reactionColor: String, channelCreateDeleteLogId: String, channelColor: String, threadCreateDeleteLogId: String, threadColor: String, roleCreateDeleteLogId: String, roleCreateColor: String, banKickLogId: String, banColor: String, unbanLogId: String, unbanColor: String, timeoutLogId: String, timeoutColor: String, untimeoutLogId: String, untimeoutColor: String, warningsLogId: String, warnColor: String, unwarningsLogId: String, unwarnColor: String, messageDeleteLogId: String, msgDelColor: String, messageEditLogId: String, msgEditColor: String, imageDeleteLogId: String, imgDelColor: String, roleGiveTakeLogId: String, roleColor: String, memberJoinLeaveLogId: String, joinColor: String, leaveColor: String },
    ratings: { staffLogChannelId: String, staffEmbedColor: String, middlemanLogChannelId: String, middlemanEmbedColor: String }
});

// 🚀 السطر السحري: "لو الموديل موجود مسبقاً استخدمه، لو مش موجود اعمله من جديد"
module.exports = mongoose.models.GuildSettings || mongoose.model('GuildSettings', guildSettingsSchema);
