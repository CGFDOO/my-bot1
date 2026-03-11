module.exports = {
    name: 'credit',
    aliases: ['c', 'credits', 'كردت'],
    async execute(message, args) {
        const target = message.mentions.users.first() || message.author;
        if (target.bot) return message.reply("🤖 البوتات لا تملك رصيد!");

        // مؤقتاً بنجيب الرصيد 0 لحد ما نعمل المودل بتاعه
        const userBalance = 0; 

        if (target.id === message.author.id) {
            message.reply(`💳 رصيدك الحالي هو: **$${userBalance}**`);
        } else {
            message.reply(`💳 رصيد **${target.username}** الحالي هو: **$${userBalance}**`);
        }
    }
};
