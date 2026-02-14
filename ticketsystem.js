// ===============================
// 🔥 ULTRA TICKET SYSTEM - MAZEN EDITION
// discord.js v14
// ===============================

const {
Client,
GatewayIntentBits,
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
PermissionsBitField,
ChannelType,
ModalBuilder,
TextInputBuilder,
TextInputStyle,
Events
} = require("discord.js");

const fs = require("fs");

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildMembers
]
});

// ===============================
// ⚙️ CONFIG
// ===============================

const ADMIN_ROLE = "1454199885460144189";
const SUPER_ADMIN_ROLE = "1453946893053726830";

const CATEGORY_ID = "1453943996392013901";
const LOG_CHANNEL = "1453948413963141153";

let ticketCount = 0;
let userTickets = {};
let claimedTickets = {};

// ===============================
// 🚀 READY
// ===============================

client.once("ready", () => {
console.log(`Logged as ${client.user.tag}`);
});

// ===============================
// 🎫 PANEL COMMAND
// ===============================

client.on("messageCreate", async msg => {

if(msg.content === "!panel") {

const embed = new EmbedBuilder()
.setColor("#000000")
.setTitle("🎫 نظام التذاكر")
.setDescription(`

قوانين فتح التكت:

- يرجى شرح المشكلة بوضوح
- ضع دليل إذا لزم الأمر
- يمنع السبام

`);

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("support")
.setLabel("دعم فني")
.setEmoji("🔧")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("middleman")
.setLabel("طلب وسيط")
.setEmoji("🤝")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("report")
.setLabel("شكوى إداري")
.setEmoji("⚠️")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("gift")
.setLabel("استلام هدايا")
.setEmoji("🎁")
.setStyle(ButtonStyle.Secondary)

);

msg.channel.send({ embeds:[embed], components:[row] });

}

});

// ===============================
// 🎫 CREATE TICKET
// ===============================

client.on(Events.InteractionCreate, async interaction => {

if(!interaction.isButton()) return;

const types = ["support","middleman","report","gift"];

if(types.includes(interaction.customId)) {

const user = interaction.user.id;

if(!userTickets[user]) userTickets[user]=0;

if(userTickets[user] >= 2)
return interaction.reply({content:"❌ لديك تذكرتين بالفعل.",ephemeral:true});

ticketCount++;
userTickets[user]++;

const channel = await interaction.guild.channels.create({
name:`ticket-${ticketCount}`,
type:ChannelType.GuildText,
parent:CATEGORY_ID,
permissionOverwrites:[

// ❌ اخفاء الروم عن كل السيرفر
{
id: interaction.guild.id,
deny: [PermissionsBitField.Flags.ViewChannel]
},

// ✅ صاحب التكت
{
id: interaction.user.id,
allow: [
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages,
PermissionsBitField.Flags.ReadMessageHistory
]
},

// ✅ الادارة
{
id: ADMIN_ROLE,
allow: [
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages,
PermissionsBitField.Flags.ReadMessageHistory
]
}

]
});

claimedTickets[channel.id] = null;

const embed = new EmbedBuilder()
.setColor("#000000")
.setTitle(`Ticket #${ticketCount}`)
.setDescription(`تم فتح التذكرة بواسطة ${interaction.user}`);

const controls = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("claim")
.setLabel("Claim")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("add")
.setLabel("Add")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("close")
.setLabel("Close")
.setStyle(ButtonStyle.Danger)

);

channel.send({ embeds:[embed], components:[controls] });

  interaction.reply({
content:`✅ تم فتح التكت بنجاح !

📂 روم التكت الخاص بك:
${channel}

اضغط على المنشن للدخول مباشرة 👆`,
ephemeral:true
});

}

// ===============================
// 👑 CLAIM SYSTEM
// ===============================

if(interaction.customId === "claim") {

if(!interaction.member.roles.cache.has(ADMIN_ROLE))
return interaction.reply({content:"❌ للإدارة فقط",ephemeral:true});

if(claimedTickets[interaction.channel.id] && !interaction.member.roles.cache.has(SUPER_ADMIN_ROLE))
return interaction.reply({content:"❌ تم الاستلام بالفعل",ephemeral:true});

claimedTickets[interaction.channel.id]=interaction.user.id;

interaction.update({
components:[ new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("claimed")
.setLabel(`Claimed by ${interaction.user.username}`)
.setStyle(ButtonStyle.Success)
.setDisabled(true),

new ButtonBuilder().setCustomId("add").setLabel("Add").setStyle(ButtonStyle.Secondary),

new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Danger)

)]

});

}

// ===============================
// ➕ ADD MEMBER MODAL
// ===============================

if(interaction.customId==="add"){

const modal = new ModalBuilder()
.setCustomId("addModal")
.setTitle("إضافة عضو للتكت");

const input = new TextInputBuilder()
.setCustomId("memberID")
.setLabel("اكتب ID العضو")
.setStyle(TextInputStyle.Short);

modal.addComponents(new ActionRowBuilder().addComponents(input));

interaction.showModal(modal);

}

// ===============================
// 🔒 CLOSE CONFIRM
// ===============================

if(interaction.customId==="close"){

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder().setCustomId("confirmClose").setLabel("Close Ticket").setStyle(ButtonStyle.Danger),

new ButtonBuilder().setCustomId("cancelClose").setLabel("Cancel").setStyle(ButtonStyle.Secondary)

);

interaction.reply({content:"هل أنت متأكد؟",components:[row]});

}

if(interaction.customId==="confirmClose"){

interaction.channel.permissionOverwrites.edit(interaction.guild.id,{SendMessages:false});

const del = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("delete").setLabel("Delete Ticket").setStyle(ButtonStyle.Danger)
);

interaction.channel.send({content:"🔒 تم إغلاق التكت",components:[del]});

// transcript
const log = interaction.guild.channels.cache.get(LOG_CHANNEL);
log.send(`Transcript for ${interaction.channel.name}`);

}

if(interaction.customId==="delete"){

interaction.channel.delete();

}

});

// ===============================
// 🧾 MODAL SUBMIT
// ===============================

client.on(Events.InteractionCreate, async interaction => {

if(!interaction.isModalSubmit()) return;

if(interaction.customId==="addModal"){

const id = interaction.fields.getTextInputValue("memberID");

interaction.channel.permissionOverwrites.edit(id,{
ViewChannel:true,
SendMessages:true
});

interaction.reply({content:"✅ تمت إضافة العضو",ephemeral:true});

}

});
  
