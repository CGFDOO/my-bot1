const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, InteractionType, ChannelType, PermissionFlagsBits 
} = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');

module.exports = async (client) => {

    // ====================================================
    // ⚙️ CONFIGURATION - إعدادات السيرفر
    // ====================================================
    const CONFIG = {
        prefix: '!',
        guildID: '1453877816142860350', // ضع أيدي السيرفر هنا
        categoryID: '1453943996392013901',
        
        // الرتب
        staffRole: '1454199885460144189',      // إدارة صغرى
        adminRole: '1453946893053726830',      // إدارة عليا
        mediatorRole: '1454563893249703998',   // وسطاء
        highMediators: ['1454560063480922375', '1466937817639948349'], // رتب الوساطة العليا

        // القنوات
        logsChannel: '1453948413963141153',       // لوق العمليات
        transcriptChannel: '1472218573710823679', // لوق الترانسكربت (الشكل الجديد)
        mediatorRatingLog: '1472439331443441828', // لوق تقييم الوسطاء
        staffRatingLog: '1472023428658630686',    // لوق تقييم الإدارة
    };

    // التخزين المؤقت
    if (!client.ticketCounter) client.ticketCounter = 346; // بداية الترقيم
    const activeTrades = new Map();  // channelId -> TradeText
    const ticketTypes = new Map();   // channelId -> Type
    const ticketClaimer = new Map(); // channelId -> UserID (لمعرفة من استلم التكت)

    // ====================================================
    // 1️⃣ MESSAGE COMMANDS (الأوامر الكتابية)
    // ====================================================
    client.on('messageCreate', async (message) => {
        if (!message.guild || message.author.bot || !message.content.startsWith(CONFIG.prefix)) return;
        
        const args = message.content.slice(CONFIG.prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        const isHighMed = CONFIG.highMediators.some(id => message.member.roles.cache.has(id));
        const isMed = message.member.roles.cache.has(CONFIG.mediatorRole) || isHighMed;
        const isAdmin = message.member.roles.cache.has(CONFIG.adminRole) || isHighMed;
        const isStaff = message.member.roles.cache.has(CONFIG.staffRole) || isAdmin;

        // --- !setup-mnc ---
        if (command === 'setup-mnc' && isAdmin) {
            message.delete();
            const embed = new EmbedBuilder()
                .setTitle('# 📋 قوانين التكت لتجنب أي عقوبات')
                .setDescription(
                    `**--------------------------------------------------**\n` +
                    `**・ عند فتح تذكرة وعدم كتابة استفسارك أو مشكلتك فورا سيتم حذفها بدون أي تردد**\n` +
                    `**・ يمنع فتح أكثر من تذكرتين في نفس الوقت النظام سيقوم بحظر التذاكر المكررة تلقائيا**\n` +
                    `**・ يمنع منشن طاقم الإدارة العليا أو الصغرى الرد يتم حسب الأولوية ووقت فتح التذكرة.**\n` +
                    `**・ يرجى إرفاق كافة الأدلة الصور المتعلقة بمشكلتك لضمان سرعة الرد وحل المشكلة**\n` +
                    `**・ أي تجاوز أو إساءة في التعامل مع الفريق الإداري داخل التذكرة يعرضك للعقوبات**\n` +
                    `**・ تذكرتك لا يراها إلا الطاقم المختص؛ يرجى عدم مشاركة تفاصيل حساسة خارج التذكرة.**\n` +
                    `**--------------------------------------------------**`
                )
                .setColor('#FFFFFF')
                .setImage('https://dummyimage.com/600x200/ffffff/000000.png&text=MNC+System'); 

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('create_mediator').setLabel('طلب وسيط').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('create_support').setLabel('دعم فني').setEmoji('🛠️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('create_gift').setLabel('استلام هدايا').setEmoji('🎁').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('create_creator').setLabel('صانع محتوى').setEmoji('🎥').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('create_admin').setLabel('شكوى إداري').setEmoji('⚠️').setStyle(ButtonStyle.Secondary)
            );

            return message.channel.send({ embeds: [embed], components: [row] });
        }

        // --- !trade ---
        if (command === 'trade' && isMed && message.channel.name.startsWith('ticket-')) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_trade_input').setLabel('📝 تسجيل بيانات التريد').setStyle(ButtonStyle.Primary)
            );
            return message.reply({ content: '**👇 Mediator: اضغط هنا لتسجيل بيانات العملية:**', components: [row] });
        }

        // --- !req-high (الإيمبد الكبير) ---
        if (command === 'req-high' && isMed && message.channel.name.startsWith('ticket-')) {
            const trade = activeTrades.get(message.channel.id) || "⚠️ لم يتم تسجيل التريد بعد!";
            
            const embed = new EmbedBuilder()
                .setTitle('⚖️ **طلب موافقة وساطة عليا**')
                .setDescription(
                    `**--------------------------------------------------**\n` +
                    `**👤 الوسيط الطالب:** ${message.author}\n\n` +
                    `**📦 تفاصيل التريد:**\n` +
                    `\`\`\`\n${trade}\n\`\`\`\n` +
                    `**--------------------------------------------------**`
                )
                .setColor('#F1C40F')
                .setThumbnail(message.author.displayAvatarURL());
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('high_approve').setLabel('Accept').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('high_reject').setLabel('Reject').setStyle(ButtonStyle.Danger)
            );
            
            const mentions = CONFIG.highMediators.map(r => `<@&${r}>`).join(' ');
            return message.channel.send({ content: `⚠️ **High Staff Approval Needed:** ${mentions}`, embeds: [embed], components: [row] });
        }

        // --- !done ---
        if (command === 'done' && isMed && message.channel.name.startsWith('ticket-')) {
            const ownerId = message.channel.topic;
            // نسجل من كتب الأمر كوسيط إذا لم يكن هناك Claim
            if (!ticketClaimer.has(message.channel.id)) {
                ticketClaimer.set(message.channel.id, message.author.id);
            }

            const owner = await message.guild.members.fetch(ownerId).catch(() => null);
            if (owner) {
                const row = new ActionRowBuilder().addComponents(
                    [1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_med_${i}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary))
                );
                await owner.send({ content: `⭐ **MNC Mediator Rating:**\n**يرجى تقييم خدمة الوسيط:**`, components: [row] }).catch(() => {});
                return message.channel.send('✅ **تم إرسال طلب التقييم للعميل بنجاح.**');
            }
        }

        // --- !come @user (الشكل الجديد) ---
        if (command === 'come') { // للجميع أو للموظفين حسب رغبتك (هنا للجميع لاستدعاء شخص)
            const target = message.mentions.members.first();
            if (!target) return message.reply('**❌ Please mention a user.**');
            
            message.delete();
            // إنشاء دعوة حقيقية ليظهر الكارت
            const invite = await message.channel.createInvite({ maxAge: 86400, maxUses: 1 });
            
            await target.send({ 
                content: `**🚨 تم استدعاؤك!**\n**يرجى الحضور هنا:** ${invite.url}` 
            }).catch(() => message.channel.send(`❌ **Could not DM ${target}.**`));
            
            return message.channel.send(`✅ **Summon sent to ${target}.**`);
        }
    });

    // ====================================================
    // 2️⃣ INTERACTION HANDLER
    // ====================================================
    client.on('interactionCreate', async (interaction) => {
        const { customId, guild, user, channel, member } = interaction;

        // --- A. فتح التذاكر ---
        if (customId.startsWith('create_')) {
            const type = customId.split('_')[1];
            
            if (['mediator', 'support', 'creator'].includes(type)) {
                const modal = new ModalBuilder().setCustomId(`modal_create_${type}`).setTitle('Ticket Details');
                
                if (type === 'mediator') {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_user').setLabel('يوزر الطرف الثاني؟').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_details').setLabel('تفاصيل التريد؟').setStyle(TextInputStyle.Paragraph).setRequired(true))
                    );
                } else if (type === 'support') {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('issue_details').setLabel('ما هي مشكلتك بالتفصيل؟').setStyle(TextInputStyle.Paragraph).setRequired(true))
                    );
                } else if (type === 'creator') {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('links').setLabel('الروابط / اليوزرات').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('subs').setLabel('عدد المتابعين').setStyle(TextInputStyle.Short).setRequired(true))
                    );
                }
                return await interaction.showModal(modal);
            }
            return await createTicket(interaction, type, null);
        }

        // --- B. المودالات ---
        if (interaction.type === InteractionType.ModalSubmit) {
            
            // إنشاء التكت
            if (customId.startsWith('modal_create_')) {
                const type = customId.replace('modal_create_', '');
                return await createTicket(interaction, type, interaction.fields);
            }

            // حفظ التريد
            if (customId === 'modal_trade_save') {
                const trade = interaction.fields.getTextInputValue('trade_val');
                activeTrades.set(channel.id, trade);
                await interaction.reply({ content: `**✅ Trade Saved:**\n\`${trade}\`` });
                return channel.send('**done**');
            }

            // إضافة عضو
            if (customId === 'modal_add_user') {
                const targetId = interaction.fields.getTextInputValue('uid');
                await channel.permissionOverwrites.edit(targetId, { ViewChannel: true, SendMessages: true });
                return interaction.reply({ content: `**✅ <@${targetId}> has been added to the ticket.**` });
            }

            // الحذف بسبب
            if (customId === 'modal_delete_reason') {
                const reason = interaction.fields.getTextInputValue('reason');
                await interaction.reply(`**🗑️ Deleting Ticket.. Reason: ${reason}**`);
                sendLog(guild, 'Delete', channel, user, channel.topic, null, reason);
                setTimeout(() => channel.delete().catch(() => {}), 4000);
            }

            // التقييمات (الشكل الجديد)
            if (customId.startsWith('modal_rate_')) {
                const [targetId, stars, type] = customId.replace('modal_rate_', '').split('_');
                const comment = interaction.fields.getTextInputValue('comment') || 'لا يوجد تعليق';
                const trade = activeTrades.get(channel?.id) || "لم يتم تسجيل العملية";
                
                // جلب من قام بالعمل (الوسيط أو الإداري)
                const executorId = ticketClaimer.get(channel?.id); 
                const executorMention = executorId ? `<@${executorId}>` : "غير محدد";

                // أسماء النجوم
                let starName = "عادي";
                if(stars == 2) starName = "جيد";
                if(stars == 3) starName = "جيد جداً";
                if(stars == 4) starName = "ممتاز";
                if(stars == 5) starName = "🌟 أسطوري";

                const logEmbed = new EmbedBuilder()
                    .setTitle(type === 'med' ? '🛡️ **تقييم عضو وسيط**' : '👨‍💼 **تقييم إدارة**')
                    .setColor(type === 'med' ? '#F1C40F' : '#3498DB')
                    .setTimestamp();

                if (type === 'med') {
                    // تقييم وسيط (يحتوي على التريد ومنشن الوسيط)
                    logEmbed.addFields(
                        { name: '👤 العميل', value: `<@${targetId}>`, inline: true },
                        { name: '🛡️ الوسيط', value: executorMention, inline: true },
                        { name: '⭐ التقييم', value: `**${stars}/5 (${starName})**`, inline: false },
                        { name: '--------------------------------------', value: '\u200b' },
                        { name: '📦 التريد', value: `\`\`\`${trade}\`\`\`` },
                        { name: '--------------------------------------', value: '\u200b' },
                        { name: '💬 تعليق إضافي', value: `**${comment}**` }
                    );
                } else {
                    // تقييم إدارة (بدون تريد)
                     logEmbed.addFields(
                        { name: '👤 العميل', value: `<@${targetId}>`, inline: true },
                        { name: '👮 الإداري', value: executorMention, inline: true },
                        { name: '⭐ التقييم', value: `**${stars}/5 (${starName})**`, inline: false },
                        { name: '--------------------------------------', value: '\u200b' },
                        { name: '💬 تعليق إضافي', value: `**${comment}**` }
                    );
                }

                const logChannel = type === 'med' ? CONFIG.mediatorRatingLog : CONFIG.staffRatingLog;
                await client.channels.cache.get(logChannel).send({ embeds: [logEmbed] });
                
                return interaction.reply({ content: '**✅ شكراً لتقييمك!**', ephemeral: true });
            }
        }

        // --- C. الأزرار ---
        
        // 1. Claim
        if (customId === 'btn_claim') {
            const type = ticketTypes.get(channel.id);
            if ((type === 'creator' || type === 'admin') && !member.roles.cache.has(CONFIG.adminRole)) {
                return interaction.reply({ content: '❌ **High Staff Only.**', ephemeral: true });
            }
            if (!member.roles.cache.has(CONFIG.staffRole) && !member.roles.cache.has(CONFIG.adminRole)) return;

            // تسجيل المستلم
            ticketClaimer.set(channel.id, user.id);

            await channel.permissionOverwrites.edit(CONFIG.staffRole, { ViewChannel: false });
            await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
            await channel.permissionOverwrites.edit(CONFIG.adminRole, { ViewChannel: true });

            const row = ActionRowBuilder.from(interaction.message.components[0]);
            row.components[0].setDisabled(true); 
            await interaction.update({ components: [row] });
            
            await channel.send({ content: `**✅ The ticket has been claimed successfully by <@${user.id}>**` });
            sendLog(guild, 'Claim', channel, user, channel.topic);
        }

        // 2. Close Flow
        if (customId === 'btn_close') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_confirm_close').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('btn_cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );
            return interaction.reply({ content: '**❓ Are you sure you want to close this ticket?**', components: [row] });
        }

        if (customId === 'btn_cancel_close') {
            return interaction.update({ content: '**✅ Close Cancelled.**', components: [] });
        }

        if (customId === 'btn_confirm_close') {
            const ownerId = channel.topic;
            await channel.permissionOverwrites.edit(ownerId, { ViewChannel: false });
            
            await interaction.update({ content: '**🔒 Ticket Closed.**', components: [] });
            
            const controlRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_reopen').setLabel('Reopen Ticket').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_delete').setLabel('Delete Ticket').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('btn_delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
            );
            
            await channel.send({ 
                content: `**Ticket Control Panel**\n**Closed By:** <@${user.id}>`, 
                components: [controlRow] 
            });

            // إرسال اللوق والترانسكربت (الشكل الجديد)
            const attachment = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
            
            const transcriptEmbed = new EmbedBuilder()
                .setColor('#2ecc71') // أخضر
                .setTitle('📄 Ticket Transcript')
                .addFields(
                    { name: 'Ticket Owner', value: `<@${ownerId}>`, inline: true },
                    { name: 'Ticket Name', value: channel.name, inline: true },
                    { name: 'Closed By', value: `<@${user.id}>`, inline: true },
                    { name: 'Direct Transcript', value: 'Download below', inline: false }
                );

            const transcriptLog = await client.channels.cache.get(CONFIG.transcriptChannel).send({ 
                embeds: [transcriptEmbed], 
                files: [attachment] 
            });
            
            // لوق العمليات
            sendLog(guild, 'Close', channel, user, ownerId, transcriptLog.url);

            // تقييم الإدارة (فقط إذا لم يكن تكت وساطة)
            const type = ticketTypes.get(channel.id);
            if (type !== 'mediator') {
                // تسجيل المستلم للإدارة إذا لم يكن مسجل
                if (!ticketClaimer.has(channel.id)) ticketClaimer.set(channel.id, user.id);

                const owner = await client.users.fetch(ownerId).catch(() => null);
                if (owner) {
                    const rateRow = new ActionRowBuilder().addComponents(
                        [1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_staff_${i}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary))
                    );
                    await owner.send({ content: `**📋 MNC Staff Rating:**\n**يرجى تقييم أداء الطاقم الإداري:**`, components: [rateRow] }).catch(() => {});
                }
            }
        }

        // 3. Reopen
        if (customId === 'btn_reopen') {
            const ownerId = channel.topic;
            await channel.permissionOverwrites.edit(ownerId, { ViewChannel: true });
            await interaction.message.delete();
            await interaction.reply({ content: '**🔓 Ticket Reopened.**' });
            sendLog(guild, 'Reopen', channel, user, ownerId);
        }

        // 4. Delete
        if (customId === 'btn_delete') {
            await interaction.reply('**🗑️ Deleting ticket in 5 seconds...**');
            setTimeout(() => channel.delete().catch(() => {}), 5000);
            sendLog(guild, 'Delete', channel, user, channel.topic);
        }

        // 5. Delete With Reason
        if (customId === 'btn_delete_reason') {
            const modal = new ModalBuilder().setCustomId('modal_delete_reason').setTitle('Delete Reason');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Reason').setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        // 6. Transcript
        if (customId === 'btn_transcript') {
            const attachment = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
            await client.channels.cache.get(CONFIG.transcriptChannel).send({ 
                content: `📝 **Manual Transcript:** \`${channel.name}\` requested by <@${user.id}>`, 
                files: [attachment] 
            });
            return interaction.reply({ content: '**✅ Transcript Sent.**', ephemeral: true });
        }

        // 7. Modals Triggers
        if (customId === 'btn_trade_input') {
            const modal = new ModalBuilder().setCustomId('modal_trade_save').setTitle('Trade Details');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_val').setLabel('تفاصيل التريد').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (customId === 'btn_add_user') {
            const modal = new ModalBuilder().setCustomId('modal_add_user').setTitle('Add User');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('uid').setLabel('User ID').setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (['high_approve', 'high_reject'].includes(customId)) {
            if (!CONFIG.highMediators.some(r => member.roles.cache.has(r))) {
                return interaction.reply({ content: '❌ **Only High Staff.**', ephemeral: true });
            }
            const status = customId === 'high_approve' ? '✅ **Approved**' : '❌ **Rejected**';
            await interaction.update({ content: `**${status} by <@${user.id}>**`, components: [], embeds: [interaction.message.embeds[0]] });
        }

        if (customId.startsWith('rate_')) {
            const parts = customId.split('_'); 
            const type = parts[1]; // med OR staff
            const stars = parts[2];
            
            const modal = new ModalBuilder().setCustomId(`modal_rate_${user.id}_${stars}_${type}`).setTitle('تعليق إضافي');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('comment').setLabel('تعليقك (اختياري)').setStyle(TextInputStyle.Paragraph).setRequired(false)));
            return await interaction.showModal(modal);
        }
    });

    // ====================================================
    // 3️⃣ HELPER FUNCTIONS
    // ====================================================

    async function createTicket(interaction, type, fields) {
        const { guild, user } = interaction;
        const count = client.ticketCounter++; // ترقيم متسلسل
        
        // الاسم المتسلسل
        const channel = await guild.channels.create({
            name: `ticket-${count}-${user.username}`,
            type: ChannelType.GuildText,
            parent: CONFIG.categoryID,
            topic: user.id,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: CONFIG.staffRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        ticketTypes.set(channel.id, type);

        await interaction.reply({ content: `**✅ Ticket Created:** ${channel}`, ephemeral: true });
        
        const embed = new EmbedBuilder().setColor('#FFFFFF').setTimestamp();
        let mentionText = `**حياك الله** <@${user.id}>`;

        if (type === 'mediator') {
            embed.setTitle('🛡️ **طلب وسيط**')
                .setDescription(
                    `**هذا القسم مخصص لطلب وسيط لعملية تريد داخل السيرفر**\n` +
                    `**--------------------------------------------------**\n` +
                    `**・ تأكد أن الطرف الآخر جاهز ومتواجد قبل فتح التذكرة**\n` +
                    `**・ رجاء عدم فتح أكثر من تذكرة أو إزعاج الفريق بالتذكرو المتكررة**\n` +
                    `**・ تحقق من درجة الوسيط، حيث أن لكل مستوى أمان مختلف**\n` +
                    `**・ اكتب المعلومات المطلوبة بدقة في الأسئلة التالية**\n` +
                    `**--------------------------------------------------**`
                )
                .addFields(
                    { name: '👤 الطرف الثاني', value: fields?.getTextInputValue('target_user') || 'N/A' },
                    { name: '📝 التفاصيل', value: fields?.getTextInputValue('trade_details') || 'N/A' }
                );
        } 
        else if (type === 'support') {
            embed.setTitle('🛠️ **تذكرة الدعم الفني**')
                .setDescription(
                    `**شكراً لفتح تذكرة الدعم الفني.**\n` +
                    `**--------------------------------------------------**\n` +
                    `**・ يرجى شرح شكواك أو مشكلتك أو طلبك بشكل واضح ومفصل قدر الإمكان.**\n` +
                    `**・ ارفق أي صور أو روابط أو أدلة تساعدنا على فهم المشكلة.**\n` +
                    `**・ فريق الدعم سيراجع تذكرتك ويجيبك في أسرع وقت ممكن.**\n\n` +
                    `**يرجى التحلي بالصبر، فترتيب الردود يتم حسب الأولوية ووقت الفتح.**`
                )
                .addFields({ name: '❓ المشكلة', value: fields?.getTextInputValue('issue_details') || 'N/A' });
        }
        else if (type === 'gift') {
            mentionText += `\n✨ **Please wait for staff response.**\n**-------------------------------------**`;
            embed.setTitle('🎁 **استلام هدايا**')
                .setDescription(`**--------------------------------------**\n**يرجى توضيح نوع الهدية أو الفعالية التي فزت بها.**\n**--------------------------------------**`);
        }
        else if (type === 'admin') {
            mentionText += `\n⚠️ **Please wait for High Staff response.**\n**-------------------------------------**`;
            embed.setTitle('⚠️ **شكوى إداري**')
                .setDescription(`**--------------------------------------**\n**سيتم مراجعة الشكوى من قبل الإدارة العليا فقط.**\n**--------------------------------------**`);
            // إزالة الإدارة الصغرى
            await channel.permissionOverwrites.edit(CONFIG.staffRole, { ViewChannel: false });
            await channel.permissionOverwrites.edit(CONFIG.adminRole, { ViewChannel: true });
        }
        else if (type === 'creator') {
             mentionText += `\n✨ **Please wait for Content Creator Managers.**`;
             embed.setTitle('🎥 **تقديم صانع محتوى**')
                .addFields(
                    { name: '🔗 الروابط/اليوزرات', value: fields?.getTextInputValue('links') || 'N/A' },
                    { name: '👥 المتابعين', value: fields?.getTextInputValue('subs') || 'N/A' }
                );
            // إزالة الإدارة الصغرى
            await channel.permissionOverwrites.edit(CONFIG.staffRole, { ViewChannel: false });
            await channel.permissionOverwrites.edit(CONFIG.adminRole, { ViewChannel: true });
        }

        await channel.send({ content: mentionText });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_claim').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_close').setLabel('Close').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('btn_add_user').setLabel('Add User').setStyle(ButtonStyle.Primary)
        );

        await channel.send({ embeds: [embed], components: [row] });
        
        sendLog(guild, 'Open', channel, user, user.id);
    }

    function sendLog(guild, action, channel, executor, ownerId, link = '', reason = null) {
        const embed = new EmbedBuilder()
            .setColor(action === 'Delete' ? '#FF0000' : '#2F3136')
            .setAuthor({ name: 'MNC LOGS', iconURL: guild.iconURL() })
            .setTitle(`${action} Ticket`)
            .addFields(
                { name: 'Ticket Channel', value: `\`${channel.name}\``, inline: true },
                { name: 'Executor', value: `<@${executor.id}>`, inline: true },
                { name: 'Ticket Owner', value: `<@${ownerId || 'Unknown'}>`, inline: true }
            )
            .setTimestamp();
        
        if (link) embed.addFields({ name: 'Transcript Link', value: `[Click Here](${link})` });
        if (reason) embed.addFields({ name: 'Reason', value: reason });

        const logChannel = guild.channels.cache.get(CONFIG.logsChannel);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }

    console.log('💎 MNC ULTIMATE SYSTEM V4.0 ONLINE!');
};
