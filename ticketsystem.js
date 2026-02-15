const { 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, 
    ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField, Events 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// --- [ 1. إعداد البيانات والترقيم ] ---
const dataPath = path.join(__dirname, 'tickets.json');
let db = { lastNumber: 345, openTickets: {} };
if (fs.existsSync(dataPath)) db = JSON.parse(fs.readFileSync(dataPath));
const save = () => fs.writeFileSync(dataPath, JSON.stringify(db, null, 4));

const CONFIG = {
    CATEGORY: "1453943996392013901",
    STAFF: "1454199885460144189",
    HIGH_STAFF: "1453946893053726830",
    LOGS: "1453948413963141153",
    TRANSCRIPT: "1472218573710823679",
    MM_RATING: "1472439331443441828",
    STAFF_RATING: "1472023428658630686"
};

module.exports = (client) => {

    // --- [ 2. أمر التسطيب :setup ] ---
    client.on(Events.MessageCreate, async (message) => {
        if (message.content === ':setup' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const mainEmbed = new EmbedBuilder()
                .setTitle("MNC COMMUNITY - قوانين التذاكر")
                .setDescription("・ممنوع فتح أكثر من تذكرة في وقت واحد.\n・يرجى الانتظار وعدم عمل منشن للإدارة.\n・التزم بالأدب والقوانين العامة.")
                .setColor("White");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_mm').setLabel('طلب وسيط').setStyle(ButtonStyle.Primary).setEmoji('🟣'),
                new ButtonBuilder().setCustomId('open_supp').setLabel('دعم فني').setStyle(ButtonStyle.Secondary).setEmoji('🔵'),
                new ButtonBuilder().setCustomId('open_gift').setLabel('استلام هدايا').setStyle(ButtonStyle.Success).setEmoji('🟡'),
                new ButtonBuilder().setCustomId('open_rep').setLabel('شكوى إداري').setStyle(ButtonStyle.Danger).setEmoji('🔴')
            );
            message.channel.send({ embeds: [mainEmbed], components: [row] });
        }

        // أمر التقييم :done
        if (message.content === ':done') {
            const ticket = db.openTickets[message.channel.id];
            if (ticket?.type === 'Middleman') {
                const mmEmbed = new EmbedBuilder().setTitle("⭐ تقييم وسيط").setDescription("يرجى تقييم تجربتك.").setColor("White");
                const owner = await client.users.fetch(ticket.owner);
                owner.send({ embeds: [mmEmbed] }).catch(() => {});
                message.channel.send("✅ تم إرسال طلب التقييم.");
            }
        }
    });

    // --- [ 3. محرك النوافذ والتفاعلات ] ---
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        // فتح التكتات بالأدوار والنوافذ
        if (interaction.isButton() && interaction.customId.startsWith('open_')) {
            const userTickets = Object.values(db.openTickets).filter(t => t.owner === interaction.user.id);
            if (userTickets.length >= 2) return interaction.reply({ content: "❌ حدك الأقصى تذكرتين.", ephemeral: true });

            if (interaction.customId === 'open_mm') {
                const modal = new ModalBuilder().setCustomId('mm_modal').setTitle('بيانات الوساطة');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p_user').setLabel('يوزر الشخص الي بتسوي معه تريد؟').setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade').setLabel('ما تفاصيل التريد أو العرض والمقابل؟').setStyle(TextInputStyle.Paragraph))
                );
                return interaction.showModal(modal);
            }
            // باقي الأنواع تفتح مباشرة أو بمودال حسب الشرح
            await createTicketChannel(interaction, interaction.customId.split('_')[1]);
        }

        // --- [ 4. نظام الـ Claim والإدارة ] ---
        if (interaction.customId === 'claim_btn') {
            const ticket = db.openTickets[interaction.channel.id];
            if (!interaction.member.roles.cache.has(CONFIG.STAFF)) return interaction.reply({ content: "للإدارة فقط.", ephemeral: true });

            ticket.claimedBy = interaction.user.id;
            save();

            // تعطيل الزر وجعله شفافاً
            const rows = interaction.message.components.map(row => ActionRowBuilder.from(row));
            rows[0].components.find(c => c.data.custom_id === 'claim_btn').setDisabled(true);

            await interaction.channel.permissionOverwrites.edit(CONFIG.STAFF, { ViewChannel: false });
            await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });

            await interaction.update({ components: rows });
            interaction.channel.send({ content: `✅ **The ticket has been claimed successfully by** <@${interaction.user.id}>` });
        }
    });

    async function createTicketChannel(interaction, type) {
        db.lastNumber++;
        const num = db.lastNumber;
        const channel = await interaction.guild.channels.create({
            name: `ticket-${num}-${interaction.user.username}`,
            parent: CONFIG.CATEGORY,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: CONFIG.STAFF, allow: [PermissionsBitField.Flags.ViewChannel] }
            ]
        });

        db.openTickets[channel.id] = { owner: interaction.user.id, type: type, num: num };
        save();

        // رسالة الترحيب الخارجية
        await channel.send({ content: `حياك الله <@${interaction.user.id}>\nREASON: **${type}**` });

        const embed = new EmbedBuilder().setTitle(`تذكرة ${type}`).setDescription("يرجى الانتظار.").setColor("White");
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add').setLabel('ADD').setStyle(ButtonStyle.Primary).setEmoji('➕'),
            new ButtonBuilder().setCustomId('claim_btn').setLabel('CLAIM').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
            new ButtonBuilder().setCustomId('close').setLabel('CLOSE').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('delete').setLabel('DELETE WITH REASON').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
        );

        await channel.send({ embeds: [embed], components: [row1, row2] });
        interaction.reply({ content: `✅ تم فتح تذكرتك: ${channel}`, ephemeral: true });
    }
};
