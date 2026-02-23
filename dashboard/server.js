// =========================================================================================================
// 🌐 المحرك الأساسي للوحة التحكم (Ultimate Dashboard Server) - النسخة المفصلة
// =========================================================================================================

const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const GuildConfigDatabaseModel = require('../models/GuildConfig');
const { EmbedBuilder } = require('discord.js');

// ---------------------------------------------------------------------
// ⚙️ إعدادات السيرفر الأساسية (Express Setup)
// ---------------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// توسيع حجم الاستقبال لضمان عدم ضياع أي بيانات أثناء الحفظ
app.use(express.urlencoded({ extended: true, limit: '200mb', parameterLimit: 200000 }));
app.use(express.json({ limit: '200mb' }));

app.use(session({ 
    secret: 'ENTERPRISE_SECRET_KEY', 
    resave: false, 
    saveUninitialized: false, 
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // جلسة تدوم 7 أيام
}));

app.use(passport.initialize());
app.use(passport.session());

// ---------------------------------------------------------------------
// 🔑 إعدادات تسجيل الدخول بالديسكورد
// ---------------------------------------------------------------------
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

// ---------------------------------------------------------------------
// 🛡️ دوال الحماية وفلترة البيانات
// ---------------------------------------------------------------------
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
    const str = String(rawInput || '').trim(); 
    return (str === '' || str === 'none') ? defaultVal : str; 
}

// ---------------------------------------------------------------------
// 🌐 مسارات التصفح (Routes)
// ---------------------------------------------------------------------
app.get('/auth/discord', passport.authenticate('discord'));
app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));
app.get('/', (req, res) => res.render('index', { user: req.user || null }));

app.get('/dashboard', checkAuth, (req, res) => {
    // فلترة السيرفرات ليعرض فقط التي يملك فيها صلاحية الإدارة
    const adminGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20 || (g.permissions & 0x8) === 0x8);
    res.render('dashboard', { user: req.user, guilds: adminGuilds });
});

app.get('/settings/:guildId', checkAuth, async (req, res) => {
    const guildId = req.params.guildId;
    const hasAccess = req.user.guilds.some(g => g.id === guildId && ((g.permissions & 0x20) === 0x20 || (g.permissions & 0x8) === 0x8));
    if (!hasAccess) return res.send('<h1 style="color:red; text-align:center;">❌ غير مصرح لك.</h1>');

    try {
        let config = await GuildConfigDatabaseModel.findOne({ guildId });
        if (!config) config = new GuildConfigDatabaseModel({ guildId }); 
        
        // تجهيز الهياكل لمنع حدوث Crash في الواجهة
        if (!config.commands.allowedRoles) config.commands.allowedRoles = {};
        if (!config.embedSetup) config.embedSetup = {};
        
        res.render('settings', { user: req.user, guildId, config, bot: req.app.locals.client });
    } catch (err) { 
        res.send('<h1 style="color:red; text-align:center;">❌ حدث خطأ في تحميل البيانات.</h1>'); 
    }
});

