const { 
    ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, InteractionType, AttachmentBuilder 
} = require('discord.js');
const fs = require('fs');

module.exports = async (client) => {
    // إعدادات المعرفات (IDs) - ثابتة كما طلبت
    const CONFIG = {
        categoryID: '1453943996392013901',
        staffRole: '1454199885460144189',
        adminRole: '1453946893053726830',
        logsChannel: '1453948413963141153',
        transcriptChannel: '1472218573710823679',
        mediatorRatingLog: '1472439331443441828',
        staffRatingLog: '1472023428658630686',
        prefix: ':'
    };

    if (!client.cooldowns) client.cooldowns = new Set();
    if (!client.ticketCounter) client.ticketCounter = 346; // يبدأ من هنا

    // ==========================================
    // 1. أمر الـ Setup لإرسال الايمبد الرئيسي
    // ==========================================
    client.on('messageCreate', async (message) => {
        if (message.content === `${CONFIG.prefix}setup-mnc` && message.member.roles.cache.has(CONFIG.adminRole)) {
            const mainEmbed = new EmbedBuilder()
                .setTitle('📋 قوانين التكت لتجنب أي عقوبات')
                .setDescription(
                    `・ عند فتح تذكرة وعدم كتابة استفسارك أو مشكلتك فورا سيتم حذفها بدون أي تردد\n` +
                    `・ يمنع فتح أكثر من تذكرتين في نفس الوقت النظام سيقوم بحظر التذاكر المكررة تلقائيا\n` +
                    `・ يمنع منشن طاقم الإدارة العليا أو الصغرى الرد يتم حسب الأولوية ووقت فتح التذكرة.\n` +
                    `・ يرجى إرفاق كافة الأدلة الصور المتعلقة بمشكلتك لضمان سرعة الرد وحل المشكلة\n` +
                    `・ أي تجاوز أو إساءة في التعامل مع الفريق الإداري داخل التذكرة يعرضك للعقوبات\n` +
                    `・ تذكرتك لا يراها إلا الطاقم المختص؛ يرجى عدم مشاركة تفاصيل حساسة خارج التذكرة.`
                )
                .setColor('#FFFFFF');

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_mediator').setLabel('طلب وسيط').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_support').setLabel('الدعم فني').setEmoji('🛠️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_gift').setLabel('استلام هدايا').setEmoji('🎁').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_creator').setLabel('صانع محتوى').setEmoji('🎥').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('ticket_admin').setLabel('شكوى إداري').setEmoji('⚠️').setStyle(ButtonStyle.Secondary)
            );

            await message.channel.send({ embeds: [mainEmbed], components: [buttons] });
            message.delete();
        }

        // ==========================================
        // 2. أمر التقييم للوسطاء (:done)
        // ==========================================
        if (message.content === `${CONFIG.prefix}done` && message.channel.name.startsWith('ticket-')) {
            const ticketOwnerID = message.channel.topic;
            const owner = await client.users.fetch(ticketOwnerID).catch(() => null);
            if (owner) {
                const ratingEmbed = new EmbedBuilder()
                    .setTitle('⭐ تقييم خدمة الوساطة')
                    .setDescription('يرجى تقييم تجربة الوساطة الخاصة بك في سيرفر MNC')
                    .setColor('#FFFFFF');
                const stars = new ActionRowBuilder().addComponents(
                    [1, 2, 3, 4, 5].map(s => new ButtonBuilder().setCustomId(`rate_med_${s}`).setLabel(`${s} ⭐`).setStyle(ButtonStyle.Primary))
                );
                owner.send({ embeds: [ratingEmbed], components: [stars] }).catch(() => {});
                message.channel.send('✅ تم إرسال طلب التقييم للطرفين في الخاص.');
            }
        }
    });

    // ==========================================
    // 3. معالجة التفاعلات (Buttons & Modals)
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        const { guild, member, user, customId, channel } = interaction;

        // الحماية من السبام
        if (client.cooldowns.has(user.id)) return;
        client.cooldowns.add(user.id);
        setTimeout(() => client.cooldowns.delete(user.id), 2000);

        // --- فتح التذاكر ---
        if (['ticket_mediator', 'ticket_support', 'ticket_creator'].includes(customId)) {
            const modal = new ModalBuilder().setCustomId(`modal_${customId}`).setTitle('إكمال بيانات التذكرة');
            if (customId === 'ticket_mediator') {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('med_user').setLabel('يوزر الشخص الي بتسوي معه تريد؟').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('med_details').setLabel('ما تفاصيل التريد أو العرض والمقابل؟').setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
            } else if (customId === 'ticket_support') {
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sup_issue').setLabel('ما هي مشكلتك أو طلبك بالتفصيل؟').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            } else if (customId === 'ticket_creator') {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cre_link').setLabel('رابط قنواتك').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('cre_subs').setLabel('عدد المتابعين والمميزات').setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
            }
            return await interaction.showModal(modal);
        }

        // معالجة فتح التذاكر التي لا تحتاج مودال (هدايا / شكوى)
        if (['ticket_gift', 'ticket_admin'].includes(customId)) {
            return await handleTicketCreation(interaction, customId, null);
        }

        // معالجة المودالات
        if (interaction.type === InteractionType.ModalSubmit) {
            if (customId.startsWith('modal_')) return await handleTicketCreation(interaction, customId.replace('modal_', ''), interaction.fields);
            if (customId === 'modal_add') {
                const targetID = interaction.fields.getTextInputValue('user_id');
                const target = await guild.members.fetch(targetID).catch(() => null);
                if (target) {
                    await channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true });
                    await interaction.reply({ content: `<@${target.id}> **has been added to ticket by** <@${user.id}>` });
                }
            }
        }

        // --- أزرار التحكم ---
        if (customId === 'claim_ticket') {
            if (!member.roles.cache.has(CONFIG.staffRole)) return interaction.reply({ content: '❌ للإدارة فقط!', ephemeral: true });
            await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
            await channel.permissionOverwrites.edit(guild.id, { ViewChannel: false }); // إخفاء عن باقي الإدارة
            
            const row = ActionRowBuilder.from(interaction.message.components[0]);
            row.components[1].setDisabled(true); // جعل زر الكليم شفاف
            await interaction.update({ components: [row] });
            await channel.send({ content: `✅ **The ticket as been claimed successfully by** <@${user.id}>` });
        }

        if (customId === 'close_ticket') {
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_close').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );
            return interaction.reply({ content: '❓ **Are you sure you want to close this ticket?**', components: [confirmRow], ephemeral: true });
        }

        if (customId === 'confirm_close') {
            const ownerID = channel.topic;
            await channel.permissionOverwrites.edit(ownerID, { ViewChannel: false }); // يختفي من العضو فوراً
            await interaction.update({ content: '🔒 تم إغلاق التذكرة بنجاح.', components: [] });
            
            // إرسال تقييم الإدارة للعضو تلقائياً
            const staffRateEmbed = new EmbedBuilder().setTitle('⭐ تقييم الإدارة').setDescription('يرجى تقييم أداء الإداري الذي ساعدك.').setColor('#FFFFFF');
            const stars = new ActionRowBuilder().addComponents([1, 2, 3, 4, 5].map(s => new ButtonBuilder().setCustomId(`rate_staff_${s}`).setLabel(`${s} ⭐`).setStyle(ButtonStyle.Primary)));
            const owner = await client.users.fetch(ownerID).catch(() => null);
            if (owner) owner.send({ embeds: [staffRateEmbed], components: [stars] }).catch(() => {});

            const deleteButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary)
            );
            await channel.send({ content: `**Ticket Closed By:** <@${user.id}>`, components: [deleteButtons] });
        }
    });

    // دالة إنشاء التذكرة
    async function handleTicketCreation(interaction, type, fields) {
        const { guild, user } = interaction;
        const ticketNum = client.ticketCounter++;
        const channel = await guild.channels.create({
            name: `ticket-${ticketNum}-${user.username}`,
            parent: CONFIG.categoryID,
            topic: user.id,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: CONFIG.staffRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        await interaction.reply({ content: `✅ تم فتح تذكرتك بنجاح في ${channel}`, ephemeral: true });
        
        const typeLabels = { 'ticket_mediator': 'طلب وسيط', 'ticket_support': 'الدعم الفني', 'ticket_gift': 'استلام هدايا', 'ticket_creator': 'تقديم على صانع محتوى', 'ticket_admin': 'شكوى على إداري' };
        await channel.send({ content: `**حياك الله** <@${user.id}>\n**Reason:** ${typeLabels[type]}` });

        const embed = new EmbedBuilder().setColor('#FFFFFF').setTimestamp();
        if (type === 'ticket_mediator') {
            embed.setTitle('🛡️ طلب وسيط').setDescription(`هذا القسم مخصص لطلب الوسيط لعملية تريد داخل السيرفر\n・تأكد أن الطرف الآخر جاهز و متواجد قبل فتح التذكرة\n・رجاء عدم فتح أكثر من تذكرة أو ازعاج الفريق بالتذكرو المتكرره\n・تحقق من درجة الوسيط حيث أن كل لكل مستوي أمان مختلف\n・اكتب المعلومات المطلوبة بدقة في الاسئلة التالية`)
                 .addFields({ name: 'يوزر الشخص الذي تتريد معه؟', value: fields.getTextInputValue('med_user') }, { name: 'ما تفاصيل التريد أو العرض والمقابل؟', value: fields.getTextInputValue('med_details') });
        } else if (type === 'ticket_support') {
            embed.setTitle('🛠️ تذكرة الدعم الفني').setDescription(`شكرا لفتح تذكرة الدعم الفني.\n・يرجى شرح شكواك أو مشكلتك أو طلبك بشكل واضح ومفصل قدر الإمكان.\n・ارفق أي صور أو روابط أو أدلة تساعدنا على فهم المشكلة.\n・فريق الدعم سيراجع تذكرتك ويجيبك في أسرع وقت ممكن.`)
                 .addFields({ name: 'ما هي مشكلتك أو طلبك بالتفصيل؟', value: fields.getTextInputValue('sup_issue') });
        }

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add_member').setLabel('Add').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger)
        );

        if (embed.data.title) await channel.send({ embeds: [embed], components: [buttons] });
        else await channel.send({ components: [buttons] });
    }

    console.log('✅ MNC Ticket System Fully Operational');
};
