const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = async (client) => {

  // ===== IDs الرومات =====
  const IDS = {
    CLAIM_LOG: "1453948413963141153",
    TRANSCRIPT: "1472218573710823679",
    CLAIMER_ROLE: "1454199885460144189",
    ADMIN_ROLE: "1453946893053726830",
    CATEGORY: "1453943996392013901",
    MIDDLEMAN_EVAL: "1472439331443441828",
    ADMIN_EVAL: "1472023428658630686",
  };

  // ===== تخزين التكتات =====
  const tickets = new Map();

  // ===== ايمبد اسود =====
  const EMBED = (title, desc) => new EmbedBuilder()
    .setColor("#FFFFFF")
    .setTitle(title)
    .setDescription(desc)
    .setTimestamp();

  // ===== التقييم الخاص بالوسطاء =====
  async function sendMiddlemanEval(user, channel) {
    const modal = new ModalBuilder()
      .setCustomId(`middlemanEval-${channel.id}`)
      .setTitle("تقييم الوسيط")
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("stars")
            .setLabel("⭐ عدد النجوم")
            .setStyle(TextInputStyle.Short)
            .setPlaceholder("اكتب عدد النجوم من 1 إلى 5")
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("comment")
            .setLabel("📝 تعليق اختياري")
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder("يمكنك كتابة تعليق إضافي")
            .setRequired(false)
        )
      );
    await user.send({ content: `يرجى تقييم الوسيط لهذا التكت.`, components: [], embeds: [] });
  }

  // ===== فتح تكت =====
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, user, guild } = interaction;

    // ===== فتح تكت وسيط =====
    if (customId === "openMiddleman") {
      const ticketChannel = await guild.channels.create({
        name: `ticket-${tickets.size + 346}-${user.username}`,
        type: 0, // GuildText
        parent: IDS.CATEGORY,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        ]
      });

      const embed = EMBED("طلب وسيط", `
هذا القسم مخصص لطلب الوسيط لعملية تريد داخل السيرفر
・تأكد أن الطرف الاخر جاهز و متواجد قبل فتح التذكرة
・رجاء عدم فتح اكثر من تذكرة أو ازعاج الفريق بالتذكرو المتكرره
・تحقق من درجة الوسيط حيث أن كل لكل مستوي أمان مختلف
・اكتب المعلومات المطلوبة بدقة في الاسئلة التالية
      `);

      const modal = new ModalBuilder()
        .setCustomId(`middlemanModal-${ticketChannel.id}`)
        .setTitle("تفاصيل التريد")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("partner")
              .setLabel("يوزر الشخص الذي تسوي معه التريد؟")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("details")
              .setLabel("ما تفاصيل التريد أو العرض والمقابل؟")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId("addMember").setLabel("ADD").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("claim").setLabel("CLAIM").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("close").setLabel("CLOSE").setStyle(ButtonStyle.Danger)
        );

      const delRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder().setCustomId("delete").setLabel("DELETE WITH REASON").setStyle(ButtonStyle.Danger)
        );

      await ticketChannel.send({ content: `<@${user.id}> حياك الله\nreason: قدمها طلب وسيط`, embeds: [embed], components: [row, delRow] });

      tickets.set(ticketChannel.id, { type: "middleman", owner: user.id });
      await interaction.reply({ content: `تم فتح التكت! <#${ticketChannel.id}>`, ephemeral: true });
    }

    // ===== زر CLAIM =====
    if (customId === "claim") {
      const ticket = tickets.get(interaction.channel.id);
      if (!ticket) return;

      await interaction.update({ components: interaction.message.components.map(r => {
        r.components.forEach(b => {
          if (b.customId === "claim") b.setDisabled(true).setStyle(ButtonStyle.Secondary);
        });
        return r;
      }) });

      await interaction.channel.send(`The ticket has been claimed successfully by <@${user.id}>`);
      // Logs
      const log = guild.channels.cache.get(IDS.CLAIM_LOG);
      if (log) log.send(`CLAIMED: ${interaction.channel.name} by ${user.tag}`);
    }

    // ===== زر ADD =====
    if (customId === "addMember") {
      // هنا ممكن تعمل مودال لأدخال ID العضو المراد اضافته
    }

    // ===== زر CLOSE =====
    if (customId === "close") {
      await interaction.reply({ content: "Are you sure?", ephemeral: true, components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("cancelClose").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("confirmClose").setLabel("Confirm").setStyle(ButtonStyle.Danger)
        )
      ] });
    }

    if (customId === "confirmClose") {
      const ticket = tickets.get(interaction.channel.id);
      if (!ticket) return;

      tickets.delete(interaction.channel.id);
      await interaction.channel.delete();
    }

  });

  // ===== مودال بعد تعبئة التريد =====
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    const { customId, user, channel } = interaction;

    if (customId.startsWith("middlemanModal-")) {
      const partner = interaction.fields.getTextInputValue("partner");
      const details = interaction.fields.getTextInputValue("details");
      await interaction.reply({ content: `تم تسجيل التريد مع ${partner} بنجاح!`, ephemeral: true });
      // إرسال تقييم للوسطاء بعد انتهاء التكت
      await sendMiddlemanEval(user, channel);
    }
  });

};
