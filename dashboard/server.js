// =========================================================================================================
// 🌐 محرك لوحة التحكم العملاق (ULTIMATE ENTERPRISE DASHBOARD SERVER - PROBOT KILLER EDITION)
// ---------------------------------------------------------------------------------------------------------
// المسار: dashboard/server.js
// الوظيفة: خادم ويب (Express) مجهز لاستقبال ومعالجة 15 قسم كامل من إعدادات السيرفر
// تم ربط المتغيرات السرية بناءً على خوادم Railway: (CLIENT_ID, CLIENT_SECRET, CALLBACK_URL, TOKEN, MONGO_URI)
// مسار العودة (Callback) مضبوط على /callback ليتطابق مع إعدادات ديسكورد ديفيلوبر.
// =========================================================================================================

const express = require('express');
const app = express();
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const GuildConfigDatabaseModel = require('../models/GuildConfig');

// =========================================================================================================
// ⚙️ 1. الإعدادات الأساسية للمحرك (Engine Configuration)
// =========================================================================================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// توسيع حجم الطلبات (Payload) لاستيعاب البيانات الضخمة جداً (100 ميجا)
app.use(express.urlencoded({ extended: true, limit: '100mb', parameterLimit: 100000 }));
app.use(express.json({ limit: '100mb' }));

// =========================================================================================================
// 🔒 2. نظام الجلسات والحماية (Sessions & Security)
// =========================================================================================================

app.use(session({
    secret: 'ENTERPRISE_ULTIMATE_SECRET_KEY_FOR_DASHBOARD_123!@#_SAAS_EDITION_SECURE',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // الجلسة تستمر لمدة 7 أيام متواصلة
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// =========================================================================================================
// 🔑 3. نظام تسجيل الدخول بواسطة ديسكورد (Discord OAuth2 Provider)
// =========================================================================================================

passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID, 
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL, 
    scope: ['identify', 'guilds'] 
}, function(accessToken, refreshToken, userProfile, doneCallback) {
    return doneCallback(null, userProfile);
}));

passport.serializeUser(function(authenticatedUser, doneCallback) {
    doneCallback(null, authenticatedUser);
});

passport.deserializeUser(function(serializedUserObj, doneCallback) {
    doneCallback(null, serializedUserObj);
});

// =========================================================================================================
// 🛡️ 4. دوال الحماية والتحقق الإضافية (Middleware Validation Engine)
// =========================================================================================================

function checkAuthenticationValidation(request, response, nextFunction) {
    if (request.isAuthenticated() === true) {
        return nextFunction(); 
    }
    console.log('[DASHBOARD SECURITY] Unauthorized access attempt blocked. Redirecting to login.');
    response.redirect('/auth/discord'); 
}

function parseAndSanitizeArrayInput(rawInputData) {
    if (rawInputData === undefined || rawInputData === null) return [];
    if (Array.isArray(rawInputData) === true) return rawInputData.filter(item => item !== null && String(item).trim() !== '');
    if (typeof rawInputData === 'string') {
        return rawInputData.split(',').map(item => item.trim()).filter(item => item !== '');
    }
    return [];
}

function parseAndSanitizeStringInput(rawInputData, defaultValue = null) {
    if (rawInputData === undefined || rawInputData === null) return defaultValue;
    const trimmedString = String(rawInputData).trim();
    if (trimmedString === '' || trimmedString === 'none') return defaultValue;
    return trimmedString;
}

// =========================================================================================================
// 🌐 5. مسارات الموقع الأساسية (Core Web Routes)
// =========================================================================================================

app.get('/auth/discord', passport.authenticate('discord'));

// ⚠️ مسار الـ Callback مضبوط ليتطابق مع ما وضعته أنت في ديسكورد ديفيلوبر
app.get('/callback', passport.authenticate('discord', {
    failureRedirect: '/?error=auth_failed'
}), function(request, response) {
    console.log(`[DASHBOARD AUTH] User ${request.user.username} successfully logged in.`);
    response.redirect('/dashboard'); 
});

app.get('/logout', function(request, response, nextFunction) {
    request.logout(function(logoutError) {
        if (logoutError) return nextFunction(logoutError); 
        response.redirect('/');
    });
});

app.get('/', (request, response) => {
    response.render('index', { user: request.user || null });
});

