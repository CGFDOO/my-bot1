const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', message => {

  if (message.author.bot) return;

  // 🔥 امر تجربة
  if (message.content === '!ping') {
    message.reply('pong 🏓');
  }

  // 🔥 امر الباند
  if (message.content.startsWith('!ban')) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply('❌ معندكش صلاحية الباند');
    }

    const member = message.mentions.members.first();
    if (!member) return message.reply('⚠️ لازم تمنشن الشخص');

    const reason = message.content.split(' ').slice(2).join(' ') || 'بدون سبب';

    member.ban({ reason: reason })
      .then(() => {
        message.channel.send(`🔥 تم باند ${member.user.tag}
👮 بواسطة: ${message.author.tag}
📌 السبب: ${reason}`);
      })
      .catch(() => {
        message.reply('❌ فشل الباند (تأكد رتبة البوت أعلى)');
      });
  }

  // 🔥 امر فك الباند
  if (message.content.startsWith('!unban')) {

    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply('❌ معندكش صلاحية فك الباند');
    }

    const args = message.content.split(' ');
    const userId = args[1];

    if (!userId) return message.reply('⚠️ اكتب ايدي الشخص');

    message.guild.members.unban(userId)
      .then(() => {
        message.channel.send(`✅ تم فك الباند عن ID: ${userId}
👮 بواسطة: ${message.author.tag}`);
      })
      .catch(() => {
        message.reply('❌ معرفتش افك الباند');
      });
  }

});

client.login(process.env.TOKEN);
