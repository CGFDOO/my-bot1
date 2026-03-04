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
            if (!config) config = new GuildSettings({ guildId: guildId });

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
                
                embedSetup: { primaryColor: body.emb_primaryColor, successColor: body.emb_successColor, errorColor: body.emb_errorColor, footerText: body.emb_footerText, footerIconUrl: body.emb_footerIconUrl, thumbnailUrl: body.emb_thumbnailUrl },
                aiSystem: { enabled: body.ai_enabled === 'on', allowUserChoice: body.ai_allowUserChoice === 'on', defaultBoyName: body.ai_defaultBoyName, defaultGirlName: body.ai_defaultGirlName, chatChannelId: body.ai_chatChannelId },
                
                ticketPanels: parseJSON(body.ticketPanelsData, []), 
                autoResponders: parseJSON(body.autoRespondersData, []),
                autoLine: { trigger: body.autoLine_trigger, imageUrl: body.autoLine_imageUrl, deleteTrigger: body.autoLine_deleteTrigger === 'on' },

                middlemanSystem: { enabled: body.mm_enabled === 'on', categoryId: body.mm_categoryId, panelChannelId: body.mm_panelChannelId, panelTitle: body.mm_panelTitle, panelColor: body.mm_panelColor, panelDescription: body.mm_panelDescription, buttonLabel: body.mm_buttonLabel, modalTitle: body.mm_modalTitle, modalFields: parseJSON(body.mm_modalFieldsData, []), insideTicketTitle: body.mm_insideTicketTitle, insideTicketColor: body.mm_insideTicketColor, insideTicketDescription: body.mm_insideTicketDescription, modalAnswersEmbedColor: body.mm_modalAnswersEmbedColor },
                ticketControls: { twoStepClose: body.tc_twoStepClose === 'on', ticketCounter: parseInt(body.tc_ticketCounter) || 1, transcriptChannelId: body.tc_transcriptChannelId, ticketLogChannelId: body.tc_ticketLogChannelId, hideTicketOnClaim: body.tc_hideTicketOnClaim === 'on', readOnlyStaffOnClaim: body.tc_readOnlyStaffOnClaim === 'on' },
                warnings: { maxWarnings: parseInt(body.warn_maxWarnings) || 3, autoAction: body.warn_autoAction, panelChannelId: body.warn_panelChannelId, panelColor: body.warn_panelColor, panelTitle: body.warn_panelTitle, panelDescription: body.warn_panelDescription, reasonsDataAr: parseJSON(body.warn_reasonsDataAr, []), reasonsDataEn: parseJSON(body.warn_reasonsDataEn, []) },
                roles: { adminRoleId: body.role_adminRoleId, middlemanRoleId: body.role_middlemanRoleId, highAdminRoles: getArray(body.role_highAdminRoles), tradePingRoleIds: getArray(body.role_tradePingRoleIds), tradeApproveRoleIds: getArray(body.role_tradeApproveRoleIds) },
                protection: { antiLinkEnabled: body.prot_antiLinkEnabled === 'on', antiSpamEnabled: body.prot_antiSpamEnabled === 'on', antiNukeEnabled: body.prot_antiNukeEnabled === 'on' },
                
                welcomeSystem: { welcomeEnabled: body.wel_welcomeEnabled === 'on', welcomeChannelId: body.wel_welcomeChannelId, backgroundUrl: body.wel_backgroundUrl, welcomeMessage: body.wel_welcomeMessage, avatarBorderHex: body.wel_avatarBorderHex, textColorHex: body.wel_textColorHex, leaveEnabled: body.wel_leaveEnabled === 'on', leaveChannelId: body.wel_leaveChannelId, leaveMessage: body.wel_leaveMessage },
                economy: { enabled: body.eco_enabled === 'on', taxPercentage: parseFloat(body.eco_taxPercentage) || 5, dailyMin: parseInt(body.eco_dailyMin) || 1000, dailyMax: parseInt(body.eco_dailyMax) || 3000 },
                leveling: { enabled: body.lvl_enabled === 'on', levelUpChannelId: body.lvl_levelUpChannelId, levelUpMessage: body.lvl_levelUpMessage, topDailyCmd: body.lvl_topDailyCmd, topWeeklyCmd: body.lvl_topWeeklyCmd, topMonthlyCmd: body.lvl_topMonthlyCmd, topGlobalCmd: body.lvl_topGlobalCmd, roleRewards: parseJSON(body.lvl_roleRewardsData, []) },
                commands: { banCmd: body.cmd_banCmd, unbanCmd: body.cmd_unbanCmd, timeoutCmd: body.cmd_timeoutCmd, untimeoutCmd: body.cmd_untimeoutCmd, warnCmd: body.cmd_warnCmd, unwarnCmd: body.cmd_unwarnCmd, muteCmd: body.cmd_muteCmd, unmuteCmd: body.cmd_unmuteCmd, taxCmd: body.cmd_taxCmd, clearCmd: body.cmd_clearCmd, comeCmd: body.cmd_comeCmd, moveCmd: body.cmd_moveCmd, lockCmd: body.cmd_lockCmd, unlockCmd: body.cmd_unlockCmd, tradeCmd: body.cmd_tradeCmd, approveCmd: body.cmd_approveCmd, doneCmd: body.cmd_doneCmd, allowedRoles: { ban: getArray(body.role_banAllowed), timeout: getArray(body.role_timeoutAllowed), warn: getArray(body.role_warnAllowed), mute: getArray(body.role_muteAllowed), tax: getArray(body.role_taxAllowed), clear: getArray(body.role_clearAllowed), come: getArray(body.role_comeAllowed), move: getArray(body.role_moveAllowed), lock: getArray(body.role_lockAllowed), trade: getArray(body.role_tradeAllowed), approve: getArray(body.role_approveAllowed), done: getArray(body.role_doneAllowed) } },
                serverLogs: { reactionLogId: body.log_reactionLogId, reactionColor: body.log_reactionColor, channelCreateDeleteLogId: body.log_channelCreateDeleteLogId, channelColor: body.log_channelColor, threadCreateDeleteLogId: body.log_threadCreateDeleteLogId, threadColor: body.log_threadColor, roleCreateDeleteLogId: body.log_roleCreateDeleteLogId, roleCreateColor: body.log_roleCreateColor, banKickLogId: body.log_banKickLogId, banColor: body.log_banColor, unbanLogId: body.log_unbanLogId, unbanColor: body.log_unbanColor, timeoutLogId: body.log_timeoutLogId, timeoutColor: body.log_timeoutColor, untimeoutLogId: body.log_untimeoutLogId, untimeoutColor: body.log_untimeoutColor, warningsLogId: body.log_warningsLogId, warnColor: body.log_warnColor, unwarningsLogId: body.log_unwarningsLogId, unwarnColor: body.log_unwarnColor, messageDeleteLogId: body.log_messageDeleteLogId, msgDelColor: body.log_msgDelColor, messageEditLogId: body.log_messageEditLogId, msgEditColor: body.log_msgEditColor, imageDeleteLogId: body.log_imageDeleteLogId, imgDelColor: body.log_imgDelColor, roleGiveTakeLogId: body.log_roleGiveTakeLogId, roleColor: body.log_roleColor, memberJoinLeaveLogId: body.log_memberJoinLeaveLogId, joinColor: body.log_joinColor, leaveColor: body.log_leaveColor },
                ratings: { staffLogChannelId: body.rating_staffLogChannelId, staffEmbedColor: body.rating_staffEmbedColor, middlemanLogChannelId: body.rating_middlemanLogChannelId, middlemanEmbedColor: body.rating_middlemanEmbedColor }
            };

            await GuildSettings.findOneAndUpdate({ guildId: guildId }, { $set: updatedConfig }, { upsert: true, new: true });
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
