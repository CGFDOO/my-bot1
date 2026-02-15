const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits, Collection 
} = require('discord.js');

// --- [ MNC TITAN CONFIGURATION ] ---
const IDS = {
    MEDIATOR_REVIEW: '1472439331443441828', // تقييم الوساطة للعام
    ADMIN_REVIEW: '1472023428658630686',   // تقييم الإدارة الخاص
    TICKET_LOGS: '1453948413963141153',    // لوج الاستلام والكلوز
    TRANSCRIPT_ROM: '1472218573710823679', // روم التران سكربت
    STAFF_ROLE: '1454199885460144189',    // إدارة صغرى
    HIGHER_STAFF: '1453946893053726830',  // إدارة عليا
    CATEGORY: '1453943996392013901'       // فئة التكتات
};

let ticketCounter = 346; // بداية الترقيم المطلوبة

class MNCTitanV5 {
    constructor() {
        this.antiCrash();
    }

    antiCrash() {
        process.on('unhandledRejection', (reason, p) => { }); 
        process.on("uncaughtException", (err, origin) => { });
    }

    // محرك إنشاء التذاكر بالأقسام الـ 5
    async create(interaction, type) {
        const { guild, user } = interaction;
        ticketCounter++;

        const channel = await guild.channels.create({
            name: `ticket-${ticketCounter}-${user.username}`,
            type: ChannelType.GuildText,
            parent: IDS.CATEGORY,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: IDS.STAFF_ROLE, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: IDS.HIGHER_STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        // 1. تنسيق ما قبل الإيمبد (حياك الله + ريزون)
        let reasonName = "";
        switch(type) {
            case 'mediator': reasonName = "طلب وسيط"; break;
            case 'support': reasonName = "الدعم الفني"; break;
            case 'report': reasonName = "شكوى على إداري"; break;
            case 'gift': reasonName = "استلام هدايا"; break;
            case 'creator': reasonName = "تقديم على صانع محتوى"; break;
        }

        const contentMsg = `<@${user.id}> حياك الله\nReason: **${reasonName}**`;

        // 2. تصميم الإيمبد الأبيض الموحد
        const ticketEmbed = new EmbedBuilder().setColor('#ffffff');

        if (type === 'mediator') {
            ticketEmbed.setTitle('طلب وسيط')
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
            .addFields({ name: '**ما هي مشكلتك أو طلبك بالتفصيل؟**', value: 'يرجى الكتابة بالأسفل', inline: false });
        }

        // 3. أزرار التحكم بالترتيب المطلوب
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add_user').setLabel('Add User').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('claim').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close').setLabel('Close').setStyle(ButtonStyle.Danger)
        );

        const deleteRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: contentMsg, embeds: [ticketEmbed], components: [row, deleteRow] });
        
        return interaction.reply({ content: `✅ تم فتح التذكرة بنجاح: ${channel}`, ephemeral: true });
    }

    // 4. نظام التقييم الأسطوري الثنائي
    async sendReview(interaction, mediator, stars, items, comment, isMediatorReview) {
        const reviewEmbed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setDescription(
                `✅ **تكت رقم ${interaction.channel.name.split('-')[1]} للوسيط <@${mediator.id}>**\n` +
                `- **العميل :** <@${interaction.user.id}>\n` +
                `- **تقييم الوسيط :** ${'⭐'.repeat(stars)} **أسطوري**\n` +
                `- **السلع المتبادلة :** ${items}\n` +
                `- **تعليق إضافي من العميل :** ${comment || 'لا يوجد'}`
            );

        const targetChannel = interaction.guild.channels.cache.get(isMediatorReview ? IDS.MEDIATOR_REVIEW : IDS.ADMIN_REVIEW);
        if (targetChannel) await targetChannel.send({ embeds: [reviewEmbed] });
    }
}

module.exports = new MNCTitanV5();
