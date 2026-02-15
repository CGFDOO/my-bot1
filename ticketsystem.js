const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits 
} = require('discord.js');

// === [ MNC TITAN CONFIGURATION ] ===
const MNC_IDS = {
    STAFF: '1454199885460144189',
    HIGHER: '1453946893053726830',
    CATEGORY: '1453943996392013901',
    LOGS: '1453948413963141153',
    MEDIATOR_REVIEW: '1472439331443441828',
    ADMIN_REVIEW: '1472023428658630686',
    TRANSCRIPT: '1472218573710823679'
};

let ticketNumber = 346;

module.exports = {
    // 1️⃣ استدعاء النوافذ (Modals) بناءً على النوع
    async triggerModal(interaction, type) {
        // حماية: حد أقصى تذكرتين للعضو
        const userTickets = interaction.guild.channels.cache.filter(c => c.name.includes(interaction.user.username) && c.parentId === MNC_IDS.CATEGORY).size;
        if (userTickets >= 2) return interaction.reply({ content: "⚠️ لا يمكنك فتح أكثر من تذكرتين في وقت واحد.", ephemeral: true });

        if (type === 'gift' || type === 'report') return this.create(interaction, type); // فتح مباشر

        const modal = new ModalBuilder().setCustomId(`modal_${type}`).setTitle('MNC COMMUNITY - تزويد البيانات');

        if (type === 'mediator') {
            const i1 = new TextInputBuilder().setCustomId('m_user').setLabel('يوزر الشخص الذي تتريد معه؟').setStyle(TextInputStyle.Short).setRequired(true);
            const i2 = new TextInputBuilder().setCustomId('m_details').setLabel('ما تفاصيل التريد أو العرض والمقابل؟').setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(i1), new ActionRowBuilder().addComponents(i2));
        } else if (type === 'support') {
            const i1 = new TextInputBuilder().setCustomId('s_details').setLabel('ما هي مشكلتك بالتفصيل؟').setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(i1));
        } else if (type === 'creator') {
            const i1 = new TextInputBuilder().setCustomId('c_link').setLabel('رابط القنوات').setStyle(TextInputStyle.Short).setRequired(true);
            const i2 = new TextInputBuilder().setCustomId('c_info').setLabel('المتابعين والمميزات').setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(i1), new ActionRowBuilder().addComponents(i2));
        }
        await interaction.showModal(modal);
    },

    // 2️⃣ إنشاء التكت الفعلي (التصميم مطابق للصور)
    async create(interaction, type, modalData = null) {
        const { guild, user } = interaction;
        ticketNumber++;
        const channel = await guild.channels.create({
            name: `ticket-${ticketNumber}-${user.username}`,
            type: ChannelType.GuildText,
            parent: MNC_IDS.CATEGORY,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: MNC_IDS.STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ],
        });

        let rLabel = type === 'mediator' ? 'طلب وسيط' : type === 'support' ? 'الدعم الفني' : type === 'gift' ? 'استلام هدايا' : type === 'report' ? 'شكوى على إداري' : 'تقديم الميديا';
        const welcome = `حياك الله <@${user.id}>\nReason: **${rLabel}**`;

        const mainEmbed = new EmbedBuilder().setColor('#ffffff');
        if (modalData) {
            mainEmbed.setTitle(rLabel).addFields(Object.keys(modalData).map(key => ({ name: `**${key}**`, value: modalData[key], inline: false })));
        }

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add').setLabel('ADD').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('claim').setLabel('CLAIM').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_req').setLabel('CLOSE').setStyle(ButtonStyle.Danger)
        );
        const row2 = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('delete_res').setLabel('DELETE WITH REASON').setStyle(ButtonStyle.Danger));

        await channel.send({ content: welcome, embeds: modalData ? [mainEmbed] : [], components: [row1, row2] });
        await interaction.reply({ content: `✅ التكت اتفك ب نجاح: ${channel}`, ephemeral: true });
    },

    // 3️⃣ نظام الاستلام الشفاف (Claim)
    async handleClaim(interaction) {
        if (!interaction.member.roles.cache.has(MNC_IDS.STAFF)) return;
        await interaction.channel.permissionOverwrites.edit(MNC_IDS.STAFF, { ViewChannel: false });
        await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true });

        const row = ActionRowBuilder.from(interaction.message.components[0]);
        row.components[1].setDisabled(true); // الزر يصبح شفافاً

        await interaction.message.edit({ components: [row, interaction.message.components[1]] });
        await interaction.reply({ embeds: [new EmbedBuilder().setColor('#ffffff').setDescription(`✅ The ticket has been claimed successfully by <@${interaction.user.id}>`)] });
    }
};
