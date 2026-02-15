// Ticket System Epic Full Version - Part 1
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, Events, PermissionsBitField } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
});

const PREFIX = ":"; 
const ticketDataFile = path.join(__dirname, 'tickets.json');
let tickets = {};
if (fs.existsSync(ticketDataFile)) {
    tickets = JSON.parse(fs.readFileSync(ticketDataFile));
} else {
    fs.writeFileSync(ticketDataFile, JSON.stringify({ lastTicketNumber: 345, openTickets: {} }, null, 4));
    tickets = JSON.parse(fs.readFileSync(ticketDataFile));
}

// Emojis
const EMOJI = {
    CLOSE: "🛡️",
    CLAIM: "✅",
    ADD: "➕",
    DELETE: "🗑️"
};

function saveTickets() {
    fs.writeFileSync(ticketDataFile, JSON.stringify(tickets, null, 4));
}

async function createTicket(interaction, type) {
    let member = interaction.user;
    const memberTickets = Object.values(tickets.openTickets).filter(t => t.ownerId === member.id);
    if (memberTickets.length >= 2) return interaction.reply({ content: "❌ You already have 2 open tickets.", ephemeral: true });

    tickets.lastTicketNumber++;
    const ticketNumber = tickets.lastTicketNumber;
    const ticketName = `ticket-${ticketNumber}-${member.username}`;

    const guild = interaction.guild;
    const category = guild.channels.cache.get(CATEGORY_ID);

    const ticketChannel = await guild.channels.create({
        name: ticketName,
        type: 0,
        parent: category,
        permissionOverwrites: [
            { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
            { id: STAFF_ROLE, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
            { id: ADMIN_ROLE, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
        ]
    });

    tickets.openTickets[ticketChannel.id] = { id: ticketChannel.id, ownerId: member.id, type: type, number: ticketNumber, claimedBy: null };
    saveTickets();

    // الترحيب فوق الإيمبد
    await ticketChannel.send({ content: `حياك الله <@${member.id}>\nREASON: ${type}` });

    // الإيمبد
    const embed = new EmbedBuilder()
        .setTitle(type === "Middleman" ? "طلب وسيط" : type === "Support" ? "تذكرة الدعم الفني" : type)
        .setDescription(
            type === "Middleman" ?
            "هذا القسم مخصص لطلب الوسيط لعملية تريد داخل السيرفر\n・تأكد أن الطرف الاخر جاهز و متواجد قبل فتح التذكرة\n・رجاء عدم فتح اكثر من تذكرة أو ازعاج الفريق بالتذكرة المتكررة\n・تحقق من درجة الوسيط حيث أن كل لكل مستوي أمان مختلف\n・اكتب المعلومات المطلوبة بدقة في الاسئلة التالية"
            :
            type === "Support" ?
            "شكراً لفتح تذكرة الدعم الفني\n・يرجى شرح شكواك أو مشكلتك أو طلبك بشكل واضح و مفصل قدر الإمكان\n・ارفق اي صور أو روابط أو أدلة تساعدنا على فهم المشكله\n・فريق الدعم سيراجع تذكرتك و يجييك في اسرع وقت ممكن\nيرجى التحلي بالصبر فترتيب الردود يتم على حسب الأولوية و وقت الفتح"
            :
            ""
        )
        .setColor("White");

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId("add").setLabel("ADD").setEmoji(EMOJI.ADD).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("claim").setLabel("CLAIM").setEmoji(EMOJI.CLAIM).setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("close").setLabel("CLOSE").setEmoji(EMOJI.CLOSE).setStyle(ButtonStyle.Danger)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId("delete").setLabel("DELETE WITH REASON").setEmoji(EMOJI.DELETE).setStyle(ButtonStyle.Danger)
        );

    await ticketChannel.send({ embeds: [embed], components: [row1, row2] });
    interaction.reply({ content: `✅ Ticket created: ${ticketChannel}`, ephemeral: true });
}

// التعامل مع الأزرار
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton() && !interaction.isCommand() && !interaction.isModalSubmit()) return;

    const ticket = tickets.openTickets[interaction.channelId];

    if (interaction.isCommand()) {
        if (interaction.commandName === "setup") {
            const type = interaction.options.getString("type") || "Middleman";
            await createTicket(interaction, type);
        }
        if (interaction.commandName === "done") {
            if (!ticket) return interaction.reply({ content: "❌ No ticket found.", ephemeral: true });
            await interaction.reply({ content: "⭐ Sent rating DM to involved parties.", ephemeral: true });
        }
    }

    if (interaction.isButton()) {
        if (!ticket) return interaction.reply({ content: "❌ Not a ticket channel.", ephemeral: true });
        const member = interaction.user;
        const channel = interaction.channel;

        if (interaction.customId === "claim") {
            if (ticket.claimedBy) return interaction.reply({ content: "❌ Ticket already claimed.", ephemeral: true });
            ticket.claimedBy = member.id;
            saveTickets();
            // اخفاء باقي الادارة
            channel.permissionOverwrites.edit(STAFF_ROLE, { ViewChannel: false });
            await interaction.update({ content: `The ticket has been claimed successfully by <@${member.id}>`, components: [row1, row2] });
        }

        if (interaction.customId === "add") {
            const modal = new ModalBuilder().setCustomId("addUserModal").setTitle("Add User to Ticket");
            const input = new TextInputBuilder().setCustomId("userIdInput").setLabel("Enter the User ID to add").setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }

        if (interaction.customId === "close") {
            const modal = new ModalBuilder().setCustomId("closeConfirm").setTitle("Confirm Close Ticket");
            const input = new TextInputBuilder().setCustomId("confirmInput").setLabel("Type CONFIRM to close the ticket").setStyle(TextInputStyle.Short).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }

        if (interaction.customId === "delete") {
            const modal = new ModalBuilder().setCustomId("deleteModal").setTitle("Delete Ticket with Reason");
            const input = new TextInputBuilder().setCustomId("deleteReasonInput").setLabel("Enter reason for deletion").setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === "addUserModal") {
            const userId = interaction.fields.getTextInputValue("userIdInput");
            const memberToAdd = interaction.guild.members.cache.get(userId);
            if (!memberToAdd) return interaction.reply({ content: "❌ Invalid User ID.", ephemeral: true });
            await interaction.channel.permissionOverwrites.edit(memberToAdd.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
            await interaction.reply({ content: `<@${memberToAdd.id}> has been added to ticket by <@${interaction.user.id}>`, ephemeral: false });
        }

        if (interaction.customId === "closeConfirm") {
            const confirmText = interaction.fields.getTextInputValue("confirmInput");
            if (confirmText.toUpperCase() === "CONFIRM") {
                await interaction.channel.permissionOverwrites.edit(ticket.ownerId, { ViewChannel: false });
                await interaction.reply({ content: `✅ Ticket closed successfully.`, ephemeral: true });
            } else {
                await interaction.reply({ content: "❌ Cancelled.", ephemeral: true });
            }
        }

        if (interaction.customId === "deleteModal") {
            const reason = interaction.fields.getTextInputValue("deleteReasonInput");
            await interaction.reply({ content: `🗑️ Ticket deleted. Reason: ${reason}`, ephemeral: true });
            await interaction.channel.delete().catch(console.error);
            delete tickets.openTickets[interaction.channelId];
            saveTickets();
        }
    }
});

