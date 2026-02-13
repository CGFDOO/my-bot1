const {
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
PermissionsBitField,
ChannelType,
ModalBuilder,
TextInputBuilder,
TextInputStyle
} = require("discord.js");

let ticketCount = 0;
const opened = new Map();

const CATEGORY_ID = "PUT_CATEGORY_ID";
const STAFF_ROLE = "PUT_STAFF_ROLE";

module.exports = (client)=>{

// ارسال لوحة التكت
client.on("messageCreate",async msg=>{

if(msg.author.bot) return;

if(msg.content==="!tickets"){

const embed=new EmbedBuilder()

.setColor("Purple")

.setTitle("🎫 نظام الدعم الفني - MNC COMMUNITY")

.setDescription(`

✨ مرحباً بك في نظام التكتات الاحترافي.

📌 اختر نوع التذكرة من الأزرار بالأسفل.

━━━━━━━━━━━━━━

📜 **قوانين التذاكر**

・عدم السب أو الإزعاج.
・شرح مشكلتك بوضوح.
・عدم المنشن للإدارة بدون سبب.
・التكت للمساعدة فقط.

━━━━━━━━━━━━━━

💬 دعم فني
⚠️ شكوى على إداري
🤝 طلب وسيط
🎁 استلام هدايا

`);

const row=new ActionRowBuilder().addComponents(

new ButtonBuilder().setCustomId("open_ticket").setLabel("فتح تذكرة").setEmoji("🎫").setStyle(ButtonStyle.Success)

);

msg.channel.send({embeds:[embed],components:[row]});

}

});

// الضغط على الازرار
client.on("interactionCreate",async i=>{

if(!i.isButton() && !i.isModalSubmit()) return;

// فتح التكت
if(i.customId==="open_ticket"){

if(opened.has(i.user.id))
return i.reply({content:"❌ لديك تكت مفتوح بالفعل",ephemeral:true});

ticketCount++;

const channel=await i.guild.channels.create({

name:`ticket-${ticketCount}`,

type:ChannelType.GuildText,

parent:CATEGORY_ID,

permissionOverwrites:[

{ id:i.guild.id,deny:[PermissionsBitField.Flags.ViewChannel] },

{ id:i.user.id,allow:[PermissionsBitField.Flags.ViewChannel,PermissionsBitField.Flags.SendMessages] },

{ id:STAFF_ROLE,allow:[PermissionsBitField.Flags.ViewChannel] }

]

});

opened.set(i.user.id,channel.id);

const embed=new EmbedBuilder()

.setColor("Purple")

.setTitle(`🎫 تذكرة رقم ${ticketCount}`)

.setDescription(`

👋 مرحباً ${i.user}

تم فتح تذكرتك بنجاح.

⏳ انتظر حتى يستلم أحد الإداريين طلبك.

`);

const row=new ActionRowBuilder().addComponents(

new ButtonBuilder().setCustomId("claim").setLabel("استلام").setEmoji("✅").setStyle(ButtonStyle.Success),

new ButtonBuilder().setCustomId("add_member").setLabel("إضافة شخص").setEmoji("➕").setStyle(ButtonStyle.Primary),

new ButtonBuilder().setCustomId("close").setLabel("قفل التذكرة").setEmoji("🔒").setStyle(ButtonStyle.Danger)

);

channel.send({embeds:[embed],components:[row]});

i.reply({content:"✅ تم فتح التكت",ephemeral:true});

}

// زر الاستلام
if(i.customId==="claim"){

await i.update({components:[]});

i.channel.send(`✅ تم استلام التكت بواسطة ${i.user}`);

}

// زر اضافة شخص (مودال)
if(i.customId==="add_member"){

const modal=new ModalBuilder()

.setCustomId("add_modal")

.setTitle("إضافة عضو للتكت");

const input=new TextInputBuilder()

.setCustomId("member_id")

.setLabel("يرجى كتابة الأيدي لإضافة العضو")

.setStyle(TextInputStyle.Short);

const row=new ActionRowBuilder().addComponents(input);

modal.addComponents(row);

return i.showModal(modal);

}

// تنفيذ اضافة العضو
if(i.customId==="add_modal"){

const id=i.fields.getTextInputValue("member_id");

const member=await i.guild.members.fetch(id).catch(()=>null);

if(!member) return i.reply({content:"❌ لم يتم العثور على العضو",ephemeral:true});

await i.channel.permissionOverwrites.edit(member.id,{

ViewChannel:true,

SendMessages:true

});

i.reply({content:`✅ تم إضافة ${member}`,ephemeral:false});

}

// زر القفل
if(i.customId==="close"){

await i.reply("🔒 سيتم قفل التكت خلال ثواني...");

setTimeout(()=>{

i.channel.delete().catch(()=>{});

},3000);

}

});

};
