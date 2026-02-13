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

// ===== LOG CHANNEL IDS =====
const LOG_TIMEOUT="1454451180976603339";
const LOG_BAN="1454448586145398827";
const LOG_WARN="1472007035842334752";

const embedStyle=(title,desc)=>new EmbedBuilder()
.setColor("#000000")
.setTitle(title)
.setDescription(desc)
.setTimestamp();

client.on("ready",()=>console.log(`READY ${client.user.tag}`));

client.on("messageCreate",async message=>{

if(message.author.bot||!message.content.startsWith(prefix))return;

const args=message.content.slice(prefix.length).trim().split(/ +/);
const cmd=args.shift().toLowerCase();

const sendLog=async(id,embed)=>{
const ch=message.guild.channels.cache.get(id);
if(ch)ch.send({embeds:[embed]}).catch(()=>{});
};

// ===== BAN =====
if(cmd==="ban"){
if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))return;

const member=message.mentions.members.first();
if(!member)return;

const reason=args.slice(1).join(" ")||"No reason provided";

try{
await member.ban({reason});

const emb=embedStyle("🔨 Ban Executed",
`User: ${member}
Moderator: ${message.author}
Reason: ${reason}`);

message.channel.send({embeds:[emb]});
sendLog(LOG_BAN,emb);

}catch{}
}

// ===== UNBAN =====
if(cmd==="unban"){
if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))return;

const id=args[0];
if(!id)return;

try{
await message.guild.members.unban(id);

const emb=embedStyle("✅ Unban Executed",
`User ID: ${id}
Moderator: ${message.author}`);

message.channel.send({embeds:[emb]});
sendLog(LOG_BAN,emb);

}catch{}
}

// ===== TIMEOUT =====
if(cmd==="timeout"){
if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))return;

const member=message.mentions.members.first();
const time=args[1];
if(!member||!time)return;

const reason=args.slice(2).join(" ")||"No reason provided";

try{
await member.timeout(parseInt(time),reason);

const emb=embedStyle("⏱ Timeout Applied",
`User: ${member}
Moderator: ${message.author}
Duration: ${time}
Reason: ${reason}`);

message.channel.send({embeds:[emb]});
sendLog(LOG_TIMEOUT,emb);

}catch{}
}

// ===== UNTIMEOUT =====
if(cmd==="untimeout"){
if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))return;

const member=message.mentions.members.first();
if(!member)return;

try{
await member.timeout(null);

const emb=embedStyle("⚡ Timeout Removed",
`User: ${member}
Moderator: ${message.author}`);

message.channel.send({embeds:[emb]});
sendLog(LOG_TIMEOUT,emb);

}catch{}
}

// ===== WARN =====
if(cmd==="warn"){
const member=message.mentions.members.first();
if(!member)return;

const reason=args.slice(1).join(" ")||"No reason provided";

const emb=embedStyle("⚠ Warning Issued",
`User: ${member}
Moderator: ${message.author}
Reason: ${reason}`);

message.channel.send({embeds:[emb]});
sendLog(LOG_WARN,emb);
}

// ===== UNWARN =====
if(cmd==="unwarn"){
const member=message.mentions.members.first();
if(!member)return;

const emb=embedStyle("✅ Warning Removed",
`User: ${member}
Moderator: ${message.author}`);

message.channel.send({embeds:[emb]});
sendLog(LOG_WARN,emb);
}

});

client.login(process.env.TOKEN);
