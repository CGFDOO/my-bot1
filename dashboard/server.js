const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const GuildSettings = require('../models/GuildSettings'); 

module.exports = (client) => {
    app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
    app.use(bodyParser.json({ limit: '50mb' }));
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));
    app.use(express.static(path.join(__dirname, '../public')));

    app.use(session({
        secret: 'imprator-secret-key-2026',
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

    app.get('/', (req, res) => res.render('index', { user: req.user }));
    app.get('/login', passport.authenticate('discord'));
    app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));

    app.get('/dashboard', (req, res) => {
        if (!req.isAuthenticated()) return res.redirect('/login');
        const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20 || (g.permissions & 0x8) === 0x8);
        res.render('dashboard', { user: req.user, bot: client, guilds: userGuilds }); 
    });

    app.get('/settings/:guildId', async (req, res) => {
        if (!req.isAuthenticated()) return res.redirect('/login');
        try {
            const guildId = req.params.guildId;
            const guild = client.guilds.cache.get(guildId);
            if (!guild) return res.send('❌ البوت غير موجود في هذا السيرفر! قم بدعوته أولاً.');

            let config = await GuildSettings.findOne({ guildId: guildId });
            if (!config) config = new GuildSettings({ guildId: guildId }); // إرسال ملف ديفولت لو مفيش

            res.render('settings', {
                bot: client, user: req.user, guild: guild, guildId: guildId, config: config,
                success: req.query.success === 'true' 
            });
        } catch (error) {
            console.error(error);
            res.status(500).send("Internal Server Error");
        }
    });

    app.post('/settings/:guildId/save', async (req, res) => {
        if (!req.isAuthenticated()) return res.redirect('/login');
        try {
            const guildId = req.params.guildId;
            const body = req.body;

            const parseJSON = (data, fallback) => { try { return data ? JSON.parse(data) : fallback; } catch (e) { return fallback; } };
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
                    footerText: body.emb_footerText || '',
                    footerIconUrl: body.emb_footerIconUrl || '',
                    thumbnailUrl: body.emb_thumbnailUrl || ''
                },
                
                aiSystem: {
                    enabled: body.ai_enabled === 'on',
                    allowUserChoice: body.ai_allowUserChoice === 'on',
                    defaultBoyName: body.ai_defaultBoyName,
                    defaultGirlName: body.ai_defaultGirlName,
                    chatChannelId: body.ai_chatChannelId
                },
                
                ticketPanels: parseJSON(body.ticketPanelsData, []), 
                autoResponders: parseJSON(body.autoRespondersData, []),
                
                autoLine: {
                    trigger: body.autoLine_trigger || 'خط',
                    imageUrl: body.autoLine_imageUrl || '',
                    deleteTrigger: body.autoLine_deleteTrigger === 'on'
                },

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
                }
            };

            await GuildSettings.findOneAndUpdate(
                { guildId: guildId }, 
                { $set: updatedConfig }, 
                { upsert: true, new: true } 
            );

            res.redirect(`/settings/${guildId}?success=true`);
        } catch (error) {
            console.error("❌ خطأ أثناء الحفظ:", error);
            res.status(500).send("حدث خطأ أثناء الحفظ.");
        }
    });

    const PORT = process.env.PORT || 8080; 
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n✅ [WEB DASHBOARD] تعمل بنجاح على بورت: ${PORT}\n`);
    });
};
