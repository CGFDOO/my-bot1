const express = require('express');
const passport = require('passport');
const discordPassportStrategy = require('passport-discord').Strategy;
const session = require('express-session');
const path = require('path');

// استدعاء قاعدة البيانات ومكاتب ديسكورد
const GuildConfig = require('../models/GuildConfig');
const discordLibrary = require('discord.js');
const EmbedBuilder = discordLibrary.EmbedBuilder;
const ActionRowBuilder = discordLibrary.ActionRowBuilder;
const ButtonBuilder = discordLibrary.ButtonBuilder;
const ButtonStyle = discordLibrary.ButtonStyle;

module.exports = (client) => {
    
    const app = express();
    
    // =====================================================================
    // ⚙️ إعدادات الـ Express الأساسية (مفرودة)
    // =====================================================================
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    app.use(express.json({ limit: '50mb' }));
    
    const publicDirectoryPath = path.join(__dirname, 'public');
    app.use(express.static(publicDirectoryPath));

    // =====================================================================
    // 🔐 إعدادات الجلسات (Sessions)
    // =====================================================================
    const sessionSecretKey = process.env.SESSION_SECRET || 'MNC_COMMUNITY_SUPER_SECRET_KEY_2026';
    
    app.use(session({
        secret: sessionSecretKey,
        resave: false,
        saveUninitialized: false,
        cookie: { 
            maxAge: 60000 * 60 * 24 * 7 // أسبوع كامل
        }
    }));

    // إعداد محرك القوالب
    app.set('view engine', 'ejs');
    const viewsDirectoryPath = path.join(__dirname, '../views');
    app.set('views', viewsDirectoryPath);

    // =====================================================================
    // 🛂 إعدادات تسجيل الدخول بحساب ديسكورد (Passport)
    // =====================================================================
    passport.serializeUser((user, done) => { 
        done(null, user); 
    });
    
    passport.deserializeUser((obj, done) => { 
        done(null, obj); 
    });

    const discordStrategyConfig = {
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: process.env.CALLBACK_URL,
        scope: ['identify', 'guilds']
    };

    passport.use(new discordPassportStrategy(discordStrategyConfig, (accessToken, refreshToken, profile, done) => {
        process.nextTick(() => { 
            return done(null, profile); 
        });
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    // =====================================================================
    // 🌐 الروابط الأساسية (Routes)
    // =====================================================================
    app.get('/', (req, res) => { 
        res.render('index', { user: req.user }); 
    });
    
    app.get('/login', passport.authenticate('discord'));
    
    app.get('/callback', passport.authenticate('discord', { failureRedirect: '/' }), (req, res) => { 
        res.redirect('/dashboard'); 
    });
    
    app.get('/logout', (req, res, next) => { 
        req.logout((err) => { 
            if (err) {
                return next(err); 
            }
            res.redirect('/'); 
        }); 
    });

    // =====================================================================
    // 🖥️ صفحة قائمة السيرفرات (Dashboard)
    // =====================================================================
    app.get('/dashboard', (req, res) => {
        
        if (!req.user) { 
            return res.redirect('/login'); 
        }
        
        const userGuildsArray = req.user.guilds;
        const adminGuildsArray = userGuildsArray.filter((guild) => { 
            const hasAdminPermission = (guild.permissions & 0x8) === 0x8;
            return hasAdminPermission; 
        });
        
        res.render('dashboard', { 
            user: req.user, 
            guilds: adminGuildsArray 
        });
    });

    // =====================================================================
    // ⚙️ صفحة الإعدادات الشاملة للسيرفر (GET)
    // =====================================================================
    app.get('/settings/:guildID', async (req, res) => {
        
        if (!req.user) { 
            return res.redirect('/login'); 
        }
        
        const targetGuildIDString = req.params.guildID;
        const discordGuildObject = client.guilds.cache.get(targetGuildIDString);
        
        if (!discordGuildObject) { 
            const botNotInGuildMessage = `<div style="text-align:center; padding-top:50px; color:white; background:#121212; height:100vh;"><h1>❌ البوت ليس متواجداً في هذا السيرفر! قم بدعوته أولاً.</h1></div>`;
            return res.send(botNotInGuildMessage); 
        }

        const userGuildsArray = req.user.guilds;
        const userGuildDataObject = userGuildsArray.find((g) => g.id === targetGuildIDString);
        
        if (!userGuildDataObject || (userGuildDataObject.permissions & 0x8) !== 0x8) { 
            const noPermissionMessage = `<div style="text-align:center; color:red; margin-top:50px; background:#121212; height:100vh;"><h1>❌ ليس لديك صلاحية Administrator لفتح هذه الصفحة!</h1></div>`;
            return res.send(noPermissionMessage); 
        }

        let serverConfigDocument = await GuildConfig.findOne({ guildId: discordGuildObject.id });
        
        if (!serverConfigDocument) { 
            serverConfigDocument = await GuildConfig.create({ guildId: discordGuildObject.id }); 
        }

        const guildChannelsCollection = discordGuildObject.channels.cache;
        const textAndVoiceChannelsArray = guildChannelsCollection.filter((c) => { 
            return c.type === 0 || c.type === 4 || c.type === 2; 
        }).map((c) => { 
            return { id: c.id, name: c.name, type: c.type }; 
        });
        
        const guildRolesCollection = discordGuildObject.roles.cache;
        const guildRolesArray = guildRolesCollection.filter((r) => { 
            return r.name !== '@everyone'; 
        }).map((r) => { 
            return { id: r.id, name: r.name }; 
        });

        res.render('settings', { 
            guild: discordGuildObject, 
            config: serverConfigDocument, 
            channels: textAndVoiceChannelsArray, 
            roles: guildRolesArray, 
            user: req.user, 
            success: req.query.success 
        });
    });

    // =====================================================================
    // 💾 حفظ الإعدادات في الداتابيز (POST) (مفرود بالكامل لتجنب فقدان أي متغير)
    // =====================================================================
    app.post('/settings/:guildID', async (req, res) => {
        
        if (!req.user) { 
            return res.redirect('/login'); 
        }

        const formatArrayFunction = (val) => {
            if (Array.isArray(val)) {
                return val; 
            } else if (val) {
                return [val]; 
            } else {
                return []; 
            }
        };
        
        let parsedTicketPanelsArray = [];
        let parsedWarnReasonsARArray = [];
        let parsedWarnReasonsENArray = [];
        
        const bodyTicketPanelsData = req.body.ticketPanelsData;
        const bodyWarnReasonsARData = req.body.warnReasonsARData;
        const bodyWarnReasonsENData = req.body.warnReasonsENData;

        try {
            if (bodyTicketPanelsData) {
                parsedTicketPanelsArray = JSON.parse(bodyTicketPanelsData); 
            }
            if (bodyWarnReasonsARData) {
                parsedWarnReasonsARArray = JSON.parse(bodyWarnReasonsARData); 
            }
            if (bodyWarnReasonsENData) {
                parsedWarnReasonsENArray = JSON.parse(bodyWarnReasonsENData); 
            }
        } catch(parsingError) { 
            console.log("Error parsing JSON data from dashboard:", parsingError); 
        }

        const formDataObject = req.body;
        const targetGuildIDString = req.params.guildID;

        // دالة الحفظ الشاملة لجميع المتغيرات في قاعدة البيانات
        await GuildConfig.findOneAndUpdate(
            { guildId: targetGuildIDString },
            { 
                // الأساسيات والحماية
                prefix: formDataObject.prefix, 
                autoRoleId: formDataObject.autoRoleId,
                antiLinks: formDataObject.antiLinks === 'on', 
                antiSpam: formDataObject.antiSpam === 'on', 
                
                // الألعاب والمستويات
                gamesEnabled: formDataObject.gamesEnabled === 'on', 
                gamesChannelId: formDataObject.gamesChannelId,
                levelingEnabled: formDataObject.levelingEnabled === 'on', 
                levelUpChannelId: formDataObject.levelUpChannelId, 
                suggestionChannelId: formDataObject.suggestionChannelId,
                
                // نظام الترحيب
                welcomeChannelId: formDataObject.welcomeChannelId, 
                welcomeMessage: formDataObject.welcomeMessage, 
                welcomeBgImage: formDataObject.welcomeBgImage, 
                welcomeAvatarBorderColor: formDataObject.welcomeAvatarBorderColor,
                welcomeEmbedColor: formDataObject.welcomeEmbedColor,
                
                // نظام التحذيرات المزدوج
                warnPanelChannelId: formDataObject.warnPanelChannelId, 
                warnLogChannelId: formDataObject.warnLogChannelId, 
                warnPanelTitle: formDataObject.warnPanelTitle, 
                warnPanelDesc: formDataObject.warnPanelDesc, 
                warnPanelColor: formDataObject.warnPanelColor, 
                warnMax: parseInt(formDataObject.warnMax) || 3, 
                warnAction: formDataObject.warnAction, 
                warnReasonsAR: parsedWarnReasonsARArray,
                warnReasonsEN: parsedWarnReasonsENArray,
                
                // البانلات والتكتات
                ticketPanels: parsedTicketPanelsArray,
                maxTicketsPerUser: parseInt(formDataObject.maxTicketsPerUser) || 1, 
                hideTicketOnClaim: formDataObject.hideTicketOnClaim === 'on', 
                readOnlyStaffOnClaim: formDataObject.readOnlyStaffOnClaim === 'on',
                
                // الرتب 
                adminRoleId: formDataObject.adminRoleId, 
                highAdminRoles: formatArrayFunction(formDataObject.highAdminRoles), 
                middlemanRoleId: formDataObject.middlemanRoleId, 
                highMiddlemanRoles: formatArrayFunction(formDataObject.highMiddlemanRoles), 
                
                // الأوامر الديناميكية للغرف والتريد
                cmdAdd: formDataObject.cmdAdd, 
                cmdAddRoles: formatArrayFunction(formDataObject.cmdAddRoles), 
                
                cmdDone: formDataObject.cmdDone, 
                cmdDoneRoles: formatArrayFunction(formDataObject.cmdDoneRoles), 
                
                cmdReqHigh: formDataObject.cmdReqHigh, 
                cmdReqHighRoles: formatArrayFunction(formDataObject.cmdReqHighRoles), 
                
                cmdCome: formDataObject.cmdCome, 
                cmdComeRoles: formatArrayFunction(formDataObject.cmdComeRoles), 
                
                cmdTrade: formDataObject.cmdTrade, 
                cmdTradeRoles: formatArrayFunction(formDataObject.cmdTradeRoles), 
                
                tradeApproveRoles: formatArrayFunction(formDataObject.tradeApproveRoles), 
                tradeMentionRoles: formatArrayFunction(formDataObject.tradeMentionRoles),
                
                cmdClear: formDataObject.cmdClear, 
                cmdClearRoles: formatArrayFunction(formDataObject.cmdClearRoles), 
                
                cmdLock: formDataObject.cmdLock, 
                cmdLockRoles: formatArrayFunction(formDataObject.cmdLockRoles), 
                
                cmdUnlock: formDataObject.cmdUnlock, 
                cmdUnlockRoles: formatArrayFunction(formDataObject.cmdUnlockRoles), 
                
                cmdVmove: formDataObject.cmdVmove, 
                cmdVmoveRoles: formatArrayFunction(formDataObject.cmdVmoveRoles), 
                
                // أوامر العقوبات
                cmdBan: formDataObject.cmdBan, 
                cmdBanRoles: formatArrayFunction(formDataObject.cmdBanRoles), 
                
                cmdTimeout: formDataObject.cmdTimeout, 
                cmdTimeoutRoles: formatArrayFunction(formDataObject.cmdTimeoutRoles),
                
                cmdUnban: formDataObject.cmdUnban, 
                cmdUnbanRoles: formatArrayFunction(formDataObject.cmdUnbanRoles),
                
                cmdUntimeout: formDataObject.cmdUntimeout, 
                cmdUntimeoutRoles: formatArrayFunction(formDataObject.cmdUntimeoutRoles),
                
                cmdMove: formDataObject.cmdMove, 
                cmdMoveRoles: formatArrayFunction(formDataObject.cmdMoveRoles),

                // تحكم الألوان الشامل
                logEmbedColor: formDataObject.logEmbedColor,
                transcriptEmbedColor: formDataObject.transcriptEmbedColor,
                basicRatingColor: formDataObject.basicRatingColor,
                staffRatingColor: formDataObject.staffRatingColor,
                closeEmbedColor: formDataObject.closeEmbedColor,
                answersEmbedColor: formDataObject.answersEmbedColor,
                tradeEmbedColor: formDataObject.tradeEmbedColor,
                banEmbedColor: formDataObject.banEmbedColor,
                unbanEmbedColor: formDataObject.unbanEmbedColor,
                timeoutEmbedColor: formDataObject.timeoutEmbedColor,
                untimeoutEmbedColor: formDataObject.untimeoutEmbedColor,
                
                // التقييمات والعقوبات
                ratingStyle: formDataObject.ratingStyle,
                customRatingTitle: formDataObject.customRatingTitle,
                customRatingText: formDataObject.customRatingText,
                customMiddlemanRatingTitle: formDataObject.customMiddlemanRatingTitle,
                customMiddlemanRatingText: formDataObject.customMiddlemanRatingText,

                punishmentStyle: formDataObject.punishmentStyle,
                customBanTitle: formDataObject.customBanTitle,
                customBanDesc: formDataObject.customBanDesc,
                customUnbanTitle: formDataObject.customUnbanTitle,
                customUnbanDesc: formDataObject.customUnbanDesc,
                customTimeoutTitle: formDataObject.customTimeoutTitle,
                customTimeoutDesc: formDataObject.customTimeoutDesc,
                customUntimeoutTitle: formDataObject.customUntimeoutTitle,
                customUntimeoutDesc: formDataObject.customUntimeoutDesc,

                // اللوجات الشاملة (جميع الرومات)
                transcriptChannelId: formDataObject.transcriptChannelId, 
                ticketLogChannelId: formDataObject.ticketLogChannelId, 
                staffRatingChannelId: formDataObject.staffRatingChannelId, 
                middlemanRatingChannelId: formDataObject.middlemanRatingChannelId, 
                logRoleCreateDeleteId: formDataObject.logRoleCreateDeleteId, 
                logMemberRoleUpdateId: formDataObject.logMemberRoleUpdateId, 
                logJoinLeaveId: formDataObject.logJoinLeaveId, 
                logMsgDeleteId: formDataObject.logMsgDeleteId, 
                logMsgUpdateId: formDataObject.logMsgUpdateId, 
                logImgDeleteId: formDataObject.logImgDeleteId, 
                logVoiceId: formDataObject.logVoiceId, 
                logInviteId: formDataObject.logInviteId, 
                logChannelThreadId: formDataObject.logChannelThreadId, 
                logBanId: formDataObject.logBanId, 
                logTimeoutId: formDataObject.logTimeoutId, 
                logUnwarnId: formDataObject.logUnwarnId
            },
            { upsert: true }
        );

        const discordGuildObject = client.guilds.cache.get(targetGuildIDString);
        
        // =====================================================================
        // 🔥 إرسال بانل التحذيرات (مطابق للصورة 5 تماماً: 3 زراير)
        // =====================================================================
        const targetWarnChannelIdString = formDataObject.warnPanelChannelId;
        
        if (discordGuildObject && targetWarnChannelIdString) {
            
            const warnChannelObject = discordGuildObject.channels.cache.get(targetWarnChannelIdString);
            
            if (warnChannelObject) {
                
                try {
                    const fetchedWarnMessagesCollection = await warnChannelObject.messages.fetch({ limit: 30 });
                    
                    const oldWarnBotMessagesCollection = fetchedWarnMessagesCollection.filter(msgObj => { 
                        return msgObj.author.id === client.user.id; 
                    });
                    
                    await warnChannelObject.bulkDelete(oldWarnBotMessagesCollection);
                } catch(deleteWarnMessagesError) {
                    console.log("لا توجد صلاحية لمسح الرسائل في روم لوحة التحذيرات.");
                }

                const warnEmbedObject = new EmbedBuilder();
                
                const finalWarnTitleString = formDataObject.warnPanelTitle || 'لوحة تحكم التحذير';
                warnEmbedObject.setTitle(finalWarnTitleString);
                
                const finalWarnDescString = formDataObject.warnPanelDesc || 'استخدم الأزرار أدناه لإدارة تحذيرات الأعضاء.';
                warnEmbedObject.setDescription(finalWarnDescString);
                
                const finalWarnColorHex = formDataObject.warnPanelColor || '#ed4245';
                warnEmbedObject.setColor(finalWarnColorHex);

                const warnActionRowObject = new ActionRowBuilder();
                
                const giveWarnButtonObject = new ButtonBuilder();
                giveWarnButtonObject.setCustomId('sys_warn_give');
                giveWarnButtonObject.setLabel('تحذير عضو');
                giveWarnButtonObject.setStyle(ButtonStyle.Danger); 
                
                const removeWarnButtonObject = new ButtonBuilder();
                removeWarnButtonObject.setCustomId('sys_warn_remove');
                removeWarnButtonObject.setLabel('إزالة تحذير');
                removeWarnButtonObject.setStyle(ButtonStyle.Success); 
                
                const viewWarnButtonObject = new ButtonBuilder();
                viewWarnButtonObject.setCustomId('sys_warn_view');
                viewWarnButtonObject.setLabel('عرض سجل');
                viewWarnButtonObject.setStyle(ButtonStyle.Primary); 
                
                warnActionRowObject.addComponents(giveWarnButtonObject, removeWarnButtonObject, viewWarnButtonObject);
                
                try {
                    await warnChannelObject.send({ 
                        embeds: [warnEmbedObject], 
                        components: [warnActionRowObject] 
                    });
                } catch (sendWarnPanelError) {
                    console.error("خطأ أثناء إرسال بانل التحذيرات:", sendWarnPanelError);
                }
            }
        }

        // =====================================================================
        // 🔥 إرسال البانلات المتعددة إلى الرومات المخصصة لها (Multi-Panels)
        // =====================================================================
        if (discordGuildObject && parsedTicketPanelsArray && parsedTicketPanelsArray.length > 0) {
            
            for (let pIndex = 0; pIndex < parsedTicketPanelsArray.length; pIndex++) {
                
                const panelDataObject = parsedTicketPanelsArray[pIndex];
                const targetPanelChannelIdString = panelDataObject.panelChannelId;
                
                if (targetPanelChannelIdString) {
                    
                    const targetChannelObject = discordGuildObject.channels.cache.get(targetPanelChannelIdString);
                    
                    if (targetChannelObject) {
                        
                        try {
                            const fetchedTicketMessagesCollection = await targetChannelObject.messages.fetch({ limit: 30 });
                            
                            const oldBotMessagesCollection = fetchedTicketMessagesCollection.filter(msgObj => { 
                                return msgObj.author.id === client.user.id; 
                            });
                            
                            await targetChannelObject.bulkDelete(oldBotMessagesCollection);
                        } catch(deleteTicketMessagesError) {
                            console.log("لا توجد صلاحية لمسح الرسائل في روم البانل.");
                        }

                        const panelEmbedObject = new EmbedBuilder();
                        
                        const finalPanelTitleString = panelDataObject.embedTitle || 'الدعم الفني';
                        panelEmbedObject.setTitle(finalPanelTitleString);
                        
                        const finalPanelDescString = panelDataObject.embedDesc || 'اضغط على الزر لفتح تذكرة';
                        panelEmbedObject.setDescription(finalPanelDescString);
                        
                        const finalPanelColorHex = panelDataObject.embedColor || '#0099ff';
                        panelEmbedObject.setColor(finalPanelColorHex);
                        
                        const guildIconUrlString = discordGuildObject.iconURL({ dynamic: true });
                        panelEmbedObject.setThumbnail(guildIconUrlString);
                        
                        if (panelDataObject.embedImage) {
                            panelEmbedObject.setImage(panelDataObject.embedImage);
                        }

                        const actionRowsArrayList = [];
                        let currentActionRowObject = new ActionRowBuilder();

                        const panelButtonsArray = panelDataObject.buttons;
                        
                        if (panelButtonsArray && panelButtonsArray.length > 0) {
                            
                            for (let i = 0; i < panelButtonsArray.length; i++) {
                                
                                const buttonDataObject = panelButtonsArray[i];
                                
                                if (i > 0 && i % 5 === 0) {
                                    actionRowsArrayList.push(currentActionRowObject);
                                    currentActionRowObject = new ActionRowBuilder();
                                }
                                
                                let finalButtonStyle = ButtonStyle.Primary;
                                const dataColorString = buttonDataObject.color;
                                
                                if (dataColorString === 'Success') {
                                    finalButtonStyle = ButtonStyle.Success; 
                                } else if (dataColorString === 'Danger') {
                                    finalButtonStyle = ButtonStyle.Danger; 
                                } else if (dataColorString === 'Secondary') {
                                    finalButtonStyle = ButtonStyle.Secondary; 
                                }

                                const newTicketButtonObject = new ButtonBuilder();
                                
                                const finalButtonCustomId = `ticket_open_${buttonDataObject.id}`;
                                newTicketButtonObject.setCustomId(finalButtonCustomId);
                                
                                newTicketButtonObject.setLabel(buttonDataObject.label);
                                newTicketButtonObject.setStyle(finalButtonStyle);
                                
                                currentActionRowObject.addComponents(newTicketButtonObject);
                            }
                            
                            actionRowsArrayList.push(currentActionRowObject);
                        }
                        
                        try {
                            await targetChannelObject.send({ 
                                embeds: [panelEmbedObject], 
                                components: actionRowsArrayList 
                            });
                        } catch (sendTicketPanelError) {
                            console.error("خطأ في إرسال بانل التكت:", sendTicketPanelError);
                        }
                    }
                }
            }
        }
        
        const redirectUrlString = `/settings/${targetGuildIDString}?success=saved`;
        res.redirect(redirectUrlString);
    });

    // =====================================================================
    // 🚀 صانع الإيمبد الحر للرومات
    // =====================================================================
    app.post('/settings/:guildID/send-embed', async (req, res) => {
        
        if (!req.user) { 
            return res.redirect('/login'); 
        }
        
        const targetGuildIDString = req.params.guildID;
        const discordGuildObject = client.guilds.cache.get(targetGuildIDString);
        
        if (!discordGuildObject) { 
            return res.redirect('/dashboard'); 
        }

        const targetChannelIdString = req.body.embedChannelId;
        const targetChannelObject = discordGuildObject.channels.cache.get(targetChannelIdString);
        
        if (targetChannelObject) {
            
            let colorHexCodeString = req.body.embedColor;
            if (!colorHexCodeString) {
                colorHexCodeString = '#5865F2';
            }
            
            const cleanColorHexCode = colorHexCodeString.replace('#', '');
            const parsedColorInt = parseInt(cleanColorHexCode, 16);
            
            const customEmbedMessageObject = new EmbedBuilder();
            
            const bodyEmbedTitleString = req.body.embedTitle;
            if (bodyEmbedTitleString) { 
                customEmbedMessageObject.setTitle(bodyEmbedTitleString); 
            }
            
            const bodyEmbedDescString = req.body.embedDesc;
            if (bodyEmbedDescString) { 
                customEmbedMessageObject.setDescription(bodyEmbedDescString); 
            }
            
            customEmbedMessageObject.setColor(parsedColorInt);
            
            const bodyEmbedImageString = req.body.embedImage;
            if (bodyEmbedImageString) { 
                customEmbedMessageObject.setImage(bodyEmbedImageString); 
            }
            
            const bodyEmbedFooterString = req.body.embedFooter;
            if (bodyEmbedFooterString) { 
                customEmbedMessageObject.setFooter({ text: bodyEmbedFooterString }); 
            }
            
            try {
                await targetChannelObject.send({ embeds: [customEmbedMessageObject] });
            } catch (embedSendError) {
                console.log("Error sending custom embed:", embedSendError);
            }
        }
        
        const successRedirectUrl = `/settings/${targetGuildIDString}?success=embed_sent`;
        res.redirect(successRedirectUrl);
    });

    const serverPortNumber = process.env.PORT || 8080;
    
    app.listen(serverPortNumber, () => { 
        console.log(`🌐 Dashboard Running smoothly on port ${serverPortNumber}`); 
    });
};
