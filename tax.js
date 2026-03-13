const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
    client.on('messageCreate', async message => {
        // تجاهل رسائل البوتات
        if (message.author.bot) return;

        // 🔴 ضع أيدي روم الضريبة هنا
        const taxChannelId = 'حط_أيدي_الروم_هنا';

        const content = message.content.toLowerCase().trim();
        const isTaxChannel = message.channel.id === taxChannelId;

        // تحديد نوع الطلب
        const isRobux = content.startsWith('r ') || content.startsWith('!taxr ');
        const isCredit = content.startsWith('!tax ') || (isTaxChannel && !isRobux);

        // تجاهل الرسائل التي ليست أوامر ضريبة أو خارج الروم المخصص
        if (!isRobux && !isCredit && !isTaxChannel) return;

        // استخراج الرقم
        let rawAmount = content.replace('!taxr', '').replace('!tax', '').replace('r', '').trim();

        // تحويل الحروف إلى أصفار
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

        // 🟢 ضريبة الروبوكس
        if (isRobux) {
            const askFor30 = Math.floor(amount / 0.70);
            const askFor40 = Math.floor(amount / 0.60);
            const receive30 = Math.floor(amount * 0.70);
            const receive40 = Math.floor(amount * 0.60);

            const robuxEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setAuthor({ name: 'ضريبة الروبوكس', iconURL: message.author.displayAvatarURL() })
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '⚙️ المبلغ:', value: `**${amount.toLocaleString()}**`, inline: false },
                    { 
                        name: '🛒 جيم باس (30%):', 
                        value: `**المطلوب:** ${askFor30.toLocaleString()}\n**الصافي لك:** ${receive30.toLocaleString()}\n**للنسخ:** \`${askFor30}\``, 
                        inline: false 
                    },
                    { 
                        name: '🗺️ ماب التبرع (40%):', 
                        value: `**المطلوب:** ${askFor40.toLocaleString()}\n**الصافي لك:** ${receive40.toLocaleString()}\n**للنسخ:** \`${askFor40}\``, 
                        inline: false 
                    }
                )
                .setFooter({ text: 'Tax System', iconURL: client.user.displayAvatarURL() });

            return message.reply({ embeds: [robuxEmbed] }).catch(() => {});
        }

        // 🔵 ضريبة الكريدت (5%)
        if (isCredit) {
            const askForCredit = Math.floor(amount * (20 / 19)) + 1;
            const receiveCredit = Math.floor(amount * 0.95);

            const creditEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setAuthor({ name: 'ضريبة الكريدت', iconURL: message.author.displayAvatarURL() })
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '⚙️ المبلغ:', value: `**${amount.toLocaleString()}**`, inline: false },
                    { name: '🪄 المطلوب مع الضريبة:', value: `**${askForCredit.toLocaleString()}**`, inline: true },
                    { name: '📥 الصافي عند التحويل:', value: `**${receiveCredit.toLocaleString()}**`, inline: true },
                    { name: '🔹 اضغط للنسخ:', value: `${askForCredit}`, inline: false }
                )
                .setFooter({ text: 'Tax System', iconURL: client.user.displayAvatarURL() });

            return message.reply({ embeds: [creditEmbed] }).catch(() => {});
        }
    });
};