client.on("ready", () => console.log(`${client.user.tag} is online.`));
client.login("YOUR_BOT_TOKEN");

// ---------- Part 2: Ratings, Logs, Transcripts ----------

// IDs للChannels
const MIDDLEMAN_RATING_CHANNEL_ID = "1472439331443441828";
const STAFF_RATING_CHANNEL_ID = "1472023428658630686";
const LOGS_CHANNEL_ID = "1453948413963141153";
const TRANSCRIPT_CHANNEL_ID = "1472218573710823679";

// Functions

async function sendMiddlemanRating(ticket) {
    const user1 = await client.users.fetch(ticket.ownerId);
    const user2 = await client.users.fetch(ticket.otherPartyId); // يجب تخزين ID الطرف الثاني عند فتح التكت
    if (!user1 || !user2) return;

    const ratingEmbed = new EmbedBuilder()
        .setTitle("🟣 Middleman Rating")
        .setDescription("⭐ Please rate your experience with the middleman.\n📝 Optional comment is allowed.")
        .setColor("Purple");

    // إرسال DM للطرفين
    await user1.send({ embeds: [ratingEmbed] });
    await user2.send({ embeds: [ratingEmbed] });

    // حفظ حالة أنه تم إرسال التقييم
    ticket.middlemanRated = false;
    saveTickets();
}

async function sendStaffRating(ticket) {
    const user = await client.users.fetch(ticket.ownerId);
    if (!user) return;

    const ratingEmbed = new EmbedBuilder()
        .setTitle("🔵 Staff Rating")
        .setDescription("⭐ Please rate the staff support.\n📝 Optional comment allowed.")
        .setColor("Blue");

    await user.send({ embeds: [ratingEmbed] });
    ticket.staffRated = false;
    saveTickets();
}

// Logging
async function sendLog(eventType, ticket, actionUserId, extra = null) {
    const logChannel = await client.channels.fetch(LOGS_CHANNEL_ID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setTitle(`📜 Ticket Log - ${eventType}`)
        .setColor("Orange")
        .addFields(
            { name: "Ticket", value: `<#${ticket.id}>` },
            { name: "Action By", value: `<@${actionUserId}>` },
            { name: "Ticket Type", value: ticket.type },
            { name: "Owner", value: `<@${ticket.ownerId}>` }
        );

    if (extra) embed.addFields({ name: "Extra Info", value: extra });

    await logChannel.send({ embeds: [embed] });
}

// Transcript
async function createTranscript(ticket) {
    const transcriptChannel = await client.channels.fetch(TRANSCRIPT_CHANNEL_ID);
    if (!transcriptChannel) return;

    const messages = await client.channels.cache.get(ticket.id)?.messages.fetch({ limit: 100 }) || [];
    let transcriptText = `--- Transcript for ${ticket.id} ---\n`;

    messages.forEach(msg => {
        transcriptText += `[${msg.author.tag}] ${msg.content}\n`;
    });

    // حفظ نص الترانسكريبت في ملف نصي
    const transcriptFile = path.join(__dirname, `transcripts/${ticket.id}.txt`);
    fs.writeFileSync(transcriptFile, transcriptText);

    // إرسال للترانسكريبت روم
    await transcriptChannel.send({ content: `Transcript for <#${ticket.id}>`, files: [transcriptFile] });
}

// ---------- Handling Rating + Logs on Close ----------

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;
    const ticket = tickets.openTickets[interaction.channelId];
    if (!ticket) return;

    const member = interaction.user;
    const channel = interaction.channel;

    if (interaction.isModalSubmit()) {
        if (interaction.customId === "closeConfirm") {
            const confirmText = interaction.fields.getTextInputValue("confirmInput");
            if (confirmText.toUpperCase() === "CONFIRM") {
                // اختفاء التكت من العضو
                await channel.permissionOverwrites.edit(ticket.ownerId, { ViewChannel: false });
                await interaction.reply({ content: `✅ Ticket closed successfully.`, ephemeral: true });

                // إرسال التقييم التلقائي للإدارة
                await sendStaffRating(ticket);

                // Logs Close
                await sendLog("Close", ticket, member.id);

                // إنشاء Transcripts
                await createTranscript(ticket);
            } else {
                await interaction.reply({ content: "❌ Close cancelled.", ephemeral: true });
            }
        }
    }

    if (interaction.isButton()) {
        switch (interaction.customId) {
            case "claim":
                if (ticket.claimedBy) return interaction.reply({ content: "❌ Ticket already claimed.", ephemeral: true });
                ticket.claimedBy = member.id;
                saveTickets();
                // اخفاء باقي الإدارة
                channel.permissionOverwrites.edit(STAFF_ROLE, { ViewChannel: false });
                await interaction.update({ content: `The ticket has been claimed successfully by <@${member.id}>` });
                await sendLog("Claim", ticket, member.id);
                break;

            case "delete":
                // تفتح المودال لحفظ reason
                break;

            case "add":
                // فتح المودال لإضافة مستخدم
                break;
        }
    }
});

