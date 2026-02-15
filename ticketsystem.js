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
    tickets = { lastTicketNumber: 345, openTickets: {} };
    fs.writeFileSync(ticketDataFile, JSON.stringify(tickets, null, 4));
}

// IDs الرومات والرتب
const CATEGORY_ID = "1453943996392013901";
const STAFF_ROLE = "1454199885460144189"; // إدارة صغرى
const HIGH_STAFF_ROLE = "1453946893053726830"; // إدارة عليا

// ---------- Emojis لأزرار التكت الأساسي ----------
const TICKET_BUTTON_EMOJIS = {
    Middleman: "🛡️",
    Support: "🛠️",
    Gift: "🎁",
    ReportAdmin: "⚠️",
    Creator: "📝"
};

// ---------- الوظائف ----------
function saveTickets() {
    fs.writeFileSync(ticketDataFile, JSON.stringify(tickets, null, 4));
}

async function createTicket(interaction, type) {
    const member = interaction.user;
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
            { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
            { id: STAFF_ROLE, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
            { id: HIGH_STAFF_ROLE, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
        ]
    });

    tickets.openTickets[ticketChannel.id] = { id: ticketChannel.id, ownerId: member.id, type: type, number: ticketNumber, claimedBy: null };
    saveTickets();

    // ---------- الترحيب ----------
    await ticketChannel.send({ content: `حياك الله <@${member.id}>\nREASON: ${type}` });

    // ---------- الإيمبد ----------
    let description = "";
    switch(type) {
        case "Middleman":
            description = "هذا القسم مخصص لطلب الوسيط لعملية تريد داخل السيرفر\n・تأكد أن الطرف الاخر جاهز و متواجد قبل فتح التذكرة\n・رجاء عدم فتح اكثر من تذكرة أو ازعاج الفريق بالتذكُرة المتكررة\n・تحقق من درجة الوسيط حيث أن كل لكل مستوي أمان مختلف\n・اكتب المعلومات المطلوبة بدقة في الأسئلة التالية";
            break;
        case "Support":
            description = "شكراً لفتح تذكرة الدعم الفني\n・يرجى شرح شكواك أو مشكلتك أو طلبك بشكل واضح و مفصل قدر الإمكان\n・ارفق اي صور أو روابط أو أدلة تساعدنا على فهم المشكله\n・فريق الدعم سيراجع تذكرتك و يجييك في اسرع وقت ممكن\nيرجى التحلي بالصبر فترتيب الردود يتم على حسب الأولوية و وقت الفتح";
            break;
        case "Gift":
            description = "استلام هدايا - لا توجد نافذة إدخال. فقط رسالة الترحيب أدناه.";
            break;
        case "ReportAdmin":
            description = "شكوى على إداري - لا توجد نافذة إدخال أو مودال. فقط رسالة الترحيب أدناه.";
            break;
        case "Creator":
            description = "تقديم صانع محتوى\n・رابط القنوات.\n・عدد المتابعين والمميزات.";
            break;
    }

    const embed = new EmbedBuilder()
        .setTitle(type === "Middleman" ? "🟣 طلب وسيط" :
                  type === "Support" ? "🔵 تذكرة الدعم الفني" :
                  type === "Gift" ? "🟡 استلام هدايا" :
                  type === "ReportAdmin" ? "🔴 شكوى على إداري" :
                  type === "Creator" ? "🟢 تقديم صانع محتوى" : type)
        .setDescription(description)
        .setColor("White");

    // ---------- أزرار التكت ----------
    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId("add").setLabel("ADD").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("claim").setLabel("CLAIM").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("close").setLabel("CLOSE").setStyle(ButtonStyle.Danger)
        );
    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId("delete").setLabel("DELETE WITH REASON").setStyle(ButtonStyle.Danger)
        );

    await ticketChannel.send({ embeds: [embed], components: [row1, row2] });
    interaction.reply({ content: `✅ Ticket created: ${ticketChannel}`, ephemeral: true });
}

