const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

// ⚠️ استدعاء ملف الداتابيز (تأكد من المسار حسب مجلداتك)
const GuildSettings = require('../models/GuildSettings'); 

module.exports = (client) => {
    // ==========================================
    // 1. الإعدادات الأساسية للسيرفر (Middlewares)
    // ==========================================
    app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' })); // limit عشان لو الداتا كتير
    app.use(bodyParser.json({ limit: '50mb' }));
    app.set('view engine', 'ejs');
    
    // مسارات ملفات التصميم (CSS, JS, Images)
    app.set('views', path.join(__dirname, '../views'));
    app.use(express.static(path.join(__dirname, '../public')));

    // ==========================================
    // 2. مسار عرض صفحة الإعدادات (GET)
    // ==========================================
    app.get('/settings/:guildId', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const guild = client.guilds.cache.get(guildId);
            
            if (!guild) return res.send('❌ البوت غير موجود في هذا السيرفر! قم بدعوته أولاً.');

            // جلب الإعدادات من MongoDB
            let config = await GuildSettings.findOne({ guildId: guildId });
            if (!config) config = {}; // لو السيرفر جديد

            // إرسال الداتا لصفحة الـ EJS عشان تعرضها
            res.render('settings', {
                bot: client,
                guild: guild,
                guildId: guildId,
                config: config,
                success: req.query.success === 'true' // إشعار الحفظ
            });
        } catch (error) {
            console.error("❌ خطأ في تحميل صفحة الداشبورد:", error);
            res.status(500).send("حدث خطأ داخلي في السيرفر.");
        }
    });

    // ==========================================
    // 3. مسار حفظ البيانات (POST) - الوحش الكامل 🐉
    // ==========================================
    app.post('/settings/:guildId/save', async (req, res) => {
        try {
            const guildId = req.params.guildId;
            const body = req.body;

            // 🛠️ دوال مساعدة لفك ضغط الـ JSON وترتيب المصفوفات
            const parseJSON = (data, fallback) => {
                try { return data ? JSON.parse(data) : fallback; } 
                catch (e) { return fallback; }
            };
            const getArray = (val) => [].concat(val || []).filter(Boolean);

            // فك ضغط الأنظمة المعقدة اللي جاية من الداشبورد
            const ticketPanels = parseJSON(body.ticketPanelsData, []);
            const mmModalFields = parseJSON(body.mm_modalFieldsData, []);
            const roleRewards = parseJSON(body.lvl_roleRewardsData, []);
            const autoResponders = parseJSON(body.autoRespondersData, []);
            const autoLine = parseJSON(body.autoLineData, { trigger: 'خط', imageUrl: '', deleteTrigger: false });
            const warnReasonsAr = parseJSON(body.warn_reasonsDataAr, []);
            const warnReasonsEn = parseJSON(body.warn_reasonsDataEn, []);

            // 📦 تجميع كل الإعدادات في أوبجكت واحد ضخم
            const updatedConfig = {
                prefix: body.prefix || '!',
                language: body.language || 'ar',
                slashCommandsEnabled: body.slashCommandsEnabled === 'on',
                botOwnerId: body.botOwnerId || '',

                embedSetup: {
                    primaryColor: body.emb_primaryColor || '#5865F2',
                    successColor: body.emb_successColor || '#3ba55d',
                    errorColor: body.emb_errorColor || '#ed4245',
                    footerText: body.emb_footerText || 'System Control',
                    footerIconUrl: body.emb_footerIconUrl,
                    thumbnailUrl: body.emb_thumbnailUrl
                },

                aiSystem: {
                    enabled: body.ai_enabled === 'on',
                    allowUserChoice: body.ai_allowUserChoice === 'on',
                    defaultBoyName: body.ai_defaultBoyName,
                    defaultGirlName: body.ai_defaultGirlName,
                    chatChannelId: body.ai_chatChannelId
                },

                ticketPanels: ticketPanels, // البانلات اللي برمجناها

                middlemanSystem: {
                    enabled: body.mm_enabled === 'on',
                    categoryId: body.mm_categoryId,
                    panelChannelId: body.mm_panelChannelId,
                    panelTitle: body.mm_panelTitle,
                    panelColor: body.mm_panelColor,
                    panelDescription: body.mm_panelDescription,
                    buttonLabel: body.mm_buttonLabel,
                    modalTitle: body.mm_modalTitle,
                    modalFields: mmModalFields,
                    insideTicketTitle: body.mm_insideTicketTitle,
                    insideTicketColor: body.mm_insideTicketColor,
                    insideTicketDescription: body.mm_insideTicketDescription,
                    modalAnswersEmbedColor: body.mm_modalAnswersEmbedColor
                },

                ticketControls: {
                    twoStepClose: body.tc_twoStepClose === 'on',
                    ticketCounter: parseInt(body.tc_ticketCounter) || 1,
                    transcriptChannelId: body.tc_transcriptChannelId,
                    ticketLogChannelId: body.tc_ticketLogChannelId,
                    hideTicketOnClaim: body.tc_hideTicketOnClaim === 'on',
                    readOnlyStaffOnClaim: body.tc_readOnlyStaffOnClaim === 'on'
                },

                warnings: {
                    maxWarnings: parseInt(body.warn_maxWarnings) || 3,
                    autoAction: body.warn_autoAction,
                    panelChannelId: body.warn_panelChannelId,
                    panelColor: body.warn_panelColor,
                    panelTitle: body.warn_panelTitle,
                    panelDescription: body.warn_panelDescription,
                    reasonsDataAr: warnReasonsAr,
                    reasonsDataEn: warnReasonsEn
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
                },

                autoResponders: autoResponders,
                autoLine: autoLine
            };

            // 💾 الحفظ النهائي في قاعدة بيانات MongoDB
            await GuildSettings.findOneAndUpdate(
                { guildId: guildId }, 
                { $set: updatedConfig }, 
                { upsert: true, new: true } // upsert بتعمل ملف جديد لو السيرفر مش متسجل
            );

            // إرجاع العميل للصفحة مع إشعار النجاح 🟢
            res.redirect(`/settings/${guildId}?success=true`);

        } catch (error) {
            console.error("❌ خطأ أثناء حفظ إعدادات الداشبورد:", error);
            res.status(500).send("حدث خطأ أثناء حفظ الإعدادات في قاعدة البيانات.");
        }
    });

    // ==========================================
    // 4. تشغيل السيرفر وحل مشكلة Railway 🚀
    // ==========================================
    // ⚠️ السطرين دول هما اللي بيمنعوا الشاشة السودة بتاعت Railway!
    const PORT = process.env.PORT || 8080; 
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`\n✅ [WEB DASHBOARD] الداشبورد تعمل بنجاح وتستقبل الطلبات على بورت: ${PORT}\n`);
    });
};
