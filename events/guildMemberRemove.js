const { Events } = require('discord.js');
const GuildSettings = require('../models/GuildSettings'); 

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member, client) {
        try {
            const config = await GuildSettings.findOne({ guildId: member.guild.id });
            
            // لو نظام المغادرة مقفول، البوت هيتجاهل
            if (!config || !config.welcomeSystem || !config.welcomeSystem.leaveEnabled) return;

            const channelId = config.welcomeSystem.leaveChannelId;
            if (!channelId) return;

            const leaveChannel = member.guild.channels.cache.get(channelId);
            if (!leaveChannel) return;

            // استبدال الأكواد (هنا بنكتب اسم العضو بخط عريض بدل المنشن لأنه خلاص خرج)
            let leaveMsg = config.welcomeSystem.leaveMessage || 'لقد غادر {user} السيرفر 😢';
            leaveMsg = leaveMsg
                .replace(/{user}/g, `**${member.user.username}**`) 
                .replace(/{server}/g, member.guild.name)
                .replace(/{memberCount}/g, member.guild.memberCount);

            // إرسال رسالة الوداع
            await leaveChannel.send({ content: leaveMsg }).catch(() => {});

        } catch (error) {
            console.error("🔴 [LEAVE ERROR] حدث خطأ في نظام المغادرة:", error);
        }
    }
};