// ---------- التعامل مع الأزرار والمودال ----------
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

        switch(interaction.customId) {
            case "claim":
                if (ticket.claimedBy) return interaction.reply({ content: "❌ Ticket already claimed.", ephemeral: true });
                ticket.claimedBy = member.id;
                saveTickets();
                channel.permissionOverwrites.edit(STAFF_ROLE, { ViewChannel: false });
                await interaction.update({ content: `The ticket has been claimed successfully by <@${member.id}>` });
                break;
            case "add":
                const modalAdd = new ModalBuilder().setCustomId("addUserModal").setTitle("Add User to Ticket");
                const inputAdd = new TextInputBuilder().setCustomId("userIdInput").setLabel("Enter the User ID to add").setStyle(TextInputStyle.Short).setRequired(true);
                modalAdd.addComponents(new ActionRowBuilder().addComponents(inputAdd));
                await interaction.showModal(modalAdd);
                break;
            case "close":
                const modalClose = new ModalBuilder().setCustomId("closeConfirm").setTitle("Confirm Close Ticket");
                const inputClose = new TextInputBuilder().setCustomId("confirmInput").setLabel("Type CONFIRM to close the ticket").setStyle(TextInputStyle.Short).setRequired(true);
                modalClose.addComponents(new ActionRowBuilder().addComponents(inputClose));
                await interaction.showModal(modalClose);
                break;
            case "delete":
                const modalDelete = new ModalBuilder().setCustomId("deleteModal").setTitle("Delete Ticket with Reason");
                const inputDelete = new TextInputBuilder().setCustomId("deleteReasonInput").setLabel("Enter reason for deletion").setStyle(TextInputStyle.Paragraph).setRequired(true);
                modalDelete.addComponents(new ActionRowBuilder().addComponents(inputDelete));
                await interaction.showModal(modalDelete);
                break;
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

// ---------- Part 2: Ratings, Logs, Transcripts ----------

const MIDDLEMAN_RATING_CHANNEL_ID = "1472439331443441828";
const STAFF_RATING_CHANNEL_ID = "1472023428658630686";
const LOGS_CHANNEL_ID = "1453948413963141153";
const TRANSCRIPT_CHANNEL_ID = "1472218573710823679";

// ---------- Functions for Ratings ----------
async function sendMiddlemanRating(ticket) {
    const user1 = await client.users.fetch(ticket.ownerId);
    const user2 = await client.users.fetch(ticket.otherPartyId || ticket.claimedBy);
    if (!user1 || !user2) return;

    const embed = new EmbedBuilder()
        .setTitle("🟣 Middleman Rating")
        .setDescription("⭐ Please rate your experience with the middleman.\n📝 Optional comment is allowed.")
        .setColor("Purple");

    await user1.send({ embeds: [embed] });
    await user2.send({ embeds: [embed] });

    ticket.middlemanRated = false;
    saveTickets();
}

async function sendStaffRating(ticket) {
    const user = await client.users.fetch(ticket.ownerId);
    if (!user) return;

    const embed = new EmbedBuilder()
        .setTitle("🔵 Staff Rating")
        .setDescription("⭐ Please rate the staff support.\n📝 Optional comment allowed.")
        .setColor("Blue");

    await user.send({ embeds: [embed] });
    ticket.staffRated = false;
    saveTickets();
}

// ---------- Logging ----------
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

// ---------- Transcript ----------
async function createTranscript(ticket) {
    const transcriptChannel = await client.channels.fetch(TRANSCRIPT_CHANNEL_ID);
    if (!transcriptChannel) return;

    const messages = await client.channels.cache.get(ticket.id)?.messages.fetch({ limit: 100 }) || [];
    let transcriptText = `--- Transcript for ${ticket.id} ---\n`;

    messages.forEach(msg => {
        transcriptText += `[${msg.author.tag}] ${msg.content}\n`;
    });

    const transcriptFile = path.join(__dirname, `transcripts/${ticket.id}.txt`);
    fs.writeFileSync(transcriptFile, transcriptText);

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
                await channel.permissionOverwrites.edit(ticket.ownerId, { ViewChannel: false });
                await interaction.reply({ content: `✅ Ticket closed successfully.`, ephemeral: true });

                // إرسال التقييم
                await sendStaffRating(ticket);
                if (ticket.type === "Middleman") await sendMiddlemanRating(ticket);

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
                channel.permissionOverwrites.edit(STAFF_ROLE, { ViewChannel: false });
                await interaction.update({ content: `The ticket has been claimed successfully by <@${member.id}>` });
                await sendLog("Claim", ticket, member.id);
                break;

            case "add":
                // فتح المودال لإضافة مستخدم
                break;

            case "delete":
                // فتح المودال لحفظ reason
                break;
        }
    }
});

// ---------- Part 4: Ticket Buttons & Interaction Handling Continued ----------

