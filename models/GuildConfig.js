const mongoose = require('mongoose');

const modalFieldSchema = new mongoose.Schema({ label: { type: String, required: true }, placeholder: { type: String, default: '' }, required: { type: Boolean, default: true } });
const ticketButtonSchema = new mongoose.Schema({ id: { type: String, required: true }, label: { type: String, required: true }, color: { type: String, default: 'Primary' }, categoryId: { type: String, default: null }, insideEmbedTitle: { type: String, default: 'مرحباً بك' }, insideEmbedDesc: { type: String, default: 'يرجى وضع الدلائل هنا...' }, insideEmbedColor: { type: String, default: '#2b2d31' }, requireModal: { type: Boolean, default: false }, modalTitle: { type: String, default: 'بيانات التكت' }, modalFields: [modalFieldSchema], isMediator: { type: Boolean, default: false } });
const autoResponderSchema = new mongoose.Schema({ word: { type: String, required: true }, reply: { type: String, required: true } });

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' },
    antiLinks: { type: Boolean, default: false },
    antiSpam: { type: Boolean, default: false },
    autoRoleId: { type: String, default: null },
    
    gamesEnabled: { type: Boolean, default: false },
    gamesChannelId: { type: String, default: null },
    levelingEnabled: { type: Boolean, default: false },
    levelUpChannelId: { type: String, default: null },
    suggestionChannelId: { type: String, default: null },
    
    welcomeChannelId: { type: String, default: null }, 
    welcomeMessage: { type: String, default: 'حياك الله يا [user] في [server]! أنت العضو رقم [memberCount].' },
    welcomeBgImage: { type: String, default: null }, 
    welcomeAvatarBorderColor: { type: String, default: '#ffffff' },
    
    warnPanelChannelId: { type: String, default: null },
    warnLogChannelId: { type: String, default: null },
    warnPanelTitle: { type: String, default: 'لوحة تحكم التحذيرات' },
    warnPanelDesc: { type: String, default: 'استخدم الأزرار أدناه لإدارة تحذيرات الأعضاء.' },
    warnPanelColor: { type: String, default: '#ed4245' },
    warnMax: { type: Number, default: 3 },
    warnAction: { type: String, default: 'timeout' },
    warnReasons: { type: [String], default: ['مخالفة القوانين', 'ألفاظ خارجة'] },
    
    panelChannelId: { type: String, default: null }, 
    defaultCategoryId: { type: String, default: null },
    ticketEmbedTitle: { type: String, default: 'MNC COMMUNITY' },
    ticketEmbedDesc: { type: String, default: 'قوانين التكتات: يُمنع فتح تذكرة لغير سبب...' },
    ticketEmbedColor: { type: String, default: '#0099ff' },
    ticketEmbedImage: { type: String, default: null },
    ticketCount: { type: Number, default: 0 },
    maxTicketsPerUser: { type: Number, default: 1 }, 
    customButtons: [ticketButtonSchema], 
    autoResponders: [autoResponderSchema],

    adminRoleId: { type: String, default: null }, 
    highAdminRoles: { type: [String], default: [] }, 
    mediatorRoleId: { type: String, default: null }, 
    highMediatorRoles: { type: [String], default: [] }, 
    hideTicketOnClaim: { type: Boolean, default: true },
    readOnlyStaffOnClaim: { type: Boolean, default: false },
    
    // الأوامر والرتب المسموحة لها
    cmdDone: { type: String, default: '!done' }, cmdDoneRoles: { type: [String], default: [] },
    cmdReqHigh: { type: String, default: '!req-high' }, cmdReqHighRoles: { type: [String], default: [] },
    cmdCome: { type: String, default: '!come' }, cmdComeRoles: { type: [String], default: [] },
    cmdTrade: { type: String, default: '!trade' }, cmdTradeRoles: { type: [String], default: [] },
    cmdClear: { type: String, default: '!clear' }, cmdClearRoles: { type: [String], default: [] },
    cmdLock: { type: String, default: '!lock' }, cmdLockRoles: { type: [String], default: [] },
    cmdUnlock: { type: String, default: '!unlock' }, cmdUnlockRoles: { type: [String], default: [] },
    cmdVmove: { type: String, default: '!vmove' }, cmdVmoveRoles: { type: [String], default: [] },
    cmdBan: { type: String, default: '!ban' }, cmdBanRoles: { type: [String], default: [] },
    cmdTimeout: { type: String, default: '!timeout' }, cmdTimeoutRoles: { type: [String], default: [] },
    
    // اللوجات الشاملة
    transcriptChannelId: { type: String, default: null }, 
    ticketLogChannelId: { type: String, default: null }, 
    staffRatingChannelId: { type: String, default: null }, 
    mediatorRatingChannelId: { type: String, default: null }, 
    logRoleCreateDeleteId: { type: String, default: null }, 
    logMemberRoleUpdateId: { type: String, default: null }, 
    logJoinLeaveId: { type: String, default: null }, 
    logMsgDeleteId: { type: String, default: null }, 
    logMsgUpdateId: { type: String, default: null }, 
    logImgDeleteId: { type: String, default: null }, 
    logVoiceId: { type: String, default: null },
    logInviteId: { type: String, default: null }, // دعوات
    logChannelThreadId: { type: String, default: null }, // رومات وثريد
    logBanUnbanId: { type: String, default: null }, // باند وفك باند
    logTimeoutId: { type: String, default: null } // تايم وفك تايم
});

module.exports = mongoose.model('GuildConfig', guildConfigSchema);
