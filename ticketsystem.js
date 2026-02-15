const { 
Client, GatewayIntentBits, Partials,
EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
ModalBuilder, TextInputBuilder, TextInputStyle,
PermissionsBitField
} = require('discord.js');

const client = new Client({
intents: [
GatewayIntentBits.Guilds,
GatewayIntentBits.GuildMessages,
GatewayIntentBits.MessageContent,
GatewayIntentBits.GuildMembers
],
partials: [Partials.Channel]
});

//////////////// CONFIG //////////////////

const TICKET_CATEGORY = "1453943996392013901";

const STAFF_ROLE = "1454199885460144189";
const HIGH_STAFF_ROLE = "1453946893053726830";

const LOG_CHANNEL = "1453948413963141153";
const TRANSCRIPT_CHANNEL = "1472218573710823679";
const MEDIATION_RATE_CHANNEL = "1472439331443441828";
const ADMIN_RATE_CHANNEL = "1472023428658630686";

////////////////////////////////////////////////

let ticketCounter = 346;
let openTickets = {};
let adminClaims = {};

////////////////////////////////////////////////

client.once("ready", () => {
console.log(`✅ Logged in as ${client.user.tag}`);
});

////////////////////////////////////////////////

function createWhiteEmbed(title, description){
return new EmbedBuilder()
.setColor("#ffffff")
.setTitle(title)
.setDescription(description);
}

async function sendLog(type, channel, user){

const logRoom = await client.channels.fetch(LOG_CHANNEL).catch(()=>null);
if(!logRoom) return;

logRoom.send({
embeds:[
createWhiteEmbed(
`📄 Ticket Log`,
`**Action:** ${type}
**Channel:** ${channel}
**User:** <@${user}>`
)
]
});
}

////////////////////////////////////////////////
//////////////// TICKET PANEL //////////////////
////////////////////////////////////////////////

async function sendTicketPanel(channel){

const embed = createWhiteEmbed(
"Ticket System",
`اختر نوع التكت من الأزرار بالأسفل

🛡️ الوساطة
🛠️ الدعم
🎁 استلام الهدايا
📷 التقديم لصانع محتوى
⚠️ شكوى على إداري`
);

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("ticket_mediation")
.setLabel("الوساطة")
.setEmoji("🛡️")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("ticket_support")
.setLabel("الدعم")
.setEmoji("🛠️")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("ticket_gift")
.setLabel("استلام الهدايا")
.setEmoji("🎁")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("ticket_creator")
.setLabel("التقديم لصانع محتوى")
.setEmoji("📷")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("ticket_report")
.setLabel("شكوى على إداري")
.setEmoji("⚠️")
.setStyle(ButtonStyle.Danger)
);

channel.send({
embeds:[embed],
components:[row]
});
}

////////////////////////////////////////////////
//////////////// CREATE TICKET //////////////////
////////////////////////////////////////////////

async function createTicket(interaction, type){

const member = interaction.member;

if(openTickets[member.id] && openTickets[member.id] >= 2){
return interaction.reply({
content:"❌ لديك الحد الأقصى من التكتات المفتوحة.",
ephemeral:true
});
}

ticketCounter++;

const ticketName = `ticket-${ticketCounter}`;

const channel = await interaction.guild.channels.create({
name: ticketName,
type: 0,
parent: TICKET_CATEGORY,
permissionOverwrites:[
{
id: interaction.guild.id,
deny:[PermissionsBitField.Flags.ViewChannel]
},
{
id: member.id,
allow:[
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages
]
},
{
id: STAFF_ROLE,
allow:[
PermissionsBitField.Flags.ViewChannel,
PermissionsBitField.Flags.SendMessages
]
}
]
});

if(!openTickets[member.id]) openTickets[member.id] = 0;
openTickets[member.id]++;

const ticketEmbed = createWhiteEmbed(
"Ticket Opened",
`User: <@${member.id}>
Type: ${type}

انتظر احد افراد الإدارة لاستلام التكت.`
);

const controlRow = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("claim_ticket")
.setLabel("Claim")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("add_member")
.setLabel("Add Member")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("close_ticket")
.setLabel("Close")
.setStyle(ButtonStyle.Danger)

);

await channel.send({
content:`<@${member.id}>`,
embeds:[ticketEmbed],
components:[controlRow]
});

await interaction.reply({
content:`✅ تم فتح التكت: ${channel}`,
ephemeral:true
});

await sendLog("Create", channel.id, member.id);
}

////////////////////////////////////////////////
//////////////// INTERACTION CREATE //////////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {

if(!interaction.isButton()) return;

switch(interaction.customId){

case "ticket_mediation":
createTicket(interaction,"Mediation");
break;

case "ticket_support":
createTicket(interaction,"Support");
break;

case "ticket_gift":
createTicket(interaction,"Gift");
break;

case "ticket_creator":
createTicket(interaction,"Creator Application");
break;

case "ticket_report":
createTicket(interaction,"Admin Report");
break;

}

});

////////////////////////////////////////////////
//////////////// CLAIM SYSTEM //////////////////
////////////////////////////////////////////////

// عداد استلام التكتات لكل إداري
const adminClaimCounter = {};

client.on("interactionCreate", async interaction => {

if(!interaction.isButton()) return;

if(interaction.customId !== "claim_ticket") return;

const member = interaction.member;
const channel = interaction.channel;

// تحقق أن المستخدم إداري
if(!member.roles.cache.has(STAFF_ROLE) && !member.roles.cache.has(HIGH_STAFF_ROLE)){
return interaction.reply({
content:"❌ You are not allowed to claim tickets.",
ephemeral:true
});
}

// تحقق أن التكت غير مستلم
if(channel.topic && channel.topic.includes("CLAIMED")){
return interaction.reply({
content:"❌ Ticket already claimed.",
ephemeral:true
});
}

// زيادة عداد الإداري
if(!adminClaimCounter[member.id]) adminClaimCounter[member.id] = 0;
adminClaimCounter[member.id]++;

const claimNumber = adminClaimCounter[member.id];

// تحديث topic عشان نعرف انه متعمله claim
await channel.setTopic(`CLAIMED_BY_${member.id}`);

// اخفاء الإدارة العادية بعد Claim
await channel.permissionOverwrites.edit(STAFF_ROLE,{
ViewChannel:false
});

// اظهار للإدارة العليا
await channel.permissionOverwrites.edit(HIGH_STAFF_ROLE,{
ViewChannel:true
});

// اظهار للاداري المستلم
await channel.permissionOverwrites.edit(member.id,{
ViewChannel:true
});

// رسالة الاستلام
await interaction.update({
content:`✅ **The ticket has been claimed successfully by <@${member.id}>**
This is ticket number **${claimNumber}** for this admin.`,
components:[ new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("claim_ticket")
.setLabel("Claim")
.setStyle(ButtonStyle.Success)
.setDisabled(true),

new ButtonBuilder()
.setCustomId("add_member")
.setLabel("Add Member")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId("close_ticket")
.setLabel("Close")
.setStyle(ButtonStyle.Danger)

)]
});

await sendLog("Claim", channel.id, member.id);

});

