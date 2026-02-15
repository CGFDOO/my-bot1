// ticketsystem.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle, ModalBuilder } = require('discord.js');

module.exports = (client) => {

  ////////////////////////////////////////////////
  //////////////// CONFIG ////////////////////////
  ////////////////////////////////////////////////

  const CATEGORY_ID = "1453943996392013901"; // كاتيجوري التكتات
  const LOG_CHANNEL = "1453948413963141153"; // لوق التكتات
  const MEDIATOR_RATING_CHANNEL = "1472439331443441828"; // تقييم الوسطاء
  const ADMIN_RATING_CHANNEL = "1472023428658630686"; // تقييم الادارة
  const TRANSCRIPT_CHANNEL = "1472218573710823679"; // التران سكربت
  const STAFF_ROLE = "1454199885460144189"; // رتبة الإدارة الصغرى
  const ADMIN_ROLE = "1453946893053726830"; // رتبة الإدارة العليا

  let ticketCounter = 346; // تبدأ التكتات من رقم 346
  let openTickets = {}; // لتتبع التكتات المفتوحة
  let mediatorRatings = {};
  let adminRatings = {};

  ////////////////////////////////////////////////
  //////////////// CREATE TICKET //////////////////
  ////////////////////////////////////////////////

  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const userId = interaction.user.id;

    // منع فتح أكثر من تكت في نفس الوقت
    if (Object.values(openTickets).some(t => t.userId === userId)) {
      return interaction.reply({ content: "❌ **You already have an open ticket**", ephemeral: true });
    }

    // إنشاء تكت جديد
    if (interaction.customId.startsWith("open_ticket_")) {
      ticketCounter++;
      const ticketNumber = ticketCounter;
      const channelName = `ticket-${ticketNumber}-${interaction.user.username}`.toLowerCase();

      const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        type: 0, // GUILD_TEXT
        parent: CATEGORY_ID,
        permissionOverwrites: [
          { id: interaction.guild.roles.everyone, deny: ['ViewChannel'] },
          { id: userId, allow: ['ViewChannel', 'SendMessages'] },
          { id: STAFF_ROLE, allow: ['ViewChannel', 'SendMessages'] }
        ]
      });

      openTickets[ticketChannel.id] = { userId, ticketNumber };

      // إرسال الإيمبد الأساسي
      const mainEmbed = new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle(`🎫 Ticket #${ticketNumber}`)
        .setDescription(`حياك الله <@${userId}>!\nPlease choose a ticket type.`);

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId("support").setLabel("💬 Support").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("gift").setLabel("🎁 Gift").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("mediator").setLabel("⚖️ Mediator").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("content").setLabel("🎨 Content Creator").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("complaint").setLabel("❌ Admin Complaint").setStyle(ButtonStyle.Danger)
        );

      await ticketChannel.send({ content: `<@${userId}>`, embeds: [mainEmbed], components: [row] });

      await interaction.reply({ content: `✅ **Ticket created: <#${ticketChannel.id}>**`, ephemeral: true });
    }

    ////////////////////////////////////////////////
    //////////////// CLAIM TICKET //////////////////
    ////////////////////////////////////////////////

    if (interaction.customId === "claim_ticket") {
      const ticket = openTickets[interaction.channel.id];
      if (!ticket) return;

      // اخفاء الإدارة العادية
      interaction.channel.permissionOverwrites.edit(STAFF_ROLE, { ViewChannel: false });

      await interaction.update({ content: `✅ **Ticket claimed by <@${userId}>**` });
      const logChannel = client.channels.cache.get(LOG_CHANNEL);
      if (logChannel) logChannel.send(`✅ Ticket #${ticket.ticketNumber} claimed by <@${userId}>`);
    }

    ////////////////////////////////////////////////
    //////////////// CLOSE TICKET //////////////////
    ////////////////////////////////////////////////

    if (interaction.customId === "close_ticket") {
      const ticket = openTickets[interaction.channel.id];
      if (!ticket) return;

      // تحقق بخطوتين
      await interaction.reply({ content: "Are you sure you want to close this ticket? / هل أنت متأكد؟", ephemeral: true });

      // مباشرة غلق التكت بعد تأكيد (يمكن تعديل للتفاعل مع زراير confirm/cancel)
      setTimeout(async () => {
        await interaction.channel.delete().catch(console.error);
        delete openTickets[interaction.channel.id];

        const logChannel = client.channels.cache.get(LOG_CHANNEL);
        if (logChannel) logChannel.send(`🗑️ Ticket #${ticket.ticketNumber} closed by <@${userId}>`);
      }, 3000);
    }

    ////////////////////////////////////////////////
    //////////////// MEDIATOR TICKET //////////////
    ////////////////////////////////////////////////

    if (interaction.customId === "mediator") {
      const ticket = openTickets[interaction.channel.id];
      if (!ticket) return;

      const mediatorEmbed = new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle("⚖️ Mediator Request")
        .setDescription(
          `هذا القسم مخصص لطلب الوسيط لعملية تريد داخل السيرفر\n` +
          "・تأكد أن الطرف الاخر جاهز\n" +
          "・رجاء عدم فتح اكثر من تذكرة\n" +
          "・تحقق من درجة الوسيط\n" +
          "・اكتب المعلومات المطلوبة بدقة"
        );

      await interaction.channel.send({ embeds: [mediatorEmbed] });
    }

    ////////////////////////////////////////////////
    //////////////// ADMIN RATING //////////////////
    ////////////////////////////////////////////////

    if (interaction.customId.startsWith("admin_")) {
      const [_, rating, ticketNumber] = interaction.customId.split("_");
      if (!adminRatings[ticketNumber]) adminRatings[ticketNumber] = [];
      if (adminRatings[ticketNumber].includes(userId)) {
        return interaction.reply({ content: "❌ You already rated this admin", ephemeral: true });
      }
      adminRatings[ticketNumber].push(userId);

      await interaction.reply({ content: `✅ Thank you for rating the admin (${rating}⭐)`, ephemeral: true });

      const adminRoom = client.channels.cache.get(ADMIN_RATING_CHANNEL);
      if (adminRoom) {
        const resultEmbed = new EmbedBuilder()
          .setColor("#ffffff")
          .setTitle("⭐ Admin Rating Result")
          .setDescription(`User: <@${userId}>\nRating: ${rating}⭐\nTicket: #${ticketNumber}`);
        adminRoom.send({ embeds: [resultEmbed] });
      }
    }

    ////////////////////////////////////////////////
    //////////////// MEDIATOR RATING //////////////
    ////////////////////////////////////////////////

    if (interaction.customId.startsWith("mediator_")) {
      const [_, rating, ticketNumber] = interaction.customId.split("_");
      if (!mediatorRatings[ticketNumber]) mediatorRatings[ticketNumber] = [];
      if (mediatorRatings[ticketNumber].includes(userId)) {
        return interaction.reply({ content: "❌ You already rated the mediator", ephemeral: true });
      }
      mediatorRatings[ticketNumber].push(userId);

      await interaction.reply({ content: `✅ Thank you for rating the mediator (${rating}⭐)`, ephemeral: true });

      const mediatorRoom = client.channels.cache.get(MEDIATOR_RATING_CHANNEL);
      if (mediatorRoom) {
        const resultEmbed = new EmbedBuilder()
          .setColor("#ffffff")
          .setTitle("⭐ Mediator Rating Result")
          .setDescription(`User: <@${userId}>\nRating: ${rating}⭐\nTicket: #${ticketNumber}`);
        mediatorRoom.send({ embeds: [resultEmbed] });
      }
    }

    ////////////////////////////////////////////////
    //////////////// ADD MEMBER ////////////////////
    ////////////////////////////////////////////////

    if (interaction.customId === "add_member") {
      const memberId = "ID_HERE"; // يمكن استبدالها بالمدخل من الزر
      await interaction.channel.permissionOverwrites.edit(memberId, { ViewChannel: true, SendMessages: true });
      const logChannel = client.channels.cache.get(LOG_CHANNEL);
      if (logChannel) logChannel.send(`<@${memberId}> has been added to ticket by <@${userId}>`);
    }
  });

};
