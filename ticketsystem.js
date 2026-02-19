const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    client.on('interactionCreate', async interaction => {

        // ==========================================
        // ⭐ نظام تقييمات الإدارة والوسطاء في الخاص
        // ==========================================
        if (interaction.isButton() && interaction.customId.startsWith('rate_')) {
            const parts = interaction.customId.split('_');
            const type = parts[1]; // staff أو mediator
            const stars = parts[2];
            const targetId = parts[3]; // أيدي الإداري أو الوسيط
            const guildId = parts[4]; 

            const config = await GuildConfig.findOne({ guildId: guildId });
            if (!config) return interaction.reply({ content: '❌ حدث خطأ في السيرفر.', ephemeral: true });

            const logChannelId = type === 'staff' ? config.staffRatingChannelId : config.mediatorRatingChannelId;
            const guild = client.guilds.cache.get(guildId);
            
            if (guild && logChannelId) {
                const logChannel = guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const starsText = '⭐'.repeat(parseInt(stars));
                    const embed = new EmbedBuilder()
                        .setTitle(`🌟 تقييم ${type === 'staff' ? 'إداري' : 'وسيط'} جديد`)
                        .addFields(
                            { name: 'العضو المقيم:', value: `<@${interaction.user.id}>`, inline: true },
                            { name: 'المُقيَّم:', value: `<@${targetId}>`, inline: true },
                            { name: 'التقييم:', value: starsText, inline: false }
                        )
                        .setColor('#f2a658')
                        .setTimestamp();
                    await logChannel.send({ embeds: [embed] }).catch(()=>{});
                }
            }
            await interaction.update({ content: `✅ **تم إرسال تقييمك (${stars} نجوم) للإدارة بنجاح. شكراً لك!**`, components: [], embeds: [] });
            return;
        }

        if (!interaction.guild) return;
        const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config) return;

        // ==========================================
        // 🟢 1. فتح التكت والنوافذ (Modals)
        // ==========================================
        if (interaction.isButton() && interaction.customId.startsWith('ticket_open_')) {
            const btnId = interaction.customId.replace('ticket_open_', '');
            const buttonData = config.customButtons.find(b => b.id === btnId);
            if (!buttonData) return interaction.reply({ content: '❌ هذا الزر غير متوفر.', ephemeral: true });

            const userTickets = interaction.guild.channels.cache.filter(c => c.name.startsWith('ticket-') && c.topic === interaction.user.id);
            if (userTickets.size >= (config.maxTicketsPerUser || 1)) {
                return interaction.reply({ content: `❌ لا يمكنك فتح أكثر من ${config.maxTicketsPerUser} تذكرة.`, ephemeral: true });
            }

            // لو الزرار متفعل له نافذة (Modal)
            if (buttonData.requireModal && buttonData.modalFields && buttonData.modalFields.length > 0) {
                const modal = new ModalBuilder()
                    .setCustomId(`modalticket_${btnId}`)
                    .setTitle(buttonData.modalTitle || 'بيانات التكت');

                buttonData.modalFields.forEach((field, index) => {
                    const textInput = new TextInputBuilder()
                        .setCustomId(`field_${index}`)
                        .setLabel(field.label)
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder(field.placeholder || 'اكتب هنا...')
                        .setRequired(field.required || true);
                    modal.addComponents(new ActionRowBuilder().addComponents(textInput));
                });

                await interaction.showModal(modal);
            } else {
                await createTicket(interaction, buttonData, config, []);
            }
        }

        // استقبال بيانات النافذة بعد الكتابة
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modalticket_')) {
            const btnId = interaction.customId.replace('modalticket_', '');
            const buttonData = config.customButtons.find(b => b.id === btnId);
            if (!buttonData) return;

            const answers = [];
            buttonData.modalFields.forEach((field, index) => {
                answers.push({ label: field.label, value: interaction.fields.getTextInputValue(`field_${index}`) });
            });

            await createTicket(interaction, buttonData, config, answers);
        }

        // ==========================================
        // ⚙️ 2. أزرار التحكم جوه التكت (Claim, Close, Add)
        // ==========================================
        if (interaction.isButton()) {

                        // ⚖️ زراير الموافقة والرفض الخاصة بالتريد (!trade)
            if (interaction.customId === 'trade_approve' || interaction.customId === 'trade_reject') {
                // التحقق: هل الشخص اللي داس معاه رتبة الإدارة العليا أو الوساطة العليا؟
                const isHighStaff = config.highAdminRoles.some(id => interaction.member.roles.cache.has(id)) || 
                                    config.highMediatorRoles.some(id => interaction.member.roles.cache.has(id)) || 
                                    interaction.member.permissions.has('Administrator');

                if (!isHighStaff) {
                    return interaction.reply({ content: '❌ **هذا الزر مخصص للإدارة والوساطة العليا فقط!**', ephemeral: true });
                }

                const oldEmbed = interaction.message.embeds[0];
                const updatedEmbed = EmbedBuilder.from(oldEmbed);

                if (interaction.customId === 'trade_approve') {
                    updatedEmbed.setColor('#3ba55d').addFields({ name: 'حالة الطلب:', value: `✅ تمت الموافقة بواسطة <@${interaction.user.id}>` });
                } else {
                    updatedEmbed.setColor('#ed4245').addFields({ name: 'حالة الطلب:', value: `❌ تم الرفض بواسطة <@${interaction.user.id}>` });
                }

                // مسح الزراير بعد الضغط وتحديث الإيمبد
                await interaction.update({ embeds: [updatedEmbed], components: [] });
                return;
            }
            
            
            // ✅ زر الاستلام (Claim) + تعطيل الزر (شفاف)
            if (interaction.customId === 'ticket_claim') {
                // منع الضغط لغير الإدارة
                const hasPerm = [config.adminRoleId, config.mediatorRoleId, ...config.highAdminRoles, ...config.highMediatorRoles].some(id => interaction.member.roles.cache.has(id)) || interaction.member.permissions.has('Administrator');
                if (!hasPerm) return interaction.reply({ content: '❌ ليس لديك صلاحية.', ephemeral: true });

                await interaction.deferUpdate();

                // 1. تجميع كل رتب الإدارة في مصفوفة واحدة قوية
                const allStaffRoles = [config.adminRoleId, config.mediatorRoleId, ...config.highAdminRoles, ...config.highMediatorRoles].filter(Boolean);
                
                // 2. تطبيق الحماية والمراقبة على كل الرتب
                for (const roleId of allStaffRoles) {
                    if (config.hideTicketOnClaim) {
                        await interaction.channel.permissionOverwrites.edit(roleId, { ViewChannel: false }).catch(()=>{});
                    } else if (config.readOnlyStaffOnClaim) {
                        await interaction.channel.permissionOverwrites.edit(roleId, { SendMessages: false }).catch(()=>{});
                    }
                }
                
                // 3. إعطاء المستلم صلاحيات كاملة
                await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });

                // 4. جعل زر الكليم "شفاف ومغلق"
                const updatedComponents = interaction.message.components.map(row => {
                    return new ActionRowBuilder().addComponents(
                        row.components.map(component => {
                            const btn = ButtonBuilder.from(component);
                            if (component.customId === 'ticket_claim') btn.setDisabled(true);
                            return btn;
                        })
                    );
                });
                await interaction.message.edit({ components: updatedComponents });

                // 5. إرسال الرسالة الإنجليزية للتأكيد
                await interaction.channel.send(`✅ **The ticket has been claimed successfully by <@${interaction.user.id}>**`);
            }

            // 🔒 زر الإغلاق (Close)
            if (interaction.customId === 'ticket_close') {
                await interaction.deferUpdate();
                const ticketOwnerId = interaction.channel.topic;

                // 1. رسالة الإغلاق باللغة الإنجليزية
                await interaction.channel.send(`🔒 **The ticket has been closed by <@${interaction.user.id}>**`);

                // 2. إرسال تقييم الإدارة لصاحب التكت في الخاص
                if (ticketOwnerId && config.staffRatingChannelId) {
                    try {
                        const owner = await interaction.guild.members.fetch(ticketOwnerId);
                        const ratingEmbed = new EmbedBuilder()
                            .setTitle('🌟 تقييم الخدمة')
                            .setDescription(`لقد تم إغلاق تذكرتك في **${interaction.guild.name}**.\nيرجى تقييم الإداري <@${interaction.user.id}> بالضغط على الأزرار أسفله:`)
                            .setColor('#f2a658');
                        
                        const ratingRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId(`rate_staff_5_${interaction.user.id}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Success),
                            new ButtonBuilder().setCustomId(`rate_staff_1_${interaction.user.id}_${interaction.guild.id}`).setLabel('⭐').setStyle(ButtonStyle.Danger)
                        );
                        await owner.send({ embeds: [ratingEmbed], components: [ratingRow] });
                    } catch (err) { console.log('تعذر إرسال التقييم في الخاص'); }
                }

                // 3. سحب الصلاحيات من العضو
                if (ticketOwnerId) {
                    await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { SendMessages: false, ViewChannel: false }).catch(()=>{});
                }

                // 4. إرسال بانر التحكم الأخير (بالشكل اللي طلبته)
                const closeEmbed = new EmbedBuilder()
                    .setTitle('Ticket control')
                    .setDescription(`Closed By: <@${interaction.user.id}>\n(${interaction.user.id})`)
                    .setColor('#2b2d31');

                const controlRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen ticket').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete ticket').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('ticket_delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
                );

                await interaction.channel.send({ embeds: [closeEmbed], components: [controlRow] });
            }

            // 🔓 إعادة فتح (Reopen)
            if (interaction.customId === 'ticket_reopen') {
                const ticketOwnerId = interaction.channel.topic;
                if (ticketOwnerId) await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { SendMessages: true, ViewChannel: true });
                await interaction.reply('✅ **The ticket has been reopened.**');
                await interaction.message.delete().catch(() => {});
            }

            // 🗑️ حذف مباشر (Delete)
            if (interaction.customId === 'ticket_delete') {
                await interaction.reply('جاري حفظ السجل وحذف التذكرة...');
                await deleteAndLogTicket(interaction.channel, interaction.user, config, "بدون سبب");
            }

            // 📝 حذف مع سبب (Delete With Reason)
            if (interaction.customId === 'ticket_delete_reason') {
                const modal = new ModalBuilder().setCustomId('modal_delete_reason').setTitle('سبب حذف التذكرة');
                const reasonInput = new TextInputBuilder().setCustomId('delete_reason').setLabel('اكتب سبب الحذف هنا:').setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                await interaction.showModal(modal);
            }

            // ➕ إضافة عضو (Add User)
            if (interaction.customId === 'ticket_add_user') {
                const modal = new ModalBuilder().setCustomId('modal_add_user').setTitle('إضافة عضو للتكت');
                const idInput = new TextInputBuilder().setCustomId('user_id_to_add').setLabel('أيدي العضو (User ID):').setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(idInput));
                await interaction.showModal(modal);
            }
        }

        // ==========================================
        // 🧩 3. معالجة نوافذ الإدارة (حذف بسبب / إضافة عضو)
        // ==========================================
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_delete_reason') {
                const reason = interaction.fields.getTextInputValue('delete_reason');
                await interaction.reply('جاري حفظ السجل وحذف التذكرة...');
                await deleteAndLogTicket(interaction.channel, interaction.user, config, reason);
            }

            if (interaction.customId === 'modal_add_user') {
                const userId = interaction.fields.getTextInputValue('user_id_to_add');
                try {
                    const member = await interaction.guild.members.fetch(userId);
                    await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true });
                    // الرسالة الإنجليزية بالظبط زي ما طلبت
                    await interaction.reply(`✅ <@${userId}> **has been added to the ticket by:** <@${interaction.user.id}>`);
                } catch (err) {
                    await interaction.reply({ content: '❌ لم يتم العثور على العضو.', ephemeral: true });
                }
            }
        }
    });

    // ==========================================
    // 🛠️ دالة إنشاء التكت
    // ==========================================
    async function createTicket(interaction, buttonData, config, answers) {
        await interaction.deferReply({ ephemeral: true });
        let ticketNum = config.ticketCount + 1;
        await GuildConfig.findOneAndUpdate({ guildId: interaction.guild.id }, { $inc: { ticketCount: 1 } });

        const categoryId = buttonData.categoryId || config.defaultCategoryId;
        const permissionOverwrites = [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ];

        // إعطاء كل رتب الإدارة الصلاحية المبدئية للرؤية
        const allStaffRoles = [config.adminRoleId, config.mediatorRoleId, ...config.highAdminRoles, ...config.highMediatorRoles].filter(Boolean);
        allStaffRoles.forEach(roleId => {
            permissionOverwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
        });

        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${ticketNum}`,
            type: ChannelType.GuildText,
            parent: categoryId,
            topic: interaction.user.id, 
            permissionOverwrites: permissionOverwrites
        });

        const outsideMessage = `حياك الله <@${interaction.user.id}>\nReason: ${buttonData.label}`;
        const insideEmbed = new EmbedBuilder()
            .setTitle(buttonData.insideEmbedTitle || 'الدعم الفني')
            .setDescription(buttonData.insideEmbedDesc || 'يرجى كتابة طلبك.')
            .setColor(buttonData.insideEmbedColor || '#2b2d31');

        if (answers.length > 0) {
            let fieldsStr = '';
            answers.forEach(a => fieldsStr += `**${a.label}:**\n${a.value}\n\n`);
            insideEmbed.addFields({ name: '📝 بيانات الطلب:', value: fieldsStr });
        }

        // زراير التحكم الموحدة
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_add_user').setLabel('Add User').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger)
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({ content: outsideMessage, embeds: [insideEmbed], components: [row1, row2] });
        await interaction.editReply(`✅ تم فتح تذكرتك بنجاح: <#${ticketChannel.id}>`);
    }

    // ==========================================
    // 🛠️ دالة الحذف والترانسكريبت
    // ==========================================
    async function deleteAndLogTicket(channel, closedBy, config, reason) {
        const attachment = await discordTranscripts.createTranscript(channel, {
            limit: -1, returnType: 'attachment', filename: `${channel.name}.html`, saveImages: true, poweredBy: false
        });

        const logEmbed = new EmbedBuilder()
            .setTitle('📄 سجل إغلاق تذكرة')
            .addFields(
                { name: 'اسم التذكرة:', value: channel.name, inline: true },
                { name: 'صاحب التذكرة:', value: `<@${channel.topic}>`, inline: true },
                { name: 'أُغلقت بواسطة:', value: `<@${closedBy.id}>`, inline: true },
                { name: 'السبب:', value: reason, inline: false }
            )
            .setColor('#ed4245').setTimestamp();

        if (config.ticketLogChannelId) {
            const logChannel = channel.guild.channels.cache.get(config.ticketLogChannelId);
            if (logChannel) await logChannel.send({ embeds: [logEmbed], files: [attachment] }).catch(()=>{});
        }
        if (config.transcriptChannelId && config.transcriptChannelId !== config.ticketLogChannelId) {
            const transChannel = channel.guild.channels.cache.get(config.transcriptChannelId);
            if (transChannel) await transChannel.send({ embeds: [logEmbed], files: [attachment] }).catch(()=>{});
        }
        setTimeout(() => channel.delete().catch(()=>{}), 4000);
    }
};
