const { 
ChannelType, 
PermissionFlagsBits,
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle
} = require("discord.js");

module.exports = (client)=>{

const ADMIN_ROLE="1454199885460144189";
const HIGH_ADMIN="1453946893053726830";
const CATEGORY_ID="1453943996392013901";

client.on("interactionCreate", async i=>{

// فتح التكت
if(i.customId==="create_ticket"){

let exist=i.guild.channels.cache.find(c=>c.name===`ticket-${i.user.id}`);
if(exist) return i.reply({content:"❌ لديك تكت مفتوح بالفعل",ephemeral:true});

let ch=await i.guild.channels.create({
name:`ticket-${i.user.id}`,
type:ChannelType.GuildText,
parent:CATEGORY_ID,
permissionOverwrites:[
{ id:i.guild.id, deny:[PermissionFlagsBits.ViewChannel]},
{ id:i.user.id, allow:[PermissionFlagsBits.ViewChannel]},
{ id:ADMIN_ROLE, allow:[PermissionFlagsBits.ViewChannel]},
{ id:HIGH_ADMIN, allow:[PermissionFlagsBits.ViewChannel]}
]});

const embed=new EmbedBuilder()
.setTitle("🎫 Support Ticket")
.setDescription(`User: ${i.user}\nID: ${i.user.id}`)
.setColor("Purple")
.setTimestamp();

const row=new ActionRowBuilder().addComponents(
new ButtonBuilder().setCustomId("claim").setLabel("استلام").setStyle(ButtonStyle.Success),
new ButtonBuilder().setCustomId("add").setLabel("اضافة شخص").setStyle(ButtonStyle.Primary),
new ButtonBuilder().setCustomId("close").setLabel("اغلاق").setStyle(ButtonStyle.Danger)
);

ch.send({embeds:[embed],components:[row]});
i.reply({content:`✅ تم فتح التكت ${ch}`,ephemeral:true});
}

// استلام التكت
if(i.customId==="claim"){

if(!i.member.roles.cache.has(ADMIN_ROLE)) return;

await i.channel.permissionOverwrites.edit(ADMIN_ROLE,{ViewChannel:false});
await i.channel.permissionOverwrites.edit(i.member.id,{ViewChannel:true});

const embed=new EmbedBuilder()
.setDescription(`✅ تم استلام التكت بواسطة ${i.user}`)
.setColor("Green");

i.reply({embeds:[embed]});
}

// اضافة شخص
if(i.customId==="add"){

if(!i.member.roles.cache.has(ADMIN_ROLE)) return;

i.reply({content:"منشن الشخص بعد الأمر !add @user",ephemeral:true});
}

// اغلاق التكت
if(i.customId==="close"){

const embed=new EmbedBuilder()
.setDescription("🔒 سيتم اغلاق التكت بعد 5 ثواني")
.setColor("Red");

await i.reply({embeds:[embed]});

setTimeout(()=>{ i.channel.delete(); },5000);
}

});

};
