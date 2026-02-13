const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField } = require("discord.js");
require("dotenv").config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const prefix = ":";

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async message => {

  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ================= BAN =================
  if (command === "ban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("❌ You do not have permission.");

    const member = message.mentions.members.first();
    if (!member) return message.reply("❌ Please mention a user.");

    const reason = args.slice(1).join(" ") || "No reason provided";

    await member.ban({ reason });

    const embed = new EmbedBuilder()
      .setTitle("🔨 User Banned")
      .setDescription(`
User: ${member}
User ID: ${member.id}
Moderator: ${message.author}
Reason: ${reason}
`)
      .setColor("Red")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // ================= UNBAN =================
  if (command === "unban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("❌ You do not have permission.");

    const id = args[0];
    if (!id) return message.reply("❌ Provide user ID.");

    await message.guild.members.unban(id);

    const embed = new EmbedBuilder()
      .setTitle("✅ User Unbanned")
      .setDescription(`
User ID: ${id}
Moderator: ${message.author}
`)
      .setColor("Green")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // ================= TIMEOUT =================
  if (command === "timeout") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ You do not have permission.");

    const member = message.mentions.members.first();
    if (!member) return message.reply("❌ Please mention a user.");

    const time = args[1];
    if (!time) return message.reply("❌ Provide time in ms.");

    const reason = args.slice(2).join(" ") || "No reason provided";

    await member.timeout(parseInt(time), reason);

    const embed = new EmbedBuilder()
      .setTitle("⏱️ User Timed Out")
      .setDescription(`
User: ${member}
User ID: ${member.id}
Moderator: ${message.author}
Duration: ${time}
Reason: ${reason}
`)
      .setColor("Orange")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // ================= UNTIMEOUT =================
  if (command === "untimeout") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ You do not have permission.");

    const member = message.mentions.members.first();
    if (!member) return message.reply("❌ Please mention a user.");

    await member.timeout(null);

    const embed = new EmbedBuilder()
      .setTitle("✅ Timeout Removed")
      .setDescription(`
User: ${member}
User ID: ${member.id}
Moderator: ${message.author}
`)
      .setColor("Green")
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

});

client.login(process.env.TOKEN);