////////////////////////////////////////////////
/////////////// ADD MEMBER SYSTEM //////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {

if(!interaction.isButton()) return;

if(interaction.customId !== "add_member") return;

const member = interaction.member;

if(!member.roles.cache.has(STAFF_ROLE) && !member.roles.cache.has(HIGH_STAFF_ROLE)){
return interaction.reply({
content:"❌ You are not allowed to use this button.",
ephemeral:true
});
}

// مودال إدخال الايدي
const modal = new ModalBuilder()
.setCustomId("add_member_modal")
.setTitle("Add Member To Ticket");

const userIdInput = new TextInputBuilder()
.setCustomId("memberIdInput")
.setLabel("Enter User ID")
.setStyle(TextInputStyle.Short)
.setRequired(true);

const row = new ActionRowBuilder().addComponents(userIdInput);

modal.addComponents(row);

await interaction.showModal(modal);

});

////////////////////////////////////////////////
//////////// HANDLE ADD MEMBER MODAL ///////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {

if(!interaction.isModalSubmit()) return;

if(interaction.customId !== "add_member_modal") return;

const admin = interaction.member;
const channel = interaction.channel;

const userId = interaction.fields.getTextInputValue("memberIdInput");

const target = await interaction.guild.members.fetch(userId).catch(()=>null);

if(!target){
return interaction.reply({
content:"❌ User not found.",
ephemeral:true
});
}

// اعطاء صلاحية رؤية التكت
await channel.permissionOverwrites.edit(target.id,{
ViewChannel:true,
SendMessages:true
});

// رسالة مثل الصورة بالانجليزي
await interaction.reply({
content:`✅ **<@${target.id}> has been added to ticket by : <@${admin.id}>**`
});

await sendLog("Add Member", channel.id, admin.id);

});

////////////////////////////////////////////////
//////////////// CLOSE BUTTON //////////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {

if(!interaction.isButton()) return;

if(interaction.customId !== "close_ticket") return;

const member = interaction.member;

if(!member.roles.cache.has(STAFF_ROLE) && !member.roles.cache.has(HIGH_STAFF_ROLE)){
return interaction.reply({
content:"❌ You are not allowed to close this ticket.",
ephemeral:true
});
}

// رسالة تأكيد زي الصور
const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("confirm_close_ticket")
.setLabel("Confirm Close")
.setStyle(ButtonStyle.Danger),

new ButtonBuilder()
.setCustomId("cancel_close_ticket")
.setLabel("Cancel")
.setStyle(ButtonStyle.Secondary)

);

await interaction.reply({
content:"⚠️ **Are you sure you want to close this ticket?**",
components:[row],
ephemeral:true
});

});

////////////////////////////////////////////////
/////////////// CANCEL CLOSE ///////////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {

if(!interaction.isButton()) return;
if(interaction.customId !== "cancel_close_ticket") return;

await interaction.update({
content:"❌ Ticket close cancelled.",
components:[]
});

});

////////////////////////////////////////////////
/////////////// CONFIRM CLOSE //////////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {

if(!interaction.isButton()) return;
if(interaction.customId !== "confirm_close_ticket") return;

const channel = interaction.channel;
const admin = interaction.member;

// اخفاء التكت عن العضو صاحب التكت
const ticketOwner = tickets.openTickets[channel.id];

if(ticketOwner){
await channel.permissionOverwrites.edit(ticketOwner,{
ViewChannel:false
});
}

// رسالة اغلاق زي الصور
await interaction.channel.send({
content:`🔒 **Ticket closed by <@${admin.id}>**`
});

// ارسال لوق
await sendLog("Close Ticket", channel.id, admin.id);

// تحويل التكت لوضع post-close
const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId("delete_with_reason")
.setLabel("Delete With Reason")
.setStyle(ButtonStyle.Danger)

);

await interaction.update({
content:"✅ Ticket closed successfully.",
components:[]
});

await channel.send({
content:"🗑️ Management controls:",
components:[row]
});

});

////////////////////////////////////////////////
//////////// DELETE WITH REASON ////////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {

if(!interaction.isButton()) return;
if(interaction.customId !== "delete_with_reason") return;

const member = interaction.member;

if(!member.roles.cache.has(STAFF_ROLE) && !member.roles.cache.has(HIGH_STAFF_ROLE)){
return interaction.reply({
content:"❌ You are not allowed to delete tickets.",
ephemeral:true
});
}

const modal = new ModalBuilder()
.setCustomId("delete_reason_modal")
.setTitle("Delete Ticket Reason");

const reasonInput = new TextInputBuilder()
.setCustomId("deleteReasonInput")
.setLabel("Enter delete reason")
.setStyle(TextInputStyle.Paragraph)
.setRequired(true);

const row = new ActionRowBuilder().addComponents(reasonInput);

modal.addComponents(row);

await interaction.showModal(modal);

});

////////////////////////////////////////////////
//////////// HANDLE DELETE MODAL ///////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {

if(!interaction.isModalSubmit()) return;
if(interaction.customId !== "delete_reason_modal") return;

const channel = interaction.channel;
const admin = interaction.member;

const reason = interaction.fields.getTextInputValue("deleteReasonInput");

await interaction.reply({
content:`🗑️ Ticket deleted by <@${admin.id}> | Reason: ${reason}`,
ephemeral:true
});

////////////////////////////////////////////////
//////////////// CREATE TRANSCRIPT /////////////
////////////////////////////////////////////////

let transcript = "";

const messages = await channel.messages.fetch({limit:100});

messages.reverse().forEach(msg => {

transcript += `[${msg.author.tag}] : ${msg.content}\n`;

});

