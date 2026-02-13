const {ChannelType,PermissionFlagsBits,EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,ModalBuilder,TextInputBuilder,TextInputStyle}=require("discord.js");
const config=require("./config");

let ticketNumber=1;

module.exports=(client)=>{

client.on("interactionCreate",async i=>{

if(!i.isButton())return;

if(["support","gift","middle","report"].includes(i.customId)){

const modal=new ModalBuilder()
.setCustomId("reason_modal_"+i.customId)
.setTitle("اكتب تفاصيل طلبك");

const input=new TextInputBuilder()
.setCustomId("reason")
.setLabel("ما هو طلبك؟")
.setStyle(TextInputStyle.Paragraph);

modal.addComponents(new ActionRowBuilder().addComponents(input));

return i.showModal(modal);

}

});

}
