const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = async (client) => {
     data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('إعداد نظام التكتات بالكامل');

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
   
        await interaction.reply({ content: '⏳ جاري إعداد نظام التكتات...', ephemeral: true });

        // إنشاء روم التكتات
        const ticketCategory = client.config.ticketCategory; // ID الكاتيجوري
        const ticketChannel = await interaction.guild.channels.create({
            name: '🎫 | فتح التذاكر',
            type: ChannelType.GuildText,
            parent: ticketCategory,
            permissionOverwrites: [
                { id: interaction.guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        // Embed الأساسي للتكتات + القوانين الواقعية
        const ticketEmbed = new EmbedBuilder()
            .setTitle('🎟️ نظام التكتات')
            .setDescription(
`حياك الله 👋

اختر نوع التكت الذي تريد فتحه:

🛠️ دعم فني  
🛡️ طلب وسيط  
🎁 استلام هدايا  
🎥 تقديم على صانع محتوى  
⚠️ شكوى على إداري

# 📜 قوانين التكت لتجنب أي عقوبات
**.. عند فتح تذكرة وعدم كتابة استفسارك أو مشكلتك فورا سيتم حذفها بدون أي تردد ..
.. يمنع فتح أكثر من تذكرتين في نفس الوقت، النظام سيقوم بحظر التذاكر المكررة تلقائيا ..
.. يمنع منشن طاقم الإدارة العليا أو الصغرى، الرد يتم حسب الأولوية ووقت فتح التذكرة ..
.. يرجى إرفاق كافة الأدلة الصور المتعلقة بمشكلتك لضمان سرعة الرد وحل المشكلة ..
.. أي تجاوز أو إساءة في التعامل مع الفريق الإداري داخل التذكرة يعرضك للعقوبات ..
.. تذكرتك لا يراها إلا الطاقم المختص؛ يرجى عدم مشاركة تفاصيل حساسة خارج التذكرة ..**`
            )
            .setColor('#FFFFFF');

        // Buttons لكل نوع تكت + إيموجي جديد
        const ticketButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('ticket_support').setLabel('دعم فني').setStyle(ButtonStyle.Primary).setEmoji('🛠️'),
                new ButtonBuilder().setCustomId('ticket_mediator').setLabel('طلب وسيط').setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('ticket_gift').setLabel('استلام هدايا').setStyle(ButtonStyle.Primary).setEmoji('🎁'),
                new ButtonBuilder().setCustomId('ticket_creator').setLabel('تقديم على صانع محتوى').setStyle(ButtonStyle.Primary).setEmoji('🎥'),
                new ButtonBuilder().setCustomId('ticket_admin').setLabel('شكوى على إداري').setStyle(ButtonStyle.Danger).setEmoji('⚠️')
            );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [ticketButtons] });

        await interaction.followUp({ content: '✅ تم إنشاء Embed التكتات مع كل الأزرار والقوانين الجديدة بنجاح!', ephemeral: true });
    }

    client.on('interactionCreate', async interaction => {

        if (!interaction.isButton()) return;

        const guild = interaction.guild;
        const member = interaction.member;

        // حماية: يمنع فتح أكثر من تكتين في نفس الوقت
        const openTickets = guild.channels.cache.filter(c => c.name.includes(member.user.username) && c.type === ChannelType.GuildText);
        if (openTickets.size >= 2) {
            return interaction.reply({ content: '⚠️ لا يمكنك فتح أكثر من تكتين في نفس الوقت!', ephemeral: true });
        }

        // تحديد نوع التكت
        const typeMap = {
            ticket_support: { name: 'دعم فني', color: '#00AAFF' },
            ticket_mediator: { name: 'طلب وسيط', color: '#FFD700' },
            ticket_gift: { name: 'استلام هدايا', color: '#00FF00' },
            ticket_creator: { name: 'تقديم على صانع محتوى', color: '#FF00FF' },
            ticket_admin: { name: 'شكوى على إداري', color: '#FF0000' }
        };

        const ticketType = typeMap[interaction.customId];
        if (!ticketType) return;

        // إنشاء روم التكت الخاص بالعضو
        const ticketName = `ticket-${member.user.username}`;
        const ticketChannel = await guild.channels.create({
            name: ticketName,
            type: ChannelType.GuildText,
            parent: interaction.channel.parent, // نفس كاتيجوري التكتات
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: client.config.staffRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
            ]
        });

        // Embed داخلي للتكت
        const ticketEmbed = new EmbedBuilder()
            .setTitle(`🎫 ${ticketType.name}`)
            .setDescription(
`حياك الله 👋
هذا التكت مخصص لـ ${ticketType.name}.

يرجى كتابة التفاصيل المطلوبة أدناه:`
            )
            .setColor(ticketType.color);

        // Buttons داخل التكت: Claim / Close / Add / Delete
        const ticketButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('🟢'),
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔴'),
                new ButtonBuilder().setCustomId('add_member').setLabel('Add').setStyle(ButtonStyle.Primary).setEmoji('➕'),
                new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setStyle(ButtonStyle.Secondary).setEmoji('🗑️')
            );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [ticketButtons] });

        // رد على العضو أن التكت اتعمل
        await interaction.reply({ content: `✅ تم إنشاء التكت الخاص بك: ${ticketChannel}`, ephemeral: true });


    client.on('interactionCreate', async interaction => {

        if (!interaction.isButton()) return;
        const channel = interaction.channel;
        const member = interaction.member;
        const guild = interaction.guild;

        // فقط داخل التكتات
        if (!channel.name.startsWith('ticket-')) return;

        // ===========================
        // زر Claim – يستلمه إداري
        // ===========================
        if (interaction.customId === 'claim_ticket') {

            // تحقق لو حد تاني حاول يضغط
            if (!member.roles.cache.has(client.config.staffRole)) {
                return interaction.reply({ content: '⚠️ فقط الطاقم الإداري يمكنه استلام التكت!', ephemeral: true });
            }

            // تعديل الرسالة لتظهر منشن للإداري المستلم
            await interaction.update({
                content: `✅ تم استلام التكت بنجاح بواسطة ${member}`,
                components: interaction.message.components // زرار يظل موجود
            });
        }

        // ===========================
        // زر Close – يغلق التكت
        // ===========================
        else if (interaction.customId === 'close_ticket') {

            if (!member.roles.cache.has(client.config.staffRole)) {
                return interaction.reply({ content: '⚠️ فقط الطاقم الإداري يمكنه إغلاق التكت!', ephemeral: true });
            }

            // تحقق من تأكيد قبل الحذف
            const confirmRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('confirm_close').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ content: '⚠️ هل أنت متأكد من إغلاق التكت؟', components: [confirmRow], ephemeral: true });
        }

        // ===========================
        // زر Add – إضافة عضو للتكت
        // ===========================
        else if (interaction.customId === 'add_member') {

            if (!member.roles.cache.has(client.config.staffRole)) {
                return interaction.reply({ content: '⚠️ فقط الطاقم الإداري يمكنه إضافة عضو!', ephemeral: true });
            }

            // يطلب من الإداري إدخال ID العضو المراد إضافته
            await interaction.reply({ content: '🔹 ارسل الآن ID العضو الذي تريد إضافته للتكت:', ephemeral: true });

            const filter = m => m.author.id === member.id;
            const collector = interaction.channel.createMessageCollector({ filter, max: 1, time: 30000 });

            collector.on('collect', async msg => {
                const userId = msg.content;
                const user = guild.members.cache.get(userId);
                if (!user) return interaction.followUp({ content: '❌ العضو غير موجود!', ephemeral: true });

                await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
                await interaction.followUp({ content: `✅ تم إضافة ${user} للتكت بواسطة ${member}`, ephemeral: true });
            });
        }

        // ===========================
        // زر Delete – حذف التكت
        // ===========================
        else if (interaction.customId === 'delete_ticket') {

            if (!member.roles.cache.has(client.config.staffRole)) {
                return interaction.reply({ content: '⚠️ فقط الطاقم الإداري يمكنه حذف التكت!', ephemeral: true });
            }

            // تأكيد الحذف
            const confirmRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('confirm_delete').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('cancel_delete').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({ content: '⚠️ هل أنت متأكد من حذف التكت نهائيًا؟', components: [confirmRow], ephemeral: true });
        }

        // ===========================
        // Confirm / Cancel Close
        // ===========================
        else if (interaction.customId === 'confirm_close') {
            await channel.send('🔒 تم إغلاق التكت بنجاح!');
            await channel.delete().catch(err => console.log('Error closing ticket:', err));
        }
        else if (interaction.customId === 'cancel_close') {
            await interaction.update({ content: '❌ تم إلغاء إغلاق التكت.', components: [] });
        }

        // ===========================
        // Confirm / Cancel Delete
        // ===========================
        else if (interaction.customId === 'confirm_delete') {
            await channel.send('🗑️ تم حذف التكت نهائيًا!');
            await channel.delete().catch(err => console.log('Error deleting ticket:', err));
        }
        else if (interaction.customId === 'cancel_delete') {
            await interaction.update({ content: '❌ تم إلغاء حذف التكت.', components: [] });
        
        if (!interaction.isButton()) return;
        const channel = interaction.channel;
        const member = interaction.member;
        const guild = interaction.guild;

        // فقط داخل التكتات
        if (!channel.name.startsWith('ticket-')) return;

        // -------------------------------
        // إرسال Logs
        // -------------------------------
        const logsChannel = guild.channels.cache.get(client.config.logsChannel); // ID روم اللوق

        if (!logsChannel) return;

        const logEmbed = new EmbedBuilder()
            .setTitle('📝 Ticket Log')
            .setColor('#FFA500')
            .setDescription(`**العضو:** ${member.user.tag}\n**القناة:** ${channel.name}\n**الإجراء:** ${interaction.customId}`)
            .setTimestamp();

        await logsChannel.send({ embeds: [logEmbed] });

        // -------------------------------
        // حماية: منع فتح أكثر من تكتين
        // -------------------------------
        const openTickets = guild.channels.cache.filter(c => c.name.includes(member.user.username));
        if (openTickets.size > 2) {
            await interaction.reply({ content: '⚠️ لديك أكثر من تكت مفتوح، يرجى الانتظار حتى يتم إغلاقها.', ephemeral: true });
            return;
        }

        // -------------------------------
        // حماية: منع الضغط على زرار غير مسموح
        // -------------------------------
        const allowedButtons = ['claim_ticket','close_ticket','add_member','delete_ticket'];
        if (!allowedButtons.includes(interaction.customId) && !interaction.customId.startsWith('ticket_')) {
            return interaction.reply({ content: '⚠️ لا يمكنك استخدام هذا الزر.', ephemeral: true });
        }

    });

};

