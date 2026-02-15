const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs');

// ==========================
// CONFIGURATION
// ==========================
const config = {
    categories: {
        ticketCategory: '1453943996392013901'
    },
    roles: {
        staff: '1454199885460144189',
        management: '1453946893053726830'
    },
    channels: {
        mediatorRating: '1472439331443441828',
        staffRating: '1472023428658630686',
        logs: '1453948413963141153',
        transcript: '1472218573710823679'
    },
    maxTicketsPerUser: 2,
    cooldown: 5000 // Anti spam cooldown in ms
};

// ==========================
// STATE STORAGE
// ==========================
let ticketState = {}; // { userId: [ticketIds] }
let lastInteraction = {}; // anti-spam & duplicate prevention

// ==========================
// HELPERS
// ==========================
function createEmbed(title, description, color = '#ffffff') {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color);
}

function canInteract(userId) {
    const now = Date.now();
    if (!lastInteraction[userId]) {
        lastInteraction[userId] = now;
        return true;
    }
    if (now - lastInteraction[userId] < config.cooldown) return false;
    lastInteraction[userId] = now;
    return true;
}

// ==========================
// TICKET CREATION
// ==========================
async function createTicket(interaction, type) {
    const userId = interaction.user.id;

    // Check max tickets
    if (!ticketState[userId]) ticketState[userId] = [];
    if (ticketState[userId].length >= config.maxTicketsPerUser) {
        return interaction.reply({ content: '🚫 لديك الحد الأقصى من التكتات المفتوحة!', ephemeral: true });
    }

    // Ticket numbering
    const ticketNumber = 346 + Object.keys(ticketState).length;
    const ticketName = `ticket-${ticketNumber}-${interaction.user.username}`;

    const channel = await interaction.guild.channels.create({
        name: ticketName,
        type: 0, // GUILD_TEXT
        parent: config.categories.ticketCategory,
        permissionOverwrites: [
            { id: interaction.user.id, allow: ['ViewChannel', 'SendMessages'] },
            { id: config.roles.staff, allow: ['ViewChannel', 'SendMessages'] },
            { id: config.roles.management, allow: ['ViewChannel', 'SendMessages'] },
            { id: interaction.guild.id, deny: ['ViewChannel'] }
        ]
    });

    ticketState[userId].push(channel.id);

    // Outside embed message
    await channel.send(`حياك الله <@${userId}>\nReason: ${type}\n**🚨 يمنع سحب الرسائل على التكت**`);

    // Inside embed depending on type
    let embed = null;
    let modal = null;
    switch (type) {
        case 'طلب وسيط':
            embed = createEmbed(
                'طلب وسيط',
                'هذا القسم مخصص لطلب الوسيط لعملية تريد داخل السيرفر.\n・تأكد أن الطرف الآخر جاهز\n・عدم فتح أكثر من تذكرة\n・تحقق من درجة الوسيط\n・اكتب المعلومات بدقة'
            );
            modal = new ModalBuilder()
                .setCustomId('mediatorModal')
                .setTitle('طلب وسيط')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('mediatorUser')
                            .setLabel('يوزر الشخص الذي تتريد معه')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('tradeDetails')
                            .setLabel('تفاصيل التريد أو العرض والمقابل')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );
            break;
        case 'دعم فني':
            embed = createEmbed(
                'تذكرة الدعم الفني',
                'شكراً لفتح تذكرة الدعم الفني.\n・اشرح المشكلة بالتفصيل\n・ارفق الأدلة\n・سيتم الرد حسب الأولوية'
            );
            modal = new ModalBuilder()
                .setCustomId('supportModal')
                .setTitle('دعم فني')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('supportIssue')
                            .setLabel('ما هي مشكلتك بالتفصيل؟')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );
            break;
        case 'استلام هدايا':
        case 'شكوى على إداري':
            embed = null; // فقط رسالة الترحيب + reason
            break;
        case 'تقديم صانع محتوى':
            embed = createEmbed(
                'تقديم صانع محتوى',
                'رجاء ملء المعلومات المطلوبة أدناه'
            );
            modal = new ModalBuilder()
                .setCustomId('creatorModal')
                .setTitle('تقديم صانع محتوى')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('channelLinks')
                            .setLabel('رابط القنوات')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('followersInfo')
                            .setLabel('عدد المتابعين والمميزات')
                            .setStyle(TextInputStyle.Paragraph)
                            .setRequired(true)
                    )
                );
            break;
    }

    // Send embed if exists
    if (embed) await channel.send({ embeds: [embed] });

    // Buttons
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('addUser').setLabel('ADD').setStyle(ButtonStyle.Primary).setEmoji('➕'),
        new ButtonBuilder().setCustomId('claimTicket').setLabel('CLAIM').setStyle(ButtonStyle.Success).setEmoji('🛡️'),
        new ButtonBuilder().setCustomId('closeTicket').setLabel('CLOSE').setStyle(ButtonStyle.Danger).setEmoji('❌')
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('deleteWithReason').setLabel('DELETE WITH REASON').setStyle(ButtonStyle.Secondary).setEmoji('🗑️')
    );

    await channel.send({ content: 'إدارة التكت:', components: [row1, row2] });

    return { channel, modal };
}

// ==========================
// EXPORT FUNCTION
// ==========================
module.exports = {
    createTicket,
    ticketState,
    canInteract,
    config
};
