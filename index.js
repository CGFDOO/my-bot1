//////////////////////////////////////////////////
// 😈 DEVIL BOT - FINAL VERSION
//////////////////////////////////////////////////

const {
 Client,
 GatewayIntentBits,
 EmbedBuilder,
 PermissionsBitField
} = require("discord.js");

require("dotenv").config();

//////////////////////////////////////////////////
// BASIC SETUP (الحاجات الاساسية اللي كنا كاتبينها)
//////////////////////////////////////////////////

const prefix = ":";

const client = new Client({
 intents: [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers
 ]
});

//////////////////////////////////////////////////
// READY EVENT
//////////////////////////////////////////////////

client.once("ready", () => {
 console.log(`😈 DEVIL ONLINE | ${client.user.tag}`);
});

//////////////////////////////////////////////////
// MESSAGE HANDLER
//////////////////////////////////////////////////

client.on("messageCreate", async (message) => {

if(message.author.bot) return;
if(!message.content.startsWith(prefix)) return;

const args = message.content.slice(prefix.length).trim().split(/ +/);
const command = args.shift().toLowerCase();

//////////////////////////////////////////////////
// 🔥 TEST COMMAND
//////////////////////////////////////////////////

if(command === "test"){

 const embed = new EmbedBuilder()
 .setColor("#000000")
 .setTitle("🔥 DEVIL BOT STATUS")
 .setDescription("البوت يعمل بكفاءة عالية 😈")
 .setTimestamp();

 return message.reply({ embeds:[embed] });
}

//////////////////////////////////////////////////
// 😈 TIMEOUT COMMAND
//////////////////////////////////////////////////

if(command === "timeout"){

 if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
 return message.reply("❌ لا تملك صلاحية استخدام هذا الأمر.");

 const member = message.mentions.members.first();

 if(!member)
 return message.reply("⚠️ يرجى منشن العضو بشكل صحيح.");

 let duration = args[0] || "10m";

 let ms;

 if(duration.endsWith("m")) ms = parseInt(duration)*60000;
 else if(duration.endsWith("h")) ms = parseInt(duration)*3600000;
 else if(duration.endsWith("d")) ms = parseInt(duration)*86400000;
 else return message.reply("⚠️ صيغة الوقت غير صحيحة (مثال: 10m)");

 await member.timeout(ms);

 const embed = new EmbedBuilder()
 .setColor("#000000")
 .setTitle("⛔ DEVIL TIMEOUT")
 .setDescription(`
👤 العضو: ${member}
🛡 بواسطة: ${message.author}
⏱ المدة: ${duration}
`)
 .setTimestamp();

 return message.channel.send({ embeds:[embed] });
}

//////////////////////////////////////////////////
// 🔥 BAN COMMAND
//////////////////////////////////////////////////

if(command === "ban"){

 if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
 return message.reply("❌ لا تملك صلاحية.");

 const member = message.mentions.members.first();

 if(!member)
 return message.reply("⚠️ منشن العضو أولاً.");

 const reason = args.slice(1).join(" ") || "بدون سبب";

 await member.ban({ reason });

 const embed = new EmbedBuilder()
 .setColor("#000000")
 .setTitle("🔥 DEVIL BAN")
 .setDescription(`
👤 العضو: ${member}
🛡 الاداري: ${message.author}
📌 السبب: ${reason}
`)
 .setTimestamp();

 return message.channel.send({ embeds:[embed] });
}

});

//////////////////////////////////////////////////
// ANTI CRASH (الاساسيات المهمة)
//////////////////////////////////////////////////

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

//////////////////////////////////////////////////

client.login(process.env.TOKEN);