// Buttons لكل نوع تكت مع الإيموجيات الجديدة
const ticketButtonsPart4 = {
    add: new ButtonBuilder()
        .setCustomId("add")
        .setLabel("ADD")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("➕"),

    claim: new ButtonBuilder()
        .setCustomId("claim")
        .setLabel("CLAIM")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅"),

    close: new ButtonBuilder()
        .setCustomId("close")
        .setLabel("CLOSE")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔒"),

    delete: new ButtonBuilder()
        .setCustomId("delete")
        .setLabel("DELETE WITH REASON")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️")
};

// Action Rows
const actionRow1Part4 = new ActionRowBuilder().addComponents([ticketButtonsPart4.add, ticketButtonsPart4.claim, ticketButtonsPart4.close]);
const actionRow2Part4 = new ActionRowBuilder().addComponents([ticketButtonsPart4.delete]);

// ---------- Interaction Handling for All Ticket Types ----------

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    const ticket = tickets.openTickets[interaction.channelId];
    if (!ticket) return;

    const member = interaction.user;
    const channel = interaction.channel;

    if (interaction.isButton()) {
        switch (interaction.customId) {
            case "claim":
                if (ticket.claimedBy) return interaction.reply({ content: "❌ Ticket already claimed.", ephemeral: true });
                ticket.claimedBy = member.id;
                saveTickets();
                // اخفاء باقي الإدارة العادية
                channel.permissionOverwrites.edit(STAFF_ROLE, { ViewChannel: false });
                await interaction.update({ content: `The ticket has been claimed successfully by <@${member.id}>` });
                await sendLog("Claim", ticket, member.id);
                break;

            case "add":
                const addModal = new ModalBuilder().setCustomId("addUserModal").setTitle("Add User to Ticket");
                const userInput = new TextInputBuilder()
                    .setCustomId("userIdInput")
                    .setLabel("Enter the User ID to add")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                addModal.addComponents(new ActionRowBuilder().addComponents(userInput));
                await interaction.showModal(addModal);
                break;

            case "close":
                const closeModal = new ModalBuilder().setCustomId("closeConfirm").setTitle("Confirm Close Ticket");
                const confirmInput = new TextInputBuilder()
                    .setCustomId("confirmInput")
                    .setLabel("Type CONFIRM to close the ticket")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                closeModal.addComponents(new ActionRowBuilder().addComponents(confirmInput));
                await interaction.showModal(closeModal);
                break;

            case "delete":
                const deleteModal = new ModalBuilder().setCustomId("deleteModal").setTitle("Delete Ticket with Reason");
                const reasonInput = new TextInputBuilder()
                    .setCustomId("deleteReasonInput")
                    .setLabel("Enter reason for deletion")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);
                deleteModal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                await interaction.showModal(deleteModal);
                break;
        }
    }

    if (interaction.isModalSubmit()) {
        switch (interaction.customId) {
            case "addUserModal":
                const userId = interaction.fields.getTextInputValue("userIdInput");
                const memberToAdd = interaction.guild.members.cache.get(userId);
                if (!memberToAdd) return interaction.reply({ content: "❌ Invalid User ID.", ephemeral: true });
                await interaction.channel.permissionOverwrites.edit(memberToAdd.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
                await interaction.reply({ content: `<@${memberToAdd.id}> has been added to ticket by <@${interaction.user.id}>`, ephemeral: false });
                await sendLog("Add User", ticket, member.id, `Added <@${memberToAdd.id}>`);
                break;

            case "closeConfirm":
                const confirmText = interaction.fields.getTextInputValue("confirmInput");
                if (confirmText.toUpperCase() === "CONFIRM") {
                    // اخفاء التكت من العضو
                    await channel.permissionOverwrites.edit(ticket.ownerId, { ViewChannel: false });
                    await interaction.reply({ content: `✅ Ticket closed successfully.`, ephemeral: true });

                    // إرسال التقييم التلقائي
                    await sendStaffRating(ticket);

                    // Log Close
                    await sendLog("Close", ticket, member.id);

                    // إنشاء Transcript
                    await createTranscript(ticket);
                } else {
                    await interaction.reply({ content: "❌ Close cancelled.", ephemeral: true });
                }
                break;

            case "deleteModal":
                const reason = interaction.fields.getTextInputValue("deleteReasonInput");
                await interaction.reply({ content: `🗑️ Ticket deleted. Reason: ${reason}`, ephemeral: true });
                await interaction.channel.delete().catch(console.error);
                delete tickets.openTickets[interaction.channelId];
                saveTickets();
                break;
        }
    }
});

// ---------- Part 5: Sending Ratings After Ticket Close ----------

