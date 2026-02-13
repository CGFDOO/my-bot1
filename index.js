const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const prefix = ":"; // البريفكس الجديد

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ================= BAN =================
  if (command === "ban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("❌ You do not have permission.");

    const member = message.mentions.members.first();
    if (!member) return message.reply("حدد الشخص بالمنشن.");

    const reason = args.join(" ") || "No reason provided";

    await member.ban({ reason });

    const embed = new EmbedBuilder()
      .setTitle("🔨 Member Banned")
      .setDescription(
`User: ${member}
User ID: ${member.id}
Moderator: ${message.author}
Reason: ${reason}`
      )
      .setColor("Red")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // ================= UNBAN =================
  if (command === "unban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("❌ You do not have permission.");

    const userId = args[0];
    if (!userId) return message.reply("حط الايدي.");

    await message.guild.members.unban(userId);

    const embed = new EmbedBuilder()
      .setTitle("✅ Member Unbanned")
      .setDescription(
`User ID: ${userId}
Moderator: ${message.author}`
      )
      .setColor("Green")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
    // ================= TIMEOUT =================
  if (command === "timeout") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ You do not have permission.");

    const member = message.mentions.members.first();
    if (!member) return message.reply("حدد الشخص بالمنشن.");

    const time = args[1];
    if (!time) return message.reply("حدد الوقت بالملي ثانية.");

    const reason = args.slice(2).join(" ") || "No reason provided";

    await member.timeout(parseInt(time), reason);

    const embed = new EmbedBuilder()
      .setTitle("⏳ Member Timed Out")
      .setDescription(
`User: ${member}
User ID: ${member.id}
Moderator: ${message.author}
Duration: ${time} ms
Reason: ${reason}`
      )
      .setColor("Orange")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // ================= UNTIMEOUT =================
  if (command === "untimeout") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ You do not have permission.");

    const member = message.mentions.members.first();
    if (!member) return message.reply("حدد الشخص بالمنشن.");

    await member.timeout(null);

    const embed = new EmbedBuilder()
      .setTitle("✅ Timeout Removed")
      .setDescription(
`User: ${member}
User ID: ${member.id}
Moderator: ${message.author}`
      )
      .setColor("Green")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

});
client.login(process.env.TOKEN);
  }
