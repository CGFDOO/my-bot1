const express = require('express');
const passport = require('passport');
const { Strategy } = require('passport-discord');
const session = require('express-session');
const path = require('path');
const GuildConfig = require('../models/GuildConfig');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = (client) => {
    
    const app = express();
    
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    app.use(express.json({ limit: '50mb' }));
    app.use(express.static(path.join(__dirname, 'public')));

    app.use(session({
        secret: process.env.SESSION_SECRET || 'MNC_COMMUNITY_SUPER_SECRET_KEY_2026',
        resave: false,
        saveUninitialized: false,
        cookie: { 
            maxAge: 60000 * 60 * 24 * 7 
        }
    }));

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));

    passport.serializeUser((user, done) => { 
        done(null, user); 
    });
    
    passport.deserializeUser((obj, done) => { 
        done(null, obj); 
    });

    passport.use(new Strategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL,
        scope: ['identify', 'guilds']
    }, (accessToken, refreshToken, profile, done) => {
        process.nextTick(() => { 
            return done(null, profile); 
        });
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    app.get('/', (req, res) => { 
        res.render('index', { user: req.user }); 
    });
    
    app.get('/login', passport.authenticate('discord'));
    
    app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => { 
        res.redirect('/dashboard'); 
    });
    
    app.get('/logout', (req, res, next) => { 
        req.logout(err => { 
            if (err) { 
                return next(err); 
            } 
            res.redirect('/'); 
        }); 
    });

    app.get('/dashboard', (req, res) => {
        if (!req.user) { 
            return res.redirect('/login'); 
        }
        
        const adminGuilds = req.user.guilds.filter(guild => { 
            return (guild.permissions & 0x8) === 0x8; 
        });
        
        res.render('dashboard', { 
            user: req.user, 
            guilds: adminGuilds 
        });
    });

    app.get('/settings/:guildID', async (req, res) => {
        if (!req.user) { 
            return res.redirect('/login'); 
        }
        
        const targetGuildID = req.params.guildID;
        const discordGuild = client.guilds.cache.get(targetGuildID);
        
        if (!discordGuild) { 
            return res.send(`<div style="text-align:center; padding-top:50px; color:white; background:#121212; height:100vh;"><h1>❌ البوت ليس متواجداً في هذا السيرفر! قم بدعوته أولاً.</h1></div>`); 
        }

        const userGuildData = req.user.guilds.find(g => g.id === targetGuildID);
        
        if (!userGuildData || (userGuildData.permissions & 0x8) !== 0x8) { 
            return res.send(`<div style="text-align:center; color:red; margin-top:50px; background:#121212; height:100vh;"><h1>❌ ليس لديك صلاحية Administrator لفتح هذه الصفحة!</h1></div>`); 
        }

        let serverConfig = await GuildConfig.findOne({ guildId: discordGuild.id });
        
        if (!serverConfig) { 
            serverConfig = await GuildConfig.create({ guildId: discordGuild.id }); 
        }

        const textAndVoiceChannels = discordGuild.channels.cache.filter(c => { 
            return c.type === 0 || c.type === 4 || c.type === 2; 
        }).map(c => { 
            return { id: c.id, name: c.name, type: c.type }; 
        });
        
        const guildRoles = discordGuild.roles.cache.filter(r => { 
            return r.name !== '@everyone'; 
        }).map(r => { 
            return { id: r.id, name: r.name }; 
        });

        res.render('settings', { 
            guild: discordGuild, 
            config: serverConfig, 
            channels: textAndVoiceChannels, 
            roles: guildRoles, 
            user: req.user, 
            success: req.query.success 
        });
    });

    app.post('/settings/:guildID', async (req, res) => {
        if (!req.user) { 
            return res.redirect('/login'); 
        }

        const formatArray = (val) => {
            if (Array.isArray(val)) { 
                return val; 
            } else if (val) { 
                return [val]; 
            } else { 
                return []; 
            }
        };
        
        let parsedButtons = [];
        let parsedWarnReasons = [];
        
        try {
            if (req.body.customButtonsData) { 
                parsedButtons = JSON.parse(req.body.customButtonsData); 
            }
            if (req.body.warnReasonsData) { 
                parsedWarnReasons = JSON.parse(req.body.warnReasonsData); 
            }
        } catch(error) {
            console.log("Error parsing JSON");
        }

        const formData = req.body;
        const targetGuildID = req.params.guildID;

        await GuildConfig.findOneAndUpdate(
            { guildId: targetGuildID },
            { 
                prefix: formData.prefix, 
                autoRoleId: formData.autoRoleId,
                antiLinks: formData.antiLinks === 'on', 
                antiSpam: formData.antiSpam === 'on', 
                
                gamesEnabled: formData.gamesEnabled === 'on', 
                gamesChannelId: formData.gamesChannelId,
                levelingEnabled: formData.levelingEnabled === 'on', 
                levelUpChannelId: formData.levelUpChannelId, 
                suggestionChannelId: formData.suggestionChannelId,
                
                welcomeChannelId: formData.welcomeChannelId, 
                welcomeMessage: formData.welcomeMessage, 
                welcomeBgImage: formData.welcomeBgImage, 
                welcomeAvatarBorderColor: formData.welcomeAvatarBorderColor,
                welcomeEmbedColor: formData.welcomeEmbedColor,
                
                warnPanelChannelId: formData.warnPanelChannelId, 
                warnLogChannelId: formData.warnLogChannelId, 
                warnPanelTitle: formData.warnPanelTitle, 
                warnPanelDesc: formData.warnPanelDesc, 
                warnPanelColor: formData.warnPanelColor, 
                warnMax: parseInt(formData.warnMax) || 3, 
                warnAction: formData.warnAction, 
                warnReasons: parsedWarnReasons,
                
                panelChannelId: formData.panelChannelId, 
                defaultCategoryId: formData.defaultCategoryId, 
                ticketEmbedTitle: formData.ticketEmbedTitle, 
                ticketEmbedDesc: formData.ticketEmbedDesc, 
                ticketEmbedColor: formData.ticketEmbedColor, 
                ticketEmbedImage: formData.ticketEmbedImage, 
                ticketCount: parseInt(formData.ticketCount) || 0, 
                maxTicketsPerUser: parseInt(formData.maxTicketsPerUser) || 1, 
                
                customButtons: parsedButtons,
                
                adminRoleId: formData.adminRoleId, 
                highAdminRoles: formatArray(formData.highAdminRoles), 
                mediatorRoleId: formData.mediatorRoleId, 
                highMediatorRoles: formatArray(formData.highMediatorRoles), 
                hideTicketOnClaim: formData.hideTicketOnClaim === 'on', 
                readOnlyStaffOnClaim: formData.readOnlyStaffOnClaim === 'on',
                
                cmdAdd: formData.cmdAdd, cmdAddRoles: formatArray(formData.cmdAddRoles), 
                cmdDone: formData.cmdDone, cmdDoneRoles: formatArray(formData.cmdDoneRoles), 
                cmdReqHigh: formData.cmdReqHigh, cmdReqHighRoles: formatArray(formData.cmdReqHighRoles), 
                cmdCome: formData.cmdCome, cmdComeRoles: formatArray(formData.cmdComeRoles), 
                
                // 🔥 تحديث أوامر التريد والموافقات والمنشن
                cmdTrade: formData.cmdTrade, 
                cmdTradeRoles: formatArray(formData.cmdTradeRoles), 
                tradeApproveRoles: formatArray(formData.tradeApproveRoles),
                tradeMentionRoles: formatArray(formData.tradeMentionRoles),
                
                cmdClear: formData.cmdClear, cmdClearRoles: formatArray(formData.cmdClearRoles), 
                cmdLock: formData.cmdLock, cmdLockRoles: formatArray(formData.cmdLockRoles), 
                cmdUnlock: formData.cmdUnlock, cmdUnlockRoles: formatArray(formData.cmdUnlockRoles), 
                cmdVmove: formData.cmdVmove, cmdVmoveRoles: formatArray(formData.cmdVmoveRoles), 
                cmdBan: formData.cmdBan, cmdBanRoles: formatArray(formData.cmdBanRoles), 
                cmdTimeout: formData.cmdTimeout, cmdTimeoutRoles: formatArray(formData.cmdTimeoutRoles),
                cmdUnban: formData.cmdUnban, cmdUnbanRoles: formatArray(formData.cmdUnbanRoles),
                cmdUntimeout: formData.cmdUntimeout, cmdUntimeoutRoles: formatArray(formData.cmdUntimeoutRoles),
                cmdMove: formData.cmdMove, cmdMoveRoles: formatArray(formData.cmdMoveRoles),

                logEmbedColor: formData.logEmbedColor,
                transcriptEmbedColor: formData.transcriptEmbedColor,
                basicRatingColor: formData.basicRatingColor,
                staffRatingColor: formData.staffRatingColor,
                closeEmbedColor: formData.closeEmbedColor,
                answersEmbedColor: formData.answersEmbedColor,
                tradeEmbedColor: formData.tradeEmbedColor,
                banEmbedColor: formData.banEmbedColor,
                unbanEmbedColor: formData.unbanEmbedColor,
                timeoutEmbedColor: formData.timeoutEmbedColor,
                untimeoutEmbedColor: formData.untimeoutEmbedColor,
                
                ratingStyle: formData.ratingStyle,
                customRatingTitle: formData.customRatingTitle,
                customRatingText: formData.customRatingText,
                customMedRatingTitle: formData.customMedRatingTitle,
                customMedRatingText: formData.customMedRatingText,

                punishmentStyle: formData.punishmentStyle,
                customBanTitle: formData.customBanTitle,
                customBanDesc: formData.customBanDesc,
                customUnbanTitle: formData.customUnbanTitle,
                customUnbanDesc: formData.customUnbanDesc,
                customTimeoutTitle: formData.customTimeoutTitle,
                customTimeoutDesc: formData.customTimeoutDesc,
                customUntimeoutTitle: formData.customUntimeoutTitle,
                customUntimeoutDesc: formData.customUntimeoutDesc,

                transcriptChannelId: formData.transcriptChannelId, 
                ticketLogChannelId: formData.ticketLogChannelId, 
                staffRatingChannelId: formData.staffRatingChannelId, 
                mediatorRatingChannelId: formData.mediatorRatingChannelId, 
                logRoleCreateDeleteId: formData.logRoleCreateDeleteId, 
                logMemberRoleUpdateId: formData.logMemberRoleUpdateId, 
                logJoinLeaveId: formData.logJoinLeaveId, 
                logMsgDeleteId: formData.logMsgDeleteId, 
                logMsgUpdateId: formData.logMsgUpdateId, 
                logImgDeleteId: formData.logImgDeleteId, 
                logVoiceId: formData.logVoiceId, 
                logInviteId: formData.logInviteId, 
                logChannelThreadId: formData.logChannelThreadId, 
                logBanId: formData.logBanId, 
                logTimeoutId: formData.logTimeoutId, 
                logUnwarnId: formData.logUnwarnId
            },
            { upsert: true }
        );

        if (formData.panelChannelId) {
            const discordGuild = client.guilds.cache.get(targetGuildID);
            
            if (discordGuild) {
                const targetPanelChannel = discordGuild.channels.cache.get(formData.panelChannelId);
                
                if (targetPanelChannel) {
                    try {
                        const fetchedMessages = await targetPanelChannel.messages.fetch({ limit: 30 });
                        const oldBotMessages = fetchedMessages.filter(msg => { 
                            return msg.author.id === client.user.id; 
                        });
                        await targetPanelChannel.bulkDelete(oldBotMessages);
                    } catch(err) {}

                    const panelEmbed = new EmbedBuilder();
                    
                    panelEmbed.setTitle(formData.ticketEmbedTitle || 'الدعم الفني');
                    panelEmbed.setDescription(formData.ticketEmbedDesc || 'اضغط على الزر لفتح تذكرة');
                    panelEmbed.setColor(formData.ticketEmbedColor || '#0099ff');
                    panelEmbed.setThumbnail(discordGuild.iconURL({ dynamic: true }));

                    if (formData.ticketEmbedImage) {
                        panelEmbed.setImage(formData.ticketEmbedImage);
                    }

                    const actionRowsArray = [];
                    let currentRow = new ActionRowBuilder();

                    if (parsedButtons && parsedButtons.length > 0) {
                        for (let i = 0; i < parsedButtons.length; i++) {
                            const btnData = parsedButtons[i];
                            
                            if (i > 0 && i % 5 === 0) {
                                actionRowsArray.push(currentRow);
                                currentRow = new ActionRowBuilder();
                            }
                            
                            let buttonStyle = ButtonStyle.Primary;
                            if (btnData.color === 'Success') { 
                                buttonStyle = ButtonStyle.Success; 
                            } else if (btnData.color === 'Danger') { 
                                buttonStyle = ButtonStyle.Danger; 
                            } else if (btnData.color === 'Secondary') { 
                                buttonStyle = ButtonStyle.Secondary; 
                            }

                            const newButton = new ButtonBuilder();
                            newButton.setCustomId(`ticket_open_${btnData.id}`);
                            newButton.setLabel(btnData.label);
                            newButton.setStyle(buttonStyle);
                            
                            currentRow.addComponents(newButton);
                        }
                        
                        actionRowsArray.push(currentRow);
                    }
                    
                    await targetPanelChannel.send({ 
                        embeds: [panelEmbed], 
                        components: actionRowsArray 
                    }).catch(console.error);
                }
            }
        }
        res.redirect(`/settings/${targetGuildID}?success=saved`);
    });

    app.post('/settings/:guildID/send-embed', async (req, res) => {
        if (!req.user) { 
            return res.redirect('/login'); 
        }
        const targetGuildID = req.params.guildID;
        const discordGuild = client.guilds.cache.get(targetGuildID);
        if (!discordGuild) { 
            return res.redirect('/dashboard'); 
        }

        const targetChannel = discordGuild.channels.cache.get(req.body.embedChannelId);
        if (targetChannel) {
            let colorHexCode = req.body.embedColor || '#5865F2';
            colorHexCode = colorHexCode.replace('#', '');
            
            const customEmbedMessage = new EmbedBuilder();
            
            if (req.body.embedTitle) { 
                customEmbedMessage.setTitle(req.body.embedTitle); 
            }
            if (req.body.embedDesc) { 
                customEmbedMessage.setDescription(req.body.embedDesc); 
            }
            
            customEmbedMessage.setColor(parseInt(colorHexCode, 16));
            
            if (req.body.embedImage) { 
                customEmbedMessage.setImage(req.body.embedImage); 
            }
            if (req.body.embedFooter) { 
                customEmbedMessage.setFooter({ text: req.body.embedFooter }); 
            }
            
            await targetChannel.send({ embeds: [customEmbedMessage] }).catch(err => console.log(err));
        }
        
        res.redirect(`/settings/${targetGuildID}?success=embed_sent`);
    });

    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => { 
        console.log(`🌐 Dashboard Running on port ${PORT}`); 
    });
};
