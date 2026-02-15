const { 
    Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, 
    TextInputBuilder, TextInputStyle, Partials, Collection 
} = require("discord.js");
const ticketEngine = require("./ticketsystem.js");
require("dotenv").config();

/**
 * 👑 MNC ULTIMATE PROJECT - TITAN VERSION 2026
 * نظام متكامل يجمع بين الإدارة والحماية والتذاكر العملاقة
 */

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember]
});

const prefix = ":";

// ===== [ IDs اللوق والأنظمة الخاصة بـ MNC ] =====
const MNC_LOGS = {
    BAN: "1454448586145398827",
    TIME: "1454451180976603339",
    WARN: "1472007035842334752",
    TICKET: "1453948413963141153",
    TRANSCRIPT: "1472218573710823679",
    MEDIATOR_REVIEW: "1472439331443441828",
    ADMIN_REVIEW: "1472023428658630686"
};

// ===== [ Storage الأنظمة ] =====
const warns = new Map();
const cooldowns = new Collection();

// ===== [ وظيفة ايمبد MNC الموحدة ] =====
const MNC_EMBED = (title, desc, color = "#000000") => new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(desc)
    .setFooter({ text: 'MNC Community Protection' })
    .setTimestamp();

// ===== [ 🛡️ نظام الحماية من الانهيار - ANTI CRASH ] =====
process.on("uncaughtException", (err) => { console.error('MNC CRITICAL ERROR:', err); });
process.on("unhandledRejection", (reason) => { console.error('MNC UNHANDLED REJECTION:', reason); });

// ===== [ تحويل الوقت بدقة ] =====
function parseDuration(str) {
    if (!str) return null;
    const match = str.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return null;
    const num = parseInt(match[1]);
    const unit = match[2];
    const multiplier = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return num * multiplier[unit];
}

// ===== [ 📩 نظام التفاعل الشامل (Interactions) ] =====
client.on("interactionCreate", async (interaction) => {
    
    // 1. التعامل مع الأزرار
    if (interaction.isButton()) {
        const { customId } = interaction;

        // فتح التذاكر (نظام المودال)
        if (customId.startsWith('ticket_')) {
            const type = customId.split('_')[1];
            await ticketEngine.triggerModal(interaction, type);
        }

        // أزرار التحكم الداخلية
        if (customId === 'claim') await ticketEngine.handleClaim(interaction);
        if (customId === 'add') await ticketEngine.handleAdd(interaction);
        
        if (customId === 'close_req') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_close').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );
            await interaction.reply({ content: "**Are you sure?**", components: [row], ephemeral: true });
        }
    }

    // 2. التعامل مع النوافذ (Modals)
    if (interaction.isModalSubmit()) {
        const { customId, fields } = interaction;

        if (customId.startsWith('modal_')) {
            const type = customId.split('_')[1];
            const data = {};
            fields.fields.forEach(f => data[f.customId] = f.value);
            await ticketEngine.create(interaction, type, data);
        }

        if (customId === 'modal_add_user') {
            const userId = fields.getTextInputValue('user_id');
            await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true });
            await interaction.reply({ content: `<@${userId}> has been added to ticket by <@${interaction.user.id}>` });
        }
    }
});

// ===== [ ⌨️ معالج الأوامر الكتابية ] =====
client.on("messageCreate", async (message) => {
    if (message.author.bot || !message.guild || !message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    try {
        // --- نظام التقييم (:done) ---
        if (cmd === "done") {
            if (!message.member.roles.cache.has(MNC_LOGS.STAFF_ROLE)) return;
            await ticketEngine.sendReviewRequest(message);
        }

        // --- نظام الـ SETUP العملاق ---
        if (cmd === "setup") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
            
            const mainEmbed = new EmbedBuilder()
                .setColor('#ffffff')
                .setTitle('📜 قوانين وتعليمات نظام التذاكر')
                .setDescription(
                    '**يرجى قراءة القوانين التالية قبل البدء بفتح تذكرة:**\n\n' +
                    '・يمنع فتح أكثر من تذكرتين في آن واحد\n' +
                    '・يرجى عدم تكرار المنشن للإدارة لسرعة الرد\n' +
                    '・في حال عدم الرد لمدة 24 ساعة سيتم إغلاق التذكرة\n\n' +
                    '**اختر القسم المناسب بالأسفل:**'
                );

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_mediator').setLabel('الوساطة').setEmoji('🤝').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_support').setLabel('الدعم الفني').setEmoji('⚙️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_gift').setLabel('الهدايا').setEmoji('🎁').setStyle(ButtonStyle.Success)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_report').setLabel('الشكاوى').setEmoji('🚫').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('ticket_creator').setLabel('الميديا').setEmoji('🎬').setStyle(ButtonStyle.Primary)
            );

            await message.channel.send({ embeds: [mainEmbed], components: [row1, row2] });
        }

        // --- أوامر الحماية الأصلية (Ban, Unban, Timeout) ---
        if (cmd === "ban") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
            const member = message.mentions.members.first();
            if (!member) return message.reply("يرجى تحديد عضو.");
            await member.ban();
            const e = MNC_EMBED("🔨 BAN", `User: ${member}\nModerator: ${message.author}`);
            message.channel.send({ embeds: [e] });
        }

        if (cmd === "timeout") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;
            const member = message.mentions.members.first();
            const duration = parseDuration(args[1]);
            if (!member || !duration) return message.reply("اكتب الوقت صح (10m, 1h).");
            await member.timeout(duration);
            const e = MNC_EMBED("⏱️ TIMEOUT", `User: ${member}\nDuration: ${args[1]}\nModerator: ${message.author}`);
            message.channel.send({ embeds: [e] });
        }

        // --- نظام التحذيرات الأصلي ---
        if (cmd === "warn") {
            const member = message.mentions.members.first();
            const reason = args.slice(1).join(" ") || "No reason";
            if (!member) return;
            if (!warns.has(member.id)) warns.set(member.id, []);
            warns.get(member.id).push({ reason, mod: message.author.tag, date: new Date().toLocaleString() });
            message.channel.send({ embeds: [MNC_EMBED("⚠️ WARN ADDED", `User: ${member}\nReason: ${reason}`)] });
        }

    } catch (error) { console.error('MNC Command Error:', error); }
});

client.once("ready", () => { console.log(`🔥 MNC TITAN ONLINE: ${client.user.tag}`); });
client.login(process.env.TOKEN);
