const { 
    ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, InteractionType 
} = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');

module.exports = async (client) => {
    const CONFIG = {
        categoryID: '1453943996392013901',
        staffRole: '1454199885460144189',
        adminRole: '1453946893053726830',
        mediatorRole: '1454563893249703998',
        highMediators: ['1454560063480922375', '1466937817639948349'],
        logsChannel: '1453948413963141153',
        transcriptChannel: '1472218573710823679',
        mediatorRatingLog: '1472439331443441828',
        staffRatingLog: '1472023428658630686',
        prefix: ':'
    };

    if (!client.ticketCounter) client.ticketCounter = 346;
    const tradeData = new Map();

    client.on('messageCreate', async (message) => {
        if (!message.guild || message.author.bot || !message.content.startsWith(CONFIG.prefix)) return;
        const isStaff = message.member.roles.cache.has(CONFIG.staffRole) || CONFIG.highMediators.some(id => message.member.roles.cache.has(id));

        // --- أمر السيت اب الرئيسي ---
        if (message.content === `${CONFIG.prefix}setup-mnc` && message.member.roles.cache.has(CONFIG.adminRole)) {
            const setupEmbed = new EmbedBuilder()
                .setTitle('# 📋 قوانين التكت لتجنب أي عقوبات')
                .setDescription(
                    `**・ عند فتح تذكرة وعدم كتابة استفسارك أو مشكلتك فورا سيتم حذفها بدون أي تردد\n` +
                    `・ يمنع فتح أكثر من تذكرتين في نفس الوقت النظام سيقوم بحظر التذاكر المكررة تلقائيا\n` +
                    `・ يمنع منشن طاقم الإدارة العليا أو الصغرى الرد يتم حسب الأولوية ووقت فتح التذكرة.\n` +
                    `・ يرجى إرفاق كافة الأدلة الصور المتعلقة بمشكلتك لضمان سرعة الرد وحل المشكلة\n` +
                    `・ أي تجاوز أو إساءة في التعامل مع الفريق الإداري داخل التذكرة يعرضك للعقوبات\n` +
                    `・ تذكرتك لا يراها إلا الطاقم المختص؛ يرجى عدم مشاركة تفاصيل حساسة خارج التذكرة.**`
                ).setColor('#FFFFFF');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_mediator').setLabel('طلب وسيط').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('open_support').setLabel('دعم فني').setEmoji('🛠️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('open_gift').setLabel('استلام هدايا').setEmoji('🎁').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('open_creator').setLabel('صانع محتوى').setEmoji('🎥').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('open_admin').setLabel('شكوى إداري').setEmoji('⚠️').setStyle(ButtonStyle.Secondary)
            );
            await message.channel.send({ embeds: [setupEmbed], components: [row] });
            message.delete();
        }

        // --- أمر التوسط والتقييم ---
        if (isStaff && message.channel.name.startsWith('ticket-')) {
            if (message.content === `${CONFIG.prefix}trade`) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_trade_modal').setLabel('Set Trade Details').setStyle(ButtonStyle.Primary));
                return message.reply({ content: '👇 **Please register the trade items:**', components: [row] });
            }
            if (message.content === `${CONFIG.prefix}done`) {
                const owner = await message.guild.members.fetch(message.channel.topic).catch(() => null);
                if (owner) {
                    const stars = new ActionRowBuilder().addComponents([1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_med_stars_${i}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary)));
                    await owner.send({ content: '⭐ **MNC Rating:** How was your mediator today?', components: [stars] }).catch(() => {});
                    message.channel.send('✅ **Sent rating to client.**');
                }
            }
        }
    });

    client.on('interactionCreate', async (interaction) => {
        const { customId, guild, user, channel, member } = interaction;

        // 1. فتح التذاكر (مودالات)
        if (customId.startsWith('open_')) {
            const type = customId.split('_')[1];
            if (['mediator', 'support', 'creator'].includes(type)) {
                const modal = new ModalBuilder().setCustomId(`modal_open_${type}`).setTitle('Ticket Information');
                if (type === 'mediator') {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('u2').setLabel('يوزر الشخص الي بتسوي معه تريد؟').setStyle(TextInputStyle.Short)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('تفاصيل التريد والمقابل؟').setStyle(TextInputStyle.Paragraph))
                    );
                } else if (type === 'support') {
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('msg').setLabel('ما هي مشكلتك بالتفصيل؟').setStyle(TextInputStyle.Paragraph)));
                }
                return await interaction.showModal(modal);
            }
            return await createTicket(interaction, type, null);
        }

        // 2. معالجة المودالات (إضافة عضو، تريد، فتح تكت)
        if (interaction.type === InteractionType.ModalSubmit) {
            if (customId.startsWith('modal_open_')) return await createTicket(interaction, customId.replace('modal_open_', ''), interaction.fields);
            
            if (customId === 'modal_add_user') {
                const targetID = interaction.fields.getTextInputValue('target_id');
                const target = await guild.members.fetch(targetID).catch(() => null);
                if (target) {
                    await channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true });
                    await interaction.reply({ content: `<@${target.id}> **has been added to the ticket by:** <@${user.id}>` });
                }
            }

            if (customId === 'modal_trade_input') {
                const details = interaction.fields.getTextInputValue('trade_text');
                tradeData.set(channel.id, details);
                await interaction.reply({ content: `✅ **Trade Saved:** ${details}` });
                return channel.send('**done**');
            }

            if (customId.startsWith('modal_rate_')) {
                const [target, stars, type] = customId.replace('modal_rate_', '').split('_');
                const comment = interaction.fields.getTextInputValue('comment') || 'No comment.';
                const trade = tradeData.get(channel?.id) || "General Process";
                const logRoom = type === 'staff' ? CONFIG.staffRatingLog : CONFIG.mediatorRatingLog;
                const logEmbed = new EmbedBuilder()
                    .setTitle(type === 'staff' ? '👨‍💼 Staff Rating' : '🛡️ Mediator Rating')
                    .addFields({ name: 'Client', value: `<@${target}>` }, { name: 'Stars', value: '⭐'.repeat(stars) }, { name: 'Trade', value: `✨ ${trade} ✨` }, { name: 'Comment', value: comment })
                    .setColor('#FFFFFF').setTimestamp();
                await client.channels.cache.get(logRoom).send({ embeds: [logEmbed] });
                return interaction.reply({ content: '✅ Rating logged, thank you!', ephemeral: true });
            }
        }

        // 3. أزرار التحكم (Claim, Add, Close)
        if (customId === 'claim_ticket') {
            if (!member.roles.cache.has(CONFIG.staffRole)) return;
            await channel.permissionOverwrites.edit(CONFIG.staffRole, { ViewChannel: false });
            await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
            const row = ActionRowBuilder.from(interaction.message.components[0]);
            row.components[1].setDisabled(true); 
            await interaction.update({ components: [row] });
            await channel.send({ content: `✅ **The ticket as been claimed successfully by** <@${user.id}>` });
        }

        if (customId === 'add_user') {
            const modal = new ModalBuilder().setCustomId('modal_add_user').setTitle('Add Member');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (customId === 'close_ticket') {
            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_close').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );
            return interaction.reply({ content: '❓ **Are you sure you want to close?**', components: [confirmRow], ephemeral: true });
        }

        if (customId === 'confirm_close') {
            const ownerID = channel.topic;
            await channel.permissionOverwrites.edit(ownerID, { ViewChannel: false });
            await interaction.update({ content: '🔒 **Ticket closed.**', components: [] });
            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary)
            );
            await channel.send({ content: `**Ticket control\nClosed By: <@${user.id}>**`, components: [actionRow] });
        }

        if (customId === 'transcript') {
            const file = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
            await client.channels.cache.get(CONFIG.transcriptChannel).send({ content: `📝 Transcript for **${channel.name}**`, files: [file] });
            return interaction.reply({ content: '✅ Logged to Transcript room.', ephemeral: true });
        }

        if (customId === 'delete_ticket') {
            await interaction.reply('🗑️ Deleting ticket in 5s...');
            setTimeout(() => channel.delete().catch(() => {}), 5000);
        }

        if (customId === 'btn_trade_modal') {
            const modal = new ModalBuilder().setCustomId('modal_trade_input').setTitle('Trade Details');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_text').setLabel('What is the trade?').setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (customId.startsWith('rate_')) {
            const [a, type, stars] = customId.split('_');
            const modal = new ModalBuilder().setCustomId(`modal_rate_${user.id}_${stars}_${type}`).setTitle('Extra Comment');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('comment').setLabel('Optional Comment').setStyle(TextInputStyle.Paragraph).setRequired(false)));
            return await interaction.showModal(modal);
        }
    });

    async function createTicket(interaction, type, fields) {
        const { guild, user } = interaction;
        const id = client.ticketCounter++;
        const channel = await guild.channels.create({
            name: `ticket-${id}-${user.username}`,
            parent: CONFIG.categoryID,
            topic: user.id,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: CONFIG.staffRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        await interaction.reply({ content: `✅ Ticket opened: ${channel}`, ephemeral: true });
        const labels = { mediator: 'طلب وسيط', support: 'الدعم الفني', gift: 'استلام هدايا', creator: 'صانع محتوى', admin: 'شكوى إداري' };
        await channel.send({ content: `حياك الله <@${user.id}>\n**Reason:** ${labels[type]}` });

        const embed = new EmbedBuilder().setColor('#FFFFFF').setTimestamp();
        if (type === 'mediator') {
            embed.setTitle('🛡️ طلب وسيط').setDescription(`هذا القسم مخصص لطلب وسيط لعملية تريد داخل السيرفر\n・ تأكد أن الطرف الآخر جاهز ومتواجد قبل فتح التذكرة\n・ اكتب المعلومات بدقة`);
            embed.addFields({ name: 'الطرف الثاني', value: fields.getTextInputValue('u2') }, { name: 'التفاصيل', value: fields.getTextInputValue('desc') });
        } else if (type === 'support') {
            embed.setTitle('🛠️ تذكرة الدعم الفني').setDescription(`يرجى شرح شكواك أو مشكلتك بالتفصيل.\nفريق الدعم سيراجع تذكرتك ويجيبك قريباً.`);
            embed.addFields({ name: 'المشكلة', value: fields.getTextInputValue('msg') });
        }

        const btns = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add_user').setLabel('Add User').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger)
        );
        const delBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger));

        await channel.send({ embeds: embed.data.title ? [embed] : [], components: [btns, delBtn] });
    }

    console.log('💎 MNC Ticket System Fully Ready!');
};
