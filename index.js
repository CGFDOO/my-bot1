const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require('discord.js');
const ms = require('ms');

const prefix = "!";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {

  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // ================= BAN =================
  if (command === "ban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("❌ You do not have permission to use this command.");

    const user = message.mentions.members.first();
    if (!user) return message.reply("❌ Please mention a user.");

    const reason = args.slice(1).join(" ") || "No reason provided.";

    await user.ban({ reason });

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("🔨 Member Banned")
      .setDescription(`A member has been permanently banned from the server.`)
      .addFields(
        { name: "User", value: `${user} (${user.id})` },
        { name: "Moderator", value: `${message.author}` },
        { name: "Reason", value: reason }
      )
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // ================= UNBAN =================
  if (command === "unban") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers))
      return message.reply("❌ You do not have permission.");

    const userID = args[0];
    if (!userID) return message.reply("❌ Provide user ID.");

    await message.guild.members.unban(userID);

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("✅ Member Unbanned")
      .addFields(
        { name: "User ID", value: userID },
        { name: "Moderator", value: `${message.author}` }
      )
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // ================= TIMEOUT =================
  if (command === "timeout") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ You do not have permission.");

    const user = message.mentions.members.first();
    const time = args[1];
    const reason = args.slice(2).join(" ") || "No reason provided.";

    if (!user) return message.reply("❌ Mention a user.");
    if (!time) return message.reply("❌ Provide time (ex: 10m).");

    await user.timeout(ms(time), reason);

    const embed = new EmbedBuilder()
      .setColor("Orange")
      .setTitle("⏳ Member Timed Out")
      .addFields(
        { name: "User", value: `${user} (${user.id})` },
        { name: "Duration", value: time },
        { name: "Moderator", value: `${message.author}` },
        { name: "Reason", value: reason }
      )
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

  // ================= UNTIMEOUT =================
  if (command === "untimeout") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers))
      return message.reply("❌ You do not have permission.");

    const user = message.mentions.members.first();
    if (!user) return message.reply("❌ Mention a user.");

    await user.timeout(null);

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("✅ Timeout Removed")
      .addFields(
        { name: "User", value: `${user} (${user.id})` },
        { name: "Moderator", value: `${message.author}` }
      )
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }

});

client.login(process.env.TOKEN);
