const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits, Events 
} = require("discord.js");
const transcript = require('discord-html-transcripts');

let ticketCounter = 1; 
const feedbackMessages = new Map();

module.exports = (client) => {

    const CONFIG = {
        HIGHER_ADMIN: "1453946893053726830",
        LOWER_ADMIN: "1454199885460144189",
        LOG_CHANNEL: "1453948413963141153",
        TRANSCRIPT_CHANNEL: "1472218573710823679",
        FEEDBACK_CHANNEL: "1472023428658630686",
        CATEGORY_ID: "1453943996392013901" 
    };

    // 1. نظام الـ Setup الأساسي (الإيمبد العملاق)
    client.on(Events.MessageCreate, async (message) => {
        if (message.content === "!setup-ultra" && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const mainEmbed = new EmbedBuilder()
                .setColor("#000000")
                .setTitle("🛡️ مركز العمليات والدعم | MNC COMMUNITY")
                .setThumbnail(message.guild.iconURL({ size: 256 }))
                .setDescription(
                    "**مرحباً بك في نظام التذاكر المطور. يرجى قراءة القوانين قبل البدء:**\n\n" +
                    "**📜 قوانين عامة:**\n" +
                    "• يمنع فتح التذاكر بغرض العبث، سيتم التعامل بحزم.\n" +
                    "• يرجى اختيار القسم الصحيح لتسريع عملية الرد.\n" +
                    "• الاحترام المتبادل بين العضو والإدارة شرط أساسي.\n" +
                    "• سيتم أرشفة جميع المحادثات تلقائياً للرجوع إليها.\n\n" +
                    "**🛠️ الأقسام المتاحة:**\n" +
                    "• **الدعم الفني:** للمشاكل التقنية والبلاغات العامة.\n" +
                    "• **طلب وسيط:** لضمان عمليات التبادل والتريد الآمنة.\n" +
                    "• **استلام هدايا:** خاص بالفائزين في الفعاليات والمسابقات.\n" +
                    "• **صانع محتوى:** للتقديم على رتبة اليوتيوبر أو التيكتوكر.\n" +
                    "• **شكوى إداري:** في حال واجهت مشكلة مع أحد أفراد الطاقم."
                )
                .setFooter({ text: "Security System - MNC Management", iconURL: message.guild.iconURL() });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_tech').setLabel('الدعم الفني').setStyle(ButtonStyle.Primary).setEmoji('🛠️'),
                new ButtonBuilder().setCustomId('open_mid').setLabel('طلب وسيط').setStyle(ButtonStyle.Success).setEmoji('🤝'),
                new ButtonBuilder().setCustomId('open_gift').setLabel('استلام هدايا').setStyle(ButtonStyle.Secondary).setEmoji('🎁'),
                new ButtonBuilder().setCustomId('open_creator').setLabel('صانع محتوى').setStyle(ButtonStyle.Primary).setEmoji('🎥'),
                new ButtonBuilder().setCustomId('open_report').setLabel('شكوى إداري').setStyle(ButtonStyle.Danger).setEmoji('⚠️')
            );

            await message.channel.send({ embeds: [mainEmbed], components: [row] });
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        const { customId, guild, channel, user, member } = interaction;

        // 2. معالجة فتح التذاكر (النافذة)
        if (interaction.isButton() && customId.startsWith('open_')) {
            const type = customId.split('_')[1];
            const modal = new ModalBuilder().setCustomId(`modal_${type}`).setTitle('Information Required');
            
            if (type === 'mid') {
                const u = new TextInputBuilder().setCustomId('u').setLabel("يوزر الشخص الي بتسوي معه تريد؟").setStyle(TextInputStyle.Short).setRequired(true);
                const q = new TextInputBuilder().setCustomId('q').setLabel("ما تفاصيل التريد أو العرض والمقابل؟").setStyle(TextInputStyle.Paragraph).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(u), new ActionRowBuilder().addComponents(q));
            } else if (type === 'creator') {
                const q = new TextInputBuilder().setCustomId('q').setLabel("رابط القناة وعدد المتابعين؟").setStyle(TextInputStyle.Paragraph).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(q));
            } else {
                const q = new TextInputBuilder().setCustomId('q').setLabel("اشرح طلبك أو مشكلتك بالتفصيل؟").setStyle(TextInputStyle.Paragraph).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(q));
            }
            return await interaction.showModal(modal);
        }

        // 3. معالجة الأزرار (Claim, Close, Add User)
        if (interaction.isButton()) {
            if (customId === 'claim_sys') {
                if (!member.roles.cache.has(CONFIG.HIGHER_ADMIN) && !member.roles.cache.has(CONFIG.LOWER_ADMIN)) return interaction.reply({ content: "Admins only!", ephemeral: true });
                await channel.permissionOverwrites.edit(CONFIG.LOWER_ADMIN, { ViewChannel: false });
                await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
                await channel.setName(`claimed-${channel.name.split('-')[1]}-${channel.name.split('-')[2]}`);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('clmd').setLabel(`Claimed by ${user.username}`).setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('add_u_btn').setLabel('Add User').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('close_req').setLabel('Close').setStyle(ButtonStyle.Danger)
                );
                await interaction.update({ components: [row] });
                await sendLog(guild, CONFIG.LOG_CHANNEL, "Claim Ticket", "#43b581", channel, channel.topic, user);
                return await channel.send({ content: `**✅ The ticket has been claimed successfully by ${user}**` });
            }

            if (customId === 'add_u_btn') {
                const modal = new ModalBuilder().setCustomId('modal_add').setTitle('Add User');
                const input = new TextInputBuilder().setCustomId('uid').setLabel("User ID").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }

            if (customId === 'close_req') {
                await channel.setName(`closed-${channel.name.split('-')[1]}-${channel.name.split('-')[2]}`);
                await channel.permissionOverwrites.edit(channel.topic, { ViewChannel: false });
                const controlEmbed = new EmbedBuilder().setTitle("Ticket control").setColor("#2f3136").setDescription(`**Closed By:** ${user}\n**(${user.id})**`);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('reopen_t').setLabel('Reopen ticket').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('del_t').setLabel('Delete ticket').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('del_reason_t').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
                );
                await sendLog(guild, CONFIG.LOG_CHANNEL, "Close Ticket", "#7289da", channel, channel.topic, user);
                return await interaction.reply({ embeds: [controlEmbed], components: [row] });
            }

            if (customId === 'reopen_t') {
                await channel.permissionOverwrites.edit(channel.topic, { ViewChannel: true });
                return await interaction.reply({ content: "**✅ Ticket Reopened Successfully**" });
            }

            if (customId === 'del_t' || customId === 'del_reason_t') {
                if (customId === 'del_reason_t') {
                    const modal = new ModalBuilder().setCustomId('modal_del_r').setTitle('Delete Reason');
                    const input = new TextInputBuilder().setCustomId('r').setLabel("السبب").setStyle(TextInputStyle.Short).setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    return await interaction.showModal(modal);
                }
                await interaction.reply("**🚀 Archiving and deleting...**");
                return finalizeTicket(channel, user, "بدون سبب", client, CONFIG);
            }
        }

        // 4. معالجة استلام النافذة وتصميم التيكت
        if (interaction.isModalSubmit()) {
            if (customId === 'modal_add') {
                const id = interaction.fields.getTextInputValue('uid');
                await channel.permissionOverwrites.edit(id, { ViewChannel: true, SendMessages: true });
                return await interaction.reply({ content: `**✅ User <@${id}> has been added successfully by ${user}**` });
            }

            if (customId === 'modal_del_r') return finalizeTicket(channel, user, interaction.fields.getTextInputValue('r'), client, CONFIG);

            if (customId.startsWith('modal_')) {
                const type = customId.split('_')[1];
                const id = ticketCounter++;
                const ticket = await guild.channels.create({
                    name: `ticket-${id}-${user.username}`,
                    parent: CONFIG.CATEGORY_ID,
                    topic: user.id,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel] },
                        { id: CONFIG.HIGHER_ADMIN, allow: [PermissionFlagsBits.ViewChannel] },
                        { id: CONFIG.LOWER_ADMIN, allow: [PermissionFlagsBits.ViewChannel] },
                    ],
                });

                const welcomeEmbed = new EmbedBuilder().setColor("#2f3136");
                const infoEmbed = new EmbedBuilder().setColor("#2f3136");
                let reason = interaction.fields.getTextInputValue(type === 'mid' ? 'q' : 'q');

                if (type === 'mid') {
                    welcomeEmbed.setTitle("طلب وسيط").setDescription("هذا القسم مخصص لطلب وسيط لعملية تريد داخل السيرفر.\n• تأكد أن الطرف الآخر جاهز وموجود.\n• تحقق من درجة الوسيط.");
                    infoEmbed.setTitle("يوزر الشخص الي بتسوي معه تريد؟").setDescription(`**${interaction.fields.getTextInputValue('u')}**`);
                } else if (type === 'creator') {
                    welcomeEmbed.setTitle("تقديم صانع محتوى").setDescription("هذا القسم مخصص للتقديم على رتبة صانع محتوى.\n• يرجى إرفاق رابط القناة.\n• سيتم مراجعة طلبك من قبل الإدارة.");
                    infoEmbed.setTitle("رابط القناة وعدد المتابعين؟");
                } else {
                    welcomeEmbed.setTitle("تذكرة الدعم الفني").setDescription("شكراً لفتح تذكرة الدعم الفني.\n• يرجى شرح شكواك أو مشكلتك بشكل واضح.\n• فريق الدعم سيراجع تذكرتك ويجيبك قريباً.");
                    infoEmbed.setTitle("ما هي مشكلتك أو طلبك بالتفصيل؟");
                }

                const detailEmbed = new EmbedBuilder().setColor("#2f3136").setDescription(`**${reason}**`);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('add_u_btn').setLabel('Add User').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('claim_sys').setLabel('Claim').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('close_req').setLabel('Close').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('del_reason_t').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
                );

                await ticket.send({ content: `**حياك الله ${user} \nReason: ${type === 'mid' ? 'طلب وسيط' : 'الدعم الفني'}**`, embeds: [welcomeEmbed, infoEmbed, detailEmbed], components: [row] });
                await sendLog(guild, CONFIG.LOG_CHANNEL, "Open Ticket", "#43b581", ticket, user.id, user);
                return await interaction.reply({ content: `✅ Ticket opened: ${ticket}`, ephemeral: true });
            }
        }
    });

    // 5. وظائف السجلات والتقييم الذكي
    async function sendLog(guild, logId, title, color, channel, ownerId, executor) {
        const log = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
            .setThumbnail(guild.iconURL())
            .addFields(
                { name: "Ticket Channel", value: `${channel}\n(${channel.id})` },
                { name: "Ticket Owned By", value: `<@${ownerId}>\n(${ownerId})` },
                { name: "Executor", value: `${executor}\n(${executor.id})` }
            )
            .setTimestamp();
        await guild.channels.cache.get(logId).send({ embeds: [log] });
    }

    async function finalizeTicket(channel, admin, reason, client, config) {
        const ownerId = channel.topic;
        const file = await transcript.createTranscript(channel);
      await client.channels.cache.get(config.TRANSCRIPT_CHANNEL).send({ content: `**📦 السجل الكامل للمحادثة للعضو <@${ownerId}>**`, files: [file] });
        await sendLog(channel.guild, config.LOG_CHANNEL, "Delete Ticket", "#f04747", channel, ownerId, admin);
        
        const owner = await client.users.fetch(ownerId).catch(() => null);
        if (owner) {
            const starsRow = new ActionRowBuilder().addComponents([1,2,3,4,5].map(n => new ButtonBuilder().setCustomId(`r_${n}_${admin.id}_${ownerId}`).setLabel(`${n} ⭐`).setStyle(ButtonStyle.Primary)));
            const feedbackBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`fdbk_${admin.id}_${ownerId}`).setLabel('إضافة تعليق إضافي 💬').setStyle(ButtonStyle.Secondary));
            
            const rateEmbed = new EmbedBuilder()
                .setColor("Gold")
                .setTitle("🤖 MNC AI System | تقييم الخدمة")
                .setDescription(`مرحباً بك، لقد تم إغلاق تذكرتك بنجاح.\n\nفضلاً قم بتقييم أداء الإداري <@${admin.id}>:`);

            await owner.send({ embeds: [rateEmbed], components: [starsRow, feedbackBtn] }).catch(() => {});
        }
        setTimeout(() => channel.delete().catch(() => {}), 2000);
    }

    // 6. نظام معالجة التقييم والدمج (Edit)
    client.on(Events.InteractionCreate, async (i) => {
        if (!i.isButton()) return;
        if (i.customId.startsWith('r_')) {
            const [_, stars, adminId, ownerId] = i.customId.split('_');
            const embed = new EmbedBuilder().setTitle("🌟 تقييم جديد").setColor("Gold").setDescription(`**الإداري:** <@${adminId}>\n**العضو:** <@${ownerId}>\n**النجوم:** ${"⭐".repeat(stars)}\n**التعليق:** لا يوجد`).setTimestamp();
            const msg = await client.channels.cache.get(CONFIG.FEEDBACK_CHANNEL).send({ embeds: [embed] });
            feedbackMessages.set(ownerId, msg.id);
            return await i.reply({ content: "✅ تم تسجيل النجوم بنجاح!", ephemeral: true });
        }

        if (i.customId.startsWith('fdbk_')) {
            const [_, adminId, ownerId] = i.customId.split('_');
            const modal = new ModalBuilder().setCustomId(`mod_${adminId}_${ownerId}`).setTitle('تقييمك يهمنا');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t').setLabel("اكتب تعليقك الشخصي هنا").setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await i.showModal(modal);
        }
    });

    client.on(Events.InteractionCreate, async (i) => {
        if (!i.isModalSubmit() || !i.customId.startsWith('mod_')) return;
        const [_, adminId, ownerId] = i.customId.split('_');
        const msgId = feedbackMessages.get(ownerId);

        if (msgId) {
            const channel = client.channels.cache.get(CONFIG.FEEDBACK_CHANNEL);
            const msg = await channel.messages.fetch(msgId);
            const oldEmbed = msg.embeds[0];
            const newEmbed = EmbedBuilder.from(oldEmbed).setDescription(oldEmbed.description.replace("لا يوجد", i.fields.getTextInputValue('t')));
            await msg.edit({ embeds: [newEmbed] });
            await i.reply({ content: "✅ تم تحديث تقييمك بنجاح!", ephemeral: true });
        }
    });
};  
