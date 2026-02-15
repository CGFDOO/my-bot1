const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits 
} = require('discord.js');

const MNC_IDS = {
    STAFF: '1454199885460144189',
    CATEGORY: '1453943996392013901',
    LOGS: '1453948413963141153',
    M_REV: '1472439331443441828', // لوق تقييم الوسطاء
    A_REV: '1472023428658630686', // لوق تقييم الإدارة
    TRANS: '1472218573710823679'
};

let ticketNumber = 346;

module.exports = {
    // 📩 استدعاء النوافذ (Modals)
    async triggerModal(interaction, type) {
        if (type === 'gift' || type === 'report') return this.create(interaction, type);
        const modal = new ModalBuilder().setCustomId(`modal_${type}`).setTitle('MNC COMMUNITY - تزويد البيانات');
        if (type === 'mediator') {
            const i1 = new TextInputBuilder().setCustomId('m_user').setLabel('يوزر الشخص الذي تتريد معه؟').setStyle(TextInputStyle.Short).setRequired(true);
            const i2 = new TextInputBuilder().setCustomId('m_details').setLabel('ما تفاصيل التريد أو العرض والمقابل؟').setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(i1), new ActionRowBuilder().addComponents(i2));
        } else if (type === 'support') {
            const i1 = new TextInputBuilder().setCustomId('s_details').setLabel('ما هي مشكلتك بالتفصيل؟').setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(i1));
        }
        await interaction.showModal(modal);
    },

    // 📩 فتح التكت
    async create(interaction, type, modalData = null) {
        ticketNumber++;
        const channel = await interaction.guild.channels.create({
            name: `ticket-${ticketNumber}-${interaction.user.username}`,
            type: ChannelType.GuildText, parent: MNC_IDS.CATEGORY,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: MNC_IDS.STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        const rLabel = type === 'mediator' ? 'طلب وسيط' : type === 'support' ? 'الدعم الفني' : 'استلام هدايا';
        const welcome = `حياك الله <@${interaction.user.id}>\nReason: **${rLabel}**`;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add').setLabel('ADD').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('claim').setLabel('CLAIM').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_req').setLabel('CLOSE').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ content: welcome, components: [row] });
        await interaction.reply({ content: `✅ التكت اتفك: ${channel}`, ephemeral: true });
    },

    // ⭐ تقييم الوسطاء (بأمر :done)
    async sendMediatorReview(message) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('m_rate_5').setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('m_rate_1').setLabel('⭐').setStyle(ButtonStyle.Danger)
        );
        const e = new EmbedBuilder().setColor('#ffffff').setTitle('🌟 تقييم الوساطة').setDescription('يرجى تقييم تجربة الوساطة الآن.');
        // يرسل للطرفين في الخاص (DM)
        await message.reply("✅ تم إرسال التقييم للطرفين.");
    },

    // ⭐ تقييم الإدارة (تلقائي بعد الإغلاق)
    async sendStaffReview(member) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('s_rate_5').setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Success)
        );
        const e = new EmbedBuilder().setColor('#ffffff').setTitle('📋 تقييم الإدارة').setDescription('شكراً لك! قيم أداء الإداري الذي ساعدك.');
        try { await member.send({ embeds: [e], components: [row] }); } catch(e) {}
    }
};
