const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require("discord.js");
const ms = require("ms");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const prefix = ":";

client.once("ready", () => {
  console.log(`🔥 READY ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

if (message.author.bot) return;
if (!message.content.startsWith(prefix)) return;

const args = message.content.slice(prefix.length).trim().split(/ +/);
const command = args.shift().toLowerCase();

/*
=================
BAN SYSTEM
:ban @user reason
=================
*/

if (command === "ban") {

if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
return message.reply("❌ ليس لديك صلاحية.");

const member = message.mentions.members.first();
if (!member) return message.reply("❌ منشن الشخص.");

const reason = args.join(" ") || "No reason provided";

await member.ban({ reason });

const embed = new EmbedBuilder()
.setTitle("🚨 | MODERATION ACTION - BAN")
.setColor("Black")
.setDescription(`
🔨 **تم تنفيذ عقوبة BAN**

👤 العضو: ${member}  
🆔 ID: ${member.id}  

🛡️ الإداري: ${message.author}  
🆔 ID: ${message.author.id}  

📄 السبب: ${reason}

━━━━━━━━━━━━━━━━━━
🔥 نظام حماية متقدم
`)
.setThumbnail(member.user.displayAvatarURL())
.setFooter({ text: `Server Protection System` })
.setTimestamp();

message.channel.send({ content:`${member} ${message.author}`, embeds:[embed] });

}

/*
=================
TIMEOUT SYSTEM
:timeout @user 10m reason
=================
*/

if (command === "timeout") {

if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
return message.reply("❌ ليس لديك صلاحية.");

const member = message.mentions.members.first();
if (!member) return message.reply("❌ منشن الشخص.");

const duration = args[0];
const reason = args.slice(1).join(" ") || "No reason";

await member.timeout(ms(duration), reason);

const embed = new EmbedBuilder()
.setTitle("⏱️ | MODERATION ACTION - TIMEOUT")
.setColor("Black")
.setDescription(`
🚫 **تم إعطاء تايم اوت**

👤 العضو: ${member}  
🆔 ID: ${member.id}  

🛡️ الإداري: ${message.author}  
🆔 ID: ${message.author.id}  

⏰ المدة: ${duration}
📄 السبب: ${reason}

━━━━━━━━━━━━━━━━━━
🔥 نظام العقوبات الاحترافي
`)
.setThumbnail(member.user.displayAvatarURL())
.setTimestamp();

message.channel.send({ content:`${member} ${message.author}`, embeds:[embed] });

}

/*
=================
UN TIMEOUT
:untimeout @user
=================
*/

if (command === "untimeout") {

if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
return message.reply("❌ ليس لديك صلاحية.");

const member = message.mentions.members.first();
if (!member) return message.reply("❌ منشن الشخص.");

await member.timeout(null);

const embed = new EmbedBuilder()
.setTitle("✅ | TIMEOUT REMOVED")
.setColor("Black")
.setDescription(`
🟢 تم إزالة التايم اوت

👤 العضو: ${member}
🛡️ الإداري: ${message.author}

🔥 النظام يعمل بنجاح
`)
.setTimestamp();

message.channel.send({ content:`${member} ${message.author}`, embeds:[embed] });

}

});

client.login("PUT_YOUR_TOKEN_HERE");
