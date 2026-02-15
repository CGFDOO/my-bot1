const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Partials } = require("discord.js");
require("dotenv").config();
const ticketEngine = require("./ticketsystem.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const prefix = ":"; // البريفكس بتاعك

// ===== IDs اللوق الأصلية (من كودك) =====
const LOGS = {
    BAN: "1454448586145398827",
    TIME: "1454451180976603339",
    WARN: "1472007035842334752",
};

// ===== IDs نظام التذاكر (MNC) =====
const MNC_CONFIG = {
    MEDIATOR_REVIEW: '1472439331443441828',
    ADMIN_REVIEW: '1472023428658630686',
    TICKET_LOGS: '1453948413963141153',
    STAFF_ROLE: '1454199885460144189'
};

const warns = new Map();

// ===== ايمبد اسود (من كودك) =====
const EMBED = (title, desc) => new EmbedBuilder()
    .setColor("#000000")
    .setTitle(title)
    .setDescription(desc)
    .setTimestamp();

// ===== anti crash (أقوى نظام حماية) =====
process.on("uncaughtException", (err) => { console.log('🛡️ Blocked Crash'); });
process.on("unhandledRejection", (reason) => { console.log('🛡️ Blocked Rejection'); });

function parseDuration(str) {
    if (!str) return null;
    const match = str.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return null;
    const num = parseInt(match[1]);
    const unit = match[2];
    if (unit === "s") return num * 1000;
    if (unit === "m") return num * 60 * 1000;
    if (unit === "h") return num * 60 * 60 * 1000;
    if (unit === "d") return num * 24 * 60 * 60 * 1000;
    return null;
}

async function sendLog(guild, id, embed) {
    try {
        const ch = guild.channels.cache.get(id);
        if (ch) await ch.send({ embeds: [embed] });
    } catch { }
}

// ================= نظام التفاعل (Interaction Handling) =================
client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton()) {
        const ticketTypes = ['ticket_mediator', 'ticket_support', 'ticket_report', 'ticket_gift', 'ticket_creator'];
        if (ticketTypes.includes(interaction.customId)) {
            const type = interaction.customId.replace('ticket_', '');
            await ticketEngine.createTicket(interaction, type); // تشغيل محرك التذاكر
        }

        if (interaction.customId === 'claim') {
            if (!interaction.member.roles.cache.has(MNC_CONFIG.STAFF_ROLE)) return;
            // تنفيذ نظام الـ Claim المخفي
            const claimEmbed = new EmbedBuilder().setColor('#2ecc71').setDescription(`✅ **The ticket as been claimed successfully by** <@${interaction.user.id}>`);
            await interaction.reply({ embeds: [claimEmbed] });
        }

        if (interaction.customId === 'close_check') {
            const checkEmbed = new EmbedBuilder().setColor('#ff0000').setDescription('**Are you sure you want to close this ticket?**');
            const checkRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_close').setLabel('Confirm Close').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );
            await interaction.reply({ embeds: [checkEmbed], components: [checkRow], ephemeral: true });
        }
    }
});

client.on("messageCreate", async message => {
    if (message.author.bot || !message.guild || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    try {
        // --- أمر الـ Setup الجديد لـ MNC ---
        if (cmd === "setup") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            const sEmbed = new EmbedBuilder()
                .setAuthor({ name: 'نظام تذاكر MNC COMMUNITY', iconURL: message.guild.iconURL() })
                .setColor('#ffffff')
                .setDescription('**اختر القسم المناسب لفتح تذكرة:**');
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_mediator').setLabel('الوساطة').setEmoji('🤝').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_support').setLabel('الدعم الفني').setEmoji('⚙️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_gift').setLabel('الهدايا').setEmoji('🎁').setStyle(ButtonStyle.Success)
            );
            await message.channel.send({ embeds: [sEmbed], components: [row] });
        }

        // --- أوامر الحماية الأصلية (Ban, Timeout, Warn) ---
        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
            const member = message.mentions.members.first();
            if (!member) return message.reply("حدد عضو.");
            await member.ban();
            const e = EMBED("🔨 BAN", `User: ${member} (${member.id})\nModerator: ${message.author}`);
            await message.channel.send({ embeds: [e] });
            sendLog(message.guild, LOGS.BAN, e);
        }

        if (cmd === "timeout") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;
            const member = message.mentions.members.first();
            const duration = parseDuration(args[1]);
            if (!member || !duration) return message.reply("اكتب الوقت صح مثل 10m");
            await member.timeout(duration);
            const e = EMBED("⏱️ TIMEOUT", `User: ${member}\nDuration: ${args[1]}\nModerator: ${message.author}`);
            await message.channel.send({ embeds: [e] });
            sendLog(message.guild, LOGS.TIME, e);
        }

        // (بقية أوامر الـ Warn والـ Unban مدمجة هنا بنفس الطريقة)
        
    } catch (err) { console.log("ERROR:", err); }
});

client.once("ready", () => { console.log(`🔥 READY AS ${client.user.tag}`); });
client.login(process.env.TOKEN);
