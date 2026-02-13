const {Client,GatewayIntentBits,EmbedBuilder,PermissionsBitField}=require("discord.js");
require("dotenv").config();

const client=new Client({
intents:[
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildMembers
]});

const prefix=":";

// ضع ID روم اللوق هنا
const LOG_CHANNEL="1454451180976603339";

client.once("ready",()=>{
console.log(`READY ${client.user.tag}`);
});

async function sendLog(guild,embed){
const log=guild.channels.cache.get(LOG_CHANNEL);
if(log) log.send({embeds:[embed]}).catch(()=>{});
}

client.on("messageCreate",async message=>{

try{

if(message.author.bot) return;
if(!message.content.startsWith(prefix)) return;

const args=message.content.slice(prefix.length).trim().split(/ +/);
const cmd=args.shift().toLowerCase();

const member=message.mentions.members.first();
const now=`<t:${Math.floor(Date.now()/1000)}:F>`;

if(cmd==="timeout"){

if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
return message.reply("❌ You lack permission.");

if(!member) return message.reply("❌ Mention a valid user.");

let duration=args[1]||"10m";
let ms=600000;

if(duration.endsWith("m")) ms=parseInt(duration)*60000;
if(duration.endsWith("h")) ms=parseInt(duration)*3600000;

await member.timeout(ms).catch(()=>null);

// تحقق هل فعلاً اتعمل
const updated=await message.guild.members.fetch(member.id);
if(!updated.communicationDisabledUntil)
return message.reply("❌ Timeout failed.");

const embed=new EmbedBuilder()
.setTitle("⏱️ Timeout Applied")
.addFields(
{name:"User",value:`${member}`,inline:true},
{name:"Moderator",value:`${message.author}`,inline:true},
{name:"Duration",value:duration,inline:true},
{name:"Time",value:now}
)
.setColor("Orange").setTimestamp();

message.channel.send({embeds:[embed]});
sendLog(message.guild,embed);
}

if(cmd==="untimeout"){

if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
return message.reply("❌ You lack permission.");

if(!member) return message.reply("❌ Mention user.");

await member.timeout(null).catch(()=>null);

// تحقق هل فعلاً اتفك
const updated=await message.guild.members.fetch(member.id);
if(updated.communicationDisabledUntil)
return message.reply("❌ Failed to remove timeout.");

const embed=new EmbedBuilder()
.setTitle("✅ Timeout Removed")
.addFields(
{name:"User",value:`${member}`,inline:true},
{name:"Moderator",value:`${message.author}`,inline:true},
{name:"Time",value:now}
)
.setColor("Green").setTimestamp();

message.channel.send({embeds:[embed]});
sendLog(message.guild,embed);
}

if(cmd==="ban"){

if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
return message.reply("❌ You lack permission.");

if(!member) return message.reply("❌ Mention user.");

await member.ban().catch(()=>null);

// تحقق فعلي
const banned=await message.guild.bans.fetch(member.id).catch(()=>null);
if(!banned) return message.reply("❌ Ban failed.");

const embed=new EmbedBuilder()
.setTitle("🔨 Member Banned")
.addFields(
{name:"User",value:`${member}`,inline:true},
{name:"Moderator",value:`${message.author}`,inline:true},
{name:"Time",value:now}
)
.setColor("Red").setTimestamp();

message.channel.send({embeds:[embed]});
sendLog(message.guild,embed);
}

}catch(e){console.log(e);}

});

process.on("unhandledRejection",console.error);
process.on("uncaughtException",console.error);

client.login(process.env.TOKEN);
