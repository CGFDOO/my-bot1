const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits, Collection 
} = require('discord.js');

// === [ MNC GLOBAL CONFIGURATION ] ===
const IDS = {
    STAFF_ROLE: '1454199885460144189',    // إدارة صغرى
    HIGHER_STAFF: '1453946893053726830',  // إدارة عليا
    CATEGORY: '1453943996392013901',       // فئة التكتات
    LOGS_ROOM: '1453948413963141153',      // روم اللوج العام (صورة 2)
    MEDIATOR_REVIEW: '1472439331443441828', // تقييم الوسطاء (عام)
    ADMIN_REVIEW: '1472023428658630686',    // تقييم الإدارة (خاص)
    TRANSCRIPT: '1472218573710823679'      // روم التران سكريبت (صورة 3)
};

let ticketCounter = 346; // بداية الترقيم المطلوبة

class MNCTitanProject {
    constructor() {
        this.userTickets = new Collection();
        this.setupSecurity();
    }

    // 🛡️ نظام حماية MNC الأسطوري ضد التعليق
    setupSecurity() {
        process.on('unhandledRejection', (reason) => { /* MNC Protection Active */ });
        process.on("uncaughtException", (err) => { /* MNC Protection Active */ });
    }

    // 📩 محرك فتح التذاكر (التنسيق الحرفي)
    async create(interaction, type) {
        const { guild, user } = interaction;
        
        // التحقق من عدد التكتات (بحد أقصى 2)
        const openTickets = guild.channels.cache.filter(c => c.name.includes(user.username)).size;
        if (openTickets >= 2) return interaction.reply({ content: '❌ حدك الأقصى تذكرتين مفتوحتين في وقت واحد.', ephemeral: true });

        ticketCounter++;
        const channel = await guild.channels.create({
            name: `ticket-${ticketCounter}-${user.username}`,
            type: ChannelType.GuildText,
            parent: IDS.CATEGORY,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: IDS.STAFF_ROLE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        // التنسيق الخارجي (حياك الله + ريزون)
        let reasonLabel = "";
        switch(type) {
            case 'mediator': reasonLabel = "طلب وسيط"; break;
            case 'support': reasonLabel = "الدعم الفني"; break;
            case 'report': reasonLabel = "شكوى على إداري"; break;
            case 'gift': reasonLabel = "استلام هدايا"; break;
            case 'creator': reasonLabel = "تقديم على صانع محتوى"; break;
        }

        const externalText = `<@${user.id}> حياك الله\nReason: **${reasonLabel}**`; // سمك الخط صورة 10

        // الإيمبيد الأبيض الموحد
        const ticketEmbed = new EmbedBuilder().setColor('#ffffff');

        if (type === 'mediator') {
            ticketEmbed.setTitle('طلب وسيط') // خط كبير صورة 10
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
            ticketEmbed.setTitle('تذكرة الدعم الفني')
            .setDescription(
                'شكرا لفتح تذكرة الدعم الفني\n' +
                '・يرجى شرح شكواك أو مشكلتك أو طلبك بشكل واضح و مفصل قدر الإمكان\n' +
                '・ارفق اي صور أو روابط أو أدلة تساعدنا على فهم المشكله\n' +
                '・فريق الدعم سيراجع تذكرتك و يجييك في اسرع وقت ممكن\n\n' +
                'يرجى التحلي بالصبر فترتيب الردود يتم على حسب الأولوية و وقت الفتح'
            )
            .addFields({ name: '**ما هي مشكلتك أو طلبك بالتفصيل؟**', value: 'سيتم الرد بالأسفل', inline: false });
        }

        // الأزرار بالترتيب المطلوب (ادد، كليم، كلوز)
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add_user').setLabel('Add User').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('claim').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_req').setLabel('Close').setStyle(ButtonStyle.Danger)
        );

        const deleteRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: externalText, embeds: [ticketEmbed], components: [row, deleteRow] });
        return interaction.reply({ content: `✅ التكت اتفك ب نجاح: ${channel}`, ephemeral: true });
    }

    // ⭐ نظام التقييم الثنائي الأسطوري (صورة 16)
    async processReview(interaction, mediatorId, items, stars, comment, isMediator) {
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

        const channelId = isMediator ? IDS.MEDIATOR_REVIEW : IDS.ADMIN_REVIEW;
        const logChan = interaction.guild.channels.cache.get(channelId);
        if (logChan) await logChan.send({ embeds: [reviewEmbed] });
        
        return interaction.reply({ content: '✅ تم تسجيل تقييمك بنجاح في سجلات MNC.', ephemeral: true });
    }

    // 🔨 نظام الـ Claim المتطور (صورة 9)
    async handleClaim(interaction) {
        if (!interaction.member.roles.cache.has(IDS.STAFF_ROLE)) return;
        
        await interaction.channel.permissionOverwrites.edit(IDS.STAFF_ROLE, { ViewChannel: false });
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });
        
        const claimEmbed = new EmbedBuilder()
            .setColor('#2ecc71')
            .setDescription(`✅ **The ticket as been claimed successfully by** <@${interaction.user.id}>`);
            
        await interaction.message.edit({ components: [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('add_user').setLabel('Add User').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('claimed').setLabel('Claimed').setStyle(ButtonStyle.Success).setDisabled(true),
                new ButtonBuilder().setCustomId('close_req').setLabel('Close').setStyle(ButtonStyle.Danger)
            )
        ]});
        
        await interaction.reply({ embeds: [claimEmbed] });
    }
}

module.exports = new MNCTitanProject();
