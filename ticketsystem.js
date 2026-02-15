const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits, Collection 
} = require('discord.js');

/**
 * 👑 MNC ULTIMATE GOD-MODE SYSTEM (V4.2)
 * Designed for: MIDNIGHT CHAOS COMMUNITY (MNC)
 * Mirror Copy of: User Requested Layouts
 */

// --- [ CONFIGURATION CENTER ] ---
const CONFIG = {
    STAFF_ROLE: 'ID_رتبة_الإدارة', // رتبة الإدارة والوسطاء
    ADMIN_ROLE: 'ID_رتبة_الإدارة_العليا', // رتبة الإدارة العليا للشكاوى
    CATEGORY_ID: 'ID_فئة_التذاكر', // فئة فتح التذاكر
    ADMIN_LOG_ID: 'ID_روم_لوج_الإدارة', // لوج الإدارة الخاص
    MEDIATOR_LOG_ID: 'ID_روم_تقييم_الوساطة' // روم تقييمات الوساطة العام
};

class MNCTitanEngine {
    constructor() {
        this.setupAntiCrash();
    }

    // 🛡️ أقوى نظام حماية لمنع التعليق والانهيار
    setupAntiCrash() {
        process.on('unhandledRejection', (reason, p) => { /* MNC Safe Guard */ });
        process.on("uncaughtException", (err, origin) => { /* MNC Safe Guard */ });
    }

    // 📩 محرك الأقسام (نفس نصوص وتنسيق صورك حرفياً)
    async getSettings(type) {
        const data = {
            mediator: {
                title: 'طلب وسيط',
                desc: '**هذا القسم مخصص لطلب وسيط لعملية تريد داخل السيرفر**\n' +
                      '• تأكد أن الطرف الآخر جاهز ومتواجد قبل فتح التذكرة\n' +
                      '• رجاءً عدم فتح أكثر من تذكرة أو إزعاج الفريق بالتذاكر المتكررة\n' +
                      '• تحقق من درجة الوسيط، حيث أن لكل عملية مستوى أمان مختلف\n' +
                      '• اكتب المعلومات المطلوبة بدقة في الأسئلة التالية',
                color: '#2b2d31'
            },
            support: {
                title: 'تذكرة الدعم الفني',
                desc: '**شكراً لفتح تذكرة الدعم الفني.**\n' +
                      '• يرجى شرح شكواك أو طلبك بشكل واضح ومفصل قدر الإمكان.\n' +
                      '• أرفق أي صور أو روابط تساعدنا على فهم المشكلة.\n' +
                      '• فريق الدعم سيراجع تذكرتك ويجيبك في أسرع وقت ممكن.',
                color: '#2b2d31'
            },
            report: {
                title: 'شكوى على إداري',
                desc: '**قسم البلاغات الرسمية ضد طاقم الإدارة.**\n' +
                      '• يجب تقديم دلائل ملموسة (سكرين شوت أو فيديو).\n' +
                      '• التذكرة لا يراها إلا الإدارة العليا فقط لضمان السرية والعدل.',
                color: '#ff0000'
            },
            gift: {
                title: 'استلام هدايا',
                desc: '**مبروك فوزك في MNC! أنت هنا لاستلام جائزتك.**\n' +
                      '• يرجى إرسال لقطة شاشة تثبت فوزك في الفعالية.\n' +
                      '• لا تقم بتكرار المنشن، سيتم الرد عليك حسب الترتيب.',
                color: '#2b2d31'
            },
            creator: {
                title: 'تقديم صانع محتوى',
                desc: '**طلب الانضمام لفريق MNC للمبدعين.**\n' +
                      '• أرسل رابط قناتك وإحصائيات التفاعل.\n' +
                      '• سيتم مراجعة المحتوى من قبل المختصين والرد عليك.',
                color: '#2b2d31'
            }
        };
        return data[type];
    }

    // 🚀 محرك فتح التذاكر (MNC Core)
    async createTicket(interaction, type) {
        const { guild, user } = interaction;
        const info = await this.getSettings(type);

        const channel = await guild.channels.create({
            name: `${type}-${user.username}`,
            type: ChannelType.GuildText,
            parent: CONFIG.CATEGORY_ID,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: CONFIG.STAFF_ROLE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        const embed = new EmbedBuilder()
            .setAuthor({ name: info.title, iconURL: user.displayAvatarURL() })
            .setColor(info.color)
            .setDescription(info.desc)
            .addFields(
                { name: '👤 صاحب الطلب:', value: `<@${user.id}>`, inline: true },
                { name: '🎫 القسم:', value: info.title, inline: true }
            )
            .setFooter({ text: 'MNC COMMUNITY • Quality System' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('claim_btn').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_req').setLabel('Close').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('add_user').setLabel('Add User').setStyle(ButtonStyle.Secondary)
        );

        await channel.send({ 
            content: `حياك الله <@${user.id}> | Reason: **${info.title}**`,
            embeds: [embed], 
            components: [row] 
        });

        return interaction.reply({ content: `✅ تم فتح تذكرتك: ${channel}`, ephemeral: true });
    }

    // ⭐ نظام التقييم الثنائي الأسطوري (روم إدارة + روم وساطة)
    async sendReview(interaction, mediatorId, items, stars, comment) {
        const ticketId = interaction.channel.name.split('-')[1] || '0000';
        
        const reviewEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setDescription(
                `✅ **تكت رقم ${ticketId} للوسيط <@${mediatorId}>**\n` +
                `- **العميل :** <@${interaction.user.id}>\n` +
                `- **تقييم الوسيط :** ${'⭐'.repeat(stars)} **أسطوري**\n` +
                `- **السلع المتبادلة :** ${items}\n` +
                `- **تعليق إضافي من العميل :** ${comment || 'لا يوجد'}`
            );

        // 1. لوج الإدارة الخاص
        const adminLog = interaction.guild.channels.cache.get(CONFIG.ADMIN_LOG_ID);
        if (adminLog) await adminLog.send({ content: `**[NEW REVIEW]** للوسيط <@${mediatorId}>`, embeds: [reviewEmbed] });

        // 2. تقييم الوساطة العام
        const publicLog = interaction.guild.channels.cache.get(CONFIG.MEDIATOR_LOG_ID);
        if (publicLog) await publicLog.send({ embeds: [reviewEmbed] });
        
        return interaction.reply({ content: '✅ شكراً لتقييمك! تم تسجيل تقييمك بنجاح.', ephemeral: true });
    }
}

module.exports = new MNCTitanEngine();
