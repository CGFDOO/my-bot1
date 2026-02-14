const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits, Events 
} = require("discord.js");
const transcript = require('discord-html-transcripts');

let ticketCounter = 1; 

module.exports = (client) => {

    const CONFIG = {
        HIGHER_ADMIN: "1453946893053726830",
        LOWER_ADMIN: "1454199885460144189",
        LOG_CHANNEL: "1453948413963141153",
        TRANSCRIPT_CHANNEL: "1472218573710823679",
        FEEDBACK_CHANNEL: "1472023428658630686",
        CATEGORY_ID: "1453943996392013901" 
    };

    // نظام الـ Setup المطور
    client.on(Events.MessageCreate, async (message) => {
        if (message.content === "!setup-ultra" && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            const setupEmbed = new EmbedBuilder()
                .setColor("#000000")
                .setTitle("🛡️ MNC COMMUNITY | SUPPORT CENTER")
                .setThumbnail(message.guild.iconURL({ size: 256 }))
                .setDescription("**مرحباً بك في مركز الدعم. فضلاً اختر القسم المناسب لفتح تذكرة:**");

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_tech').setLabel('دعم فني').setStyle(ButtonStyle.Primary).setEmoji('🛠️'),
                new ButtonBuilder().setCustomId('open_mid').setLabel('طلب وسيط').setStyle(ButtonStyle.Success).setEmoji('🤝'),
                new
                ButtonBuilder().setCustomId('open_gift').setLabel('استلام هدايا').setStyle(ButtonStyle.Secondary).setEmoji('🎁'),
                new ButtonBuilder().setCustomId('open_report').setLabel('شكوى إداري').setStyle(ButtonStyle.Danger).setEmoji('⚠️')
            );

            await message.channel.send({ embeds: [setupEmbed], components: [row] });
        }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
        const { customId, guild, channel, user, member } = interaction;

        // نظام النوافذ الاحترافي
        if (interaction.isButton() && customId.startsWith('open_')) {
            const type = customId.split('_')[1];
            const modal = new ModalBuilder().setCustomId(`modal_${type}`).setTitle('Information Needed');
            
            if (type === 'mid') {
                const i1 = new TextInputBuilder().setCustomId('u').setLabel("يوزر الشخص الي بتسوي معه تريد؟").setStyle(TextInputStyle.Short).setRequired(true);
                const i2 = new TextInputBuilder().setCustomId('q').setLabel("ما تفاصيل التريد أو العرض والمقابل؟").setStyle(TextInputStyle.Paragraph).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(i1), new ActionRowBuilder().addComponents(i2));
            } else {
                const i1 = new TextInputBuilder().setCustomId('q').setLabel("اشرح طلبك أو مشكلتك بالتفصيل؟").setStyle(TextInputStyle.Paragraph).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(i1));
            }
            return await interaction.showModal(modal);
        }

        if (interaction.isButton()) {
            // نظام الاستلام (Claim) وانفراد الإدارة
            if (customId === 'claim_sys') {
                if (!member.roles.cache.has(CONFIG.HIGHER_ADMIN) && !member.roles.cache.has(CONFIG.LOWER_ADMIN)) return interaction.reply({ content: "Admins only!", ephemeral: true });
                await channel.permissionOverwrites.edit(CONFIG.LOWER_ADMIN, { ViewChannel: false });
                await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true });
                await channel.setName(`claimed-${channel.name.split('-')[1]}-${channel.name.split('-')[2]}`);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('clmd').setLabel(`Claimed by ${user.username}`).setStyle(ButtonStyle.Success).setDisabled(true),
                    new
                    ButtonBuilder().setCustomId('add_u_btn').setLabel('Add User').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('close_req').setLabel('Close').setStyle(ButtonStyle.Danger)
                );
                await interaction.update({ components: [row] });
                return await channel.send({ content: `**✅ The ticket has been claimed successfully by ${user}**` });
            }

            // إضافة مستخدم (Add User)
            if (customId === 'add_u_btn') {
                const modal = new
                    ModalBuilder().setCustomId('modal_add').setTitle('Add User');
                const input = new TextInputBuilder().setCustomId('uid').setLabel("User ID").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(input));
                return await interaction.showModal(modal);
            }

            // نظام الإغلاق (Ticket Control)
            if (customId === 'close_req') {
                await channel.setName(`closed-${channel.name.split('-')[1]}-${channel.name.split('-')[2]}`);
                await channel.permissionOverwrites.edit(channel.topic, { ViewChannel: false });
                
                const controlEmbed = new EmbedBuilder()
                    .setTitle("Ticket control")
                    .setColor("#2f3136")
                    .setDescription(`**Closed By:** ${user}\n**(${user.id})**`);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('reopen_t').setLabel('Reopen ticket').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('del_t').setLabel('Delete ticket').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('del_reason_t').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger)
                );
                return await interaction.reply({ embeds: [controlEmbed], components: [row] });
            }

            if (customId === 'reopen_t') {
                await channel.permissionOverwrites.edit(channel.topic, { ViewChannel: true });
                return await interaction.reply({ content: "**✅ Ticket Reopened Successfully**" });
            }

            if (customId === 'del_t') {
                await interaction.reply("**🚀 Archiving and deleting...**");
                return finalizeTicket(channel, user, "بدون سبب", client, CONFIG);
            }
        }

        if (interaction.isModalSubmit()) {
            if (customId === 'modal_add') {
                const id = interaction.fields.getTextInputValue('uid');
                await channel.permissionOverwrites.edit(id, { ViewChannel: true, SendMessages: true });
                return await interaction.reply({ content: `**✅ User <@${id}> has been added successfully by ${user}**` });
            }

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

                const welcomeEmbed = new EmbedBuilder().setColor("#2f3136").setTitle(type === 'mid' ? "طلب وسيط" : "تذكرة الدعم الفني").setDescription(type === 'mid' ? "هذا القسم مخصص لطلب وسيط لعملية تريد داخل السيرفر." : "شكراً لفتح تذكرة الدعم الفني.");
                const detailEmbed = new EmbedBuilder().setColor("#2f3136").setTitle(type === 'mid' ? "يوزر الشخص الي بتسوي معه تريد؟" : "التفاصيل:").setDescription(`**${interaction.fields.getTextInputValue(type === 'mid' ? 'u' : 'q')}**`);

            const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('add_u_btn').setLabel('Add User').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('claim_sys').setLabel('Claim').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('close_req').setLabel('Close').setStyle(ButtonStyle.Danger)
                );

                await ticket.send({ content: `**حياك الله ${user} \nReason: ${type === 'mid' ? 'طلب وسيط' : 'الدعم الفني'}**`, embeds: [welcomeEmbed, detailEmbed], components: [row] });
                return await interaction.reply({ content: `✅ Ticket opened: ${ticket}`, ephemeral: true });
            }
        }
    });

    // نظام الأرشفة والتقييم الذكي
    async function finalizeTicket(channel, admin, reason, client, config) {
        const ownerId = channel.topic;
        const file = await transcript.createTranscript(channel);
        await client.channels.cache.get(config.TRANSCRIPT_CHANNEL).send({ content: `**📦 السجل الكامل للمحادثة للعضو <@${ownerId}>**`, files: [file] });
        
        const owner = await client.users.fetch(ownerId).catch(() => null);
        if (owner) {
            const starsRow = new ActionRowBuilder().addComponents([1,2,3,4,5].map(n => new ButtonBuilder().setCustomId(`r_${n}_${admin.id}`).setLabel(`${n} ⭐`).setStyle(ButtonStyle.Primary)));
            const feedbackBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`feedback_${admin.id}`).setLabel('إضافة تقييم إضافي 💬').setStyle(ButtonStyle.Secondary));
            
            // رسالة التقييم بأسلوب الذكاء الاصطناعي
            const rateEmbed = new EmbedBuilder()
                .setColor("Gold")
                .setTitle("🤖 MNC AI System | تقييم الخدمة")
                .setThumbnail(client.user.avatarURL())
                .setDescription(
                    `مرحباً بك، لقد تم إغلاق تذكرتك بنجاح.\n\n` +
                    `**رأيك هو المحرك الأساسي لتطويرنا.** نحن في **MNC COMMUNITY** نهتم بكل تفصيلة لتوفير تجربة أفضل لك دائماً.\n\n` +
                    `فضلاً، قم بتقييم أداء الإداري <@${admin.id}> عبر الأزرار أدناه:`
                )
                .setFooter({ text: "شكراً لثقتك بنا" });

            await owner.send({ embeds: [rateEmbed], components: [starsRow, feedbackBtn] }).catch(() => {});
        }
        setTimeout(() => channel.delete().catch(() => {}), 2000);
    }

    client.on(Events.InteractionCreate, async (i) => {
        if (!i.isButton()) return;
        if (i.customId.startsWith('r_')) {
            const [_, stars, adminId] = i.customId.split('_');
            const log = new EmbedBuilder().setTitle("🌟 تقييم جديد").setColor("Gold").setDescription(`**الإداري:** <@${adminId}>\n**العضو:** ${i.user}\n**النجوم:** ${"⭐".repeat(stars)}`).setTimestamp();
            await client.channels.cache.get(CONFIG.FEEDBACK_CHANNEL).send({ embeds: [log] });
            return await
                i.reply({ content: "✅ تم تسجيل تقييمك بالنجوم بنجاح، شكراً لك!", ephemeral: true });
        }
        if (i.customId.startsWith('feedback_')) {
            const modal = new ModalBuilder().setCustomId(`mod_${i.customId.split('_')[1]}`).setTitle('تقييمك يهمنا');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('t').setLabel("اكتب تعليقك الشخصي هنا").setStyle(TextInputStyle.Paragraph).setRequired(true)));
            await i.showModal(modal);
        }
    });

    client.on(Events.InteractionCreate, async (i) => {
        if (!i.isModalSubmit() || !i.customId.startsWith('mod_')) return;
        const embed = new EmbedBuilder().setTitle("💬 تعليق إضافي").setColor("Blue").setDescription(`**الإداري:** <@${i.customId.split('_')[1]}>\n**بواسطة:** ${i.user}\n**التعليق:** ${i.fields.getTextInputValue('t')}`).setTimestamp();
        await client.channels.cache.get(CONFIG.FEEDBACK_CHANNEL).send({ embeds: [embed] });
        await i.reply({ content: "✅ تم إرسال تعليقك للنظام بنجاح.", ephemeral: true });
    });
};
