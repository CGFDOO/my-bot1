const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    client.on('interactionCreate', async interaction => {
        if (!interaction.guild) return;

        const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config) return;

        // ==========================================
        // 🟢 1. عند الضغط على زر فتح التكت من البانر
        // ==========================================
        if (interaction.isButton() && interaction.customId.startsWith('ticket_open_')) {
            const btnId = interaction.customId.replace('ticket_open_', '');
            const buttonData = config.customButtons.find(b => b.id === btnId);
            if (!buttonData) return interaction.reply({ content: '❌ هذا الزر غير متوفر حالياً.', ephemeral: true });

            // التحقق من الحد الأقصى للتكتات
            const userTickets = interaction.guild.channels.cache.filter(c => c.name.includes(`ticket-`) && c.topic === interaction.user.id);
            if (userTickets.size >= (config.maxTicketsPerUser || 1)) {
                return interaction.reply({ content: `❌ لا يمكنك فتح أكثر من ${config.maxTicketsPerUser} تذكرة في نفس الوقت.`, ephemeral: true });
            }

            // إذا كان الزرار يطلب نافذة (Modal)
            if (buttonData.requireModal && buttonData.modalFields.length > 0) {
                const modal = new ModalBuilder()
                    .setCustomId(`modal_ticket_${btnId}`)
                    .setTitle(buttonData.modalTitle || 'بيانات التكت');

                buttonData.modalFields.forEach((field, index) => {
                    const textInput = new TextInputBuilder()
                        .setCustomId(`field_${index}`)
                        .setLabel(field.label)
                        .setStyle(TextInputStyle.Paragraph)
                        .setPlaceholder(field.placeholder || 'اكتب هنا...')
                        .setRequired(field.required);
                    modal.addComponents(new ActionRowBuilder().addComponents(textInput));
                });

                await interaction.showModal(modal);
            } else {
                // إذا لم يكن هناك نافذة، افتح التكت فوراً
                await createTicket(interaction, buttonData, config, []);
            }
        }

        // ==========================================
        // 📝 2. عند إرسال النافذة (Modal Submit)
        // ==========================================
        if (interaction.isModalSubmit() && interaction.customId.startsWith('modal_ticket_')) {
            const btnId = interaction.customId.replace('modal_ticket_', '');
            const buttonData = config.customButtons.find(b => b.id === btnId);
            if (!buttonData) return;

            const answers = [];
            buttonData.modalFields.forEach((field, index) => {
                answers.push({ label: field.label, value: interaction.fields.getTextInputValue(`field_${index}`) });
            });

            await createTicket(interaction, buttonData, config, answers);
        }

        // ==========================================
        // ⚙️ 3. أزرار التحكم داخل التكت (Claim, Close, Add, Delete)
        // ==========================================
        if (interaction.isButton()) {
            
            // 🔒 زر إغلاق التكت (Close)
            if (interaction.customId === 'ticket_close') {
                if (!interaction.member.permissions.has('ManageChannels') && !interaction.member.roles.cache.has(config.adminRoleId)) {
                    return interaction.reply({ content: '❌ لا تملك صلاحية لإغلاق التذكرة.', ephemeral: true });
                }

                await interaction.deferUpdate();
                
                // سحب الصلاحيات من العضو
                const ticketOwnerId = interaction.channel.topic;
                if (ticketOwnerId) {
                    await interaction.channel.permissionOverwrites.edit(ticketOwnerId, {
                        SendMessages: false,
                        ViewChannel: false
                    });
                }

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

            // 🔓 زر إعادة فتح التكت (Reopen)
            if (interaction.customId === 'ticket_reopen') {
                const ticketOwnerId = interaction.channel.topic;
                if (ticketOwnerId) {
                    await interaction.channel.permissionOverwrites.edit(ticketOwnerId, {
                        SendMessages: true,
                        ViewChannel: true
                    });
                }
                await interaction.reply('✅ تم إعادة فتح التذكرة بنجاح.');
                await interaction.message.delete().catch(() => {});
            }

            // 🗑️ زر الحذف المباشر (Delete)
            if (interaction.customId === 'ticket_delete') {
                await interaction.reply('جاري حذف التذكرة وحفظ السجل...');
                await deleteAndLogTicket(interaction.channel, interaction.user, config, "بدون سبب");
            }

            // 📝 زر الحذف مع سبب (Delete With Reason)
            if (interaction.customId === 'ticket_delete_reason') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_delete_reason')
                    .setTitle('سبب حذف التذكرة');
                const reasonInput = new TextInputBuilder()
                    .setCustomId('delete_reason')
                    .setLabel('اكتب سبب الحذف:')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                await interaction.showModal(modal);
            }

            // ✅ زر الاستلام (Claim)
            if (interaction.customId === 'ticket_claim') {
                await interaction.deferUpdate();
                
                // تنفيذ خصوصية الاستلام (إخفاء أو مراقبة)
                const staffRoles = [config.adminRoleId, config.mediatorRoleId].filter(Boolean);
                for (const roleId of staffRoles) {
                    if (config.hideTicketOnClaim) {
                        await interaction.channel.permissionOverwrites.edit(roleId, { ViewChannel: false });
                    } else if (config.readOnlyStaffOnClaim) {
                        await interaction.channel.permissionOverwrites.edit(roleId, { SendMessages: false });
                    }
                }
                // إعطاء المستلم صلاحيات كاملة
                await interaction.channel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, SendMessages: true });

                await interaction.channel.send(`✅ **The ticket has been claimed successfully by <@${interaction.user.id}>**`);
            }

            // ➕ زر إضافة عضو (Add User)
            if (interaction.customId === 'ticket_add_user') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_add_user')
                    .setTitle('إضافة عضو للتكت');
                const idInput = new TextInputBuilder()
                    .setCustomId('user_id_to_add')
                    .setLabel('أيدي العضو (User ID):')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(idInput));
                await interaction.showModal(modal);
            }
        }

        // ==========================================
        // 🧩 4. معالجة نوافذ التحكم (الحذف بالسبب / إضافة عضو)
        // ==========================================
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_delete_reason') {
                const reason = interaction.fields.getTextInputValue('delete_reason');
                await interaction.reply('جاري حذف التذكرة وحفظ السجل...');
                await deleteAndLogTicket(interaction.channel, interaction.user, config, reason);
            }

            if (interaction.customId === 'modal_add_user') {
                const userId = interaction.fields.getTextInputValue('user_id_to_add');
                try {
                    const member = await interaction.guild.members.fetch(userId);
                    await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true });
                    await interaction.reply(`✅ <@${userId}> **has been added to the ticket by:** <@${interaction.user.id}>`);
                } catch (err) {
                    await interaction.reply({ content: '❌ لم يتم العثور على العضو.', ephemeral: true });
                }
            }
        }
    });

    // ==========================================
    // 🛠️ دوال مساعدة لإنشاء وحذف التكت
    // ==========================================
    
    // دالة إنشاء التكت
    async function createTicket(interaction, buttonData, config, answers) {
        await interaction.deferReply({ ephemeral: true });
        
        let ticketNum = config.ticketCount + 1;
        await GuildConfig.findOneAndUpdate({ guildId: interaction.guild.id }, { $inc: { ticketCount: 1 } });

        const categoryId = buttonData.categoryId || config.defaultCategoryId;
        const permissionOverwrites = [
            { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
        ];

        // إعطاء الإدارة صلاحية رؤية التكت
        const staffRoles = [config.adminRoleId, config.mediatorRoleId].filter(Boolean);
        staffRoles.forEach(roleId => {
            permissionOverwrites.push({ id: roleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] });
        });

        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${ticketNum}`,
            type: ChannelType.GuildText,
            parent: categoryId,
            topic: interaction.user.id, // حفظ أيدي صاحب التكت في الوصف
            permissionOverwrites: permissionOverwrites
        });

        // رسالة الترحيب خارج الإيمبد
        const outsideMessage = `حياك الله <@${interaction.user.id}>\nReason: ${buttonData.label}`;

        // بناء الإيمبد الداخلي
        const insideEmbed = new EmbedBuilder()
            .setTitle(buttonData.insideEmbedTitle || 'الدعم الفني')
            .setDescription(buttonData.insideEmbedDesc || 'يرجى كتابة طلبك بالتفصيل.')
            .setColor(buttonData.insideEmbedColor || '#2b2d31');

        if (answers.length > 0) {
            let fieldsStr = '';
            answers.forEach(a => fieldsStr += `**${a.label}:**\n${a.value}\n\n`);
            insideEmbed.addFields({ name: '📝 بيانات الطلب:', value: fieldsStr });
        }

        // أزرار التحكم الموحدة (الترتيب الذي طلبته)
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

    // دالة حذف التكت وإرسال الترانسكريبت
    async function deleteAndLogTicket(channel, closedBy, config, reason) {
        // إنشاء ترانسكريبت
        const attachment = await discordTranscripts.createTranscript(channel, {
            limit: -1,
            returnType: 'attachment',
            filename: `${channel.name}.html`,
            saveImages: true,
            poweredBy: false
        });

        const logEmbed = new EmbedBuilder()
            .setTitle('📄 سجل إغلاق تذكرة')
            .addFields(
                { name: 'اسم التذكرة:', value: channel.name, inline: true },
                { name: 'أُغلقت بواسطة:', value: `<@${closedBy.id}>`, inline: true },
                { name: 'السبب:', value: reason, inline: false }
            )
            .setColor('#ed4245')
            .setTimestamp();

        // إرسال للوج التكتات الشامل
        if (config.ticketLogChannelId) {
            const logChannel = channel.guild.channels.cache.get(config.ticketLogChannelId);
            if (logChannel) await logChannel.send({ embeds: [logEmbed], files: [attachment] }).catch(()=>{});
        }
        
        // إرسال للترانسكريبت المنفصل
        if (config.transcriptChannelId && config.transcriptChannelId !== config.ticketLogChannelId) {
            const transChannel = channel.guild.channels.cache.get(config.transcriptChannelId);
            if (transChannel) await transChannel.send({ embeds: [logEmbed], files: [attachment] }).catch(()=>{});
        }

        setTimeout(() => channel.delete().catch(()=>{}), 3000);
    }
};
