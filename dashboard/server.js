const express = require('express');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const session = require('express-session');
const path = require('path');
const GuildConfig = require('../models/GuildConfig'); // ربط الداتابيز

module.exports = (client) => {
    const app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.static(path.join(__dirname, 'public'))); // للملفات الثابتة لو احتجتها

    // إعدادات الجلسة (Session)
    app.use(session({
        secret: 'MNC_SECRET_KEY_V13',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 60000 * 60 * 24 } // يوم كامل
    }));

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));

    // إعدادات Passport (تسجيل الدخول)
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

    // 🟢 صفحة إعدادات سيرفر معين
    app.get('/settings/:guildID', async (req, res) => {
        if (!req.user) return res.redirect('/login');
        
        const guild = client.guilds.cache.get(req.params.guildID);
        if (!guild) return res.send(`
            <h1>❌ البوت ليس في هذا السيرفر</h1>
            <p>يجب عليك إضافة البوت للسيرفر أولاً لتتمكن من إعداده.</p>
            <a href="https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot">اضغط هنا لإضافة البوت</a>
        `);

        // التأكد إن المستخدم أدمن في السيرفر ده فعلاً
        const userGuild = req.user.guilds.find(g => g.id === req.params.guildID);
        if (!userGuild || (userGuild.permissions & 0x8) !== 0x8) return res.send("❌ ليس لديك صلاحية للتحكم في هذا السيرفر!");

        // جلب الإعدادات من الداتابيز
        let config = await GuildConfig.findOne({ guildId: guild.id });
        if (!config) config = await GuildConfig.create({ guildId: guild.id });

        // جلب الرومات والرتب عشان نعرضها في القائمة
        const channels = guild.channels.cache
            .filter(c => c.type === 0 || c.type === 4) // Text Channels & Categories
            .map(c => ({ id: c.id, name: c.name, type: c.type }));
            
        const roles = guild.roles.cache
            .filter(r => r.name !== '@everyone')
            .map(r => ({ id: r.id, name: r.name }));

        res.render('settings', { guild, config, channels, roles, user: req.user });
    });

    // 🟢 حفظ الإعدادات (لما يدوس حفظ)
    app.post('/settings/:guildID', async (req, res) => {
        if (!req.user) return res.redirect('/login');

        const { ticketCount, ticketChannelId, staffRoleId, adminRoleId, logsChannelId } = req.body;

        await GuildConfig.findOneAndUpdate(
            { guildId: req.params.guildID },
            { 
                ticketCount: parseInt(ticketCount), 
                ticketChannelId, 
                staffRoleId, 
                adminRoleId, 
                logsChannelId 
            },
            { upsert: true }
        );

        res.redirect(`/settings/${req.params.guildID}`);
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🌐 Dashboard Running on port ${PORT}`));
};
