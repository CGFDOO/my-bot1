const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle}=require("discord.js");
const config=require("./config");

module.exports=(client)=>{

client.on("messageCreate",async message=>{

if(message.content!==":ticket")return;

const embed=new EmbedBuilder()
.setColor(config.COLOR)
.setTitle("🎫 نظام التذاكر الاحترافي")
.setDescription(`
اختر نوع التكت من الأزرار:

🛠️ دعم فني
🎁 استلام هدايا
⚖️ طلب وسيط
🚨 شكوى على إداري

📌 القوانين:
- اشرح طلبك بوضوح
- يمنع السبام
- أرسل الأدلة عند الحاجة
`);

const row=new ActionRowBuilder().addComponents(

new ButtonBuilder().setCustomId("support").setLabel("دعم فني").setStyle(ButtonStyle.Primary),

new ButtonBuilder().setCustomId("gift").setLabel("استلام هدايا").setStyle(ButtonStyle.Success),

new ButtonBuilder().setCustomId("middle").setLabel("طلب وسيط").setStyle(ButtonStyle.Secondary),

new ButtonBuilder().setCustomId("report").setLabel("شكوى إداري").setStyle(ButtonStyle.Danger)

);

message.channel.send({embeds:[embed],components:[row]});

});

}
