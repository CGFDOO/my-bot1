// =========================================================================================================
// 🌐 محرك لوحة التحكم العملاق (ULTIMATE ENTERPRISE DASHBOARD SERVER - V6 THE BEAST)
// ---------------------------------------------------------------------------------------------------------
// تمت إضافة: ألوان اللوجات الفردية، أوامر فك العقوبات، بانل التحذيرات المخصص، وذكاء الـ AI المتعدد.
// =========================================================================================================

const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const GuildConfigDatabaseModel = require('../models/GuildConfig');
const { EmbedBuilder } = require('discord.js');

// =========================================================================================================
// ⚙️ 1. الإعدادات الأساسية
// =========================================================================================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// توسيع الحجم لاستيعاب كل بيانات البانلات والقوانين
app.use(express.urlencoded({ extended: true, limit: '200mb', parameterLimit: 200000 }));
app.use(express.json({ limit: '200mb' }));

app.use(session({
    secret: 'ENTERPRISE_ULTIMATE_SECRET_KEY_FOR_DASHBOARD',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } 
}));

app.use(passport.initialize());
app.use(passport.session());

// =========================================================================================================
// 🔑 2. نظام تسجيل الدخول (Discord OAuth2)
// =========================================================================================================

passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID, 
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL, 
    scope: ['identify', 'guilds'] 
}, function(accessToken, refreshToken, userProfile, done) {
    return done(null, userProfile);
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// =========================================================================================================
// 🛡️ 3. دوال الحماية والتنظيف (Middleware)
// =========================================================================================================

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/auth/discord'); 
}

function cleanArray(rawInput) {
    if (!rawInput) return [];
    if (Array.isArray(rawInput)) return rawInput.filter(i => i && String(i).trim() !== '');
    if (typeof rawInput === 'string') return rawInput.split(',').map(i => i.trim()).filter(i => i !== '');
    return [];
}

function cleanString(rawInput, defaultVal = null) {
    if (!rawInput) return defaultVal;
    const str = String(rawInput).trim();
    return (str === '' || str === 'none') ? defaultVal : str;
}

// =========================================================================================================
// 🌐 4. المسارات الأساسية والعرض
// =========================================================================================================

app.get('/auth/discord', passport.authenticate('discord'));
app.get('/callback', passport.authenticate('discord', { failureRedirect: '/?error=auth_failed' }), (req, res) => res.redirect('/dashboard'));
app.get('/logout', (req, res, next) => { req.logout((err) => { if (err) return next(err); res.redirect('/'); }); });
app.get('/', (req, res) => res.render('index', { user: req.user || null }));

app.get('/dashboard', checkAuth, (req, res) => {
    const adminGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20 || (g.permissions & 0x8) === 0x8);
    res.render('dashboard', { user: req.user, guilds: adminGuilds });
});

app.get('/settings/:guildId', checkAuth, async (req, res) => {
    const guildId = req.params.guildId;
    const hasAccess = req.user.guilds.some(g => g.id === guildId && ((g.permissions & 0x20) === 0x20 || (g.permissions & 0x8) === 0x8));
    if (!hasAccess) return res.send('<h1 style="color:red; text-align:center;">❌ غير مصرح لك بإدارة هذا السيرفر.</h1>');

    try {
        let config = await GuildConfigDatabaseModel.findOne({ guildId });
        if (!config) config = new GuildConfigDatabaseModel({ guildId }); 

        // تأمين الهياكل الداخلية لتجنب الأخطاء (Anti-Crash)
        if (!config.embedSetup) config.embedSetup = {};
        if (!config.middlemanSystem) config.middlemanSystem = {};
        if (!config.ticketControls) config.ticketControls = {};
        if (!config.ratings) config.ratings = {};
        if (!config.roles) config.roles = {};
        if (!config.commands) config.commands = { allowedRoles: new Map() };
        if (!config.serverLogs) config.serverLogs = {};
        if (!config.warnings) config.warnings = { presetReasonsAr: [], presetReasonsEn: [] };
        if (!config.welcomeSystem) config.welcomeSystem = {};
        if (!config.protection) config.protection = {};
        if (!config.economy) config.economy = {};
        if (!config.leveling) config.leveling = {};
        if (!config.aiSystem) config.aiSystem = {};

        await config.save(); 
        res.render('settings', { user: req.user, guildId, config, bot: req.app.locals.client });
    } catch (err) {
        console.error('[RENDER CRITICAL ERROR]', err);
        res.send('<h1 style="color:red; text-align:center;">❌ حدث خطأ أثناء تحميل الإعدادات. يرجى مراجعة الكونسول.</h1>');
    }
});

