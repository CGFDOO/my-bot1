const {ChannelType,PermissionFlagsBits,EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle}=require("discord.js");
const config=require("./config");

module.exports=(client)=>{

client.on("interactionCreate",async i=>{

if(!i.isModalSubmit())return;
if(!i.customId.startsWith("reason_modal_"))return;

const reason=i.fields.getTextInputValue("reason");

const channel=await i.guild.channels.create({

name:`ticket-${Date.now()}`,

type:ChannelType.GuildText,

parent:config.CATEGORY_ID,

permissionOverwrites:[

{ id:i.guild.id, deny:[PermissionFlagsBits.ViewChannel] },

{ id:i.user.id, allow:[PermissionFlagsBits.ViewChannel] },

{ id:config.STAFF_ROLE, allow:[PermissionFlagsBits.ViewChannel] }

]

});

const embed=new EmbedBuilder()
.setColor(config.COLOR)
.setTitle("🎫 تم فتح تذكرة جديدة")
.setDescription(`

👤 العضو: ${i.user}

📌 الطلب:
${reason}

`);

const row=new ActionRowBuilder().addComponents(

new ButtonBuilder().setCustomId("claim").setLabel("استلام").setStyle(ButtonStyle.Success),

new ButtonBuilder().setCustomId("add").setLabel("إضافة عضو").setStyle(ButtonStyle.Primary),

new ButtonBuilder().setCustomId("close").setLabel("قفل").setStyle(ButtonStyle.Danger)

);

channel.send({content:`${i.user}`,embeds:[embed],components:[row]});

i.reply({content:"✅ تم فتح التكت",ephemeral:true});

});

}
