const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits, Collection 
} = require('discord.js');

/**
 * 👑 MNC ULTIMATE SYSTEM V10 - THE GOD-MODE
 * Designed for: MIDNIGHT CHAOS COMMUNITY
 * Mirror Copy of: User Requested Images & Instructions
 */

const MNC_IDS = {
    MEDIATOR_REVIEW: '1472439331443441828', // تقييم الوسطاء (عام)
    ADMIN_REVIEW: '1472023428658630686',    // تقييم الإدارة (خاص)
    TICKET_LOGS: '1453948413963141153',     // لوج الاستلام والكلوز (صورة 2)
    TRANSCRIPT_ROM: '1472218573710823679',  // روم التران سكريبت (صورة 3)
    STAFF_ROLE: '1454199885460144189',      // رتبة الإدارة الصغرى
    HIGHER_STAFF: '1453946893053726830',    // رتبة الإدارة العليا
    CATEGORY: '1453943996392013901'         // فئة التكتات
};

let ticketNumber = 346; // بداية الترقيم الأسطورية المطلوبة

class MNCTitanProject {
    constructor() {
        this.setupAntiCrash();
        this.activeReviews = new Set();
    }

    // 🛡️ أقوى نظام حماية لمنع التعليق نهائياً لضمان سرعة الصاروخ
    setupAntiCrash() {
        process.on('unhandledRejection', (reason, p) => { });
        process.on("uncaughtException", (err, origin) => { });
    }

    // 📩 محرك الأقسام الشامل (نصوص مازن بالحرف وبنفس سمك الخط)
    async create(interaction, type) {
        const { guild, user } = interaction;

        // التحقق من الحد الأقصى (تذكرتين فقط)
        const userTickets = guild.channels.cache.filter(c => c.name.includes(user.username)).size;
        if (userTickets >= 2) return interaction.reply({ content: '❌ حدك الأقصى تذكرتين مفتوحتين في وقت واحد.', ephemeral: true });

        ticketNumber++;
        const channel = await guild.channels.create({
            name: `ticket-${ticketNumber}-${user.username}`,
            type: ChannelType.GuildText,
            parent: MNC_IDS.CATEGORY,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: MNC_IDS.STAFF_ROLE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        let rLabel = "";
        const mainEmbed = new EmbedBuilder().setColor('#ffffff'); // إيمبد أبيض دائم

        if (type === 'mediator') {
            rLabel = "طلب وسيط";
            mainEmbed.setTitle('طلب وسيط') // سمك خط صورة 10
            .setDescription(
                'هذا القسم مخصص لطلب الوسيط لعملية تريد داخل السيرفر\n' +
                '・تأكد أن الطرف الاخر جاهز و متواجد قبل فتح التذكرة\n' +
                '・رجاء عدم فتح اكثر من تذكرة أو ازعاج الفريق بالتذكرو المتكرره\n' +
                '・تحقق من درجة الوسيط حيث أن كل لكل مستوي أمان مختلف\n' +
                '・اكتب المعلومات المطلوبة بدقة في الاسئلة التالية'
            )
            .addFields(
                { name: '**يوزر الشخص الي بتسوي معه تريد؟**', value: 'سيتم الرد بالأسفل', inline: false },
                { name: '**ما تفاصيل التريد أو العرض والمقابل؟**', value: 'سيتم الرد بالأسفل', inline: false }
            );
        } else if (type === 'support') {
            rLabel = "الدعم الفني";
            mainEmbed.setTitle('تذكرة الدعم الفني') // سمك خط صورة 7
            .setDescription(
                'شكرا لفتح تذكرة الدعم الفني\n' +
                '・يرجى شرح شكواك أو مشكلتك أو طلبك بشكل واضح و مفصل قدر الإمكان\n' +
                '・ارفق اي صور أو روابط أو أدلة تساعدنا على فهم المشكله\n' +
                '・فريق الدعم سيراجع تذكرتك و يجييك في اسرع وقت ممكن\n\n' +
                'يرجى التحلي بالصبر فترتيب الردود يتم على حسب الأولوية و وقت الفتح'
            )
            .addFields({ name: '**ما هي مشكلتك أو طلبك بالتفصيل؟**', value: 'سيتم الرد بالأسفل', inline: false });
        } else if (type === 'gift') {
            rLabel = "استلام هدايا";
            mainEmbed.setDescription('حياك الله في قسم استلام الهدايا، يرجى انتظار الإداري المندوب.');
        } else if (type === 'report') {
            rLabel = "شكوى على إداري";
            mainEmbed.setDescription('هذا القسم لمراجعة الشكاوى ضد الإدارة من قبل الإدارة العليا فقط.');
        } else if (type === 'creator') {
            rLabel = "تقديم على صانع محتوى";
            mainEmbed.setTitle('تقديم الميديا').setDescription('يرجى كتابة تفاصيل قناتك وعدد المتابعين في النوافذ التالية.');
        }

        // التنسيق الخارجي (حياك الله والمنشن والريزون برا الإيمبد)
        const welcomeText = `<@${user.id}> حياك الله\nReason: **${rLabel}**`; // نفس سمك الخط المطلوب

        // ترتيب الزراير (Add User من الشمال)
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add_user').setLabel('Add User').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('claim').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_req').setLabel('Close').setStyle(ButtonStyle.Danger)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: welcomeText, embeds: [mainEmbed], components: [row, row2] });
        
        // رسالة تأكيد للعضو فقط
        return interaction.reply({ content: `✅ التكت اتفك ب نجاح: ${channel}`, ephemeral: true });
    }

    // ⭐ نظام التقييم الثنائي الأسطوري (صورة 16)
    async sendReview(interaction, items, stars, comment, isMediator) {
        const ticketId = interaction.channel.name.split('-')[1];
        
        const reviewEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setDescription(
                `✅ **تكت رقم ${ticketId} للوسيط <@${interaction.user.id}>**\n` +
                `- **العميل :** <@${interaction.user.id}>\n` +
                `- **تقييم الوسيط :** ${'⭐'.repeat(stars)} **أسطوري**\n` +
                `- **السلع المتبادلة :** ${items}\n` +
                `- **تعليق إضافي من العميل :** ${comment || 'لا يوجد'}`
            );

        const logChan = interaction.guild.channels.cache.get(isMediator ? MNC_IDS.MEDIATOR_REVIEW : MNC_IDS.ADMIN_REVIEW);
        if (logChan) await logChan.send({ embeds: [reviewEmbed] });
    }

    // 🔨 نظام الـ Claim الشفاف والمخفي
    async handleClaim(interaction) {
        if (!interaction.member.roles.cache.has(MNC_IDS.STAFF_ROLE)) return;
        
        await interaction.channel.permissionOverwrites.edit(MNC_IDS.STAFF_ROLE, { ViewChannel: false });
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });
        
        const claimEmbed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setDescription(`✅ **The ticket as been claimed successfully by** <@${interaction.user.id}>`);
            
        await interaction.message.edit({ components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('add').setLabel('Add User').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('claimed').setLabel('Claim').setStyle(ButtonStyle.Success).setDisabled(true), // زر شفاف
                new ButtonBuilder().setCustomId('close').setLabel('Close').setStyle(ButtonStyle.Danger)
            )
        ]});
        
        await interaction.reply({ embeds: [claimEmbed] });
    }
}

module.exports = new MNCTitanProject();
