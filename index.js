const { 
Client,
GatewayIntentBits,
EmbedBuilder,
PermissionsBitField
} = require("discord.js");

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

client.once("ready",()=>{
console.log("😈 DEVIL BOT READY => "+client.user.tag);
});

client.on("messageCreate", async (message)=>{

if(message.author.bot) return;
if(!message.content.startsWith(prefix)) return;

const args = message.content.slice(prefix.length).trim().split(/ +/);
const command = args.shift().toLowerCase();

const member = message.mentions.members.first();

if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
return;

//////////////////////////////////////////////////
// BAN COMMAND
//////////////////////////////////////////////////

if(command === "ban"){

if(!member) return message.reply("حدد العضو");

const reason = args.slice(1).join(" ") || "No reason";

await member.ban({ reason });

const embed = new EmbedBuilder()
.setColor("#000000")
.setTitle("😈 DEVIL BAN EXECUTED")
.setDescription(`
👤 User: ${member}
🆔 ID: ${member.id}
🛡 Moderator: ${message.author}
📌 Reason: ${reason}
`)
.setTimestamp();

message.channel.send({embeds:[embed]});

}

//////////////////////////////////////////////////
// TIMEOUT
//////////////////////////////////////////////////

if(command === "timeout"){

if(!member) return message.reply("حدد العضو");

const duration = args[1] || "10m";

let ms = 600000;

if(duration.endsWith("m")) ms = parseInt(duration)*60000;
if(duration.endsWith("h")) ms = parseInt(duration)*3600000;

await member.timeout(ms);

const embed = new EmbedBuilder()
.setColor("#000000")
.setTitle("⏱ DEVIL TIMEOUT")
.setDescription(`
👤 User: ${member}
🆔 ID: ${member.id}
🛡 Moderator: ${message.author}
⌛ Duration: ${duration}
`)
.setTimestamp();

message.channel.send({embeds:[embed]});

}

//////////////////////////////////////////////////
// UNTIMEOUT
//////////////////////////////////////////////////

if(command === "untimeout"){

if(!member) return message.reply("حدد العضو");

await member.timeout(null);

const embed = new EmbedBuilder()
.setColor("#000000")
.setTitle("✅ TIMEOUT REMOVED")
.setDescription(`
👤 User: ${member}
🆔 ID: ${member.id}
🛡 Moderator: ${message.author}
`)
.setTimestamp();

message.channel.send({embeds:[embed]});

}

});

//////////////////////////////////////////////////
// ANTI CRASH SYSTEM 😈
//////////////////////////////////////////////////

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(process.env.TOKEN);
