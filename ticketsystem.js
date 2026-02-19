const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ChannelType, 
    PermissionFlagsBits 
} = require('discord.js');

const discordTranscripts = require('discord-html-transcripts');
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {
    
    client.on('interactionCreate', async interaction => {

        // =====================================================================
        // ⭐ الجزء الأول: نظام استقبال التقييمات في الخاص (زرار النجوم -> نافذة)
        // =====================================================================
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('rate_')) {
                
                const parts = interaction.customId.split('_');
                const type = parts[1]; // 'staff' أو 'mediator'
                const stars = parts[2];
                const targetId = parts[3];
                const guildId = parts[4]; 

                // بناء النافذة المنبثقة (Modal) لأخذ تعليق إضافي من العضو
                const modal = new ModalBuilder();
                modal.setCustomId(`modalrate_${type}_${stars}_${targetId}_${guildId}`);
                modal.setTitle('تعليق إضافي للتقييم (اختياري)');

                // بناء حقل النص
                const commentInput = new TextInputBuilder();
                commentInput.setCustomId('rating_comment');
                commentInput.setLabel('هل لديك أي تعليق أو ملاحظات إضافية؟');
                commentInput.setStyle(TextInputStyle.Paragraph);
                commentInput.setRequired(false); // جعله غير إجباري

                // إضافة الحقل للنافذة
                const actionRow = new ActionRowBuilder();
                actionRow.addComponents(commentInput);
                modal.addComponents(actionRow);

                // إظهار النافذة للمستخدم
                await interaction.showModal(modal);
                return;
            }
        }

        // =====================================================================
        // ⭐ الجزء الثاني: استلام التعليق من النافذة وإرسال اللوج للسيرفر
        // =====================================================================
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('modalrate_')) {
                
                const parts = interaction.customId.split('_');
                const type = parts[1];
                const stars = parseInt(parts[2]);
                const targetId = parts[3];
                const guildId = parts[4];
                
                // جلب التعليق الإضافي أو وضع نص افتراضي
                let feedback = interaction.fields.getTextInputValue('rating_comment');
                if (!feedback || feedback.trim() === '') {
                    feedback = 'بدون تعليق إضافي';
                }

                // جلب إعدادات السيرفر من قاعدة البيانات
                let config = await GuildConfig.findOne({ guildId: guildId });
                if (!config) return;

                // تحديد روم اللوج بناءً على نوع التقييم
                let logChannelId = null;
                if (type === 'staff') {
                    logChannelId = config.staffRatingChannelId;
                } else if (type === 'mediator') {
                    logChannelId = config.mediatorRatingChannelId;
                }

                const guild = client.guilds.cache.get(guildId);
                
                if (guild && logChannelId) {
                    const logChannel = guild.channels.cache.get(logChannelId);
                    
                    if (logChannel) {
                        // 🔥 تحديث العدادات الموحدة في الداتابيز
                        let currentServerTotal = config.totalServerRatings || 0;
                        currentServerTotal += 1;
                        config.totalServerRatings = currentServerTotal;

                        let userRatingCount = 1;

                        if (type === 'staff') {
                            const currentStaffCount = config.staffRatingsCount.get(targetId) || 0;
                            userRatingCount = currentStaffCount + 1;
                            config.staffRatingsCount.set(targetId, userRatingCount);
                        } else {
                            const currentMedCount = config.mediatorRatingsCount.get(targetId) || 0;
                            userRatingCount = currentMedCount + 1;
                            config.mediatorRatingsCount.set(targetId, userRatingCount);
                        }
                        
                        await config.save();

                        // تحويل الأرقام لنجوم فعلية
                        let starsText = '';
                        for(let i = 0; i < stars; i++) {
                            starsText += '⭐';
                        }

                        // تحديد العناوين والألوان بناءً على النوع
                        let authorTitle = '';
                        let embedColor = '';
                        let targetLabel = '';

                        if (type === 'staff') {
                            authorTitle = `${guild.name} STAFF REVIEW`;
                            embedColor = '#3ba55d';
                            targetLabel = 'الإداري 👮';
                        } else {
                            authorTitle = `${guild.name} MIDDLEMAN REVIEW`;
                            embedColor = '#f2a658';
                            targetLabel = 'الوسيط 🛡️';
                        }

                        // بناء الإيمبد الفخم للوج
                        const logEmbed = new EmbedBuilder();
                        logEmbed.setAuthor({ name: `📊 ${authorTitle}`, iconURL: guild.iconURL({ dynamic: true }) });
                        logEmbed.setThumbnail(guild.iconURL({ dynamic: true }));
                        
                        const descriptionText = `
**العميل (المُقيِّم) 👤**
<@${interaction.user.id}>

**${targetLabel}**
<@${targetId}>

**الإحصائيات 📈**
عدد تقييمات ${type === 'staff' ? 'الإداري' : 'الوسيط'} #${userRatingCount}
عدد تقييمات السيرفر #${currentServerTotal}

-------------------------

**التقييم ⭐**
**${starsText} (${stars}/5)**

**التعليق 💬**
\`\`\`${feedback}\`\`\`
`;
                        logEmbed.setDescription(descriptionText);
                        logEmbed.setColor(embedColor);
                        
                        logEmbed.setFooter({ 
                            text: `Rated by: ${interaction.user.username}`, 
                            iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
                        });
                        logEmbed.setTimestamp();

                        // إرسال اللوج للسيرفر
                        const contentText = `تقييم جديد! <@${targetId}>`;
                        await logChannel.send({ content: contentText, embeds: [logEmbed] }).catch(()=>{});
                    }
                }
                
                // تعديل الرسالة في الخاص لإخفاء الأزرار وشكر العضو
                const thankYouEmbed = new EmbedBuilder();
                thankYouEmbed.setDescription(`✅ **شكراً لك! تم إرسال تقييمك بنجاح.**\n\nالنجوم: ${stars}/5\nالتعليق: ${feedback}`);
                thankYouEmbed.setColor('#3ba55d');
                
                try {
                    await interaction.update({ embeds: [thankYouEmbed], components: [] });
                } catch (err) {
                    await interaction.editReply({ embeds: [thankYouEmbed], components: [] }).catch(()=>{});
                }
                
                return;
            }
        }

        // =====================================================================
        // إيقاف التفاعلات إذا لم تكن في السيرفر (تفاعلات التكتات)
        // =====================================================================
        if (!interaction.guild) return;
        
        const config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config) return;

        // =====================================================================
        // 🟢 3. فتح التكت وتشغيل النوافذ
        // =====================================================================
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('ticket_open_')) {
                
                const btnId = interaction.customId.replace('ticket_open_', '');
                const buttonData = config.customButtons.find(b => b.id === btnId);
                
                if (!buttonData) {
                    return interaction.reply({ content: '❌ هذا الزر غير متوفر حالياً.', ephemeral: true });
                }

                // التحقق من الحد الأقصى للتكتات المفتوحة للعضو
                const maxTickets = config.maxTicketsPerUser || 1;
                const userTickets = interaction.guild.channels.cache.filter(c => {
                    return c.name.startsWith('ticket-') && c.topic && c.topic.startsWith(interaction.user.id);
                });
                
                if (userTickets.size >= maxTickets) {
                    return interaction.reply({ content: `❌ الحد الأقصى المسموح به هو ${maxTickets} تذكرة في نفس الوقت.`, ephemeral: true });
                }

                // التحقق إذا كان الزر يحتوي على نافذة أسئلة
                if (buttonData.requireModal && buttonData.modalFields && buttonData.modalFields.length > 0) {
                    
                    const modal = new ModalBuilder();
                    modal.setCustomId(`modalticket_${btnId}`);
                    
                    let modalTitle = buttonData.modalTitle;
                    if (!modalTitle) modalTitle = 'بيانات التكت';
                    modal.setTitle(modalTitle);

                    // إضافة الحقول للنافذة
                    buttonData.modalFields.forEach((field, index) => {
                        const isRequired = (field.required === true || String(field.required) === 'true');
                        
                        const textInput = new TextInputBuilder();
                        textInput.setCustomId(`field_${index}`);
                        
                        let fieldLabel = field.label;
                        if (fieldLabel.length > 45) {
                            fieldLabel = fieldLabel.substring(0, 45); // حماية من خطأ ديسكورد
                        }
                        textInput.setLabel(fieldLabel);
                        
                        textInput.setStyle(TextInputStyle.Paragraph);
                        
                        let fieldPlaceholder = field.placeholder;
                        if (!fieldPlaceholder) fieldPlaceholder = 'اكتب إجابتك هنا...';
                        textInput.setPlaceholder(fieldPlaceholder);
                        
                        textInput.setRequired(isRequired);

                        const actionRow = new ActionRowBuilder();
                        actionRow.addComponents(textInput);
                        modal.addComponents(actionRow);
                    });

                    await interaction.showModal(modal);
                } else {
                    // فتح التكت مباشرة إذا لم يكن هناك نافذة
                    await createTicket(interaction, buttonData, config, []);
                }
            }
        }

        // =====================================================================
        // استلام إجابات النافذة الخاصة بفتح التكت
        // =====================================================================
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('modalticket_')) {
                
                const btnId = interaction.customId.replace('modalticket_', '');
                const buttonData = config.customButtons.find(b => b.id === btnId);
                if (!buttonData) return;
                
                const answers = [];
                buttonData.modalFields.forEach((field, index) => {
                    const answerValue = interaction.fields.getTextInputValue(`field_${index}`);
                    answers.push({ label: field.label, value: answerValue });
                });
                
                await createTicket(interaction, buttonData, config, answers);
            }
        }

        // =====================================================================
        // ⚙️ 4. أزرار التحكم داخل التكت (Claim, Close, Reopen, Delete, Add User)
        // =====================================================================
        if (interaction.isButton()) {
            
            // -----------------------------------------
            // 🔒 زر الإغلاق (Close)
            // -----------------------------------------
            if (interaction.customId === 'ticket_close') {
                await interaction.deferUpdate();
                
                const topicData = interaction.channel.topic || '';
                const parts = topicData.split('_');
                const ticketOwnerId = parts[0];
                const btnId = parts.length > 1 ? parts[1] : null;

                const closeMessage = `🔒 **The ticket has been closed by <@${interaction.user.id}>**`;
                await interaction.channel.send(closeMessage);

                // التحقق من إرسال التقييم
                let shouldSendRating = true;
                if (btnId) {
                    const btnData = config.customButtons.find(b => b.id === btnId);
                    if (btnData) {
                        if (btnData.isMediator === true) {
                            shouldSendRating = false;
                        }
                        if (btnData.enableRating === false) {
                            shouldSendRating = false;
                        }
                    }
                }

                if (shouldSendRating && ticketOwnerId && config.staffRatingChannelId) {
                    try {
                        const owner = await interaction.guild.members.fetch(ticketOwnerId);
                        const guildName = interaction.guild.name;
                        const guildIcon = interaction.guild.iconURL({ dynamic: true });

                        const ratingEmbed = new EmbedBuilder();
                        ratingEmbed.setTitle('تقييم فريق العمل');
                        
                        const desc = `شكرا لتواصلك مع الدعم الفني الخاص بسيرفر **${guildName}**\n\nيرجى تقييم مستوى الخدمة التي تلقيتها، رأيك يهمنا ويساعدنا في تحسين جودة الخدمة، اضغط على الزر الموافق لتقييمك وسيتم ارسال التقييم للادارة.`;
                        ratingEmbed.setDescription(desc);
                        
                        ratingEmbed.setColor('#f2a658');
                        ratingEmbed.setFooter({ text: guildName, iconURL: guildIcon });
                        ratingEmbed.setTimestamp();
                        
                        const ratingRow = new ActionRowBuilder();
                        
                        const btn1 = new ButtonBuilder().setCustomId(`rate_staff_1_${interaction.user.id}_${interaction.guild.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary);
                        const btn2 = new ButtonBuilder().setCustomId(`rate_staff_2_${interaction.user.id}_${interaction.guild.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary);
                        const btn3 = new ButtonBuilder().setCustomId(`rate_staff_3_${interaction.user.id}_${interaction.guild.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        const btn4 = new ButtonBuilder().setCustomId(`rate_staff_4_${interaction.user.id}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        const btn5 = new ButtonBuilder().setCustomId(`rate_staff_5_${interaction.user.id}_${interaction.guild.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        
                        ratingRow.addComponents(btn1, btn2, btn3, btn4, btn5);
                        
                        await owner.send({ embeds: [ratingEmbed], components: [ratingRow] });
                    } catch (err) { 
                        // الخاص مغلق
                    }
                }

                // سحب صلاحيات العضو
                if (ticketOwnerId) {
                    await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { 
                        SendMessages: false, 
                        ViewChannel: false 
                    }).catch(()=>{});
                }

                // إرسال لوحة التحكم النهائية
                const closeEmbed = new EmbedBuilder();
                closeEmbed.setTitle('Ticket control');
                closeEmbed.setDescription(`Closed By: <@${interaction.user.id}>\n(${interaction.user.id})`);
                closeEmbed.setColor('#2b2d31');
                
                const controlRow = new ActionRowBuilder();
                
                const reopenBtn = new ButtonBuilder();
                reopenBtn.setCustomId('ticket_reopen');
                reopenBtn.setLabel('Reopen ticket');
                reopenBtn.setStyle(ButtonStyle.Secondary);
                
                const deleteBtn = new ButtonBuilder();
                deleteBtn.setCustomId('ticket_delete');
                deleteBtn.setLabel('Delete ticket');
                deleteBtn.setStyle(ButtonStyle.Danger);
                
                const deleteReasonBtn = new ButtonBuilder();
                deleteReasonBtn.setCustomId('ticket_delete_reason');
                deleteReasonBtn.setLabel('Delete With Reason');
                deleteReasonBtn.setStyle(ButtonStyle.Danger);
                
                controlRow.addComponents(reopenBtn, deleteBtn, deleteReasonBtn);
                
                await interaction.channel.send({ embeds: [closeEmbed], components: [controlRow] });
            }

            // -----------------------------------------
            // 🛡️ زر الاستلام (Claim)
            // -----------------------------------------
            if (interaction.customId === 'ticket_claim') {
                
                // تجميع كل الرتب
                const allStaffRoles = [
                    config.adminRoleId, 
                    config.mediatorRoleId, 
                    ...config.highAdminRoles, 
                    ...config.highMediatorRoles
                ].filter(Boolean);

                let hasPerm = false;
                if (interaction.member.permissions.has('Administrator')) {
                    hasPerm = true;
                } else {
                    for (let i = 0; i < allStaffRoles.length; i++) {
                        if (interaction.member.roles.cache.has(allStaffRoles[i])) {
                            hasPerm = true;
                            break;
                        }
                    }
                }

                if (!hasPerm) {
                    return interaction.reply({ content: '❌ ليس لديك صلاحية.', ephemeral: true });
                }

                await interaction.deferUpdate();
                
                for (let i = 0; i < allStaffRoles.length; i++) {
                    const roleId = allStaffRoles[i];
                    if (config.hideTicketOnClaim) {
                        await interaction.channel.permissionOverwrites.edit(roleId, { ViewChannel: false }).catch(()=>{});
                    } else if (config.readOnlyStaffOnClaim) {
                        await interaction.channel.permissionOverwrites.edit(roleId, { SendMessages: false }).catch(()=>{});
                    }
                }
                
                await interaction.channel.permissionOverwrites.edit(interaction.user.id, { 
                    ViewChannel: true, 
                    SendMessages: true 
                });
                
                const updatedComponents = interaction.message.components.map(row => {
                    const newRow = new ActionRowBuilder();
                    row.components.forEach(c => {
                        const btn = ButtonBuilder.from(c);
                        if (c.customId === 'ticket_claim') {
                            btn.setDisabled(true);
                            btn.setStyle(ButtonStyle.Success);
                        }
                        newRow.addComponents(btn);
                    });
                    return newRow;
                });
                
                await interaction.message.edit({ components: updatedComponents });
                
                const claimMsg = `✅ **The ticket has been claimed successfully by <@${interaction.user.id}>**`;
                await interaction.channel.send(claimMsg);
            }

            // -----------------------------------------
            // 🔓 زر إعادة הפتح (Reopen)
            // -----------------------------------------
            if (interaction.customId === 'ticket_reopen') {
                const topicData = interaction.channel.topic || '';
                const ticketOwnerId = topicData.split('_')[0];
                
                if (ticketOwnerId) {
                    await interaction.channel.permissionOverwrites.edit(ticketOwnerId, { 
                        SendMessages: true, 
                        ViewChannel: true 
                    });
                }
                
                await interaction.reply('✅ **The ticket has been reopened.**');
                await interaction.message.delete().catch(() => {});
            }

            // -----------------------------------------
            // 🗑️ زر الحذف المباشر (Delete)
            // -----------------------------------------
            if (interaction.customId === 'ticket_delete') {
                await interaction.reply('جاري الحذف وحفظ السجل...');
                await deleteAndLogTicket(interaction.channel, interaction.user, config, "بدون سبب (حذف مباشر)");
            }

            // -----------------------------------------
            // 📝 زر الحذف مع سبب (Delete With Reason)
            // -----------------------------------------
            if (interaction.customId === 'ticket_delete_reason') {
                const modal = new ModalBuilder();
                modal.setCustomId('modal_delete_reason');
                modal.setTitle('سبب حذف التذكرة');
                
                const reasonInput = new TextInputBuilder();
                reasonInput.setCustomId('delete_reason');
                reasonInput.setLabel('اكتب سبب الحذف هنا:');
                reasonInput.setStyle(TextInputStyle.Short);
                reasonInput.setRequired(true);
                
                const actionRow = new ActionRowBuilder();
                actionRow.addComponents(reasonInput);
                modal.addComponents(actionRow);
                
                await interaction.showModal(modal);
            }

            // -----------------------------------------
            // ➕ زر إضافة عضو للتكت (Add User)
            // -----------------------------------------
            if (interaction.customId === 'ticket_add_user') {
                const modal = new ModalBuilder();
                modal.setCustomId('modal_add_user');
                modal.setTitle('إضافة عضو للتكت');
                
                const idInput = new TextInputBuilder();
                idInput.setCustomId('user_id_to_add');
                idInput.setLabel('أيدي العضو (User ID):');
                idInput.setStyle(TextInputStyle.Short);
                idInput.setRequired(true);
                
                const actionRow = new ActionRowBuilder();
                actionRow.addComponents(idInput);
                modal.addComponents(actionRow);
                
                await interaction.showModal(modal);
            }
        }

        // =====================================================================
        // 🧩 الجزء الخامس: معالجة نوافذ الإدارة (الحذف بسبب / إضافة عضو)
        // =====================================================================
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
                    await interaction.channel.permissionOverwrites.edit(userId, { 
                        ViewChannel: true, 
                        SendMessages: true 
                    });
                    
                    const addMsg = `✅ <@${userId}> **has been added to the ticket by:** <@${interaction.user.id}>`;
                    await interaction.reply(addMsg);
                } catch (err) { 
                    await interaction.reply({ content: '❌ لم يتم العثور على العضو في السيرفر.', ephemeral: true }); 
                }
            }
        }
    });

    // =====================================================================
    // 🛠️ دوال مساعدة: دالة إنشاء التكت (فصل الإيمبدات كما طلبت)
    // =====================================================================
    async function createTicket(interaction, buttonData, config, answers) {
        
        await interaction.deferReply({ ephemeral: true });
        
        // زيادة عداد التكتات
        await GuildConfig.findOneAndUpdate({ guildId: interaction.guild.id }, { $inc: { ticketCount: 1 } });
        const ticketNum = config.ticketCount + 1;
        
        // تحديد القسم
        let categoryId = buttonData.categoryId;
        if (!categoryId) categoryId = config.defaultCategoryId;
        
        // إعداد الصلاحيات الأساسية
        const permissionOverwrites = [
            { 
                id: interaction.guild.id, 
                deny: [PermissionFlagsBits.ViewChannel] 
            },
            { 
                id: interaction.user.id, 
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
            }
        ];
        
        // إعطاء الإدارة الصلاحيات
        const allStaffRoles = [
            config.adminRoleId, 
            config.mediatorRoleId, 
            ...config.highAdminRoles, 
            ...config.highMediatorRoles
        ].filter(Boolean);
        
        for (let i = 0; i < allStaffRoles.length; i++) {
            permissionOverwrites.push({ 
                id: allStaffRoles[i], 
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
            });
        }

        // حفظ بيانات التكت في الوصف
        const topicData = `${interaction.user.id}_${buttonData.id}`;

        // إنشاء الروم
        const ticketChannel = await interaction.guild.channels.create({
            name: `ticket-${ticketNum}`, 
            type: ChannelType.GuildText, 
            parent: categoryId, 
            topic: topicData, 
            permissionOverwrites: permissionOverwrites
        });

        // 🔥 الرسالة الخارجية بالخط العريض
        const outsideMessage = `حياك الله <@${interaction.user.id}>\n**Reason:** ${buttonData.label}`;
        
        const embedsToSend = [];

        // 🔥 الإيمبد الأول: القوانين فقط
        const rulesEmbed = new EmbedBuilder();
        
        let inTitle = buttonData.insideEmbedTitle;
        if (!inTitle) inTitle = 'تذكرة الدعم الفني';
        rulesEmbed.setTitle(inTitle);
        
        let inDesc = buttonData.insideEmbedDesc;
        if (!inDesc) inDesc = 'يرجى كتابة طلبك بوضوح.';
        rulesEmbed.setDescription(inDesc);
        
        let inColor = buttonData.insideEmbedColor;
        if (!inColor) inColor = '#2b2d31';
        rulesEmbed.setColor(inColor);

        embedsToSend.push(rulesEmbed);

        // 🔥 الإيمبد الثاني: إجابات النافذة (منفصل تحت القوانين)
        if (answers.length > 0) {
            const answersEmbed = new EmbedBuilder();
            answersEmbed.setColor('#2b2d31');
            
            for (let i = 0; i < answers.length; i++) {
                const a = answers[i];
                let aVal = a.value;
                if (!aVal) aVal = 'لا يوجد إجابة';
                
                answersEmbed.addFields({ name: a.label, value: aVal });
            }
            embedsToSend.push(answersEmbed);
        }

        // بناء الأزرار
        const row1 = new ActionRowBuilder();
        
        const addUserBtn = new ButtonBuilder();
        addUserBtn.setCustomId('ticket_add_user');
        addUserBtn.setLabel('Add User');
        addUserBtn.setStyle(ButtonStyle.Secondary);
        
        const claimBtn = new ButtonBuilder();
        claimBtn.setCustomId('ticket_claim');
        claimBtn.setLabel('Claim');
        claimBtn.setStyle(ButtonStyle.Success);
        
        const closeBtn = new ButtonBuilder();
        closeBtn.setCustomId('ticket_close');
        closeBtn.setLabel('Close');
        closeBtn.setStyle(ButtonStyle.Danger);
        
        row1.addComponents(addUserBtn, claimBtn, closeBtn);

        const row2 = new ActionRowBuilder();
        const deleteReasonBtn = new ButtonBuilder();
        deleteReasonBtn.setCustomId('ticket_delete_reason');
        deleteReasonBtn.setLabel('Delete With Reason');
        deleteReasonBtn.setStyle(ButtonStyle.Danger);
        
        row2.addComponents(deleteReasonBtn);
        
        // إرسال كل شيء للتكت الجديد
        await ticketChannel.send({ 
            content: outsideMessage, 
            embeds: embedsToSend, 
            components: [row1, row2] 
        });
        
        await interaction.editReply(`✅ تم فتح تذكرتك بنجاح: <#${ticketChannel.id}>`);
    }

    // =====================================================================
    // 🛠️ دوال مساعدة: دالة حذف التكت وإرسال اللوج والترانسكريبت
    // =====================================================================
    async function deleteAndLogTicket(channel, closedBy, config, reason) {
        
        // إنشاء ملف HTML
        const attachment = await discordTranscripts.createTranscript(channel, { 
            limit: -1, 
            returnType: 'attachment', 
            filename: `${channel.name}.html`, 
            saveImages: true, 
            poweredBy: false 
        });
        
        const topicData = channel.topic || '';
        const ticketOwnerId = topicData.split('_')[0];
        
        let ownerDisplay = 'غير معروف';
        if (ticketOwnerId) {
            ownerDisplay = `<@${ticketOwnerId}>`;
        }

        const logEmbed = new EmbedBuilder();
        logEmbed.setTitle('📄 سجل إغلاق تذكرة');
        logEmbed.addFields(
            { name: 'اسم التذكرة:', value: channel.name, inline: true }, 
            { name: 'صاحب التذكرة:', value: ownerDisplay, inline: true }, 
            { name: 'أُغلقت بواسطة:', value: `<@${closedBy.id}>`, inline: true }, 
            { name: 'السبب:', value: reason, inline: false }
        );
        logEmbed.setColor('#ed4245');
        logEmbed.setTimestamp();
        
        if (config.ticketLogChannelId) { 
            const c = channel.guild.channels.cache.get(config.ticketLogChannelId); 
            if(c) await c.send({ embeds: [logEmbed], files: [attachment] }).catch(()=>{}); 
        }
        
        if (config.transcriptChannelId && config.transcriptChannelId !== config.ticketLogChannelId) { 
            const c = channel.guild.channels.cache.get(config.transcriptChannelId); 
            if(c) await c.send({ embeds: [logEmbed], files: [attachment] }).catch(()=>{}); 
        }
        
        // انتظار 4 ثواني ثم الحذف
        setTimeout(() => {
            channel.delete().catch(()=>{});
        }, 4000);
    }
};
