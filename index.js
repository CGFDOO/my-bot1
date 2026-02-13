const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = ":";

client.on("ready", () => {
  console.log(`🔥 READY ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ===========================
  // 👿 BAN COMMAND
  // ===========================

  if (command === "ban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("❌ معندكش صلاحية.");

    const user = message.mentions.members.first();
    if (!user) return message.reply("❌ منشن الشخص.");

    const reason = args.slice(1).join(" ") || "No reason";

    await user.ban({ reason });

    const embed = new EmbedBuilder()
      .setColor("#000000")
      .setTitle("🔨 تم تنفيذ بان")
      .addFields(
        { name: "👤 العضو", value: `${user}`, inline: true },
        { name: "🛡️ الإداري", value: `${message.member}`, inline: true },
        { name: "📄 السبب", value: reason }
      )
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // ===========================
  // 👿 TIMEOUT COMMAND
  // ===========================

  if (command === "time") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ معندكش صلاحية.");

    const user = message.mentions.members.first();
    if (!user) return message.reply("❌ منشن الشخص.");

    const minutes = args[1];
    if (!minutes) return message.reply("❌ حدد الوقت بالدقايق.");

    const reason = args.slice(2).join(" ") || "No reason";

    await user.timeout(minutes * 60 * 1000, reason);

    const embed = new EmbedBuilder()
      .setColor("#000000")
      .setTitle("⏱️ تم إعطاء تايم")
      .addFields(
        { name: "👤 العضو", value: `${user}`, inline: true },
        { name: "🛡️ الإداري", value: `${message.member}`, inline: true },
        { name: "⏰ المدة", value: `${minutes} دقيقة`, inline: true },
        { name: "📄 السبب", value: reason }
      )
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

});

client.login("PUT_TOKEN_HERE");
