// =====================================================
// 🔥 ULTRA TICKET SYSTEM - FINAL BEAST VERSION
// =====================================================

const {
Client,
GatewayIntentBits,
Partials,
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
Events,
PermissionsBitField,
Collection
} = require("discord.js");

//////////////////////////////////////////////////////
// ⚙️ CONFIG
//////////////////////////////////////////////////////

const config = {

TOKEN: "PUT_BOT_TOKEN",

// ايدي روم اللوج
LOG_CHANNEL: "1472023428658630686",

// الكلمات اللي تدل انه روم تكت
TICKET_NAMES: ["ticket", "claimed", "support"],

// الرتب اللي تعتبر ادارة (مش هيتبعت لها تقييم)
STAFF_ROLES: ["1454199885460144189"],

EMBED_COLOR: 0x000000

};

//////////////////////////////////////////////////////
// 🚀 CLIENT
//////////////////////////////////////////////////////

const client = new Client({

intents: [

GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildMembers

],

partials: [Partials.Channel]

});

//////////////////////////////////////////////////////
// 🧠 MEMORY SYSTEM
//////////////////////////////////////////////////////

const ticketMembers = new Collection();
const cooldown = new Collection();

//////////////////////////////////////////////////////
// ✅ READY
//////////////////////////////////////////////////////

client.once(Events.ClientReady, () => {

console.log(`🔥 Logged as ${client.user.tag}`);

});

//////////////////////////////////////////////////////
// 🧩 CHECK TICKET CHANNEL
//////////////////////////////////////////////////////

function isTicketChannel(channel) {

if (!channel) return false;

return config.TICKET_NAMES.some(name =>
channel.name.toLowerCase().includes(name)
);

}

//////////////////////////////////////////////////////
// 👀 TRACK MEMBERS INSIDE TICKET
//////////////////////////////////////////////////////

client.on(Events.MessageCreate, async message => {

if (!message.guild) return;
if (message.author.bot) return;

if (!isTicketChannel(message.channel)) return;

let data = ticketMembers.get(message.channel.id) || new Set();

data.add(message.author.id);

ticketMembers.set(message.channel.id, data);

});

//////////////////////////////////////////////////////
// 🔘 SEND CLOSE BUTTON
//////////////////////////////////////////////////////

client.on(Events.MessageCreate, async message => {

if (!message.guild) return;
if (message.author.bot) return;

if (message.content === "!panel") {

const embed = new EmbedBuilder()
.setColor(config.EMBED_COLOR)
.setTitle("🎟️ Ticket Control")
.setDescription("اضغط الزر لإغلاق التكت وإرسال التقييم.");

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("close_ticket")
.setLabel("Close Ticket")
.setStyle(ButtonStyle.Danger)

);

message.channel.send({

embeds: [embed],
components: [row]

});

}

});

//////////////////////////////////////////////////////
// ⭐ RATING BUTTONS
//////////////////////////////////////////////////////

function ratingButtons() {

return new ActionRowBuilder().addComponents(

new ButtonBuilder().setCustomId("rate_1").setLabel("⭐").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("rate_2").setLabel("⭐⭐").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("rate_3").setLabel("⭐⭐⭐").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("rate_4").setLabel("⭐⭐⭐⭐").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("rate_5").setLabel("⭐⭐⭐⭐⭐").setStyle(ButtonStyle.Success)

);

}

//////////////////////////////////////////////////////
// 🔘 INTERACTION HANDLER
//////////////////////////////////////////////////////

client.on(Events.InteractionCreate, async interaction => {

if (!interaction.isButton()) return;

//////////////////////////////////////////////////////
// CLOSE TICKET BUTTON
//////////////////////////////////////////////////////

if (interaction.customId === "close_ticket") {

if (!isTicketChannel(interaction.channel)) {

return interaction.reply({

content: "❌ هذا ليس روم تكت.",
ephemeral: true

});

}

await interaction.deferReply({ ephemeral: true });

let members = ticketMembers.get(interaction.channel.id);

if (!members) members = new Set();

const embed = new EmbedBuilder()

.setColor(config.EMBED_COLOR)
.setTitle("⭐ تقييم الخدمة")
.setDescription("يرجى اختيار تقييمك.");

//////////////////////////////////////////////////////
// SEND DM RATING
//////////////////////////////////////////////////////

for (let userId of members) {

try {

const member = await interaction.guild.members.fetch(userId);

if (!member) continue;

if (config.STAFF_ROLES.some(r => member.roles.cache.has(r))) continue;

await member.send({

embeds: [embed],
components: [ratingButtons()]

});

} catch (e) {}

}

//////////////////////////////////////////////////////
// LOG
//////////////////////////////////////////////////////

const log = interaction.guild.channels.cache.get(config.LOG_CHANNEL);

if (log) {

log.send(`📩 تم ارسال التقييم لروم ${interaction.channel.name}`);

}

await interaction.editReply("✅ تم إرسال التقييم.");

}

//////////////////////////////////////////////////////
// RATING CLICK
//////////////////////////////////////////////////////

if (interaction.customId.startsWith("rate_")) {

const stars = interaction.customId.split("_")[1];

if (cooldown.has(interaction.user.id)) {

return interaction.reply({

content: "❌ تم تقييمك مسبقاً.",
ephemeral: true

});

}

cooldown.set(interaction.user.id, true);

const embed = new EmbedBuilder()

.setColor(config.EMBED_COLOR)
.setTitle("⭐ تقييم جديد")
.addFields(

{ name: "User", value: `${interaction.user}`, inline: true },
{ name: "Stars", value: `${stars}`, inline: true }

);

const guild = client.guilds.cache.first();

const log = guild.channels.cache.get(config.LOG_CHANNEL);

if (log) log.send({ embeds: [embed] });

interaction.reply({

content: "🔥 شكراً على التقييم.",
ephemeral: true

});

}

});

//////////////////////////////////////////////////////
// ERROR HANDLER
//////////////////////////////////////////////////////

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

//////////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////////

client.login(config.TOKEN);
