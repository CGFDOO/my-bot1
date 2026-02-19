const express = require('express');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const session = require('express-session');
const path = require('path');
const GuildConfig = require('../models/GuildConfig');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js'); // ضفنا مكاتب ديسكورد هنا عشان البانر التلقائي

module.exports = (client) => {
    const app = express();
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.static(path.join(__dirname, 'public')));

    app.use(session({
        secret: process.env.SESSION_SECRET || 'MNC_COMMUNITY_SECRET',
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

    app.post('/settings/:guildID', async (req, res) => {
        if (!req.user) return res.redirect('/login');

        const formatArray = (val) => Array.isArray(val) ? val : (val ? [val] : []);
        let parsedButtons = [], parsedWarnReasons = [];
        try {
            if (req.body.customButtonsData) parsedButtons = JSON.parse(req.body.customButtonsData);
            if (req.body.warnReasonsData) parsedWarnReasons = JSON.parse(req.body.warnReasonsData);
        } catch(e) { console.log('Error parsing JSON:', e); }

        const data = req.body;

        await GuildConfig.findOneAndUpdate(
            { guildId: req.params.guildID },
            { 
                prefix: data.prefix, autoRoleId: data.autoRoleId,
                antiLinks: data.antiLinks === 'on', antiSpam: data.antiSpam === 'on', 
                gamesEnabled: data.gamesEnabled === 'on', gamesChannelId: data.gamesChannelId,
                levelingEnabled: data.levelingEnabled === 'on', levelUpChannelId: data.levelUpChannelId, suggestionChannelId: data.suggestionChannelId,
                welcomeChannelId: data.welcomeChannelId, welcomeMessage: data.welcomeMessage, welcomeBgImage: data.welcomeBgImage, welcomeAvatarBorderColor: data.welcomeAvatarBorderColor,
                warnPanelChannelId: data.warnPanelChannelId, warnLogChannelId: data.warnLogChannelId, warnPanelTitle: data.warnPanelTitle, warnPanelDesc: data.warnPanelDesc, warnPanelColor: data.warnPanelColor, warnMax: parseInt(data.warnMax) || 3, warnAction: data.warnAction, warnReasons: parsedWarnReasons,
                panelChannelId: data.panelChannelId, defaultCategoryId: data.defaultCategoryId, ticketEmbedTitle: data.ticketEmbedTitle, ticketEmbedDesc: data.ticketEmbedDesc, ticketEmbedColor: data.ticketEmbedColor, ticketEmbedImage: data.ticketEmbedImage, ticketCount: parseInt(data.ticketCount) || 0, maxTicketsPerUser: parseInt(data.maxTicketsPerUser) || 1, customButtons: parsedButtons,
                adminRoleId: data.adminRoleId, highAdminRoles: formatArray(data.highAdminRoles), mediatorRoleId: data.mediatorRoleId, highMediatorRoles: formatArray(data.highMediatorRoles), hideTicketOnClaim: data.hideTicketOnClaim === 'on', readOnlyStaffOnClaim: data.readOnlyStaffOnClaim === 'on',
                cmdAdd: data.cmdAdd, cmdAddRoles: formatArray(data.cmdAddRoles), cmdDone: data.cmdDone, cmdDoneRoles: formatArray(data.cmdDoneRoles), cmdReqHigh: data.cmdReqHigh, cmdReqHighRoles: formatArray(data.cmdReqHighRoles), cmdCome: data.cmdCome, cmdComeRoles: formatArray(data.cmdComeRoles), cmdTrade: data.cmdTrade, cmdTradeRoles: formatArray(data.cmdTradeRoles), cmdClear: data.cmdClear, cmdClearRoles: formatArray(data.cmdClearRoles), cmdLock: data.cmdLock, cmdLockRoles: formatArray(data.cmdLockRoles), cmdUnlock: data.cmdUnlock, cmdUnlockRoles: formatArray(data.cmdUnlockRoles), cmdVmove: data.cmdVmove, cmdVmoveRoles: formatArray(data.cmdVmoveRoles), cmdBan: data.cmdBan, cmdBanRoles: formatArray(data.cmdBanRoles), cmdTimeout: data.cmdTimeout, cmdTimeoutRoles: formatArray(data.cmdTimeoutRoles),
                transcriptChannelId: data.transcriptChannelId, ticketLogChannelId: data.ticketLogChannelId, staffRatingChannelId: data.staffRatingChannelId, mediatorRatingChannelId: data.mediatorRatingChannelId, logRoleCreateDeleteId: data.logRoleCreateDeleteId, logMemberRoleUpdateId: data.logMemberRoleUpdateId, logJoinLeaveId: data.logJoinLeaveId, logMsgDeleteId: data.logMsgDeleteId, logMsgUpdateId: data.logMsgUpdateId, logImgDeleteId: data.logImgDeleteId, logVoiceId: data.logVoiceId, logInviteId: data.logInviteId, logChannelThreadId: data.logChannelThreadId, logBanId: data.logBanId, logTimeoutId: data.logTimeoutId, logUnwarnId: data.logUnwarnId
            },
            { upsert: true }
        );

        // ==========================================
        // 🚀 السحر هنا: إرسال بانر التكتات تلقائياً عند الحفظ
        // ==========================================
        if (data.panelChannelId) {
            const guild = client.guilds.cache.get(req.params.guildID);
            if (guild) {
                const panelChannel = guild.channels.cache.get(data.panelChannelId);
                if (panelChannel) {
                    
                    // 1. مسح الرسائل القديمة للبوت في هذه الروم لتجنب التكرار
                    try {
                        const fetchedMessages = await panelChannel.messages.fetch({ limit: 20 });
                        const botMessages = fetchedMessages.filter(m => m.author.id === client.user.id);
                        await panelChannel.bulkDelete(botMessages);
                    } catch(err) { console.log('لا توجد صلاحية لمسح الرسائل القديمة أو الروم فارغة.'); }

                    // 2. بناء الإيمبد الأساسي
                    const embed = new EmbedBuilder()
                        .setTitle(data.ticketEmbedTitle || 'الدعم الفني')
                        .setDescription(data.ticketEmbedDesc || 'اضغط على الزر لفتح تذكرة')
                        .setColor(data.ticketEmbedColor || '#0099ff');
                    
                    if (data.ticketEmbedImage) embed.setImage(data.ticketEmbedImage);

                    // 3. بناء الأزرار ورصها جنب بعض
                    const components = [];
                    let currentRow = new ActionRowBuilder();

                    if (parsedButtons && parsedButtons.length > 0) {
                        parsedButtons.forEach((btn, index) => {
                            // كل 5 زراير ينزل سطر جديد
                            if (index > 0 && index % 5 === 0) {
                                components.push(currentRow);
                                currentRow = new ActionRowBuilder();
                            }

                            let btnStyle = ButtonStyle.Primary;
                            if (btn.color === 'Success') btnStyle = ButtonStyle.Success;
                            else if (btn.color === 'Danger') btnStyle = ButtonStyle.Danger;
                            else if (btn.color === 'Secondary') btnStyle = ButtonStyle.Secondary;

                            currentRow.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`ticket_open_${btn.id}`)
                                    .setLabel(btn.label)
                                    .setStyle(btnStyle)
                            );
                        });
                        components.push(currentRow);
                    }

                    // 4. إرسال البانر للروم
                    await panelChannel.send({ embeds: [embed], components: components }).catch(console.error);
                }
            }
        }

        res.redirect(`/settings/${req.params.guildID}?success=saved`);
    });

    app.post('/settings/:guildID/send-embed', async (req, res) => {
        if (!req.user) return res.redirect('/login');
        const guild = client.guilds.cache.get(req.params.guildID);
        if (!guild) return res.redirect('/dashboard');

        const channel = guild.channels.cache.get(req.body.embedChannelId);
        if (channel) {
            const embed = {
                title: req.body.embedTitle || '\u200b',
                description: req.body.embedDesc || '\u200b',
                color: parseInt((req.body.embedColor || '#5865F2').replace('#', ''), 16)
            };
            if (req.body.embedImage) embed.image = { url: req.body.embedImage };
            if (req.body.embedFooter) embed.footer = { text: req.body.embedFooter };
            await channel.send({ embeds: [embed] }).catch(err => console.log(err));
        }
        res.redirect(`/settings/${req.params.guildID}?success=embed_sent`);
    });

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => console.log(`🌐 Dashboard Running on port ${PORT}`));
};