// ---------- Part 3: Ticket Modals, Embeds, Buttons ----------

// IDs الرومات والرتب
const CATEGORY_ID = "1453943996392013901";
const STAFF_ROLE = "1454199885460144189"; // رتبة الإدارة
const HIGH_STAFF_ROLE = "1453946893053726830"; // رتبة الإدارة العليا

// Buttons و Emojis
const buttons = {
    add: new ButtonBuilder()
        .setCustomId("add")
        .setLabel("ADD")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("➕"), // Emoji مناسب للإضافة

    claim: new ButtonBuilder()
        .setCustomId("claim")
        .setLabel("CLAIM")
        .setStyle(ButtonStyle.Success)
        .setEmoji("🛡️"), // درع للتأكيد

    close: new ButtonBuilder()
        .setCustomId("close")
        .setLabel("CLOSE")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒"), // قفل

    delete: new ButtonBuilder()
        .setCustomId("delete")
        .setLabel("DELETE WITH REASON")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️") // سلة المهملات
};

// Action Rows
const row1 = new ActionRowBuilder().addComponents([buttons.add, buttons.claim, buttons.close]);
const row2 = new ActionRowBuilder().addComponents([buttons.delete]);

// ---------- Ticket Types Embeds & Modals ----------

// 1️⃣ طلب وسيط (Middleman Ticket)
function middlemanEmbed(ticketOwner) {
    return new EmbedBuilder()
        .setTitle("🟣 طلب وسيط")
        .setDescription(
            "هذا القسم مخصص لطلب الوسيط لعملية تريد داخل السيرفر.\n" +
            "・تأكد أن الطرف الآخر جاهز.\n" +
            "・عدم فتح أكثر من تذكرة.\n" +
            "・تحقق من درجة الوسيط لكل مستوى أمان.\n" +
            "・اكتب المعلومات المطلوبة بدقة في الأسئلة التالية."
        )
        .setColor("White");
}

function middlemanModal() {
    return new ModalBuilder()
        .setCustomId("middlemanModal")
        .setTitle("طلب وسيط")
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("partnerUser")
                    .setLabel("يوزر الشخص الذي تتريد معه؟")
                    .setStyle(TextInputStyle.Short)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("tradeDetails")
                    .setLabel("ما تفاصيل التريد أو العرض والمقابل؟")
                    .setStyle(TextInputStyle.Paragraph)
            )
        );
}

// 2️⃣ دعم فني (Support Ticket)
function supportEmbed(ticketOwner) {
    return new EmbedBuilder()
        .setTitle("🔵 تذكرة الدعم الفني")
        .setDescription(
            "شكراً لفتح تذكرة الدعم الفني.\n" +
            "・يرجى شرح مشكلتك أو طلبك بالتفصيل.\n" +
            "・ارفق أي صور أو روابط أو أدلة تساعدنا على فهم المشكلة.\n" +
            "・فريق الدعم سيراجع تذكرتك في أسرع وقت ممكن حسب الأولوية."
        )
        .setColor("White");
}

function supportModal() {
    return new ModalBuilder()
        .setCustomId("supportModal")
        .setTitle("الدعم الفني")
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("supportDetails")
                    .setLabel("ما هي مشكلتك أو طلبك بالتفصيل؟")
                    .setStyle(TextInputStyle.Paragraph)
            )
        );
}

// 3️⃣ استلام هدايا (Gift Ticket)
function giftEmbed(ticketOwner) {
    return new EmbedBuilder()
        .setTitle("🟡 استلام هدايا")
        .setDescription("لا توجد نافذة إدخال. فقط رسالة الترحيب أدناه.")
        .setColor("White");
}

// 4️⃣ شكوى على إداري (Report Admin)
function reportAdminEmbed(ticketOwner) {
    return new EmbedBuilder()
        .setTitle("🔴 شكوى على إداري")
        .setDescription("لا توجد نافذة إدخال أو مودال. فقط رسالة الترحيب أدناه.")
        .setColor("White");
}

// 5️⃣ تقديم على صانع محتوى (Creator Application)
function creatorEmbed(ticketOwner) {
    return new EmbedBuilder()
        .setTitle("🟢 تقديم صانع محتوى")
        .setDescription(
            "يرجى تعبئة المعلومات التالية بدقة.\n" +
            "・رابط القنوات.\n" +
            "・عدد المتابعين والمميزات."
        )
        .setColor("White");
}

function creatorModal() {
    return new ModalBuilder()
        .setCustomId("creatorModal")
        .setTitle("تقديم صانع محتوى")
        .addComponents(
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("channelLinks")
                    .setLabel("رابط القنوات")
                    .setStyle(TextInputStyle.Paragraph)
            ),
            new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                    .setCustomId("followersInfo")
                    .setLabel("عدد المتابعين والمميزات")
                    .setStyle(TextInputStyle.Paragraph)
            )
        );
}

// ---------- Sending the Ticket Embed ----------

async function openTicket(ticketType, member) {
    const category = await client.channels.fetch(CATEGORY_ID);
    const ticketNumber = tickets.counter + 1;
    const ticketName = `ticket-${ticketNumber}-${member.user.username}`;

    const channel = await member.guild.channels.create({
        name: ticketName,
        type: 0, // GUILD_TEXT
        parent: category,
        permissionOverwrites: [
            {
                id: member.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            },
            {
                id: STAFF_ROLE,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            },
            {
                id: HIGH_STAFF_ROLE,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            },
            {
                id: member.guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            }
        ]
    });

    let embed;
    let modal;
    switch(ticketType) {
        case "middleman":
            embed = middlemanEmbed(member);
            modal = middlemanModal();
            break;
        case "support":
            embed = supportEmbed(member);
            modal = supportModal();
            break;
        case "gift":
            embed = giftEmbed(member);
            break;
        case "reportAdmin":
            embed = reportAdminEmbed(member);
            break;
        case "creator":
            embed = creatorEmbed(member);
            modal = creatorModal();
            break;
    }

    await channel.send({
        content: `حياك الله <@${member.id}>\nREASON: ${ticketType}`,
        embeds: embed ? [embed] : [],
        components: [row1, row2]
    });

    tickets.openTickets[channel.id] = {
        id: channel.id,
        ownerId: member.id,
        type: ticketType,
        claimedBy: null
    };
    tickets.counter++;
    saveTickets();
}

