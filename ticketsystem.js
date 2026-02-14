const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits, Events 
} = require("discord.js");
const transcript = require('discord-html-transcripts');

module.exports = (client) => {

    // ==========================================
    // ⚙️ ULTIMATE CONFIGURATION (إعدادات السيرفر)
    // ==========================================
    const CONFIG = {
        HIGHER_ADMIN: "1453946893053726830", // رتبة الإدارة العليا
        LOWER_ADMIN: "1454199885460144189", 
        LOG_CHANNEL: "1453948413963141153", //
        TRANSCRIPT_CHANNEL: "1472218573710823679",
        FEEDBACK_CHANNEL: "1472023428658630686",
        CATEGORY_ID: "1453943996392013901", // الكاتيجوري اللي التيكتات هتنزل تحته
    };

    // 1. نظام إرسال الواجهة الرئيسية (Setup)
    client.on(Events.MessageCreate, async (message) => {
        if (message.content === "!setup-ultra" && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const mainEmbed = new EmbedBuilder()
                .setColor("#000000")
                .setTitle("🛡️ مركز الدعم الفني المطور | MNC COMMUNITY")
                .setThumbnail(message.guild.iconURL({ size: 1024 }))
                .setDescription(
                    "**مرحباً بك في نظام تذاكر MNC المتطور. يرجى قراءة القوانين التالية بعناية قبل البدء:**\n\n" +
                    "**1️⃣ يمنع منعاً باتاً فتح تذكرة بدون سبب واضح أو للاستهبال.**\n" +
                    "**2️⃣ يرجى كتابة مشكلتك كاملة في النافذة التي ستظهر لك لضمان سرعة الرد.**\n" +
                    "**3️⃣ الاحترام المتبادل بين العضو والإدارة هو أساس التعامل هنا.**\n" +
                    "**4️⃣ فتح أكثر من تذكرة في نفس الوقت يعرضك للميوت التلقائي.**\n" +
                    "**5️⃣ سيتم أرشفة جميع المحادثات للرجوع إليها عند الحاجة.**\n\n" +
                    "**اختر القسم المناسب لطلبك من الأزرار أدناه:**"
                )
                .addFields(
                    { name: "🛠️ الدعم الفني", value: "**للمشاكل التقنية واستفسارات البوتات.**", inline: true },
                    { name: "🤝 طلب وسيط", value: "**لضمان حقك في عمليات البيع والشراء.**", inline: true },
                    { name: "🎁 الجوائز", value: "**لاستلام هدايا الفعاليات والمسابقات.**", inline: true },
                    { name: "⚠️ الشكاوى", value: "**لتقديم بلاغ رسمي وسري ضد أي تجاوز.**", inline: true }
                )
                .setImage("https://media.discordapp.net/attachments/1111/banner.png") // حط رابط بنر سيرفرك هنا
                .setFooter({ text:

                          "MNC Community Management - Security & Support", iconURL: message.guild.iconURL() });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_tech').setLabel('دعم فني').setEmoji('🛠️').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('open_mid').setLabel('طلب وسيط').setEmoji('🤝').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('open_gift').setLabel('استلام
                                                                      هدية').setEmoji('🎁').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('open_report').setLabel('شكوى').setEmoji('⚠️').setStyle(ButtonStyle.Danger),
            );

            await message.channel.send({ embeds: [mainEmbed], components: [row] });
        }
    });

    // 2. معالجة التفاعلات الذكية (Smart Interaction Handling)
    client.on(Events.InteractionCreate, async (interaction) => {
        
        // --- فتح الـ Modals ---
        if (interaction.isButton() && interaction.customId.startsWith('open_')) {
            const type = interaction.customId.split('_')[1];
            
            // حماية من السبام: التأكد إن العضو معندوش تيكت مفتوحة
            const existing = interaction.guild.channels.cache.find(c => c.topic === interaction.user.id);
            if (existing) return interaction.reply({ content: `**⚠️ لديك تذكرة مفتوحة بالفعل: ${existing}**`, ephemeral: true });

            const modal = new ModalBuilder().setCustomId(`modal_${type}`).setTitle('تأكيد طلب التذكرة');
            const input = new TextInputBuilder()
                .setCustomId('main_info')
                .setLabel(type === 'mid' ? "اكتب يوزر الطرف الثاني وتفاصيل المقايضة" : "اكتب طلبك أو مشكلتك بالتفصيل")
                .setPlaceholder("يرجى كتابة كافة التفاصيل هنا...")
                .setStyle(TextInputStyle.Paragraph).setRequired(true).setMinLength(10);

            modal.addComponents(new ActionRowBuilder().addComponents(input));
            return await interaction.showModal(modal);
        }

        // --- أزرار التحكم داخل التيكت ---
        if (interaction.isButton()) {
            const { customId, channel, user, member } = interaction;

            // نظام الـ Claim المتطور
            if (customId === 'claim_system') {
                if (!member.roles.cache.has(CONFIG.HIGHER_ADMIN) && !member.roles.cache.has(CONFIG.LOWER_ADMIN)) 
                    return interaction.reply({ content: "**❌ هذا الخيار للإدارة فقط.**", ephemeral: true });
                
                await
                  channel.permissionOverwrites.edit(CONFIG.LOWER_ADMIN, { ViewChannel: false });
                await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ManageChannels: true });
                
                const claimEmbed = new EmbedBuilder()
                    .setColor("#00ff00")
                    .setDescription(`**✅ تمت عملية الاستلام بنجاح بواسطة:** ${user}\n**سيقوم الإداري بمتابعة طلبك الآن.**`);
                return await interaction.reply({ embeds: [claimEmbed] });
            }

            // إضافة عضو بـ Modal
            if (customId === 'add_user_system') {
                const modal = new ModalBuilder().setCustomId('modal_add_user_sys').setTitle('إضافة مستخدم للتذكرة');
                const input = new TextInputBuilder().setCustomId('uid').setLabel("ID المستخدم").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }

            // القفل بخطوتين
            if (customId === 'close_system') {
                const confirm = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('confirm_close_sys').setLabel('تأكيد القفل نهائياً').setStyle(ButtonStyle.Danger)
                );
                return await interaction.reply({ content: "**⚠️ هل أنت متأكد من رغبتك في قفل التذكرة؟**", components: [confirm], ephemeral: true });
            }

            if (customId === 'confirm_close_sys') {
                await channel.permissionOverwrites.edit(channel.topic, { SendMessages: false });
                return await interaction.reply({ content: "**🔒 تم قفل التذكرة بنجاح. يمكن للإدارة الآن حذفها بالسبب.**" });
            }

            // الحذف واللوج
            if (customId === 'delete_system') {
                const modal = new ModalBuilder().setCustomId('modal_del_sys').setTitle('أرشفة وحذف التذكرة');
                const input = new TextInputBuilder().setCustomId('del_reason').setLabel("سبب الحذف").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }
        }

        // --- معالجة إرسال النوافذ (Submit Handling) ---
        if (interaction.isModalSubmit()) {
            const { customId, fields, guild, channel, user } = interaction;

            // فتح تيكت جديدة
            if (customId.startsWith('modal_')) {
                const type = customId.split('_')[1];
                const info = fields.getTextInputValue('main_info');
                
                const ticket = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: CONFIG.CATEGORY_ID || null,
                    topic: user.id,
                    permissionOverwrites: [
                        { id: guild.id, deny:
                          [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: CONFIG.HIGHER_ADMIN, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: CONFIG.LOWER_ADMIN, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    ],
                });

                const welcome = new EmbedBuilder()
                    .setTitle(`🎫 قسم: ${type === 'tech' ? 'الدعم الفني' : 'عام'}`)
                    .setColor("#2f3136")
                    .setDescription(
                        `**مرحباً بك يا** ${user}\n\n` +
                        `**تفاصيل طلبك:**\n\`\`\`${info}\`\`\`\n` +
                        "**🛡️ قوانين MNC داخل التذكرة:**\n" +
                        "**• يرجى عدم تكرار الرسائل لضمان الرد السريع.**\n" +
                        "**• سيتم تسجيل كافة البيانات لأغراض الأمان.**\n" +
                        "**• الإداري سيقوم بعمل Claim قريباً لمساعدتك.**"
                    );

                const btns = new ActionRowBuilder().addComponents(
                    new
                  ButtonBuilder().setCustomId('add_user_system').setLabel('Add User').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
                    new ButtonBuilder().setCustomId('claim_system').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('✅'),
                    new ButtonBuilder().setCustomId('close_system').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                    new ButtonBuilder().setCustomId('delete_system').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
                );

                await ticket.send({ content: `${user} | <@&${CONFIG.HIGHER_ADMIN}>`, embeds: [welcome], components: [btns] });
                return await interaction.reply({ content: `**✅ تم إنشاء تذكرتك بنجاح: ${ticket}**`, ephemeral: true });
            }

            // إضافة عضو
            if (customId === 'modal_add_user_sys') {
                const target = fields.getTextInputValue('uid');
                await channel.permissionOverwrites.edit(target, { ViewChannel: true, SendMessages: true });
                return await interaction.reply({ content: `**👤 تمت إضافة العضو <@${target}> بنجاح للتذكرة.**` });
            }

            // الحذف النهائي
            if (customId === 'modal_del_sys') {
                const reason = fields.getTextInputValue('del_reason');
                const ownerId = channel.topic;

                // أرشفة
                const attachment = await transcript.createTranscript(channel);
                const arcChan = client.channels.cache.get(CONFIG.TRANSCRIPT_CHANNEL);
                if (arcChan) await arcChan.send({ content: `**📦 أرشيف تذكرة العضو:** <@${ownerId}>`, files: [attachment] });

                // لوج
                const logChan = client.channels.cache.get(CONFIG.LOG_CHANNEL);
                const logEmbed = new EmbedBuilder()
                    .setTitle("🗑️ سجل حذف التذاكر")
                    .setColor("Red")
                    .addFields(
                        { name: "**صاحب التذكرة**", value: `<@${ownerId}>`, inline: true },
                        { name: "**الإداري المنفذ**", value: `${user}`, inline: true },
                        { name: "**السبب**", value: `**${reason}**` }
                    )
                    .setTimestamp();
                if (logChan) await logChan.send({ embeds: [logEmbed] });

                // تقييم خاص
                const owner = await client.users.fetch(ownerId).catch(() => null);
                if (owner) {
                    const row = new ActionRowBuilder().addComponents(
                        [1,2,3,4,5].map(n => new ButtonBuilder().setCustomId(`rate_${n}_${user.id}`).setLabel(`${n} ⭐`).setStyle(ButtonStyle.Primary))
                    );
                    await owner.send({ content: "**شكراً لتعاملك مع MNC COMMUNITY! نرجو منك تقييم الإداري الذي ساعدك:**", components: [row] }).catch(() => {});
                }

                await interaction.reply("**جاري الحذف والأرشفة...**");
                setTimeout(() => channel.delete(), 2000);
            }
        }
    });

    // 3. استقبال التقييمات (Feedback System)
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isButton() || !interaction.customId.startsWith('rate_')) return;
        const [_, stars, adminId] = interaction.customId.split('_');
        const feedChan = client.channels.cache.get(CONFIG.FEEDBACK_CHANNEL);
        
        const feedEmbed = new EmbedBuilder()
            .setTitle("🌟 تقييم جديد للفريق")
            .setColor("Gold")
            .addFields(
                { name: "**العضو المقيم**", value: `${interaction.user}` },
                { name: "**الإداري**", value: `<@${adminId}>` },
                { name: "**التقييم**", value: `**${stars} / 5 نجوم**` }
            )
            .setTimestamp();

        if (feedChan) await feedChan.send({ embeds: [feedEmbed] });
        await
          interaction.update({ content: "**❤️ شكراً جزيلاً لتقييمك، رأيك يهمنا لتطوير سيرفرنا!**", components: [] });
    });
};
