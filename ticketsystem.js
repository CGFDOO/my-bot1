const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits, Events 
} = require("discord.js");
const transcript = require('discord-html-transcripts');

let ticketCounter = 1; 

module.exports = (client) => {

    const CONFIG = {
        HIGHER_ADMIN: "1453946893053726830",
        LOWER_ADMIN: "1454199885460144189",
        LOG_CHANNEL: "1453948413963141153",
        TRANSCRIPT_CHANNEL: "1472218573710823679",
        FEEDBACK_CHANNEL: "1472023428658630686",
        CATEGORY_ID: "1453943996392013901" 
    };

    client.on(Events.MessageCreate, async (message) => {
        if (message.content === "!setup-ultra" && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const setupEmbed = new EmbedBuilder()
                .setColor("#000000")
                .setTitle("🛡️ MNC COMMUNITY | SUPPORT CENTER")
                .setThumbnail(message.guild.iconURL())
                .setDescription(
                    "**Welcome to our Support Center. Please select the appropriate category below to start.**\n\n" +
                    "**📜 Rules:**\n" +
                    "• Don't open a ticket for no reason.\n" +
                    "• Be patient, we will respond soon.\n" +
                    "• All transcripts are saved for security."
                )
                .setFooter({ text: "MNC Management System", iconURL: message.guild.iconURL() });

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_tech').setLabel('دعم فني').setStyle(ButtonStyle.Primary).setEmoji('🛠️'),
                new ButtonBuilder().setCustomId('open_mid').setLabel('طلب وسيط').setStyle(ButtonStyle.Success).setEmoji('🤝'),
                new ButtonBuilder().setCustomId('open_gift').setLabel('استلام هدايا').setStyle(ButtonStyle.Secondary).setEmoji('🎁'),
                new ButtonBuilder().setCustomId('open_report').setLabel('شكوى إداري').setStyle(ButtonStyle.Danger).setEmoji('⚠️')
            );

            await message.channel.send({ embeds: [setupEmbed], components: [buttons] });
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        const { customId, guild, channel, user, member } = interaction;

        // 1. نافذة طلب البيانات (Modal) عند فتح التيكت
        if (interaction.isButton() && customId.startsWith('open_')) {
            const modal = new ModalBuilder().setCustomId(`modal_${customId.split('_')[1]}`).setTitle('Information Needed');
            const input = new TextInputBuilder()
                .setCustomId('reason')
                .setLabel("What do you need help with?")
                .setPlaceholder("Please provide more details...")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return await interaction.showModal(modal);
        }

        if (interaction.isButton()) {
            // 2. زر الاستلام الشفاف (Claim)
            if (customId === 'claim_sys') {
                if (!member.roles.cache.has(CONFIG.HIGHER_ADMIN) && !member.roles.cache.has(CONFIG.LOWER_ADMIN)) return interaction.reply({ content: "Admins only!", ephemeral: true });
                
                await
                    channel.permissionOverwrites.edit(CONFIG.LOWER_ADMIN, { ViewChannel: false });
                await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });

                const claimedRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('clmd').setLabel(`Claimed by ${user.username}`).setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('add_u_btn').setLabel('Add User').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
                    new ButtonBuilder().setCustomId('close_req').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );
                return await interaction.update({ components: [claimedRow] });
            }

            // 3. زر إضافة مستخدم (Add User)
            if (customId === 'add_u_btn') {
                const modal = new ModalBuilder().setCustomId('modal_add_user').setTitle('Add User to Ticket');
                const input = new TextInputBuilder().setCustomId('target_id').setLabel("User ID").setPlaceholder("Enter the ID here...").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }

            // 4. نظام القفل (Close)
            if (customId === 'close_req') {
                const confirmRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('final_close').setLabel('Confirm Close').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
                );
                return await interaction.reply({ content: "**⚠️ Confirm closing this ticket?**", components: [confirmRow], ephemeral: true });
            }

            if (customId === 'cancel_close') return await interaction.update({ content: "**❌ Canceled.**", components: [] });

            if (customId === 'final_close') {
                const delRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('abs_del').setLabel('Delete & Archive').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
                );
                return await interaction.reply({ content: "🔒 **Ticket Closed. Delete now?**", components: [delRow] });
            }

            if (customId === 'abs_del') {
                await interaction.reply("Archiving and deleting...");
                return finishTicket(channel, user, client, CONFIG);
            }
        }

        if (interaction.isModalSubmit()) {
            // إضافة عضو للتيكت
            if (customId === 'modal_add_user') {
                const targetId = interaction.fields.getTextInputValue('target_id');
                await channel.permissionOverwrites.edit(targetId, { ViewChannel: true, SendMessages: true });
                return await
                    interaction.reply({ content: `✅ <@${targetId}> has been added.` });
            }

            // إنشاء التيكت بالترقيم
            if (customId.startsWith('modal_')) {
                const reason = interaction.fields.getTextInputValue('reason');
                const id = ticketCounter++;
                const ticket = await guild.channels.create({
                    name: `ticket-${id}`,
                    parent: CONFIG.CATEGORY_ID,
                    topic: user.id,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel] },
                        { id: CONFIG.HIGHER_ADMIN, allow: [PermissionFlagsBits.ViewChannel] },
                        { id: CONFIG.LOWER_ADMIN, allow: [PermissionFlagsBits.ViewChannel] },
                    ],
                });

                const welcomeEmbed = new EmbedBuilder()
                    .setTitle(`🎫 Ticket #${id}`)
                    .setColor("#2f3136")
                    .setDescription(`**User:** ${user}\n**Details:**\n\`\`\`${reason}\`\`\``);

                const controlRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('claim_sys').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('✅'),
                    new ButtonBuilder().setCustomId('close_req').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await ticket.send({ embeds: [welcomeEmbed], components: [controlRow] });
                return await interaction.reply({ content: `✅ Ticket opened: ${ticket}`, ephemeral: true });
            }
        }
    });

    async function finishTicket(channel, admin, client, config) {
        const ownerId = channel.topic;
        const file = await
            transcript.createTranscript(channel);
        await client.channels.cache.get(config.TRANSCRIPT_CHANNEL).send({ content: `📦 Archive for <@${ownerId}>`, files: [file] });
        
        const log = new EmbedBuilder().setTitle("🗑️ Ticket Deleted").addFields({ name: "User", value: `<@${ownerId}>` }, { name: "Admin", value: `${admin}` }).setColor("Red").setTimestamp();
        await client.channels.cache.get(config.LOG_CHANNEL).send({ embeds: [log] });

        const owner = await client.users.fetch(ownerId).catch(() => null);
        if (owner) {
            const row = new ActionRowBuilder().addComponents([1,2,3,4,5].map(n => new ButtonBuilder().setCustomId(`rate_${n}_${admin.id}`).setLabel(`${n} ⭐`).setStyle(ButtonStyle.Primary)));
            await owner.send({ content: "**🌟 MNC COMMUNITY - Please rate our service:**", components: [row] }).catch(() => {});
        }
        setTimeout(() => channel.delete(), 2000);
    }

    // نظام التقييم الاختياري
    client.on(Events.InteractionCreate, async (i) => {
        if (!i.isButton() || !i.customId.startsWith('rate_')) return;
        const [_, stars, adminId] = i.customId.split('_');
        const modal = new ModalBuilder().setCustomId(`feed_${stars}_${adminId}`).setTitle('Optional Comment');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('txt').setLabel("Leave a comment (Optional)").setStyle(TextInputStyle.Short).setRequired(false))); // جعلته غير إجباري
        await i.showModal(modal);
    });

    client.on(Events.InteractionCreate, async (i) => {
        if (!i.isModalSubmit() || !i.customId.startsWith('feed_')) return;
        const [_, stars, adminId] = i.customId.split('_');
        const comment = i.fields.getTextInputValue('txt') || "No comment provided.";
        const embed = new EmbedBuilder()
            .setTitle("🌟 New Feedback")
            .setColor("Gold")
            .setDescription(`**Admin:** <@${adminId}>\n**User:** ${i.user}\n**Rating:** ${"⭐".repeat(stars)}\n**Comment:** ${comment}`)
            .setTimestamp();
        await client.channels.cache.get(CONFIG.FEEDBACK_CHANNEL).send({ content: `Feedback for: <@${adminId}>`, embeds: [embed] });
        await i.reply({ content: "✅ Thank you for your feedback!", ephemeral: true });
    });
};
