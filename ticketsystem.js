/**
 * UNIVERSAL SYSTEM - V13.0 [ULTIMATE EDITION]
 * 🛡️ Features: High Staff, Trade Input, Full Logs, Multi-Guild Support.
 * 🔧 Fixes: Rating Claimer Bug (Using ID Injection), Dynamic Server Branding.
 */

const {
    Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder,
    TextInputStyle, InteractionType, ChannelType, PermissionFlagsBits
} = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');
const GuildConfig = require('./models/GuildConfig'); // ✅ استدعاء الداتابيز

// ====================================================
// 🧠 MEMORY MAPS (ذاكرة مؤقتة للجلسات)
// ====================================================
const ticketTypes = new Map();
const ticketClaimer = new Map();
const ticketCloser = new Map();
const ticketAddedUsers = new Map();
const activeTrades = new Map();

module.exports = async (client) => {

    // ====================================================
    // 🔌 INTERACTION HANDLER
    // ====================================================
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.guild) return;

        // 1️⃣ تحميل إعدادات السيرفر الحالي من الداتابيز
        // (ده اللي بيخلي البوت يشتغل في 100 سيرفر في نفس الوقت)
        let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
        if (!config) {
            config = await GuildConfig.create({ guildId: interaction.guild.id });
        }

        const { customId, guild, user, channel, member } = interaction;

        // ----------------------------------------------------
        // 🅰️ A. BUTTONS: CREATE TICKET (أزرار فتح التكت)
        // ----------------------------------------------------
        if (interaction.isButton() && customId.startsWith('create_')) {
            const type = customId.split('_')[1];

            // ⚠️ التحقق: هل صاحب السيرفر ضبط الرومات والرتب؟
            if (!config.ticketChannelId || !config.staffRoleId) {
                return interaction.reply({ content: '❌ **System Error:** Please configure the Dashboard settings first!', ephemeral: true });
            }

            // 1. Mediator Modal (نفس التفاصيل القديمة)
            if (type === 'mediator') {
                const modal = new ModalBuilder().setCustomId('modal_create_mediator').setTitle('🛡️ طلب وسيط');
                const tUser = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_user').setLabel('الطرف الثاني (أيدي/منشن)').setStyle(TextInputStyle.Short).setRequired(false));
                const tDetails = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_details').setLabel('تفاصيل التبادل (روبوكس/حساب..)').setStyle(TextInputStyle.Short).setRequired(false));
                const reason = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_reason').setLabel('سبب الطلب / نوع العملية').setStyle(TextInputStyle.Paragraph).setRequired(true));
                
                modal.addComponents(tUser, tDetails, reason);
                await interaction.showModal(modal);
            }
            // 2. Support Modal
            else if (type === 'support') {
                const modal = new ModalBuilder().setCustomId('modal_create_support').setTitle('🛠️ الدعم الفني');
                const reason = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_reason').setLabel('وصف المشكلة').setStyle(TextInputStyle.Paragraph).setRequired(true));
                modal.addComponents(reason);
                await interaction.showModal(modal);
            }
            // 3. Creator Modal
            else if (type === 'creator') {
                const modal = new ModalBuilder().setCustomId('modal_create_creator').setTitle('🎥 صانع محتوى');
                const links = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('links').setLabel('الروابط / القناة').setStyle(TextInputStyle.Short).setRequired(true));
                const subs = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('subs').setLabel('عدد المتابعين').setStyle(TextInputStyle.Short).setRequired(true));
                const reason = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_reason').setLabel('ملاحظات إضافية').setStyle(TextInputStyle.Paragraph).setRequired(false));
                
                modal.addComponents(links, subs, reason);
                await interaction.showModal(modal);
            }
            // 4. Other Types (Gift/Admin/Custom)
            else {
                const modal = new ModalBuilder().setCustomId(`modal_create_${type}`).setTitle('Ticket Details');
                const reason = new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ticket_reason').setLabel('Details').setStyle(TextInputStyle.Paragraph).setRequired(true));
                modal.addComponents(reason);
                await interaction.showModal(modal);
            }
        }

        // ----------------------------------------------------
        // 🅱️ B. MODALS SUBMIT (تنفيذ الأوامر)
        // ----------------------------------------------------
        if (interaction.type === InteractionType.ModalSubmit) {
            
            // 1. إنشاء التكت (Create Logic)
            if (customId.startsWith('modal_create_')) {
                const type = customId.replace('modal_create_', '');
                return await createTicket(interaction, config, type, interaction.fields);
            }

            // 2. حفظ التريد (Trade Save) - ميزة V13
            if (customId === 'modal_trade_save') {
                const trade = interaction.fields.getTextInputValue('trade_val');
                activeTrades.set(channel.id, trade);
                await interaction.reply({ content: '**✅ Trade Details Saved!**', ephemeral: true });
                return channel.send(`**📦 Trade Updated:** \`\`\`${trade}\`\`\``);
            }

            // 3. إضافة عضو (Add User)
            if (customId === 'modal_add_user') {
                const targetId = interaction.fields.getTextInputValue('uid');
                await interaction.deferReply();
                try {
                    const targetMember = await guild.members.fetch(targetId);
                    await channel.permissionOverwrites.edit(targetMember, { ViewChannel: true, SendMessages: true });
                    
                    let addedList = ticketAddedUsers.get(channel.id) || [];
                    addedList.push({ user: targetMember.user.tag, adder: user.tag });
                    ticketAddedUsers.set(channel.id, addedList);

                    sendLog(guild, config, 'Add User', channel, user, targetId);
                    return interaction.editReply({ content: `✅ **${targetMember} added to ticket by ${user}**` });
                } catch (e) {
                    return interaction.editReply({ content: '**❌ Error:** User not found.', ephemeral: true });
                }
            }

            // 4. حذف بسبب (Delete Reason)
            if (customId === 'modal_delete_reason') {
                const reason = interaction.fields.getTextInputValue('reason');
                await interaction.reply(`**🗑️ Deleting Ticket.. Reason:** ${reason}`);
                sendFinalDeleteLog(guild, config, channel, user, reason);
                setTimeout(() => channel.delete().catch(() => {}), 4000);
            }

            // ⭐ 5. نظام التقييم (RATING SYSTEM) - [FIXED & DYNAMIC]
            if (customId.startsWith('modal_rate_')) {
                // customId: modal_rate_TYPE_STARS_CLAIMERID
                const parts = customId.split('_');
                const type = parts[2]; // med or staff
                const stars = parts[3];
                const claimerId = parts[4]; // ✅ الأيدي جاي من الزرار (الحل النهائي للمشكلة)

                const comment = interaction.fields.getTextInputValue('comment') || "بدون تعليق";
                
                // ✅ زيادة العداد في الداتابيز (بيانات كل سيرفر لوحده)
                if (type === 'med') config.middlemanRatings += 1;
                else config.serverRatings += 1;
                await config.save(); // حفظ الرقم للأبد

                const totalRatings = type === 'med' ? config.middlemanRatings : config.serverRatings;
                const starEmojis = "⭐".repeat(parseInt(stars));
                
                // ✅ اللوج الديناميكي (باسم السيرفر الحالي)
                const logEmbed = new EmbedBuilder()
                    .setTitle(type === 'med' ? `🛡️ **${guild.name} MIDDLEMAN REVIEW**` : `🛠️ **${guild.name} STAFF REVIEW**`)
                    .setColor(type === 'med' ? '#F1C40F' : '#3498DB')
                    .setThumbnail(guild.iconURL()) // ✅ أيقونة السيرفر الحالي
                    .addFields(
                        { name: '👤 العميل (Rater)', value: `${user} (\`${user.id}\`)`, inline: true },
                        { name: type === 'med' ? '🛡️ الوسيط' : '👨‍💼 الإداري', value: claimerId !== 'NONE' ? `<@${claimerId}>` : 'غير محدد', inline: true },
                        { name: '📊 العداد', value: `\`#${totalRatings}\``, inline: true },
                        { name: '⭐ التقييم', value: `${starEmojis} **(${stars}/5)**`, inline: true },
                        { name: '💬 التعليق', value: `\`\`\`${comment}\`\`\``, inline: false }
                    )
                    .setFooter({ text: `Rated by: ${user.tag}`, iconURL: user.displayAvatarURL() })
                    .setTimestamp();

                // إرسال اللوج لروم اللوجات المحدد في الداتابيز
                const logCh = guild.channels.cache.get(config.logsChannelId);
                if (logCh) await logCh.send({ content: '**✨ تقييم جديد وصل!**', embeds: [logEmbed] });

                return interaction.reply({ content: '**✅ شكراً لتقييمك! (Thanks for rating)**', ephemeral: true });
            }
        }

        // ----------------------------------------------------
        // 🆎 C. BUTTONS HANDLING (التحكم في الأزرار)
        // ----------------------------------------------------
        if (interaction.isButton()) {
            
            // ✅ صلاحيات ديناميكية (من الداتابيز بدل الأيديهات الثابتة)
            const isOwner = user.id === guild.ownerId;
            const isStaff = config.staffRoleId && member.roles.cache.has(config.staffRoleId);
            const isAdmin = config.adminRoleId && member.roles.cache.has(config.adminRoleId);
            
            // 1. زرار الاستلام (Claim)
            if (customId === 'btn_claim') {
                if (!isStaff && !isAdmin && !isOwner) return interaction.reply({ content: '❌ **Staff Only!**', ephemeral: true });

                ticketClaimer.set(channel.id, user.id);
                
                // ✅ إخفاء التكت عن الجميع ما عدا المستلم (Privacy)
                await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
                if (config.staffRoleId) await channel.permissionOverwrites.edit(config.staffRoleId, { ViewChannel: false });

                const row = ActionRowBuilder.from(interaction.message.components[0]);
                row.components[0].setDisabled(true).setLabel(`Claimed by ${user.username}`);
                await interaction.update({ components: [row] });

                await channel.send({ content: `**✅ Ticket claimed by ${user}**` });
                sendLog(guild, config, 'Claim', channel, user);
            }

            // 2. زرار الإغلاق (Close)
            if (customId === 'btn_close') {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_confirm_close').setLabel('Confirm Close').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('btn_cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
                );
                return interaction.reply({ content: '**❓ Are you sure?**', components: [row] });
            }

            if (customId === 'btn_cancel_close') {
                return interaction.update({ content: '**✅ Close Cancelled.**', components: [] });
            }

            // 3. تأكيد الإغلاق (Confirm Close)
            if (customId === 'btn_confirm_close') {
                const ticketOwnerId = channel.topic;
                ticketCloser.set(channel.id, user.id);

                if (ticketOwnerId) await channel.permissionOverwrites.edit(ticketOwnerId, { ViewChannel: false });
                await interaction.update({ content: '**🔒 Ticket Closed.**', components: [] });

                // لوحة التحكم الكاملة
                const controlRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📄'),
                    new ButtonBuilder().setCustomId('btn_reopen').setLabel('Reopen').setStyle(ButtonStyle.Success).setEmoji('🔓'),
                    new ButtonBuilder().setCustomId('btn_delete').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
                    new ButtonBuilder().setCustomId('btn_delete_reason').setLabel('Delete (Reason)').setStyle(ButtonStyle.Danger)
                );

                await channel.send({ content: `**Ticket Control Panel**\nClosed By: ${user}`, components: [controlRow] });

                // حفظ الترانسكريبت باسم السيرفر
                const attachment = await createTranscript(channel, { limit: -1, fileName: `${guild.name}-${channel.name}.html` });
                const logCh = guild.channels.cache.get(config.transcriptChannelId || config.logsChannelId);
                if (logCh) await logCh.send({ content: `📄 **Ticket Closed:** \`${channel.name}\``, files: [attachment] });

                sendLog(guild, config, 'Close', channel, user);

                // --- 🛠️ FIX: Rating Logic (الحل النهائي) ---
                // بنجيب الأيدي من الذاكرة، ولو مش موجود (بسبب ريستارت) بنحط NONE
                const claimerId = ticketClaimer.get(channel.id) || 'NONE'; 
                const type = ticketTypes.get(channel.id) || 'support';

                // ✅ بنحط أيدي المستلم جوه الزرار نفسه (عشان عمره ما يضيع)
                const rateRow = new ActionRowBuilder().addComponents(
                    [1, 2, 3, 4, 5].map(i => 
                        new ButtonBuilder().setCustomId(`rate_${type === 'mediator' ? 'med' : 'staff'}_${i}_${claimerId}`).setLabel(`${i}⭐`).setStyle(ButtonStyle.Secondary)
                    )
                );

                try {
                    if (ticketOwnerId) {
                        const ownerMember = await guild.members.fetch(ticketOwnerId);
                        // ✅ رسالة التقييم ديناميكية باسم السيرفر
                        await ownerMember.send({ content: `**⭐ يرجى تقييم خدمة سيرفر ${guild.name}:**`, components: [rateRow] }).catch(() => {
                            channel.send({ content: `**⭐ يرجى التقييم هنا:** <@${ticketOwnerId}>`, components: [rateRow] });
                        });
                    }
                } catch (e) {
                     channel.send({ content: `**⭐ يرجى التقييم:**`, components: [rateRow] });
                }
            }

            // 4. بقية الأزرار (Reopen, Delete, Transcript)
            if (customId === 'btn_reopen') {
                const ticketOwnerId = channel.topic;
                await channel.permissionOverwrites.edit(ticketOwnerId, { ViewChannel: true });
                await interaction.message.delete();
                await interaction.reply({ content: '**🔓 Ticket Reopened.**' });
                sendLog(guild, config, 'Reopen', channel, user);
            }

            if (customId === 'btn_delete') {
                await interaction.reply('**🗑️ Deleting ticket in 5 seconds...**');
                sendFinalDeleteLog(guild, config, channel, user, "Manual Delete");
                setTimeout(() => channel.delete().catch(() => {}), 5000);
            }

            if (customId === 'btn_transcript') {
                const attachment = await createTranscript(channel, { limit: -1, fileName: `${guild.name}-${channel.name}.html` });
                return interaction.reply({ content: `**✅ Transcript Generated**`, files: [attachment], ephemeral: true });
            }

            // 5. أزرار إضافية (Trade Input, Add User)
            if (customId === 'btn_trade_input') {
                const modal = new ModalBuilder().setCustomId('modal_trade_save').setTitle('Trade Details');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_val').setLabel('تفاصيل التريد').setStyle(TextInputStyle.Paragraph).setRequired(true)));
                await interaction.showModal(modal);
            }
            
            if (customId === 'btn_add_user') {
                 const modal = new ModalBuilder().setCustomId('modal_add_user').setTitle('Add User');
                 modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('uid').setLabel('User ID').setStyle(TextInputStyle.Short).setRequired(true)));
                 await interaction.showModal(modal);
            }

            // 6. High Staff Buttons
            if (['high_approve', 'high_reject'].includes(customId)) {
                if (!isAdmin) return interaction.reply({ content: '❌ **High Staff Only!**', ephemeral: true });
                const status = customId === 'high_approve' ? '✅ **Approved**' : '❌ **Rejected**';
                await interaction.update({ content: `**${status} by ${user}**`, components: [] });
            }

            // 7. زرار التقييم (عند الضغط عليه يفتح المودال)
            if (customId.startsWith('rate_')) {
                const parts = customId.split('_');
                const type = parts[1];
                const stars = parts[2];
                const claimerId = parts[3];

                const modal = new ModalBuilder().setCustomId(`modal_rate_${type}_${stars}_${claimerId}`).setTitle(`تقييم ${guild.name}`);
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('comment').setLabel('تعليقك (اختياري)').setStyle(TextInputStyle.Paragraph).setRequired(false)));
                await interaction.showModal(modal);
            }
        }
    });

    // ====================================================
    // ⚙️ HELPER FUNCTIONS (المحركات الخلفية)
    // ====================================================

    async function createTicket(interaction, config, type, fields) {
        const { guild, user } = interaction;
        const count = config.ticketCount; // ✅ العداد من الداتابيز

        // ✅ إنشاء الروم (باستخدام القنوات والرتب من الداتابيز)
        const channel = await guild.channels.create({
            name: `ticket-${count}-${user.username}`,
            type: ChannelType.GuildText,
            parent: config.ticketChannelId,
            topic: user.id, // حفظ أيدي العضو في الوصف
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: config.staffRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        ticketTypes.set(channel.id, type);
        config.ticketCount += 1;
        await config.save(); // ✅ حفظ العداد

        const embed = new EmbedBuilder().setColor('#FFFFFF').setTimestamp();
        let mentionText = `**حياك الله** <@${user.id}>`;

        if (type === 'mediator') {
            const tUser = fields.getTextInputValue('target_user') || 'N/A';
            const tDetails = fields.getTextInputValue('trade_details') || 'N/A';
            activeTrades.set(channel.id, tDetails);

            embed.setTitle('🛡️ **طلب وسيط**');
            embed.setDescription(`**هذا القسم مخصص لطلب وسيط لعملية تريد داخل السيرفر**\n\n**${"-".repeat(20)}**\n\n` + 
            `**1️⃣ تأكد أن الطرف الآخر جاهز ومتواجد.**\n` +
            `**2️⃣ رجاء عدم فتح أكثر من تذكرة.**\n` +
            `**3️⃣ تحقق من درجة الوسيط.**\n\n` +
            `**تفاصيل الطلب:**\n${fields.getTextInputValue('ticket_reason')}`);
            
            embed.addFields({ name: '👤 الطرف الثاني', value: tUser, inline: true }, { name: '📦 التفاصيل', value: tDetails, inline: true });
        } 
        else if (type === 'support') {
            embed.setTitle('🛠️ **تذكرة الدعم الفني**');
            embed.setDescription(`\n**شكراً لفتح تذكرة الدعم الفني**\n**${"-".repeat(20)}**\n` +
            `**يرجى شرح مشكلتك بوضوح.**\n**فريق الدعم سيراجع تذكرتك قريباً.**`);
            embed.addFields({ name: '❓ المشكلة', value: fields.getTextInputValue('ticket_reason') });
        }
        else if (type === 'creator') {
            mentionText += `\n🎥 **Please wait for Content Creator Managers.**`;
            embed.setTitle('🎥 **تقديم صانع محتوى**');
            embed.addFields({ name: '🔗 الروابط', value: fields.getTextInputValue('links') }, { name: '👥 المتابعين', value: fields.getTextInputValue('subs') });
        }
        else if (type === 'admin') {
            mentionText += `\n⚠️ **Please wait for High Staff.**`;
            embed.setTitle('📛 **شكوى إداري**');
            embed.setDescription(`**سيتم مراجعة الشكوى من قبل الإدارة العليا فقط.**`);
            await channel.permissionOverwrites.edit(config.staffRoleId, { ViewChannel: false });
        }
        else {
            embed.setTitle('🎁 **استلام جوائز**');
            embed.setDescription(`**${"-".repeat(20)}**\n تفاصيل: ${fields.getTextInputValue('ticket_reason')}`);
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_claim').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_close').setLabel('Close').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('btn_add_user').setLabel('Add User').setStyle(ButtonStyle.Primary)
        );

        if (type === 'mediator') row.addComponents(new ButtonBuilder().setCustomId('btn_trade_input').setLabel('Trade Input').setStyle(ButtonStyle.Secondary));

        await channel.send({ content: mentionText, embeds: [embed], components: [row] });
        await interaction.reply({ content: `**✅ Ticket Created:** ${channel}`, ephemeral: true });

        sendLog(guild, config, 'Open', channel, user, user.id);
    }

    // ⭐ V13 Feature: Full Delete Log
    function sendFinalDeleteLog(guild, config, channel, executor, reason) {
        const claimer = ticketClaimer.get(channel.id) || 'None';
        const closer = ticketCloser.get(channel.id) || 'None';
        const owner = channel.topic || 'Unknown';
        
        const addedUsersList = ticketAddedUsers.get(channel.id) || [];
        const addedUsersString = addedUsersList.length > 0 ? addedUsersList.map(i => `👤 **${i.user}** (by ${i.adder})`).join('\n') : 'None';

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setAuthor({ name: `${guild.name} LOGS`, iconURL: guild.iconURL() }) // ✅ اسم السيرفر
            .setTitle('🗑️ Ticket Deleted')
            .setDescription(`**Ticket:** \`${channel.name}\` was deleted.`)
            .addFields(
                { name: '👑 Owner', value: `<@${owner}>`, inline: true },
                { name: '🗑️ Deleted By', value: `<@${executor.id}>`, inline: true },
                { name: '🙋 Claimed By', value: claimer !== 'None' ? `<@${claimer}>` : 'None', inline: true },
                { name: '🔒 Closed By', value: closer !== 'None' ? `<@${closer}>` : 'None', inline: true },
                { name: '➕ Added Users', value: addedUsersString, inline: false },
                { name: '📝 Reason', value: reason || 'No Reason', inline: false }
            )
            .setTimestamp();

        const logChannel = guild.channels.cache.get(config.logsChannelId);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }

    function sendLog(guild, config, action, channel, executor, ownerId) {
        const embed = new EmbedBuilder()
            .setColor(action === 'Delete' ? '#FF0000' : '#2F3136')
            .setAuthor({ name: `${guild.name} LOGS`, iconURL: guild.iconURL() }) // ✅ اسم السيرفر
            .setTitle(`${action} Ticket`)
            .addFields(
                { name: 'Channel', value: `\`${channel.name}\``, inline: true },
                { name: 'Executor', value: `<@${executor.id}>`, inline: true },
                { name: 'Owner', value: `<@${ownerId || 'Unknown'}>`, inline: true }
            )
            .setTimestamp();

        const logChannel = guild.channels.cache.get(config.logsChannelId);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }

    console.log('💎 TICKET SYSTEM V13.0 [UNIVERSAL WHITE-LABEL] IS ONLINE!');
};
