// =========================================================================================================
// 📢 أمر الاستدعاء الإداري الفخم (COME COMMAND - LUXURIOUS BOX EDITION)
// ---------------------------------------------------------------------------------------------------------
// المسار: commands/admin/come.js
// الوظيفة: إرسال نداء استدعاء داخل مربع رمادي فخم مطابق للتصميم المطلوب.
// =========================================================================================================

const discordLibrary = require('discord.js');
const { PermissionFlagsBits } = discordLibrary;

module.exports = {
    name: 'come',
    aliases: ['تعال', 'استدعاء'],

    async execute(incomingMessageObject, commandArgumentsArray, discordClientObject, activeGuildConfigurationDocument) {
        
        // =========================================================================================================
        // 👮 1. فحص الرتب المسموح لها (من مصفوفة الداشبورد)
        // =========================================================================================================
        const dashboardConfiguredComeRolesArray = activeGuildConfigurationDocument.commands.comeAllowedRoles || [];
        let doesMemberHavePermissionToUseComeBoolean = false;
        
        const executingMemberPermissionsObject = incomingMessageObject.member.permissions;
        const executingMemberRolesCacheObject = incomingMessageObject.member.roles.cache;

        if (executingMemberPermissionsObject.has(PermissionFlagsBits.Administrator) === true) {
            doesMemberHavePermissionToUseComeBoolean = true;
        } else {
            for (let roleIndex = 0; roleIndex < dashboardConfiguredComeRolesArray.length; roleIndex++) {
                const currentRoleIdToCheckString = dashboardConfiguredComeRolesArray[roleIndex];
                if (currentRoleIdToCheckString && executingMemberRolesCacheObject.has(currentRoleIdToCheckString)) {
                    doesMemberHavePermissionToUseComeBoolean = true; 
                    break;
                }
            }
        }

        if (doesMemberHavePermissionToUseComeBoolean === false) {
            try { 
                return await incomingMessageObject.reply('**❌ لا تمتلك صلاحية لاستخدام أمر الاستدعاء.**'); 
            } catch (replyException) { return; }
        }

        // =========================================================================================================
        // 🎯 2. تحديد العضو المستهدف وتجهيز المربع
        // =========================================================================================================
        let targetSummonedMemberObject = incomingMessageObject.mentions.members.first();
        if (!targetSummonedMemberObject && commandArgumentsArray[0]) {
            targetSummonedMemberObject = incomingMessageObject.guild.members.cache.get(commandArgumentsArray[0]);
        }

        if (!targetSummonedMemberObject) {
            try { 
                return await incomingMessageObject.reply('**⚠️ الرجاء عمل منشن للعضو أو إدخال الأيدي الخاص به.**'); 
            } catch (replyException) { return; }
        }

        const currentChannelDirectUrlString = `https://discord.com/channels/${incomingMessageObject.guild.id}/${incomingMessageObject.channel.id}`;
        
        // بناء تصميم "المربع الفخم" المطابق للصورة تماماً باستخدام علامات الكود (```)
        let luxuriousBoxedSummonMessageString = `**استدعاء عاجل! 🚨**\n`;
        luxuriousBoxedSummonMessageString += `\`\`\`text\n`;
        luxuriousBoxedSummonMessageString += `-------------------------------------------\n`;
        luxuriousBoxedSummonMessageString += `🚨         تم طلب استدعاءك فوراً          🚨\n`;
        luxuriousBoxedSummonMessageString += `-------------------------------------------\n`;
        luxuriousBoxedSummonMessageString += `👋 مرحباً ${targetSummonedMemberObject.user.username}، طاقم الإدارة يطلب حضورك.\n\n`;
        luxuriousBoxedSummonMessageString += `📍 المكان: #${incomingMessageObject.channel.name}\n`;
        luxuriousBoxedSummonMessageString += `🔗 الرابط المباشر للروم موجود بالأسفل.\n`;
        luxuriousBoxedSummonMessageString += `-------------------------------------------\n`;
        luxuriousBoxedSummonMessageString += `\`\`\``; // إغلاق المربع
        luxuriousBoxedSummonMessageString += `**رابط الروم:** [اضغط هنا للدخول](${currentChannelDirectUrlString})`;

        // =========================================================================================================
        // 📩 3. إرسال الرسالة
        // =========================================================================================================
        try { 
            await incomingMessageObject.delete(); 
        } catch (deleteCommandException) {}

        try {
            await targetSummonedMemberObject.send({ content: luxuriousBoxedSummonMessageString });
            await incomingMessageObject.channel.send(`**✅ تم إرسال الاستدعاء في الخاص للعضو: <@${targetSummonedMemberObject.id}>**`);
        } catch (directMessageClosedException) {
            await incomingMessageObject.channel.send(`**❌ العضو يغلق الرسائل الخاصة، هذا نداء له هنا:**\n<@${targetSummonedMemberObject.id}>\n${luxuriousBoxedSummonMessageString}`);
        }
    }
};