////////////////////////////////////////////////
//////////// SEND TRANSCRIPT ROOM //////////////
////////////////////////////////////////////////

const transcriptChannel = client.channels.cache.get(TRANSCRIPT_ROOM_ID);

if(transcriptChannel){

await transcriptChannel.send({
content:
`📄 **Ticket Transcript**
Channel: ${channel.name}
Closed by: <@${admin.id}>

\`\`\`
${transcript.slice(0,1900)}
\`\`\``
});

}

////////////////////////////////////////////////
//////////////// SEND LOG //////////////////////
////////////////////////////////////////////////

await sendLog("Delete Ticket", channel.id, admin.id);

////////////////////////////////////////////////
//////////// DELETE CHANNEL ////////////////////
////////////////////////////////////////////////

delete tickets.openTickets[channel.id];
saveTickets();

setTimeout(()=>{

channel.delete().catch(()=>{});

},3000);

});

////////////////////////////////////////////////
//////////// MEDIATION RATING SYSTEM ///////////
////////////////////////////////////////////////

// تخزين التقييمات لمنع التكرار
let mediationRatings = {};

////////////////////////////////////////////////
//////////// SEND MEDIATION RATING /////////////
////////////////////////////////////////////////

async function sendMediationRating(user1, user2, ticketNumber){

const ratingEmbed = new EmbedBuilder()
.setColor("#ffffff")
.setTitle("⭐ **تقييم الوساطة | Mediation Rating**")
.setDescription(
"**يرجى تقييم تجربة الوساطة الخاصة بك**\n\n"+
"Please rate your mediation experience.\n\n"+
"يمكنك التقييم مرة واحدة فقط."
);

const row = new ActionRowBuilder().addComponents(

new ButtonBuilder()
.setCustomId(`rate_1_${ticketNumber}`)
.setLabel("⭐ 1")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId(`rate_2_${ticketNumber}`)
.setLabel("⭐⭐ 2")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId(`rate_3_${ticketNumber}`)
.setLabel("⭐⭐⭐ 3")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId(`rate_4_${ticketNumber}`)
.setLabel("⭐⭐⭐⭐ 4")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId(`rate_5_${ticketNumber}`)
.setLabel("⭐⭐⭐⭐⭐ 5")
.setStyle(ButtonStyle.Secondary)

);

try{

await user1.send({embeds:[ratingEmbed],components:[row]});
await user2.send({embeds:[ratingEmbed],components:[row]});

}catch(err){
console.log("Cannot send rating DM");
}

}

////////////////////////////////////////////////
//////////// HANDLE RATING CLICK ///////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {

if(!interaction.isButton()) return;

if(!interaction.customId.startsWith("rate_")) return;

const split = interaction.customId.split("_");

const rating = split[1];
const ticketNumber = split[2];
const userId = interaction.user.id;

if(!mediationRatings[ticketNumber]){

mediationRatings[ticketNumber] = [];

}

if(mediationRatings[ticketNumber].includes(userId)){

return interaction.reply({
content:"❌ **لقد قمت بالتقييم بالفعل / You already rated**",
ephemeral:true
});

}

mediationRatings[ticketNumber].push(userId);

await interaction.reply({
content:`✅ **شكرا لتقييمك (${rating}⭐)**\nThank you for your rating.`,
ephemeral:true
});

////////////////////////////////////////////////
//////////// SEND TO MEDIATION ROOM ////////////
////////////////////////////////////////////////

const mediationRoom = client.channels.cache.get("1472439331443441828");

if(mediationRoom){

const resultEmbed = new EmbedBuilder()
.setColor("#ffffff")
.setTitle("⭐ Mediation Rating Result")
.setDescription(
`User: <@${userId}>
Rating: ${rating}⭐
Ticket: #${ticketNumber}`
);

mediationRoom.send({embeds:[resultEmbed]});

}

});

////////////////////////////////////////////////
//////////// ADMIN RATING SYSTEM //////////////
////////////////////////////////////////////////

// تخزين التقييمات لمنع التكرار
let adminRatings = {};

async function sendAdminRating(adminId, ticketNumber){

const adminEmbed = new EmbedBuilder()
.setColor("#ffffff")
.setTitle("⭐ **تقييم الإدارة | Admin Rating**")
.setDescription(
"**الرجاء تقييم الإدارة التي تعاملت معك**\n"+
"Please rate the admin who handled your ticket.\n\n"+
"يمكنك التقييم مرة واحدة فقط."
);

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId(`admin_1_${ticketNumber}`)
.setLabel("⭐ 1")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId(`admin_2_${ticketNumber}`)
.setLabel("⭐⭐ 2")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId(`admin_3_${ticketNumber}`)
.setLabel("⭐⭐⭐ 3")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId(`admin_4_${ticketNumber}`)
.setLabel("⭐⭐⭐⭐ 4")
.setStyle(ButtonStyle.Secondary),

new ButtonBuilder()
.setCustomId(`admin_5_${ticketNumber}`)
.setLabel("⭐⭐⭐⭐⭐ 5")
.setStyle(ButtonStyle.Secondary)
);

try{
await adminId.send({embeds:[adminEmbed],components:[row]});
}catch(err){
console.log("Cannot send admin rating DM");
}

}

////////////////////////////////////////////////
//////////// HANDLE ADMIN RATING //////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {

if(!interaction.isButton()) return;
if(!interaction.customId.startsWith("admin_")) return;

const split = interaction.customId.split("_");
const rating = split[1];
const ticketNumber = split[2];
const userId = interaction.user.id;

if(!adminRatings[ticketNumber]){
    adminRatings[ticketNumber] = [];
}

if(adminRatings[ticketNumber].includes(userId)){
    return interaction.reply({
        content:"❌ **لقد قمت بتقييم الإدارة بالفعل / You already rated the admin**",
        ephemeral:true
    });
}

adminRatings[ticketNumber].push(userId);

await interaction.reply({
content:`✅ **شكراً لتقييمك الإدارة (${rating}⭐)**\nThank you for your rating.`,
ephemeral:true
});

// ارسال للروم الخاص بتقييم الإدارة
const adminRoom = client.channels.cache.get("1472023428658630686");
if(adminRoom){
    const resultEmbed = new EmbedBuilder()
    .setColor("#ffffff")
    .setTitle("⭐ Admin Rating Result")
    .setDescription(
        `User: <@${userId}>\n`+
        `Rating: ${rating}⭐\n`+
        `Ticket: #${ticketNumber}`
    );
    adminRoom.send({embeds:[resultEmbed]});
}

});

