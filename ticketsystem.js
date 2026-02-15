const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require("discord.js");

module.exports = (client) => {

  // ===== IDs الروم والرتب =====
  const CHANNELS = {
    TICKET_CATEGORY: "1453943996392013901",
    LOGS: "1453948413963141153",
    TRANSCRIPT: "1472218573710823679",
    CLAIM_LOG: "1472439331443441828",
    ADMIN_LOG: "1472023428658630686"
  };

  const ROLES = {
    STAFF: "1454199885460144189",
    ADMIN: "1453946893053726830"
  };

  const ticketData = new Map();

  // ===== امر Setup =====
  client.on("messageCreate", async message => {
    if(message.author.bot || !message.guild) return;
    if(message.content.toLowerCase() !== ":setup") return;

    const channel = message.guild.channels.cache.get("ID_الروم_اللي_عايز_تحط_فيه_الايمبد");
    if(!channel) return message.reply("الروم مش موجود");

    const embed = new EmbedBuilder()
      .setColor("#FFFFFF")
      .setTitle("🎫 فتح تكت جديد")
      .setDescription("اضغط على الزر لفتح تكت حسب النوع");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_ticket")
        .setLabel("فتح تكت")
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
    message.reply("✅ تم إنشاء رسالة التكتات بنجاح");
  });

  // ===== فتح التكت =====
  client.on("interactionCreate", async interaction => {
    if(!interaction.isButton()) return;
    if(interaction.customId !== "open_ticket") return;

    const guild = interaction.guild;
    const member = interaction.user;

    // منع فتح أكثر من تكت للعضو
    if(ticketData.has(member.id)) {
      return interaction.reply({ content: "❌ لديك تكت مفتوح بالفعل", ephemeral: true });
    }

    const category = guild.channels.cache.get(CHANNELS.TICKET_CATEGORY);
    if(!category) return interaction.reply({ content: "Category غير موجود", ephemeral: true });

    const ticketNumber = 346 + ticketData.size + 1;
    const ticketName = `ticket-${ticketNumber}-${member.username}`;

    const ticketChannel = await guild.channels.create({
      name: ticketName,
      type: 0, // GUILD_TEXT
      parent: category.id,
      permissionOverwrites: [
        { id: guild.roles.everyone, deny: ["ViewChannel"] },
        { id: member.id, allow: ["ViewChannel", "SendMessages"] },
        { id: ROLES.STAFF, allow: ["ViewChannel", "SendMessages"] },
        { id: ROLES.ADMIN, allow: ["ViewChannel", "SendMessages"] }
      ]
    });

    ticketData.set(member.id, ticketChannel.id);

    // ايمبد أساسي للتكت
    const embed = new EmbedBuilder()
      .setColor("#FFFFFF")
      .setTitle("اختر نوع التكت")
      .setDescription(
        "🔵 دعم فني\n🟣 طلب وسيط\n🟡 استلام هدايا\n🔴 شكوى على إداري\n🟢 تقديم صانع محتوى"
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("support").setLabel("دعم فني").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("mediator").setLabel("طلب وسيط").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("gift").setLabel("استلام هدايا").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("complaint").setLabel("شكوى على إداري").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("creator").setLabel("صانع محتوى").setStyle(ButtonStyle.Primary)
    );

    await ticketChannel.send({ content: `<@${member.id}> حياك الله!`, embeds: [embed], components: [row] });
    await interaction.reply({ content: `✅ تم فتح تكتك هنا: ${ticketChannel}`, ephemeral: true });
  });

};