// =========================================================================================================
// 🚀 5. صانع الإيمبد الفوري
// =========================================================================================================

app.post('/api/send-embed/:guildId', checkAuth, async (req, res) => {
    const guildId = req.params.guildId;
    const hasAccess = req.user.guilds.some(g => g.id === guildId && ((g.permissions & 0x20) === 0x20 || (g.permissions & 0x8) === 0x8));
    if (!hasAccess) return res.status(403).json({ error: 'Forbidden' });

    const { channelId, title, description, color, imageUrl } = req.body;
    const bot = req.app.locals.client;
    
    try {
        const guild = bot.guilds.cache.get(guildId);
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return res.status(404).json({ error: 'الروم غير موجودة' });

        const customEmbed = new EmbedBuilder()
            .setTitle(title || null)
            .setDescription(description || null)
            .setColor(color || '#5865F2')
            .setTimestamp();
        
        if (imageUrl) customEmbed.setImage(imageUrl);

        await channel.send({ embeds: [customEmbed] });
        res.json({ success: true, message: 'تم إرسال الإيمبد بنجاح!' });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ أثناء إرسال الإيمبد.' });
    }
});

// =========================================================================================================
// 💾 6. مسار الحفظ العملاق (The Master POST Route)
// =========================================================================================================

app.post('/settings/:guildId/save', checkAuth, async (req, res) => {
    const guildId = req.params.guildId;
    const hasAccess = req.user.guilds.some(g => g.id === guildId && ((g.permissions & 0x20) === 0x20 || (g.permissions & 0x8) === 0x8));
    if (!hasAccess) return res.status(403).send('Forbidden');

    try {
        const body = req.body;
        let config = await GuildConfigDatabaseModel.findOne({ guildId });
        if (!config) config = new GuildConfigDatabaseModel({ guildId });

        // 1️⃣ الإعدادات العامة
        config.prefix = cleanString(body.prefix, '!');
        config.language = cleanString(body.language, 'ar');
        config.embedSetup.successColor = cleanString(body.emb_successColor, '#3ba55d');
        config.embedSetup.errorColor = cleanString(body.emb_errorColor, '#ed4245');
        config.embedSetup.primaryColor = cleanString(body.emb_primaryColor, '#5865F2');
        config.embedSetup.footerText = cleanString(body.emb_footerText, 'Enterprise System');
        config.embedSetup.footerIconUrl = cleanString(body.emb_footerIconUrl);
        config.embedSetup.thumbnailUrl = cleanString(body.emb_thumbnailUrl);

        // 2️⃣ البانلات الديناميكية
        if (body.ticketPanelsData) {
            try { config.ticketPanels = JSON.parse(body.ticketPanelsData); } catch(e){}
        }

        // 3️⃣ تحكم التذاكر
        config.ticketControls.ticketCounter = parseInt(body.tc_ticketCounter) || 1;
        config.ticketControls.twoStepClose = (body.tc_twoStepClose === 'on');
        config.ticketControls.transcriptChannelId = cleanString(body.tc_transcriptChannelId);
        config.ticketControls.ticketLogChannelId = cleanString(body.tc_ticketLogChannelId);
        config.ticketControls.hideTicketOnClaim = (body.tc_hideTicketOnClaim === 'on');
        config.ticketControls.readOnlyStaffOnClaim = (body.tc_readOnlyStaffOnClaim === 'on');

        // 4️⃣ نظام الوساطة
        config.middlemanSystem.enabled = (body.mm_enabled === 'on');
        config.middlemanSystem.categoryId = cleanString(body.mm_categoryId);
        config.middlemanSystem.panelChannelId = cleanString(body.mm_panelChannelId);
        config.middlemanSystem.panelTitle = cleanString(body.mm_panelTitle, 'تذكرة وساطة آمنة');
        config.middlemanSystem.panelDescription = cleanString(body.mm_panelDescription, 'لطلب وسيط معتمد، يرجى فتح تذكرة.');
        config.middlemanSystem.panelColor = cleanString(body.mm_panelColor, '#f2a658');
        config.middlemanSystem.buttonLabel = cleanString(body.mm_buttonLabel, 'طلب وسيط');
        config.middlemanSystem.modalTitle = cleanString(body.mm_modalTitle, 'بيانات الوساطة');
        if (body.mm_modalFieldsData) {
            try { config.middlemanSystem.modalFields = JSON.parse(body.mm_modalFieldsData); } catch(e){}
        }
        config.middlemanSystem.insideTicketTitle = cleanString(body.mm_insideTicketTitle, 'تذكرة الوساطة');
        config.middlemanSystem.insideTicketDescription = cleanString(body.mm_insideTicketDescription, 'يرجى انتظار الوسيط.');
        config.middlemanSystem.insideTicketColor = cleanString(body.mm_insideTicketColor, '#f2a658');
        config.middlemanSystem.modalAnswersEmbedColor = cleanString(body.mm_modalAnswersEmbedColor, '#f2a658');

        // 5️⃣ التقييمات المزدوجة
        config.ratings.middlemanLogChannelId = cleanString(body.rating_middlemanLogChannelId);
        config.ratings.staffLogChannelId = cleanString(body.rating_staffLogChannelId);
        config.ratings.middlemanEmbedColor = cleanString(body.rating_middlemanEmbedColor, '#f2a658');
        config.ratings.staffEmbedColor = cleanString(body.rating_staffEmbedColor, '#3ba55d');

        // 6️⃣ الرتب
        config.roles.adminRoleId = cleanString(body.role_adminRoleId);
        config.roles.middlemanRoleId = cleanString(body.role_middlemanRoleId);
        config.roles.highAdminRoles = cleanArray(body.role_highAdminRoles);
        config.roles.tradePingRoleIds = cleanArray(body.role_tradePingRoleIds);
        config.roles.tradeApproveRoleIds = cleanArray(body.role_tradeApproveRoleIds);

        // 7️⃣ الأوامر الذكية (مع نظام الـ Map)
        config.commands.clearCmd = cleanString(body.cmd_clearCmd, 'clear');
        config.commands.comeCmd = cleanString(body.cmd_comeCmd, 'come');
        config.commands.taxCmd = cleanString(body.cmd_taxCmd, 'tax');
        config.commands.banCmd = cleanString(body.cmd_banCmd, 'ban');
        config.commands.unbanCmd = cleanString(body.cmd_unbanCmd, 'unban');
        config.commands.timeoutCmd = cleanString(body.cmd_timeoutCmd, 'timeout');
        config.commands.untimeoutCmd = cleanString(body.cmd_untimeoutCmd, 'untimeout');
        config.commands.warnCmd = cleanString(body.cmd_warnCmd, 'warn');
        config.commands.unwarnCmd = cleanString(body.cmd_unwarnCmd, 'unwarn');
        config.commands.tradeCmd = cleanString(body.cmd_tradeCmd, 'trade');
        config.commands.doneCmd = cleanString(body.cmd_doneCmd, 'done');
        config.commands.approveCmd = cleanString(body.cmd_approveCmd, 'approve');

        // تحديث الرتب المسموحة لكل أمر في الـ Map
        if (!config.commands.allowedRoles) config.commands.allowedRoles = new Map();
        config.commands.allowedRoles.set('clear', cleanArray(body.role_clearAllowed));
        config.commands.allowedRoles.set('come', cleanArray(body.role_comeAllowed));
        config.commands.allowedRoles.set('tax', cleanArray(body.role_taxAllowed));
        config.commands.allowedRoles.set('ban', cleanArray(body.role_banAllowed));
        config.commands.allowedRoles.set('unban', cleanArray(body.role_unbanAllowed));
        config.commands.allowedRoles.set('timeout', cleanArray(body.role_timeoutAllowed));
        config.commands.allowedRoles.set('untimeout', cleanArray(body.role_untimeoutAllowed));
        config.commands.allowedRoles.set('warn', cleanArray(body.role_warnAllowed));
        config.commands.allowedRoles.set('unwarn', cleanArray(body.role_unwarnAllowed));
        config.commands.allowedRoles.set('trade', cleanArray(body.role_tradeAllowed));
        config.commands.allowedRoles.set('done', cleanArray(body.role_doneAllowed));
        config.commands.allowedRoles.set('approve', cleanArray(body.role_approveAllowed));

        // 8️⃣ السجلات (كل لوج له ID ولون)
        config.serverLogs.messageDeleteLogId = cleanString(body.log_messageDeleteLogId);
        config.serverLogs.msgDelColor = cleanString(body.log_msgDelColor, '#ed4245');
        
        config.serverLogs.messageEditLogId = cleanString(body.log_messageEditLogId);
        config.serverLogs.msgEditColor = cleanString(body.log_msgEditColor, '#fee75c');
        
        config.serverLogs.imageDeleteLogId = cleanString(body.log_imageDeleteLogId);
        config.serverLogs.imgDelColor = cleanString(body.log_imgDelColor, '#e67e22');
        
        config.serverLogs.memberJoinLeaveLogId = cleanString(body.log_memberJoinLeaveLogId);
        config.serverLogs.joinColor = cleanString(body.log_joinColor, '#3ba55d');
        config.serverLogs.leaveColor = cleanString(body.log_leaveColor, '#ed4245');
        
        config.serverLogs.voiceStateLogId = cleanString(body.log_voiceStateLogId);
        config.serverLogs.voiceColor = cleanString(body.log_voiceColor, '#5865F2');
        
        config.serverLogs.roleGiveTakeLogId = cleanString(body.log_roleGiveTakeLogId);
        config.serverLogs.roleColor = cleanString(body.log_roleColor, '#9b59b6');
        
        config.serverLogs.channelCreateDeleteLogId = cleanString(body.log_channelCreateDeleteLogId);
        config.serverLogs.channelColor = cleanString(body.log_channelColor, '#1abc9c');
        
        config.serverLogs.threadCreateDeleteLogId = cleanString(body.log_threadCreateDeleteLogId);
        config.serverLogs.threadColor = cleanString(body.log_threadColor, '#34495e');
        
        config.serverLogs.reactionLogId = cleanString(body.log_reactionLogId);
        config.serverLogs.reactionColor = cleanString(body.log_reactionColor, '#e74c3c');
        
        config.serverLogs.banKickLogId = cleanString(body.log_banKickLogId);
        config.serverLogs.banColor = cleanString(body.log_banColor, '#992d22');
        
        config.serverLogs.warningsLogId = cleanString(body.log_warningsLogId);
        config.serverLogs.warnColor = cleanString(body.log_warnColor, '#f1c40f');
        
        config.serverLogs.unwarningsLogId = cleanString(body.log_unwarningsLogId);
        config.serverLogs.unwarnColor = cleanString(body.log_unwarnColor, '#2ecc71');

        // 9️⃣ التحذيرات وبانل الإدارة
        config.warnings.maxWarnings = parseInt(body.warn_maxWarnings) || 3;
        config.warnings.autoAction = cleanString(body.warn_autoAction, 'timeout');
        if (body.warn_presetReasonsAr) config.warnings.presetReasonsAr = body.warn_presetReasonsAr.split('\n').map(r=>r.trim()).filter(r=>r!=='');
        if (body.warn_presetReasonsEn) config.warnings.presetReasonsEn = body.warn_presetReasonsEn.split('\n').map(r=>r.trim()).filter(r=>r!=='');
        
        config.warnings.panelChannelId = cleanString(body.warn_panelChannelId);
        config.warnings.panelTitle = cleanString(body.warn_panelTitle, 'لوحة تحكم التحذير');
        config.warnings.panelDescription = cleanString(body.warn_panelDescription, 'استخدم الأزرار أدناه لإدارة تحذيرات الأعضاء.');
        config.warnings.panelColor = cleanString(body.warn_panelColor, '#ed4245');

        // 🔟 الترحيب، الحماية والاقتصاد والـ AI
        config.welcomeSystem.enabled = (body.wel_enabled === 'on');
        config.welcomeSystem.channelId = cleanString(body.wel_channelId);
        config.welcomeSystem.messageText = cleanString(body.wel_messageText);
        config.welcomeSystem.backgroundUrl = cleanString(body.wel_backgroundUrl);
        config.welcomeSystem.avatarBorderHex = cleanString(body.wel_avatarBorderHex, '#ffffff');

        config.protection.antiLinkEnabled = (body.prot_antiLinkEnabled === 'on');
        config.protection.antiSpamEnabled = (body.prot_antiSpamEnabled === 'on');
        config.protection.antiNukeEnabled = (body.prot_antiNukeEnabled === 'on');

        config.economy.enabled = (body.eco_enabled === 'on');
        config.economy.taxPercentage = parseInt(body.eco_taxPercentage) || 5;

        config.aiSystem.enabled = (body.ai_enabled === 'on');
        config.aiSystem.chatChannelId = cleanString(body.ai_chatChannelId);
        config.aiSystem.allowUserChoice = (body.ai_allowUserChoice === 'on');
        config.aiSystem.defaultBoyName = cleanString(body.ai_defaultBoyName, 'زيزو');
        config.aiSystem.defaultGirlName = cleanString(body.ai_defaultGirlName, 'سوسو');

        // حفظ كل العظمة
        await config.save();
        res.redirect(`/settings/${guildId}?success=true`);

    } catch (err) {
        console.error('[CRITICAL DB ERROR]', err);
        res.redirect(`/settings/${guildId}?error=true`);
    }
});

module.exports = (client) => {
    app.locals.client = client;
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log(`\n[DASHBOARD V6 BEAST] 🌐 Ultimate Enterprise Dashboard Online on PORT: ${PORT}\n`);
    });
};