////////////////////////////////////////////////
////////// MEDIATOR RATING SYSTEM /////////////
////////////////////////////////////////////////

// تخزين تقييمات الوسطاء لمنع التكرار
let mediatorRatings = {};

async function sendMediatorRating(userId, ticketNumber) {

    const mediatorEmbed = new EmbedBuilder()
    .setColor("#ffffff")
    .setTitle("⭐ **تقييم الوسيط | Mediator Rating**")
    .setDescription(
        "**الرجاء تقييم الوسيط الذي ساعدك في العملية**\n"+
        "Please rate the mediator who assisted you.\n\n"+
        "يمكنك التقييم مرة واحدة فقط / You can only rate once."
    );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
        .setCustomId(`mediator_1_${ticketNumber}`)
        .setLabel("⭐ 1")
        .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
        .setCustomId(`mediator_2_${ticketNumber}`)
        .setLabel("⭐⭐ 2")
        .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
        .setCustomId(`mediator_3_${ticketNumber}`)
        .setLabel("⭐⭐⭐ 3")
        .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
        .setCustomId(`mediator_4_${ticketNumber}`)
        .setLabel("⭐⭐⭐⭐ 4")
        .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
        .setCustomId(`mediator_5_${ticketNumber}`)
        .setLabel("⭐⭐⭐⭐⭐ 5")
        .setStyle(ButtonStyle.Secondary)
    );

    try {
        await userId.send({embeds:[mediatorEmbed], components:[row]});
    } catch(err) {
        console.log("Cannot send mediator rating DM");
    }

}

////////////////////////////////////////////////
////////// HANDLE MEDIATOR RATING /////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {

    if(!interaction.isButton()) return;
    if(!interaction.customId.startsWith("mediator_")) return;

    const split = interaction.customId.split("_");
    const rating = split[1];
    const ticketNumber = split[2];
    const userId = interaction.user.id;

    if(!mediatorRatings[ticketNumber]){
        mediatorRatings[ticketNumber] = [];
    }

    if(mediatorRatings[ticketNumber].includes(userId)){
        return interaction.reply({
            content:"❌ **لقد قمت بتقييم الوسيط بالفعل / You already rated the mediator**",
            ephemeral:true
        });
    }

    mediatorRatings[ticketNumber].push(userId);

    await interaction.reply({
        content:`✅ **شكراً لتقييمك الوسيط (${rating}⭐) / Thank you for your rating.**`,
        ephemeral:true
    });

    // ارسال للروم الخاص بتقييم الوسطاء
    const mediatorRoom = client.channels.cache.get("1472439331443441828");
    if(mediatorRoom){
        const resultEmbed = new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle("⭐ Mediator Rating Result")
        .setDescription(
            `User: <@${userId}>\n`+
            `Rating: ${rating}⭐\n`+
            `Ticket: #${ticketNumber}`
        );
        mediatorRoom.send({embeds:[resultEmbed]});
    }

});

////////////////////////////////////////////////
//////////// TICKET LOG SYSTEM ////////////////
////////////////////////////////////////////////

async function sendLog(action, ticket, actorId, extra = null) {
    // روم اللوق للتكتات
    const logChannel = client.channels.cache.get("1453948413963141153");
    if(!logChannel) return;

    let description = "";
    switch(action){
        case "Claim":
            description = `📌 **Ticket Claimed**\n`+
                          `Ticket: #${ticket.number}\n`+
                          `Claimed by: <@${actorId}>\n`+
                          `Member: <@${ticket.memberId}>`;
            break;

        case "Close":
            description = `🔒 **Ticket Closed**\n`+
                          `Ticket: #${ticket.number}\n`+
                          `Closed by: <@${actorId}>\n`+
                          `Member: <@${ticket.memberId}>`;
            break;

        case "Delete":
            description = `🗑️ **Ticket Deleted**\n`+
                          `Ticket: #${ticket.number}\n`+
                          `Deleted by: <@${actorId}>\n`+
                          `Reason: ${extra ? extra : "No reason provided"}\n`+
                          `Member: <@${ticket.memberId}>`;
            break;

        case "AddMember":
            description = `➕ **Member Added**\n`+
                          `Ticket: #${ticket.number}\n`+
                          `Added Member: <@${extra.addedId}>\n`+
                          `By Admin: <@${actorId}>\n`+
                          `Member: <@${ticket.memberId}>`;
            break;

        default:
            description = `ℹ️ **Ticket Update**\nTicket: #${ticket.number}`;
    }

    const logEmbed = new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle("📋 Ticket Log")
        .setDescription(description)
        .setTimestamp();

    logChannel.send({embeds:[logEmbed]});
}

////////////////////////////////////////////////
////////// USAGE EXAMPLES WITH TICKETS ////////
////////////////////////////////////////////////

// مثال على استدعاء اللوق عند Claim
// await sendLog("Claim", ticket, adminId);

// مثال على استدعاء اللوق عند Close
// await sendLog("Close", ticket, adminId);

// مثال على استدعاء اللوق عند Delete مع سبب
// await sendLog("Delete", ticket, adminId, "Member requested deletion");

// مثال على استدعاء اللوق عند إضافة عضو
// await sendLog("AddMember", ticket, adminId, {addedId: newMemberId});

////////////////////////////////////////////////
////////// TICKET CREATION SYSTEM /////////////
////////////////////////////////////////////////

const ticketCategoryId = "1453943996392013901"; // كاتيجوري التكتات
let ticketCounter = 346; // بداية ترقيم التكتات

