// Ticket System Epic Full Version
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, Events, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
});

const PREFIX = ":"; 
const ticketDataFile = path.join(__dirname, 'tickets.json');
let tickets = {};

// نظام حفظ البيانات والبدء من تكت 346
if (fs.existsSync(ticketDataFile)) {
    tickets = JSON.parse(fs.readFileSync(ticketDataFile));
} else {
    tickets = { lastTicketNumber: 345, openTickets: {} };
    fs.writeFileSync(ticketDataFile, JSON.stringify(tickets, null, 4));
}

// === [ الأيديهات الرسمية - مكتوبة مرة واحدة فقط لمنع الكراش ] ===
const CATEGORY_ID = "1453943996392013901";
const STAFF_ROLE = "1454199885460144189"; 
const HIGH_STAFF_ROLE = "1453946893053726830"; 
const ADMIN_ROLE = "1453946893053726830"; 
const LOGS_CHANNEL_ID = "1453948413963141153";
const TRANSCRIPT_CHANNEL_ID = "1472218573710823679";
const MIDDLEMAN_RATING_CHANNEL_ID = "1472439331443441828";
const STAFF_RATING_CHANNEL_ID = "1472023428658630686";

const EMOJI = {
    CLOSE: "🛡️",
    CLAIM: "✅",
    ADD: "➕",
    DELETE: "🗑️"
};

function saveTickets() {
    fs.writeFileSync(ticketDataFile, JSON.stringify(tickets, null, 4));
}

// === [ محرك إنشاء التذاكر وتصميم الصور ] ===
async function createTicket(interaction, type) {
    let member = interaction.user;
    const memberTickets = Object.values(tickets.openTickets).filter(t => t.ownerId === member.id);
    if (memberTickets.length >= 2) return interaction.reply({ content: "❌ You already have 2 open tickets.", ephemeral: true });

    tickets.lastTicketNumber++;
    const ticketNumber = tickets.lastTicketNumber;
    const ticketName = `ticket-${ticketNumber}-${member.username}`;

    const guild = interaction.guild;
    const category = guild.channels.cache.get(CATEGORY_ID);

    const ticketChannel = await guild.channels.create({
        name: ticketName,
        type: 0,
        parent: category,
        permissionOverwrites: [
            { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: STAFF_ROLE, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: ADMIN_ROLE, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
    });

    tickets.openTickets[ticketChannel.id] = { id: ticketChannel.id, ownerId: member.id, type: type, number: ticketNumber, claimedBy: null };
    saveTickets();

    // الترحيب خارج الإيمبد
    await ticketChannel.send({ content: `حياك الله <@${member.id}>\nREASON: **${type}**` });

    const embed = new EmbedBuilder()
        .setTitle(type === "Middleman" ? "طلب وسيط" : type === "Support" ? "تذكرة الدعم الفني" : type)
        .setDescription(
            type === "Middleman" ?
            "هذا القسم مخصص لطلب الوسيط لعملية تريد داخل السيرفر\n・تأكد أن الطرف الاخر جاهز و متواجد قبل فتح التذكرة\n・رجاء عدم فتح اكثر من تذكرة\n・تحقق من درجة الوسيط\n・اكتب المعلومات المطلوبة بدقة"
            :
            type === "Support" ?
            "شكراً لفتح تذكرة الدعم الفني\n・يرجى شرح شكواك بالتفصيل\n・ارفق اي أدلة\n・سيتم الرد حسب الأولوية"
            : ""
        )
        .setColor("White");

    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("add").setLabel("ADD").setEmoji(EMOJI.ADD).setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("claim").setLabel("CLAIM").setEmoji(EMOJI.CLAIM).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("close").setLabel("CLOSE").setEmoji(EMOJI.CLOSE).setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("delete").setLabel("DELETE WITH REASON").setEmoji(EMOJI.DELETE).setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ embeds: [embed], components: [row1, row2] });
    interaction.reply({ content: `✅ Ticket created: ${ticketChannel}`, ephemeral: true });
}

client.on("ready", () => console.log(`🔥 ${client.user.tag} IS ONLINE (NO ERRORS)`));
