const discordLibrary = require('discord.js');
const { EmbedBuilder } = discordLibrary;
const GuildConfigurationDatabaseModel = require('../models/GuildConfig');

module.exports = {
    name: 'messageUpdate',
    once: false,

    async execute(oldMessageObject, newMessageObject, discordClientObject) {
        if (oldMessageObject.partial || newMessageObject.partial || !oldMessageObject.guild) return; 
        if (oldMessageObject.author && oldMessageObject.author.bot) return;
        if (oldMessageObject.content === newMessageObject.content) return;

        let activeGuildConfig = null;
        try {
            activeGuildConfig = await GuildConfigurationDatabaseModel.findOne({ guildId: oldMessageObject.guild.id });
        } catch (e) { return; }

        if (!activeGuildConfig || !activeGuildConfig.serverLogs) return; 
        
        const logChannelId = activeGuildConfig.serverLogs.messageLogChannelId;
        if (!logChannelId) return;

        try {
            const targetLogChannel = await oldMessageObject.guild.channels.fetch(logChannelId);
            if (targetLogChannel) {
                const updatedLogEmbed = new EmbedBuilder()
                    .setTitle('✏️ سجل الرسائل المعدلة (Message Edited)')
                    .setDescription(`**تم تعديل رسالة في روم:** <#${oldMessageObject.channel.id}>\n**العضو:** <@${oldMessageObject.author.id}>\n[اضغط هنا للذهاب للرسالة](${newMessageObject.url})`)
                    .setColor(activeGuildConfig.serverLogs.messageLogEmbedColor || '#fee75c')
                    .setTimestamp()
                    .setFooter({ text: `User ID: ${oldMessageObject.author.id}` });
                
                let oldContent = "```text\n" + (oldMessageObject.content || 'فارغ') + "\n```";
                if (oldContent.length > 1000) oldContent = "```text\n" + oldMessageObject.content.substring(0, 950) + "...\n```";
                
                let newContent = "```text\n" + (newMessageObject.content || 'فارغ') + "\n```";
                if (newContent.length > 1000) newContent = "```text\n" + newMessageObject.content.substring(0, 950) + "...\n```";

                updatedLogEmbed.addFields(
                    { name: 'النص القديم (Before):', value: oldContent, inline: false },
                    { name: 'النص الجديد (After):', value: newContent, inline: false }
                );

                await targetLogChannel.send({ embeds: [updatedLogEmbed] });
            }
        } catch (e) { console.error('[MESSAGE UPDATE LOG ERROR]', e); }
    }
};
