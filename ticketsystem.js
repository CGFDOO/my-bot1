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
            const mainEmbed = new EmbedBuilder()
                .setColor("#000000")
                .setTitle("🛡️ مركز العمليات والدعم | MNC COMMUNITY")
                .setThumbnail(message.guild.iconURL({ size: 256 }))
                .setDescription(
                    "**مرحباً بك في نظام التذاكر المطور.**\n\n" +
                    "**📜 القوانين والتعليمات:**\n" +
                    "• يمنع فتح التذاكر بغرض العبث أو الاستهبال.\n" +
                    "• يرجى شرح طلبك بوضوح داخل النافذة التي ستظهر لك.\n" +
                    "• الاحترام شرط أساسي، وسيتم أرشفة المحادثات للرجوع إليها.\n" +
                    "• المنشن العشوائي للإدارة قد يؤدي لإغلاق تذكرتك فوراً.\n\n" +
                    "**الرجاء اختيار القسم المناسب لبدء المعاملة:**"
                )
                .addFields(
                    { name: "🛠️ قسم الدعم الفني", value: "للمشاكل التقنية والبرمجية داخل السيرفر.", inline: false },
                    { name: "🤝 قسم الوساطة الآمنة", value: "لإتمام عمليات التريد والتبادل بضمان الإدارة.", inline: false },
                    { name: "🎁 قسم الجوائز والهدايا", value: "خاص باستلام مكافآت الفعاليات والمسابقات.", inline: false },
                    { name: "⚠️ قسم البلاغات", value: "لتقديم شكوى رسمية للإدارة العليا.", inline: false }
                )
                .setFooter({ text: "Security System - MNC Community Management", iconURL: message.guild.iconURL() });

            const row = new ActionRowBuilder().addComponents(
                new
                ButtonBuilder().setCustomId('open_tech').setLabel('دعم فني').setStyle(ButtonStyle.Primary).setEmoji('🛠️'),
                new ButtonBuilder().setCustomId('open_mid').setLabel('طلب وسيط').setStyle(ButtonStyle.Success).setEmoji('🤝'),
                new ButtonBuilder().setCustomId('open_gift').setLabel('استلام هدايا').setStyle(ButtonStyle.Secondary).setEmoji('🎁'),
                new ButtonBuilder().setCustomId('open_report').setLabel('شكوى إداري').setStyle(ButtonStyle.Danger).setEmoji('⚠️')
            );

            await
                message.channel.send({ embeds: [mainEmbed], components: [row] });
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        const { customId, guild, channel, user, member } = interaction;

        if (interaction.isButton() && customId.startsWith('open_')) {
            const type = customId.split('_')[1];
            const modal = new ModalBuilder().setCustomId(`modal_${type}`).setTitle('Information Needed');
            const input = new TextInputBuilder()
                .setCustomId('q')
                .setLabel(type === 'mid' ? "يوزر الشخص اللي بتسوي معه تريد؟" : "اشرح طلبك أو مشكلتك بالتفصيل؟")
                .setPlaceholder("اكتب هنا...")
                .setStyle(type === 'mid' ? TextInputStyle.Short : TextInputStyle.Paragraph)
                .setRequired(true
                             );

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return await interaction.showModal(modal);
        }

        if (interaction.isButton()) {
            if (customId === 'claim_sys') {
                if (!member.roles.cache.has(CONFIG.HIGHER_ADMIN) && !member.roles.cache.has(CONFIG.LOWER_ADMIN)) return interaction.reply({ content: "للإدارة فقط!", ephemeral: true });
                
                // إخفاء التيكت عن باقي الإدارة المساعدة
                await channel.permissionOverwrites.edit(CONFIG.LOWER_ADMIN, { ViewChannel: false });
                await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });

                const claimRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('clmd').setLabel(`Claimed by ${user.username}`).setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('add_u_sys').setLabel('Add User').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
                    new ButtonBuilder().setCustomId('close_init').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );
                return await interaction.update({ components: [claimRow] });
            }

            if (customId === 'add_u_sys') {
                const modal = new ModalBuilder().setCustomId('modal_add_u').setTitle('Add User');
                const input = new TextInputBuilder().setCustomId('uid').setLabel("User ID").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }

            if (customId === 'close_init') {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('f_close').setLabel('Confirm Close').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('c_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
                );
                return await interaction.reply({ content: "**⚠️ هل أنت متأكد من قفل التذكرة؟**", components: [row], ephemeral: true });
            }

            if (customId === 'f_close') {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('del_now').setLabel('Delete Now').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('del_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Secondary)
                );
                return await interaction.reply({ embeds: [new EmbedBuilder().setColor("Red").setDescription("🔒 **تم قفل التذكرة. حدد نوع الحذف:**")], components: [row] });
            }

            if (customId === 'del_now') return finalize(channel, user, "بدون سبب", client, CONFIG);

            if (customId === 'del_reason') {
                const modal = new ModalBuilder().setCustomId('modal_del_r').setTitle('Delete Reason');
                const input = new TextInputBuilder().setCustomId('r').setLabel("السبب").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }
        }

        if (interaction.isModalSubmit()) {
            if (customId === 'modal_add_u') {
                const id = interaction.fields.getTextInputValue('uid');
                await channel.permissionOverwrites.edit(id, { ViewChannel: true, SendMessages: true });
                return await interaction.reply({ content: `✅ تمت إضافة <@${id}>.` });
            }

            if (customId === 'modal_del_r') {
                return finalize(channel, user, interaction.fields.getTextInputValue('r'), client, CONFIG);
            }

            if
                (customId.startsWith('modal_')) {
                const reason = interaction.fields.getTextInputValue('q');
                    const type = customId.split('_')[1];
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
                    .setTitle(type === 'mid' ? "🤝 تذكرة طلب وسيط" : "🛠️ تذكرة الدعم الفني")
                    .setColor("#2f3136")
                    .setDescription(
                        type === 'mid' ? `شكراً لطلب وسيط لعملية تريد.\n• تأكد أن الطرف الآخر جاهز وموجود قبل البدء.\n• **البيانات:** ${reason}` 
                        : `شكراً لفتح تذكرة الدعم الفني.\n• يرجى شرح مشكلتك بوضوح وارفق الأدلة إن وجدت.\n• **البيانات:** ${reason}`
                    )
                    .setFooter({ text: "MNC Management" });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('claim_sys').setLabel('Claim').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('close_init').setLabel('Close').setStyle(ButtonStyle.Danger)
                );

                await ticket.send({ content: `حياك الله ${user} | **القسم:** ${type === 'mid' ? 'وساطة' : 'دعم'}`, embeds: [embed], components: [row] });
                return await interaction.reply({ content: `✅ تم فتح تذكرتك: ${ticket}`, ephemeral: true });
            }
        }
    });

    async function finalize(channel, admin, reason, client, config) {
        const ownerId = channel.topic;
        const file = await transcript.createTranscript(channel);
        await client.channels.cache.get(config.TRANSCRIPT_CHANNEL).send({ content: `📦 **السجل الكامل للمحادثة** للعضو <@${ownerId}>`, files: [file] });
        
        const log = new EmbedBuilder().setTitle("🗑️ حذف تذكرة").addFields({ name: "العضو", value: `<@${ownerId}>` }, { name: "الإداري", value: `${admin}` }, { name: "السبب", value: reason }).setColor("Red").setTimestamp();
        await client.channels.cache.get(config.LOG_CHANNEL).send({ embeds: [log] });

        const owner = await client.users.fetch(ownerId).catch(() => null);
        if (owner) {
            const row = new ActionRowBuilder().addComponents([1,2,3,4,5].map(n => new ButtonBuilder().setCustomId(`r_${n}_${admin.id}`).setLabel(`${n} ⭐`).setStyle(ButtonStyle.Primary)));
            await owner.send({ content: "**🌟 MNC COMMUNITY - فضلاً قيم مستوى الخدمة:**", components: [row] }).catch(() => {});
        }
        setTimeout(() => channel.delete().catch(() => {}), 2000);
    }

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
            .setDescription(`**الإداري المقيّم:** <@${adminId}>\n**بواسطة العضو:** ${i.user}\n**التقييم:** ${"⭐".repeat(stars)}\n**التعليق:** ${i.fields.getTextInputValue('t') || "لا يوجد"}`)
            .setTimestamp();
        await client.channels.cache.get(CONFIG.FEEDBACK_CHANNEL).send({ content: `<@${adminId}> | ${i.user}`, embeds: [feed] });
        await i.reply({ content: "✅ شكراً لمشاركتنا رأيك!", ephemeral: true });
    });
};