const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = async (client) => {

    // ===========================
    // حماية من Lag / تعليق البوت
    // ===========================
    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton()) return;

        try {
            // منع أي ضغط متكرر بسرعة
            if (client.cooldowns.has(interaction.user.id)) {
                return interaction.reply({ content: '⏳ انتظر قليلاً قبل استخدام أي زر آخر.', ephemeral: true });
            }
            client.cooldowns.add(interaction.user.id);
            setTimeout(() => client.cooldowns.delete(interaction.user.id), 2000); // 2 ثانية بين الضغطات

        } catch (err) {
            console.log('Error cooldown system:', err);
        }
    });

    // ===========================
    // حماية التكتات
    // ===========================
    client.on('channelDelete', async channel => {
        try {
            if (!channel.name.startsWith('ticket-')) return;

            const logsChannel = channel.guild.channels.cache.get(client.config.logsChannel);
            if (logsChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🗑️ تم حذف تكت')
                    .setColor('#FF0000')
                    .setDescription(`**القناة:** ${channel.name}\n**تاريخ الحذف:** ${new Date().toLocaleString()}`)
                    .setTimestamp();
                await logsChannel.send({ embeds: [logEmbed] });
            }
        } catch (err) {
            console.log('Error deleting ticket log:', err);
        }
    });

    // ===========================
    // تحسين الأداء عند فتح تكت
    // ===========================
    client.on('channelCreate', async channel => {
        try {
            if (!channel.name.startsWith('ticket-')) return;

            // Permissions مضبوطة بشكل تلقائي بدون أي أخطاء
            await channel.permissionOverwrites.edit(client.config.staffRole, {
                ViewChannel: true,
                SendMessages: true,
                ManageChannels: true
            });
        } catch (err) {
            console.log('Error setting permissions on ticket creation:', err);
        }
    });

    // ===========================
    // Cooldown عام للأوامر لتجنب تعليق البوت
    // ===========================
    client.cooldowns = new Set();

            return interaction.reply({ content: '⏳ انتظر قليلاً قبل تنفيذ أمر آخر.', ephemeral: true });
        }
        client.cooldowns.add(interaction.user.id);
        setTimeout(() => client.cooldowns.delete(interaction.user.id), 2000); // 2 ثانية
    });

    console.log('✅ نظام التكتات مكتمل مع الحماية والسرعة العالية.');
});
};
