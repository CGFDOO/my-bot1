const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
    client.on('messageCreate', async message => {
        // عشان البوت ميردش على نفسه أو على بوتات تانية
        if (message.author.bot) return;

        // 🔴 حط أيدي الروم بتاعت الضريبة هنا
        const taxChannelId = 'حط_أيدي_الروم_هنا';

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
            // عشان يوصلك المبلغ ده صافي (تطلب كام؟)
            const askFor30 = Math.floor(amount / 0.70);
            const askFor40 = Math.floor(amount / 0.60);

            // لو حد دفع المبلغ ده (هيوصلك كام؟)
            const receive30 = Math.floor(amount * 0.70);
            const receive40 = Math.floor(amount * 0.60);

            const robuxEmbed = new EmbedBuilder()
                .setColor('#2b2d31') // لون الديسكورد الدارك مود
                .setAuthor({ name: 'ضريبة الروبوكس', iconURL: message.author.displayAvatarURL() })
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '⚙️ المبلغ المكتوب:', value: `**${amount.toLocaleString()}**`, inline: false },
                    { name: 'ــــــــــــــــــــــــــــــــــــــــــــــــ', value: '\u200B', inline: false },
                    { name: '🛒 جيم باس (ضريبة 30%):', value: '\u200B', inline: false },
                    { name: '🪄 عشان يوصلك صافي تطلب:', value: `**${askFor30.toLocaleString()}**`, inline: true },
                    { name: '🔹 اضغط للنسخ:', value: `${askFor30}`, inline: true },
                    { name: '📥 لو شخص دفع المبلغ هيوصلك:', value: `**${receive30.toLocaleString()}**`, inline: false },
                    { name: 'ــــــــــــــــــــــــــــــــــــــــــــــــ', value: '\u200B', inline: false },
                    { name: '🗺️ ماب التبرع (ضريبة 40%):', value: '\u200B', inline: false },
                    { name: '🪄 عشان يوصلك صافي تطلب:', value: `**${askFor40.toLocaleString()}**`, inline: true },
                    { name: '🔹 اضغط للنسخ:', value: `${askFor40}`, inline: true },
                    { name: '📥 لو شخص دفع المبلغ هيوصلك:', value: `**${receive40.toLocaleString()}**`, inline: false }
                )
                .setFooter({ text: 'مدعوم من الإمبراطور بوت', iconURL: client.user.displayAvatarURL() });

            return message.reply({ embeds: [robuxEmbed] }).catch(() => {});
        }

        // 🔵 حساب ضريبة الكريدت (بروبوت 5%)
        if (isCredit) {
            // قانون ضريبة بروبوت (عشان يوصلك المبلغ صافي)
            const askForCredit = Math.floor(amount * (20 / 19)) + 1;
            
            // لو حد حول المبلغ ده (هيوصلك كام بعد خصم 5%)
            const receiveCredit = Math.floor(amount * 0.95);

            const creditEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setAuthor({ name: 'ضريبة الكريدت', iconURL: message.author.displayAvatarURL() })
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '⚙️ المبلغ المكتوب:', value: `**${amount.toLocaleString()}**`, inline: false },
                    { name: 'ــــــــــــــــــــــــــــــــــــــــــــــــ', value: '\u200B', inline: false },
                    { name: '🪄 عشان يوصلك صافي تطلب:', value: `**${askForCredit.toLocaleString()}**`, inline: true },
                    { name: '🔹 اضغط للنسخ:', value: `${askForCredit}`, inline: true },
                    { name: '📥 لو شخص حول المبلغ هيوصلك:', value: `**${receiveCredit.toLocaleString()}**`, inline: false }
                )
                .setFooter({ text: 'مدعوم من الإمبراطور بوت', iconURL: client.user.displayAvatarURL() });

            return message.reply({ embeds: [creditEmbed] }).catch(() => {});
        }
    });
};