// ---------- Part 4: Button Interactions for Tickets ----------

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    const ticket = tickets.openTickets[interaction.channel.id];
    if (!ticket) return interaction.reply({ content: "هذا ليس تكت صالح.", ephemeral: true });

    const member = interaction.member;

    // ------------------ ADD Button ------------------
    if (interaction.customId === "add") {
        // التحقق من الصلاحيات
        if (!member.roles.cache.has(STAFF_ROLE) && !member.roles.cache.has(HIGH_STAFF_ROLE))
            return interaction.reply({ content: "ليس لديك صلاحية لإضافة عضو.", ephemeral: true });

        // مودال لإضافة العضو
        const addModal = new ModalBuilder()
            .setCustomId("addMemberModal")
            .setTitle("ADD MEMBER")
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("addUserId")
                        .setLabel("أدخل User ID للعضو المراد إضافته")
                        .setStyle(TextInputStyle.Short)
                )
            );

        await interaction.showModal(addModal);
    }

    // ------------------ CLAIM Button ------------------
    if (interaction.customId === "claim") {
        if (!member.roles.cache.has(STAFF_ROLE) && !member.roles.cache.has(HIGH_STAFF_ROLE))
            return interaction.reply({ content: "ليس لديك صلاحية لاستلام التكت.", ephemeral: true });

        ticket.claimedBy = member.id;
        await interaction.update({
            content: `The ticket has been claimed successfully by <@${member.id}>`,
            components: [row1, row2.map(btnRow => {
                btnRow.components.forEach(btn => {
                    if (btn.data.custom_id === "claim") btn.setDisabled(true);
                });
                return btnRow;
            })]
        });

        // Hide the ticket from باقي الإدارة (غير العليا)
        const channel = interaction.channel;
        channel.permissionOverwrites.edit(STAFF_ROLE, { VIEW_CHANNEL: false });
    }

    // ------------------ CLOSE Button ------------------
    if (interaction.customId === "close") {
        if (!member.roles.cache.has(STAFF_ROLE) && !member.roles.cache.has(HIGH_STAFF_ROLE))
            return interaction.reply({ content: "ليس لديك صلاحية لإغلاق التكت.", ephemeral: true });

        const confirmModal = new ModalBuilder()
            .setCustomId("closeConfirmModal")
            .setTitle("تأكيد الإغلاق")
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("closeConfirm")
                        .setLabel("Type CONFIRM لإغلاق التكت")
                        .setStyle(TextInputStyle.Short)
                )
            );

        await interaction.showModal(confirmModal);
    }

    // ------------------ DELETE Button ------------------
    if (interaction.customId === "delete") {
        if (!member.roles.cache.has(STAFF_ROLE) && !member.roles.cache.has(HIGH_STAFF_ROLE))
            return interaction.reply({ content: "ليس لديك صلاحية لحذف التكت.", ephemeral: true });

        const deleteModal = new ModalBuilder()
            .setCustomId("deleteModal")
            .setTitle("DELETE TICKET")
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId("deleteReason")
                        .setLabel("اكتب سبب الحذف")
                        .setStyle(TextInputStyle.Paragraph)
                )
            );

        await interaction.showModal(deleteModal);
    }
});

// ---------- Modal Submissions Handling ----------

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    const ticket = tickets.openTickets[interaction.channel.id];
    if (!ticket) return interaction.reply({ content: "هذا ليس تكت صالح.", ephemeral: true });

    // ------------------ ADD Member Modal ------------------
    if (interaction.customId === "addMemberModal") {
        const userId = interaction.fields.getTextInputValue("addUserId");
        const memberToAdd = await interaction.guild.members.fetch(userId).catch(() => null);

        if (!memberToAdd)
            return interaction.reply({ content: "لم أتمكن من العثور على العضو.", ephemeral: true });

        await interaction.channel.permissionOverwrites.edit(memberToAdd.id, {
            VIEW_CHANNEL: true,
            SEND_MESSAGES: true
        });

        await interaction.reply({ content: `<@${memberToAdd.id}> has been added to ticket by <@${interaction.member.id}>`, ephemeral: false });
    }

    // ------------------ CLOSE Confirm Modal ------------------
    if (interaction.customId === "closeConfirmModal") {
        const confirmText = interaction.fields.getTextInputValue("closeConfirm");
        if (confirmText !== "CONFIRM") {
            return interaction.reply({ content: "تم إلغاء الإغلاق.", ephemeral: true });
        }

        // إخفاء التكت عن العضو الأصلي
        await interaction.channel.permissionOverwrites.edit(ticket.ownerId, { VIEW_CHANNEL: false });

        // تحديث الزرار ليظهر delete فقط
        await interaction.update({ components: [row2] });

        // Reply للعضو
        const memberObj = await interaction.guild.members.fetch(ticket.ownerId);
        memberObj.send(`✅ تم إغلاق التكت الخاص بك بنجاح. REASON: ${ticket.type}`).catch(() => {});

        interaction.followUp({ content: `Ticket closed successfully by <@${interaction.member.id}>`, ephemeral: true });
    }

    // ------------------ DELETE Modal ------------------
    if (interaction.customId === "deleteModal") {
        const reason = interaction.fields.getTextInputValue("deleteReason");

        await interaction.channel.send({ content: `Ticket deleted by <@${interaction.member.id}>. Reason: ${reason}` });
        await interaction.channel.delete();
        delete tickets.openTickets[interaction.channel.id];
    }
});

// ---------- Part 5: Mediator and Staff Rating System ----------

