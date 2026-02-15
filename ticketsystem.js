const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");

module.exports = async (client) => {

    const ticketCategory = "1453943996392013901"; // Category ID
    const staffRole = "1454199885460144189"; // Staff Role
    const adminRole = "1453946893053726830"; // Admin Role
    const logsChannel = "1453948413963141153";
    const staffRatingChannel = "1472023428658630686";
    const mediatorRatingChannel = "1472439331443441828";
    const transcriptChannel = "1472218573710823679";

    const tickets = new Map();

    client.on("messageCreate", async (message) => {
        if (message.author.bot) return;

        // Command :setup
        if (message.content.toLowerCase() === ":setup") {
            const embed = new EmbedBuilder()
                .setTitle("📩 فتح التكت")
                .setDescription(
                    "**حياك الله <@USER>**\n" +
                    "REASON: اختر نوع التكت\n\n" +
                    "📌 القوانين:\n" +
                    "1️⃣ اكتب الأدلة المطلوبة\n" +
                    "2️⃣ لا تفتح أكثر من تكت\n" +
                    "3️⃣ تأكد أن الطرف الآخر جاهز\n" +
                    "4️⃣ استخدم الأزرار الداخلية فقط للإدارة"
                )
                .setColor("White");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("create_middleman").setLabel("طلب وسيط").setStyle(ButtonStyle.Primary).setEmoji("🟣"),
                new ButtonBuilder().setCustomId("create_support").setLabel("دعم فني").setStyle(ButtonStyle.Primary).setEmoji("🔵"),
                new ButtonBuilder().setCustomId("create_gift").setLabel("استلام هدايا").setStyle(ButtonStyle.Primary).setEmoji("🟡"),
                new ButtonBuilder().setCustomId("create_admin").setLabel("شكوى على إداري").setStyle(ButtonStyle.Danger).setEmoji("🔴"),
                new ButtonBuilder().setCustomId("create_creator").setLabel("تقديم صانع محتوى").setStyle(ButtonStyle.Success).setEmoji("🟢")
            );

            await message.channel.send({ embeds: [embed], components: [row] });
        }

        // Command :done → تقييم الوسطاء
        if (message.content.toLowerCase() === ":done") {
            // يتحقق إذا الشخص في تكت
            const ticketId = tickets.get(message.author.id);
            if (!ticketId) return message.reply("أنت مش في تكت حالياً.");
            // إرسال DM للطرفين لتقييم
            try {
                const user = message.author;
                const dmEmbed = new EmbedBuilder()
                    .setTitle("⭐ تقييم الوسيط")
                    .setDescription("أضف تقييمك بالنجوم والتعليق الاختياري.")
                    .setColor("White");
                await user.send({ embeds: [dmEmbed] });
                await message.reply("تم إرسال نموذج التقييم الخاص بك عبر الخاص.");
            } catch (err) {
                console.log(err);
            }
        }
    });

    client.on("interactionCreate", async (interaction) => {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        // إنشاء التكت حسب النوع
        const ticketTypes = {
            create_middleman: { title: "طلب وسيط", color: "Purple", modal: true },
            create_support: { title: "تذكرة الدعم الفني", color: "Blue", modal: true },
            create_gift: { title: "استلام هدايا", color: "Yellow", modal: false },
            create_admin: { title: "شكوى على إداري", color: "Red", modal: false },
            create_creator: { title: "تقديم صانع محتوى", color: "Green", modal: true }
        };

        if (interaction.isButton() && ticketTypes[interaction.customId]) {
            const type = ticketTypes[interaction.customId];

            // Check if user already has 2 tickets
            const userTickets = Array.from(tickets.values()).filter(t => t.ownerId === interaction.user.id);
            if (userTickets.length >= 2) return interaction.reply({ content: "لا يمكنك فتح أكثر من تكتين في نفس الوقت.", ephemeral: true });

            // إنشاء القناة
            const channel = await interaction.guild.channels.create({
                name: `ticket-${Date.now()}-${interaction.user.username}`,
                type: 0, // text channel
                parent: ticketCategory,
                permissionOverwrites: [
                    { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: staffRole, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: adminRole, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
                ]
            });

            tickets.set(interaction.user.id, { channelId: channel.id, ownerId: interaction.user.id, type: type.title });

            // إرسال الترحيب
            let description = `حياك الله <@${interaction.user.id}>\nREASON: ${type.title}`;
            if (type.modal) description += "\n📌 الرجاء إدخال المعلومات المطلوبة بدقة.";

            const embed = new EmbedBuilder()
                .setTitle(type.title)
                .setDescription(description)
                .setColor(type.color);

            // أزرار التكت
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("add_user").setLabel("ADD").setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId("claim_ticket").setLabel("CLAIM").setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId("close_ticket").setLabel("CLOSE").setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId("delete_ticket").setLabel("DELETE WITH REASON").setStyle(ButtonStyle.Danger)
            );

            await channel.send({ embeds: [embed], components: [buttons] });
            await interaction.reply({ content: `تم إنشاء التكت: ${channel}`, ephemeral: true });
        }

        // أزرار التكت
        if (interaction.isButton()) {
            const channel = interaction.channel;
            const ticket = Array.from(tickets.values()).find(t => t.channelId === channel.id);
            if (!ticket) return interaction.reply({ content: "خطأ: هذا ليس تكت.", ephemeral: true });

            // زر Claim
            if (interaction.customId === "claim_ticket") {
                await interaction.update({
                    content: `The ticket has been claimed successfully by <@${interaction.user.id}>`,
                    components: interaction.message.components.map(row => {
                        row.components.forEach(b => {
                            if (b.customId === "claim_ticket") b.setDisabled(true);
                        });
                        return row;
                    })
                });
            }

            // زر Close
            if (interaction.customId === "close_ticket") {
                await interaction.reply({ content: "Are you sure? (Cancel | Confirm)", ephemeral: true });
                // هنا ممكن تضيف modal تأكيد وخطوة ثانية
            }

            // زر ADD
            if (interaction.customId === "add_user") {
                const modal = new ModalBuilder()
                    .setCustomId("add_user_modal")
                    .setTitle("إضافة عضو للتكت")
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId("user_id")
                                .setLabel("User ID")
                                .setStyle(TextInputStyle.Short)
                                .setPlaceholder("ضع معرف العضو هنا")
                        )
                    );
                await interaction.showModal(modal);
            }
        }

        if (interaction.isModalSubmit()) {
            if (interaction.customId === "add_user_modal") {
                const userId = interaction.fields.getTextInputValue("user_id");
                const member = await interaction.guild.members.fetch(userId).catch(() => null);
                if (!member) return interaction.reply({ content: "المستخدم غير موجود.", ephemeral: true });
                await interaction.channel.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true });
                await interaction.reply({ content: `<@${member.id}> has been added to ticket by <@${interaction.user.id}>`, ephemeral: false });
            }
        }
    });
};
