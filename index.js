const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require("discord.js");
require("dotenv").config();

const prefix = ":";

const client = new Client({
 intents:[
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers
 ]
});

//////////////////////////////////////////////////

client.once("ready",()=>{
 console.log("😈 DEVIL READY "+client.user.tag);
});

//////////////////////////////////////////////////

client.on("messageCreate", async (message)=>{

if(message.author.bot) return;
if(!message.content.startsWith(prefix)) return;

const args = message.content.slice(prefix.length).trim().split(/ +/);
const command = args.shift().toLowerCase();

//////////////////////////////////////////////////
// TEST
//////////////////////////////////////////////////

if(command==="test"){
 return message.reply("🔥 DEVIL BOT WORKING PERFECTLY");
}

//////////////////////////////////////////////////
// TIMEOUT (DEVIL FIXED VERSION)
//////////////////////////////////////////////////

if(command==="timeout"){

if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
 return message.reply("❌ معندك صلاحية");

const member = message.mentions.members.first();

if(!member)
 return message.reply("⚠️ اعمل منشن للعضو صح");

let duration = args[0] || "10m";

let ms;

if(duration.endsWith("m")) ms = parseInt(duration)*60000;
else if(duration.endsWith("h")) ms = parseInt(duration)*3600000;
else if(duration.endsWith("d")) ms = parseInt(duration)*86400000;
else return message.reply("⚠️ اكتب الوقت صح مثال 10m");

await member.timeout(ms);

const embed = new EmbedBuilder()
.setColor("#000000")
.setTitle("😈 DEVIL TIMEOUT EXECUTED")
.setDescription(`
👤 العضو: ${member}
🛡 الاداري: ${message.author}
⌛ المدة: ${duration}
`)
.setTimestamp();

return message.channel.send({embeds:[embed]});
}

//////////////////////////////////////////////////
// BAN
//////////////////////////////////////////////////

if(command==="ban"){

if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
 return message.reply("❌ معندك صلاحية");

const member = message.mentions.members.first();
if(!member) return message.reply("حدد العضو");

const reason = args.slice(1).join(" ") || "No reason";

await member.ban({reason});

const embed = new EmbedBuilder()
.setColor("#000000")
.setTitle("🔥 DEVIL BAN EXECUTED")
.setDescription(`
👤 العضو: ${member}
🛡 الاداري: ${message.author}
📌 السبب: ${reason}
`)
.setTimestamp();

return message.channel.send({embeds:[embed]});
}

});

//////////////////////////////////////////////////

process.on("unhandledRejection",console.error);
process.on("uncaughtException",console.error);

client.login(process.env.TOKEN);
