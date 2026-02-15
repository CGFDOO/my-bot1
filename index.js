const {Client,GatewayIntentBits,EmbedBuilder,PermissionsBitField} = require("discord.js");
require("dotenv").config();

const client=new Client({
intents:[
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildMembers
]});

const prefix=":";

// ===== IDs اللوق =====
const LOGS={
BAN:"1454448586145398827",
TIME:"1454451180976603339",
WARN:"1472007035842334752",
};

// ===== storage التحذيرات =====
const warns=new Map();

// ===== ايمبد اسود =====
const EMBED=(title,desc)=> new EmbedBuilder()
.setColor("#000000")
.setTitle(title)
.setDescription(desc)
.setTimestamp();

// ===== anti crash =====
process.on("uncaughtException",console.error);
process.on("unhandledRejection",console.error);

// ===== تحويل الوقت صح =====
function parseDuration(str){
if(!str) return null;
const match=str.match(/^(\d+)(s|m|h|d)$/);
if(!match) return null;
const num=parseInt(match[1]);
const unit=match[2];
if(unit==="s") return num*1000;
if(unit==="m") return num*60*1000;
if(unit==="h") return num*60*60*1000;
if(unit==="d") return num*24*60*60*1000;
return null;
}

// ===== ارسال لوق =====
async function sendLog(guild,id,embed){
try{
const ch=guild.channels.cache.get(id);
if(ch) await ch.send({embeds:[embed]});
}catch{}
}

client.on("messageCreate",async message=>{

if(message.author.bot||!message.guild) return;
if(!message.content.startsWith(prefix)) return;

const args=message.content.slice(prefix.length).trim().split(/ +/);
const cmd=args.shift().toLowerCase();

try{

// ================= BAN =================
if(cmd==="ban"){

if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;

const member=message.mentions.members.first();
if(!member) return message.reply("حدد عضو.");

await member.ban(); // تنفيذ حقيقي

const e=EMBED("🔨 BAN",
`User: ${member} (${member.id})
Moderator: ${message.author}`);

await message.channel.send({embeds:[e]});
sendLog(message.guild,LOGS.BAN,e);
}

// ================= UNBAN =================
if(cmd==="unban"){

const id=args[0];
if(!id) return;

await message.guild.members.unban(id);

const e=EMBED("✅ UNBAN",
`UserID: ${id}
Moderator: ${message.author}`);

message.channel.send({embeds:[e]});
sendLog(message.guild,LOGS.BAN,e);
}

// ================= TIMEOUT =================
if(cmd==="timeout"){

if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;

const member=message.mentions.members.first();
const duration=parseDuration(args[1]);

if(!member||!duration) return message.reply("اكتب الوقت صح مثل 10m او 30s");

await member.timeout(duration); // تنفيذ مضبوط

const e=EMBED("⏱️ TIMEOUT",
`User: ${member} (${member.id})
Duration: ${args[1]}
Moderator: ${message.author}`);

await message.channel.send({embeds:[e]});
sendLog(message.guild,LOGS.TIME,e);
  }

// ================= UNTIMEOUT =================
if(cmd==="untimeout"){

const member=message.mentions.members.first();
if(!member) return;

await member.timeout(null);

const e=EMBED("✅ UNTIMEOUT",
`User: ${member} (${member.id})
Moderator: ${message.author}`);

message.channel.send({embeds:[e]});
sendLog(message.guild,LOGS.TIME,e);
}

// ================= WARN =================
if(cmd==="warn"){

const member=message.mentions.members.first();
const reason=args.slice(1).join(" ")||"No reason";

if(!member) return;

if(!warns.has(member.id)) warns.set(member.id,[]);
warns.get(member.id).push({
reason:reason,
mod:message.author.tag,
date:new Date().toLocaleString()
});

const e=EMBED("⚠️ WARN ADDED",
`User: ${member}
Reason: ${reason}
Moderator: ${message.author}`);

message.channel.send({embeds:[e]});
sendLog(message.guild,LOGS.WARN,e);
}

// ================= CHECK WARNS =================
if(cmd==="warnings"){

const member=message.mentions.members.first();
if(!member) return;

const list=warns.get(member.id)||[];

if(!list.length){
return message.channel.send({embeds:[EMBED("📋 WARNINGS","لا يوجد تحذيرات.")]});
}

let text="";
list.forEach((w,i)=>{
text+=`#${i+1} | ${w.reason} | ${w.mod} | ${w.date}\n`;
});

message.channel.send({embeds:[EMBED("📋 WARNINGS",text)]});
}

// ================= REMOVE WARN =================
if(cmd==="unwarn"){

const member=message.mentions.members.first();
if(!member||!warns.has(member.id)) return;

warns.get(member.id).pop();

const e=EMBED("✅ WARNING REMOVED",
`User: ${member}
Moderator: ${message.author}`);

message.channel.send({embeds:[e]});
sendLog(message.guild,LOGS.WARN,e);
}

}catch(err){
console.log("ERROR:",err);
}

});

client.once("ready",()=>{
console.log(`🔥 READY AS ${client.user.tag}`);
});

require("./ticketsystem.js")(client);

client.login(process.env.TOKEN);
