const { 
    ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, InteractionType 
} = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');

module.exports = async (client) => {
    // ⚙️ إعدادات المعرفات (IDs)
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
    const tradeData = new Map(); // تخزين التريد

    // ==========================================
    // 1. أوامر الشات (:setup-mnc | :trade | :req-high | :done)
    // ==========================================
    client.on('messageCreate', async (message) => {
        if (!message.guild || message.author.bot || !message.content.startsWith(CONFIG.prefix)) return;

        const isHighMed = CONFIG.highMediators.some(id => message.member.roles.cache.has(id));
        const isMed = message.member.roles.cache.has(CONFIG.mediatorRole) || isHighMed;
        const isAdmin = message.member.roles.cache.has(CONFIG.adminRole) || isHighMed;

        // --- أمر السيت اب ---
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
                .setFooter({ text: 'MNC COMMUNITY - Advanced System' });

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
            // أمر تسجيل التريد
            if (message.content === `${CONFIG.prefix}trade`) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_trade_modal').setLabel('📝 تسجيل بيانات التريد').setStyle(ButtonStyle.Primary));
                return message.reply({ content: '**👇 Mediator:** يرجى تسجيل بيانات التريد من هنا:', components: [row] });
            }

            // أمر طلب وساطة عليا (تم الإصلاح)
            if (message.content === `${CONFIG.prefix}req-high`) {
                const tradeDetails = tradeData.get(message.channel.id) || "لم يتم تسجيل تريد بعد";
                const embed = new EmbedBuilder().setTitle('⚖️ طلب موافقة وساطة عليا')
                    .setDescription(`**الوسيط:** ${message.author}\n**العملية:** ${tradeDetails}`)
                    .setColor('#FFFF00');
                
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('high_accept').setLabel('Accept').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('high_reject').setLabel('Reject').setStyle(ButtonStyle.Danger)
                );
                return message.channel.send({ content: `⚠️ <@&${CONFIG.highMediators[0]}>`, embeds: [embed], components: [row] });
            }

            // أمر التقييم
            if (message.content === `${CONFIG.prefix}done`) {
                const owner = await message.guild.members.fetch(message.channel.topic).catch(() => null);
                if (owner) {
                    const stars = new ActionRowBuilder().addComponents([1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_med_stars_${i}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary)));
                    await owner.send({ content: '**⭐ MNC Rating:** يرجى تقييم خدمة الوسيط الآن:', components: [stars] }).catch(() => {});
                    return message.channel.send('**✅ تم إرسال طلب التقييم للعميل بنجاح.**');
                }
            }
        }
    });

    // ==========================================
    // 2. معالجة التفاعلات (أزرار ونوافذ)
    // ==========================================
    client.on('interactionCreate', async (interaction) => {
        const { customId, guild, user, channel, member } = interaction;

        // --- فتح التذاكر ---
        if (customId.startsWith('open_')) {
            const type = customId.split('_')[1];
            if (['mediator', 'support', 'creator'].includes(type)) {
                const modal = new ModalBuilder().setCustomId(`modal_open_${type}`).setTitle('بيانات التذكرة');
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

        // --- نظام الـ Claim ---
        if (customId === 'claim_ticket') {
            if (!member.roles.cache.has(CONFIG.staffRole)) return;
            await channel.permissionOverwrites.edit(CONFIG.staffRole, { ViewChannel: false });
            await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
            await channel.permissionOverwrites.edit(CONFIG.adminRole, { ViewChannel: true });

            const row = ActionRowBuilder.from(interaction.message.components[0]);
            row.components[1].setDisabled(true); 
            await interaction.update({ components: [row] });
            await channel.send({ content: `✅ **The ticket has been claimed successfully by** <@${user.id}>` });
            sendLog('Claim', channel, user);
        }

        // --- معالجة المودالات (حفظ التريد والتقييم) ---
        if (interaction.type === InteractionType.ModalSubmit) {
            if (customId.startsWith('modal_open_')) return await createTicket(interaction, customId.replace('modal_open_', ''), interaction.fields);
            
            // حفظ التريد (تم الإصلاح)
            if (customId === 'modal_trade_save') {
                const tradeText = interaction.fields.getTextInputValue('trade_text');
                tradeData.set(channel.id, tradeText);
                await interaction.reply({ content: `**✅ Trade Saved:**\n${tradeText}` });
                return channel.send('**done**');
            }

            if (customId === 'modal_add_user') {
                const targetID = interaction.fields.getTextInputValue('target_id');
                const target = await guild.members.fetch(targetID).catch(() => null);
                if (target) {
                    await channel.permissionOverwrites.edit(target.id, { ViewChannel: true, SendMessages: true });
                    return interaction.reply({ content: `**✅ <@${target.id}> has been added to the ticket by <@${user.id}>**` });
                }
            }

            // لوق التقييم (تم فصل الإدارة عن الوساطة)
            if (customId.startsWith('modal_rate_')) {
                const [target, stars, type] = customId.replace('modal_rate_', '').split('_');
                const comment = interaction.fields.getTextInputValue('comment') || 'لا يوجد تعليق';
                const trade = tradeData.get(channel?.id) || "غير مسجل";
                const logRoom = type === 'staff' ? CONFIG.staffRatingLog : CONFIG.mediatorRatingLog;
                
                const logEmbed = new EmbedBuilder()
                    .setTitle(type === 'staff' ? '👨‍💼 تقييم إداري' : '🛡️ تقييم وسيط')
                    .setColor('#FFFFFF').setTimestamp();

                logEmbed.addFields(
                    { name: '👤 العميل', value: `<@${target}>`, inline: true },
                    { name: '⭐ التقييم', value: '⭐'.repeat(stars), inline: true }
                );

                // إضافة التريد فقط لتقييم الوسيط
                if (type === 'mediator') {
                    logEmbed.addFields({ name: '📦 العملية (التريد)', value: `**${trade}**` });
                }

                logEmbed.addFields({ name: '💬 التعليق الإضافي', value: `\`\`\`${comment}\`\`\`` }); // حبشتكنات الكود بلوك

                await client.channels.cache.get(logRoom).send({ embeds: [logEmbed] });
                return interaction.reply({ content: '✅ شكراً لك، تم تسجيل تقييمك بنجاح!', ephemeral: true });
            }
        }

        // --- أزرار التحكم (Reopen / Delete / Transcript) ---
        if (customId === 'close_ticket') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_close').setLabel('Confirm Close').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );
            return interaction.reply({ content: '**❓ هل أنت متأكد من إغلاق التذكرة؟**', components: [row], ephemeral: true });
        }

        // زرار الكانسل (تم الإصلاح)
        if (customId === 'cancel_close') {
            return interaction.update({ content: '**✅ تم إلغاء عملية الإغلاق.**', components: [] });
        }

        if (customId === 'confirm_close') {
            const ownerID = channel.topic;
            await channel.permissionOverwrites.edit(ownerID, { ViewChannel: false });
            await interaction.update({ content: '🔒 **Ticket Closed.**', components: [] });
            
            // الأزرار النهائية (تم إضافة Reopen)
            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('reopen_ticket').setLabel('Reopen Ticket').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete Ticket').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
            );
            await channel.send({ content: `**Ticket Control Panel\nClosed By: <@${user.id}>**`, components: [actionRow] });
            
            // إرسال اللوقات اجباري (ترانسكربت + لوق إغلاق)
            const attachment = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
            await client.channels.cache.get(CONFIG.transcriptChannel).send({ content: `📝 **Transcript Auto-Log:** ${channel.name}`, files: [attachment] });
            sendLog('Close', channel, user);

            // تقييم الإدارة التلقائي
            const owner = await client.users.fetch(ownerID).catch(() => null);
            if (owner) {
                const stars = new ActionRowBuilder().addComponents([1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_staff_stars_${i}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary)));
                await owner.send({ content: '📋 **MNC Staff Feedback:** يرجى تقييم الإدارة:', components: [stars] }).catch(() => {});
            }
        }

        // زرار الريسبون (Reopen)
        if (customId === 'reopen_ticket') {
            const ownerID = channel.topic;
            await channel.permissionOverwrites.edit(ownerID, { ViewChannel: true });
            await interaction.message.delete();
            await interaction.reply({ content: '**🔓 Ticket Reopened!**' });
            sendLog('Reopen', channel, user);
        }

        if (customId === 'transcript') {
            const attachment = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
            await client.channels.cache.get(CONFIG.transcriptChannel).send({ content: `📝 **Manual Transcript:** ${channel.name}`, files: [attachment] });
            return interaction.reply({ content: '**✅ Transcript Logged.**', ephemeral: true });
        }

        if (customId === 'delete_ticket') {
            await interaction.reply('**🗑️ Deleting ticket in 5 seconds...**');
            setTimeout(() => channel.delete().catch(() => {}), 5000);
            sendLog('Delete', channel, user);
        }

        // مودال تسجيل التريد
        if (customId === 'btn_trade_modal') {
            const modal = new ModalBuilder().setCustomId('modal_trade_save').setTitle('Trade Details');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_text').setLabel('اكتب تفاصيل التريد هنا').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            return await interaction.showModal(modal);
        }

        // أزرار الوساطة العليا
        if (['high_accept', 'high_reject'].includes(customId)) {
            if (!CONFIG.highMediators.some(id => member.roles.cache.has(id))) return interaction.reply({ content: '❌ **Only High Mediators!**', ephemeral: true });
            const status = customId === 'high_accept' ? '✅ **Approved**' : '❌ **Rejected**';
            await interaction.update({ content: `${status} by <@${user.id}>`, components: [], embeds: [interaction.message.embeds[0]] });
        }

        // مودال إضافة العضو
        if (customId === 'add_user') {
            const modal = new ModalBuilder().setCustomId('modal_add_user').setTitle('Add User');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_id').setLabel('User ID').setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        // مودال التعليق (تقييم)
        if (customId.startsWith('rate_')) {
            const [a, type, b, stars] = customId.split('_');
            const modal = new ModalBuilder().setCustomId(`modal_rate_${user.id}_${stars}_${type}`).setTitle('Extra Comment');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('comment').setLabel('تعليق إضافي (اختياري)').setStyle(TextInputStyle.Paragraph).setRequired(false)));
            return await interaction.showModal(modal);
        }
    });

    // --- دالة إنشاء التذكرة (تصميم احترافي) ---
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

        await interaction.reply({ content: `✅ **Ticket Created:** ${channel}`, ephemeral: true });
        const labels = { mediator: 'طلب وسيط', support: 'الدعم الفني', gift: 'استلام هدايا', creator: 'صانع محتوى', admin: 'شكوى إداري' };
        
        await channel.send({ content: `**حياك الله** <@${user.id}>\n**Reason:** ${labels[type]}` });

        const embed = new EmbedBuilder().setColor('#FFFFFF').setTimestamp();
        
        if (type === 'mediator') {
            embed.setTitle('🛡️ طلب وسيط').setDescription(
                `**هذا القسم مخصص لطلب وسيط لعملية تريد داخل السيرفر**\n` +
                `--------------------------------------\n` +
                `**・ تأكد أن الطرف الآخر جاهز ومتواجد قبل فتح التذكرة**\n` +
                `**・ رجاء عدم فتح أكثر من تذكرة أو إزعاج الفريق**\n` +
                `**・ تحقق من درجة الوسيط، حيث أن لكل مستوى أمان مختلف**\n` +
                `**・ اكتب المعلومات المطلوبة بدقة في الأسئلة التالية**`
            ).addFields(
                { name: '👤 الطرف الثاني', value: fields.getTextInputValue('u2') || 'غير محدد' },
                { name: '📝 التفاصيل', value: fields.getTextInputValue('desc') || 'غير محدد' }
            );
        } else if (type === 'support') {
            embed.setTitle('🛠️ تذكرة الدعم الفني').setDescription(
                `**شكراً لفتح تذكرة الدعم الفني.**\n` +
                `--------------------------------------\n` +
                `**・ يرجى شرح شكواك أو مشكلتك بشكل واضح ومفصل.**\n` +
                `**・ ارفق أي صور أو روابط أو أدلة تساعدنا.**\n` +
                `**・ فريق الدعم سيجيبك في أسرع وقت ممكن.**\n\n` +
                `**يرجى التحلي بالصبر، فترتيب الردود يتم حسب الأولوية.**`
            ).addFields({ name: '❓ المشكلة', value: fields.getTextInputValue('msg') || 'غير محدد' });
        } else {
             embed.setDescription(`✨ **Welcome to MNC Community** ✨\n\n**Please wait for staff response.**`);
        }

        const btns = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add_user').setLabel('Add User').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger)
        );
        const delBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger));

        await channel.send({ embeds: [embed], components: [btns, delBtn] });
    }

    // دالة اللوقات (إجبارية وتلقائية)
    function sendLog(action, channel, user) {
        const embed = new EmbedBuilder()
            .setTitle(`📑 Ticket Log: ${action}`)
            .addFields(
                { name: '👤 Executor', value: `<@${user.id}>` },
                { name: '🎫 Channel', value: `${channel.name}` },
                { name: '📅 Date', value: `<t:${Math.floor(Date.now() / 1000)}:R>` }
            )
            .setColor('#FFFFFF').setThumbnail(user.displayAvatarURL());
        client.channels.cache.get(CONFIG.logsChannel).send({ embeds: [embed] });
    }

    console.log('💎 MNC ULTIMATE SYSTEM IS LIVE!');
};
