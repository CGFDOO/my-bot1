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
                .setTitle("🛡️ مركز الدعم الفني | MNC COMMUNITY")
                .setThumbnail(message.guild.iconURL())
                .setDescription(
                    "**مرحباً بك في نظام التذاكر المتطور الخاص بسيرفر MNC.**\n\n" +
                    "**📜 قوانين التذاكر:**\n" +
                    "• يمنع فتح التذاكر لغرض الاستهبال أو تضييع الوقت.\n" +
                    "• يرجى انتظار رد الإدارة وعدم عمل منشن عشوائي.\n" +
                    "• الاحترام المتبادل شرط أساسي لاستمرار التذكرة.\n" +
                    "• يتم أرشفة جميع المحادثات لضمان حقوق الجميع.\n\n" +
                    "**الرجاء اختيار القسم المناسب لطلبك من الأزرار أدناه:**"
                )
                .addFields(
                    { name: "🛠️ دعم فني", value: "للمشاكل البرمجية والتقنية داخل السيرفر.", inline: false },
                    { name: "🤝 طلب وسيط", value: "لإتمام عمليات التبادل والتريد بشكل آمن.", inline: false },
                    { name: "🎁 استلام هدايا", value: "خاص بالفائزين في الفعاليات والمسابقات.", inline: false },
                    { name: "⚠️ شكوى على إداري", value: "لتقديم البلاغات الرسمية للإدارة العليا.", inline: false }
                )
                .setFooter({ text: "MNC Management System - Security & Support", iconURL: message.guild.iconURL() });

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_tech').setLabel('دعم فني').setStyle(ButtonStyle.Primary).setEmoji('🛠️'),
                new ButtonBuilder().setCustomId('open_mid').setLabel('طلب وسيط').setStyle(ButtonStyle.Success).setEmoji('🤝'),
                new ButtonBuilder().setCustomId('open_gift').setLabel('استلام هدايا').setStyle(ButtonStyle.Secondary).setEmoji('🎁'),
                new ButtonBuilder().setCustomId('open_report').setLabel('شكوى إداري').setStyle(ButtonStyle.Danger).setEmoji('⚠️')
            );

            await
                message.channel.send({ embeds: [setupEmbed], components: [buttons] });
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        const { customId, guild, channel, user, member } = interaction;

        // 1. فتح نافذة البيانات (Modal)
        if (interaction.isButton() && customId.startsWith('open_')) {
            const type = customId.split('_')[1];
            const modal = new ModalBuilder().setCustomId(`modal_${type}`).setTitle('بيانات التذكرة');
            const input = new TextInputBuilder()
                .setCustomId('user_reason')
                .setLabel("اشرح طلبك بالتفصيل")
                .setPlaceholder("اكتب هنا كل المعلومات التي تود تزويدنا بها...")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return await interaction.showModal(modal);
        }

        if (interaction.isButton()) {
            // 2. نظام الاستلام الشفاف
            if (customId === 'claim_sys') {
                if (!member.roles.cache.has(CONFIG.HIGHER_ADMIN) && !member.roles.cache.has(CONFIG.LOWER_ADMIN)) return interaction.reply({ content: "للإدارة فقط", ephemeral: true });
                
                await channel.permissionOverwrites.edit(CONFIG.LOWER_ADMIN, { ViewChannel: false });
                await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });

                const claimedRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('clmd').setLabel(`مستلمة بواسطة ${user.username}`).setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('add_u_btn').setLabel('Add User').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
                    new ButtonBuilder().setCustomId('close_req').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );
                return await interaction.update({ components: [claimedRow] });
            }

            // 3. زر إضافة مستخدم
            if (customId === 'add_u_btn') {
                const modal = new ModalBuilder().setCustomId('modal_add_user').setTitle('إضافة عضو للتذكرة');
                const input = new TextInputBuilder().setCustomId('target_id').setLabel("ID المستخدم").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }

            // 4. نظام القفل بـ 3 خطوات
            if (customId === 'close_req') {
                const confirmRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('final_close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
                );
                return await interaction.reply({ content: "**⚠️ هل أنت متأكد من رغبتك في إغلاق هذه التذكرة؟**", components: [confirmRow], ephemeral: true });
            }

            if (customId === 'cancel_close') return await interaction.update({ content: "**❌ تم إلغاء القفل.**", components: [] });

            if (customId === 'final_close') {
                const delRow = new ActionRowBuilder().addComponents(
                    new
                    ButtonBuilder().setCustomId('absolute_delete').setLabel('حذف نهائي وأرشفة').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
                );
                return await interaction.reply({ content: "🔒 **تم قفل التذكرة بنجاح. اضغط أدناه للحذف النهائي.**", components: [delRow] });
            }

            if (customId === 'absolute_delete') {
                await interaction.reply("جاري الأرشفة والحذف...");
                return processTicketEnd(channel, user, client, CONFIG);
            }
        }

        // 5. معالجة الـ Modal Submits
        if (interaction.isModalSubmit()) {
            if (customId === 'modal_add_user') {
                const targetId = interaction.fields.getTextInputValue('target_id');
                await channel.permissionOverwrites.edit(targetId, { ViewChannel: true, SendMessages: true });
                return await interaction.reply({ content: `✅ تمت إضافة العضو <@${targetId}> بنجاح.` });
            }

            if (customId.startsWith('modal_')) {
                const reason = interaction.fields.getTextInputValue('user_reason');
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
                    .setTitle(`🎫 تذكرة جديدة #${id}`)
                    .setColor("#2f3136")
                    .setDescription(`**صاحب التذكرة:** ${user}\n**البيانات المرفقة:**\n\`\`\`${reason}\`\`\``)
                    .setFooter({ text: "MNC Support Team" });

                const controlRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('claim_sys').setLabel('استلام').setStyle(ButtonStyle.Success).setEmoji('✅'),
                    new ButtonBuilder().setCustomId('close_req').setLabel('إغلاق').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await ticket.send({ embeds: [welcomeEmbed], components: [controlRow] });
                return await interaction.reply({ content: `✅ تم فتح تذكرتك بنجاح: ${ticket}`, ephemeral: true });
            }
        }
    });

    async function processTicketEnd(channel, admin, client, config) {
        const ownerId = channel.topic;
        const file = await transcript.createTranscript(channel);
        
        // أرشيف
        await client.channels.cache.get
        (config.TRANSCRIPT_CHANNEL).send({ content: `📦 أرشيف <@${ownerId}>`, files: [file] });
        
        // لوج
        const log = new EmbedBuilder().setTitle("🗑️ تذكرة محذوفة").addFields({ name: "العضو", value: `<@${ownerId}>` }, { name: "الإداري", value: `${admin}` }).setColor("Red").setTimestamp();
        await client.channels.cache.get(config.LOG_CHANNEL).send({ embeds: [log] });

        // تقييم
        const owner = await client.users.fetch(ownerId).catch(() => null);
        if (owner) {
            const row = new ActionRowBuilder().addComponents([1,2,3,4,5].map(n => new ButtonBuilder().setCustomId(`rate_${n}_${admin.id}`).setLabel(`${n} ⭐`).setStyle(ButtonStyle.Primary)));
            await owner.send({ content: "**🌟 MNC COMMUNITY\nكيف كانت تجربة الدعم معك؟ قيمنا من فضلك:**", components: [row] }).catch(() => {});
        }
        setTimeout(() => channel.delete(), 2000);
    }

    client.on(Events.InteractionCreate, async (i) => {
        if (!i.isButton() || !i.customId.startsWith('rate_')) return;
        const [_, stars, adminId] = i.customId.split('_');
        const modal = new ModalBuilder().setCustomId(`fdbk_final_${stars}_${adminId}`).setTitle('إضافة تعليق');
        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('txt').setLabel("رأيك").setStyle(TextInputStyle.Short).setRequired(true)));
        await i.showModal(modal);
    });

    client.on(Events.InteractionCreate, async (i) => {
        if (!i.isModalSubmit() || !i.customId.startsWith('fdbk_final_')) return;
        const [_, __, stars, adminId] = i.customId.split('_');
        const embed = new EmbedBuilder()
            .setTitle("🌟 تقييم جديد")
            .setColor("Gold")
            .setDescription(`**الإداري:** <@${adminId}>\n**العضو:** ${i.user}\n**النجوم:** ${"⭐".repeat(stars)}\n**التعليق:** ${i.fields.getTextInputValue('txt')}`)
            .setTimestamp();
        await client.channels.cache.get(CONFIG.FEEDBACK_CHANNEL).send({ content: `إخطار: <@${adminId}> | ${i.user}`, embeds: [embed] });
        await i.reply({ content: "✅ شكرًا لتقييمك، تم الإرسال.", ephemeral: true });
    });
};
