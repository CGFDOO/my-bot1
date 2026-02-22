// =========================================================================================================
// 🌐 محرك لوحة التحكم العملاق (ULTIMATE ENTERPRISE DASHBOARD SERVER - OAUTH2 & EXPRESS)
// ---------------------------------------------------------------------------------------------------------
// المسار: dashboard/server.js
// الوظيفة: تشغيل خادم ويب (Web Server)، ربط تسجيل الدخول بديسكورد (OAuth2)، 
// عرض صفحات الـ EJS، ومعالجة وحفظ كافة إعدادات السيرفر (GuildConfig) بدقة متناهية.
// تم كتابة الكود بطريقة (Hyper-Verbose) لضمان حماية كل مدخل من مدخلات الداشبورد.
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

// توسيع حجم الطلبات (Payload) لاستيعاب البيانات الضخمة القادمة من الداشبورد
// تم رفع الحد الأقصى إلى 100 ميجابايت لتفادي أي مشاكل عند حفظ إعدادات البانلات المتعددة
app.use(express.urlencoded({ extended: true, limit: '100mb', parameterLimit: 100000 }));
app.use(express.json({ limit: '100mb' }));

// =========================================================================================================
// 🔒 2. نظام الجلسات والحماية (Sessions & Security Configuration)
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
    // يتم تمرير بيانات المستخدم بمجرد نجاح المصادقة مع خوادم ديسكورد
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

// دالة حماية الصفحات: تمنع أي شخص غير مسجل من الدخول للداشبورد
function checkAuthenticationValidation(request, response, nextFunction) {
    if (request.isAuthenticated() === true) {
        return nextFunction(); 
    }
    console.log('[DASHBOARD SECURITY] Unauthorized access attempt blocked. Redirecting to login.');
    response.redirect('/auth/discord'); 
}

// دالة لمعالجة وتنظيف المصفوفات (Arrays) القادمة من الداشبورد
function parseAndSanitizeArrayInput(rawInputData) {
    if (rawInputData === undefined || rawInputData === null) {
        return [];
    }
    if (Array.isArray(rawInputData) === true) {
        return rawInputData.filter(item => item !== null && item.trim() !== '');
    }
    if (typeof rawInputData === 'string') {
        const splitArray = rawInputData.split(',');
        const cleanedArray = [];
        for (let i = 0; i < splitArray.length; i++) {
            const trimmedItem = splitArray[i].trim();
            if (trimmedItem !== '') {
                cleanedArray.push(trimmedItem);
            }
        }
        return cleanedArray;
    }
    return [];
}

// دالة لمعالجة الحقول النصية التي يمكن أن تكون فارغة
function parseAndSanitizeStringInput(rawInputData, defaultValue = null) {
    if (rawInputData === undefined || rawInputData === null) {
        return defaultValue;
    }
    const trimmedString = String(rawInputData).trim();
    if (trimmedString === '' || trimmedString === 'none') {
        return defaultValue;
    }
    return trimmedString;
}

// =========================================================================================================
// 🌐 5. مسارات الموقع الأساسية (Core Web Routes)
// =========================================================================================================

// مسار توجيه المستخدم لصفحة تسجيل دخول ديسكورد
app.get('/auth/discord', passport.authenticate('discord'));

// مسار استقبال المستخدم بعد عودته من ديسكورد
app.get('/auth/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/?error=auth_failed'
}), function(request, response) {
    console.log(`[DASHBOARD AUTH] User ${request.user.username} successfully logged in.`);
    response.redirect('/dashboard'); 
});

// مسار تسجيل الخروج
app.get('/logout', function(request, response, nextFunction) {
    request.logout(function(logoutError) {
        if (logoutError) { 
            console.error('[DASHBOARD ERROR] Logout failed:', logoutError);
            return nextFunction(logoutError); 
        }
        response.redirect('/');
    });
});

// الصفحة الرئيسية (Landing Page)
app.get('/', (request, response) => {
    response.render('index', { 
        user: request.user || null 
    });
});

// صفحة لوحة التحكم واختيار السيرفرات (Server Selection Page)
app.get('/dashboard', checkAuthenticationValidation, (request, response) => {
    // جلب السيرفرات التي يمتلك فيها المستخدم صلاحية Administrator أو Manage Server
    const userAdminGuildsArray = request.user.guilds.filter(function(guildObject) {
        const hasManageServerPermission = (guildObject.permissions & 0x20) === 0x20;
        const hasAdministratorPermission = (guildObject.permissions & 0x8) === 0x8;
        return hasManageServerPermission || hasAdministratorPermission;
    });
    
    response.render('dashboard', { 
        user: request.user, 
        guilds: userAdminGuildsArray 
    });
});

