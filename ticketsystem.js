const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextInputBuilder, ModalBuilder, TextInputStyle, InteractionType } = require("discord.js");

// حفظ التكتات
let tickets = {
    openTickets: {},
    ticketCount: 346 // نبدأ من 346 كما طلبت
};

// تقييم الوسيط لمنع التكرار
let mediatorRatings = {};

// تقييم الإدارة لمنع التكرار
let adminRatings = {};

// أمر Setup
module.exports = async (client) => {

    client.on("messageCreate", async message => {

        if(message.content === ":setup" && message.guild) {
            // إرسال الإيمبد الأساسي للتكتات
            const embed = new EmbedBuilder()
            .setColor("#ffffff")
            .setTitle("🎫 Ticket System")
            .setDescription(
                "**قوانين التريد:**\n"+
                "・ممنوع سحب على التذكرة\n"+
                "・ممنوع فتح أكثر من تكت في نفس الوقت\n\n"+
                "اضغط على أي زر لإنشاء التكت"
            );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("new_ticket").setLabel("🎫 فتح تكت").setStyle(ButtonStyle.Primary)
            );

            message.channel.send({embeds:[embed],components:[row]});
        }

        if(message.content === ":done") {
            // أمر لإرسال تقييم الوسيط بعد إغلاق التكت
            message.channel.send("✅ تقييم الوسيط سيتم إرساله للطرفين في الخاص.");
        }
    });

    // إنشاء التكت و التعامل مع الأزرار
    client.on("interactionCreate", async interaction => {

        if(interaction.isButton()){

            const member = interaction.user;

            if(interaction.customId === "new_ticket"){
                const ticketNumber = tickets.ticketCount++;
                const ticketName = `ticket-${ticketNumber}-${member.id}`;

                const ticketChannel = await interaction.guild.channels.create({
                    name: ticketName,
                    type: 0, // Text channel
                    parent: "1453943996392013901", // الكاتيجوري
                    permissionOverwrites:[
                        {id: member.id, allow: ["ViewChannel", "SendMessages"]},
                        {id: interaction.guild.roles.everyone, deny: ["ViewChannel"]}
                    ]
                });

                tickets.openTickets[ticketChannel.id] = {owner: member.id, number: ticketNumber};

                // إيمبد التكت الأساسي
                const embed = new EmbedBuilder()
                .setColor("#ffffff")
                .setTitle("🎫 Ticket Opened")
                .setDescription(`مرحبا <@${member.id}>!\nالرجاء اختيار نوع التكت.`);

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("claim_ticket").setLabel("✅ Claim").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("close_ticket").setLabel("🔒 Close").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId("add_member").setLabel("➕ Add Member").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("delete_ticket").setLabel("🗑️ Delete").setStyle(ButtonStyle.Danger)
                );

                ticketChannel.send({content: `<@${member.id}>`, embeds:[embed], components:[row]});
                await interaction.reply({content:`✅ تم إنشاء التكت: ${ticketChannel}`, ephemeral:true});
            }

            // Claim ticket
            if(interaction.customId === "claim_ticket"){
                const ticket = tickets.openTickets[interaction.channel.id];
                if(!ticket) return interaction.reply({content:"❌ خطأ، التكت غير موجود", ephemeral:true});

                // أخفاء الدور العادي
                const STAFF_ROLE = "1454199885460144189";
                interaction.channel.permissionOverwrites.edit(STAFF_ROLE,{ViewChannel:false});

                await interaction.update({content:`✅ Ticket claimed by <@${member.id}>`});
            }

            // Close ticket مع خطوة التحقق
            if(interaction.customId === "close_ticket"){
                const modal = new ModalBuilder()
                .setCustomId("close_modal")
                .setTitle("Close Ticket");

                const reasonInput = new TextInputBuilder()
                .setCustomId("deleteReasonInput")
                .setLabel("Reason for closing the ticket / سبب الإغلاق")
                .setStyle(TextInputStyle.Short);

                const row = new ActionRowBuilder().addComponents(reasonInput);
                modal.addComponents(row);
                await interaction.showModal(modal);
            }

            // Add member
            if(interaction.customId === "add_member"){
                await interaction.reply({content:"اكتب ID العضو لإضافته:",ephemeral:true});
            }

            // Delete ticket
            if(interaction.customId === "delete_ticket"){
                const ticket = tickets.openTickets[interaction.channel.id];
                if(!ticket) return interaction.reply({content:"❌ التكت غير موجود", ephemeral:true});

                delete tickets.openTickets[interaction.channel.id];
                await interaction.channel.delete().catch(console.error);
            }
        }

        // التعامل مع المودال بعد Close
        if(interaction.type === InteractionType.ModalSubmit){
            if(interaction.customId === "close_modal"){
                const reason = interaction.fields.getTextInputValue("deleteReasonInput");
                await interaction.reply({content:`🗑️ Ticket closed. Reason: ${reason}`, ephemeral:true});
                const ticket = tickets.openTickets[interaction.channel.id];
                if(ticket) delete tickets.openTickets[interaction.channel.id];
            }
        }
    });

    ////////////////////////////////////////////////
    // Mediator Rating
    ////////////////////////////////////////////////
    client.on("interactionCreate", async interaction => {

        if(!interaction.isButton()) return;
        if(!interaction.customId.startsWith("mediator_")) return;

        const split = interaction.customId.split("_");
        const rating = split[1];
        const ticketNumber = split[2];
        const userId = interaction.user.id;

        if(!mediatorRatings[ticketNumber]) mediatorRatings[ticketNumber] = [];
        if(mediatorRatings[ticketNumber].includes(userId)){
            return interaction.reply({content:"❌ لقد قيمت الوسيط بالفعل / Already rated.",ephemeral:true});
        }

        mediatorRatings[ticketNumber].push(userId);
        await interaction.reply({content:`✅ شكرا لتقييمك الوسيط (${rating}⭐)`,ephemeral:true});
    });

    ////////////////////////////////////////////////
    // Admin Rating
    ////////////////////////////////////////////////
    client.on("interactionCreate", async interaction => {

        if(!interaction.isButton()) return;
        if(!interaction.customId.startsWith("admin_")) return;

        const split = interaction.customId.split("_");
        const rating = split[1];
        const ticketNumber = split[2];
        const userId = interaction.user.id;

        if(!adminRatings[ticketNumber]) adminRatings[ticketNumber] = [];
        if(adminRatings[ticketNumber].includes(userId)){
            return interaction.reply({content:"❌ لقد قيمت الإدارة بالفعل / Already rated.",ephemeral:true});
        }

        adminRatings[ticketNumber].push(userId);
        await interaction.reply({content:`✅ شكراً لتقييمك الإدارة (${rating}⭐)`, ephemeral:true});

        // إرسال إلى روم تقييم الإدارة
        const adminRoom = client.channels.cache.get("1472023428658630686");
        if(adminRoom){
            const resultEmbed = new EmbedBuilder()
            .setColor("#ffffff")
            .setTitle("⭐ Admin Rating Result")
            .setDescription(`User: <@${userId}>\nRating: ${rating}⭐\nTicket: #${ticketNumber}`);
            adminRoom.send({embeds:[resultEmbed]});
        }
    });

};
