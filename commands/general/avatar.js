const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'avatar',
    aliases: ['a', 'افتار'],
    async execute(message, args, client, config) {
        const target = message.mentions.users.first() || message.author;

        const embed = new EmbedBuilder()
            .setAuthor({ name: `${target.username}'s Avatar`, iconURL: target.displayAvatarURL() })
            .setColor(config?.embedSetup?.primaryColor || '#5865F2')
            .setImage(target.displayAvatarURL({ size: 4096, dynamic: true }))
            .setFooter({ text: `Requested by ${message.author.username}` });

        message.reply({ embeds: [embed] });
    }
};
