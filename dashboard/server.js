// =========================================================================================================
// 🌐 محرك لوحة التحكم العملاق (ULTIMATE ENTERPRISE DASHBOARD SERVER - THE FINAL BOSS)
// ---------------------------------------------------------------------------------------------------------
// تمت مراجعة جميع طلبات الإمبراطور: (صانع الإيمبد الفوري، التقييمات المفصلة، الموافقة العليا، واللوجات الشاملة).
// =========================================================================================================

const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const GuildConfigDatabaseModel = require('../models/GuildConfig');
const { EmbedBuilder } = require('discord.js'); // لإنشاء الإيمبدات الفورية من الداشبورد

// =========================================================================================================
// ⚙️ 1. الإعدادات الأساسية
// =========================================================================================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// توسيع الحجم لاستيعاب كل بيانات البانلات والقوانين
app.use(express.urlencoded({ extended: true, limit: '100mb', parameterLimit: 100000 }));
app.use(express.json({ limit: '100mb' }));

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
    if (!hasAccess) return res.send('<h1 style="color:red; text-align:center;">❌ غير مصرح لك.</h1>');

    try {
        let config = await GuildConfigDatabaseModel.findOne({ guildId });
        if (!config) { config = new GuildConfigDatabaseModel({ guildId }); await config.save(); }
        res.render('settings', { user: req.user, guildId, config, bot: req.app.locals.client });
    } catch (err) {
        res.send('<h1 style="color:red;">❌ حدث خطأ.</h1>');
    }
});

