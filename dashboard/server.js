const express = require('express');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const session = require('express-session');
const path = require('path');
const GuildConfig = require('../models/GuildConfig');

module.exports = (client) => {
    const app = express();
    // رفعنا حجم الاستقبال عشان لو عملت 100 زرار الموقع ميهنجش
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.static(path.join(__dirname, 'public')));

    app.use(session({
        secret: process.env.SESSION_SECRET || 'MNC_SECRET_KEY_V13',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 60000 * 60 * 24 }
    }));

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));

    passport.use(new Strategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL,
        scope: ['identify', 'guilds']
    }, (accessToken, refreshToken, profile, done) => {
        process.nextTick(() => done(null, profile));
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    app.get('/', (req, res) => res.render('index', { user: req.user }));
    app.get('/login', passport.authenticate('discord'));
    app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));
    app.get('/logout', (req, res, next) => { req.logout(err => { if (err) return next(err); res.redirect('/'); }); });

    app.get('/dashboard', (req, res) => {
        if (!req.user) return res.redirect('/login');
        const adminGuilds = req.user.guilds.filter(g => (g.permissions & 0x8) === 0x8);
        res.render('dashboard', { user: req.user, guilds: adminGuilds });
    });

    app.get('/settings/:guildID', async (req, res) => {
        if (!req.user) return res.redirect('/login');
        const guild = client.guilds.cache.get(req.params.guildID);
        if (!guild) return res.send(`<div style="text-align:center; padding-top:50px; color:white; background:#121212; height:100vh;"><h1>❌ البوت ليس في هذا السيرفر</h1></div>`);

        const userGuild = req.user.guilds.find(g => g.id === req.params.guildID);
        if (!userGuild || (userGuild.permissions & 0x8) !== 0x8) return res.send("❌ ليس لديك صلاحية!");

        let config = await GuildConfig.findOne({ guildId: guild.id });
        if (!config) config = await GuildConfig.create({ guildId: guild.id });

        const channels = guild.channels.cache.filter(c => c.type === 0 || c.type === 4 || c.type === 2).map(c => ({ id: c.id, name: c.name, type: c.type }));
        const roles = guild.roles.cache.filter(r => r.name !== '@everyone').map(r => ({ id: r.id, name: r.name }));

        res.render('settings', { guild, config, channels, roles, user: req.user, success: req.query.success });
    });

    // 🟢 حفظ الإعدادات الجبارة من الداشبورد للداتابيز
    app.post('/settings/:guildID', async (req, res) => {
        if (!req.user) return res.redirect('/login');

        let parsedButtons = [];
        let parsedResponders = [];
        try {
            if (req.body.customButtonsData) parsedButtons = JSON.parse(req.body.customButtonsData);
            if (req.body.autoRespondersData) parsedResponders = JSON.parse(req.body.autoRespondersData);
        } catch(e) { console.log('Error parsing JSON:', e); }

        const { 
            prefix, autoRoleId, welcomeChannelId, welcomeMessage, welcomeBgImage, welcomeAvatarBorderColor,
            warnLogChannelId, warnMax, warnAction,
            levelUpChannelId, suggestionChannelId,
            panelChannelId, ticketEmbedTitle, ticketEmbedDesc, ticketEmbedColor, ticketEmbedImage, ticketCount, maxTicketsPerUser,
            adminRoleId, highAdminRoles, mediatorRoleId, highMediatorRoles,
            cmdDone, cmdReqHigh, cmdCome, cmdTrade, cmdClear, cmdLock, cmdUnlock, cmdVmove, cmdBan, cmdTimeout,
            transcriptChannelId, ticketLogChannelId, staffRatingChannelId, mediatorRatingChannelId,
            logRoleCreateDeleteId, logMemberRoleUpdateId, logJoinLeaveId, logMsgDeleteId, logMsgUpdateId, logImgDeleteId, logVoiceId
        } = req.body;

        const formatArray = (val) => Array.isArray(val) ? val : (val ? [val] : []);

        await GuildConfig.findOneAndUpdate(
            { guildId: req.params.guildID },
            { 
                prefix, autoRoleId, welcomeChannelId, welcomeMessage, welcomeBgImage, welcomeAvatarBorderColor,
                antiLinks: req.body.antiLinks === 'on', antiSpam: req.body.antiSpam === 'on', levelingEnabled: req.body.levelingEnabled === 'on',
                warnLogChannelId, warnMax: parseInt(warnMax) || 3, warnAction,
                levelUpChannelId, suggestionChannelId,
                panelChannelId, ticketEmbedTitle, ticketEmbedDesc, ticketEmbedColor, ticketEmbedImage, 
                ticketCount: parseInt(ticketCount) || 0, maxTicketsPerUser: parseInt(maxTicketsPerUser) || 1,
                
                customButtons: parsedButtons, 
                autoResponders: parsedResponders,

                adminRoleId, highAdminRoles: formatArray(highAdminRoles), mediatorRoleId, highMediatorRoles: formatArray(highMediatorRoles),
                hideTicketOnClaim: req.body.hideTicketOnClaim === 'on', readOnlyStaffOnClaim: req.body.readOnlyStaffOnClaim === 'on',
                
                cmdDone, cmdReqHigh, cmdCome, cmdTrade, cmdClear, cmdLock, cmdUnlock, cmdVmove, cmdBan, cmdTimeout,
                
                transcriptChannelId, ticketLogChannelId, staffRatingChannelId, mediatorRatingChannelId,
                logRoleCreateDeleteId, logMemberRoleUpdateId, logJoinLeaveId, logMsgDeleteId, logMsgUpdateId, logImgDeleteId, logVoiceId
            },
            { upsert: true }
        );
        res.redirect(`/settings/${req.params.guildID}?success=saved`);
    });

    // 🟢 مسار صانع الإيمبد (Embed Builder) لإرسال الرسائل فوراً
    app.post('/settings/:guildID/send-embed', async (req, res) => {
        if (!req.user) return res.redirect('/login');
        const guild = client.guilds.cache.get(req.params.guildID);
        if (!guild) return res.redirect('/dashboard');

        const { embedChannelId, embedTitle, embedDesc, embedColor, embedImage, embedFooter } = req.body;
        const channel = guild.channels.cache.get(embedChannelId);
        
        if (channel) {
            const embed = {
                title: embedTitle || '\u200b',
                description: embedDesc || '\u200b',
                color: parseInt((embedColor || '#5865F2').replace('#', ''), 16)
            };
            if (embedImage) embed.image = { url: embedImage };
            if (embedFooter) embed.footer = { text: embedFooter };

            await channel.send({ embeds: [embed] }).catch(err => console.log(err));
        }
        res.redirect(`/settings/${req.params.guildID}?success=embed_sent`);
    });

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => console.log(`🌐 Dashboard Running on port ${PORT}`));
};