client.on("interactionCreate", async interaction => {
    if(!interaction.isButton()) return;

    const member = interaction.user;
    let ticketName;

    switch(interaction.customId){
        case "create_support":
            ticketCounter++;
            ticketName = `ticket-${ticketCounter}-${member.username}`;
            const supportChannel = await interaction.guild.channels.create({
                name: ticketName,
                type: 0, // نصي
                parent: ticketCategoryId,
                permissionOverwrites: [
                    { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] }
                ]
            });

            // ايمبد الدعم الفني
            const supportEmbed = new EmbedBuilder()
                .setColor("#ffffff")
                .setTitle("🎫 **تذكرة الدعم الفني | Support Ticket**")
                .setDescription(
                    `حياك الله <@${member.id}>\n`+
                    `**Reason:** الدعم الفني\n\n`+
                    "شكراً لفتح تذكرة الدعم الفني\n"+
                    "・يرجى شرح شكواك أو مشكلتك أو طلبك بشكل واضح ومفصل قدر الإمكان\n"+
                    "・ارفق أي صور أو روابط أو أدلة تساعدنا على فهم المشكلة\n"+
                    "・فريق الدعم سيراجع تذكرتك و يجييك في أسرع وقت ممكن\n"+
                    "يرجى التحلي بالصبر فترتيب الردود يتم على حسب الأولوية و وقت الفتح"
                );

            const supportRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("claim_support")
                    .setLabel("Claim")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("🖐️"),
                new ButtonBuilder()
                    .setCustomId("close_support")
                    .setLabel("Close")
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji("🔒"),
                new ButtonBuilder()
                    .setCustomId("delete_support")
                    .setLabel("Delete")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("🗑️")
            );

            supportChannel.send({content:`<@${member.id}>`, embeds:[supportEmbed], components:[supportRow]});
            await interaction.reply({content:`✅ تم فتح تذكرتك: ${supportChannel}`, ephemeral:true});
            break;

        case "create_gifts":
            ticketCounter++;
            ticketName = `ticket-${ticketCounter}-${member.username}`;
            const giftsChannel = await interaction.guild.channels.create({
                name: ticketName,
                type: 0,
                parent: ticketCategoryId,
                permissionOverwrites: [
                    { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] }
                ]
            });

            const giftsEmbed = new EmbedBuilder()
                .setColor("#ffffff")
                .setTitle("🎁 **استلام الهدايا | Gift Receipt**")
                .setDescription(
                    `حياك الله <@${member.id}>\n`+
                    `**Reason:** استلام هدايا`
                );

            const giftsRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("claim_gifts")
                    .setLabel("Claim")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("🖐️"),
                new ButtonBuilder()
                    .setCustomId("close_gifts")
                    .setLabel("Close")
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji("🔒"),
                new ButtonBuilder()
                    .setCustomId("delete_gifts")
                    .setLabel("Delete")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("🗑️")
            );

            giftsChannel.send({content:`<@${member.id}>`, embeds:[giftsEmbed], components:[giftsRow]});
            await interaction.reply({content:`✅ تم فتح تذكرتك: ${giftsChannel}`, ephemeral:true});
            break;

        // يمكنك إضافة بقية أنواع التكت مثل طلب وسيط، تقديم على صانع محتوى، شكوى على إداري بنفس الطريقة
    }
});

////////////////////////////////////////////////
////////// TICKET BUTTON HANDLING /////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {
    if(!interaction.isButton()) return;

    const member = interaction.user;
    const channel = interaction.channel;

    // CLAIM BUTTON
    if(interaction.customId.startsWith("claim_")){
        // اخفاء باقي الأعضاء العاديين
        channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false });
        channel.permissionOverwrites.edit(member.id, { ViewChannel: true });
        
        await interaction.update({content:`✅ **Ticket claimed successfully by <@${member.id}>**`, components: interaction.message.components});
        
        // ارسال لوج
        const logChannel = client.channels.cache.get("1453948413963141153"); // روم اللوق
        if(logChannel){
            logChannel.send(`📌 Ticket ${channel.name} has been claimed by <@${member.id}>`);
        }
    }

    // CLOSE BUTTON
    if(interaction.customId.startsWith("close_")){
        // تحقق مزدوج قبل الغلق
        await interaction.reply({
            content: "⚠️ Are you sure you want to close this ticket? This action cannot be undone.\nType 'confirm' to close or 'cancel' to cancel.",
            ephemeral: true
        });

        const filter = m => m.author.id === member.id && ["confirm","cancel"].includes(m.content.toLowerCase());
        const collector = channel.createMessageCollector({filter, time: 15000, max: 1});

        collector.on("collect", async m => {
            if(m.content.toLowerCase() === "confirm"){
                await channel.delete().catch(console.error);

                const logChannel = client.channels.cache.get("1453948413963141153");
                if(logChannel){
                    logChannel.send(`🔒 Ticket ${channel.name} closed by <@${member.id}>`);
                }
            } else {
                await interaction.followUp({content:"❌ Ticket close cancelled.", ephemeral:true});
            }
        });
    }

    // DELETE BUTTON
    if(interaction.customId.startsWith("delete_")){
        // تحقق مزدوج قبل الحذف
        await interaction.reply({
            content: "⚠️ Are you sure you want to delete this ticket? Type 'confirm' to delete or 'cancel' to cancel.",
            ephemeral: true
        });

        const filter = m => m.author.id === member.id && ["confirm","cancel"].includes(m.content.toLowerCase());
        const collector = channel.createMessageCollector({filter, time: 15000, max: 1});

        collector.on("collect", async m => {
            if(m.content.toLowerCase() === "confirm"){
                await channel.delete().catch(console.error);

                const logChannel = client.channels.cache.get("1453948413963141153");
                if(logChannel){
                    logChannel.send(`🗑️ Ticket ${channel.name} deleted by <@${member.id}>`);
                }
            } else {
                await interaction.followUp({content:"❌ Ticket delete cancelled.", ephemeral:true});
            }
        });
    }
});

////////////////////////////////////////////////
////////// ADD MEMBER BUTTON HANDLING //////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {
    if(!interaction.isButton()) return;

    const member = interaction.user;
    const channel = interaction.channel;

    // ADD BUTTON
    if(interaction.customId.startsWith("add_")){
        await interaction.reply({
            content: "Please enter the **User ID** of the member you want to add to this ticket:",
            ephemeral: true
        });

        const filter = m => m.author.id === member.id;
        const collector = channel.createMessageCollector({filter, time: 30000, max: 1});

        collector.on("collect", async m => {
            const userIdToAdd = m.content.replace(/[<@!>]/g, "");
            const userToAdd = await interaction.guild.members.fetch(userIdToAdd).catch(() => null);

            if(!userToAdd){
                return interaction.followUp({content:"❌ Invalid User ID.", ephemeral:true});
            }

            await channel.permissionOverwrites.edit(userToAdd.id, { ViewChannel: true });

            // تأكيد الإضافة في التكت
            await interaction.followUp({content:`✅ <@${userToAdd.id}> has been added to the ticket by <@${member.id}>.`, ephemeral:true});

            // إرسال لوج
            const logChannel = client.channels.cache.get("1453948413963141153"); // روم لوق التكت
            if(logChannel){
                logChannel.send(`➕ <@${userToAdd.id}> has been added to ${channel.name} by <@${member.id}>`);
            }
        });
    }
});

