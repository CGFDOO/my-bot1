const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel]
});
const fs = require('fs');

// ========================== CONFIG ==========================
const config = {
    ticketCategory: '1453943996392013901', // Category for all tickets
    staffRole: '1454199885460144189', // Admin role
    seniorRole: '1453946893053726830', // Upper admin role
    logsChannel: '1453948413963141153', // Logs channel
    transcriptChannel: '1472218573710823679', // Transcript channel
    mediatorRatingChannel: '1472439331443441828', // Mediator rating
    staffRatingChannel: '1472023428658630686', // Staff rating
    startTicketNumber: 346
};

// Store tickets states
let ticketCount = config.startTicketNumber;
let activeTickets = new Collection(); // ticketID -> { userId, type, channelId }

// ========================== HELPERS ==========================
function createWelcomeEmbed(user, type) {
    return new EmbedBuilder()
        .setColor('White')
        .setTitle(type === 'middleman' ? 'طلب وسيط' : type === 'support' ? 'تذكرة الدعم الفني' : type === 'gift' ? 'استلام هدايا' : type === 'admin_complaint' ? 'شكوى على إداري' : 'تقديم على صانع محتوى')
        .setDescription(type === 'middleman' ? `هذا القسم مخصص لطلب الوسيط لعملية تريد داخل السيرفر\n・تأكد أن الطرف الاخر جاهز و متواجد قبل فتح التذكرة\n・رجاء عدم فتح اكثر من تذكرة أو ازعاج الفريق بالتذكرو المتكرره\n・تحقق من درجة الوسيط حيث أن كل لكل مستوي أمان مختلف\n・اكتب المعلومات المطلوبة بدقة في الاسئلة التالية`
            : type === 'support' ? `شكرا لفتح تذكرة الدعم الفني\n・يرجى شرح شكواك أو مشكلتك أو طلبك بشكل واضح و مفصل قدر الإمكان\n・ارفق اي صور أو روابط أو أدلة تساعدنا على فهم المشكله\n・فريق الدعم سيراجع تذكرتك و يجييك في اسرع وقت ممكن\nيرجى التحلي بالصبر فترتيب الردود يتم على حسب الأولوية و وقت الفتح`
            : type === 'gift' ? ''
            : type === 'admin_complaint' ? ''
            : type === 'content_creator' ? `يرجى ادخال التفاصيل في النافذة أدناه:\n1️⃣ رابط القنوات\n2️⃣ عدد المتابعين والمميزات` : '');
}

// ========================== MODALS ==========================
function createModal(type) {
    const modal = new ModalBuilder().setCustomId(`modal_${type}`).setTitle(type === 'middleman' ? 'طلب وسيط' : type === 'support' ? 'الدعم الفني' : type === 'content_creator' ? 'تقديم صانع محتوى' : 'تكت');
    if (type === 'middleman') {
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('middleman_user')
                .setLabel('يوزر الشخص الذي تتريد معه؟')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('middleman_details')
                .setLabel('ما تفاصيل التريد أو العرض والمقابل؟')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true))
        );
    } else if (type === 'support') {
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('support_problem')
                .setLabel('ما هي مشكلتك أو طلبك بالتفصيل؟')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true))
        );
    } else if (type === 'content_creator') {
        modal.addComponents(
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('creator_link')
                .setLabel('رابط القنوات')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)),
            new ActionRowBuilder().addComponents(new TextInputBuilder()
                .setCustomId('creator_details')
                .setLabel('عدد المتابعين والمميزات')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true))
        );
    }
    return modal;
}

// ========================== BUTTONS ==========================
function ticketButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('add_user').setLabel('ADD').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('CLAIM').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('close_ticket').setLabel('CLOSE').setStyle(ButtonStyle.Danger)
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('delete_ticket').setLabel('DELETE WITH REASON').setStyle(ButtonStyle.Secondary)
    );
    return [row1, row2];
}

// ========================== COMMAND HANDLING ==========================
client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;

    // ========================= SETUP =========================
    if (message.content === ':setup') {
        const types = ['middleman', 'support', 'gift', 'admin_complaint', 'content_creator'];
        for (const type of types) {
            const embed = createWelcomeEmbed(message.author, type);
            await message.channel.send({ content: `حياك الله <@${message.author.id}>\nReason: ${type === 'middleman' ? 'طلب وسيط' : type === 'support' ? 'الدعم الفني' : type === 'gift' ? 'استلام هدايا' : type === 'admin_complaint' ? 'شكوى على إداري' : 'تقديم على صانع محتوى'}`, embeds: [embed], components: ticketButtons() });
        }
    }

    // ========================= DONE (Mediator Rating) =========================
    if (message.content === ':done') {
        message.author.send({ content: '⭐ يرجى تقييم الوسيط. التعليق اختياري.' });
    }
});

// ========================== INTERACTIONS ==========================
client.on('interactionCreate', async interaction => {
    if (interaction.type === InteractionType.ModalSubmit) {
        const ticketId = interaction.channel.id;
        const ticketData = activeTickets.get(ticketId);
        if (!ticketData) return;
        // Handle modals
        if (interaction.customId === 'modal_middleman') {
            await interaction.reply({ content: `تم استلام بياناتك:\nUser: ${interaction.fields.getTextInputValue('middleman_user')}\nDetails: ${interaction.fields.getTextInputValue('middleman_details')}`, ephemeral: true });
        } else if (interaction.customId === 'modal_support') {
            await interaction.reply({ content: `تم استلام مشكلتك:\n${interaction.fields.getTextInputValue('support_problem')}`, ephemeral: true });
        } else if (interaction.customId === 'modal_content_creator') {
            await interaction.reply({ content: `تم استلام التقديم:\nرابط: ${interaction.fields.getTextInputValue('creator_link')}\nمميزات: ${interaction.fields.getTextInputValue('creator_details')}`, ephemeral: true });
        }
    } else if (interaction.isButton()) {
        const ticketId = interaction.channel.id;
        const ticketData = activeTickets.get(ticketId);
        if (!ticketData) return;

        if (interaction.customId === 'claim_ticket') {
            await interaction.update({ content: `The ticket has been claimed successfully by <@${interaction.user.id}>`, components: ticketButtons() });
        } else if (interaction.customId === 'close_ticket') {
            // Confirm close
            await interaction.reply({
                content: 'Are you sure you want to close this ticket?',
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('confirm_close').setLabel('Confirm').setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId('cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
                    )
                ],
                ephemeral: true
            });
        } else if (interaction.customId === 'confirm_close') {
            // Hide ticket from user
            await interaction.update({ content: 'Ticket closed successfully.', components: [] });
        } else if (interaction.customId === 'cancel_close') {
            await interaction.update({ content: 'Close canceled.', components: ticketButtons() });
        } else if (interaction.customId === 'add_user') {
            const modal = new ModalBuilder().setCustomId('modal_adduser').setTitle('Add User');
            modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('add_user_id').setLabel('Enter User ID').setStyle(TextInputStyle.Short).setRequired(true)));
            await interaction.showModal(modal);
        } else if (interaction.customId === 'delete_ticket') {
            await interaction.reply({ content: 'يرجى إدخال سبب الحذف في الرد التالي (سيتم التعامل معه كـ ephemeral).', ephemeral: true });
        }
    }
});
