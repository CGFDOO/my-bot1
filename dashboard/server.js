const express = require('express');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const session = require('express-session');
const path = require('path');
const GuildConfig = require('../models/GuildConfig');

module.exports = (client) => {
    const app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public')));

    // إعدادات الجلسة (Session)
    app.use(session({
        secret: process.env.SESSION_SECRET || 'MNC_SECRET_KEY_V13',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 60000 * 60 * 24 } // يوم كامل
    }));

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));

    // إعدادات Passport (تسجيل الدخول عبر ديسكورد)
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

    // 🟢 الصفحات الرئيسية
    app.get('/', (req, res) => res.render('index', { user: req.user }));
    
    app.get('/login', passport.authenticate('discord'));
    app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));
    
    app.get('/logout', (req, res, next) => {
        req.logout(err => {
            if (err) return next(err);
            res.redirect('/');
        });
    });

    // 🟢 صفحة اختيار السيرفرات (الداشبورد)
    app.get('/dashboard', (req, res) => {
        if (!req.user) return res.redirect('/login');
        // إظهار السيرفرات اللي هو أدمن فيها بس
        const adminGuilds = req.user.guilds.filter(g => (g.permissions & 0x8) === 0x8);
        res.render('dashboard', { user: req.user, guilds: adminGuilds });
    });

    // 🟢 عرض صفحة إعدادات السيرفر
    app.get('/settings/:guildID', async (req, res) => {
        if (!req.user) return res.redirect('/login');
        
        const guild = client.guilds.cache.get(req.params.guildID);
        if (!guild) return res.send(`
            <div style="text-align:center; font-family:sans-serif; margin-top:50px; color:white; background:#121212; height:100vh; padding-top:20px;">
                <h1>❌ البوت ليس في هذا السيرفر</h1>
                <p>يجب عليك إضافة البوت للسيرفر أولاً لتتمكن من إعداده.</p>
                <a href="https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot" style="background:#5865F2; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">اضغط هنا لإضافة البوت</a>
            </div>
        `);

        // التأكد إن المستخدم أدمن
        const userGuild = req.user.guilds.find(g => g.id === req.params.guildID);
        if (!userGuild || (userGuild.permissions & 0x8) !== 0x8) return res.send("❌ ليس لديك صلاحية للتحكم في هذا السيرفر!");

        // جلب الإعدادات من الداتابيز
        let config = await GuildConfig.findOne({ guildId: guild.id });
        if (!config) config = await GuildConfig.create({ guildId: guild.id });

        // جلب الرومات والرتب
        const channels = guild.channels.cache
            .filter(c => c.type === 0 || c.type === 4 || c.type === 2) // نصوص، أقسام، أو صوت
            .map(c => ({ id: c.id, name: c.name, type: c.type }));
            
        const roles = guild.roles.cache
            .filter(r => r.name !== '@everyone')
            .map(r => ({ id: r.id, name: r.name }));

        res.render('settings', { guild, config, channels, roles, user: req.user });
    });

    // 🟢 حفظ الإعدادات الجديدة الشاملة
    app.post('/settings/:guildID', async (req, res) => {
        if (!req.user) return res.redirect('/login');

        const { 
            ticketCount, categoryId, ticketEmbedTitle, ticketEmbedDesc, ticketEmbedColor, ticketEmbedImage,
            staffRoleId, adminRoles, cmdDone, cmdCome, cmdApprove,
            transcriptChannelId, ticketLogChannelId, staffRatingChannelId, mediatorRatingChannelId,
            logRoleCreateId, logJoinLeaveId, logMsgDeleteId, logImgDeleteId, logVoiceId
        } = req.body;

        // تظبيط الرتب العليا عشان لو اختار رتبة واحدة الداتابيز متضربش (بتحولها لمصفوفة أوتوماتيك)
        let formattedAdminRoles = [];
        if (adminRoles) {
            formattedAdminRoles = Array.isArray(adminRoles) ? adminRoles : [adminRoles];
        }

        await GuildConfig.findOneAndUpdate(
            { guildId: req.params.guildID },
            { 
                ticketCount: parseInt(ticketCount) || 0, 
                categoryId, 
                ticketEmbedTitle, 
                ticketEmbedDesc, 
                ticketEmbedColor, 
                ticketEmbedImage,
                staffRoleId, 
                adminRoles: formattedAdminRoles,
                cmdDone, 
                cmdCome, 
                cmdApprove,
                transcriptChannelId, 
                ticketLogChannelId, 
                staffRatingChannelId, 
                mediatorRatingChannelId,
                logRoleCreateId, 
                logJoinLeaveId, 
                logMsgDeleteId, 
                logImgDeleteId, 
                logVoiceId
            },
            { upsert: true }
        );

        res.redirect(`/settings/${req.params.guildID}`);
    });

    // تشغيل السيرفر على البورت
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => console.log(`🌐 Dashboard Running on port ${PORT}`));
};