////////////////////////////////////////////////
////////// MEDIATOR RATING SYSTEM /////////////
////////////////////////////////////////////////

// تخزين تقييمات الوسطاء لمنع التكرار
let mediatorRatings = {};

async function sendMediatorRating(userId, ticketNumber){
    const mediatorEmbed = new EmbedBuilder()
    .setColor("#ffffff")
    .setTitle("⭐ **تقييم الوسيط | Mediator Rating**")
    .setDescription(
        "**الرجاء تقييم الوسيط الذي تعامل معك**\n"+
        "Please rate the mediator who handled your ticket.\n\n"+
        "يمكنك التقييم مرة واحدة فقط."
    );

    // نافذتين للإجابات الإضافية
    const modal = new ModalBuilder()
        .setCustomId(`mediator_modal_${ticketNumber}`)
        .setTitle("Mediator Feedback");

    const feedbackInput = new TextInputBuilder()
        .setCustomId("feedback_input")
        .setLabel("تعليق إضافي (اختياري) / Additional feedback")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

    const detailsInput = new TextInputBuilder()
        .setCustomId("details_input")
        .setLabel("هل كان الوسيط متعاون؟ / Was the mediator cooperative?")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    const firstActionRow = new ActionRowBuilder().addComponents(feedbackInput);
    const secondActionRow = new ActionRowBuilder().addComponents(detailsInput);

    modal.addComponents(firstActionRow, secondActionRow);

    try{
        await userId.send({embeds:[mediatorEmbed], components:[], modals:[modal]});
    }catch(err){
        console.log("Cannot send mediator rating DM");
    }
}

////////////////////////////////////////////////
////////// HANDLE MEDIATOR RATING /////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {
    if(interaction.isModalSubmit()){
        if(!interaction.customId.startsWith("mediator_modal_")) return;

        const ticketNumber = interaction.customId.split("_")[2];
        const userId = interaction.user.id;

        if(!mediatorRatings[ticketNumber]){
            mediatorRatings[ticketNumber] = [];
        }

        if(mediatorRatings[ticketNumber].includes(userId)){
            return interaction.reply({
                content:"❌ **لقد قمت بتقييم الوسيط بالفعل / You already rated the mediator**",
                ephemeral:true
            });
        }

        mediatorRatings[ticketNumber].push(userId);

        const feedback = interaction.fields.getTextInputValue("feedback_input");
        const details = interaction.fields.getTextInputValue("details_input");

        await interaction.reply({
            content:`✅ **شكراً لتقييمك الوسيط**\nThank you for your feedback.`,
            ephemeral:true
        });

        // إرسال للروم الخاص بتقييم الوسطاء
        const mediatorRoom = client.channels.cache.get("1472439331443441828"); // روم تقييم الوسطاء
        if(mediatorRoom){
            const resultEmbed = new EmbedBuilder()
            .setColor("#ffffff")
            .setTitle("⭐ Mediator Rating Result")
            .setDescription(
                `User: <@${userId}>\n`+
                `Feedback: ${feedback || "No additional feedback"}\n`+
                `Cooperation: ${details}\n`+
                `Ticket: #${ticketNumber}`
            );
            mediatorRoom.send({embeds:[resultEmbed]});
        }
    }
});

////////////////////////////////////////////////
//////////// DELETE TICKET SYSTEM /////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("delete_")) return;

    const split = interaction.customId.split("_");
    const ticketNumber = split[1];
    const ticketChannel = interaction.channel;

    // الخطوة الأولى: تأكيد الحذف
    const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`confirmDelete_${ticketNumber}`)
            .setLabel("✅ Confirm Delete")
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId(`cancelDelete_${ticketNumber}`)
            .setLabel("❌ Cancel")
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
        content: "**هل أنت متأكد أنك تريد حذف التكت؟ / Are you sure you want to delete this ticket?**",
        components: [confirmRow],
        ephemeral: true
    });
});

// التعامل مع التأكيد أو الإلغاء
client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;

    const split = interaction.customId.split("_");
    const action = split[0];
    const ticketNumber = split[1];
    const ticketChannel = interaction.channel;

    if (action === "confirmDelete") {
        const reason = "Deleted by admin"; // ممكن تعدلها لتاخد Input من الزرار أو Modal
        // إرسال رسالة في روم اللوق
        const logChannel = client.channels.cache.get("1453948413963141153"); // روم اللوق
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor("#ff0000")
                .setTitle("🗑️ Ticket Deleted / تكت محذوف")
                .setDescription(
                    `Ticket: #${ticketNumber}\n` +
                    `Deleted by: <@${interaction.user.id}>\n` +
                    `Reason / السبب: ${reason}`
                );
            logChannel.send({ embeds: [logEmbed] });
        }

        await interaction.update({
            content: `✅ **تم حذف التكت بنجاح / Ticket deleted successfully.**`,
            components: []
        });

        // حذف التكت
        ticketChannel.delete().catch(console.error);

    } else if (action === "cancelDelete") {
        await interaction.update({
            content: "❌ **تم إلغاء حذف التكت / Ticket deletion canceled.**",
            components: []
        });
    }
});

////////////////////////////////////////////////
//////////// CLOSE TICKET SYSTEM //////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("close_")) return;

    const split = interaction.customId.split("_");
    const ticketNumber = split[1];
    const ticketChannel = interaction.channel;

    // الخطوة الأولى: تأكيد الإغلاق
    const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`confirmClose_${ticketNumber}`)
            .setLabel("✅ Confirm Close")
            .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
            .setCustomId(`cancelClose_${ticketNumber}`)
            .setLabel("❌ Cancel")
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
        content: "**هل أنت متأكد أنك تريد غلق التكت؟ / Are you sure you want to close this ticket?**",
        components: [confirmRow],
        ephemeral: true
    });
});

