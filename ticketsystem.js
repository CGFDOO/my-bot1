const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits, Collection 
} = require('discord.js');

// --- [ MNC GLOBAL CONFIGURATION ] ---
const MNC_IDS = {
    MEDIATOR_REVIEW: '1472439331443441828', // تقييم الوساطة العام
    ADMIN_REVIEW: '1472023428658630686',   // تقييم الإدارة الخاص
    GENERAL_LOGS: '1453948413963141153',    // لوج الاستلام والكلوز
    TRANSCRIPT_ROM: '1472218573710823679', // روم التران سكربت (صورة 3)
    STAFF_ROLE: '1454199885460144189',    // إدارة صغرى
    HIGHER_STAFF: '1453946893053726830',  // إدارة عليا
    CATEGORY: '1453943996392013901'       // فئة التكتات
};

let ticketCount = 346; // بداية الترقيم المطلوبة

class MNCTitanV5 {
    constructor() {
        this.reviews = new Set(); 
        this.setupSecurity();
    }

    // 🛡️ نظام حماية لمنع التعليق والانهيار
    setupSecurity() {
        process.on('unhandledRejection', (reason, p) => { }); 
        process.on("uncaughtException", (err, origin) => { });
    }

    // 📩 محرك إنشاء التذاكر بالأقسام الـ 5 (نفس سمك الخط المطلوب)
    async createTicket(interaction, type) {
        const { guild, user } = interaction;
        ticketCount++;

        const channel = await guild.channels.create({
            name: `ticket-${ticketCount}-${user.username}`,
            type: ChannelType.GuildText,
            parent: MNC_IDS.CATEGORY,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: MNC_IDS.STAFF_ROLE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: MNC_IDS.HIGHER_STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        // تنسيق النصوص الخارجية
        let rLabel = "";
        if (type === 'mediator') rLabel = "طلب وسيط";
        else if (type === 'support') rLabel = "الدعم الفني";
        else if (type === 'gift') rLabel = "استلام هدايا";
        else if (type === 'report') rLabel = "شكوى على إداري";
        else if (type === 'creator') rLabel = "تقديم على صانع محتوى";

        const welcomeHeader = `<@${user.id}> حياك الله\nReason: **${rLabel}**`;

        // تصميم الإيمبد الأبيض المتكامل
        const ticketEmbed = new EmbedBuilder().setColor('#ffffff');

        if (type === 'mediator') {
            ticketEmbed.setTitle('طلب وسيط') // نفس سمك الخط
            .setDescription(
                'هذا القسم مخصص لطلب الوسيط لعملية تريد داخل السيرفر\n' +
                '・تأكد أن الطرف الاخر جاهز و متواجد قبل فتح التذكرة\n' +
                '・رجاء عدم فتح اكثر من تذكرة أو ازعاج الفريق بالتذكرو المتكرره\n' +
                '・تحقق من درجة الوسيط حيث أن كل لكل مستوي أمان مختلف\n' +
                '・اكتب المعلومات المطلوبة بدقة في الاسئلة التالية'
            )
            .addFields(
                { name: '**يوزر الشخص الي بتسوي معه تريد؟**', value: 'يرجى الرد بالأسفل', inline: false },
                { name: '**ما تفاصيل التريد أو العرض والمقابل؟**', value: 'يرجى الرد بالأسفل', inline: false }
            );
        } else if (type === 'support') {
            ticketEmbed.setTitle('تذكرة الدعم الفني')
            .setDescription(
                'شكرا لفتح تذكرة الدعم الفني\n' +
                '・يرجى شرح شكواك أو مشكلتك أو طلبك بشكل واضح و مفصل قدر الإمكان\n' +
                '・ارفق اي صور أو روابط أو أدلة تساعدنا على فهم المشكله\n' +
                '・فريق الدعم سيراجع تذكرتك و يجييك في اسرع وقت ممكن\n\n' +
                'يرجى التحلي بالصبر فترتيب الردود يتم على حسب الأولوية و وقت الفتح'
            )
            .addFields({ name: '**ما هي مشكلتك أو طلبك بالتفصيل؟**', value: 'يرجى الرد بالأسفل', inline: false });
        }

        // أزرار التحكم بالترتيب المطلب (ادد، كليم، كلوز)
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add_user').setLabel('Add User').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('claim').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_check').setLabel('Close').setStyle(ButtonStyle.Danger)
        );

        const delRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: welcomeHeader, embeds: [ticketEmbed], components: [row, delRow] });
        
        return interaction.reply({ content: `✅ التكت اتفك ب نجاح: ${channel}`, ephemeral: true });
    }

    // ⭐ نظام التقييم الأسطوري طبق الأصل
    async sendFinalReview(interaction, mediatorId, stars, items, comment, isMediator) {
        const ticketId = interaction.channel.name.split('-')[1];
        
        const reviewEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setDescription(
                `✅ **تكت رقم ${ticketId} للوسيط <@${mediatorId}>**\n` +
                `- **العميل :** <@${interaction.user.id}>\n` +
                `- **تقييم الوسيط :** ${'⭐'.repeat(stars)} **أسطوري**\n` +
                `- **السلع المتبادلة :** ${items}\n` +
                `- **تعليق إضافي من العميل :** ${comment || 'لا يوجد'}`
            );

        const channelId = isMediator ? MNC_IDS.MEDIATOR_REVIEW : MNC_IDS.ADMIN_REVIEW;
        const logChan = interaction.guild.channels.cache.get(channelId);
        if (logChan) await logChan.send({ embeds: [reviewEmbed] });
    }
}

module.exports = new MNCTitanV5();
