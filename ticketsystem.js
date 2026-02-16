const { 
    ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, InteractionType 
} = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');

module.exports = async (client) => {
    // ⚙️ إعدادات المعرفات (IDs) - MNC COMMUNITY
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
    const activeTrades = new Map(); // لتخزين بيانات التريد لكل تذكرة

    // ==========================================
    // 1. أوامر الشات (:setup-mnc | :trade | :req-high | :done)
    // ==========================================
    client.on('messageCreate', async (message) => {
        if (!message.guild || message.author.bot || !message.content.startsWith(CONFIG.prefix)) return;

        const isHighMed = CONFIG.highMediators.some(id => message.member.roles.cache.has(id));
        const isMed = message.member.roles.cache.has(CONFIG.mediatorRole) || isHighMed;
        const isAdmin = message.member.roles.cache.has(CONFIG.adminRole) || isHighMed;

        // --- أمر السيت اب (التصميم الشيك) ---
        if (message.content === `${CONFIG.prefix}setup-mnc` && isAdmin) {
            const setupEmbed = new EmbedBuilder()
                .setTitle('# 📋 قوانين تذاكر MNC COMMUNITY')
                .setDescription(
                    `**┃ أهلاً بك في نظام الدعم الفني والوساطة الخاص بنا.**\n\n` +
                    `**・ عند فتح تذكرة وعدم كتابة استفسارك فوراً سيتم حذفها.**\n` +
                    `**・ يرجى إرفاق كافة الأدلة والصور لضمان سرعة الرد.**\n` +
                    `**・ يمنع منشن طاقم الإدارة؛ الرد يتم حسب الأولوية.**\n` +
                    `**・ أي تجاوز مع الفريق الإداري يعرضك للعقوبات.**\n` +
                    `**・ تذكرتك محمية ولا يراها إلا الطاقم المختص.**\n\n` +
                    `**┃ اختر القسم المناسب بالأسفل لفتح تذكرتك:**`
                )
                .setColor('#FFFFFF')
                .setFooter({ text: 'MNC COMMUNITY - Advanced Ticket System' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_mediator').setLabel('طلب وسيط').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('open_support').setLabel('دعم فني').setEmoji('🛠️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('open_gift').setLabel('استلام هدايا').setEmoji('🎁').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('open_creator').setLabel('صانع محتوى').setEmoji('🎥').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('open_admin').setLabel('شكوى إداري').setEmoji('⚠️').setStyle(ButtonStyle.Secondary)
            );
            await message.channel.send({ embeds: [setupEmbed], components: [row] });
            return message.delete();
        }

        // --- أوامر الوسطاء ---
        if (isMed && message.channel.name.startsWith('ticket-')) {
            if (message.content === `${CONFIG.prefix}trade`) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('trigger_trade_modal').setLabel('📝 Set Trade Details').setStyle(ButtonStyle.Primary));
                return message.reply({ content: '👇 **Mediator:** يرجى تسجيل بيانات التريد من هنا:', components: [row] });
            }

            if (message.content === `${CONFIG.prefix}done`) {
                const owner = await message.guild.members.fetch(message.channel.topic).catch(() => null);
                if (owner) {
                    const stars = new ActionRowBuilder().addComponents([1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_med_stars_${i}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary)));
                    await owner.send({ content: '⭐ **MNC Rating:** يرجى تقييم خدمة الوسيط الآن:', components: [stars] }).catch(() => {});
                    return message.channel.send('✅ **Sent rating to DM!**');
                }
            }
        }
    });

    // ==========================================
    // 2. معالجة التفاعلات (أزرار، نوافذ، وClaim)
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        const { customId, guild, user, channel, member } = interaction;

        // --- فتح التذاكر (مودالات احترافية) ---
        if (customId.startsWith('open_')) {
            const type = customId.split('_')[1];
            if (['mediator', 'support', 'creator'].includes(type)) {
                const modal = new ModalBuilder().setCustomId(`modal_open_${type}`).setTitle('Ticket Information');
                if (type === 'mediator') {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('u2').setLabel('يوزر الشخص الي بتسوي معه تريد؟').setStyle(TextInputStyle.Short)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('desc').setLabel('ما تفاصيل التريد أو العرض والمقابل؟').setStyle(TextInputStyle.Paragraph))
                    );
                } else if (type === 'support') {
                    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('msg').setLabel('ما هي مشكلتك بالتفصيل؟').setStyle(TextInputStyle.Paragraph)));
                }
                return await interaction.showModal(modal);
            }
            return await createTicket(interaction, type, null);
        }

        // --- نظام الـ Claim (يخفي عن الجميع ما عدا المستلم والعليا) ---
        if (customId === 'claim_ticket') {
            if (!member.roles.cache.has(CONFIG.staffRole)) return;
            await channel.permissionOverwrites.edit(CONFIG.staffRole, { ViewChannel: false });
            await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
            await channel.permissionOverwrites.edit(CONFIG.adminRole, { ViewChannel: true });

            const row = ActionRowBuilder.from(interaction.message.components[0]);
            row.components[1].setDisabled(true); // الزر شفاف
            await interaction.update({ components: [row] });
            await channel.send({ content: `✅ **The ticket has been claimed successfully by** <@${user.id}>` });
            sendLog('Claim', channel, user);
        }

        // --- معالجة المودالات (Modals) ---
        if (interaction.type === InteractionType.ModalSubmit) {
            if (customId.startsWith('modal_open_')) return await createTicket(interaction, customId.replace('modal_open_', ''), interaction.fields);
            
            if (customId === 'modal_trade_save') {
                const tradeText = interaction.fields.getTextInputValue('trade_text');
                activeTrades.set(channel.id, tradeText);
                await interaction.reply({ content: `✅ **Trade Saved:** ${tradeText}` });
                return channel.send('**done**');
            }

            if (customId === 'modal_add_user') {
                const targetID = interaction.fields.getTextInputValue('target_id');
                const target = await guild.members.fetch(targetID).catch(() => null);
                if (target) {
                    await channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true });
                    return interaction.reply({ content: `<@${target.id}> **has been added to the ticket by** <@${user.id}>` });
                }
            }

            // نظام تقييمات DM (نجوم + تعليق)
            if (customId.startsWith('modal_rate_')) {
                const [target, stars, type] = customId.replace('modal_rate_', '').split('_');
                const comment = interaction.fields.getTextInputValue('comment') || 'بدون تعليق إضافي';
                const trade = activeTrades.get(channel?.id) || "General Process";
                const logRoom = type === 'staff' ? CONFIG.staffRatingLog : CONFIG.mediatorRatingLog;
                
                const logEmbed = new EmbedBuilder()
                    .setTitle(type === 'staff' ? '👨‍💼 Staff Rating' : '🛡️ Mediator Rating')
                    .addFields(
                        { name: 'العميل', value: `<@${target}>` },
                        { name: 'التقييم', value: '⭐'.repeat(stars) },
                        { name: 'العملية (التريد)', value: `✨ ${trade} ✨` },
                        { name: 'التعليق الإضافي', value: comment }
                    ).setColor('#FFFFFF').setTimestamp();
                await client.channels.cache.get(logRoom).send({ embeds: [logEmbed] });
                return interaction.reply({ content: '✅ شكراً لك، تم تسجيل تقييمك بنجاح!', ephemeral: true });
            }
        }

        // --- أزرار التحكم (Close, Delete, Transcript) ---
        if (customId === 'close_ticket') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_close').setLabel('Confirm Close').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );
            return interaction.reply({ content: '❓ **Are you sure?**', components: [row], ephemeral: true });
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
            
            // إرسال تقييم الإدارة التلقائي
            const owner = await client.users.fetch(ownerID).catch(() => null);
            if (owner) {
                const stars = new ActionRowBuilder().addComponents([1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_staff_stars_${i}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary)));
                await owner.send({ content: '📋 **MNC Feedback:** يرجى تقييم أداء الإدارة في تذكرتك:', components: [stars] }).catch(() => {});
            }
        }

        if (customId === 'transcript') {
            const attachment = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
            await client.channels.cache.get(CONFIG.transcriptChannel).send({ content: `📝 Transcript: **${channel.name}**`, files: [attachment] });
            return interaction.reply({ content: '✅ Transcript sent to log room.', ephemeral: true });
        }

        if (customId === 'delete_ticket') {
            await interaction.reply('🗑️ يتم الحذف الآن...');
            setTimeout(() => channel.delete(), 5000);
            sendLog('Delete', channel, user);
        }

        // أزرار أخرى (Add / Trade)
        if (customId === 'add_user') {
            const modal = new ModalBuilder().setCustomId('modal_add_user').setTitle('Add Member');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (customId === 'trigger_trade_modal') {
            const modal = new ModalBuilder().setCustomId('modal_trade_save').setTitle('Trade Details');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_text').setLabel('مثال: قرما مقابل دراجون كانيلوني').setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (customId.startsWith('rate_')) {
            const [a, type, b, stars] = customId.split('_');
            const modal = new ModalBuilder().setCustomId(`modal_rate_${user.id}_${stars}_${type}`).setTitle('Comment');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('comment').setLabel('اكتب تعليقك هنا (اختياري)').setStyle(TextInputStyle.Paragraph).setRequired(false)));
            return await interaction.showModal(modal);
        }
    });

    // --- دالة إنشاء التذكرة (احترافية ومطابقة للصور) ---
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

        await interaction.reply({ content: `✅ **Ticket opened:** ${channel}`, ephemeral: true });
        const labels = { mediator: 'طلب وسيط', support: 'الدعم الفني', gift: 'استلام هدايا', creator: 'صانع محتوى', admin: 'شكوى إداري' };
        
        await channel.send({ content: `**حياك الله** <@${user.id}>\n**Reason:** ${labels[type]}` });

        const embed = new EmbedBuilder().setColor('#FFFFFF').setTimestamp();
        if (type === 'mediator') {
            embed.setTitle('🛡️ طلب وسيط').setDescription(
                `هذا القسم مخصص لطلب وسيط لعملية تريد داخل السيرفر\n` +
                `・ تأكد أن الطرف الآخر جاهز ومتواجد قبل فتح التذكرة\n` +
                `・ اكتب المعلومات المطلوبة بدقة في الأسئلة التالية`
            ).addFields(
                { name: '👤 يوزر الطرف الثاني', value: fields.getTextInputValue('u2') || 'غير محدد' },
                { name: '📝 تفاصيل التريد', value: fields.getTextInputValue('desc') || 'غير محدد' }
            );
        } else if (type === 'support') {
            embed.setTitle('🛠️ تذكرة الدعم الفني').setDescription(
                `شكراً لفتح تذكرة الدعم الفني.\n` +
                `・ يرجى شرح شكواك أو مشكلتك بالتفصيل وارفاق الأدلة.\n` +
                `・ فريق الدعم سيجيبك في أسرع وقت ممكن.`
            ).addFields({ name: '❓ المشكلة بالتفصيل', value: fields.getTextInputValue('msg') || 'غير محدد' });
        } else {
            embed.setDescription(`✨ **Welcome to MNC Community** ✨\nPlease wait for staff.`);
        }

        const btns = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add_user').setLabel('Add').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ embeds: [embed], components: [btns] });
    }

    function sendLog(action, channel, user) {
        const embed = new EmbedBuilder().setTitle(`📑 Log: ${action}`).addFields({ name: 'Executor', value: user.tag }, { name: 'Channel', value: channel.name }).setColor('#FFFFFF');
        client.channels.cache.get(CONFIG.logsChannel).send({ embeds: [embed] });
    }

    console.log('💎 MNC Ticket System - THE BEAST IS ONLINE!');
};
