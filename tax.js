const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
    client.on('messageCreate', async message => {
        // عشان البوت ميردش على نفسه أو على بوتات تانية
        if (message.author.bot) return;

        // 🔴 حط أيدي الروم بتاعت الضريبة هنا
        const taxChannelId = '1468625417563803772';

        const content = message.content.toLowerCase().trim();
        const isTaxChannel = message.channel.id === taxChannelId;

        // تحديد نوع الطلب: روبوكس ولا كريدت؟
        const isRobux = content.startsWith('r ') || content.startsWith('!taxr ');
        // الكريدت بيشتغل لو كتب !tax أو لو كتب الرقم علطول جوه روم الضريبة
        const isCredit = content.startsWith('!tax ') || (isTaxChannel && !isRobux);

        // لو الرسالة مش أمر ضريبة ومش في روم الضريبة، نتجاهلها
        if (!isRobux && !isCredit && !isTaxChannel) return;

        // استخراج الرقم من الرسالة
        let rawAmount = content.replace('!taxr', '').replace('!tax', '').replace('r', '').trim();

        // دالة عشان تحول الحروف لأصفار (k, m, b)
        const parseAmount = (text) => {
            let multiplier = 1;
            if (text.endsWith('k')) { multiplier = 1000; text = text.slice(0, -1); }
            else if (text.endsWith('m')) { multiplier = 1000000; text = text.slice(0, -1); }
            else if (text.endsWith('b')) { multiplier = 1000000000; text = text.slice(0, -1); }
            
            const num = parseFloat(text);
            return isNaN(num) ? null : Math.floor(num * multiplier);
        };

        const amount = parseAmount(rawAmount);

        // لو الرقم غلط أو مفيش رقم
        if (!amount || amount <= 0) {
            if (content.startsWith('!tax') || content.startsWith('r') || isTaxChannel) {
                return message.reply({ content: '❗ **يرجى إدخال رقم صحيح**' }).catch(() => {});
            }
            return;
        }

        // 🟢 حساب ضريبة الروبوكس
        if (isRobux) {
            // ضريبة الجيم باس (30%) 
            const tax30 = Math.floor(amount / 0.70);
            // ضريبة ماب التبرع (40%) 
            const tax40 = Math.floor(amount / 0.60);

            const robuxEmbed = new EmbedBuilder()
                .setColor('#2b2d31') // لون الديسكورد الدارك مود
                .setAuthor({ name: 'ضريبة الروبوكس', iconURL: message.author.displayAvatarURL() })
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '⚙️ المبلغ:', value: `**${amount.toLocaleString()}**`, inline: false },
                    { name: '🪄 عشان يوصلك صافي من (الجيم باس 30%):', value: `**${tax30.toLocaleString()}**`, inline: false },
                    { name: '🔹 اضغط للنسخ:', value: `${tax30}`, inline: false },
                    { name: '🗺️ عشان يوصلك صافي من (ماب التبرع 40%):', value: `**${tax40.toLocaleString()}**`, inline: false },
                    { name: '🔹 اضغط للنسخ:', value: `${tax40}`, inline: false }
                )
                .setFooter({ text: 'مدعوم من الإمبراطور بوت', iconURL: client.user.displayAvatarURL() });

            return message.reply({ embeds: [robuxEmbed] }).catch(() => {});
        }

        // 🔵 حساب ضريبة الكريدت (بروبوت 5%)
        if (isCredit) {
            // قانون ضريبة بروبوت الدقيق جداً
            const taxCredit = Math.floor(amount * (20 / 19)) + 1;

            const creditEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setAuthor({ name: 'ضريبة الكريدت', iconURL: message.author.displayAvatarURL() })
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '⚙️ المبلغ:', value: `**${amount.toLocaleString()}**`, inline: false },
                    { name: '🪄 المبلغ مع الضريبة:', value: `**${taxCredit.toLocaleString()}**`, inline: false },
                    { name: '🔹 اضغط للنسخ:', value: `${taxCredit}`, inline: false }
                )
                .setFooter({ text: 'مدعوم من الإمبراطور بوت', iconURL: client.user.displayAvatarURL() });

            return message.reply({ embeds: [creditEmbed] }).catch(() => {});
        }
    });
};

