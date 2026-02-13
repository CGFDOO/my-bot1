const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require("discord.js");
require("dotenv").config();

const client = new Client({
 intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildMembers]
});

const prefix=":";

// ===== حط آيدي رومات اللوج هنا =====
const LOGS={
 BAN:"1454448586145398827",
 TIME:"1454451180976603339",
 WARN:"1472007035842334752"
};

const warns=new Map();

const embed=(title,desc)=> new EmbedBuilder()
 .setColor("#000000")
 .setTitle(title)
 .setDescription(desc)
 .setTimestamp();

client.once("ready",()=>console.log(`Online ${client.user.tag}`));

client.on("messageCreate",async message=>{
 if(message.author.bot||!message.content.startsWith(prefix)) return;

 const args=message.content.slice(prefix.length).trim().split(/ +/);
 const cmd=args.shift().toLowerCase();
 const logSend=(id,e)=> message.guild.channels.cache.get(id)?.send({embeds:[e]});

 try{

// ===== BAN =====
if(cmd==="ban"){
 if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
 const member=message.mentions.members.first(); if(!member) return;

 const reason=args.slice(1).join(" ")||"No reason provided";

 await member.ban({reason});
 const check=await message.guild.bans.fetch(member.id).catch(()=>null);
 if(!check) return message.reply("❌ Ban failed.");

 const e=embed("🔨 Ban Executed",
`User: ${member}\nID: ${member.id}\nModerator: ${message.author}\nReason: ${reason}`);
 message.channel.send({embeds:[e]});
 logSend(LOGS.BAN,e);
}

// ===== UNBAN =====
if(cmd==="unban"){
 if(!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return;
 const id=args[0]; if(!id) return;

 await message.guild.members.unban(id);
 const e=embed("✅ Unban Executed",
`User ID: ${id}\nModerator: ${message.author}`);
 message.channel.send({embeds:[e]});
 logSend(LOGS.BAN,e);
}

// ===== TIMEOUT =====
if(cmd==="timeout"){
 if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;
 const member=message.mentions.members.first(); if(!member) return;
 const time=parseInt(args[1]); if(!time) return;
 const reason=args.slice(2).join(" ")||"No reason provided";

 await member.timeout(time,reason);
 await member.fetch();
 if(!member.communicationDisabledUntilTimestamp) return message.reply("❌ Timeout failed.");

 const e=embed("⏱️ Timeout Applied",
`User: ${member}\nID: ${member.id}\nModerator: ${message.author}\nDuration: ${time}ms\nReason: ${reason}`);
 message.channel.send({embeds:[e]});
 logSend(LOGS.TIME,e);
}

// ===== UNTIMEOUT =====
if(cmd==="untimeout"){
 if(!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return;
 const member=message.mentions.members.first(); if(!member) return;

 await member.timeout(null);
 await member.fetch();
 if(member.communicationDisabledUntilTimestamp) return message.reply("❌ Remove failed.");

 const e=embed("✅ Timeout Removed",
`User: ${member}\nID: ${member.id}\nModerator: ${message.author}`);
 message.channel.send({embeds:[e]});
 logSend(LOGS.TIME,e);
}

// ===== WARN =====
if(cmd==="warn"){
 const member=message.mentions.members.first(); if(!member) return;
 const reason=args.slice(1).join(" ")||"No reason";
 if(!warns.has(member.id)) warns.set(member.id,[]);
 warns.get(member.id).push(reason);

 const e=embed("⚠️ Warning Added",
`User: ${member}\nModerator: ${message.author}\nReason: ${reason}\nTotal Warns: ${warns.get(member.id).length}`);
 message.channel.send({embeds:[e]});
 logSend(LOGS.WARN,e);
}

// ===== UNWARN =====
if(cmd==="-unwarn"){
 const member=message.mentions.members.first(); if(!member) return;
 if(!warns.has(member.id)||warns.get(member.id).length===0) return;

 warns.get(member.id).pop();
 const e=embed("✅ Warning Removed",
`User: ${member}\nModerator: ${message.author}`);
 message.channel.send({embeds:[e]});
 logSend(LOGS.WARN,e);
}

 }catch(err){ console.log(err); }
});

client.login(process.env.TOKEN);
