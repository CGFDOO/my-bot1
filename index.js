const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require("discord.js");

require("dotenv").config();

const prefix = ":";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

////////////////////////////////////////////////////
// READY
////////////////////////////////////////////////////

client.once("ready", () => {
  console.log(`😈 DEVIL BOT READY => ${client.user.tag}`);
});

////////////////////////////////////////////////////
// COMMANDS
////////////////////////////////////////////////////

client.on("messageCreate", async message => {

if(message.author.bot) return;
if(!message.content.startsWith(prefix)) return;

const args = message.content.slice(prefix.length).trim().split(/ +/);
const command = args.shift().toLowerCase();

////////////////////////////////////////////////////
// TEST
////////////////////////////////////////////////////

if(command === "test"){
return message.reply("🔥 DEVIL BOT WORKING PERFECTLY");
}

////////////////////////////////////////////////////
// BAN
////////////////////////////////////////////////////

if(command === "ban"){

if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
return message.reply("❌ معندكش صلاحية");

const member = message.mentions.members.first();
if(!member) return message.reply("حدد العضو بالمنشن");

const reason = args.join(" ") || "No reason";

await member.ban({ reason });

const embed = new EmbedBuilder()
.setColor("#000000")
.setTitle("😈 DEVIL BAN EXECUTED")
.setDescription(`
👤 العضو: ${member}
🛡 الاداري: ${message.author}
📌 السبب: ${reason}
`)
.setTimestamp();

message.channel.send({ embeds:[embed] });

}

////////////////////////////////////////////////////
// TIMEOUT
////////////////////////////////////////////////////

if(command === "timeout"){

if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
return message.reply("❌ معندكش صلاحية");

const member = message.mentions.members.first();
if(!member) return message.reply("حدد العضو");

let duration = args[1] || "10m";

let ms = 600000;

if(duration.endsWith("m")) ms = parseInt(duration)*60000;
if(duration.endsWith("h")) ms = parseInt(duration)*3600000;
if(duration.endsWith("d")) ms = parseInt(duration)*86400000;

await member.timeout(ms);

const embed = new EmbedBuilder()
.setColor("#000000")
.setTitle("⏱ DEVIL TIMEOUT")
.setDescription(`
👤 العضو: ${member}
🛡 الاداري: ${message.author}
⌛ المدة: ${duration}
`)
.setTimestamp();

message.channel.send({ embeds:[embed] });

}

////////////////////////////////////////////////////
// UNTIMEOUT
////////////////////////////////////////////////////

if(command === "untimeout"){

if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
return message.reply("❌ معندكش صلاحية");

const member = message.mentions.members.first();
if(!member) return message.reply("حدد العضو");

await member.timeout(null);

const embed = new EmbedBuilder()
.setColor("#000000")
.setTitle("✅ TIMEOUT REMOVED")
.setDescription(`
👤 العضو: ${member}
🛡 الاداري: ${message.author}
`)
.setTimestamp();

message.channel.send({ embeds:[embed] });

}

});

////////////////////////////////////////////////////
// ANTI CRASH
////////////////////////////////////////////////////

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

client.login(process.env.TOKEN);