// =========================================================================================================
// ⚙️ 6. مسار جلب وعرض الإعدادات للسيرفر (Settings GET Route)
// =========================================================================================================

app.get('/settings/:guildId', checkAuthenticationValidation, async (request, response) => {
    
    const targetGuildDiscordIdString = request.params.guildId;
    
    // تأكيد ملكية السيرفر للمستخدم لمرة ثانية كطبقة حماية
    let doesUserHaveAccessToGuildBoolean = false;
    for (let i = 0; i < request.user.guilds.length; i++) {
        const currentGuildItem = request.user.guilds[i];
        if (currentGuildItem.id === targetGuildDiscordIdString) {
            const hasManage = (currentGuildItem.permissions & 0x20) === 0x20;
            const hasAdmin = (currentGuildItem.permissions & 0x8) === 0x8;
            if (hasManage || hasAdmin) {
                doesUserHaveAccessToGuildBoolean = true;
                break;
            }
        }
    }
    
    if (doesUserHaveAccessToGuildBoolean === false) {
        console.log(`[DASHBOARD SECURITY] User ${request.user.username} tried to access unauthorized guild: ${targetGuildDiscordIdString}`);
        return response.send('<h1 style="color:red; text-align:center; font-family:sans-serif;">❌ Access Denied! You do not have permission to manage this server.</h1>');
    }

    try {
        let guildConfigurationDocumentObject = await GuildConfigDatabaseModel.findOne({ guildId: targetGuildDiscordIdString });
        
        // إنشاء ملف جديد في قاعدة البيانات إذا لم يكن موجوداً
        if (guildConfigurationDocumentObject === null) {
            console.log(`[DASHBOARD LOG] Creating new database entry for guild: ${targetGuildDiscordIdString}`);
            guildConfigurationDocumentObject = new GuildConfigDatabaseModel({ guildId: targetGuildDiscordIdString });
            await guildConfigurationDocumentObject.save();
        }

        response.render('settings', {
            user: request.user,
            guildId: targetGuildDiscordIdString,
            config: guildConfigurationDocumentObject,
            bot: request.app.locals.client // مفيد جداً لجلب الرومات والرتب في الـ EJS
        });

    } catch (databaseFetchExceptionError) {
        console.error('[DASHBOARD DB ERROR] Failed to fetch settings for GET route:', databaseFetchExceptionError);
        response.send('<h1 style="color:red; text-align:center;">❌ Internal Server Error while loading settings.</h1>');
    }
});

// =========================================================================================================
// 💾 7. مسار الحفظ العملاق والمفصل (THE BEHEMOTH POST ROUTE)
// ---------------------------------------------------------------------------------------------------------
// هذا المسار يستقبل جميع مدخلات الـ HTML Form. تم فرده بالكامل ليعالج كل متغير على حدة بدون اختصارات.
// =========================================================================================================