app.get('/dashboard', checkAuthenticationValidation, (request, response) => {
    const userAdminGuildsArray = request.user.guilds.filter(function(guildObject) {
        return (guildObject.permissions & 0x20) === 0x20 || (guildObject.permissions & 0x8) === 0x8;
    });
    response.render('dashboard', { user: request.user, guilds: userAdminGuildsArray });
});

// =========================================================================================================
// ⚙️ 6. مسار جلب الإعدادات (Settings GET Route)
// =========================================================================================================

app.get('/settings/:guildId', checkAuthenticationValidation, async (request, response) => {
    const targetGuildDiscordIdString = request.params.guildId;
    
    let doesUserHaveAccessToGuildBoolean = false;
    for (let i = 0; i < request.user.guilds.length; i++) {
        if (request.user.guilds[i].id === targetGuildDiscordIdString) {
            const hasManage = (request.user.guilds[i].permissions & 0x20) === 0x20;
            const hasAdmin = (request.user.guilds[i].permissions & 0x8) === 0x8;
            if (hasManage || hasAdmin) { doesUserHaveAccessToGuildBoolean = true; break; }
        }
    }
    
    if (doesUserHaveAccessToGuildBoolean === false) {
        return response.send('<h1 style="color:red; text-align:center;">❌ Access Denied! لا تمتلك صلاحية لهذا السيرفر.</h1>');
    }

    try {
        let guildConfigurationDocumentObject = await GuildConfigDatabaseModel.findOne({ guildId: targetGuildDiscordIdString });
        if (guildConfigurationDocumentObject === null) {
            guildConfigurationDocumentObject = new GuildConfigDatabaseModel({ guildId: targetGuildDiscordIdString });
            await guildConfigurationDocumentObject.save();
        }

        response.render('settings', {
            user: request.user,
            guildId: targetGuildDiscordIdString,
            config: guildConfigurationDocumentObject,
            bot: request.app.locals.client 
        });

    } catch (databaseFetchExceptionError) {
        response.send('<h1 style="color:red; text-align:center;">❌ حدث خطأ داخلي.</h1>');
    }
});

// =========================================================================================================
// 💾 7. مسار الحفظ العملاق والمفصل (THE BEHEMOTH POST ROUTE - ALL 15 SECTIONS)
// =========================================================================================================