// ---------------------------------------------------------------------
// 🚀 مسار إرسال الإيمبد المباشر للديسكورد (Live Embed)
// ---------------------------------------------------------------------
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
// 💾 مسار الحفظ العملاق (حفظ جميع بيانات الداشبورد في الداتابيز بالتفصيل)
// =========================================================================================================
app.post('/settings/:guildId/save', checkAuth, async (req, res) => {
    const guildId = req.params.guildId;
    const hasAccess = req.user.guilds.some(g => g.id === guildId && ((g.permissions & 0x20) === 0x20 || (g.permissions & 0x8) === 0x8));
    if (!hasAccess) return res.status(403).send('Forbidden');

    try {
        const body = req.body;
        let config = await GuildConfigDatabaseModel.findOne({ guildId });
        if (!config) config = new GuildConfigDatabaseModel({ guildId });

        // 1. الإعدادات العامة والألوان الأساسية
        config.prefix = cleanString(body.prefix, '!');
        config.language = cleanString(body.language, 'ar');
        
        if (!config.embedSetup) config.embedSetup = {};
        config.embedSetup.successColor = cleanString(body.emb_successColor, '#3ba55d');
        config.embedSetup.errorColor = cleanString(body.emb_errorColor, '#ed4245');
        config.embedSetup.primaryColor = cleanString(body.emb_primaryColor, '#5865F2');
        config.embedSetup.footerText = cleanString(body.emb_footerText, 'Enterprise System');
        config.embedSetup.footerIconUrl = cleanString(body.emb_footerIconUrl);
        config.embedSetup.thumbnailUrl = cleanString(body.emb_thumbnailUrl);

        // 2. البانلات الديناميكية (تحويل الـ String إلى Object)
        if (body.ticketPanelsData) {
            try { 
                config.ticketPanels = JSON.parse(body.ticketPanelsData); 
            } catch(e) { console.log('Error parsing panels'); }
        }

        // 3. تحكم التذاكر والترانسكريبت
        if (!config.ticketControls) config.ticketControls = {};
        config.ticketControls.ticketCounter = parseInt(body.tc_ticketCounter) || 1;
        config.ticketControls.twoStepClose = (body.tc_twoStepClose === 'on');
        config.ticketControls.transcriptChannelId = cleanString(body.tc_transcriptChannelId);
        config.ticketControls.ticketLogChannelId = cleanString(body.tc_ticketLogChannelId);
        config.ticketControls.hideTicketOnClaim = (body.tc_hideTicketOnClaim === 'on');
        config.ticketControls.readOnlyStaffOnClaim = (body.tc_readOnlyStaffOnClaim === 'on');

        // 4. نظام الوساطة المعزول
        if (!config.middlemanSystem) config.middlemanSystem = {};
        config.middlemanSystem.enabled = (body.mm_enabled === 'on');
        config.middlemanSystem.categoryId = cleanString(body.mm_categoryId);
        config.middlemanSystem.panelChannelId = cleanString(body.mm_panelChannelId);
        config.middlemanSystem.panelTitle = cleanString(body.mm_panelTitle, 'تذكرة وساطة آمنة');
        config.middlemanSystem.panelDescription = cleanString(body.mm_panelDescription);
        config.middlemanSystem.panelColor = cleanString(body.mm_panelColor, '#f2a658');
        config.middlemanSystem.buttonLabel = cleanString(body.mm_buttonLabel, 'طلب وسيط');
        config.middlemanSystem.modalTitle = cleanString(body.mm_modalTitle, 'بيانات الوساطة');
        
        if (body.mm_modalFieldsData) {
            try { config.middlemanSystem.modalFields = JSON.parse(body.mm_modalFieldsData); } catch(e){}
        }
        
        config.middlemanSystem.insideTicketTitle = cleanString(body.mm_insideTicketTitle, 'تذكرة الوساطة');
        config.middlemanSystem.insideTicketDescription = cleanString(body.mm_insideTicketDescription);
        config.middlemanSystem.insideTicketColor = cleanString(body.mm_insideTicketColor, '#f2a658');
        config.middlemanSystem.modalAnswersEmbedColor = cleanString(body.mm_modalAnswersEmbedColor, '#f2a658');

        // 5. التقييمات المزدوجة
        if (!config.ratings) config.ratings = {};
        config.ratings.middlemanLogChannelId = cleanString(body.rating_middlemanLogChannelId);
        config.ratings.staffLogChannelId = cleanString(body.rating_staffLogChannelId);
        config.ratings.middlemanEmbedColor = cleanString(body.rating_middlemanEmbedColor, '#f2a658');
        config.ratings.staffEmbedColor = cleanString(body.rating_staffEmbedColor, '#3ba55d');

        // 6. الرتب والصلاحيات
        if (!config.roles) config.roles = {};
        config.roles.adminRoleId = cleanString(body.role_adminRoleId);
        config.roles.middlemanRoleId = cleanString(body.role_middlemanRoleId);
        config.roles.highAdminRoles = cleanArray(body.role_highAdminRoles);
        config.roles.tradePingRoleIds = cleanArray(body.role_tradePingRoleIds);
        config.roles.tradeApproveRoleIds = cleanArray(body.role_tradeApproveRoleIds);

        // 7. تخصيص أسماء الأوامر
        if (!config.commands) config.commands = {};
        config.commands.clearCmd = cleanString(body.cmd_clearCmd, 'clear');
        config.commands.comeCmd = cleanString(body.cmd_comeCmd, 'come');
        config.commands.taxCmd = cleanString(body.cmd_taxCmd, 'tax');
        config.commands.banCmd = cleanString(body.cmd_banCmd, 'ban');
        config.commands.unbanCmd = cleanString(body.cmd_unbanCmd, 'unban');
        config.commands.timeoutCmd = cleanString(body.cmd_timeoutCmd, 'timeout');
        config.commands.untimeoutCmd = cleanString(body.cmd_untimeoutCmd, 'untimeout');
        config.commands.warnCmd = cleanString(body.cmd_warnCmd, 'warn');
        config.commands.unwarnCmd = cleanString(body.cmd_unwarnCmd, 'unwarn');
        config.commands.muteCmd = cleanString(body.cmd_muteCmd, 'mute');
        config.commands.unmuteCmd = cleanString(body.cmd_unmuteCmd, 'unmute');
        config.commands.moveCmd = cleanString(body.cmd_moveCmd, 'move');
        config.commands.lockCmd = cleanString(body.cmd_lockCmd, 'lock');
        config.commands.unlockCmd = cleanString(body.cmd_unlockCmd, 'unlock');
        config.commands.hideCmd = cleanString(body.cmd_hideCmd, 'hide');
        config.commands.showCmd = cleanString(body.cmd_showCmd, 'show');
        config.commands.tradeCmd = cleanString(body.cmd_tradeCmd, 'trade');
        config.commands.doneCmd = cleanString(body.cmd_doneCmd, 'done');
        config.commands.approveCmd = cleanString(body.cmd_approveCmd, 'approve');

        // 8. حفظ الرتب المسموح لها باستخدام الأوامر
        config.commands.allowedRoles = {
            clear: cleanArray(body.role_clearAllowed),
            come: cleanArray(body.role_comeAllowed),
            tax: cleanArray(body.role_taxAllowed),
            ban: cleanArray(body.role_banAllowed),
            unban: cleanArray(body.role_unbanAllowed),
            timeout: cleanArray(body.role_timeoutAllowed),
            untimeout: cleanArray(body.role_untimeoutAllowed),
            warn: cleanArray(body.role_warnAllowed),
            unwarn: cleanArray(body.role_unwarnAllowed),
            mute: cleanArray(body.role_muteAllowed),
            unmute: cleanArray(body.role_unmuteAllowed),
            move: cleanArray(body.role_moveAllowed),
            lock: cleanArray(body.role_lockAllowed),
            unlock: cleanArray(body.role_unlockAllowed),
            hide: cleanArray(body.role_hideAllowed),
            show: cleanArray(body.role_showAllowed),
            trade: cleanArray(body.role_tradeAllowed),
            done: cleanArray(body.role_doneAllowed),
            approve: cleanArray(body.role_approveAllowed)
        };

        // 9. السجلات الدقيقة (روم لكل لوج + لون مخصص لكل لوج)
        if (!config.serverLogs) config.serverLogs = {};
        
        // سجلات الرسائل
        config.serverLogs.messageDeleteLogId = cleanString(body.log_messageDeleteLogId);
        config.serverLogs.msgDelColor = cleanString(body.log_msgDelColor, '#ed4245');
        config.serverLogs.messageEditLogId = cleanString(body.log_messageEditLogId);
        config.serverLogs.msgEditColor = cleanString(body.log_msgEditColor, '#fee75c');
        config.serverLogs.imageDeleteLogId = cleanString(body.log_imageDeleteLogId);
        config.serverLogs.imgDelColor = cleanString(body.log_imgDelColor, '#e67e22');
        
        // سجلات الأعضاء والرتب
        config.serverLogs.memberJoinLeaveLogId = cleanString(body.log_memberJoinLeaveLogId);
        config.serverLogs.joinColor = cleanString(body.log_joinColor, '#3ba55d');
        config.serverLogs.leaveColor = cleanString(body.log_leaveColor, '#ed4245');
        config.serverLogs.voiceStateLogId = cleanString(body.log_voiceStateLogId);
        config.serverLogs.voiceColor = cleanString(body.log_voiceColor, '#5865F2');
        config.serverLogs.roleGiveTakeLogId = cleanString(body.log_roleGiveTakeLogId);
        config.serverLogs.roleColor = cleanString(body.log_roleColor, '#9b59b6');
        
        // سجلات السيرفر (رومات، ثريدات، ريأكتات)
        config.serverLogs.channelCreateDeleteLogId = cleanString(body.log_channelCreateDeleteLogId);
        config.serverLogs.channelColor = cleanString(body.log_channelColor, '#1abc9c');
        config.serverLogs.threadCreateDeleteLogId = cleanString(body.log_threadCreateDeleteLogId);
        config.serverLogs.threadColor = cleanString(body.log_threadColor, '#34495e');
        config.serverLogs.reactionLogId = cleanString(body.log_reactionLogId);
        config.serverLogs.reactionColor = cleanString(body.log_reactionColor, '#e74c3c');
        
        // سجلات العقوبات
        config.serverLogs.banKickLogId = cleanString(body.log_banKickLogId);
        config.serverLogs.banColor = cleanString(body.log_banColor, '#992d22');
        config.serverLogs.unbanLogId = cleanString(body.log_unbanLogId);
        config.serverLogs.unbanColor = cleanString(body.log_unbanColor, '#2ecc71');
        
        config.serverLogs.timeoutLogId = cleanString(body.log_timeoutLogId);
        config.serverLogs.timeoutColor = cleanString(body.log_timeoutColor, '#e67e22');
        config.serverLogs.untimeoutLogId = cleanString(body.log_untimeoutLogId);
        config.serverLogs.untimeoutColor = cleanString(body.log_untimeoutColor, '#2ecc71');
        
        config.serverLogs.warningsLogId = cleanString(body.log_warningsLogId);
        config.serverLogs.warnColor = cleanString(body.log_warnColor, '#f1c40f');
        config.serverLogs.unwarningsLogId = cleanString(body.log_unwarningsLogId);
        config.serverLogs.unwarnColor = cleanString(body.log_unwarnColor, '#2ecc71');

        // 10. نظام التحذيرات
        if (!config.warnings) config.warnings = {};
        config.warnings.maxWarnings = parseInt(body.warn_maxWarnings) || 3;
        config.warnings.autoAction = cleanString(body.warn_autoAction, 'timeout'); // timeout, kick, ban, none
        
        config.warnings.presetReasonsAr = body.warn_presetReasonsAr ? body.warn_presetReasonsAr.split('\n').map(r=>r.trim()).filter(r=>r!=='') : [];
        config.warnings.presetReasonsEn = body.warn_presetReasonsEn ? body.warn_presetReasonsEn.split('\n').map(r=>r.trim()).filter(r=>r!=='') : [];
        
        config.warnings.panelChannelId = cleanString(body.warn_panelChannelId);
        config.warnings.panelTitle = cleanString(body.warn_panelTitle, 'لوحة تحكم التحذيرات');
        config.warnings.panelDescription = cleanString(body.warn_panelDescription);
        config.warnings.panelColor = cleanString(body.warn_panelColor, '#ed4245');

        // 11. الترحيب والمغادرة
        if (!config.welcomeSystem) config.welcomeSystem = {};
        config.welcomeSystem.enabled = (body.wel_enabled === 'on');
        config.welcomeSystem.channelId = cleanString(body.wel_channelId);
        config.welcomeSystem.messageText = cleanString(body.wel_messageText);
        config.welcomeSystem.backgroundUrl = cleanString(body.wel_backgroundUrl);
        config.welcomeSystem.avatarBorderHex = cleanString(body.wel_avatarBorderHex, '#ffffff');

        // 12. الحماية
        if (!config.protection) config.protection = {};
        config.protection.antiLinkEnabled = (body.prot_antiLinkEnabled === 'on');
        config.protection.antiSpamEnabled = (body.prot_antiSpamEnabled === 'on');
        config.protection.antiNukeEnabled = (body.prot_antiNukeEnabled === 'on');

        // 13. الاقتصاد
        if (!config.economy) config.economy = {};
        config.economy.enabled = (body.eco_enabled === 'on');
        config.economy.taxPercentage = parseInt(body.eco_taxPercentage) || 5;

        // 14. الذكاء الاصطناعي
        if (!config.aiSystem) config.aiSystem = {};
        config.aiSystem.enabled = (body.ai_enabled === 'on');
        config.aiSystem.chatChannelId = cleanString(body.ai_chatChannelId);
        config.aiSystem.allowUserChoice = (body.ai_allowUserChoice === 'on');
        config.aiSystem.defaultBoyName = cleanString(body.ai_defaultBoyName, 'زيزو');
        config.aiSystem.defaultGirlName = cleanString(body.ai_defaultGirlName, 'سوسو');

        // 🛑 السر الخطير: إخبار Mongoose بوجود تغيير في الكائنات المعقدة ليتم حفظها وعدم مسحها
        config.markModified('ticketPanels');
        config.markModified('middlemanSystem');
        config.markModified('embedSetup');
        config.markModified('ratings');
        config.markModified('roles');
        config.markModified('commands');
        config.markModified('serverLogs');
        config.markModified('warnings');

        // الحفظ النهائي
        await config.save();
        res.redirect(`/settings/${guildId}?success=true`);

    } catch (err) {
        console.error('[CRITICAL DB ERROR]', err);
        res.redirect(`/settings/${guildId}?error=true`);
    }
});

// ---------------------------------------------------------------------
// 🚀 تشغيل السيرفر
// ---------------------------------------------------------------------
module.exports = (client) => {
    app.locals.client = client;
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log(`\n[DASHBOARD V7 SERVER] 🌐 Online and Ready on PORT: ${PORT}\n`);
    });
};
