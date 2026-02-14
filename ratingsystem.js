const {
Client,
GatewayIntentBits,
EmbedBuilder,
PermissionsBitField,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
ModalBuilder,
TextInputBuilder,
TextInputStyle,
Events
}=require("discord.js");

require("dotenv").config();

const client=new Client({
intents:[
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.GuildMembers,
GatewayIntentBits.MessageContent
]});

// ====== SETTINGS ======
const prefix=":";
const LOG_CHANNEL="1472023428658630686"; // روم لوق التقييم
const TICKET_PREFIX="ticket"; // اسم رومات التكت

// ===== DATABASE MEMORY =====
const ticketUsers=new Map();
const rated=new Set();

// ===== EMBED STYLE =====
const EMBED=(t,d)=>new EmbedBuilder()
.setColor("#000000")
.setTitle(t)
.setDescription(d)
.setTimestamp();

// ===== ANTI CRASH =====
process.on("uncaughtException",console.error);
process.on("unhandledRejection",console.error);

// =================================
// TRACK MEMBERS داخل التكت
// =================================
client.on("messageCreate",async msg=>{

if(msg.author.bot) return;
if(!msg.guild) return;
if(!msg.channel.name.startsWith(TICKET_PREFIX)) return;

if(!ticketUsers.has(msg.channel.id))
ticketUsers.set(msg.channel.id,new Set());

ticketUsers.get(msg.channel.id).add(msg.author.id);

});

// =================================
// CLOSE TICKET COMMAND
// =================================
client.on("messageCreate",async msg=>{

if(!msg.content.startsWith(prefix)) return;
if(msg.author.bot) return;

const args=msg.content.slice(prefix.length).split(/ +/);
const cmd=args.shift().toLowerCase();

if(cmd!=="closeticket") return;

if(!msg.member.permissions.has(PermissionsBitField.Flags.ManageChannels))
return;

const users=ticketUsers.get(msg.channel.id);
if(!users) return msg.reply("No users tracked.");

const row=new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("rate_1").setLabel("⭐").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("rate_2").setLabel("⭐⭐").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("rate_3").setLabel("⭐⭐⭐").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("rate_4").setLabel("⭐⭐⭐⭐").setStyle(ButtonStyle.Primary),
new ButtonBuilder().setCustomId("rate_5").setLabel("⭐⭐⭐⭐⭐").setStyle(ButtonStyle.Success)
);

for(const id of users){

const member=await msg.guild.members.fetch(id).catch(()=>null);
if(!member) continue;

// تجاهل الإداريين
if(member.permissions.has(PermissionsBitField.Flags.Administrator)) continue;

const user=member.user;

const embed=EMBED(
"⭐ Service Evaluation",
  );

user.send({embeds:[embed],components:[row]}).catch(()=>{});

}

msg.channel.send("✅ Rating sent.");

});

// =================================
// HANDLE BUTTON RATING
// =================================
client.on(Events.InteractionCreate,async interaction=>{

if(!interaction.isButton()) return;
if(!interaction.customId.startsWith("rate_")) return;

if(rated.has(interaction.user.id))
return interaction.reply({content:"You already rated.",ephemeral:true});

rated.add(interaction.user.id);

const rating=interaction.customId.split("_")[1];

// فتح modal للملاحظات
const modal=new ModalBuilder()
.setCustomId(`feedback_${rating}`)
.setTitle("Additional Feedback");

const input=new TextInputBuilder()
.setCustomId("extra")
.setLabel("Add complaint or extra notes (optional)")
.setStyle(TextInputStyle.Paragraph)
.setRequired(false);

modal.addComponents(new ActionRowBuilder().addComponents(input));

await interaction.showModal(modal);

});

// =================================
// HANDLE MODAL SUBMIT
// =================================
client.on(Events.InteractionCreate,async interaction=>{

if(!interaction.isModalSubmit()) return;
if(!interaction.customId.startsWith("feedback_")) return;

const rating=interaction.customId.split("_")[1];
const extra=interaction.fields.getTextInputValue("extra")||"No extra notes";

const guild=client.guilds.cache.first();
const log=guild.channels.cache.get(LOG_CHANNEL);

const embed=EMBED(
"📊 New Rating Received",
`User: ${interaction.user}
ID: ${interaction.user.id}
Rating: ⭐ ${rating}

Extra:
${extra}`
);

if(log) log.send({embeds:[embed]});

interaction.reply({
content:"✅ Your rating has been submitted successfully.",
ephemeral:true
});

});

// =================================
client.once("ready",()=>{
console.log("🔥 Ultimate Rating System Ready");
});

client.login(process.env.TOKEN);
"Your ticket has been closed.\nPlease rate your experience using the buttons below."
