const { 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, 
    ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle, 
    PermissionsBitField, Events 
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// إعداد ملف تخزين البيانات والترقيم
const dataPath = path.join(__dirname, 'tickets.json');
let db = { lastNumber: 345, openTickets: {} };
if (fs.existsSync(dataPath)) db = JSON.parse(fs.readFileSync(dataPath));

const save = () => fs.writeFileSync(dataPath, JSON.stringify(db, null, 4));

// --- [ الإعدادات الرسمية ] ---
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

    client.on(Events.MessageCreate, async (message) => {
        if (message.author.bot || !message.content.startsWith(':')) return;

        // أمر التسطيب :setup
        if (message.content === ':setup') {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            const embed = new EmbedBuilder()
                .setTitle("MNC COMMUNITY - Ticket System")
                .setDescription("اختر نوع التذكرة التي ترغب في فتحها من الأسفل:")
                .setColor("White");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_mm').setLabel('طلب وسيط').setStyle(ButtonStyle.Primary).setEmoji('🟣'),
                new ButtonBuilder().setCustomId('open_supp').setLabel('دعم فني').setStyle(ButtonStyle.Secondary).setEmoji('🔵'),
                new ButtonBuilder().setCustomId('open_gift').setLabel('استلام هدايا').setStyle(ButtonStyle.Success).setEmoji('🟡'),
                new ButtonBuilder().setCustomId('open_rep').setLabel('شكوى إداري').setStyle(ButtonStyle.Danger).setEmoji('🔴')
            );

            message.channel.send({ embeds: [embed], components: [row] });
        }

        // أمر تقييم الوسطاء :done
        if (message.content === ':done') {
            const ticket = db.openTickets[message.channel.id];
            if (!ticket || ticket.type !== 'Middleman') return message.reply("❌ هذا الأمر مخصص لتذاكر الوسطاء فقط.");
            
            // نظام التقييم يرسل DM
            const ratingEmbed = new EmbedBuilder()
                .setTitle("⭐ تقييم الوساطة - MNC")
                .setDescription("يرجى تقييم تجربة الوساطة الخاصة بك.")
                .setColor("White");
            
            const user = await client.users.fetch(ticket.owner);
            user.send({ embeds: [ratingEmbed] }).catch(() => {});
            message.channel.send("✅ تم إرسال طلب التقييم للأطراف.");
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        // منع السبام واللاج
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        // --- [ 1. فتح التذاكر ] ---
        if (interaction.isButton() && interaction.customId.startsWith('open_')) {
            const typeMap = { 'open_mm': 'Middleman', 'open_supp': 'Support', 'open_gift': 'Gift', 'open_rep': 'Report' };
            const type = typeMap[interaction.customId];

            // شرط التذكرتين
            const userTickets = Object.values(db.openTickets).filter(t => t.owner === interaction.user.id);
            if (userTickets.length >= 2) return interaction.reply({ content: "❌ لديك تذكرتان مفتوحتان بالفعل.", ephemeral: true });

            // مودال طلب الوسيط
            if (type === 'Middleman') {
                const modal = new ModalBuilder().setCustomId('mm_modal').setTitle('بيانات الوساطة');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p_user').setLabel('يوزر الطرف الآخر').setStyle(TextInputStyle.Short)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('details').setLabel('تفاصيل التريد').setStyle(TextInputStyle.Paragraph))
                );
                return interaction.showModal(modal);
            }
            
            await handleTicketCreate(interaction, type);
        }

        // --- [ 2. نظام الـ Claim ] ---
        if (interaction.customId === 'claim_btn') {
            const ticket = db.openTickets[interaction.channel.id];
            if (!interaction.member.roles.cache.has(CONFIG.STAFF)) return interaction.reply({ content: "للإدارة فقط.", ephemeral: true });

            ticket.claimedBy = interaction.user.id;
            save();

            const disabledRow = ActionRowBuilder.from(interaction.message.components[0]);
            disabledRow.components.find(c => c.data.custom_id === 'claim_btn').setDisabled(true);

            await interaction.channel.permissionOverwrites.edit(CONFIG.STAFF, { ViewChannel: false });
            await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });

            await interaction.update({ components: interaction.message.components });
            interaction.channel.send({ content: `✅ **The ticket has been claimed successfully by** <@${interaction.user.id}>` });
        }
    });

    async function handleTicketCreate(interaction, type, modalData = null) {
        db.lastNumber++;
        const tNum = db.lastNumber;
        const channelName = `ticket-${tNum}-${interaction.user.username}`;
        
        const channel = await interaction.guild.channels.create({
            name: channelName,
            parent: CONFIG.CATEGORY,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: CONFIG.STAFF, allow: [PermissionsBitField.Flags.ViewChannel] }
            ]
        });

        db.openTickets[channel.id] = { owner: interaction.user.id, type: type, num: tNum };
        save();

        // رسالة الترحيب الخارجية
        await channel.send({ content: `حياك الله <@${interaction.user.id}>\nREASON: **${type}**` });

        const embed = new EmbedBuilder()
            .setTitle(type === 'Middleman' ? 'طلب وسيط' : 'تذكرة جديدة')
            .setDescription("يرجى الانتظار حتى يتم الرد عليك من قبل الفريق المختص.")
            .setColor("White");

        const btns = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add_member').setLabel('ADD').setStyle(ButtonStyle.Primary).setEmoji('➕'),
            new ButtonBuilder().setCustomId('claim_btn').setLabel('CLAIM').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
            new ButtonBuilder().setCustomId('close_req').setLabel('CLOSE').setStyle(ButtonStyle.Danger).setEmoji('🔒')
        );

        await channel.send({ embeds: [embed], components: [btns] });
        interaction.reply({ content: `تم فتح التذكرة: ${channel}`, ephemeral: true });
    }
};
