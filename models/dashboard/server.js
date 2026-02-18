const express = require('express');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const session = require('express-session');
const path = require('path');

module.exports = (client) => {
    const app = express();

    // إعدادات الدخول بـ ديسكورد
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

    app.set('view engine', 'ejs');
    app.use(session({ secret: 'MNC_DASH', resave: false, saveUninitialized: false }));
    app.use(passport.initialize());
    app.use(passport.session());

    // الصفحات
    app.get('/', (req, res) => res.render('index', { user: req.user }));
    app.get('/login', passport.authenticate('discord'));
    app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => res.redirect('/dashboard'));
    
    app.get('/dashboard', (req, res) => {
        if (!req.user) return res.redirect('/login');
        const adminGuilds = req.user.guilds.filter(g => (g.permissions & 0x8) === 0x8);
        res.render('dashboard', { user: req.user, guilds: adminGuilds });
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🌐 Dashboard live on port ${PORT}`));
};