// Command for mediator rating (داخل التكت)
client.on("messageCreate", async (message) => {
    if (!message.guild) return;
    if (!tickets.openTickets[message.channel.id]) return;
    
    const ticket = tickets.openTickets[message.channel.id];
    const args = message.content.trim().split(/ +/);

    // ================= Mediator Rating =================
    if (args[0] === ":done") { // أمر الوساطة
        if (!ticket.mediator) return message.reply("لا يوجد وسيط محدد في هذا التكت.");
        if (ticket.mediatorRated) return message.reply("لقد تم التقييم بالفعل.");

        const member1 = await message.guild.members.fetch(ticket.ownerId);
        const member2 = await message.guild.members.fetch(ticket.mediator);

        // DM للطرفين
        const ratingEmbed = new EmbedBuilder()
            .setTitle("🟣 تقييم الوسيط")
            .setDescription(
                "⭐ الرجاء تقييم الوسيط بالنجوم\n" +
                "📝 يمكنك كتابة تعليق إضافي (اختياري)"
            )
            .setColor("White");

        try {
            await member1.send({ embeds: [ratingEmbed] });
            await member2.send({ embeds: [ratingEmbed] });
        } catch { /* Member DMs might be off */ }

        ticket.mediatorRated = true;

        // إرسال النتائج إلى روم تقييم الوسطاء
        const mediatorRatingChannel = message.guild.channels.cache.get(MEDIATOR_RATING_CHANNEL_ID);
        mediatorRatingChannel.send({
            content: `📊 تكت الوساطة تم تقييمه: Ticket ID: ${message.channel.name}\nOwner: <@${ticket.ownerId}>\nMediator: <@${ticket.mediator}>`
        });

        message.reply("تم إرسال نموذج التقييم للطرفين.");
    }
});

// ================= Staff Rating =================
client.on("ticketClosed", async (ticket) => {
    // يتم تلقائي بعد Close
    if (ticket.staffRated) return;

    const member1 = await ticket.guild.members.fetch(ticket.ownerId);
    const member2 = await ticket.guild.members.fetch(ticket.claimedBy);

    const staffEmbed = new EmbedBuilder()
        .setTitle("🔵 تقييم الإدارة")
        .setDescription(
            "⭐ الرجاء تقييم أداء الإدارة في هذا التكت\n" +
            "📝 يمكنك كتابة تعليق إضافي (اختياري)"
        )
        .setColor("White");

    try {
        await member1.send({ embeds: [staffEmbed] });
        await member2.send({ embeds: [staffEmbed] });
    } catch {}

    ticket.staffRated = true;

    const staffRatingChannel = ticket.guild.channels.cache.get(STAFF_RATING_CHANNEL_ID);
    staffRatingChannel.send({
        content: `📊 تكت الإدارة تم تقييمه: Ticket ID: ${ticket.channel.name}\nOwner: <@${ticket.ownerId}>\nStaff: <@${ticket.claimedBy}>`
    });
});

// ---------- Part 6: Ticket Logs & Transcript System ----------

// الأحداث اللي هتتبعت لللوق
// روم اللوق: 1453948413963141153
const LOG_CHANNEL_ID = "1453948413963141153";
const TRANSCRIPT_CHANNEL_ID = "1472218573710823679";

// تابع لإرسال لوق عند أي حدث
async function sendTicketLog(guild, ticket, action, extra = "") {
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;

    const logEmbed = new EmbedBuilder()
        .setTitle(`📝 Ticket Log - ${action}`)
        .setColor("White")
        .addFields(
            { name: "Ticket", value: `<#${ticket.channel.id}>`, inline: true },
            { name: "Owner", value: `<@${ticket.ownerId}>`, inline: true },
            { name: "Claimed By", value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "Not claimed", inline: true },
            { name: "Extra Info", value: extra || "N/A" }
        )
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] });
}

// ================= Ticket Events =================

// عند استلام التكت
client.on("ticketClaimed", async (ticket, adminId) => {
    ticket.claimedBy = adminId;
    await sendTicketLog(ticket.guild, ticket, "Claim", `Claimed by <@${adminId}>`);
});

// عند إضافة عضو
client.on("ticketAddMember", async (ticket, adminId, addedId) => {
    const extra = `Added member <@${addedId}> by <@${adminId}>`;
    await sendTicketLog(ticket.guild, ticket, "Add Member", extra);
});

// عند غلق التكت
client.on("ticketClosed", async (ticket) => {
    const extra = ticket.claimedBy ? `Closed by <@${ticket.claimedBy}>` : "Closed by unknown";
    await sendTicketLog(ticket.guild, ticket, "Close", extra);

    // إنشاء Transcript بعد الغلق
    await generateTranscript(ticket);
});

// عند حذف التكت
client.on("ticketDeleted", async (ticket, adminId, reason) => {
    const extra = `Deleted by <@${adminId}> | Reason: ${reason}`;
    await sendTicketLog(ticket.guild, ticket, "Delete", extra);
});

// عند إنشاء التكت
client.on("ticketCreated", async (ticket) => {
    await sendTicketLog(ticket.guild, ticket, "Creator", `Ticket type: ${ticket.type}`);
});

// ================= Generate Transcript =================
async function generateTranscript(ticket) {
    const transcriptChannel = ticket.guild.channels.cache.get(TRANSCRIPT_CHANNEL_ID);
    if (!transcriptChannel) return;

    const messages = await ticket.channel.messages.fetch({ limit: 1000 });
    const sorted = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    let content = `📜 Transcript for ${ticket.channel.name}\n\n`;
    for (const msg of sorted) {
        content += `[${new Date(msg.createdTimestamp).toLocaleString()}] ${msg.author.tag}: ${msg.content}\n`;
    }

    const transcriptEmbed = new EmbedBuilder()
        .setTitle(`📄 Transcript - ${ticket.channel.name}`)
        .setDescription(`A full transcript has been generated for this ticket.`)
        .setColor("White")
        .setTimestamp();

    await transcriptChannel.send({ content: content.substring(0, 1990) || "No messages found.", embeds: [transcriptEmbed] });
}

// ---------- Part 6: Ticket Logs & Transcript System ----------

// الأحداث اللي هتتبعت لللوق
// روم اللوق: 1453948413963141153
const LOG_CHANNEL_ID = "1453948413963141153";
const TRANSCRIPT_CHANNEL_ID = "1472218573710823679";

