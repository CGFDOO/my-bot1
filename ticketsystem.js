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
        highMediators: ['1454560063480922375', '1466937817639948349'], // رتب الوساطة العليا (الاثنين)

        // القنوات
        logsChannel: '1453948413963141153',       // لوق العمليات (فتح/قفل/حذف)
        transcriptChannel: '1472218573710823679', // لوق الترانسكربت
        mediatorRatingLog: '1472439331443441828', // لوق تقييم الوسطاء
        staffRatingLog: '1472023428658630686',    // لوق تقييم الإدارة
    };

    // التخزين المؤقت (في الرام)
    if (!client.ticketCounter) client.ticketCounter = 3460;
    const activeTrades = new Map(); // تخزين نص التريد: channelId -> tradeText
    const ticketTypes = new Map();  // تخزين نوع التكت: channelId -> type
    const ratedUsers = new Set();   // لمنع التقييم المتكرر: messageId_userId

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
                .setTitle('✨ **MNC COMMUNITY TICKETS** ✨')
                .setDescription(
                    `**--------------------------------------------------**\n` +
                    `**📋 قوانين التكت لتجنب أي عقوبات:**\n\n` +
                    `**・ عند فتح تذكرة وعدم كتابة استفسارك فوراً سيتم حذفها.**\n` +
                    `**・ يمنع فتح أكثر من تذكرتين في نفس الوقت.**\n` +
                    `**・ يمنع منشن الإدارة؛ الرد يتم حسب الأولوية.**\n` +
                    `**・ يرجى إرفاق الأدلة والصور لضمان سرعة الحل.**\n` +
                    `**・ تذكرتك محمية ولا يراها إلا الطاقم المختص.**\n` +
                    `**--------------------------------------------------**\n` +
                    `**👇 اختر القسم المناسب لفتح تذكرتك:**`
                )
                .setColor('#FFFFFF') // أبيض
                .setImage('https://dummyimage.com/600x200/ffffff/000000.png&text=MNC+System'); // ضع رابط صورتك هنا

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('create_mediator').setLabel('طلب وسيط').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('create_support').setLabel('دعم فني').setEmoji('🛠️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('create_gift').setLabel('استلام هدايا').setEmoji('🎁').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('create_creator').setLabel('صانع محتوى').setEmoji('🎥').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('create_admin').setLabel('شكوى إداري').setEmoji('⚠️').setStyle(ButtonStyle.Danger)
            );

            return message.channel.send({ embeds: [embed], components: [row] });
        }

        // --- !trade ---
        if (command === 'trade' && isMed && message.channel.name.startsWith('ticket-')) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_trade_input').setLabel('📝 تسجيل التريد').setStyle(ButtonStyle.Primary)
            );
            return message.reply({ content: '**👇 Mediator: اضغط هنا لتسجيل بيانات العملية:**', components: [row] });
        }

        // --- !req-high (تم الإصلاح: يظهر التريد) ---
        if (command === 'req-high' && isMed && message.channel.name.startsWith('ticket-')) {
            const trade = activeTrades.get(message.channel.id) || "⚠️ لم يتم تسجيل التريد بعد!";
            
            const embed = new EmbedBuilder()
                .setTitle('⚖️ **طلب موافقة وساطة عليا**')
                .setDescription(
                    `**--------------------------------------**\n` +
                    `**👤 الوسيط:** ${message.author}\n` +
                    `**📦 التريد:**\n\`${trade}\`\n` +
                    `**--------------------------------------**`
                )
                .setColor('#F1C40F');
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('high_approve').setLabel('Accept').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('high_reject').setLabel('Reject').setStyle(ButtonStyle.Danger)
            );
            
            const mentions = CONFIG.highMediators.map(r => `<@&${r}>`).join(' ');
            return message.channel.send({ content: `⚠️ **Approval Needed:** ${mentions}`, embeds: [embed], components: [row] });
        }

        // --- !done ---
        if (command === 'done' && isMed && message.channel.name.startsWith('ticket-')) {
            const ownerId = message.channel.topic;
            const owner = await message.guild.members.fetch(ownerId).catch(() => null);
            if (owner) {
                const row = new ActionRowBuilder().addComponents(
                    [1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_med_${i}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary))
                );
                await owner.send({ content: `⭐ **MNC Mediator Rating:**\n**يرجى تقييم خدمة الوسيط:**`, components: [row] }).catch(() => {});
                return message.channel.send('✅ **Sent rating request to client.**');
            }
        }

        // --- !come @user ---
        if (command === 'come' && isStaff) {
            const target = message.mentions.members.first();
            if (!target) return message.reply('**❌ Please mention a user.**');
            
            message.delete();
            const inviteLink = `https://discord.com/channels/${message.guild.id}/${message.channel.id}`;
            
            const dmEmbed = new EmbedBuilder()
                .setTitle('🚨 **استدعاء إداري**')
                .setDescription(
                    `**--------------------------------------**\n` +
                    `**لقد طلب الطاقم الإداري حضورك فوراً!**\n` +
                    `**📍 الروم:** <#${message.channel.id}>\n` +
                    `**🔗 الرابط:** [اضغط هنا للدخول](${inviteLink})\n` +
                    `**--------------------------------------**`
                )
                .setColor('#FF0000');
            
            await target.send({ embeds: [dmEmbed] }).catch(() => message.channel.send(`❌ **Could not DM ${target}.**`));
            return message.channel.send(`✅ **Summoned ${target} to the ticket.**`);
        }
    });

    // ====================================================
    // 2️⃣ INTERACTION HANDLER
    // ====================================================
    client.on('interactionCreate', async (interaction) => {
        const { customId, guild, user, channel, member } = interaction;

        // --- A. فتح التذاكر (Modals & Logic) ---
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
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('issue_details').setLabel('ما هي مشكلتك؟').setStyle(TextInputStyle.Paragraph).setRequired(true))
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

        // --- B. معالجة المودالات ---
        if (interaction.type === InteractionType.ModalSubmit) {
            
            // إنشاء التكت
            if (customId.startsWith('modal_create_')) {
                const type = customId.replace('modal_create_', '');
                return await createTicket(interaction, type, interaction.fields);
            }

            // حفظ التريد (!trade)
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

            // التقييمات (فصل تام بين الإدارة والوساطة)
            if (customId.startsWith('modal_rate_')) {
                const [targetId, stars, type] = customId.replace('modal_rate_', '').split('_');
                const comment = interaction.fields.getTextInputValue('comment') || 'لا يوجد تعليق';
                const trade = activeTrades.get(channel?.id) || "⚠️ لم يتم تسجيل عملية";
                
                // أسماء النجوم
                let starName = "نجمة";
                if(stars == 1) starName = "عادي";
                if(stars == 2) starName = "جيد";
                if(stars == 3) starName = "جيد جداً";
                if(stars == 4) starName = "ممتاز";
                if(stars == 5) starName = "🌟 أسطوري";

                const logEmbed = new EmbedBuilder()
                    .setTitle(type === 'med' ? '🛡️ **تقييم وسيط**' : '👨‍💼 **تقييم إدارة**')
                    .setColor(type === 'med' ? '#F1C40F' : '#3498DB')
                    .setTimestamp();

                // التنسيق الجمالي
                logEmbed.addFields(
                    { name: '👤 العميل', value: `<@${targetId}>`, inline: true },
                    { name: '⭐ التقييم', value: `**${stars}/5 (${starName})**`, inline: true },
                    { name: '--------------------------------------', value: '\u200b' }
                );

                if (type === 'med') {
                    // هنا فقط يظهر التريد
                    logEmbed.addFields(
                        { name: '📦 التريد', value: `\`\`\`${trade}\`\`\`` },
                        { name: '--------------------------------------', value: '\u200b' }
                    );
                } 

                logEmbed.addFields({ name: '💬 تعليق إضافي', value: `**${comment}**` });

                // إرسال للوق المناسب
                const logChannel = type === 'med' ? CONFIG.mediatorRatingLog : CONFIG.staffRatingLog;
                await client.channels.cache.get(logChannel).send({ embeds: [logEmbed] });
                
                // منع التقييم مرة أخرى (بسيط)
                return interaction.reply({ content: '**✅ شكراً لتقييمك!**', ephemeral: true });
            }
        }

        // --- C. الأزرار ---
        
        // 1. Claim
        if (customId === 'btn_claim') {
            const type = ticketTypes.get(channel.id);
            // حماية تذاكر الإدارة العليا
            if ((type === 'creator' || type === 'admin') && !member.roles.cache.has(CONFIG.adminRole) && !CONFIG.highMediators.some(r=>member.roles.cache.has(r))) {
                return interaction.reply({ content: '❌ **High Staff Only.**', ephemeral: true });
            }
            if (!member.roles.cache.has(CONFIG.staffRole) && !member.roles.cache.has(CONFIG.adminRole)) return;

            // إخفاء عن باقي الإدارة
            await channel.permissionOverwrites.edit(CONFIG.staffRole, { ViewChannel: false });
            await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
            await channel.permissionOverwrites.edit(CONFIG.adminRole, { ViewChannel: true });

            const row = ActionRowBuilder.from(interaction.message.components[0]);
            row.components[0].setDisabled(true); // Disable Claim
            await interaction.update({ components: [row] });
            
            await channel.send({ content: `**✅ The ticket has been claimed successfully by <@${user.id}>**` });
            sendLog(guild, 'Claim', channel, user, channel.topic);
        }

        // 2. Close (Ask)
        if (customId === 'btn_close') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_confirm_close').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('btn_cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );
            return interaction.reply({ content: '**❓ Are you sure you want to close this ticket?**', components: [row] });
        }

        // 3. Cancel Close (Fixed)
        if (customId === 'btn_cancel_close') {
            return interaction.update({ content: '**✅ Close Cancelled.**', components: [] });
        }

        // 4. Confirm Close (The Big One)
        if (customId === 'btn_confirm_close') {
            const ownerId = channel.topic;
            // إخفاء التكت
            await channel.permissionOverwrites.edit(ownerId, { ViewChannel: false });
            
            await interaction.update({ content: '**🔒 Ticket Closed.**', components: [] });
            
            const controlRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('btn_reopen').setLabel('Reopen').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_delete').setLabel('Delete').setStyle(ButtonStyle.Danger)
            );
            
            await channel.send({ 
                content: `**Ticket Control Panel**\n**Closed By:** <@${user.id}>`, 
                components: [controlRow] 
            });

            // اللوق والترانسكربت (إجباري)
            const attachment = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
            const transcriptLog = await client.channels.cache.get(CONFIG.transcriptChannel).send({ 
                content: `📝 **Auto Transcript:** \`${channel.name}\``, 
                files: [attachment] 
            });
            
            // إرسال اللوق العام
            sendLog(guild, 'Close', channel, user, ownerId, transcriptLog.url);

            // إرسال تقييم الإدارة (إذا لم يكن وسيط)
            const type = ticketTypes.get(channel.id);
            if (type !== 'mediator') {
                const owner = await client.users.fetch(ownerId).catch(() => null);
                if (owner) {
                    const rateRow = new ActionRowBuilder().addComponents(
                        [1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_staff_${i}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary))
                    );
                    await owner.send({ content: `**📋 MNC Staff Rating:**\n**يرجى تقييم أداء الطاقم الإداري:**`, components: [rateRow] }).catch(() => {});
                }
            }
        }

        // 5. Reopen
        if (customId === 'btn_reopen') {
            const ownerId = channel.topic;
            await channel.permissionOverwrites.edit(ownerId, { ViewChannel: true });
            await interaction.message.delete();
            await interaction.reply({ content: '**🔓 Ticket Reopened.**' });
            sendLog(guild, 'Reopen', channel, user, ownerId);
        }

        // 6. Delete
        if (customId === 'btn_delete') {
            await interaction.reply('**🗑️ Deleting ticket in 5 seconds...**');
            setTimeout(() => channel.delete().catch(() => {}), 5000);
            sendLog(guild, 'Delete', channel, user, channel.topic);
        }

        // 7. Transcript (Manual)
        if (customId === 'btn_transcript') {
            const attachment = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
            await client.channels.cache.get(CONFIG.transcriptChannel).send({ 
                content: `📝 **Manual Transcript:** \`${channel.name}\` requested by <@${user.id}>`, 
                files: [attachment] 
            });
            return interaction.reply({ content: '**✅ Transcript Sent.**', ephemeral: true });
        }

        // 8. Trade Input Modal Trigger
        if (customId === 'btn_trade_input') {
            const modal = new ModalBuilder().setCustomId('modal_trade_save').setTitle('Trade Details');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_val').setLabel('تفاصيل التريد').setStyle(TextInputStyle.Paragraph).setRequired(true)));
            return await interaction.showModal(modal);
        }

        // 9. Add User Modal Trigger
        if (customId === 'btn_add_user') {
            const modal = new ModalBuilder().setCustomId('modal_add_user').setTitle('Add User');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('uid').setLabel('User ID').setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        // 10. High Staff Approval
        if (['high_approve', 'high_reject'].includes(customId)) {
            if (!CONFIG.highMediators.some(r => member.roles.cache.has(r))) {
                return interaction.reply({ content: '❌ **Only High Staff.**', ephemeral: true });
            }
            const status = customId === 'high_approve' ? '✅ **Approved**' : '❌ **Rejected**';
            await interaction.update({ content: `**${status} by <@${user.id}>**`, components: [], embeds: [interaction.message.embeds[0]] });
        }

        // 11. Rating Modals (Comment)
        if (customId.startsWith('rate_')) {
            const parts = customId.split('_'); // rate, med, 5 OR rate, staff, 5
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
        const id = client.ticketCounter++;
        
        const channel = await guild.channels.create({
            name: `ticket-${type}-${id}`,
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
                    `**--------------------------------------**\n` +
                    `**هذا القسم مخصص لطلب وسيط لعملية تريد.**\n` +
                    `**・ تأكد أن الطرف الآخر جاهز.**\n` +
                    `**・ اكتب المعلومات بدقة.**\n` +
                    `**--------------------------------------**`
                )
                .addFields(
                    { name: '👤 الطرف الثاني', value: fields?.getTextInputValue('target_user') || 'N/A' },
                    { name: '📝 التفاصيل', value: fields?.getTextInputValue('trade_details') || 'N/A' }
                );
        } 
        else if (type === 'support') {
            embed.setTitle('🛠️ **تذكرة الدعم الفني**')
                .setDescription(`**شكراً لفتح تذكرة الدعم الفني.**\n**--------------------------------------**\n**يرجى شرح مشكلتك بالتفصيل وارفاق الأدلة.**`)
                .addFields({ name: '❓ المشكلة', value: fields?.getTextInputValue('issue_details') || 'N/A' });
        }
        else if (type === 'gift') {
            mentionText += `\n✨ **Please wait for staff response.**\n✨ **يرجى انتظار رد الإدارة.**\n**-------------------------------------**`;
            embed.setTitle('🎁 **استلام هدايا**')
                .setDescription(`**--------------------------------------**\n**يرجى توضيح نوع الهدية أو الفعالية التي فزت بها.**\n**--------------------------------------**`);
        }
        else if (type === 'admin') {
            mentionText += `\n⚠️ **Escalated to High Staff.**\n**Please wait for High Staff response.**\n**-------------------------------------**`;
            embed.setTitle('⚠️ **شكوى إداري**')
                .setDescription(`**--------------------------------------**\n**سيتم مراجعة الشكوى من قبل الإدارة العليا فقط.**\n**--------------------------------------**`);
            // إزالة الإدارة الصغرى
            await channel.permissionOverwrites.edit(CONFIG.staffRole, { ViewChannel: false });
            await channel.permissionOverwrites.edit(CONFIG.adminRole, { ViewChannel: true });
        }
        else if (type === 'creator') {
             mentionText += `\n✨ **Please wait for Content Creator Managers.**\n**يرجى انتظار مسؤولي صناع المحتوى.**`;
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
        
        // لوق فتح تكت
        sendLog(guild, 'Open', channel, user, user.id);
    }

    // دالة اللوق العامة (مطابقة للصورة)
    function sendLog(guild, action, channel, executor, ownerId, link = '') {
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

        const logChannel = guild.channels.cache.get(CONFIG.logsChannel);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }

    console.log('💎 MNC NUCLEAR SYSTEM V3.0 ONLINE!');
};