app.post('/settings/:guildId/save', checkAuthenticationValidation, async (request, response) => {
    
    const targetGuildDiscordIdString = request.params.guildId;
    
    // التحقق الأمني قبل الحفظ
    let doesUserHaveAccessToGuildBoolean = false;
    for (let i = 0; i < request.user.guilds.length; i++) {
        const currentGuildItem = request.user.guilds[i];
        if (currentGuildItem.id === targetGuildDiscordIdString) {
            const hasManage = (currentGuildItem.permissions & 0x20) === 0x20;
            const hasAdmin = (currentGuildItem.permissions & 0x8) === 0x8;
            if (hasManage || hasAdmin) {
                doesUserHaveAccessToGuildBoolean = true;
                break;
            }
        }
    }
    
    if (doesUserHaveAccessToGuildBoolean === false) {
        return response.status(403).send('Forbidden: Access Denied');
    }

    try {
        const incomingFormDataPayloadObject = request.body;
        console.log(`[DASHBOARD LOG] Received massive POST payload for Guild: ${targetGuildDiscordIdString}`);

        let guildConfigDocumentToUpdateObject = await GuildConfigDatabaseModel.findOne({ guildId: targetGuildDiscordIdString });
        
        if (guildConfigDocumentToUpdateObject === null) {
            guildConfigDocumentToUpdateObject = new GuildConfigDatabaseModel({ guildId: targetGuildDiscordIdString });
        }

        // -----------------------------------------------------------------------------------------
        // 🔹 القسم الأول: الإعدادات الأساسية
        // -----------------------------------------------------------------------------------------
        if (incomingFormDataPayloadObject.prefix !== undefined) {
            const rawPrefix = String(incomingFormDataPayloadObject.prefix).trim();
            if (rawPrefix !== '') {
                guildConfigDocumentToUpdateObject.prefix = rawPrefix;
            }
        }

        // -----------------------------------------------------------------------------------------
        // 🔹 القسم الثاني: نظام الوساطة الأساسي (Middleman System)
        // -----------------------------------------------------------------------------------------
        if (!guildConfigDocumentToUpdateObject.middlemanSystem) {
            guildConfigDocumentToUpdateObject.middlemanSystem = {};
        }

        // تفعيل أو تعطيل الوساطة
        guildConfigDocumentToUpdateObject.middlemanSystem.enabled = (incomingFormDataPayloadObject.mm_enabled === 'on' || incomingFormDataPayloadObject.mm_enabled === 'true');
        
        // الأيديهات (IDs)
        if (incomingFormDataPayloadObject.mm_categoryId !== undefined) {
            guildConfigDocumentToUpdateObject.middlemanSystem.categoryId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_categoryId);
        }
        if (incomingFormDataPayloadObject.mm_panelChannelId !== undefined) {
            guildConfigDocumentToUpdateObject.middlemanSystem.panelChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_panelChannelId);
        }

        // نصوص بانل الوساطة الخارجي
        if (incomingFormDataPayloadObject.mm_panelTitle !== undefined) {
            guildConfigDocumentToUpdateObject.middlemanSystem.panelTitle = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_panelTitle, 'تذكرة وساطة آمنة');
        }
        if (incomingFormDataPayloadObject.mm_panelDescription !== undefined) {
            guildConfigDocumentToUpdateObject.middlemanSystem.panelDescription = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_panelDescription, 'لطلب وسيط معتمد من الإدارة، يرجى فتح تذكرة من هنا.');
        }
        if (incomingFormDataPayloadObject.mm_panelColor !== undefined) {
            guildConfigDocumentToUpdateObject.middlemanSystem.panelColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_panelColor, '#f2a658');
        }
        if (incomingFormDataPayloadObject.mm_buttonLabel !== undefined) {
            guildConfigDocumentToUpdateObject.middlemanSystem.buttonLabel = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_buttonLabel, 'طلب وسيط 🛡️');
        }

        // نصوص النافذة المنبثقة للوساطة (Modal)
        if (incomingFormDataPayloadObject.mm_modalTitle !== undefined) {
            guildConfigDocumentToUpdateObject.middlemanSystem.modalTitle = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_modalTitle, 'بيانات الوساطة (Trade Info)');
        }

        // معالجة أسئلة النافذة (Modal Fields JSON)
        if (incomingFormDataPayloadObject.mm_modalFieldsData !== undefined && incomingFormDataPayloadObject.mm_modalFieldsData !== '') {
            try {
                const parsedModalFieldsArray = JSON.parse(incomingFormDataPayloadObject.mm_modalFieldsData);
                if (Array.isArray(parsedModalFieldsArray)) {
                    guildConfigDocumentToUpdateObject.middlemanSystem.modalFields = parsedModalFieldsArray;
                }
            } catch (jsonParsingError) {
                console.error('[DASHBOARD PARSE ERROR] Failed to parse Middleman Modal Fields Array.', jsonParsingError);
            }
        }

        // نصوص الإيمبد الداخلي لتذكرة الوساطة
        if (incomingFormDataPayloadObject.mm_insideTicketTitle !== undefined) {
            guildConfigDocumentToUpdateObject.middlemanSystem.insideTicketTitle = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_insideTicketTitle, 'تذكرة الوساطة');
        }
        if (incomingFormDataPayloadObject.mm_insideTicketDescription !== undefined) {
            guildConfigDocumentToUpdateObject.middlemanSystem.insideTicketDescription = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_insideTicketDescription, 'يرجى انتظار الوسيط، وكتابة تفاصيل المعاملة بدقة.');
        }
        if (incomingFormDataPayloadObject.mm_insideTicketColor !== undefined) {
            guildConfigDocumentToUpdateObject.middlemanSystem.insideTicketColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.mm_insideTicketColor, '#f2a658');
        }

        // -----------------------------------------------------------------------------------------
        // 🔹 القسم الثالث: نظام التذاكر المتعددة (Ticket Panels Arrays)
        // -----------------------------------------------------------------------------------------
        if (incomingFormDataPayloadObject.ticketPanelsData !== undefined && incomingFormDataPayloadObject.ticketPanelsData !== '') {
            try {
                // الداشبورد سترسل مصفوفة البانلات كاملة كـ JSON String ضخم
                const parsedTicketPanelsArray = JSON.parse(incomingFormDataPayloadObject.ticketPanelsData);
                if (Array.isArray(parsedTicketPanelsArray)) {
                    guildConfigDocumentToUpdateObject.ticketPanels = parsedTicketPanelsArray;
                }
            } catch (jsonParsingError) {
                console.error('[DASHBOARD PARSE ERROR] Failed to parse Custom Ticket Panels Array.', jsonParsingError);
            }
        }

        // -----------------------------------------------------------------------------------------
        // 🔹 القسم الرابع: نظام التقييمات (Ratings)
        // -----------------------------------------------------------------------------------------
        if (!guildConfigDocumentToUpdateObject.ratings) {
            guildConfigDocumentToUpdateObject.ratings = {};
        }

        if (incomingFormDataPayloadObject.rating_middlemanLogChannelId !== undefined) {
            guildConfigDocumentToUpdateObject.ratings.middlemanLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.rating_middlemanLogChannelId);
        }
        if (incomingFormDataPayloadObject.rating_middlemanEmbedColor !== undefined) {
            guildConfigDocumentToUpdateObject.ratings.middlemanEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.rating_middlemanEmbedColor, '#f2a658');
        }
        
        if (incomingFormDataPayloadObject.rating_staffLogChannelId !== undefined) {
            guildConfigDocumentToUpdateObject.ratings.staffLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.rating_staffLogChannelId);
        }
        if (incomingFormDataPayloadObject.rating_staffEmbedColor !== undefined) {
            guildConfigDocumentToUpdateObject.ratings.staffEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.rating_staffEmbedColor, '#3ba55d');
        }

        // -----------------------------------------------------------------------------------------
        // 🔹 القسم الخامس: إعدادات تحكم التذاكر والترانسكريبت (Ticket Controls & Transcript)
        // -----------------------------------------------------------------------------------------
        if (!guildConfigDocumentToUpdateObject.ticketControls) {
            guildConfigDocumentToUpdateObject.ticketControls = {};
        }

        if (incomingFormDataPayloadObject.tc_maxOpenTicketsPerUser !== undefined) {
            const parsedMaxTicketsInt = parseInt(incomingFormDataPayloadObject.tc_maxOpenTicketsPerUser);
            if (!isNaN(parsedMaxTicketsInt) && parsedMaxTicketsInt > 0) {
                guildConfigDocumentToUpdateObject.ticketControls.maxOpenTicketsPerUser = parsedMaxTicketsInt;
            }
        }

        if (incomingFormDataPayloadObject.tc_controlPanelColor !== undefined) {
            guildConfigDocumentToUpdateObject.ticketControls.controlPanelColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.tc_controlPanelColor, '#2b2d31');
        }
        
        if (incomingFormDataPayloadObject.tc_ticketLogChannelId !== undefined) {
            guildConfigDocumentToUpdateObject.ticketControls.ticketLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.tc_ticketLogChannelId);
        }
        
        if (incomingFormDataPayloadObject.tc_transcriptChannelId !== undefined) {
            guildConfigDocumentToUpdateObject.ticketControls.transcriptChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.tc_transcriptChannelId);
        }
        
        if (incomingFormDataPayloadObject.tc_transcriptEmbedColor !== undefined) {
            guildConfigDocumentToUpdateObject.ticketControls.transcriptEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.tc_transcriptEmbedColor, '#2b2d31');
        }

        // أزرار التحكم المنطقية (Booleans)
        guildConfigDocumentToUpdateObject.ticketControls.hideTicketOnClaim = (incomingFormDataPayloadObject.tc_hideTicketOnClaim === 'on' || incomingFormDataPayloadObject.tc_hideTicketOnClaim === 'true');
        guildConfigDocumentToUpdateObject.ticketControls.readOnlyStaffOnClaim = (incomingFormDataPayloadObject.tc_readOnlyStaffOnClaim === 'on' || incomingFormDataPayloadObject.tc_readOnlyStaffOnClaim === 'true');

        // -----------------------------------------------------------------------------------------
        // 🔹 القسم السادس: نظام الرتب والصلاحيات (Hierarchy & Roles Configuration)
        // -----------------------------------------------------------------------------------------
        if (!guildConfigDocumentToUpdateObject.roles) {
            guildConfigDocumentToUpdateObject.roles = {};
        }

        // الرتب الفردية الأساسية
        if (incomingFormDataPayloadObject.role_adminRoleId !== undefined) {
            guildConfigDocumentToUpdateObject.roles.adminRoleId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.role_adminRoleId);
        }
        if (incomingFormDataPayloadObject.role_middlemanRoleId !== undefined) {
            guildConfigDocumentToUpdateObject.roles.middlemanRoleId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.role_middlemanRoleId);
        }

        // مصفوفات الرتب المتعددة (Multiple Roles Arrays)
        if (incomingFormDataPayloadObject.role_highAdminRoles !== undefined) {
            guildConfigDocumentToUpdateObject.roles.highAdminRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.role_highAdminRoles);
        }
        if (incomingFormDataPayloadObject.role_highMiddlemanRoles !== undefined) {
            guildConfigDocumentToUpdateObject.roles.highMiddlemanRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.role_highMiddlemanRoles);
        }
        if (incomingFormDataPayloadObject.role_tradePingRoleIds !== undefined) {
            guildConfigDocumentToUpdateObject.roles.tradePingRoleIds = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.role_tradePingRoleIds);
        }
        if (incomingFormDataPayloadObject.role_tradeApproveRoleIds !== undefined) {
            guildConfigDocumentToUpdateObject.roles.tradeApproveRoleIds = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.role_tradeApproveRoleIds);
        }

        // -----------------------------------------------------------------------------------------
        // 🔹 القسم السابع: الأوامر الديناميكية ورتبها (Dynamic Commands & Allowed Roles)
        // -----------------------------------------------------------------------------------------
        if (!guildConfigDocumentToUpdateObject.commands) {
            guildConfigDocumentToUpdateObject.commands = {};
        }

        // 1. أمر مسح الرسائل (Clear)
        if (incomingFormDataPayloadObject.cmd_clearCmd !== undefined) {
            guildConfigDocumentToUpdateObject.commands.clearCmd = parseAndSanitizeStringInput(incomingFormDataPayloadObject.cmd_clearCmd, 'clear');
        }
        if (incomingFormDataPayloadObject.cmd_clearAllowedRoles !== undefined) {
            guildConfigDocumentToUpdateObject.commands.clearAllowedRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.cmd_clearAllowedRoles);
        }

        // 2. أمر الحظر (Ban)
        if (incomingFormDataPayloadObject.cmd_banCmd !== undefined) {
            guildConfigDocumentToUpdateObject.commands.banCmd = parseAndSanitizeStringInput(incomingFormDataPayloadObject.cmd_banCmd, 'ban');
        }
        if (incomingFormDataPayloadObject.cmd_banAllowedRoles !== undefined) {
            guildConfigDocumentToUpdateObject.commands.banAllowedRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.cmd_banAllowedRoles);
        }

        // 3. أمر الإسكات (Timeout)
        if (incomingFormDataPayloadObject.cmd_timeoutCmd !== undefined) {
            guildConfigDocumentToUpdateObject.commands.timeoutCmd = parseAndSanitizeStringInput(incomingFormDataPayloadObject.cmd_timeoutCmd, 'timeout');
        }
        if (incomingFormDataPayloadObject.cmd_timeoutAllowedRoles !== undefined) {
            guildConfigDocumentToUpdateObject.commands.timeoutAllowedRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.cmd_timeoutAllowedRoles);
        }

        // 4. أمر الاستدعاء الفخم (Come)
        if (incomingFormDataPayloadObject.cmd_comeCmd !== undefined) {
            guildConfigDocumentToUpdateObject.commands.comeCmd = parseAndSanitizeStringInput(incomingFormDataPayloadObject.cmd_comeCmd, 'come');
        }
        if (incomingFormDataPayloadObject.cmd_comeAllowedRoles !== undefined) {
            guildConfigDocumentToUpdateObject.commands.comeAllowedRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.cmd_comeAllowedRoles);
        }

        // 5. أمر تقييم الوسيط (Done)
        if (incomingFormDataPayloadObject.cmd_doneCmd !== undefined) {
            guildConfigDocumentToUpdateObject.commands.doneCmd = parseAndSanitizeStringInput(incomingFormDataPayloadObject.cmd_doneCmd, 'done');
        }
        if (incomingFormDataPayloadObject.cmd_doneAllowedRoles !== undefined) {
            guildConfigDocumentToUpdateObject.commands.doneAllowedRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.cmd_doneAllowedRoles);
        }

        // 6. أمر طلب بيانات الوساطة (Trade)
        if (incomingFormDataPayloadObject.cmd_tradeCmd !== undefined) {
            guildConfigDocumentToUpdateObject.commands.tradeCmd = parseAndSanitizeStringInput(incomingFormDataPayloadObject.cmd_tradeCmd, 'trade');
        }
        if (incomingFormDataPayloadObject.cmd_tradeAllowedRoles !== undefined) {
            guildConfigDocumentToUpdateObject.commands.tradeAllowedRoles = parseAndSanitizeArrayInput(incomingFormDataPayloadObject.cmd_tradeAllowedRoles);
        }
        if (incomingFormDataPayloadObject.cmd_tradeEmbedColor !== undefined) {
            guildConfigDocumentToUpdateObject.commands.tradeEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.cmd_tradeEmbedColor, '#f2a658');
        }

        // -----------------------------------------------------------------------------------------
        // 🔹 القسم الثامن: سجلات السيرفر المفصلة والمدمجة (Server Logs & Events Logging)
        // -----------------------------------------------------------------------------------------
        if (!guildConfigDocumentToUpdateObject.serverLogs) {
            guildConfigDocumentToUpdateObject.serverLogs = {};
        }

        // سجل الرسائل (حذف النصوص، حذف الصور، تعديل الرسائل) - مدمج
        if (incomingFormDataPayloadObject.log_messageLogChannelId !== undefined) {
            guildConfigDocumentToUpdateObject.serverLogs.messageLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_messageLogChannelId);
        }
        if (incomingFormDataPayloadObject.log_messageLogEmbedColor !== undefined) {
            guildConfigDocumentToUpdateObject.serverLogs.messageLogEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_messageLogEmbedColor, '#fee75c');
        }

        // سجل الدخول والخروج من السيرفر (Join / Leave)
        if (incomingFormDataPayloadObject.log_memberJoinLeaveLogChannelId !== undefined) {
            guildConfigDocumentToUpdateObject.serverLogs.memberJoinLeaveLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_memberJoinLeaveLogChannelId);
        }
        if (incomingFormDataPayloadObject.log_memberJoinEmbedColor !== undefined) {
            guildConfigDocumentToUpdateObject.serverLogs.memberJoinEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_memberJoinEmbedColor, '#3ba55d');
        }
        if (incomingFormDataPayloadObject.log_memberLeaveEmbedColor !== undefined) {
            guildConfigDocumentToUpdateObject.serverLogs.memberLeaveEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_memberLeaveEmbedColor, '#ed4245');
        }

        // سجل الحالات الصوتية (Voice States)
        if (incomingFormDataPayloadObject.log_voiceStateLogChannelId !== undefined) {
            guildConfigDocumentToUpdateObject.serverLogs.voiceStateLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_voiceStateLogChannelId);
        }
        if (incomingFormDataPayloadObject.log_voiceStateEmbedColor !== undefined) {
            guildConfigDocumentToUpdateObject.serverLogs.voiceStateEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_voiceStateEmbedColor, '#5865F2');
        }

        // سجل تحديثات الرتب (Role Updates)
        if (incomingFormDataPayloadObject.log_roleUpdateLogChannelId !== undefined) {
            guildConfigDocumentToUpdateObject.serverLogs.roleUpdateLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_roleUpdateLogChannelId);
        }
        if (incomingFormDataPayloadObject.log_roleUpdateEmbedColor !== undefined) {
            guildConfigDocumentToUpdateObject.serverLogs.roleUpdateEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_roleUpdateEmbedColor, '#ffffff');
        }

        // سجل العقوبات الصارمة (Ban & Kick)
        if (incomingFormDataPayloadObject.log_banKickLogChannelId !== undefined) {
            guildConfigDocumentToUpdateObject.serverLogs.banKickLogChannelId = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_banKickLogChannelId);
        }
        if (incomingFormDataPayloadObject.log_banKickEmbedColor !== undefined) {
            guildConfigDocumentToUpdateObject.serverLogs.banKickEmbedColor = parseAndSanitizeStringInput(incomingFormDataPayloadObject.log_banKickEmbedColor, '#992d22');
        }

        // -----------------------------------------------------------------------------------------
        // 🔹 القسم التاسع: نظام التحذيرات والعقوبات التلقائية (Warnings & Auto Punishments)
        // -----------------------------------------------------------------------------------------
        if (!guildConfigDocumentToUpdateObject.warnings) {
            guildConfigDocumentToUpdateObject.warnings = {};
        }

        // الحد الأقصى للتحذيرات قبل تطبيق العقوبة
        if (incomingFormDataPayloadObject.warn_maxWarnings !== undefined) {
            const parsedMaxWarningsInt = parseInt(incomingFormDataPayloadObject.warn_maxWarnings);
            if (!isNaN(parsedMaxWarningsInt) && parsedMaxWarningsInt > 0) {
                guildConfigDocumentToUpdateObject.warnings.maxWarnings = parsedMaxWarningsInt;
            }
        }

        // نوع العقوبة التلقائية (timeout, kick, ban)
        if (incomingFormDataPayloadObject.warn_autoAction !== undefined) {
            const requestedActionString = String(incomingFormDataPayloadObject.warn_autoAction).toLowerCase().trim();
            const validWarningActionsArray = ['timeout', 'kick', 'ban'];
            
            if (validWarningActionsArray.includes(requestedActionString)) {
                guildConfigDocumentToUpdateObject.warnings.autoAction = requestedActionString;
            }
        }

        // -----------------------------------------------------------------------------------------
        // 🔹 القسم العاشر والأخير: حفظ المستند النهائي في قاعدة البيانات (Save Document)
        // -----------------------------------------------------------------------------------------
        
        // استخدام Save لتطبيق جميع التعديلات أعلاه بأمان
        await guildConfigDocumentToUpdateObject.save();
        
        console.log(`[DASHBOARD LOG] ✅ Mongoose Database has successfully saved the massive payload for Guild ID: ${targetGuildDiscordIdString}`);

        // إعادة التوجيه للصفحة مرة أخرى مع عرض إشعار النجاح للمستخدم
        response.redirect(`/settings/${targetGuildDiscordIdString}?success=true`);

    } catch (databaseSaveCriticalExceptionError) {
        
        console.error('====================================================');
        console.error(`[DASHBOARD CRITICAL ERROR] Failed to save massive settings object to MongoDB for Guild ID: ${targetGuildDiscordIdString}`);
        console.error('Exception Details:');
        console.error(databaseSaveCriticalExceptionError);
        console.error('====================================================');
        
        // إعادة التوجيه للصفحة مع عرض رسالة خطأ للمستخدم
        response.redirect(`/settings/${targetGuildDiscordIdString}?error=true`);
    }
});