// تابع لإرسال لوق عند أي حدث
async function sendTicketLog(guild, ticket, action, extra = "") {
    const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel) return;

    const logEmbed = new EmbedBuilder()
        .setTitle(`📝 Ticket Log - ${action}`)
        .setColor("White")
        .addFields(
            { name: "Ticket", value: `<#${ticket.channel.id}>`, inline: true },
            { name: "Owner", value: `<@${ticket.ownerId}>`, inline: true },
            { name: "Claimed By", value: ticket.claimedBy ? `<@${ticket.claimedBy}>` : "Not claimed", inline: true },
            { name: "Extra Info", value: extra || "N/A" }
        )
        .setTimestamp();

    await logChannel.send({ embeds: [logEmbed] });
}

// ================= Ticket Events =================

// عند استلام التكت
client.on("ticketClaimed", async (ticket, adminId) => {
    ticket.claimedBy = adminId;
    await sendTicketLog(ticket.guild, ticket, "Claim", `Claimed by <@${adminId}>`);
});

// عند إضافة عضو
client.on("ticketAddMember", async (ticket, adminId, addedId) => {
    const extra = `Added member <@${addedId}> by <@${adminId}>`;
    await sendTicketLog(ticket.guild, ticket, "Add Member", extra);
});

// عند غلق التكت
client.on("ticketClosed", async (ticket) => {
    const extra = ticket.claimedBy ? `Closed by <@${ticket.claimedBy}>` : "Closed by unknown";
    await sendTicketLog(ticket.guild, ticket, "Close", extra);

    // إنشاء Transcript بعد الغلق
    await generateTranscript(ticket);
});

// عند حذف التكت
client.on("ticketDeleted", async (ticket, adminId, reason) => {
    const extra = `Deleted by <@${adminId}> | Reason: ${reason}`;
    await sendTicketLog(ticket.guild, ticket, "Delete", extra);
});

// عند إنشاء التكت
client.on("ticketCreated", async (ticket) => {
    await sendTicketLog(ticket.guild, ticket, "Creator", `Ticket type: ${ticket.type}`);
});

// ================= Generate Transcript =================
async function generateTranscript(ticket) {
    const transcriptChannel = ticket.guild.channels.cache.get(TRANSCRIPT_CHANNEL_ID);
    if (!transcriptChannel) return;

    const messages = await ticket.channel.messages.fetch({ limit: 1000 });
    const sorted = Array.from(messages.values()).sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    let content = `📜 Transcript for ${ticket.channel.name}\n\n`;
    for (const msg of sorted) {
        content += `[${new Date(msg.createdTimestamp).toLocaleString()}] ${msg.author.tag}: ${msg.content}\n`;
    }

    const transcriptEmbed = new EmbedBuilder()
        .setTitle(`📄 Transcript - ${ticket.channel.name}`)
        .setDescription(`A full transcript has been generated for this ticket.`)
        .setColor("White")
        .setTimestamp();

    await transcriptChannel.send({ content: content.substring(0, 1990) || "No messages found.", embeds: [transcriptEmbed] });
}

// =====================
// الجزء التاسع: تقييم + Logs + حماية
// =====================

const { Client, GatewayIntentBits, Partials, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, PermissionsBitField, ChannelType } = require("discord.js");
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// ==== الثوابت (IDs) ====
const TICKET_CATEGORY_ID = "1453943996392013901";
const STAFF_ROLE_ID = "1454199885460144189";
const ADMIN_ROLE_ID = "1453946893053726830";
const LOG_CHANNEL_ID = "1453948413963141153";
const TRANSCRIPT_CHANNEL_ID = "1472218573710823679";
const MIDDLEMAN_RATING_CHANNEL = "1472439331443441828";
const STAFF_RATING_CHANNEL = "1472023428658630686";

// ==== Collections ====
client.cooldowns = new Collection();
client.ticketsState = new Collection(); // تخزين حالة كل تكت
client.userTicketMap = new Collection(); // لمنع فتح أكثر من تكت للعضو

// ==== Helpers ====

// إرسال رسالة لوق
async function sendLog(eventType, ticketChannel, member, staff, extra = "") {
    const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor("White")
        .setTitle(`Ticket Log - ${eventType}`)
        .addFields(
            { name: "Ticket", value: `${ticketChannel.name}`, inline: true },
            { name: "Member", value: `${member}`, inline: true },
            { name: "Staff", value: staff ? `${staff}` : "N/A", inline: true },
            { name: "Extra Info", value: extra || "N/A" }
        )
        .setTimestamp();

    logChannel.send({ embeds: [embed] });
}

