const {
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
PermissionsBitField,
ChannelType
} = require("discord.js");

let ticketNumber = 0;
const activeTickets = new Map();

const CATEGORY_ID = "1453943996392013901";
const SUPPORT_ROLE_ID = "1454199885460144189";
const ADMIN_ROLE_ID = "1453946893053726830";

module.exports = (client) => {

client.on("messageCreate", async message => {

if(message.author.bot) return;

if(message.content === "!tickets") {

const embed = new EmbedBuilder()
.setTitle("🎫 نظام التذاكر الاحترافي")
.setDescription("اختر نوع التكت من الأسفل")
.setColor("Purple");

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("support")
.setLabel("دعم فني")
.setEmoji("💬")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("report")
.setLabel("شكوى على إداري")
.setEmoji("⚠️")
.setStyle(ButtonStyle.Danger),

new ButtonBuilder()
.setCustomId("middle")
.setLabel("طلب وسيط")
.setEmoji("🤝")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("gift")
.setLabel("استلام هدايا")
.setEmoji("🎁")
.setStyle(ButtonStyle.Secondary),

);

message.channel.send({embeds:[embed],components:[row]});
}

});

client.on("interactionCreate", async interaction => {

if(!interaction.isButton()) return;

// منع اكثر من تكت
if(["support","report","middle","gift"].includes(interaction.customId)){

if(activeTickets.has(interaction.user.id))
return interaction.reply({content:"❌ لديك تكت مفتوح بالفعل",ephemeral:true});

ticketNumber++;

const channel = await interaction.guild.channels.create({

name:`ticket-${ticketNumber}`,
type:ChannelType.GuildText,
parent:CATEGORY_ID,

permissionOverwrites:[

{ id:interaction.guild.id, deny:[PermissionsBitField.Flags.ViewChannel] },

{ id:interaction.user.id, allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages] },

{ id:SUPPORT_ROLE_ID, allow:[PermissionsBitField.Flags.ViewChannel] },

{ id:ADMIN_ROLE_ID, allow:[PermissionsBitField.Flags.ViewChannel] }

]

});

activeTickets.set(interaction.user.id,channel.id);

const embed = new EmbedBuilder()

.setTitle(`🎫 تكت رقم ${ticketNumber}`)
.setDescription(`مرحبا ${interaction.user} 👋\nتم فتح تذكرتك بنجاح.\nسيقوم أحد الإداريين بالرد عليك قريباً.`)
.setColor("Purple");

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder().setCustomId("claim").setLabel("استلام").setEmoji("✅").setStyle(ButtonStyle.Success),

new ButtonBuilder().setCustomId("add").setLabel("اضافة شخص").setEmoji("➕").setStyle(ButtonStyle.Primary),

new ButtonBuilder().setCustomId("close").setLabel("قفل").setEmoji("🔒").setStyle(ButtonStyle.Danger)

);

channel.send({embeds:[embed],components:[row]});

interaction.reply({content:"✅ تم فتح التكت",ephemeral:true});
}

// زر الاستلام
if(interaction.customId==="claim"){

if(!interaction.member.roles.cache.has(SUPPORT_ROLE_ID)) return;

await interaction.update({components:[]});

interaction.channel.send(`✅ تم استلام التكت بواسطة ${interaction.user}`);
}

// زر الاضافة
if(interaction.customId==="add"){

interaction.reply({content:"اكتب ايدي الشخص لإضافته",ephemeral:true});

}

// زر القفل
if(interaction.customId==="close"){

const confirmRow=new ActionRowBuilder().addComponents(

new ButtonBuilder().setCustomId("confirmclose").setLabel("تأكيد القفل").setStyle(ButtonStyle.Danger)

);

interaction.reply({content:"هل أنت متأكد من قفل التكت؟",components:[confirmRow]});

}

if(interaction.customId==="confirmclose"){

interaction.channel.delete();

}

});

};
