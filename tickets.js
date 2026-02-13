const {
EmbedBuilder,
ActionRowBuilder,
ButtonBuilder,
ButtonStyle,
ChannelType,
PermissionsBitField
} = require("discord.js");

let ticketCount = 0;

module.exports = (client) => {

client.on("messageCreate", async (message) => {

if (message.author.bot) return;

// ✅ امر ارسال لوحة التكتات
if (message.content === "!tickets") {

const embed = new EmbedBuilder()
.setTitle("🎫 نظام التكتات")
.setDescription(
"اختر نوع التذكرة من الأزرار بالأسفل:\n\n" +
"🎧 دعم فني\n" +
"⚠️ شكوى على إداري\n" +
"🤝 طلب وسيط\n" +
"🎁 استلام هدايا"
)
.setColor("Purple");

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("support")
.setLabel("دعم فني")
.setEmoji("🎧")
.setStyle(ButtonStyle.Primary),

new ButtonBuilder()
.setCustomId("report")
.setLabel("شكوى على إداري")
.setEmoji("⚠️")
.setStyle(ButtonStyle.Danger),

new ButtonBuilder()
.setCustomId("middleman")
.setLabel("طلب وسيط")
.setEmoji("🤝")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("gift")
.setLabel("استلام هدايا")
.setEmoji("🎁")
.setStyle(ButtonStyle.Secondary),
);

message.channel.send({ embeds:[embed], components:[row] });

}

});

client.on("interactionCreate", async (interaction) => {

if (!interaction.isButton()) return;

if (["support","report","middleman","gift"].includes(interaction.customId)) {

ticketCount++;

let name = "ticket";
let emoji = "🎫";

if (interaction.customId === "support") {
name = "دعم-فني";
emoji = "🎧";
}
if (interaction.customId === "report") {
name = "شكوى";
emoji = "⚠️";
}
if (interaction.customId === "middleman") {
name = "وسيط";
emoji = "🤝";
}
if (interaction.customId === "gift") {
name = "هدايا";
emoji = "🎁";
}

const channel = await interaction.guild.channels.create({
name: `${name}-${ticketCount}`,
type: ChannelType.GuildText,
permissionOverwrites: [
{
id: interaction.guild.id,
deny: [PermissionsBitField.Flags.ViewChannel],
},
{
id: interaction.user.id,
allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
},
],
});

const embed = new EmbedBuilder()
.setTitle(`${emoji} تكت رقم ${ticketCount}`)
.setDescription(`صاحب التكت: ${interaction.user}`)
.setColor("Purple");

const row = new ActionRowBuilder().addComponents(
new ButtonBuilder()
.setCustomId("claim")
.setLabel("استلام")
.setEmoji("✅")
.setStyle(ButtonStyle.Success),

new ButtonBuilder()
.setCustomId("close")
.setLabel("قفل")
.setEmoji("🔒")
.setStyle(ButtonStyle.Danger)
);

channel.send({ embeds:[embed], components:[row] });

interaction.reply({ content:"✅ تم إنشاء التكت", ephemeral:true });

}

// زر استلام
if (interaction.customId === "claim") {
interaction.reply("✅ تم استلام التكت بواسطة الإدارة");
}

// زر قفل
if (interaction.customId === "close") {
await interaction.channel.delete();
}

});

};