// فتح مودال تقييم الوسطاء
async function openMiddlemanRatingModal(member, interaction) {
    const modal = new ModalBuilder()
        .setCustomId(`middleman_rating_${member.id}`)
        .setTitle("Middleman Rating");

    const starsInput = new TextInputBuilder()
        .setCustomId("stars")
        .setLabel("⭐ Rate from 1 to 5 stars")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const commentInput = new TextInputBuilder()
        .setCustomId("comment")
        .setLabel("📝 Additional comment (Optional)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    const firstRow = new ActionRowBuilder().addComponents(starsInput);
    const secondRow = new ActionRowBuilder().addComponents(commentInput);

    modal.addComponents(firstRow, secondRow);
    await interaction.showModal(modal);
}

// فتح مودال تقييم الإدارة
async function openStaffRatingModal(member, interaction) {
    const modal = new ModalBuilder()
        .setCustomId(`staff_rating_${member.id}`)
        .setTitle("Staff Rating");

    const starsInput = new TextInputBuilder()
        .setCustomId("stars")
        .setLabel("⭐ Rate from 1 to 5 stars")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const commentInput = new TextInputBuilder()
        .setCustomId("comment")
        .setLabel("📝 Additional comment (Optional)")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    const firstRow = new ActionRowBuilder().addComponents(starsInput);
    const secondRow = new ActionRowBuilder().addComponents(commentInput);

    modal.addComponents(firstRow, secondRow);
    await interaction.showModal(modal);
}

// منع فتح أكثر من تكت في نفس الوقت
function canOpenTicket(userId) {
    return !client.userTicketMap.has(userId);
}

// تسجيل التقييم
async function registerRating(channelId, userId, stars, comment) {
    const ratingChannel = await client.channels.fetch(channelId);
    if (!ratingChannel) return;

    const embed = new EmbedBuilder()
        .setColor("White")
        .setTitle("New Rating Submitted")
        .addFields(
            { name: "User", value: `<@${userId}>`, inline: true },
            { name: "Stars", value: `${stars}`, inline: true },
            { name: "Comment", value: comment || "None" }
        )
        .setTimestamp();

    await ratingChannel.send({ embeds: [embed] });
}

// ==== Anti-Spam & Cooldown ====
function checkCooldown(userId, action, duration = 5000) {
    if (!client.cooldowns.has(action)) client.cooldowns.set(action, new Collection());
    const now = Date.now();
    const timestamps = client.cooldowns.get(action);
    if (timestamps.has(userId)) {
        const expiration = timestamps.get(userId) + duration;
        if (now < expiration) return true;
    }
    timestamps.set(userId, now);
    setTimeout(() => timestamps.delete(userId), duration);
    return false;
}

// ==== Interaction Listener ====
client.on("interactionCreate", async interaction => {
    if (interaction.isButton()) {
        const { customId, user, channel } = interaction;

        // ===== Claim Button =====
        if (customId.startsWith("claim_")) {
            if (checkCooldown(user.id, "claim")) return interaction.reply({ content: "Please wait a few seconds before claiming again.", ephemeral: true });
            const ticketId = customId.split("_")[1];
            client.ticketsState.set(channel.id, { claimedBy: user.id });
            // تحديث الزرار للشفافية
            interaction.update({ components: interaction.message.components.map(row => {
                row.components = row.components.map(btn => {
                    if (btn.customId === customId) btn.setDisabled(true);
                    return btn;
                });
                return row;
            }) });
            await sendLog("Claim", channel, `<@${user.id}>`, `<@${user.id}>`);
            await channel.send({ content: `The ticket has been claimed successfully by <@${user.id}>` });
        }

        // ===== Add Member Button =====
        else if (customId.startsWith("add_")) {
            if (!user.roles.cache.has(STAFF_ROLE_ID) && !user.roles.cache.has(ADMIN_ROLE_ID)) return interaction.reply({ content: "You don't have permission.", ephemeral: true });
            await interaction.showModal(new ModalBuilder()
                .setCustomId(`addMemberModal_${channel.id}`)
                .setTitle("Add Member")
                .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder()
                    .setCustomId("userId")
                    .setLabel("Enter User ID")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                ))
            );
        }

        // ===== Close Button =====
        else if (customId.startsWith("close_")) {
            if (!user.roles.cache.has(STAFF_ROLE_ID) && !user.roles.cache.has(ADMIN_ROLE_ID)) return interaction.reply({ content: "You don't have permission.", ephemeral: true });
            // خطوة التأكيد
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId(`cancelClose_${channel.id}`).setLabel("Cancel").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`confirmClose_${channel.id}`).setLabel("Confirm").setStyle(ButtonStyle.Danger)
                );
            await interaction.reply({ content: "Are you sure you want to close this ticket?", components: [row], ephemeral: true });
        }

        // ===== Delete with Reason Button =====
        else if (customId.startsWith("delete_")) {
            if (!user.roles.cache.has(STAFF_ROLE_ID) && !user.roles.cache.has(ADMIN_ROLE_ID)) return interaction.reply({ content: "You don't have permission.", ephemeral: true });
            await interaction.showModal(new ModalBuilder()
                .setCustomId(`deleteModal_${channel.id}`)
                .setTitle("Delete Ticket")
                .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder()
                    .setCustomId("reason")
                    .setLabel("Reason for deletion")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                ))
            );
        }
    }

    else if (interaction.isModalSubmit()) {
        const { customId, user, channel } = interaction;

        // ===== Middleman Rating Modal =====
        if (customId.startsWith("middleman_rating_")) {
            const stars = interaction.fields.getTextInputValue("stars");
            const comment = interaction.fields.getTextInputValue("comment");
            await registerRating(MIDDLEMAN_RATING_CHANNEL, user.id, stars, comment);
            await interaction.reply({ content: "Your middleman rating has been submitted.", ephemeral: true });
        }

        // ===== Staff Rating Modal =====
        else if (customId.startsWith("staff_rating_")) {
            const stars = interaction.fields.getTextInputValue("stars");
            const comment = interaction.fields.getTextInputValue("comment");
            await registerRating(STAFF_RATING_CHANNEL, user.id, stars, comment);
            await interaction.reply({ content: "Staff rating submitted.", ephemeral: true });
        }

        // ===== Add Member Modal =====
        else if (customId.startsWith("addMemberModal_")) {
            const targetId = interaction.fields.getTextInputValue("userId");
            const member = await interaction.guild.members.fetch(targetId).catch(() => null);
            if (!member) return interaction.reply({ content: "Member not found.", ephemeral: true });
            await channel.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true });
            await sendLog("Add Member", channel, `<@${member.id}>`, `<@${user.id}>`);
            await interaction.reply({ content: `<@${member.id}> has been added to ticket by <@${user.id}>`, ephemeral: false });
        }

        // ===== Delete Ticket Modal =====
        else if (customId.startsWith("deleteModal_")) {
            const reason = interaction.fields.getTextInputValue("reason");
            await sendLog("Delete", channel, `<@${user.id}>`, `<@${user.id}>`, reason);
            await channel.delete();
        }
    }
});

// ==== Bot Login ====
client.login("YOUR_BOT_TOKEN_HERE");

const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, Events } = require('discord.js');
const fs = require('fs');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel]
});

// ============================
// CONFIGURATION - ضع الإيديهات هنا
// ============================
const config = {
    categoryId: '1453943996392013901', // كاتيجوري التكتات
    staffRoleId: '1454199885460144189', // رتبة الإدارة
    adminRoleId: '1453946893053726830', // رتبة الإدارة العليا
    logChannelId: '1453948413963141153', // روم اللوق
    middlemanRatingChannelId: '1472439331443441828', // روم تقييم الوسطاء
    staffRatingChannelId: '1472023428658630686', // روم تقييم الإدارة
    transcriptChannelId: '1472218573710823679', // روم التران سكربت
};

// ============================
// HELPERS
// ============================

// حفظ حالة التكت
let ticketsData = {}; // {guildId: {ticketNumber: {userId, type, channelId, claimedBy}}}

