const {
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
ModalBuilder,
TextInputBuilder,
TextInputStyle,
Events,
PermissionsBitField
} = require("discord.js");

module.exports = (client)=>{

/* ================== الإعدادات ================== */

// اكتب هنا ايدي كاتيجوري التكتات
const TICKET_CATEGORY_ID = "1453943996392013901";

// روم لوق التقييم
const LOG_CHANNEL_ID = "1472023428658630686";

// رتبة الاداريين (عشان ما يبعتلهم تقييم)
const STAFF_ROLE_ID = "PUT_STAFF_ROLE_ID_HERE";

/* ================================================= */

client.on(Events.MessageCreate, async message=>{

if(!message.guild) return;
if(message.author.bot) return;

if(message.content === ":close"){

// التأكد انه روم تكت
if(message.channel.parentId !== TICKET_CATEGORY_ID) return;

const members = message.channel.members;

members.forEach(async member=>{

if(member.user.bot) return;
if(member.roles.cache.has(STAFF_ROLE_ID)) return;

try{

const embed = new EmbedBuilder()
.setColor("#000000")
.setTitle("⭐ تقييم الخدمة")
.setDescription("نشكرك لاستخدامك التكت.\nاختر تقييمك من الأسفل.");

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("rate_1").setLabel("⭐").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("rate_2").setLabel("⭐⭐").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("rate_3").setLabel("⭐⭐⭐").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("rate_4").setLabel("⭐⭐⭐⭐").setStyle(ButtonStyle.Secondary),
new ButtonBuilder().setCustomId("rate_5").setLabel("⭐⭐⭐⭐⭐").setStyle(ButtonStyle.Success)
);

const row2 = new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("add_note")
.setLabel("إضافة ملاحظة")
.setStyle(ButtonStyle.Primary)
);

await member.send({embeds:[embed],components:[row,row2]});

}catch{}
});

}

});

/* ================== استقبال الأزرار ================== */

client.on(Events.InteractionCreate, async interaction=>{

if(!interaction.isButton()) return;

if(interaction.customId.startsWith("rate_")){

const stars = interaction.customId.split("_")[1];

await interaction.reply({content:"✅ تم تسجيل تقييمك.",ephemeral:true});

const log = await client.channels.fetch(LOG_CHANNEL_ID).catch(()=>null);
if(!log) return;

const embed = new EmbedBuilder()
.setColor("#000000")
.setTitle("⭐ تقييم جديد")
.addFields(
{name:"العضو",value:`${interaction.user} (${interaction.user.id})`},
{name:"عدد النجوم",value:`${stars} ⭐`},
{name:"الوقت",value:`<t:${Math.floor(Date.now()/1000)}:F>`}
);

log.send({embeds:[embed]});

}

if(interaction.customId === "add_note"){

const modal = new ModalBuilder()
.setCustomId("note_modal")
.setTitle("إضافة ملاحظة");

const input = new TextInputBuilder()
.setCustomId("note_text")
.setLabel("اكتب ملاحظتك")
.setStyle(TextInputStyle.Paragraph);

modal.addComponents(
new ActionRowBuilder().addComponents(input)
);

await interaction.showModal(modal);

}

});

/* ================== استقبال الملاحظات ================== */

client.on(Events.InteractionCreate, async interaction=>{

if(!interaction.isModalSubmit()) return;
if(interaction.customId !== "note_modal") return;

const note = interaction.fields.getTextInputValue("note_text");

await interaction.reply({content:"✅ تم إرسال ملاحظتك.",ephemeral:true});

const log = await client.channels.fetch(LOG_CHANNEL_ID).catch(()=>null);
if(!log) return;

const embed = new EmbedBuilder()
.setColor("#000000")
.setTitle("📝 ملاحظة جديدة")
.addFields(
{name:"العضو",value:`${interaction.user} (${interaction.user.id})`},
{name:"الملاحظة",value:note},
{name:"الوقت",value:`<t:${Math.floor(Date.now()/1000)}:F>`}
);

log.send({embeds:[embed]});

});

};
