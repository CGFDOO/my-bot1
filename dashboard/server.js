const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const GuildSettings = require('../models/GuildSettings'); 

module.exports = (client) => {
    // ==========================================
    // 1. الإعدادات الأساسية 
    // ==========================================
    app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    app.use(bodyParser.json({ limit: '50mb' }));
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));
    app.use(express.static(path.join(__dirname, '../public')));

    // ==========================================
    // 2. نظام تسجيل الدخول (Discord OAuth2)
    // ==========================================
    app.use(session({
        secret: 'imprator-secret-key',
        resave: false,
        saveUninitialized: false
    }));
    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));

    if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.CALLBACK_URL) {
        passport.use(new DiscordStrategy({
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: process.env.CALLBACK_URL,
            scope: ['identify', 'guilds']
        }, function(accessToken, refreshToken, profile, done) {
            process.nextTick(() => done(null, profile));
        }));
    }

    // ==========================================
    // 3. مسارات تسجيل الدخول (Auth Routes)
    // ==========================================
    // الصفحة الرئيسية
    app.get('/', (req, res) => {
        res.render('index', { user: req.user }); // هيفتح ملف index.ejs
    });

    app.get('/login', passport.authenticate('discord'));

    // المسار اللي كان ناقص وحليناه!
    app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => {
        res.redirect('/dashboard'); // هيوديك لصفحة اختيار السيرفرات
    });

    // صفحة اختيار السيرفر
    app.get('/dashboard', (req, res) => {
        if (!req.isAuthenticated()) return res.redirect('/login');
        res.render('dashboard', { user: req.user, bot: client }); 
    });

    // ==========================================
    // 4. مسار عرض صفحة الإعدادات (GET Settings)
    // ==========================================
    app.get('/settings/:guildId', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const guild = client.guilds.cache.get(guildId);
            
            if (!guild) return res.send('❌ البوت غير موجود في هذا السيرفر! قم بدعوته أولاً.');

            let config = await GuildSettings.findOne({ guildId: guildId });
            if (!config) config = {}; 

            res.render('settings', {
                bot: client,
                guild: guild,
                guildId: guildId,
                config: config,
                success: req.query.success === 'true' 
            });
        } catch (error) {
            console.error("❌ خطأ:", error);
            res.status(500).send("حدث خطأ.");
        }
    });

    // ==========================================
    // 5. مسار حفظ البيانات الدبابة (POST Save)
    // ==========================================
    app.post('/settings/:guildId/save', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const body = req.body;

            const parseJSON = (data, fallback) => {
                try { return data ? JSON.parse(data) : fallback; } 
                catch (e) { return fallback; }
            };
            const getArray = (val) => [].concat(val || []).filter(Boolean);

            const updatedConfig = {
                prefix: body.prefix || '!',
                language: body.language || 'ar',
                slashCommandsEnabled: body.slashCommandsEnabled === 'on',
                botOwnerId: body.botOwnerId || '',
                embedSetup: {
                    primaryColor: body.emb_primaryColor || '#5865F2',
                    successColor: body.emb_successColor || '#3ba55d',
                    errorColor: body.emb_errorColor || '#ed4245',
                    footerText: body.emb_footerText || 'System Control',
                    footerIconUrl: body.emb_footerIconUrl,
                    thumbnailUrl: body.emb_thumbnailUrl
                },
                aiSystem: {
                    enabled: body.ai_enabled === 'on',
                    allowUserChoice: body.ai_allowUserChoice === 'on',
                    defaultBoyName: body.ai_defaultBoyName,
                    defaultGirlName: body.ai_defaultGirlName,
                    chatChannelId: body.ai_chatChannelId
                },
                ticketPanels: parseJSON(body.ticketPanelsData, []), 
                middlemanSystem: {
                    enabled: body.mm_enabled === 'on',
                    categoryId: body.mm_categoryId,
                    panelChannelId: body.mm_panelChannelId,
                    panelTitle: body.mm_panelTitle,
                    panelColor: body.mm_panelColor,
                    panelDescription: body.mm_panelDescription,
                    buttonLabel: body.mm_buttonLabel,
                    modalTitle: body.mm_modalTitle,
                    modalFields: parseJSON(body.mm_modalFieldsData, []),
                    insideTicketTitle: body.mm_insideTicketTitle,
                    insideTicketColor: body.mm_insideTicketColor,
                    insideTicketDescription: body.mm_insideTicketDescription,
                    modalAnswersEmbedColor: body.mm_modalAnswersEmbedColor
                },
                ticketControls: {
                    twoStepClose: body.tc_twoStepClose === 'on',
                    ticketCounter: parseInt(body.tc_ticketCounter) || 1,
                    transcriptChannelId: body.tc_transcriptChannelId,
                    ticketLogChannelId: body.tc_ticketLogChannelId,
                    hideTicketOnClaim: body.tc_hideTicketOnClaim === 'on',
                    readOnlyStaffOnClaim: body.tc_readOnlyStaffOnClaim === 'on'
                },
                warnings: {
                    maxWarnings: parseInt(body.warn_maxWarnings) || 3,
                    autoAction: body.warn_autoAction,
                    panelChannelId: body.warn_panelChannelId,
                    panelColor: body.warn_panelColor,
                    panelTitle: body.warn_panelTitle,
                    panelDescription: body.warn_panelDescription,
                    reasonsDataAr: parseJSON(body.warn_reasonsDataAr, []),
                    reasonsDataEn: parseJSON(body.warn_reasonsDataEn, [])
                },
                roles: {
                    adminRoleId: body.role_adminRoleId,
                    middlemanRoleId: body.role_middlemanRoleId,
                    highAdminRoles: getArray(body.role_highAdminRoles),
                    tradePingRoleIds: getArray(body.role_tradePingRoleIds),
                    tradeApproveRoleIds: getArray(body.role_tradeApproveRoleIds)
                },
                protection: {
                    antiLinkEnabled: body.prot_antiLinkEnabled === 'on',
                    antiSpamEnabled: body.prot_antiSpamEnabled === 'on',
                    antiNukeEnabled: body.prot_antiNukeEnabled === 'on'
                },
                autoResponders: parseJSON(body.autoRespondersData, []),
                autoLine: parseJSON(body.autoLineData, { trigger: 'خط', imageUrl: '', deleteTrigger: false })
            };

            await GuildSettings.findOneAndUpdate(
                { guildId: guildId }, 
                { $set: updatedConfig }, 
                { upsert: true, new: true } 
            );

            res.redirect(`/settings/${guildId}?success=true`);

        } catch (error) {
            console.error("❌ خطأ أثناء حفظ إعدادات الداشبورد:", error);
            res.status(500).send("حدث خطأ أثناء حفظ الإعدادات في قاعدة البيانات.");
        }
    });

    // ==========================================
    // 6. تشغيل السيرفر (حل Railway)
    // ==========================================
    const PORT = process.env.PORT || 8080; 
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n✅ [WEB DASHBOARD] الداشبورد تعمل بنجاح على بورت: ${PORT}\n`);
    });
};
