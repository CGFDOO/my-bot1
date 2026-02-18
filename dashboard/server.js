const express = require('express');
const passport = require('passport');
const session = require('express-session');
const path = require('path');
const GuildConfig = require('../models/GuildConfig'); // استدعاء ملف الذاكرة

module.exports = (client) => {
    const app = express();
    app.use(express.urlencoded({ extended: true }));

    // إعدادات الـ Session والـ Passport (زي ما هي)
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));
    app.use(session({ secret: 'MNC_SECRET', resave: false, saveUninitialized: false }));
    app.use(passport.initialize());
    app.use(passport.session());

    // --- المسارات الذكية ---

    // صفحة الإعدادات (اللي بتلقط كل حاجة لوحدها)
    app.get('/settings/:guildID', async (req, res) => {
        if (!req.user) return res.redirect('/login');
        
        const guild = client.guilds.cache.get(req.params.guildID);
        if (!guild) return res.send("البوت مش موجود في السيرفر ده!");

        // جلب الإعدادات من الداتابيز (رقم التكت 360 وغيره)
        let config = await GuildConfig.findOne({ guildId: guild.id });
        if (!config) config = await GuildConfig.create({ guildId: guild.id });

        // جلب الرومات والرتب تلقائياً
        const channels = guild.channels.cache.map(c => ({ id: c.id, name: c.name, type: c.type }));
        const roles = guild.roles.cache.map(r => ({ id: r.id, name: r.name }));

        res.render('settings', { guild, config, channels, roles });
    });

    // حفظ البيانات من الداشبورد للداتابيز
    app.post('/settings/:guildID', async (req, res) => {
        const { ticketChannelId, staffRoleId } = req.body;
        await GuildConfig.findOneAndUpdate(
            { guildId: req.params.guildID },
            { ticketChannelId, staffRoleId },
            { upsert: true }
        );
        res.redirect(`/settings/${req.params.guildID}?success=true`);
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🌐 Dashboard is smart & live on port ${PORT}`));
};
