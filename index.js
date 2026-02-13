const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const ms = require('ms');

const prefix = ":";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`🔥 Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {

  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // 🔥 ping
  if (command === "ping") {
    return message.reply("pong 🏓");
  }

  // 🔥 BAN
  if (command === "ban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("❌ معندكش صلاحية");

    const member = message.mentions.members.first();
    if (!member) return message.reply("⚠️ منشن الشخص");

    const reason = args.slice(1).join(" ") || "بدون سبب";

    try {
      await member.ban({ reason });
      message.channel.send(`🔥 تم باند ${member.user.tag}
👮 بواسطة: ${message.author.tag}
📌 السبب: ${reason}`);
    } catch {
      message.reply("❌ فشل الباند (تأكد رتبة البوت)");
    }
  }

  // 🔥 UNBAN
  if (command === "unban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("❌ معندكش صلاحية");

    const userId = args[0];
    if (!userId) return message.reply("⚠️ اكتب ID");

    try {
      await message.guild.members.unban(userId);
      message.channel.send(`✅ تم فك الباند عن ${userId}
👮 بواسطة: ${message.author.tag}`);
    } catch {
      message.reply("❌ معرفتش افك الباند");
    }
  }

  // 🔥 TIMEOUT
  if (command === "timeout") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ معندكش صلاحية");

    const member = message.mentions.members.first();
    const time = args[1];

    if (!member) return message.reply("⚠️ منشن الشخص");
    if (!time) return message.reply("⚠️ حدد الوقت مثال 10m");

    const reason = args.slice(2).join(" ") || "بدون سبب";

    try {
      await member.timeout(ms(time), reason);
      message.channel.send(`⏱️ تم تايم اوت ${member.user.tag}
⌛ المدة: ${time}
📌 السبب: ${reason}`);
    } catch {
      message.reply("❌ فشل التايم اوت");
    }
  }

  // 🔥 UNTIMEOUT
  if (command === "untimeout") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ معندكش صلاحية");

    const member = message.mentions.members.first();
    if (!member) return message.reply("⚠️ منشن الشخص");

    try {
      await member.timeout(null);
      message.channel.send(`✅ تم فك التايم اوت عن ${member.user.tag}`);
    } catch {
      message.reply("❌ فشل فك التايم");
    }
  }

});

client.login(process.env.TOKEN);