// =========================================================================================================
// 🚀 5. مسار صانع الإيمبد الفوري (Live Embed Maker Route)
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

        // 1️⃣ العامة والألوان
        config.prefix = cleanString(body.prefix, '!');
        config.language = cleanString(body.language, 'ar');
        if (!config.embedSetup) config.embedSetup = {};
        config.embedSetup.successColor = cleanString(body.emb_successColor, '#3ba55d');
        config.embedSetup.errorColor = cleanString(body.emb_errorColor, '#ed4245');
        config.embedSetup.primaryColor = cleanString(body.emb_primaryColor, '#5865F2');
        config.embedSetup.footerText = cleanString(body.emb_footerText, 'Enterprise System');
        config.embedSetup.footerIconUrl = cleanString(body.emb_footerIconUrl);
        config.embedSetup.thumbnailUrl = cleanString(body.emb_thumbnailUrl);

        // 2️⃣ البانلات الديناميكية (Frontend will compile buttons/modals into this JSON string)
        if (body.ticketPanelsData) {
            try { config.ticketPanels = JSON.parse(body.ticketPanelsData); } catch(e){}
        }

        // 3️⃣ تحكم التذاكر والترانسكريبت
        if (!config.ticketControls) config.ticketControls = {};
        if (body.tc_ticketCounter) config.ticketControls.ticketCounter = parseInt(body.tc_ticketCounter) || 1;
        config.ticketControls.controlPanelColor = cleanString(body.tc_controlPanelColor, '#2b2d31');
        config.ticketControls.ticketLogChannelId = cleanString(body.tc_ticketLogChannelId);
        config.ticketControls.transcriptChannelId = cleanString(body.tc_transcriptChannelId);
        config.ticketControls.hideTicketOnClaim = (body.tc_hideTicketOnClaim === 'on');
        config.ticketControls.readOnlyStaffOnClaim = (body.tc_readOnlyStaffOnClaim === 'on');

        // 4️⃣ التقييمات المزدوجة (DM & Logs)
        if (!config.ratings) config.ratings = {};
        config.ratings.middlemanLogChannelId = cleanString(body.rating_middlemanLogChannelId);
        config.ratings.staffLogChannelId = cleanString(body.rating_staffLogChannelId);
        config.ratings.middlemanEmbedColor = cleanString(body.rating_middlemanEmbedColor, '#f2a658');
        config.ratings.staffEmbedColor = cleanString(body.rating_staffEmbedColor, '#3ba55d');
        if (body.rating_customReviewOptions) {
            config.ratings.customReviewOptions = body.rating_customReviewOptions.split('\n').map(r => r.trim()).filter(r => r !== '');
        }
        config.ratings.allowCustomText = (body.rating_allowCustomText === 'on');

        // 5️⃣ الرتب والصلاحيات (Multiple Approvals)
        if (!config.roles) config.roles = {};
        config.roles.adminRoleId = cleanString(body.role_adminRoleId);
        config.roles.middlemanRoleId = cleanString(body.role_middlemanRoleId);
        config.roles.highAdminRoles = cleanArray(body.role_highAdminRoles);
        config.roles.tradePingRoleIds = cleanArray(body.role_tradePingRoleIds);
        config.roles.tradeApproveRoleIds = cleanArray(body.role_tradeApproveRoleIds);

        // 6️⃣ الأوامر الديناميكية
        if (!config.commands) config.commands = {};
        config.commands.clearCmd = cleanString(body.cmd_clearCmd, 'clear');
        config.commands.clearAllowedRoles = cleanArray(body.cmd_clearAllowedRoles);
        config.commands.banCmd = cleanString(body.cmd_banCmd, 'ban');
        config.commands.banAllowedRoles = cleanArray(body.cmd_banAllowedRoles);
        config.commands.timeoutCmd = cleanString(body.cmd_timeoutCmd, 'timeout');
        config.commands.timeoutAllowedRoles = cleanArray(body.cmd_timeoutAllowedRoles);
        config.commands.comeCmd = cleanString(body.cmd_comeCmd, 'come');
        config.commands.comeAllowedRoles = cleanArray(body.cmd_comeAllowedRoles);
        config.commands.doneCmd = cleanString(body.cmd_doneCmd, 'done');
        config.commands.doneAllowedRoles = cleanArray(body.cmd_doneAllowedRoles);
        config.commands.tradeCmd = cleanString(body.cmd_tradeCmd, 'trade');
        config.commands.tradeAllowedRoles = cleanArray(body.cmd_tradeAllowedRoles);
        config.commands.approveCmd = cleanString(body.cmd_approveCmd, 'approve');
        config.commands.approveAllowedRoles = cleanArray(body.cmd_approveAllowedRoles);

        // 7️⃣ السجلات الدقيقة (Ultra Logs)
        if (!config.serverLogs) config.serverLogs = {};
        config.serverLogs.messageDeleteLogId = cleanString(body.log_messageDeleteLogId);
        config.serverLogs.messageEditLogId = cleanString(body.log_messageEditLogId);
        config.serverLogs.imageDeleteLogId = cleanString(body.log_imageDeleteLogId);
        config.serverLogs.memberJoinLeaveLogId = cleanString(body.log_memberJoinLeaveLogId);
        config.serverLogs.voiceStateLogId = cleanString(body.log_voiceStateLogId);
        config.serverLogs.roleGiveTakeLogId = cleanString(body.log_roleGiveTakeLogId);
        config.serverLogs.roleCreateDeleteLogId = cleanString(body.log_roleCreateDeleteLogId);
        config.serverLogs.banKickLogId = cleanString(body.log_banKickLogId);
        config.serverLogs.suggestionsLogId = cleanString(body.log_suggestionsLogId);
        config.serverLogs.warningsLogId = cleanString(body.log_warningsLogId);

        // 8️⃣ التحذيرات والقوانين باللغتين
        if (!config.warnings) config.warnings = { presetReasonsAr: [], presetReasonsEn: [] };
        config.warnings.maxWarnings = parseInt(body.warn_maxWarnings) || 3;
        config.warnings.autoAction = cleanString(body.warn_autoAction, 'timeout');
        if (body.warn_presetReasonsAr) config.warnings.presetReasonsAr = body.warn_presetReasonsAr.split('\n').map(r=>r.trim()).filter(r=>r!=='');
        if (body.warn_presetReasonsEn) config.warnings.presetReasonsEn = body.warn_presetReasonsEn.split('\n').map(r=>r.trim()).filter(r=>r!=='');
        config.warnings.serverRulesAr = cleanString(body.warn_serverRulesAr, 'الرجاء الالتزام بقوانين السيرفر.');
        config.warnings.serverRulesEn = cleanString(body.warn_serverRulesEn, 'Please follow the server rules.');

        // 🌟 9. الترحيب (الخلفية ولون الإطار)
        if (!config.welcomeSystem) config.welcomeSystem = {};
        config.welcomeSystem.enabled = (body.wel_enabled === 'on');
        config.welcomeSystem.channelId = cleanString(body.wel_channelId);
        config.welcomeSystem.messageText = cleanString(body.wel_messageText, 'مرحباً بك {user}!');
        config.welcomeSystem.backgroundUrl = cleanString(body.wel_backgroundUrl);
        config.welcomeSystem.avatarBorderHex = cleanString(body.wel_avatarBorderHex, '#ffffff');

        // 🌟 10. الحماية
        if (!config.protection) config.protection = {};
        config.protection.antiLinkEnabled = (body.prot_antiLinkEnabled === 'on');
        config.protection.antiLinkAllowedRoles = cleanArray(body.prot_antiLinkAllowedRoles);
        config.protection.antiSpamEnabled = (body.prot_antiSpamEnabled === 'on');
        config.protection.antiSpamAction = cleanString(body.prot_antiSpamAction, 'mute');
        config.protection.antiNukeEnabled = (body.prot_antiNukeEnabled === 'on');
        config.protection.maxChannelDeletesPerMinute = parseInt(body.prot_maxChannelDeletesPerMinute) || 3;
        config.protection.maxBanPerMinute = parseInt(body.prot_maxBanPerMinute) || 3;

        // 🌟 11. الرتب والرد التلقائي
        config.autoRoles = cleanArray(body.autoRoles);
        if (body.autoRespondersData) {
            try { config.autoResponders = JSON.parse(body.autoRespondersData); } catch(e){}
        }

        // 🌟 12. الاقتصاد واللفلات
        if (!config.economy) config.economy = {};
        config.economy.enabled = (body.eco_enabled === 'on');
        config.economy.dailyMin = parseInt(body.eco_dailyMin) || 1000;
        config.economy.dailyMax = parseInt(body.eco_dailyMax) || 5000;
        config.economy.tax = parseInt(body.eco_tax) || 5;

        if (!config.leveling) config.leveling = {};
        config.leveling.enabled = (body.lvl_enabled === 'on');
        config.leveling.levelUpChannelId = cleanString(body.lvl_levelUpChannelId);
        config.leveling.levelUpMessage = cleanString(body.lvl_levelUpMessage, 'مبروك {user}! وصلت لفل **{level}** 🚀');
        if (body.lvl_roleRewardsData) {
            try { config.leveling.roleRewards = JSON.parse(body.lvl_roleRewardsData); } catch(e){}
        }

        // 🤖 13. نظام الذكاء الاصطناعي
        if (!config.aiSystem) config.aiSystem = {};
        config.aiSystem.enabled = (body.ai_enabled === 'on');
        config.aiSystem.chatChannelId = cleanString(body.ai_chatChannelId);
        config.aiSystem.autoModToxicity = (body.ai_autoModToxicity === 'on');

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
        console.log(`\n[DASHBOARD FINAL V4] 🌐 Ultimate Enterprise Dashboard Online on PORT: ${PORT}\n`);
    });
};