// =========================================================================================================
// 🚀 8. تهيئة وتشغيل خادم الويب (Server Boot & Network Listener Initialization)
// =========================================================================================================

module.exports = (discordClientObject) => {
    
    // تمرير البوت للـ Views لاستخدامه بشكل مباشر في جلب الرومات والرتب في صفحات الـ HTML/EJS
    // هذه الخطوة ضرورية جداً لبناء الـ Select Menus في الداشبورد
    app.locals.client = discordClientObject;

    // استخراج البورت من متغيرات البيئة (مهم جداً لسيرفرات مثل Railway و Heroku)
    const DASHBOARD_NETWORK_PORT_NUMBER = process.env.PORT || 8080;

    // بدء الاستماع على الشبكة
    app.listen(DASHBOARD_NETWORK_PORT_NUMBER, () => {
        console.log('\n====================================================');
        console.log(`[DASHBOARD SYSTEM BOOT] 🌐 Ultimate Enterprise Web Dashboard is ONLINE`);
        console.log(`[DASHBOARD SYSTEM BOOT] 📡 Express Server is actively listening on PORT: ${DASHBOARD_NETWORK_PORT_NUMBER}`);
        console.log(`[DASHBOARD SYSTEM BOOT] 🔒 OAuth2 Session Secret and Passport Strategies are configured.`);
        console.log('====================================================\n');
    });
};
