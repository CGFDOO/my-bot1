const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require('discord.js');
require('dotenv').config();

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
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {

  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ================= TEST =================
  if (command === "test") {

    const embed = new EmbedBuilder()
      .setTitle("✅ Bot Status")
      .setDescription("The bot is running successfully.")
      .setColor("Green")
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }

  // ================= BAN =================
  if (command === "ban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply("❌ You do not have permission.");
    }

    const member = message.mentions.members.first();
    if (!member) return message.reply("Please mention a user.");

    await member.ban();

    const embed = new EmbedBuilder()
      .setTitle("🔨 Member Banned")
      .setDescription(`
User: ${member}
User ID: ${member.id}
Moderator: ${message.author}
`)
      .setColor("Red")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // ================= TIMEOUT =================
  if (command === "timeout") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply("❌ You do not have permission.");
    }

    const member = message.mentions.members.first();
    if (!member) return message.reply("Please mention a user.");

    const time = args[1] || "10m";

    let ms = 600000;

    if (time.endsWith("m")) ms = parseInt(time) * 60000;
    if (time.endsWith("h")) ms = parseInt(time) * 3600000;

    await member.timeout(ms);

    const embed = new EmbedBuilder()
      .setTitle("⏱️ Member Timed Out")
      .setDescription(`
User: ${member}
Duration: ${time}
Moderator: ${message.author}
`)
      .setColor("Orange")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // ================= UNTIMEOUT =================
  if (command === "untimeout") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply("❌ You do not have permission.");
    }

    const member = message.mentions.members.first();
    if (!member) return message.reply("Please mention a user.");

    await member.timeout(null);

    const embed = new EmbedBuilder()
      .setTitle("✅ Timeout Removed")
      .setDescription(`
User: ${member}
Moderator: ${message.author}
`)
      .setColor("Green")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

});

client.login(process.env.TOKEN);
