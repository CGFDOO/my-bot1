const discordLibrary = require('discord.js');
const { EmbedBuilder } = discordLibrary;
// ✅ التعديل الأول: سحب الخزنة الصح
const GuildConfigurationDatabaseModel = require('../models/GuildSettings');

module.exports = {
    name: 'messageDelete',
    once: false,

    async execute(deletedMessageObject, discordClientObject) {
        if (deletedMessageObject.partial || !deletedMessageObject.guild) return; 
        if (deletedMessageObject.author && deletedMessageObject.author.bot) return;

        let activeGuildConfig = null;
        try {
            activeGuildConfig = await GuildConfigurationDatabaseModel.findOne({ guildId: deletedMessageObject.guild.id });
        } catch (e) { return; }

        if (!activeGuildConfig || !activeGuildConfig.serverLogs) return; 
        
        // ✅ التعديل التاني: قراءة اسم الروم من الداشبورد الجديدة
        const logChannelId = activeGuildConfig.serverLogs.messageDeleteLogId;
        if (!logChannelId) return;

        try {
            const targetLogChannel = await deletedMessageObject.guild.channels.fetch(logChannelId);
            if (targetLogChannel) {
                const deletedLogEmbed = new EmbedBuilder()
                    .setTitle('🗑️ سجل الحذف (Message/Image Deleted)')
                    .setDescription(`**تم الحذف في روم:** <#${deletedMessageObject.channel.id}>\n**العضو:** <@${deletedMessageObject.author.id}>`)
                    // ✅ التعديل التالت: سحب لون الإيمبد من الداشبورد
                    .setColor(activeGuildConfig.serverLogs.msgDelColor || '#ed4245')
                    .setTimestamp()
                    .setFooter({ text: `Message ID: ${deletedMessageObject.id}` });
                
                // إضافة النص إن وجد
                if (deletedMessageObject.content && deletedMessageObject.content.trim() !== '') {
                    deletedLogEmbed.addFields({ name: 'محتوى الرسالة:', value: "```text\n" + deletedMessageObject.content + "\n```" });
                }

                // إضافة المرفقات (صور) إن وجدت
                if (deletedMessageObject.attachments.size > 0) {
                    let attachmentsUrls = '';
                    deletedMessageObject.attachments.forEach(att => attachmentsUrls += `[رابط الملف المحذوف](${att.proxyURL})\n`);
                    deletedLogEmbed.addFields({ name: 'المرفقات (صور/ملفات):', value: attachmentsUrls });
                }

                if (!deletedMessageObject.content && deletedMessageObject.attachments.size === 0) return;

                await targetLogChannel.send({ embeds: [deletedLogEmbed] });
            }
        } catch (e) { console.error('[MESSAGE DELETE LOG ERROR]', e); }
    }
};
