/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC ULTIMATE SYSTEM - V7.0 ]
 * █ ▀ █ █ ▀█ █ ▄  [ ARABIC "TARSH" EDITION - FIXED ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, InteractionType, ChannelType, PermissionFlagsBits 
} = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');

module.exports = async (client) => {

    // ====================================================
    // ⚙️ CONFIGURATION - إعداداتك الأصلية
    // ====================================================
    const CONFIG = {
        prefix: '!',
        guildID: '1453877816142860350', 
        categoryID: '1453943996392013901',
        
        staffRole: '1454199885460144189',      
        adminRole: '1453946893053726830',      
        mediatorRole: '1454563893249703998',   
        highMediators: ['1454560063480922375', '1466937817639948349'], 

        logsChannel: '1453948413963141153',       
        transcriptChannel: '1472218573710823679', 
        mediatorRatingLog: '1472439331443441828', 
        staffRatingLog: '1472023428658630686',    
    };

    // ====================================================
    // 💾 MEMORY & COUNTERS
    // ====================================================
    if (!client.ticketCounter) client.ticketCounter = 346; 
    
    // Global Counters
    if (!client.globalMedRatings) client.globalMedRatings = 0;
    if (!client.globalStaffRatings) client.globalStaffRatings = 0;

    const activeTrades = new Map();    
    const ticketTypes = new Map();     
    const ticketMediator = new Map();  
    const ticketClaimer = new Map();   
    
    // Individual Counters
    const mediatorCounts = new Map();  
    const staffCounts = new Map();     

    // ====================================================
    // 1️⃣ MESSAGE COMMANDS
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
            message.delete().catch(() => {});
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
                    `**--------------------------------------------------**\n` +
                    `**👇 اختر القسم المناسب لفتح تذكرتك:**`
                )
                .setColor('#FFFFFF')
                .setThumbnail(message.guild.iconURL({ dynamic: true })); // ✅ إضافة صورة السيرفر

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

        // --- !req-high ---
        if (command === 'req-high' && isMed && message.channel.name.startsWith('ticket-')) {
            const trade = activeTrades.get(message.channel.id) || "⚠️ لم يتم تسجيل التريد بعد!";
            const embed = new EmbedBuilder()
                .setTitle('⚖️ **طلب موافقة وساطة عليا**')
                .setDescription(`**--------------------------------------------------**\n**👤 الوسيط الطالب:** ${message.author}\n\n**📦 تفاصيل التريد:**\n\`\`\`\n${trade}\n\`\`\`\n**--------------------------------------------------**`)
                .setColor('#F1C40F')
                .setThumbnail(message.author.displayAvatarURL());
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('high_approve').setLabel('Accept').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('high_reject').setLabel('Reject').setStyle(ButtonStyle.Danger)
            );
            const mentions = CONFIG.highMediators.map(r => `<@&${r}>`).join(' ');
            return message.channel.send({ content: `⚠️ **Approval Needed:** ${mentions}`, embeds: [embed], components: [row] });
        }

        // --- !done (تم الإصلاح ليرسل للجميع) ---
        if (command === 'done' && isMed && message.channel.name.startsWith('ticket-')) {
            ticketMediator.set(message.channel.id, message.author.id); 

            const ticketID = message.channel.id;
            const row = new ActionRowBuilder().addComponents(
                [1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_med_${i}_${ticketID}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary))
            );
            
            const dmEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL() })
                .setTitle('🛡️ خدمة وساطة MNC')
                .setDescription(`**شكراً لثقتك بنا.**\nنرجو منك تقييم تجربتك مع الوسيط **${message.author.username}**.\n\n**⭐ اضغط على الزر المناسب بالأسفل:**`)
                .setThumbnail(message.author.displayAvatarURL());

            // ✅ الإصلاح: جلب جميع الأعضاء وإرسال الرسالة لكل من في الروم
            const members = await message.channel.members.fetch();
            let sentCount = 0;

            for (const [id, member] of members) {
                // استثناء البوتات والشخص الذي كتب الأمر (الوسيط)
                if (!member.user.bot && member.id !== message.author.id) {
                    await member.send({ embeds: [dmEmbed], components: [row] }).catch(() => {});
                    sentCount++;
                }
            }

            return message.channel.send(`✅ **تم إرسال طلب التقييم لـ ${sentCount} عضو بنجاح.**`);
        }

        // --- !come ---
        if (command === 'come' && isStaff) {
            const target = message.mentions.members.first();
            if (!target) return message.reply('**❌ Please mention a user.**');
            
            message.delete().catch(() => {});
            const invite = await message.channel.createInvite({ maxAge: 86400, maxUses: 1 });
            
            const dmEmbed = new EmbedBuilder()
                .setColor('#2F3136')
                .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL() })
                .setTitle('🚨 **تم طلب استدعاءك!**')
                .setDescription(
                    `**--------------------------------------------------**\n` +
                    `**👋 مرحباً ${target}**\n\n` +
                    `**⚠️ لقد قام طاقم الإدارة بطلب حضورك فوراً.**\n` +
                    `**📍 الروم:** <#${message.channel.id}>\n` +
                    `**🔗 رابط سريع:** [اضغط هنا للدخول](${invite.url})\n` +
                    `**--------------------------------------------------**`
                )
                .setThumbnail(message.guild.iconURL())
                .setFooter({ text: 'MNC Administration', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('Go to Server').setStyle(ButtonStyle.Link).setURL(invite.url)
            );
            
            await target.send({ content: `🚨 **استدعاء عاجل!**`, embeds: [dmEmbed], components: [row] }).catch(() => message.channel.send(`❌ **Could not DM ${target}.**`));
            return message.channel.send(`✅ **Summon sent to ${target} with a new style.**`);
        }
    });

    // ====================================================
    // 2️⃣ INTERACTION HANDLER
    // ====================================================
    client.on('interactionCreate', async (interaction) => {
        const { customId, guild, user, channel, member } = interaction;

        // --- A. Create Ticket ---
        if (interaction.isButton() && customId.startsWith('create_')) {
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

        // --- B. Modals ---
        if (interaction.type === InteractionType.ModalSubmit) {
            
            if (customId.startsWith('modal_create_')) {
                const type = customId.replace('modal_create_', '');
                return await createTicket(interaction, type, interaction.fields);
            }

            if (customId === 'modal_trade_save') {
                const trade = interaction.fields.getTextInputValue('trade_val');
                activeTrades.set(channel.id, trade); 
                await interaction.reply({ content: `**✅ Trade Saved:**\n\`${trade}\`` });
                return channel.send('**done**');
            }

            // ⭐ تعديل رسالة الإضافة لتطابق الصورة
            if (customId === 'modal_add_user') {
                const targetId = interaction.fields.getTextInputValue('uid');
                await interaction.deferReply();
                try {
                    const targetMember = await guild.members.fetch(targetId);
                    await channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: true, SendMessages: true });
                    
                    // التنسيق المطلوب بالظبط
                    return interaction.editReply({ content: `✅ ${targetMember} **has been added to the ticket by:** ${user}` });
                } catch (e) {
                    return interaction.editReply({ content: '**❌ Error: Invalid ID or User not found.**', ephemeral: true });
                }
            }

            if (customId === 'modal_delete_reason') {
                const reason = interaction.fields.getTextInputValue('reason');
                await interaction.reply(`**🗑️ Deleting Ticket.. Reason: ${reason}**`);
                const ownerId = channel.topic;
                sendLog(guild, 'Delete', channel, user, ownerId, null, reason);
                setTimeout(() => channel.delete().catch(() => {}), 4000);
            }

            // ⭐ لوج التقييم (تم إزالة الآيدي وتعديل الاسم)
            if (customId.startsWith('modal_rate_')) {
                const parts = customId.split('_');
                const targetId = parts[2];
                const stars = parts[3];
                const type = parts[4];
                const ticketId = parts[5];

                const comment = interaction.fields.getTextInputValue('comment') || 'بدون تعليق';
                const trade = activeTrades.get(ticketId) || "⚠️ لا توجد بيانات مسجلة";
                
                let ratedUserId = null;
                let userCount = 0;
                let globalCount = 0;

                if (type === 'med') {
                    ratedUserId = ticketMediator.get(ticketId);
                    if (ratedUserId) {
                        const current = mediatorCounts.get(ratedUserId) || 0;
                        mediatorCounts.set(ratedUserId, current + 1);
                        userCount = current + 1;
                    }
                    client.globalMedRatings++;
                    globalCount = client.globalMedRatings;
                } else {
                    ratedUserId = ticketClaimer.get(ticketId);
                    if (ratedUserId) {
                        const current = staffCounts.get(ratedUserId) || 0;
                        staffCounts.set(ratedUserId, current + 1);
                        userCount = current + 1;
                    }
                    client.globalStaffRatings++;
                    globalCount = client.globalStaffRatings;
                }

                const ratedMention = ratedUserId ? `<@${ratedUserId}>` : "**غير محدد**";
                const starEmojis = "⭐".repeat(parseInt(stars));

                const logEmbed = new EmbedBuilder()
                    // تعديل العنوان
                    .setTitle(type === 'med' ? `🛡️ **MNC MIDDLEMAN REVIEW**` : '👨‍💼 **MNC STAFF REVIEW**')
                    .setColor(type === 'med' ? '#F1C40F' : '#3498DB')
                    .setThumbnail(user.displayAvatarURL())
                    .addFields(
                        { name: '👤 العميل (المُقيِّم)', value: `<@${targetId}>`, inline: true },
                        { name: type === 'med' ? '🛡️ الوسيط' : '👮‍♂️ الإداري', value: ratedMention, inline: true },
                        { name: '📈 الإحصائيات', value: `\`ترتيب الإداري #${userCount}\`\n\`ترتيب السيرفر #${globalCount}\``, inline: false },
                        { name: '━━━━━━━━━━━━━━━━━━━━━━', value: '\u200b' },
                        { name: '⭐ التقييم', value: `${starEmojis} **(${stars}/5)**`, inline: true },
                        { name: '💬 التعليق', value: `\`\`\`${comment}\`\`\``, inline: false }
                    )
                    .setTimestamp();
                    // ❌ تم إزالة الفوتر اللي فيه الآيدي (كما طلبت)

                if (type === 'med') {
                    logEmbed.addFields(
                        { name: '━━━━━━━━━━━━━━━━━━━━━━', value: '\u200b' },
                        // ✅ التعديل هنا: اسم الخانة "تفاصيل التريد"
                        { name: '📦 تفاصيل التريد', value: `\`\`\`yaml\n${trade}\n\`\`\`` }
                    );
                }

                const logChannelId = type === 'med' ? CONFIG.mediatorRatingLog : CONFIG.staffRatingLog;
                const logCh = client.channels.cache.get(logChannelId);
                
                if(logCh) await logCh.send({ content: `**تقييم جديد!** ${ratedMention}`, embeds: [logEmbed] });
                
                return interaction.reply({ content: '**✅ تم استلام تقييمك. شكراً لك!**', ephemeral: true });
            }
        }

        // --- D. Buttons & Security ---
        if (interaction.isButton()) {
            
            // ⭐ حماية الأزرار (إضافة جديدة مطلوبة)
            const isStaffOrMed = member.roles.cache.has(CONFIG.staffRole) || member.roles.cache.has(CONFIG.adminRole) || CONFIG.highMediators.some(id => member.roles.cache.has(id));
            
            if (['btn_claim', 'btn_close', 'btn_add_user', 'btn_delete', 'btn_reopen'].includes(customId)) {
                if (!isStaffOrMed) {
                    return interaction.reply({ content: '❌ **عذراً، هذه الأزرار خاصة بطاقم الإدارة والوسطاء فقط.**', ephemeral: true });
                }
            }

            if (customId === 'btn_claim') {
                ticketClaimer.set(channel.id, user.id);
                await channel.permissionOverwrites.edit(CONFIG.staffRole, { ViewChannel: false });
                await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
                await channel.permissionOverwrites.edit(CONFIG.adminRole, { ViewChannel: true });

                const row = ActionRowBuilder.from(interaction.message.components[0]);
                row.components[0].setDisabled(true).setLabel(`Claimed by ${user.username}`); 
                await interaction.update({ components: [row] });
                
                await channel.send({ content: `**✅ The ticket has been claimed successfully by <@${user.id}>**` });
                sendLog(guild, 'Claim', channel, user, channel.topic);
            }

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

                // ⭐ لوج الترانسكريبت + زر التحميل
                const attachment = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
                const claimerID = ticketClaimer.get(channel.id) ? `<@${ticketClaimer.get(channel.id)}>` : 'None';
                
                const transcriptEmbed = new EmbedBuilder()
                    .setColor('#2ecc71')
                    .setTitle('📄 Ticket Transcript Log')
                    .setDescription('**تم إغلاق تذكرة وحفظ سجل المحادثة.**')
                    .addFields(
                        { name: '🎫 التذكرة', value: `\`${channel.name}\``, inline: true },
                        { name: '👤 صاحب التذكرة', value: `<@${ownerId}>`, inline: true },
                        { name: '🔒 أغلقت بواسطة', value: `<@${user.id}>`, inline: true },
                        { name: '🙋‍♂️ المستلم', value: claimerID, inline: true }
                    )
                    .setFooter({ text: 'MNC Logs System', iconURL: guild.iconURL() })
                    .setTimestamp();

                const logCh = client.channels.cache.get(CONFIG.transcriptChannel);
                let logMsg = null;
                
                if (logCh) {
                    logMsg = await logCh.send({ embeds: [transcriptEmbed], files: [attachment] });
                    // زر التحميل المباشر (زي ما طلبت)
                    const linkRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setLabel('📥 Download Transcript').setStyle(ButtonStyle.Link).setURL(logMsg.attachments.first().url)
                    );
                    await logMsg.edit({ components: [linkRow] });
                }
                
                sendLog(guild, 'Close', channel, user, ownerId, logMsg ? logMsg.url : null);

                // ⭐ تقييم الإدارة (إرسال للجميع في التكت)
                const type = ticketTypes.get(channel.id);
                if (type !== 'mediator') {
                    const ticketID = channel.id;
                    const rateRow = new ActionRowBuilder().addComponents(
                        [1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_staff_${i}_${ticketID}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary))
                    );
                    
                    const claimer = ticketClaimer.get(ticketID);
                    const staffText = claimer ? `<@${claimer}>` : "الطاقم الإداري";
                    
                    const dmEmbed = new EmbedBuilder()
                        .setColor('#3498DB')
                        .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
                        .setTitle('📊 تقييم الدعم الفني')
                        .setDescription(`**شكراً لتواصلك معنا.**\nيرجى تقييم تجربتك مع ${staffText} للمساعدة في تحسين الجودة.`);

                    // إرسال لكل من في الروم
                    const members = await channel.members.fetch();
                    for (const [id, member] of members) {
                        if (!member.user.bot && !member.roles.cache.has(CONFIG.staffRole) && !member.roles.cache.has(CONFIG.adminRole)) {
                            await member.send({ embeds: [dmEmbed], components: [rateRow] }).catch(() => {});
                        }
                    }
                }
            }

            if (customId === 'btn_reopen') {
                const ownerId = channel.topic;
                await channel.permissionOverwrites.edit(ownerId, { ViewChannel: true });
                await interaction.message.delete();
                await interaction.reply({ content: '**🔓 Ticket Reopened.**' });
                sendLog(guild, 'Reopen', channel, user, ownerId);
            }

            if (customId === 'btn_delete') {
                await interaction.reply('**🗑️ Deleting ticket in 5 seconds...**');
                setTimeout(() => channel.delete().catch(() => {}), 5000);
                sendLog(guild, 'Delete', channel, user, channel.topic);
            }

            if (customId === 'btn_delete_reason') {
                const modal = new ModalBuilder().setCustomId('modal_delete_reason').setTitle('Delete Reason');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Reason').setStyle(TextInputStyle.Short).setRequired(true)));
                return await interaction.showModal(modal);
            }

            if (customId === 'btn_transcript') {
                const attachment = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
                const logCh = client.channels.cache.get(CONFIG.transcriptChannel);
                if(logCh) await logCh.send({ 
                    content: `📝 **Manual Transcript:** \`${channel.name}\` requested by <@${user.id}>`, 
                    files: [attachment] 
                });
                return interaction.reply({ content: '**✅ Transcript Sent.**', ephemeral: true });
            }

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
                const status = customId === 'high_approve' ? '✅ **Approved**' : '❌ **Rejected**';
                await interaction.update({ content: `**${status} by <@${user.id}>**`, components: [], embeds: [interaction.message.embeds[0]] });
            }

            if (customId.startsWith('rate_')) {
                const row = ActionRowBuilder.from(interaction.message.components[0]);
                row.components.forEach(btn => btn.setDisabled(true));
                await interaction.message.edit({ components: [row] });

                const parts = customId.split('_');
                const stars = parts[2];
                const type = parts[1];
                const ticketId = parts[3];

                const modalId = `modal_rate_${user.id}_${stars}_${type}_${ticketId}`;
                const modal = new ModalBuilder().setCustomId(modalId).setTitle('تعليق إضافي');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('comment').setLabel('تعليقك (اختياري)').setStyle(TextInputStyle.Paragraph).setRequired(false)));
                return await interaction.showModal(modal);
            }
        }
    });

    // ====================================================
    // 3️⃣ HELPER FUNCTIONS
    // ====================================================
    async function createTicket(interaction, type, fields) {
        const { guild, user } = interaction;
        const count = client.ticketCounter++;
        
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
        
        if (type === 'mediator') {
             const tUser = fields?.getTextInputValue('target_user') || 'N/A';
             const tDetails = fields?.getTextInputValue('trade_details') || 'N/A';
             activeTrades.set(channel.id, `الطرف الثاني: ${tUser}\nالتفاصيل: ${tDetails}`);
        }

        await interaction.reply({ content: `**✅ Ticket Created:** ${channel}`, ephemeral: true });
        
        // ⭐ إضافة الفواصل (Lines) وزيادة جمالية الإيمبد
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
                    { name: '--------------------------------------', value: '\u200b' },
                    { name: '📝 التفاصيل', value: fields?.getTextInputValue('trade_details') || 'N/A' }
                );
        } else if (type === 'support') {
            embed.setTitle('🛠️ **تذكرة الدعم الفني**')
                .setDescription(
                    `**شكراً لفتح تذكرة الدعم الفني.**\n` +
                    `**--------------------------------------------------**\n` +
                    `**・ يرجى شرح شكواك أو مشكلتك أو طلبك بشكل واضح ومفصل قدر الإمكان.**\n` +
                    `**・ ارفق أي صور أو روابط أو أدلة تساعدنا على فهم المشكلة.**\n` +
                    `**・ فريق الدعم سيراجع تذكرتك ويجيبك في أسرع وقت ممكن.**\n` +
                    `**--------------------------------------------------**`
                )
                .addFields({ name: '❓ المشكلة', value: fields?.getTextInputValue('issue_details') || 'N/A' });
        } else if (type === 'gift') {
            mentionText += `\n✨ **Please wait for staff response.**\n**-------------------------------------**`;
            embed.setTitle('🎁 **استلام هدايا**')
                .setDescription(`**--------------------------------------**\n**يرجى توضيح نوع الهدية أو الفعالية التي فزت بها.**\n**--------------------------------------**`);
        } else if (type === 'admin') {
            mentionText += `\n⚠️ **Please wait for High Staff response.**\n**-------------------------------------**`;
            embed.setTitle('⚠️ **شكوى إداري**')
                .setDescription(`**--------------------------------------**\n**سيتم مراجعة الشكوى من قبل الإدارة العليا فقط.**\n**--------------------------------------**`);
            await channel.permissionOverwrites.edit(CONFIG.staffRole, { ViewChannel: false });
            await channel.permissionOverwrites.edit(CONFIG.adminRole, { ViewChannel: true });
        } else if (type === 'creator') {
             mentionText += `\n✨ **Please wait for Content Creator Managers.**`;
             embed.setTitle('🎥 **تقديم صانع محتوى**')
                .addFields(
                    { name: '🔗 الروابط/اليوزرات', value: fields?.getTextInputValue('links') || 'N/A' },
                    { name: '--------------------------------------', value: '\u200b' },
                    { name: '👥 المتابعين', value: fields?.getTextInputValue('subs') || 'N/A' }
                );
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

    console.log('💎 MNC ULTIMATE SYSTEM V7.0 ONLINE!');
};