async function sendMiddlemanRating(ticket) {
    try {
        const user1 = await client.users.fetch(ticket.ownerId);
        const user2 = ticket.otherPartyId ? await client.users.fetch(ticket.otherPartyId) : ticket.claimedBy ? await client.users.fetch(ticket.claimedBy) : null;
        if (!user1) return;

        const embed = new EmbedBuilder()
            .setTitle("🛡️ **تقييم الوسيط / Middleman Rating**")
            .setDescription("**⭐ من فضلك قيم تجربتك مع الوسيط**\nPlease rate your experience with the middleman.\n**📝 التعليق اختياري / Optional comment allowed**")
            .setColor("Purple");

        await user1.send({ embeds: [embed] });
        if (user2) await user2.send({ embeds: [embed] });

        ticket.middlemanRated = false;
        saveTickets();
    } catch (err) {
        console.error("Error sending middleman rating:", err);
    }
}

async function sendStaffRating(ticket) {
    try {
        const user = await client.users.fetch(ticket.ownerId);
        if (!user) return;

        const embed = new EmbedBuilder()
            .setTitle("🛠️ **تقييم الدعم الفني / Staff Rating**")
            .setDescription("**⭐ من فضلك قيم تجربة الدعم الفني**\nPlease rate your support experience.\n**📝 التعليق اختياري / Optional comment allowed**")
            .setColor("Blue");

        await user.send({ embeds: [embed] });
        ticket.staffRated = false;
        saveTickets();
    } catch (err) {
        console.error("Error sending staff rating:", err);
    }
}

// ---------- Close Ticket Handler Updated ----------
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isModalSubmit() && !interaction.isButton()) return;
    const ticket = tickets.openTickets[interaction.channelId];
    if (!ticket) return;

    const member = interaction.user;
    const channel = interaction.channel;

    if (interaction.isModalSubmit() && interaction.customId === "closeConfirm") {
        const confirmText = interaction.fields.getTextInputValue("confirmInput");
        if (confirmText.toUpperCase() === "CONFIRM") {
            await channel.permissionOverwrites.edit(ticket.ownerId, { ViewChannel: false });
            await interaction.reply({ content: `✅ **تم غلق التكت بنجاح / Ticket closed successfully.**`, ephemeral: true });

            // ---------- إرسال التقييمات ----------
            await sendStaffRating(ticket);
            if (ticket.type === "Middleman") await sendMiddlemanRating(ticket);

            // ---------- Logs ----------
            const logChannel = await client.channels.fetch(LOGS_CHANNEL_ID);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle(`📜 Ticket Log - Close`)
                    .setColor("Orange")
                    .addFields(
                        { name: "Ticket", value: `<#${ticket.id}>` },
                        { name: "Action By", value: `<@${member.id}>` },
                        { name: "Ticket Type", value: ticket.type },
                        { name: "Owner", value: `<@${ticket.ownerId}>` }
                    );
                await logChannel.send({ embeds: [embed] });
            }

            // ---------- إنشاء Transcript ----------
            const transcriptChannel = await client.channels.fetch(TRANSCRIPT_CHANNEL_ID);
            if (transcriptChannel) {
                const messages = await channel.messages.fetch({ limit: 100 });
                let transcriptText = `--- Transcript for ${ticket.id} ---\n`;
                messages.forEach(msg => {
                    transcriptText += `[${msg.author.tag}] ${msg.content}\n`;
                });
                const transcriptFile = path.join(__dirname, `transcripts/${ticket.id}.txt`);
                fs.writeFileSync(transcriptFile, transcriptText);
                await transcriptChannel.send({ content: `Transcript for <#${ticket.id}>`, files: [transcriptFile] });
            }
        } else {
            await interaction.reply({ content: "❌ **تم إلغاء الغلق / Close cancelled.**", ephemeral: true });
        }
    }
});

