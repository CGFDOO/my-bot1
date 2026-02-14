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
            const embed = new EmbedBuilder()
                .setColor("#000000")
                .setTitle("🛡️ MNC COMMUNITY | SUPPORT CENTER")
                .setThumbnail(message.guild.iconURL({ size: 256 }))
                .setDescription("**مرحباً بك في مركز الدعم المطور. فضلاً اختر القسم المناسب لبدء المحادثة:**")
                .setFooter({ text: "MNC Management System", iconURL: message.guild.iconURL() });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_tech').setLabel('دعم فني').setStyle(ButtonStyle.Primary).setEmoji('🛠️'),
                new ButtonBuilder().setCustomId('open_mid').setLabel('طلب وسيط').setStyle(ButtonStyle.Success).setEmoji('🤝'),
                new ButtonBuilder().setCustomId('open_gift').setLabel('استلام هدايا').setStyle(ButtonStyle.Secondary).setEmoji('🎁'),
                new ButtonBuilder().setCustomId('open_report').setLabel('شكوى إداري').setStyle(ButtonStyle.Danger).setEmoji('⚠️')
            );

            await message.channel.send({ embeds: [embed], components: [row] });
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        const { customId, guild, channel, user, member } = interaction;

        if (interaction.isButton() && customId.startsWith('open_')) {
            const modal = new ModalBuilder().setCustomId(`modal_${customId.split('_')[1]}`).setTitle('تفاصيل التذكرة');
            const input = new
                TextInputBuilder().setCustomId('q').setLabel("اكتب استفسارك أو طلبك هنا").setStyle(TextInputStyle.Paragraph).setRequired(true);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return await interaction.showModal(modal);
        }

        if (interaction.isButton()) {
            if (customId === 'claim_sys') {
                if (!member.roles.cache.has(CONFIG.HIGHER_ADMIN) && !member.roles.cache.has(CONFIG.LOWER_ADMIN)) return interaction.reply({ content: "للإدارة فقط", ephemeral: true });
                
                await channel.permissionOverwrites.edit(CONFIG.LOWER_ADMIN, { ViewChannel: false });
                await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });

                const claimedRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('claimed').setLabel(`مستلمة بواسطة ${user.username}`).setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('add_u').setLabel('إضافة عضو').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
                    new ButtonBuilder().setCustomId('close_init').setLabel('إغلاق').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );
                return await interaction.update({ components: [claimedRow] });
            }

            if (customId === 'add_u') {
                const modal = new ModalBuilder().setCustomId('modal_add').setTitle('إضافة مستخدم');
                const input = new TextInputBuilder().setCustomId('uid').setLabel("ID المستخدم").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }

            if (customId === 'close_init') {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('confirm_close').setLabel('تأكيد الإغلاق').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('cancel_close').setLabel('إلغاء').setStyle(ButtonStyle.Secondary)
                );
                return await interaction.reply({ content: "**⚠️ هل أنت متأكد من رغبتك في إغلاق هذه التذكرة؟**", components: [row], ephemeral: true });
            }

            if (customId === 'cancel_close') return await interaction.update({ content: "**❌ تم إلغاء عملية الإغلاق.**", components: [] });

            if (customId === 'confirm_close') {
                const delRow = new ActionRowBuilder().addComponents(
                    new
                    ButtonBuilder().setCustomId('final_delete').setLabel('حذف نهائي وأرشفة').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
                );
                return await interaction.reply({ content: "🔒 **تم إغلاق التذكرة. اضغط للحذف والأرشفة.**", components: [delRow] });
            }

            if (customId === 'final_delete') {
                await interaction.reply("جاري تنفيذ الأرشفة والحذف...");
                return archiveAndFinish(channel, user, client, CONFIG);
            }
        }

        if (interaction.isModalSubmit()) {
            if (customId === 'modal_add') {
                const target = interaction.fields.getTextInputValue('uid');
                await channel.permissionOverwrites.edit(target, { ViewChannel: true, SendMessages: true });
                return await interaction.reply({ content: `✅ تمت إضافة العضو <@${target}> بنجاح.` });
            }

            if (customId.startsWith('modal_')) {
                const reason = interaction.fields.getTextInputValue('q');
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

                const embed = new EmbedBuilder()
                    .setTitle(`🎫 تذكرة جديدة #${id}`)
                    .setThumbnail(guild.iconURL({ size: 128 }))
                    .setDescription(`**صاحب التذكرة:** ${user}\n**البيانات:**\n\`\`\`${reason}\`\`\``)
                    .setColor("#2f3136")
                    .setFooter({ text: "MNC Management" });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('claim_sys').setLabel('استلام').setStyle(ButtonStyle.Success).setEmoji('✅'),
                    new ButtonBuilder().setCustomId('close_init').setLabel('إغلاق').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await ticket.send({ embeds: [embed], components: [row] });
                return await interaction.reply({ content: `✅ تم فتح تذكرتك #${id}: ${ticket}`, ephemeral: true });
            }
        }
    });

    async function archiveAndFinish(channel, admin, client, config) {
        const ownerId = channel.topic;
        const file = await transcript.createTranscript(channel);
        await
            client.channels.cache.get(config.TRANSCRIPT_CHANNEL).send({ content: `📦 أرشيف تذكرة العضو <@${ownerId}>`, files: [file] });
        
        const logEmbed = new EmbedBuilder()
            .setTitle("🗑️ تم حذف تذكرة")
            .setColor("Red")
            .addFields(
                { name: "العضو", value: `<@${ownerId}>`, inline: true },
                { name: "الإداري", value: `${admin}`, inline: true }
            )
            .setTimestamp();
        await client.channels.cache.get(config.LOG_CHANNEL).send({ embeds: [logEmbed] });

        const owner = await client.users.fetch(ownerId).catch(() => null);
        if (owner) {
            const rateRow = new ActionRowBuilder().addComponents([1,2,3,4,5].map(n => new ButtonBuilder().setCustomId(`r_${n}_${admin.id}`).setLabel(`${n} ⭐`).setStyle(ButtonStyle.Primary)));
            await owner.send({ content: "**🌟 MNC COMMUNITY\nفضلاً قم بتقييم مستوى الخدمة التي تلقيتها:**", components: [rateRow] }).catch(() => {});
        }
        setTimeout(() => channel.delete(), 2000);
    }

    client.on(Events.InteractionCreate, async (i) => {
        if (!i.isButton() || !i.customId.startsWith('r_')) return;
        const [_, stars, adminId] = i.customId.split('_');
        const modal = new ModalBuilder().setCustomId(`fdbk_${stars}_${adminId}`).setTitle('إضافة تعليق');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('txt').setLabel("رأيك في الخدمة").setStyle(TextInputStyle.Short).setRequired(true)));
        await i.showModal(modal);
    });

    client.on(Events.InteractionCreate, async (i) => {
        if (!i.isModalSubmit() || !i.customId.startsWith('fdbk_')) return;
        const [_, stars, adminId] = i.customId.split('_');
        const feedEmbed = new EmbedBuilder()
            .setTitle("🌟 تقييم إداري جديد")
            .setColor("Gold")
            .setThumbnail(i.user.avatarURL())
            .setDescription(`**الإداري:** <@${adminId}>\n**بواسطة العضو:** ${i.user}\n\n**التقييم المستلم:** ${"⭐".repeat(stars)}\n**التعليق:** ${i.fields.getTextInputValue('txt')}`)
            .setTimestamp();
        await client.channels.cache.get(CONFIG.FEEDBACK_CHANNEL).send({ content: `إخطار التقييم: <@${adminId}> | ${i.user}`, embeds: [feedEmbed] });
        await i.reply({ content: "✅ شكرًا لمشاركتنا رأيك، تم إرسال تقييمك بنجاح.", ephemeral: true });
    });
};
