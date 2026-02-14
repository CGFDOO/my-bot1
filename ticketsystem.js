const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits, Events 
} = require("discord.js");
const transcript = require('discord-html-transcripts');

module.exports = (client) => {

    // ==========================================
    // ⚙️ ULTIMATE CONFIGURATION (MNC)
    // ==========================================
    const CONFIG = {
        HIGHER_ADMIN: "1453946893053726830", //
        LOWER_ADMIN: "1454199885460144189", //
        LOG_CHANNEL: "1453948413963141153", //
        TRANSCRIPT_CHANNEL: "1472218573710823679", //
        FEEDBACK_CHANNEL: "1472023428658630686", //
        CATEGORY_ID: "1453943996392013901" //
    };

    // 1. نظام إرسال الواجهة (Setup)
    client.on(Events.MessageCreate, async (message) => {
        if (message.content === "!setup-ultra" && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const serverIcon = message.guild.iconURL({ size: 1024 });
            const mainEmbed = new EmbedBuilder()
                .setColor("#000000")
                .setTitle("🛡️ مركز الدعم الفني المطور | MNC COMMUNITY")
                .setThumbnail(serverIcon)
                .setDescription(
                    "**مرحباً بك في نظام التذاكر الأقوى لـ MNC. نرجو اتباع القوانين:**\n\n" +
                    "**1️⃣ يمنع فتح التذاكر العبثية لتجنب الباند.**\n" +
                    "**2️⃣ يرجى كتابة مشكلتك كاملة في النافذة.**\n" +
                    "**3️⃣ الاحترام متبادل بين العضو والإدارة.**\n\n" +
                    "**اختر القسم المناسب لفتح تذكرتك:**"
                )
                .addFields(
                    { name: "🛠️ دعم فني", value: "**لحل المشاكل التقنية.**", inline: true },
                    { name: "🤝 طلب وسيط", value: "**لضمان عمليات التبادل.**", inline: true },
                    { name: "🎁 استلام جائزة", value: "**للمسابقات والفعاليات.**", inline: true },
                    { name: "⚠️ شكوى على إداري", value: "**للبلاغات الرسمية.**", inline: true }
                )
                .setImage(serverIcon)
                .setFooter({ text: "Security & Support System - MNC Community", iconURL: serverIcon });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_tech').setLabel('دعم فني').setEmoji('🛠️').setStyle(ButtonStyle.Primary),
                new
                ButtonBuilder().setCustomId('open_mid').setLabel('طلب وسيط').setEmoji('🤝').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('open_gift').setLabel('استلام جائزة').setEmoji('🎁').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('open_report').setLabel('شكوى على إداري').setEmoji('⚠️').setStyle(ButtonStyle.Danger),
            );

            await message.channel.send({ embeds: [mainEmbed], components: [row] });
        }
    });

    // 2. معالجة التفاعلات (Interactions)
    client.on(Events.InteractionCreate, async (interaction) => {
        
        // --- فتح الـ Modals لجمع البيانات ---
        if (interaction.isButton() && interaction.customId.startsWith('open_')) {
            const type = interaction.customId.split('_')[1];
            const existing = interaction.guild.channels.cache.find(c => c.topic === interaction.user.id);
            if (existing) return interaction.reply({ content: `**⚠️ لديك تذكرة مفتوحة بالفعل: ${existing}**`, ephemeral: true });

            const modal = new ModalBuilder().setCustomId(`modal_${type}`).setTitle('تأكيد بيانات التذكرة');
            const input = new TextInputBuilder()
                .setCustomId('reason_input')
                .setLabel(type === 'report' ? "اذكر تفاصيل الشكوى والإداري" : "اشرح طلبك بالتفصيل")
                .setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(10);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return await
                interaction.showModal(modal);
        }

        // --- التحكم داخل التيكت ---
        if (interaction.isButton()) {
            const { customId, channel, user, member } = interaction;

            if (customId === 'claim_sys') {
                if (!member.roles.cache.has(CONFIG.HIGHER_ADMIN) && !member.roles.cache.has(CONFIG.LOWER_ADMIN)) return interaction.reply({ content: "للإدارة فقط", ephemeral: true });
                await channel.permissionOverwrites.edit(CONFIG.LOWER_ADMIN, { ViewChannel: false });
                await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
                return await interaction.reply({ embeds: [new EmbedBuilder().setColor("Green").setDescription(`**✅ تم استلام التذكرة بواسطة:** ${user}`)] });
            }

            if (customId === 'add_u_sys') {
                const modal = new ModalBuilder().setCustomId('modal_add_u_sys').setTitle('إضافة عضو للتيكت');
                const input = new TextInputBuilder().setCustomId('user_id').setLabel("اكتب ID العضو المُراد إضافته").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }

            if (customId === 'close_req_sys') {
                const confirmRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('del_now_sys').setLabel('Delete Now').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
                    new ButtonBuilder().setCustomId('del_with_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Secondary).setEmoji('📝')
                );
                return await interaction.reply({ content: "**⚠️ هل أنت متأكد؟ اختر نوع الحذف:**", components: [confirmRow], ephemeral: true });
            }

            if (customId === 'del_now_sys') {
                await interaction.reply("جاري الأرشفة والحذف...");
                return processClosure(channel, user, "حذف فوري", client, CONFIG);
            }

            if (customId === 'del_with_reason') {
                const modal = new ModalBuilder().setCustomId('modal_del_reason').setTitle('حذف بذكر السبب');
                const input = new TextInputBuilder().setCustomId('d_reason').setLabel("سبب الحذف").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }
        }

        // --- معالجة الـ Modal Submits ---
        if (interaction.isModalSubmit()) {
            const { customId, fields, guild, user, channel } = interaction;

            if (customId === 'modal_add_u_sys') {
                const target = fields.getTextInputValue('user_id');
                await channel.permissionOverwrites.edit(target, { ViewChannel: true, SendMessages: true });
                return await interaction.reply({ content: `**👤 تمت إضافة <@${target}> بنجاح.**` });
            }

            if (customId === 'modal_del_reason') {
                const reason = fields.getTextInputValue('d_reason');
                await interaction.reply("جاري الأرشفة...");
                return
                processClosure(channel, user, reason, client, CONFIG);
            }

            if (customId.startsWith('modal_')) {
                const info = fields.getTextInputValue('reason_input');
                const type = customId.split('_')[1];
                
                const ticket = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: CONFIG.CATEGORY_ID,
                    topic: user.id,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: CONFIG.HIGHER_ADMIN, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: CONFIG.LOWER_ADMIN, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    ],
                });

                const welcomeEmbed = new EmbedBuilder()
                    .setTitle(`🎫 قسم: ${type === 'report' ? 'شكوى إداري' : 'عام'}`)
                    .setColor("#2f3136")
                    .setThumbnail(guild.iconURL())
                    .setDescription(`**العضو:** ${user}\n**البيانات:**\n\`\`\`${info}\`\`\`\n**نرجو منك الانتظار لحين استلام الإدارة للتذكرة.**`);

                const ctrlRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('add_u_sys').setLabel('Add User').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
                    new ButtonBuilder().setCustomId('claim_sys').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('✅'),
                    new ButtonBuilder().setCustomId('close_req_sys').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
                );

                await
                    ticket.send({ embeds: [welcomeEmbed], components: [ctrlRow] });
                return await interaction.reply({ content: `✅ تم فتح تذكرتك بنجاح: ${ticket}`, ephemeral: true });
            }
        }
    });

    // 3. وظيفة الإغلاق واللوجات والتقييم (The Engine)
    async function processClosure(channel, admin, reason, client, config) {
        const ownerId = channel.topic;
        const file = await transcript.createTranscript(channel);
        
        // أرشفة المحادثة
        const arcChan = client.channels.cache.get(config.TRANSCRIPT_CHANNEL);
        if (arcChan) await arcChan.send({ content: `📦 أرشيف تذكرة العضو: <@${ownerId}>`, files: [file] });

        // لوج البيانات
        const logChan = client.channels.cache.get(config.LOG_CHANNEL);
        if (logChan) {
            const logEmbed = new EmbedBuilder().setTitle("🗑️ تم حذف التذكرة").setColor("Red").addFields({ name: "صاحب التذكرة", value: `<@${ownerId}>`, inline: true }, { name: "المنفذ", value: `${admin}`, inline: true }, { name: "السبب", value: reason }).setTimestamp();
            await logChan.send({ embeds: [logEmbed] });
        }

        // إرسال التقييم
        const owner = await client.users.fetch(ownerId).catch(() => null);
        if (owner) {
            const rateRow = new ActionRowBuilder().addComponents([1,2,3,4,5].map(n => new ButtonBuilder().setCustomId(`final_rate_${n}_${admin.id}`).setLabel(`${n} ⭐`).setStyle(ButtonStyle.Primary)));
            await owner.send({ content: "**🌟 MNC COMMUNITY\nيرجى تقييم مستوى الخدمة التي تلقيتها:**", components: [rateRow] }).catch(() => {});
        }
        setTimeout(() => channel.delete(), 2000);
    }

    // 4. نظام التقييم الذهبي (Feedback Center)
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isButton() || !interaction.customId.startsWith('final_rate_')) return;
        const [_, __, stars, adminId] = interaction.customId.split('_');
        const feedChan = client.channels.cache.get(CONFIG.FEEDBACK_CHANNEL);
        
        if (feedChan) {
            const feedEmbed = new EmbedBuilder()
                .setTitle("🌟 تقييم إداري جديد")
                .setColor("Gold")
                .setThumbnail(interaction.user.avatarURL())
                .setDescription(`**تم تقييم الإداري:** <@${adminId}>\n**بواسطة العضو:** ${interaction.user}\n\n**التقييم المستلم:** ${"⭐".repeat(stars)}`)
                .setTimestamp();
            await feedChan.send({ embeds: [feedEmbed] });
        }
        await interaction.update({ content: "**❤️ شكراً جزيلاً لتقييمك يا بطل!**", components: [] });
    });
};