// Generate ticket number
function getNextTicketNumber(guildId) {
    if (!ticketsData[guildId]) ticketsData[guildId] = {};
    let numbers = Object.keys(ticketsData[guildId]).map(n => parseInt(n));
    if (numbers.length === 0) return 346;
    return Math.max(...numbers) + 1;
}

// Save tickets state to file (اختياري)
function saveTickets() {
    fs.writeFileSync('tickets.json', JSON.stringify(ticketsData, null, 4));
}

// Create embed helper
function createTicketEmbed(type, user, reason, additionalText = '') {
    const embed = new EmbedBuilder()
        .setColor(0xFFFFFF)
        .setTitle(type)
        .setDescription(`${additionalText}`)
        .addFields(
            { name: 'Opened by', value: `<@${user.id}>`, inline: true },
            { name: 'Reason', value: reason, inline: true }
        );
    return embed;
}

// ============================
// BUTTONS
// ============================
function getTicketButtons(userId, claimedBy = null) {
    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();

    // ADD
    const addButton = new ButtonBuilder()
        .setCustomId(`add_${userId}`)
        .setLabel('ADD')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('➕');
    row1.addComponents(addButton);

    // CLAIM
    const claimButton = new ButtonBuilder()
        .setCustomId(`claim_${userId}`)
        .setLabel('CLAIM')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🛡️')
        .setDisabled(!!claimedBy);
    row1.addComponents(claimButton);

    // CLOSE
    const closeButton = new ButtonBuilder()
        .setCustomId(`close_${userId}`)
        .setLabel('CLOSE')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒');
    row1.addComponents(closeButton);

    // DELETE WITH REASON
    const deleteButton = new ButtonBuilder()
        .setCustomId(`delete_${userId}`)
        .setLabel('DELETE WITH REASON')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🗑️');
    row2.addComponents(deleteButton);

    return [row1, row2];
}

// ============================
// INTERACTION EVENTS
// ============================
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    const [action, ticketNumber] = interaction.customId.split('_');
    const guildId = interaction.guild.id;

    // Safety check
    if (!ticketsData[guildId] || !ticketsData[guildId][ticketNumber]) {
        return interaction.reply({ content: 'Ticket not found or expired.', ephemeral: true });
    }

    const ticket = ticketsData[guildId][ticketNumber];

    // ============================
    // CLAIM BUTTON
    // ============================
    if (action === 'claim') {
        if (!interaction.member.roles.cache.has(config.staffRoleId)) return;
        ticket.claimedBy = interaction.user.id;
        saveTickets();
        const channel = interaction.channel;

        // Disable claim button for others
        const components = getTicketButtons(ticket.userId, ticket.claimedBy);
        await interaction.update({ components });

        // Send confirmation
        await channel.send(`The ticket has been claimed successfully by <@${interaction.user.id}>`);
    }

    // ============================
    // ADD BUTTON
    // ============================
    if (action === 'add') {
        if (!interaction.member.roles.cache.has(config.staffRoleId)) return;
        const modal = new ModalBuilder()
            .setCustomId(`add_modal_${ticketNumber}`)
            .setTitle('Add User to Ticket');

        const userIdInput = new TextInputBuilder()
            .setCustomId('add_user')
            .setLabel('User ID to add')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(userIdInput);
        modal.addComponents(row);
        await interaction.showModal(modal);
    }

    // ============================
    // CLOSE BUTTON
    // ============================
    if (action === 'close') {
        if (!interaction.member.roles.cache.has(config.staffRoleId)) return;
        // Confirmation modal
        const modal = new ModalBuilder()
            .setCustomId(`close_modal_${ticketNumber}`)
            .setTitle('Close Ticket?');

        const confirmInput = new TextInputBuilder()
            .setCustomId('confirm_close')
            .setLabel('Type CONFIRM to close')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(confirmInput);
        modal.addComponents(row);
        await interaction.showModal(modal);
    }

    // ============================
    // DELETE BUTTON
    // ============================
    if (action === 'delete') {
        if (!interaction.member.roles.cache.has(config.adminRoleId)) return;
        const modal = new ModalBuilder()
            .setCustomId(`delete_modal_${ticketNumber}`)
            .setTitle('Delete Ticket');

        const reasonInput = new TextInputBuilder()
            .setCustomId('delete_reason')
            .setLabel('Reason for deletion')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);
        await interaction.showModal(modal);
    }

    // ============================
    // MODAL SUBMISSIONS
    // ============================
    if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('add_modal_')) {
            const userIdToAdd = interaction.fields.getTextInputValue('add_user');
            const channel = interaction.channel;
            try {
                const memberToAdd = await interaction.guild.members.fetch(userIdToAdd);
                await channel.permissionOverwrites.edit(memberToAdd, { ViewChannel: true });
                await interaction.reply({ content: `<@${memberToAdd.id}> has been added to ticket by <@${interaction.user.id}>`, ephemeral: false });
            } catch (err) {
                await interaction.reply({ content: `Cannot add user: ${err.message}`, ephemeral: true });
            }
        }

        if (interaction.customId.startsWith('close_modal_')) {
            const confirm = interaction.fields.getTextInputValue('confirm_close');
            if (confirm.toLowerCase() !== 'confirm') {
                return interaction.reply({ content: 'Ticket close canceled.', ephemeral: true });
            }
            // Remove channel from user view
            const channel = interaction.channel;
            const ticketNumber = interaction.customId.split('_')[2];
            await channel.permissionOverwrites.edit(ticket.userId, { ViewChannel: false });
            await interaction.reply({ content: `Ticket closed by <@${interaction.user.id}>`, ephemeral: false });
        }

        if (interaction.customId.startsWith('delete_modal_')) {
            const reason = interaction.fields.getTextInputValue('delete_reason');
            const channel = interaction.channel;
            await channel.delete(`Deleted by ${interaction.user.id} | Reason: ${reason}`);
            delete ticketsData[guildId][ticketNumber];
            saveTickets();
        }
    }
});

// ============================
// BOT READY
// ============================
client.once(Events.ClientReady, () => {
    console.log(`Bot is ready as ${client.user.tag}`);
});

client.login('YOUR_BOT_TOKEN');
