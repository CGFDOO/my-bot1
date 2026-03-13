const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
    client.on('messageCreate', async message => {
        // عشان البوت ميردش على نفسه
        if (message.author.bot) return;

        // 🔴 حط أيدي روم الضريبة هنا
        const taxChannelId = '1468625417563803772';

        const content = message.content.toLowerCase().trim();
        const isTaxChannel = message.channel.id === taxChannelId;

        const isRobux = content.startsWith('r ') || content.startsWith('!taxr ');
        const isCredit = content.startsWith('!tax ') || (isTaxChannel && !isRobux);

        if (!isRobux && !isCredit && !isTaxChannel) return;

        let rawAmount = content.replace('!taxr', '').replace('!tax', '').replace('r', '').trim();

        const parseAmount = (text) => {
            let multiplier = 1;
            if (text.endsWith('k')) { multiplier = 1000; text = text.slice(0, -1); }
            else if (text.endsWith('m')) { multiplier = 1000000; text = text.slice(0, -1); }
            else if (text.endsWith('b')) { multiplier = 1000000000; text = text.slice(0, -1); }
            
            const num = parseFloat(text);
            return isNaN(num) ? null : Math.floor(num * multiplier);
        };

        const amount = parseAmount(rawAmount);

        if (!amount || amount <= 0) {
            if (content.startsWith('!tax') || content.startsWith('r') || isTaxChannel) {
                return message.reply({ content: '❗ **يرجى إدخال رقم صحيح**' }).catch(() => {});
            }
            return;
        }

        // الإيموجيات المخصصة بتاعتك
        const robuxEmoji = '<:Rubox:1481865668587687988>';
        const creditEmoji = '<a:emoji_766588:1481865920258379797>';

        // 🟢 ضريبة الروبوكس
        if (isRobux) {
            const askFor30 = Math.ceil(amount / 0.70);
            const receive30 = Math.floor(amount * 0.70);
            
            const askFor40 = Math.ceil(amount / 0.60);
            const receive40 = Math.floor(amount * 0.60);

            const robuxEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setAuthor({ name: 'ضريبة الروبوكس', iconURL: message.author.displayAvatarURL() })
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: `${robuxEmoji} المبلغ :`, value: `**${amount.toLocaleString()}**`, inline: false },
                    
                    { name: `${robuxEmoji} المطلوب مع الضريبة (جيم باس 30%) :`, value: `**${askFor30.toLocaleString()}**`, inline: false },
                    { name: `${robuxEmoji} المبلغ الذي سيصل بدون ضريبه :`, value: `**${receive30.toLocaleString()}**`, inline: false },
                    { name: `${robuxEmoji} اضغط للنسخ :`, value: `${askFor30}`, inline: false },

                    { name: `${robuxEmoji} المطلوب مع الضريبة (ماب التبرع 40%) :`, value: `**${askFor40.toLocaleString()}**`, inline: false },
                    { name: `${robuxEmoji} المبلغ الذي سيصل بدون ضريبه :`, value: `**${receive40.toLocaleString()}**`, inline: false },
                    { name: `${robuxEmoji} اضغط للنسخ :`, value: `${askFor40}`, inline: false }
                )
                .setFooter({ text: 'مدعوم من الإمبراطور بوت', iconURL: client.user.displayAvatarURL() });

            return message.reply({ embeds: [robuxEmbed] }).catch(() => {});
        }

        // 🔵 ضريبة الكريدت
        if (isCredit) {
            const askForCredit = Math.floor(amount * (20 / 19)) + 1;
            const receiveCredit = Math.floor(amount * 0.95);

            const creditEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setAuthor({ name: 'ضريبة الكريدت', iconURL: message.author.displayAvatarURL() })
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: `${creditEmoji} المبلغ :`, value: `**${amount.toLocaleString()}**`, inline: false },
                    { name: `${creditEmoji} المطلوب مع الضريبة :`, value: `**${askForCredit.toLocaleString()}**`, inline: false },
                    { name: `${creditEmoji} المبلغ الذي سيصل بدون ضريبه :`, value: `**${receiveCredit.toLocaleString()}**`, inline: false },
                    { name: `${creditEmoji} اضغط للنسخ :`, value: `${askForCredit}`, inline: false }
                )
                .setFooter({ text: 'مدعوم من الإمبراطور بوت', iconURL: client.user.displayAvatarURL() });

            return message.reply({ embeds: [creditEmbed] }).catch(() => {});
        }
    });
};
                
