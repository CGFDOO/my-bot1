const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits, Events 
} = require("discord.js");
const transcript = require('discord-html-transcripts');

let ticketCounter = 1; 

module.exports = (client) => {

    const CONFIG = {
        HIGHER_ADMIN: "1453946893053726830", // الرتبة العليا
        LOWER_ADMIN: "1454199885460144189",  // الرتبة المساعدة
        LOG_CHANNEL: "1453948413963141153",   // قناة السجلات الكاملة
        TRANSCRIPT_CHANNEL: "1472218573710823679", // قناة سجل المحادثات
        FEEDBACK_CHANNEL: "1472023428658630686",   // قناة التقييمات
        CATEGORY_ID: "1453943996392013901"         // فئة التذاكر
    };

    // 1. نظام إرسال واجهة التذاكر (Setup)
    client.on(Events.MessageCreate, async (message) => {
        if (message.content === "!setup-ultra" && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const setupEmbed = new EmbedBuilder()
                .setColor("#000000")
                .setTitle("🛡️ MNC COMMUNITY | SUPPORT CENTER")
                .setThumbnail(message.guild.iconURL({ size: 256 }))
                .setDescription("**مرحباً بك في مركز الدعم. اختر القسم المناسب لفتح تذكرة:**");

            const row = new ActionRowBuilder().addComponents(
                new
                ButtonBuilder().setCustomId('open_tech').setLabel('دعم فني').setStyle(ButtonStyle.Primary).setEmoji('🛠️'),
                new ButtonBuilder().setCustomId('open_mid').setLabel('طلب وسيط').setStyle(ButtonStyle.Success).setEmoji('🤝'),
                new ButtonBuilder().setCustomId('open_content').setLabel('صانع محتوى').setStyle(ButtonStyle.Secondary).setEmoji('🎥'),
                new ButtonBuilder().setCustomId('open_report').setLabel('شكوى إداري').setStyle(ButtonStyle.Danger).setEmoji('⚠️')
            );

            await message.channel.send({ embeds: [setupEmbed], components: [row] });
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        const { customId, guild, channel, user, member } = interaction;

        // 2. معالجة فتح النوافذ (Modals)
        if (interaction.isButton() && customId.startsWith('open_')) {
            const type = customId.split('_')[1];
            const modal = new ModalBuilder().setCustomId(`modal_${type}`).setTitle('Information Needed');
            
            if (type === 'mid') {
                const i1 = new TextInputBuilder().setCustomId('u').setLabel("يوزر الشخص الي بتسوي معه تريد؟").setStyle(TextInputStyle.Short).setRequired(true);
                const i2 = new TextInputBuilder().setCustomId('q').setLabel("ما تفاصيل التريد أو العرض والمقابل؟").setStyle(TextInputStyle.Paragraph).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(i1), new ActionRowBuilder().addComponents(i2));
            } else if (type === 'content') {
                const i1 = new TextInputBuilder().setCustomId('q').setLabel("رابط القناة وعدد المتابعين؟").setStyle(TextInputStyle.Paragraph).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(i1));
            } else {
                const i1 = new TextInputBuilder().setCustomId('q').setLabel("اشرح شكواك أو مشكلتك بالتفصيل؟").setStyle(TextInputStyle.Paragraph).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(i1));
            }
            return await interaction.showModal(modal);
        }

        // 3. معالجة الأزرار داخل التيكت
        if (interaction.isButton()) {
            if (customId === 'claim_sys') {
                if (!member.roles.cache.has(CONFIG.HIGHER_ADMIN) && !member.roles.cache.has(CONFIG.LOWER_ADMIN)) return interaction.reply({ content: "Admins only!", ephemeral: true });
                await channel.permissionOverwrites.edit(CONFIG.LOWER_ADMIN, { ViewChannel: false });
                await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
                await channel.setName(`claimed-${channel.name.split('-')[1]}-${channel.name.split('-')[2]}`);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('clmd').setLabel(`Claimed by ${user.username}`).setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('add_u_btn').setLabel('Add User').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('close_req').setLabel('Close').setStyle(ButtonStyle.Danger)
                );
                await interaction.update({ components: [row] });
                await sendLog(guild, CONFIG.LOG_CHANNEL, "Claim Ticket", "#43b581", channel, channel.topic, user);
                return await channel.send({ content: `**✅ The ticket has been claimed successfully by ${user}**` });
            }

            if (customId === 'add_u_btn') {
                const modal = new ModalBuilder().setCustomId('modal_add').setTitle('Add User');
                const input = new TextInputBuilder().setCustomId('uid').setLabel("User ID").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await
                    interaction.showModal(modal);
            }

            if (customId === 'close_req') {
                await channel.setName(`closed-${channel.name.split('-')[1]}-${channel.name.split('-')[2]}`);
                await channel.permissionOverwrites.edit(channel.topic, { ViewChannel: false });
                
                const controlEmbed = new EmbedBuilder()
                    .setTitle("Ticket control")
                    .setColor("#2f3136")
                    .setDescription(`**Closed By:** ${user}\n**(${user.id})**`);

                const row = new ActionRowBuilder().addComponents(
                    new
                    ButtonBuilder().setCustomId('reopen_t').setLabel('Reopen ticket').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('del_t').setLabel('Delete ticket').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('del_reason_t').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
                );
                await sendLog(guild, CONFIG.LOG_CHANNEL, "Close Ticket", "#7289da", channel, channel.topic, user);
                return await interaction.reply({ embeds: [controlEmbed], components: [row] });
            }

            if (customId === 'reopen_t') {
                await channel.permissionOverwrites.edit(channel.topic, { ViewChannel: true });
                await channel.setName(`claimed-${channel.name.split('-')[1]}-${channel.name.split('-')[2]}`);
                return await interaction.reply({ content: "**✅ Ticket Reopened Successfully**" });
            }

            if (customId === 'del_t') {
                await interaction.reply("**🚀 Archiving and deleting...**");
                return finalizeTicket(channel, user, "بدون سبب", client, CONFIG);
            }

            if (customId === 'del_reason_t') {
                const modal = new ModalBuilder().setCustomId('modal_del_r').setTitle('Delete Reason');
                const input = new TextInputBuilder().setCustomId('r').setLabel("السبب").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }
        }

        // 4. معالجة تسليم النوافذ (Modal Submits)
        if (interaction.isModalSubmit()) {
            if (customId === 'modal_add') {
                const id = interaction.fields.getTextInputValue('uid');
                await channel.permissionOverwrites.edit(id, { ViewChannel: true, SendMessages: true });
                return await interaction.reply({ content: `**✅ User <@${id}> has been added successfully by ${user}**` });
            }

            if (customId === 'modal_del_r') {
                return finalizeTicket(channel, user, interaction.fields.getTextInputValue('r'), client, CONFIG);
            }

            if (customId.startsWith('modal_')) {
                const type = customId.split('_')[1];
                const id = ticketCounter++;
                const ticketName = `ticket-${id}-${user.username}`;
                const ticket = await guild.channels.create({
                    name: ticketName,
                    parent: CONFIG.CATEGORY_ID,
                    topic: user.id,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel] },
                        { id: CONFIG.HIGHER_ADMIN, allow: [PermissionFlagsBits.ViewChannel] },
                        { id: CONFIG.LOWER_ADMIN, allow: [PermissionFlagsBits.ViewChannel] },
                    ],
                });

                const welcomeEmbed = new EmbedBuilder().setColor("#2f3136");
                const infoEmbed = new EmbedBuilder().setColor("#2f3136");
                let reasonText = "";

                if (type === 'mid') {
                    welcomeEmbed.setTitle("طلب وسيط").setDescription("هذا القسم مخصص لطلب وسيط لعملية تريد داخل السيرفر.\n• تأكد أن الطرف الآخر جاهز وموجود.\n• تحقق من درجة الوسيط.");
                    infoEmbed.setTitle("يوزر الشخص الي بتسوي معه تريد؟").setDescription(`**${interaction.fields.getTextInputValue('u')}**`);
                    reasonText = interaction.fields.getTextInputValue('q');
                } else if (type === 'content') {
                    welcomeEmbed.setTitle("تقديم صانع محتوى").setDescription("هذا القسم مخصص للتقديم على رتبة صانع محتوى.\n• يرجى إرفاق رابط القناة.\n• سيتم مراجعة طلبك من قبل الإدارة.");
                    infoEmbed.setTitle("رابط القناة وعدد المتابعين؟");
                    reasonText = interaction.fields.getTextInputValue('q');
                } else {
                    welcomeEmbed.setTitle("تذكرة الدعم الفني").setDescription("شكراً لفتح تذكرة الدعم الفني.\n• يرجى شرح شكواك أو مشكلتك بشكل واضح.\n• فريق الدعم سيراجع تذكرتك ويجيبك قريباً.");
                    infoEmbed.setTitle("ما هي مشكلتك أو طلبك بالتفصيل؟");
                    reasonText = interaction.fields.getTextInputValue('q');
                }

                const detailEmbed = new EmbedBuilder().setColor("#2f3136").setDescription(`**${reasonText}**`);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('add_u_btn').setLabel('Add User').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('claim_sys').setLabel('Claim').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('close_req').setLabel('Close').setStyle(ButtonStyle.Danger),
                    new
                    ButtonBuilder().setCustomId('del_reason_t').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
                );

                await ticket.send({ content: `**حياك الله ${user} \nReason: ${type === 'mid' ? 'طلب وسيط' : type === 'content' ? 'صانع محتوى' : 'الدعم الفني'}**`, embeds: [welcomeEmbed, infoEmbed, detailEmbed], components: [row] });
                await sendLog(guild, CONFIG.LOG_CHANNEL, "Open Ticket", "#43b581", ticket, user.id, user);
                return await interaction.reply({ content: `✅ Ticket opened: ${ticket}`, ephemeral: true });
            }
        }
    });

    // 5. وظائف مساعدة (Logs & Finalize)
    async function sendLog(guild, logId, title, color, channel, ownerId, executor) {
        const log = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: "Ticket Channel", value: `${channel}\n(${channel.id})` },
                { name: "Ticket Owned By", value: `<@${ownerId}>\n(${ownerId})` },
                { name: "Executor", value: `${executor}\n(${executor.id})` }
            )
            .setTimestamp();
        await guild.channels.cache.get(logId).send({ embeds: [log] });
    }

    async function finalizeTicket(channel, admin, reason, client, config) {
        const ownerId = channel.topic;
        const file = await transcript.createTranscript(channel);
        await client.channels.cache.get(config.TRANSCRIPT_CHANNEL).send({ content: `**📦 السجل الكامل للمحادثة للعضو <@${ownerId}>**`, files: [file] });
        await sendLog(channel.guild, config.LOG_CHANNEL, "Delete Ticket", "#f04747", channel, ownerId, admin);
        
        const owner = await client.users.fetch(ownerId).catch(() => null);
        if (owner) {
            const row = new ActionRowBuilder().addComponents([1,2,3,4,5].map(n => new ButtonBuilder().setCustomId(`r_${n}_${admin.id}`).setLabel(`${n} ⭐`).setStyle(ButtonStyle.Primary)));
            await owner.send({ content: "**🌟 MNC COMMUNITY - فضلاً قيم الإداري:**", components: [row] }).catch(() => {});
        }
        setTimeout(() => channel.delete().catch(() => {}), 2000);
    }

    // 6. نظام التقييم الاختياري
    client.on(Events.InteractionCreate, async (i) => {
        if (!i.isButton() || !i.customId.startsWith('r_')) return;
        const [_, stars, adminId] = i.customId.split('_');
        const modal = new ModalBuilder().setCustomId(`f_${stars}_${adminId}`).setTitle('تقييم الخدمة');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t').setLabel("تعليق إضافي (اختياري)").setStyle(TextInputStyle.Short).setRequired(false)));
        await i.showModal(modal);
    });

    client.on(Events.InteractionCreate, async (i) => {
        if (!i.isModalSubmit() || !i.customId.startsWith('f_')) return;
        const [_, __, stars, adminId] = i.customId.split('_');
        const feed = new EmbedBuilder()
            .setTitle("🌟 تقييم إداري جديد")
            .setColor("Gold")
            .setDescription(`**تم تقييم الإداري:** <@${adminId}>\n**بواسطة العضو:** ${i.user}\n**التقييم:** ${"⭐".repeat(stars)}\n**التعليق:** ${i.fields.getTextInputValue('t') || "لا يوجد"}`)
            .setTimestamp();
        await client.channels.cache.get(CONFIG.FEEDBACK_CHANNEL).send({ content: `<@${adminId}> | ${i.user}`, embeds: [feed] });
        await i.reply({ content: "✅ شكراً لمشاركتنا رأيك!", ephemeral: true });
    });
};