// التعامل مع التأكيد أو الإلغاء
client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;

    const split = interaction.customId.split("_");
    const action = split[0];
    const ticketNumber = split[1];
    const ticketChannel = interaction.channel;

    if (action === "confirmClose") {
        // إخفاء التكت عن العضو
        ticketChannel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: false });

        // إرسال رسالة لعضو الإدارة أو اللوق
        const logChannel = client.channels.cache.get("1453948413963141153"); // روم اللوق
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor("#ffa500")
                .setTitle("🔒 Ticket Closed / تم غلق التكت")
                .setDescription(
                    `Ticket: #${ticketNumber}\n` +
                    `Closed by: <@${interaction.user.id}>`
                );
            logChannel.send({ embeds: [logEmbed] });
        }

        await interaction.update({
            content: "✅ **تم غلق التكت بنجاح / Ticket closed successfully.**",
            components: []
        });

        // إضافة زر لإعادة الفتح لو حابب
        const reopenRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`reopen_${ticketNumber}`)
                .setLabel("🔓 Reopen Ticket")
                .setStyle(ButtonStyle.Primary)
        );

        await ticketChannel.send({
            content: "**يمكنك إعادة فتح التكت عند الحاجة / You can reopen this ticket if needed.**",
            components: [reopenRow]
        });

    } else if (action === "cancelClose") {
        await interaction.update({
            content: "❌ **تم إلغاء غلق التكت / Ticket closure canceled.**",
            components: []
        });
    } else if (action === "reopen") {
        // إعادة فتح التكت للعضو
        ticketChannel.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true });

        await interaction.update({
            content: "✅ **تم إعادة فتح التكت / Ticket reopened successfully.**",
            components: []
        });
    }
});

////////////////////////////////////////////////
//////////// TICKET TRANSCRIPT SYSTEM //////////
////////////////////////////////////////////////

async function saveTicketTranscript(channel, ticketNumber) {
    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        let transcriptText = `Transcript for Ticket #${ticketNumber}\n\n`;
        sorted.forEach(msg => {
            const author = msg.author.tag;
            const content = msg.content || "[Embed/Attachment]";
            transcriptText += `[${new Date(msg.createdTimestamp).toLocaleString()}] ${author}: ${content}\n`;
        });

        // إرسال الترانسكريبت لروم الترانسكريبت
        const transcriptChannel = client.channels.cache.get("1472218573710823679"); // روم الترانسكريبت
        if (transcriptChannel) {
            const attachment = new AttachmentBuilder(Buffer.from(transcriptText, "utf-8"), {
                name: `ticket-${ticketNumber}-transcript.txt`
            });
            transcriptChannel.send({ content: `📝 Transcript for Ticket #${ticketNumber}`, files: [attachment] });
        }

    } catch (err) {
        console.log(`Error saving transcript for ticket #${ticketNumber}:`, err);
    }
}

// استدعاء عند غلق التكت
client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;
    const split = interaction.customId.split("_");
    const action = split[0];
    const ticketNumber = split[1];
    const ticketChannel = interaction.channel;

    if (action === "confirmClose") {
        await saveTicketTranscript(ticketChannel, ticketNumber);
    } else if (action === "delete") {
        await saveTicketTranscript(ticketChannel, ticketNumber);
    }
});

////////////////////////////////////////////////
///////// USER TICKET LIMIT & PROTECTION ///////
////////////////////////////////////////////////

// حفظ العضو اللي عنده تكت مفتوح
let openTicketsByUser = {};

// عند محاولة فتح تكت جديد
async function createTicket(interaction, ticketType) {
    const userId = interaction.user.id;

    // تحقق لو العضو عنده تكت مفتوح
    if (openTicketsByUser[userId]) {
        return interaction.reply({
            content: "❌ **لا يمكنك فتح أكثر من تكت في نفس الوقت / You can only have one open ticket at a time.**",
            ephemeral: true
        });
    }

    // رقم التكت التالي
    const ticketNumber = Object.keys(openTicketsByUser).length + 346; // يبدأ من 346

    // إنشاء قناة التكت
    const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${ticketNumber}-${interaction.user.username}`,
        type: 0, // GUILD_TEXT
        parent: "1453943996392013901", // الكتاجوري
        permissionOverwrites: [
            {
                id: interaction.guild.roles.everyone.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: interaction.user.id,
                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
            }
        ]
    });

    // تسجيل العضو عنده تكت مفتوح
    openTicketsByUser[userId] = { channelId: ticketChannel.id, ticketNumber };

    // رسالة الترحيب في التكت
    await ticketChannel.send({
        content: `✅ **تم إنشاء التكت بنجاح / Ticket created successfully!**\nTicket #${ticketNumber}`,
    });

    return ticketChannel;
}

// عند غلق التكت أو حذفه
function closeUserTicket(userId) {
    delete openTicketsByUser[userId];
}

// حماية النظام: الحد من الضغط الزائد على البوت
client.on("interactionCreate", async interaction => {
    if (!interaction.isButton() && !interaction.isCommand()) return;

    // منع تنفيذ أكثر من تكت بنفس الوقت
    const userId = interaction.user.id;
    if (openTicketsByUser[userId] && interaction.customId.startsWith("newTicket")) {
        return interaction.reply({
            content: "⚠️ **الرجاء الانتظار حتى يتم إنهاء التكت الحالي قبل فتح آخر / Please wait until your current ticket is resolved.**",
            ephemeral: true
        });
    }
});

