const { 
    ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, InteractionType 
} = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');

module.exports = async (client) => {
    // ⚙️ المعرفات (IDs) الثابتة
    const CONFIG = {
        categoryID: '1453943996392013901',
        staffRole: '1454199885460144189',
        adminRole: '1453946893053726830',
        mediatorRole: '1454563893249703998', // الرتبة المسموح لها بالأوامر
        highMediators: ['1454560063480922375', '1466937817639948349'],
        logsChannel: '1453948413963141153',
        transcriptChannel: '1472218573710823679',
        mediatorRatingLog: '1472439331443441828',
        staffRatingLog: '1472023428658630686',
        prefix: ':'
    };

    if (!client.ticketCounter) client.ticketCounter = 346;
    const tradeData = new Map();

    // ==========================================
    // 1. أوامر الشات (:setup-mnc | :trade | :done)
    // ==========================================
    client.on('messageCreate', async (message) => {
        if (!message.guild || message.author.bot || !message.content.startsWith(CONFIG.prefix)) return;

        const isMed = message.member.roles.cache.has(CONFIG.mediatorRole) || CONFIG.highMediators.some(id => message.member.roles.cache.has(id));

        // --- أمر السيت اب الرئيسي (نفس شكل الصورة 10) ---
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

            const btns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_mediator').setLabel('طلب وسيط').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('open_support').setLabel('دعم فني').setEmoji('🛠️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('open_gift').setLabel('استلام هدايا').setEmoji('🎁').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('open_creator').setLabel('صانع محتوى').setEmoji('🎥').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('open_admin').setLabel('شكوى إداري').setEmoji('⚠️').setStyle(ButtonStyle.Secondary)
            );
            await message.channel.send({ embeds: [setupEmbed], components: [btns] });
            return message.delete();
        }

        // --- أوامر الوسطاء (حماية الرتبة) ---
        if (isMed && message.channel.name.startsWith('ticket-')) {
            if (message.content === `${CONFIG.prefix}trade`) {
                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('btn_trade_modal').setLabel('📝 تسجيل عملية التريد').setStyle(ButtonStyle.Primary));
                return message.reply({ content: '👇 **يرجى تعبئة بيانات المقايضة ليتم تسجيلها في التقييم:**', components: [row] });
            }

            if (message.content === `${CONFIG.prefix}done`) {
                const owner = await message.guild.members.fetch(message.channel.topic).catch(() => null);
                if (owner) {
                    const stars = new ActionRowBuilder().addComponents([1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_med_stars_${i}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary)));
                    await owner.send({ content: '⭐ **MNC Feedback:** يرجى تقييم الوسيط الآن:', components: [stars] }).catch(() => {});
                    return message.channel.send('✅ **تم إرسال طلب التقييم بنجاح.**');
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
            const count = guild.channels.cache.filter(c => c.topic === user.id && c.name.startsWith('ticket-')).size;
            if (count >= 2) return interaction.reply({ content: '⚠️ **تنبيه:** لا يمكنك فتح أكثر من تذكرتين في وقت واحد!', ephemeral: true });
            return await createTicket(interaction, customId.split('_')[1]);
        }

        // --- نظام الـ Claim المتطور (يختفي من الباقي) ---
        if (customId === 'claim_ticket') {
            if (!member.roles.cache.has(CONFIG.staffRole)) return;
            await channel.permissionOverwrites.edit(CONFIG.staffRole, { ViewChannel: false });
            await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
            await channel.permissionOverwrites.edit(CONFIG.adminRole, { ViewChannel: true });

            const row = ActionRowBuilder.from(interaction.message.components[0]);
            row.components[1].setDisabled(true); // الزر شفاف
            await interaction.update({ components: [row] });
            await channel.send({ content: `✅ **The ticket as been claimed successfully by** <@${user.id}>` });
            sendLog('Claim', channel, user);
        }

        // --- معالجة المودالات ---
        if (interaction.type === InteractionType.ModalSubmit) {
            if (customId === 'modal_trade_input') {
                const details = interaction.fields.getTextInputValue('trade_text');
                tradeData.set(channel.id, details);
                await interaction.reply({ content: `✅ **تم حفظ التريد:** ${details}` });
                return channel.send('**done**');
            }

            if (customId.startsWith('modal_rate_')) {
                const [target, stars, type] = customId.replace('modal_rate_', '').split('_');
                const comment = interaction.fields.getTextInputValue('comment') || 'بدون تعليق إضافي';
                const trade = tradeData.get(channel?.id) || "عملية عامة";
                const logID = type === 'staff' ? CONFIG.staffRatingLog : CONFIG.mediatorRatingLog;
                
                const logEmbed = new EmbedBuilder()
                    .setTitle(type === 'staff' ? '👨‍💼 تقييم إداري' : '🛡️ تقييم وسيط')
                    .addFields(
                        { name: 'العميل', value: `<@${target}>`, inline: true },
                        { name: 'التقييم', value: '⭐'.repeat(stars), inline: true },
                        { name: 'العملية', value: `✨ ${trade} ✨` },
                        { name: 'التعليق', value: comment }
                    ).setColor('#FFFFFF').setTimestamp();
                await client.channels.cache.get(logID).send({ embeds: [logEmbed] });
                return interaction.reply({ content: '✅ شكراً لتقييمك، تم إرساله بنجاح!', ephemeral: true });
            }
        }

        // --- أزرار التحكم الأخرى (Close / Delete / Add) ---
        if (customId === 'btn_trade_modal') {
            const modal = new ModalBuilder().setCustomId('modal_trade_input').setTitle('تسجيل تفاصيل العملية');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_text').setLabel('مثال: قرما مقابل دراجون كانيلوني').setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (customId === 'add_user') {
            const modal = new ModalBuilder().setCustomId('modal_add').setTitle('إضافة عضو');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id').setLabel('User ID').setStyle(TextInputStyle.Short).setRequired(true)));
            return await interaction.showModal(modal);
        }

        if (customId.startsWith('rate_')) {
            const [a, type, stars] = customId.split('_');
            const modal = new ModalBuilder().setCustomId(`modal_rate_${user.id}_${stars}_${type}`).setTitle('إضافة تعليق');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('comment').setLabel('اكتب تعليقك (اختياري)').setStyle(TextInputStyle.Paragraph).setRequired(false)));
            return await interaction.showModal(modal);
        }

        if (customId === 'close_ticket') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('confirm_close').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
            );
            return interaction.reply({ content: '❓ **Are you sure you want to close?**', components: [row], ephemeral: true });
        }

        if (customId === 'confirm_close') {
            const ownerID = channel.topic;
            await channel.permissionOverwrites.edit(ownerID, { ViewChannel: false });
            await interaction.update({ content: '🔒 تم إخفاء التذكرة عن العضو.', components: [] });
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary)
            );
            await channel.send({ content: `**Ticket control\nClosed By: <@${user.id}>**`, components: [row] });
        }

        if (customId === 'transcript') {
            const file = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
            await client.channels.cache.get(CONFIG.transcriptChannel).send({ content: `📝 Transcript for **${channel.name}**`, files: [file] });
            return interaction.reply({ content: '✅ تم إرسال الأرشيف للروم المخصص.', ephemeral: true });
        }

        if (customId === 'delete_ticket') {
            await interaction.reply('🗑️ يتم الحذف الآن...');
            setTimeout(() => channel.delete(), 5000);
            sendLog('Delete', channel, user);
        }
    });

    // --- وظيفة إنشاء التذكرة بناءً على الصور ---
    async function createTicket(interaction, type) {
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

        await interaction.reply({ content: `✅ **تم فتح تذكرتك بنجاح:** ${channel}`, ephemeral: true });
        
        const labels = { mediator: 'طلب وسيط', support: 'الدعم الفني', gift: 'استلام هدايا', creator: 'صانع محتوى', admin: 'شكوى إداري' };
        // الرسالة الخارجية
        await channel.send({ content: `حياك الله <@${user.id}>\n**Reason:** ${labels[type]}` });

        const embed = new EmbedBuilder().setColor('#FFFFFF').setTimestamp();

        // محتوى التذاكر المطابق للصور
        if (type === 'mediator') {
            embed.setTitle('🛡️ طلب وسيط').setDescription(
                `هذا القسم مخصص لطلب وسيط لعملية تريد داخل السيرفر\n` +
                `・ تأكد أن الطرف الآخر جاهز ومتواجد قبل فتح التذكرة\n` +
                `・ رجاء عدم فتح أكثر من تذكرة أو إزعاج الفريق بالتذكرو المتكررة\n` +
                `・ تحقق من درجة الوسيط، حيث أن لكل مستوى أمان مختلف\n` +
                `・ اكتب المعلومات المطلوبة بدقة في الأسئلة التالية`
            );
        } else if (type === 'support') {
            embed.setTitle('🛠️ تذكرة الدعم الفني').setDescription(
                `شكراً لفتح تذكرة الدعم الفني.\n` +
                `・ يرجى شرح شكواك أو مشكلتك أو طلبك بشكل واضح ومفصل قدر الإمكان.\n` +
                `・ ارفق أي صور أو روابط أو أدلة تساعدنا على فهم المشكلة.\n` +
                `・ فريق الدعم سيراجع تذكرتك ويجيبك في أسرع وقت ممكن.\n\n` +
                `يرجى التحلي بالصبر، فترتيب الردود يتم حسب الأولوية ووقت الفتح.`
            );
        } else {
            embed.setDescription(`✨ **Welcome to MNC Community** ✨\n\nيرجى انتظار طاقم العمل للرد عليك.`);
        }

        const btns = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('add_user').setLabel('Add User').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger)
        );
        const delRow = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger));

        await channel.send({ embeds: [embed], components: [btns, delRow] });
    }

    function sendLog(action, channel, user) {
        const embed = new EmbedBuilder().setTitle(`📑 Log: ${action}`).addFields({ name: 'Executor', value: user.tag }, { name: 'Channel', value: channel.name }).setColor('#FFFFFF');
        client.channels.cache.get(CONFIG.logsChannel).send({ embeds: [embed] });
    }

    console.log('💎 MNC Ultimate Ticket System is Online & Fully Protected!');
};
