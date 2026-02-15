const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, Partials } = require("discord.js");
require("dotenv").config();

// ربط ملف التكتات (تأكد ان اسمه ticketsystem.js)
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

const prefix = ":";

// ===== IDs اللوق والأنظمة (MNC) =====
const LOGS = {
    BAN: "1454448586145398827",
    TIME: "1454451180976603339",
    WARN: "1472007035842334752",
    TICKET_LOGS: "1453948413963141153" // لوج التكتات
};

const MNC_IDS = {
    STAFF_ROLE: '1454199885460144189',
    CATEGORY: '1453943996392013901'
};

// ===== storage التحذيرات (من كودك الأصلي) =====
const warns = new Map();

// ===== ايمبد اسود (من كودك الأصلي) =====
const EMBED = (title, desc) => new EmbedBuilder()
    .setColor("#000000")
    .setTitle(title)
    .setDescription(desc)
    .setTimestamp();

// ===== anti crash (من كودك الأصلي) =====
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

// ===== تحويل الوقت صح (من كودك الأصلي) =====
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

// ===== ارسال لوق (من كودك الأصلي) =====
async function sendLog(guild, id, embed) {
    try {
        const ch = guild.channels.cache.get(id);
        if (ch) await ch.send({ embeds: [embed] });
    } catch { }
}

// ================= نظام التفاعل (Interaction) =================
client.on("interactionCreate", async (interaction) => {
    if (interaction.isButton()) {
        // تشغيل فتح التذاكر من ملف التكتات
        const ticketTypes = ['ticket_mediator', 'ticket_support', 'ticket_report', 'ticket_gift', 'ticket_creator'];
        if (ticketTypes.includes(interaction.customId)) {
            const type = interaction.customId.replace('ticket_', '');
            await ticketEngine.createTicket(interaction, type);
        }

        // زر الـ Claim (الاستلام)
        if (interaction.customId === 'claim') {
            if (!interaction.member.roles.cache.has(MNC_IDS.STAFF_ROLE)) return interaction.reply({ content: "❌ لست من طاقم الإدارة", ephemeral: true });
            await interaction.channel.permissionOverwrites.edit(MNC_IDS.STAFF_ROLE, { ViewChannel: false });
            await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });
            const e = new EmbedBuilder().setColor('#2ecc71').setDescription(`✅ **The ticket as been claimed successfully by** <@${interaction.user.id}>`);
            await interaction.reply({ embeds: [e] });
        }

        // زر الـ Close (التحقق بخطوتين)
        if (interaction.customId === 'close_check') {
            const e = new EmbedBuilder().setColor('#ff0000').setDescription('**Are you sure you want to close this ticket?**');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_close').setLabel('Confirm Close').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );
            await interaction.reply({ embeds: [e], components: [row], ephemeral: true });
        }
        
        if (interaction.customId === 'confirm_close') {
             await interaction.channel.delete();
        }
    }
});

client.on("messageCreate", async message => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    try {
        // ================= أمر SETUP التذاكر (الجديد) =================
        if (cmd === "setup") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            const e = new EmbedBuilder()
                .setAuthor({ name: 'نظام تذاكر MNC COMMUNITY', iconURL: message.guild.iconURL() })
                .setColor('#ffffff')
                .setDescription('**يرجى اختيار القسم المناسب لفتح تذكرة من الأزرار بالأسفل.**');
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_mediator').setLabel('الوساطة').setEmoji('🤝').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_support').setLabel('الدعم الفني').setEmoji('⚙️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_gift').setLabel('الهدايا').setEmoji('🎁').setStyle(ButtonStyle.Success)
            );
            await message.channel.send({ embeds: [e], components: [row] });
        }

        // ================= أوامرك الأصلية (BAN) =================
        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
            const member = message.mentions.members.first();
            if (!member) return message.reply("حدد عضو.");
            await member.ban();
            const e = EMBED("🔨 BAN", `User: ${member} (${member.id})\nModerator: ${message.author}`);
            await message.channel.send({ embeds: [e] });
            sendLog(message.guild, LOGS.BAN, e);
        }

        // ================= UNBAN =================
        if (cmd === "unban") {
            const id = args[0];
            if (!id) return;
            await message.guild.members.unban(id);
            const e = EMBED("✅ UNBAN", `UserID: ${id}\nModerator: ${message.author}`);
            message.channel.send({ embeds: [e] });
            sendLog(message.guild, LOGS.BAN, e);
        }

        // ================= TIMEOUT =================
        if (cmd === "timeout") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;
            const member = message.mentions.members.first();
            const duration = parseDuration(args[1]);
            if (!member || !duration) return message.reply("اكتب الوقت صح مثل 10m او 30s");
            await member.timeout(duration);
            const e = EMBED("⏱️ TIMEOUT", `User: ${member} (${member.id})\nDuration: ${args[1]}\nModerator: ${message.author}`);
            await message.channel.send({ embeds: [e] });
            sendLog(message.guild, LOGS.TIME, e);
        }

        // ================= UNTIMEOUT =================
        if (cmd === "untimeout") {
            const member = message.mentions.members.first();
            if (!member) return;
            await member.timeout(null);
            const e = EMBED("✅ UNTIMEOUT", `User: ${member} (${member.id})\nModerator: ${message.author}`);
            message.channel.send({ embeds: [e] });
            sendLog(message.guild, LOGS.TIME, e);
        }

        // ================= WARN =================
        if (cmd === "warn") {
            const member = message.mentions.members.first();
            const reason = args.slice(1).join(" ") || "No reason";
            if (!member) return;
            if (!warns.has(member.id)) warns.set(member.id, []);
            warns.get(member.id).push({ reason: reason, mod: message.author.tag, date: new Date().toLocaleString() });
            const e = EMBED("⚠️ WARN ADDED", `User: ${member}\nReason: ${reason}\nModerator: ${message.author}`);
            message.channel.send({ embeds: [e] });
            sendLog(message.guild, LOGS.WARN, e);
        }

        // ================= CHECK WARNS =================
        if (cmd === "warnings") {
            const member = message.mentions.members.first();
            if (!member) return;
            const list = warns.get(member.id) || [];
            if (!list.length) return message.channel.send({ embeds: [EMBED("📋 WARNINGS", "لا يوجد تحذيرات.")] });
            let text = "";
            list.forEach((w, i) => { text += `#${i + 1} | ${w.reason} | ${w.mod} | ${w.date}\n`; });
            message.channel.send({ embeds: [EMBED("📋 WARNINGS", text)] });
        }

        // ================= REMOVE WARN =================
        if (cmd === "unwarn") {
            const member = message.mentions.members.first();
            if (!member || !warns.has(member.id)) return;
            warns.get(member.id).pop();
            const e = EMBED("✅ WARNING REMOVED", `User: ${member}\nModerator: ${message.author}`);
            message.channel.send({ embeds: [e] });
            sendLog(message.guild, LOGS.WARN, e);
        }

    } catch (err) {
        console.log("ERROR:", err);
    }
});

client.once("ready", () => {
    console.log(`🔥 MNC TITAN READY AS ${client.user.tag}`);
});
const ticketEngine = require("./ticketsystem.js");

client.login(process.env.TOKEN);
