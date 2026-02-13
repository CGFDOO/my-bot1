const {Client,GatewayIntentBits,EmbedBuilder,PermissionsBitField} = require("discord.js");
require("dotenv").config();

const client = new Client({
intents:[
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildMembers
]});

const prefix=":";

// ===== حط ايديهات اللوق =====
const LOGS={
BAN:"1454448586145398827",
TIME:"1454451180976603339",
WARN:"1472007035842334752"
};

// ===== ايمبد اسود =====
const EMBED=(t,d)=> new EmbedBuilder()
.setColor("#000000")
.setTitle(t)
.setDescription(d)
.setTimestamp();

const sendLog=async(guild,id,e)=>{
const ch=guild.channels.cache.get(id);
if(ch) ch.send({embeds:[e]}).catch(()=>{});
};

process.on("uncaughtException",console.error);
process.on("unhandledRejection",console.error);

client.on("messageCreate",async message=>{

if(message.author.bot||!message.guild) return;
if(!message.content.startsWith(prefix)) return;

const args=message.content.slice(prefix.length).trim().split(/ +/);
const cmd=args.shift().toLowerCase();

try{

// ===== BAN =====
if(cmd==="ban"){
if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

const member=message.mentions.members.first();
if(!member) return;

await member.ban(); // ينفذ الاول

const e=EMBED("✅ USER BANNED",
`User: ${member} (${member.id})
Moderator: ${message.author}`);

await message.channel.send({embeds:[e]});
sendLog(message.guild,LOGS.BAN,e);
}

// ===== UNBAN =====
if(cmd==="unban"){
const id=args[0];
if(!id) return;

await message.guild.members.unban(id);

const e=EMBED("✅ USER UNBANNED",
`ID: ${id}
Moderator: ${message.author}`);

message.channel.send({embeds:[e]});
sendLog(message.guild,LOGS.BAN,e);
}

// ===== TIMEOUT =====
if(cmd==="timeout"){
if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

const member=message.mentions.members.first();
const time=parseInt(args[1])*1000;
if(!member||!time) return;

// ينفذ ويتأكد
await member.timeout(time);

const e=EMBED("⏱️ USER TIMED OUT",
`User: ${member} (${member.id})
Time: ${args[1]}s
Moderator: ${message.author}`);

message.channel.send({embeds:[e]});
sendLog(message.guild,LOGS.TIME,e);
}

// ===== UNTIMEOUT =====
if(cmd==="untimeout"){
const member=message.mentions.members.first();
if(!member) return;

await member.timeout(null);

const e=EMBED("✅ TIMEOUT REMOVED",
`User: ${member} (${member.id})
Moderator: ${message.author}`);

message.channel.send({embeds:[e]});
sendLog(message.guild,LOGS.TIME,e);
}

// ===== WARN SYSTEM =====
if(cmd==="warn"){
const member=message.mentions.members.first();
if(!member) return;

const e=EMBED("⚠️ USER WARNED",
`User: ${member} (${member.id})
Moderator: ${message.author}`);

message.channel.send({embeds:[e]});
sendLog(message.guild,LOGS.WARN,e);
}

}catch(err){
console.log(err);
}

});

client.once("ready",()=>{
console.log(`READY ${client.user.tag}`);
});

client.login(process.env.TOKEN);
