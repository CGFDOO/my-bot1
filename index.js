const {Client,GatewayIntentBits,EmbedBuilder,PermissionsBitField}=require("discord.js");
require("dotenv").config();

const client=new Client({
 intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildMembers]
});

const prefix=":";

// ===== حط آيدي رومات اللوج =====
const LOGS={
 BAN:"1454448586145398827",
 TIME:"1454451180976603339",
 WARN:"1472007035842334752"
};

const warns=new Map();

const EMBED=(t,d)=>new EmbedBuilder()
.setColor("#000000")
.setTitle(t)
.setDescription(d)
.setTimestamp();

const sendLog=(guild,id,e)=>{
 const ch=guild.channels.cache.get(id);
 if(ch) ch.send({embeds:[e]}).catch(()=>{});
};

client.once("ready",()=>console.log(`READY ${client.user.tag}`));

client.on("messageCreate",async message=>{
 if(message.author.bot||!message.content.startsWith(prefix))return;

 const args=message.content.slice(prefix.length).trim().split(/ +/);
 const cmd=args.shift().toLowerCase();

 try{

// ===== BAN =====
if(cmd==="ban"){
 if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))return;

 const member=message.mentions.members.first();
 if(!member)return;

 if(member.roles.highest.position>=message.member.roles.highest.position)
 return message.reply("❌ Role hierarchy.");

 const reason=args.slice(1).join(" ")||"No reason";

 await member.ban({reason});
 const check=await message.guild.bans.fetch(member.id).catch(()=>null);
 if(!check)return message.reply("❌ Ban failed.");

 const e=EMBED("🔨 BAN EXECUTED",
`User: ${member} (${member.id})
Moderator: ${message.author}
Reason: ${reason}
Time: <t:${Math.floor(Date.now()/1000)}:F>`);

 message.channel.send({embeds:[e]});
 sendLog(message.guild,LOGS.BAN,e);
}

// ===== UNBAN =====
if(cmd==="unban"){
 if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))return;

 const id=args[0]; if(!id)return;

 await message.guild.members.unban(id).catch(()=>{});
 const still=await message.guild.bans.fetch(id).catch(()=>null);
 if(still)return message.reply("❌ Unban failed.");

 const e=EMBED("✅ UNBAN EXECUTED",
`User ID: ${id}
Moderator: ${message.author}
Time: <t:${Math.floor(Date.now()/1000)}:F>`);

 message.channel.send({embeds:[e]});
 sendLog(message.guild,LOGS.BAN,e);
}

// ===== TIMEOUT =====
if(cmd==="timeout"){
 if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))return;

 const member=message.mentions.members.first();
 const time=parseInt(args[1]);
 if(!member||!time)return;

 if(member.roles.highest.position>=message.member.roles.highest.position)
 return message.reply("❌ Role hierarchy.");

 const reason=args.slice(2).join(" ")||"No reason";

 await member.timeout(time,reason);
 await member.fetch();

 if(!member.communicationDisabledUntilTimestamp)
 return message.reply("❌ Timeout failed.");

 const e=EMBED("⏱️ TIMEOUT APPLIED",
`User: ${member} (${member.id})
Moderator: ${message.author}
Duration: ${time}ms
Reason: ${reason}
Time: <t:${Math.floor(Date.now()/1000)}:F>`);

 message.channel.send({embeds:[e]});
 sendLog(message.guild,LOGS.TIME,e);
}

// ===== UNTIMEOUT =====
if(cmd==="untimeout"){
 if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))return;

 const member=message.mentions.members.first();
 if(!member)return;

 await member.timeout(null);
 await member.fetch();

 if(member.communicationDisabledUntilTimestamp)
 return message.reply("❌ Remove failed.");

 const e=EMBED("✅ TIMEOUT REMOVED",
`User: ${member} (${member.id})
Moderator: ${message.author}
Time: <t:${Math.floor(Date.now()/1000)}:F>`);

 message.channel.send({embeds:[e]});
 }

// ===== WARN =====
if(cmd==="warn"){
 const member=message.mentions.members.first();
 if(!member)return;

 const reason=args.slice(1).join(" ")||"No reason";
 if(!warns.has(member.id))warns.set(member.id,[]);
 warns.get(member.id).push(reason);

 const e=EMBED("⚠️ WARNING ADDED",
`User: ${member} (${member.id})
Moderator: ${message.author}
Reason: ${reason}
Total Warns: ${warns.get(member.id).length}`);

 message.channel.send({embeds:[e]});
 sendLog(message.guild,LOGS.WARN,e);
}

// ===== UNWARN =====
if(cmd==="-unwarn"){
 const member=message.mentions.members.first();
 if(!member||!warns.has(member.id))return;

 warns.get(member.id).pop();

 const e=EMBED("✅ WARNING REMOVED",
`User: ${member} (${member.id})
Moderator: ${message.author}`);

 message.channel.send({embeds:[e]});
 sendLog(message.guild,LOGS.WARN,e);
}

}catch(err){console.log(err);}
});

client.login(process.env.TOKEN);
