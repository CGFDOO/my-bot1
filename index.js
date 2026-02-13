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

const TIMEOUT_LOG="PUT_TIMEOUT_LOG_ID";
const BAN_LOG="PUT_BAN_LOG_ID";

client.once("ready",()=>{
console.log("DEV READY "+client.user.tag);
});

client.on("messageCreate",async message=>{

try{

if(message.author.bot) return;
if(!message.content.startsWith(prefix)) return;

const args=message.content.slice(prefix.length).trim().split(/ +/);
const cmd=args.shift().toLowerCase();

const now=`<t:${Math.floor(Date.now()/1000)}:F>`;

if(cmd==="ban"){

if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
return message.reply("❌ Permission denied.");

const member=message.mentions.members.first();
if(!member) return message.reply("Mention user.");

await member.ban();

const embed=new EmbedBuilder()
.setTitle("🔨 Member Banned")
.addFields(
{name:"User",value:`${member}`,inline:true},
{name:"Moderator",value:`${message.author}`,inline:true},
{name:"Time",value:now}
)
.setColor("Red").setTimestamp();

message.channel.send({embeds:[embed]});

const log=message.guild.channels.cache.get(BAN_LOG);
if(log) log.send({embeds:[embed]});
}

if(cmd==="timeout"){

if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
return message.reply("❌ Permission denied.");

const member=message.mentions.members.first();
if(!member) return message.reply("Mention user.");

let duration=args[1]||"10m";
let ms=600000;

if(duration.endsWith("m")) ms=parseInt(duration)*60000;
if(duration.endsWith("h")) ms=parseInt(duration)*3600000;

await member.timeout(ms);

const embed=new EmbedBuilder()
.setTitle("⏱️ Member Timed Out")
.addFields(
{name:"User",value:`${member}`,inline:true},
{name:"Duration",value:duration,inline:true},
{name:"Moderator",value:`${message.author}`,inline:true},
{name:"Time",value:now}
)
.setColor("Orange").setTimestamp();

message.channel.send({embeds:[embed]});

const log=message.guild.channels.cache.get(TIMEOUT_LOG);
if(log) log.send({embeds:[embed]});
}

if(cmd==="untimeout"){

if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
return message.reply("❌ Permission denied.");

const member=message.mentions.members.first();
if(!member) return message.reply("Mention user.");

await member.timeout(null);

const embed=new EmbedBuilder()
.setTitle("✅ Timeout Removed")
.addFields(
{name:"User",value:`${member}`,inline:true},
{name:"Moderator",value:`${message.author}`,inline:true},
{name:"Time",value:now}
)
.setColor("Green").setTimestamp();

message.channel.send({embeds:[embed]});

const log=message.guild.channels.cache.get(TIMEOUT_LOG);
if(log) log.send({embeds:[embed]});
}

}catch(e){console.log(e);}

});

process.on("unhandledRejection",console.error);
process.on("uncaughtException",console.error);

client.login(process.env.TOKEN);
