const { Events } = require('discord.js');
const GuildSettings = require('../models/GuildSettings'); 

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        try {
            // 1. البوت بيروح يفتح الخزنة يشوف إعدادات الترحيب للسيرفر ده
            const config = await GuildSettings.findOne({ guildId: member.guild.id });

            // 2. لو مفيش إعدادات، أو نظام الترحيب مقفول من الداشبورد، البوت بيكمل نوم
            if (!config || !config.welcomeSystem || !config.welcomeSystem.welcomeEnabled) return;

            // 3. هل الإمبراطور حدد روم للترحيب؟
            const channelId = config.welcomeSystem.welcomeChannelId;
            if (!channelId) return;

            const welcomeChannel = member.guild.channels.cache.get(channelId);
            if (!welcomeChannel) return;

            // 4. تجهيز الرسالة (تبديل الأكواد اللي في الداشبورد بالبيانات الحقيقية)
            let welcomeMsg = config.welcomeSystem.welcomeMessage || 'مرحباً بك {user} في سيرفر {server}. أنت العضو رقم {memberCount} !';

            welcomeMsg = welcomeMsg
                .replace(/{user}/g, `<@${member.id}>`)        // منشن العضو
                .replace(/{server}/g, member.guild.name)      // اسم السيرفر
                .replace(/{memberCount}/g, member.guild.memberCount); // رقم العضو

            // 5. هل في رابط صورة خلفية محطوط في الداشبورد؟
            const backgroundImageUrl = config.welcomeSystem.backgroundUrl;

            // 6. إرسال الترحيب للروم!
            if (backgroundImageUrl) {
                // لو في صورة هيبعتها مع الرسالة
                await welcomeChannel.send({ content: welcomeMsg, files: [backgroundImageUrl] }).catch(() => {});
            } else {
                // لو مفيش صورة هيبعت الرسالة بس
                await welcomeChannel.send({ content: welcomeMsg }).catch(() => {});
            }

        } catch (error) {
            console.error("🔴 [WELCOME ERROR] حدث خطأ في نظام الترحيب:", error);
        }
    },
};