app.post('/settings/:guildId/save', checkAuthenticationValidation, async (request, response) => {
    
    const targetGuildDiscordIdString = request.params.guildId;
    
    let doesUserHaveAccessToGuildBoolean = false;
    for (let i = 0; i < request.user.guilds.length; i++) {
        if (request.user.guilds[i].id === targetGuildDiscordIdString) {
            const hasManage = (request.user.guilds[i].permissions & 0x20) === 0x20;
            const hasAdmin = (request.user.guilds[i].permissions & 0x8) === 0x8;
            if (hasManage || hasAdmin) { doesUserHaveAccessToGuildBoolean = true; break; }
        }
    }
    
    if (doesUserHaveAccessToGuildBoolean === false) return response.status(403).send('Forbidden: Access Denied');

    try {
        const incomingFormDataPayloadObject = request.body;
        console.log(`[DASHBOARD LOG] Received massive POST payload for Guild: ${targetGuildDiscordIdString}`);

        let guildConfigDocumentToUpdateObject = await GuildConfigDatabaseModel.findOne({ guildId: targetGuildDiscordIdString });
        if (guildConfigDocumentToUpdateObject === null) {
            guildConfigDocumentToUpdateObject = new GuildConfigDatabaseModel({ guildId: targetGuildDiscordIdString });
        }

        // =====================================================================
        // 1️⃣ الإعدادات العامة (General Settings)
        // =====================================================================
        if (incomingFormDataPayloadObject.prefix !== undefined) {
            guildConfigDocumentToUpdateObject.prefix = parseAndSanitizeStringInput(incomingFormDataPayloadObject.prefix, '!');
        }
        if (incomingFormDataPayloadObject.language !== undefined) {
            guildConfigDocumentToUpdateObject.language = parseAndSanitizeStringInput(incomingFormDataPayloadObject.language, 'ar');
        }

        // =====================================================================
        // 2️⃣ التحكم الشامل في الإيمبدات (Global Embeds Control)
        // =====================================================================
        if (!guildConfigDocumentToUpdateObject.embedSetup) guildConfigDocumentToUpdateObject.embedSetup = {};
        
        if (incomingFormDataPayloadObject.emb_successColor !== undefined) guildConfigDocumentToUpdateObject.embedSetup.successColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.emb_successColor, '#3ba55d');
        if (incomingFormDataPayloadObject.emb_errorColor !== undefined) guildConfigDocumentToUpdateObject.embedSetup.errorColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.emb_errorColor, '#ed4245');
        if (incomingFormDataPayloadObject.emb_primaryColor !== undefined) guildConfigDocumentToUpdateObject.embedSetup.primaryColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.emb_primaryColor, '#5865F2');
        if (incomingFormDataPayloadObject.emb_footerText !== undefined) guildConfigDocumentToUpdateObject.embedSetup.footerText = parseAndSanitizeStringInput(incomingFormDataPayloadObject.emb_footerText, 'Enterprise System © 2024');
        if (incomingFormDataPayloadObject.emb_footerIconUrl !== undefined) guildConfigDocumentToUpdateObject.embedSetup.footerIconUrl = parseAndSanitizeStringInput(incomingFormDataPayloadObject.emb_footerIconUrl);
        if (incomingFormDataPayloadObject.emb_thumbnailUrl !== undefined) guildConfigDocumentToUpdateObject.embedSetup.thumbnailUrl = parseAndSanitizeStringInput(incomingFormDataPayloadObject.emb_thumbnailUrl);

        // =====================================================================
        // 3️⃣ نظام الوساطة المتقدم (Middleman System)
        // =====================================================================
        if (!guildConfigDocumentToUpdateObject.middlemanSystem) guildConfigDocumentToUpdateObject.middlemanSystem = {};

        guildConfigDocumentToUpdateObject.middlemanSystem.enabled = (incomingFormDataPayloadObject.mm_enabled === 'on' || incomingFormDataPayloadObject.mm_enabled === 'true');
        if (incomingFormDataPayloadObject.mm_categoryId !== undefined) guildConfigDocumentToUpdateObject.middlemanSystem.categoryId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_categoryId);
        if (incomingFormDataPayloadObject.mm_panelChannelId !== undefined) guildConfigDocumentToUpdateObject.middlemanSystem.panelChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_panelChannelId);
        
        if (incomingFormDataPayloadObject.mm_panelTitle !== undefined) guildConfigDocumentToUpdateObject.middlemanSystem.panelTitle = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_panelTitle, 'تذكرة وساطة آمنة');
        if (incomingFormDataPayloadObject.mm_panelDescription !== undefined) guildConfigDocumentToUpdateObject.middlemanSystem.panelDescription = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_panelDescription, 'لطلب وسيط معتمد، يرجى فتح تذكرة.');
        if (incomingFormDataPayloadObject.mm_panelColor !== undefined) guildConfigDocumentToUpdateObject.middlemanSystem.panelColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_panelColor, '#f2a658');
        if (incomingFormDataPayloadObject.mm_buttonLabel !== undefined) guildConfigDocumentToUpdateObject.middlemanSystem.buttonLabel = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_buttonLabel, 'طلب وسيط 🛡️');
        
        if (incomingFormDataPayloadObject.mm_modalTitle !== undefined) guildConfigDocumentToUpdateObject.middlemanSystem.modalTitle = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_modalTitle, 'بيانات الوساطة');
        if (incomingFormDataPayloadObject.mm_modalFieldsData !== undefined && incomingFormDataPayloadObject.mm_modalFieldsData !== '') {
            try {
                const parsedModalFieldsArray = JSON.parse(incomingFormDataPayloadObject.mm_modalFieldsData);
                if (Array.isArray(parsedModalFieldsArray)) guildConfigDocumentToUpdateObject.middlemanSystem.modalFields = parsedModalFieldsArray;
            } catch (jsonParsingError) {}
        }

        if (incomingFormDataPayloadObject.mm_insideTicketTitle !== undefined) guildConfigDocumentToUpdateObject.middlemanSystem.insideTicketTitle = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_insideTicketTitle, 'تذكرة الوساطة');
        if (incomingFormDataPayloadObject.mm_insideTicketDescription !== undefined) guildConfigDocumentToUpdateObject.middlemanSystem.insideTicketDescription = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_insideTicketDescription, 'يرجى انتظار الوسيط وكتابة التفاصيل.');
        if (incomingFormDataPayloadObject.mm_insideTicketColor !== undefined) guildConfigDocumentToUpdateObject.middlemanSystem.insideTicketColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_insideTicketColor, '#f2a658');

        // =====================================================================
        // 4️⃣ نظام التذاكر المتعددة (Custom Ticket Panels)
        // =====================================================================
        if (incomingFormDataPayloadObject.ticketPanelsData !== undefined && incomingFormDataPayloadObject.ticketPanelsData !== '') {
            try {
                const parsedTicketPanelsArray = JSON.parse(incomingFormDataPayloadObject.ticketPanelsData);
                if (Array.isArray(parsedTicketPanelsArray)) guildConfigDocumentToUpdateObject.ticketPanels = parsedTicketPanelsArray;
            } catch (jsonParsingError) {}
        }

        // =====================================================================
        // 5️⃣ نظام التقييمات المزدوج (Dual Ratings)
        // =====================================================================
        if (!guildConfigDocumentToUpdateObject.ratings) guildConfigDocumentToUpdateObject.ratings = {};

        if (incomingFormDataPayloadObject.rating_middlemanLogChannelId !== undefined) guildConfigDocumentToUpdateObject.ratings.middlemanLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.rating_middlemanLogChannelId);
        if (incomingFormDataPayloadObject.rating_middlemanEmbedColor !== undefined) guildConfigDocumentToUpdateObject.ratings.middlemanEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.rating_middlemanEmbedColor, '#f2a658');
        if (incomingFormDataPayloadObject.rating_staffLogChannelId !== undefined) guildConfigDocumentToUpdateObject.ratings.staffLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.rating_staffLogChannelId);
        if (incomingFormDataPayloadObject.rating_staffEmbedColor !== undefined) guildConfigDocumentToUpdateObject.ratings.staffEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.rating_staffEmbedColor, '#3ba55d');
        
        if (incomingFormDataPayloadObject.rating_customReviewOptions !== undefined) {
            guildConfigDocumentToUpdateObject.ratings.customReviewOptions = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.rating_customReviewOptions);
        }
        
        guildConfigDocumentToUpdateObject.ratings.allowCustomText = (incomingFormDataPayloadObject.rating_allowCustomText === 'on' || incomingFormDataPayloadObject.rating_allowCustomText === 'true');

        // =====================================================================
        // 6️⃣ التحكم الذكي في التذاكر (Ticket Controls)
        // =====================================================================
        if (!guildConfigDocumentToUpdateObject.ticketControls) guildConfigDocumentToUpdateObject.ticketControls = {};

        if (incomingFormDataPayloadObject.tc_maxOpenTicketsPerUser !== undefined) {
            const parsedMaxTicketsInt = parseInt(incomingFormDataPayloadObject.tc_maxOpenTicketsPerUser);
            if (!isNaN(parsedMaxTicketsInt) && parsedMaxTicketsInt > 0) guildConfigDocumentToUpdateObject.ticketControls.maxOpenTicketsPerUser = parsedMaxTicketsInt;
        }

        if (incomingFormDataPayloadObject.tc_controlPanelColor !== undefined) guildConfigDocumentToUpdateObject.ticketControls.controlPanelColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.tc_controlPanelColor, '#2b2d31');
        if (incomingFormDataPayloadObject.tc_ticketLogChannelId !== undefined) guildConfigDocumentToUpdateObject.ticketControls.ticketLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.tc_ticketLogChannelId);
        if (incomingFormDataPayloadObject.tc_transcriptChannelId !== undefined) guildConfigDocumentToUpdateObject.ticketControls.transcriptChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.tc_transcriptChannelId);
        if (incomingFormDataPayloadObject.tc_transcriptEmbedColor !== undefined) guildConfigDocumentToUpdateObject.ticketControls.transcriptEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.tc_transcriptEmbedColor, '#2b2d31');

        guildConfigDocumentToUpdateObject.ticketControls.hideTicketOnClaim = (incomingFormDataPayloadObject.tc_hideTicketOnClaim === 'on' || incomingFormDataPayloadObject.tc_hideTicketOnClaim === 'true');
        guildConfigDocumentToUpdateObject.ticketControls.readOnlyStaffOnClaim = (incomingFormDataPayloadObject.tc_readOnlyStaffOnClaim === 'on' || incomingFormDataPayloadObject.tc_readOnlyStaffOnClaim === 'true');

        // =====================================================================
        // 7️⃣ نظام الرتب والصلاحيات (Roles Hierarchy)
        // =====================================================================
        if (!guildConfigDocumentToUpdateObject.roles) guildConfigDocumentToUpdateObject.roles = {};

        if (incomingFormDataPayloadObject.role_adminRoleId !== undefined) guildConfigDocumentToUpdateObject.roles.adminRoleId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.role_adminRoleId);
        if (incomingFormDataPayloadObject.role_middlemanRoleId !== undefined) guildConfigDocumentToUpdateObject.roles.middlemanRoleId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.role_middlemanRoleId);
        
        if (incomingFormDataPayloadObject.role_highAdminRoles !== undefined) guildConfigDocumentToUpdateObject.roles.highAdminRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.role_highAdminRoles);
        if (incomingFormDataPayloadObject.role_highMiddlemanRoles !== undefined) guildConfigDocumentToUpdateObject.roles.highMiddlemanRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.role_highMiddlemanRoles);
        if (incomingFormDataPayloadObject.role_tradePingRoleIds !== undefined) guildConfigDocumentToUpdateObject.roles.tradePingRoleIds = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.role_tradePingRoleIds);
        if (incomingFormDataPayloadObject.role_tradeApproveRoleIds !== undefined) guildConfigDocumentToUpdateObject.roles.tradeApproveRoleIds = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.role_tradeApproveRoleIds);

        // =====================================================================
        // 8️⃣ الأوامر الديناميكية (Dynamic Commands)
        // =====================================================================
        if (!guildConfigDocumentToUpdateObject.commands) guildConfigDocumentToUpdateObject.commands = {};

        if (incomingFormDataPayloadObject.cmd_clearCmd !== undefined) guildConfigDocumentToUpdateObject.commands.clearCmd = parseAndSanitizeStringInput(incomingFormDataPayloadObject.cmd_clearCmd, 'clear');
        if (incomingFormDataPayloadObject.cmd_clearAllowedRoles !== undefined) guildConfigDocumentToUpdateObject.commands.clearAllowedRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.cmd_clearAllowedRoles);
        if (incomingFormDataPayloadObject.cmd_banCmd !== undefined) guildConfigDocumentToUpdateObject.commands.banCmd = parseAndSanitizeStringInput(incomingFormDataPayloadObject.cmd_banCmd, 'ban');
        if (incomingFormDataPayloadObject.cmd_banAllowedRoles !== undefined) guildConfigDocumentToUpdateObject.commands.banAllowedRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.cmd_banAllowedRoles);
        if (incomingFormDataPayloadObject.cmd_timeoutCmd !== undefined) guildConfigDocumentToUpdateObject.commands.timeoutCmd = parseAndSanitizeStringInput(incomingFormDataPayloadObject.cmd_timeoutCmd, 'timeout');
        if (incomingFormDataPayloadObject.cmd_timeoutAllowedRoles !== undefined) guildConfigDocumentToUpdateObject.commands.timeoutAllowedRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.cmd_timeoutAllowedRoles);
        if (incomingFormDataPayloadObject.cmd_comeCmd !== undefined) guildConfigDocumentToUpdateObject.commands.comeCmd = parseAndSanitizeStringInput(incomingFormDataPayloadObject.cmd_comeCmd, 'come');
        if (incomingFormDataPayloadObject.cmd_comeAllowedRoles !== undefined) guildConfigDocumentToUpdateObject.commands.comeAllowedRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.cmd_comeAllowedRoles);
        if (incomingFormDataPayloadObject.cmd_doneCmd !== undefined) guildConfigDocumentToUpdateObject.commands.doneCmd = parseAndSanitizeStringInput(incomingFormDataPayloadObject.cmd_doneCmd, 'done');
        if (incomingFormDataPayloadObject.cmd_doneAllowedRoles !== undefined) guildConfigDocumentToUpdateObject.commands.doneAllowedRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.cmd_doneAllowedRoles);
        if (incomingFormDataPayloadObject.cmd_tradeCmd !== undefined) guildConfigDocumentToUpdateObject.commands.tradeCmd = parseAndSanitizeStringInput(incomingFormDataPayloadObject.cmd_tradeCmd, 'trade');
        if (incomingFormDataPayloadObject.cmd_tradeAllowedRoles !== undefined) guildConfigDocumentToUpdateObject.commands.tradeAllowedRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.cmd_tradeAllowedRoles);
        if (incomingFormDataPayloadObject.cmd_tradeEmbedColor !== undefined) guildConfigDocumentToUpdateObject.commands.tradeEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.cmd_tradeEmbedColor, '#f2a658');

        // =====================================================================
        // 9️⃣ سجلات السيرفر المفصلة (Unified Logs)
        // =====================================================================
        if (!guildConfigDocumentToUpdateObject.serverLogs) guildConfigDocumentToUpdateObject.serverLogs = {};

        if (incomingFormDataPayloadObject.log_messageLogChannelId !== undefined) guildConfigDocumentToUpdateObject.serverLogs.messageLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_messageLogChannelId);
        if (incomingFormDataPayloadObject.log_messageLogEmbedColor !== undefined) guildConfigDocumentToUpdateObject.serverLogs.messageLogEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_messageLogEmbedColor, '#fee75c');
        if (incomingFormDataPayloadObject.log_memberJoinLeaveLogChannelId !== undefined) guildConfigDocumentToUpdateObject.serverLogs.memberJoinLeaveLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_memberJoinLeaveLogChannelId);
        if (incomingFormDataPayloadObject.log_memberJoinEmbedColor !== undefined) guildConfigDocumentToUpdateObject.serverLogs.memberJoinEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_memberJoinEmbedColor, '#3ba55d');
        if (incomingFormDataPayloadObject.log_memberLeaveEmbedColor !== undefined) guildConfigDocumentToUpdateObject.serverLogs.memberLeaveEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_memberLeaveEmbedColor, '#ed4245');
        if (incomingFormDataPayloadObject.log_voiceStateLogChannelId !== undefined) guildConfigDocumentToUpdateObject.serverLogs.voiceStateLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_voiceStateLogChannelId);
        if (incomingFormDataPayloadObject.log_voiceStateEmbedColor !== undefined) guildConfigDocumentToUpdateObject.serverLogs.voiceStateEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_voiceStateEmbedColor, '#5865F2');
        if (incomingFormDataPayloadObject.log_roleUpdateLogChannelId !== undefined) guildConfigDocumentToUpdateObject.serverLogs.roleUpdateLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_roleUpdateLogChannelId);
        if (incomingFormDataPayloadObject.log_roleUpdateEmbedColor !== undefined) guildConfigDocumentToUpdateObject.serverLogs.roleUpdateEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_roleUpdateEmbedColor, '#ffffff');
        if (incomingFormDataPayloadObject.log_banKickLogChannelId !== undefined) guildConfigDocumentToUpdateObject.serverLogs.banKickLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_banKickLogChannelId);
        if (incomingFormDataPayloadObject.log_banKickEmbedColor !== undefined) guildConfigDocumentToUpdateObject.serverLogs.banKickEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_banKickEmbedColor, '#992d22');

        // =====================================================================
        // 🔟 نظام التحذيرات (Warnings System)
        // =====================================================================
        if (!guildConfigDocumentToUpdateObject.warnings) guildConfigDocumentToUpdateObject.warnings = { presetReasons: {} };

        if (incomingFormDataPayloadObject.warn_maxWarnings !== undefined) {
            const parsedMaxWarningsInt = parseInt(incomingFormDataPayloadObject.warn_maxWarnings);
            if (!isNaN(parsedMaxWarningsInt) && parsedMaxWarningsInt > 0) guildConfigDocumentToUpdateObject.warnings.maxWarnings = parsedMaxWarningsInt;
        }

        if (incomingFormDataPayloadObject.warn_autoAction !== undefined) {
            const requestedActionString = String(incomingFormDataPayloadObject.warn_autoAction).toLowerCase().trim();
            if (['timeout', 'kick', 'ban'].includes(requestedActionString)) {
                guildConfigDocumentToUpdateObject.warnings.autoAction = requestedActionString;
            }
        }

        // أسباب التحذيرات بالعربي والإنجليزي
        if (!guildConfigDocumentToUpdateObject.warnings.presetReasons) guildConfigDocumentToUpdateObject.warnings.presetReasons = {};
        if (incomingFormDataPayloadObject.warn_presetReasons_ar !== undefined) {
            guildConfigDocumentToUpdateObject.warnings.presetReasons.ar = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.warn_presetReasons_ar);
        }
        if (incomingFormDataPayloadObject.warn_presetReasons_en !== undefined) {
            guildConfigDocumentToUpdateObject.warnings.presetReasons.en = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.warn_presetReasons_en);
        }

        // =====================================================================
        // 🌟 11. نظام الترحيب والمغادرة (Welcome System)
        // =====================================================================
        if (!guildConfigDocumentToUpdateObject.welcomeSystem) guildConfigDocumentToUpdateObject.welcomeSystem = {};

        guildConfigDocumentToUpdateObject.welcomeSystem.enabled = (incomingFormDataPayloadObject.wel_enabled === 'on' || incomingFormDataPayloadObject.wel_enabled === 'true');
        if (incomingFormDataPayloadObject.wel_channelId !== undefined) guildConfigDocumentToUpdateObject.welcomeSystem.channelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.wel_channelId);
        if (incomingFormDataPayloadObject.wel_messageText !== undefined) guildConfigDocumentToUpdateObject.welcomeSystem.messageText = parseAndSanitizeStringInput(incomingFormDataPayloadObject.wel_messageText, 'مرحباً بك {user} في سيرفر {server}!');
        if (incomingFormDataPayloadObject.wel_embedColor !== undefined) guildConfigDocumentToUpdateObject.welcomeSystem.embedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.wel_embedColor, '#3ba55d');
        if (incomingFormDataPayloadObject.wel_imageUrl !== undefined) guildConfigDocumentToUpdateObject.welcomeSystem.imageUrl = parseAndSanitizeStringInput(incomingFormDataPayloadObject.wel_imageUrl);

        // =====================================================================
        // 🌟 12. الرتب والرد التلقائي (Auto-Roles & Responders)
        // =====================================================================
        if (incomingFormDataPayloadObject.autoRoles !== undefined) {
            guildConfigDocumentToUpdateObject.autoRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.autoRoles);
        }

        if (incomingFormDataPayloadObject.autoRespondersData !== undefined && incomingFormDataPayloadObject.autoRespondersData !== '') {
            try {
                const parsedRespondersArray = JSON.parse(incomingFormDataPayloadObject.autoRespondersData);
                if (Array.isArray(parsedRespondersArray)) guildConfigDocumentToUpdateObject.autoResponders = parsedRespondersArray;
            } catch (jsonParsingError) {}
        }

        // =====================================================================
        // 🌟 13. نظام الحماية ومكافحة الغزو (Protection & Anti-Nuke)
        // =====================================================================
        if (!guildConfigDocumentToUpdateObject.protection) guildConfigDocumentToUpdateObject.protection = {};

        guildConfigDocumentToUpdateObject.protection.antiLinkEnabled = (incomingFormDataPayloadObject.prot_antiLinkEnabled === 'on' || incomingFormDataPayloadObject.prot_antiLinkEnabled === 'true');
        if (incomingFormDataPayloadObject.prot_antiLinkAllowedRoles !== undefined) guildConfigDocumentToUpdateObject.protection.antiLinkAllowedRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.prot_antiLinkAllowedRoles);
        
        guildConfigDocumentToUpdateObject.protection.antiSpamEnabled = (incomingFormDataPayloadObject.prot_antiSpamEnabled === 'on' || incomingFormDataPayloadObject.prot_antiSpamEnabled === 'true');
        if (incomingFormDataPayloadObject.prot_antiSpamAction !== undefined) guildConfigDocumentToUpdateObject.protection.antiSpamAction = parseAndSanitizeStringInput(incomingFormDataPayloadObject.prot_antiSpamAction, 'mute');

        guildConfigDocumentToUpdateObject.protection.antiNukeEnabled = (incomingFormDataPayloadObject.prot_antiNukeEnabled === 'on' || incomingFormDataPayloadObject.prot_antiNukeEnabled === 'true');
        
        if (incomingFormDataPayloadObject.prot_maxChannelDeletesPerMinute !== undefined) {
            const parsedChannelDeletes = parseInt(incomingFormDataPayloadObject.prot_maxChannelDeletesPerMinute);
            if (!isNaN(parsedChannelDeletes) && parsedChannelDeletes > 0) guildConfigDocumentToUpdateObject.protection.maxChannelDeletesPerMinute = parsedChannelDeletes;
        }
        if (incomingFormDataPayloadObject.prot_maxBanPerMinute !== undefined) {
            const parsedBanLimit = parseInt(incomingFormDataPayloadObject.prot_maxBanPerMinute);
            if (!isNaN(parsedBanLimit) && parsedBanLimit > 0) guildConfigDocumentToUpdateObject.protection.maxBanPerMinute = parsedBanLimit;
        }

        // =====================================================================
        // 🌟 14. الاقتصاد والألعاب (Economy & Games)
        // =====================================================================
        if (!guildConfigDocumentToUpdateObject.economy) guildConfigDocumentToUpdateObject.economy = {};

        guildConfigDocumentToUpdateObject.economy.enabled = (incomingFormDataPayloadObject.eco_enabled === 'on' || incomingFormDataPayloadObject.eco_enabled === 'true');
        
        if (incomingFormDataPayloadObject.eco_dailyMin !== undefined) {
            const parsedDailyMin = parseInt(incomingFormDataPayloadObject.eco_dailyMin);
            if (!isNaN(parsedDailyMin)) guildConfigDocumentToUpdateObject.economy.dailyMin = parsedDailyMin;
        }
        if (incomingFormDataPayloadObject.eco_dailyMax !== undefined) {
            const parsedDailyMax = parseInt(incomingFormDataPayloadObject.eco_dailyMax);
            if (!isNaN(parsedDailyMax)) guildConfigDocumentToUpdateObject.economy.dailyMax = parsedDailyMax;
        }
        if (incomingFormDataPayloadObject.eco_transferTaxPercentage !== undefined) {
            const parsedTax = parseInt(incomingFormDataPayloadObject.eco_transferTaxPercentage);
            if (!isNaN(parsedTax)) guildConfigDocumentToUpdateObject.economy.transferTaxPercentage = parsedTax;
        }
        guildConfigDocumentToUpdateObject.economy.gamesEnabled = (incomingFormDataPayloadObject.eco_gamesEnabled === 'on' || incomingFormDataPayloadObject.eco_gamesEnabled === 'true');

        // =====================================================================
        // 🌟 15. نظام المستويات والرتب (Leveling & Role Rewards)
        // =====================================================================
        if (!guildConfigDocumentToUpdateObject.leveling) guildConfigDocumentToUpdateObject.leveling = {};

        guildConfigDocumentToUpdateObject.leveling.enabled = (incomingFormDataPayloadObject.lvl_enabled === 'on' || incomingFormDataPayloadObject.lvl_enabled === 'true');
        if (incomingFormDataPayloadObject.lvl_levelUpChannelId !== undefined) guildConfigDocumentToUpdateObject.leveling.levelUpChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.lvl_levelUpChannelId);
        if (incomingFormDataPayloadObject.lvl_levelUpMessage !== undefined) guildConfigDocumentToUpdateObject.leveling.levelUpMessage = parseAndSanitizeStringInput(incomingFormDataPayloadObject.lvl_levelUpMessage, 'مبروك {user}! وصلت للمستوى **{level}** 🚀');

        if (incomingFormDataPayloadObject.lvl_roleRewardsData !== undefined && incomingFormDataPayloadObject.lvl_roleRewardsData !== '') {
            try {
                const parsedRewardsArray = JSON.parse(incomingFormDataPayloadObject.lvl_roleRewardsData);
                if (Array.isArray(parsedRewardsArray)) guildConfigDocumentToUpdateObject.leveling.roleRewards = parsedRewardsArray;
            } catch (jsonParsingError) {}
        }

        // =====================================================================
        // 🚀 حفظ المستند العملاق النهائي
        // =====================================================================
        await guildConfigDocumentToUpdateObject.save();
        console.log(`[DASHBOARD LOG] ✅ Successfully saved massive payload (15 Sections) for Guild ID: ${targetGuildDiscordIdString}`);
        response.redirect(`/settings/${targetGuildDiscordIdString}?success=true`);

    } catch (databaseSaveCriticalExceptionError) {
        console.error('[DASHBOARD CRITICAL ERROR] Failed to save settings to MongoDB:', databaseSaveCriticalExceptionError);
        response.redirect(`/settings/${targetGuildDiscordIdString}?error=true`);
    }
});

// =========================================================================================================
// 🚀 8. تهيئة وتشغيل خادم الويب
// =========================================================================================================

module.exports = (discordClientObject) => {
    
    app.locals.client = discordClientObject;
    const DASHBOARD_NETWORK_PORT_NUMBER = process.env.PORT || 8080;

    app.listen(DASHBOARD_NETWORK_PORT_NUMBER, () => {
        console.log('\n====================================================');
        console.log(`[DASHBOARD SYSTEM BOOT] 🌐 Ultimate Enterprise Web Dashboard is ONLINE`);
        console.log(`[DASHBOARD SYSTEM BOOT] 📡 Express Server is actively listening on PORT: ${DASHBOARD_NETWORK_PORT_NUMBER}`);
        console.log('====================================================\n');
    });
};