// ---------- Part 6: Handling Add, Delete, and Other Modals Continued ----------

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    const ticket = tickets.openTickets[interaction.channelId];
    if (!ticket) return;

    const member = interaction.user;
    const channel = interaction.channel;

    if (interaction.isModalSubmit()) {
        switch (interaction.customId) {
            case "addUserModal":
                const userIdToAdd = interaction.fields.getTextInputValue("userIdInput");
                const memberToAdd = interaction.guild.members.cache.get(userIdToAdd);
                if (!memberToAdd) return interaction.reply({ content: "❌ **رقم العضو غير صالح / Invalid User ID.**", ephemeral: true });

                await channel.permissionOverwrites.edit(memberToAdd.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    ReadMessageHistory: true
                });

                await interaction.reply({ content: `✅ **تم إضافة العضو <@${memberToAdd.id}> للتكت / User added to ticket by <@${member.id}>**`, ephemeral: false });
                await sendLog("Add User", ticket, member.id, `Added <@${memberToAdd.id}>`);
                break;

            case "deleteModal":
                const reason = interaction.fields.getTextInputValue("deleteReasonInput");
                await interaction.reply({ content: `🗑️ **تم حذف التكت / Ticket deleted. Reason: ${reason}**`, ephemeral: true });
                await channel.delete().catch(console.error);

                delete tickets.openTickets[interaction.channelId];
                saveTickets();
                await sendLog("Delete", ticket, member.id, `Reason: ${reason}`);
                break;
        }
    }

    if (interaction.isButton()) {
        switch (interaction.customId) {
            case "add":
                const addModal = new ModalBuilder()
                    .setCustomId("addUserModal")
                    .setTitle("➕ **إضافة عضو للتكت / Add User to Ticket**");
                const inputAdd = new TextInputBuilder()
                    .setCustomId("userIdInput")
                    .setLabel("ادخل رقم العضو / Enter User ID")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                addModal.addComponents(new ActionRowBuilder().addComponents(inputAdd));
                await interaction.showModal(addModal);
                break;

            case "close":
                const closeModal = new ModalBuilder()
                    .setCustomId("closeConfirm")
                    .setTitle("🔒 **تأكيد غلق التكت / Confirm Close Ticket**");
                const inputClose = new TextInputBuilder()
                    .setCustomId("confirmInput")
                    .setLabel("اكتب CONFIRM لغلق التكت / Type CONFIRM to close ticket")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                closeModal.addComponents(new ActionRowBuilder().addComponents(inputClose));
                await interaction.showModal(closeModal);
                break;

            case "delete":
                const deleteModal = new ModalBuilder()
                    .setCustomId("deleteModal")
                    .setTitle("🗑️ **حذف التكت مع سبب / Delete Ticket with Reason**");
                const inputReason = new TextInputBuilder()
                    .setCustomId("deleteReasonInput")
                    .setLabel("اكتب سبب الحذف / Enter reason for deletion")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true);
                deleteModal.addComponents(new ActionRowBuilder().addComponents(inputReason));
                await interaction.showModal(deleteModal);
                break;

            case "claim":
                if (ticket.claimedBy) return interaction.reply({ content: "❌ **تم المطالبة بالتكت مسبقاً / Ticket already claimed.**", ephemeral: true });
                ticket.claimedBy = member.id;
                saveTickets();

                // اخفاء الإدارة العادية بعد Claim
                channel.permissionOverwrites.edit(STAFF_ROLE, { ViewChannel: false });
                await interaction.update({ content: `✅ **تم المطالبة بالتكت بواسطة <@${member.id}> / Ticket claimed successfully.**` });
                await sendLog("Claim", ticket, member.id);
                break;
        }
    }
});

case "claim":

    const staffRole = interaction.guild.roles.cache.get("1454199885460144189");
    const adminRole = interaction.guild.roles.cache.get("1453946893053726830");

    if(!interaction.member.roles.cache.has(staffRole.id) &&
       !interaction.member.roles.cache.has(adminRole.id))
        return interaction.reply({content:"❌ Only staff can claim tickets.",ephemeral:true});

    if(ticket.claimed)
        return interaction.reply({content:"❌ Ticket already claimed.",ephemeral:true});

    ticket.claimed = true;
    ticket.claimedBy = interaction.user.id;
    saveTickets();

    // Hide from other staff
    interaction.guild.roles.cache.forEach(async role=>{
        if(role.id === staffRole.id){
            await interaction.channel.permissionOverwrites.edit(role.id,{ViewChannel:false});
        }
    });

    await interaction.channel.permissionOverwrites.edit(interaction.user.id,{ViewChannel:true});

    const claimEmbed = new EmbedBuilder()
        .setColor("#ffffff")
        .setDescription(`**The ticket has been claimed successfully by <@${interaction.user.id}>**`);

    await interaction.reply({embeds:[claimEmbed]});

    // disable claim button
    const row = interaction.message.components[0];
    row.components.forEach(btn=>{
        if(btn.customId === "claim") btn.setDisabled(true);
    });

    await interaction.message.edit({components:[row]});

    await sendLog("Claim",ticket,interaction.user.id);

break;