client.on("interactionCreate", async interaction => {
    if(!interaction.isButton()) return;

    const ticketCategory = "1453943996392013901"; // Category ID
    const giftChannel = client.channels.cache.get("1473948413963141153"); // Gift logs

    // فتح التكت
    if(interaction.customId === "open_gift_ticket") {
        const ticketNumber = nextTicketNumber(); // تابع لحساب رقم التكت
        const ticket = await interaction.guild.channels.create(`ticket-${ticketNumber}-gift`, {
            type: 0,
            parent: ticketCategory,
            permissionOverwrites: [
                {
                    id: interaction.user.id,
                    allow: ["ViewChannel", "SendMessages"]
                },
                {
                    id: STAFF_ROLE,
                    deny: ["ViewChannel"]
                }
            ]
        });

        const giftEmbed = new EmbedBuilder()
        .setColor("#ffffff")
        .setTitle("🎁 Gift Claim Ticket")
        .setDescription(`Welcome <@${interaction.user.id}>!\nReason: **Gift Claim**`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`claim_gift_${ticketNumber}`)
                .setLabel("Claim")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`close_gift_${ticketNumber}`)
                .setLabel("Close")
                .setStyle(ButtonStyle.Danger)
        );

        ticket.send({embeds:[giftEmbed], components:[row]});
        await interaction.reply({content:`✅ Your gift ticket has been created: ${ticket}`, ephemeral:true});
    }

    // استلام التكت
    if(interaction.customId.startsWith("claim_gift_")) {
        const split = interaction.customId.split("_");
        const ticketNumber = split[2];
        const ticket = interaction.channel;

        await interaction.update({content:`✅ The ticket has been claimed successfully by <@${interaction.user.id}>`, components:[]});
        await ticket.permissionOverwrites.edit(STAFF_ROLE, {ViewChannel: true});
        giftChannel.send(`<@${interaction.user.id}> claimed Gift Ticket #${ticketNumber}`);
    }

    // غلق التكت مع تحقق
    if(interaction.customId.startsWith("close_gift_")) {
        await interaction.reply({content:"Are you sure you want to close this ticket? (Confirm / Cancel)", ephemeral:true});
        // هنا نكمل خطوة تحقق Confirm / Cancel
    }
});

client.on("interactionCreate", async interaction => {
    if(!interaction.isButton()) return;

    const ticketCategory = "1453943996392013901"; // Category ID
    const mediatorRoom = client.channels.cache.get("1472439331443441828"); // Mediator Ratings

    // فتح تكت الوساطة
    if(interaction.customId === "open_mediator_ticket") {
        const ticketNumber = nextTicketNumber();
        const ticket = await interaction.guild.channels.create(`ticket-${ticketNumber}-mediator`, {
            type: 0,
            parent: ticketCategory,
            permissionOverwrites: [
                {
                    id: interaction.user.id,
                    allow: ["ViewChannel", "SendMessages"]
                },
                {
                    id: STAFF_ROLE,
                    deny: ["ViewChannel"]
                }
            ]
        });

        const mediatorEmbed = new EmbedBuilder()
            .setColor("#ffffff")
            .setTitle("⚖️ طلب وسيط | Mediator Request")
            .setDescription(`Welcome <@${interaction.user.id}>!\nReason: **Mediator Request**\n\nهذا القسم مخصص لطلب الوسيط لعملية تريد داخل السيرفر\n・تأكد أن الطرف الاخر جاهز و متواجد قبل فتح التذكرة\n・رجاء عدم فتح اكثر من تذكرة أو ازعاج الفريق بالتذكرو المتكرره\n・تحقق من درجة الوسيط حيث أن كل لكل مستوي أمان مختلف\n・اكتب المعلومات المطلوبة بدقة في الاسئلة التالية`);

        const modal = new ModalBuilder()
            .setCustomId(`mediator_form_${ticketNumber}`)
            .setTitle("Mediator Details");

        const tradeUser = new TextInputBuilder()
            .setCustomId("trade_user")
            .setLabel("User of the trade?")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        const tradeDetails = new TextInputBuilder()
            .setCustomId("trade_details")
            .setLabel("Trade details / Offer & Counter")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(tradeUser);
        const row2 = new ActionRowBuilder().addComponents(tradeDetails);

        modal.addComponents(row1, row2);

        const rowButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`add_${ticketNumber}`)
                .setLabel("Add Member")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`claim_${ticketNumber}`)
                .setLabel("Claim")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`close_${ticketNumber}`)
                .setLabel("Close")
                .setStyle(ButtonStyle.Danger)
        );

        await ticket.send({embeds:[mediatorEmbed], components:[rowButtons]});
        await interaction.reply({content:`✅ Your mediator ticket has been created: ${ticket}`, ephemeral:true});
    }
});

////////////////////////////////////////////////
/////////// FINAL TICKET HANDLING /////////////
////////////////////////////////////////////////

client.on("interactionCreate", async interaction => {
    if(!interaction.isButton()) return;

    const ticketChannel = interaction.channel;
    const member = interaction.user;
    const adminRole = "1454199885460144189"; // رتبة الإدارة الصغرى
    const seniorAdminRole = "1453946893053726830"; // الإدارة العليا

    // زر الاستلام Claim
    if(interaction.customId.startsWith("claim_")){
        // فقط للأداري المستلم أو الإدارة العليا
        if(!interaction.member.roles.cache.has(adminRole) && !interaction.member.roles.cache.has(seniorAdminRole)) return;
        await ticketChannel.permissionOverwrites.edit(interaction.member.id, { ViewChannel: true });
        await interaction.update({ content: `✅ **The ticket has been claimed successfully by <@${member.id}>**` });
        // لوج الاستلام
        const logRoom = client.channels.cache.get("1453948413963141153");
        if(logRoom) logRoom.send(`Ticket #${ticketChannel.name} claimed by <@${member.id}>`);
    }

    // زر الإضافة Add
    if(interaction.customId.startsWith("add_")){
        const userIdToAdd = interaction.customId.split("_")[1];
        await ticketChannel.permissionOverwrites.edit(userIdToAdd, { ViewChannel: true });
        await interaction.reply({ content: `✅ <@${userIdToAdd}> has been added to ticket by <@${member.id}>`, ephemeral:true });
        const logRoom = client.channels.cache.get("1453948413963141153");
        if(logRoom) logRoom.send(`<@${userIdToAdd}> added to Ticket #${ticketChannel.name} by <@${member.id}>`);
    }

    // زر الإغلاق Close مع تحقق بخطوتين
    if(interaction.customId.startsWith("close_")){
        await interaction.reply({
            content: "⚠️ Are you sure you want to close this ticket? / تأكيد إغلاق التذكرة",
            components:[
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`confirmClose_${ticketChannel.id}`)
                        .setLabel("Confirm")
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId(`cancelClose_${ticketChannel.id}`)
                        .setLabel("Cancel")
                        .setStyle(ButtonStyle.Secondary)
                )
            ],
            ephemeral:true
        });
    }

    // زر الحذف Delete مع Reason
    if(interaction.customId.startsWith("delete_")){
        const reason = interaction.customId.split("_")[1] || "No reason provided";
        await ticketChannel.delete().catch(console.error);
        const logRoom = client.channels.cache.get("1453948413963141153");
        if(logRoom) logRoom.send(`Ticket #${ticketChannel.name} deleted by <@${member.id}>. Reason: ${reason}`);
    }
});
