// =========================================================================================================
// 📋 أمر عرض سجل التحذيرات (VIEW WARNINGS COMMAND - ENTERPRISE EDITION)
// ---------------------------------------------------------------------------------------------------------
// المسار: commands/admin/warnings.js
// الوظيفة: استدعاء سجل التحذيرات الخاص بعضو معين من قاعدة البيانات وعرضه في إيمبد منسق.
// =========================================================================================================

const discordLibrary = require('discord.js');
const { PermissionFlagsBits, EmbedBuilder } = discordLibrary;

module.exports = {
    name: 'warnings',
    aliases: ['تحذيرات', 'سجل_التحذيرات', 'warns'],

    async execute(incomingMessageObject, commandArgumentsArray, discordClientObject, activeGuildConfigurationDocumentObject) {
        
        // =========================================================================================================
        // 🛡️ 1. فحص الصلاحيات
        // =========================================================================================================
        const executingMemberPermissionsObject = incomingMessageObject.member.permissions;
        
        if (executingMemberPermissionsObject.has(PermissionFlagsBits.ModerateMembers) === false && executingMemberPermissionsObject.has(PermissionFlagsBits.Administrator) === false) {
            try { 
                return await incomingMessageObject.reply({ content: '**❌ لا تمتلك صلاحية (Moderate Members) لعرض سجل التحذيرات.**' }); 
            } catch (replyExceptionError) { return; }
        }

        // =========================================================================================================
        // 🎯 2. تحديد العضو المستهدف
        // =========================================================================================================
        let targetMemberToCheckObject = incomingMessageObject.mentions.members.first();
        
        if (targetMemberToCheckObject === undefined && commandArgumentsArray[0] !== undefined) {
            try { 
                targetMemberToCheckObject = await incomingMessageObject.guild.members.fetch(commandArgumentsArray[0]); 
            } catch (fetchExceptionError) {}
        }

        if (targetMemberToCheckObject === undefined || targetMemberToCheckObject === null) {
            try { 
                return await incomingMessageObject.reply({ content: '**⚠️ الرجاء عمل منشن للعضو أو إدخال الأيدي الخاص به لرؤية سجل تحذيراته.**' }); 
            } catch (replyExceptionError) { return; }
        }

        // =========================================================================================================
        // 🗄️ 3. جلب السجل من قاعدة البيانات وبناء الإيمبد
        // =========================================================================================================
        const targetMemberDiscordIdString = targetMemberToCheckObject.id;
        const currentGuildWarningsConfigurationObject = activeGuildConfigurationDocumentObject.warnings;
        
        const targetUserWarningsRecordsArray = currentGuildWarningsConfigurationObject.userRecords.get(targetMemberDiscordIdString) || [];

        if (targetUserWarningsRecordsArray.length === 0) {
            try { 
                return await incomingMessageObject.reply({ content: `**✅ العضو <@${targetMemberDiscordIdString}> ليس لديه أي تحذيرات سابقة. سجله نظيف.**` }); 
            } catch (replyExceptionError) { return; }
        }

        const userWarningsLogEmbedObject = new EmbedBuilder();
        userWarningsLogEmbedObject.setTitle(`📋 سجل التحذيرات الخاص بـ ${targetMemberToCheckObject.user.username}`);
        userWarningsLogEmbedObject.setDescription(`إجمالي التحذيرات الحالية: \`${targetUserWarningsRecordsArray.length}\` تحذيرات.`);
        userWarningsLogEmbedObject.setColor('#fee75c');
        userWarningsLogEmbedObject.setThumbnail(targetMemberToCheckObject.user.displayAvatarURL({ dynamic: true }));

        // المرور على مصفوفة التحذيرات لترتيبها
        for (let recordIndex = 0; recordIndex < targetUserWarningsRecordsArray.length; recordIndex++) {
            const currentWarningEntryObject = targetUserWarningsRecordsArray[recordIndex];
            
            // تحويل الـ Timestamp إلى وقت مقروء في ديسكورد
            const formattedDiscordTimestampString = `<t:${Math.floor(currentWarningEntryObject.timestamp / 1000)}:R>`;
            
            let warningFieldContentString = `**السبب:** ${currentWarningEntryObject.reason}\n`;
            warningFieldContentString += `**بواسطة:** <@${currentWarningEntryObject.moderatorId}>\n`;
            warningFieldContentString += `**التاريخ:** ${formattedDiscordTimestampString}`;
            
            userWarningsLogEmbedObject.addFields({ 
                name: `تحذير رقم #${recordIndex + 1}`, 
                value: warningFieldContentString, 
                inline: false 
            });
        }

        try {
            await incomingMessageObject.reply({ embeds: [userWarningsLogEmbedObject] });
        } catch (replyExecutionExceptionError) {
            console.error('[WARNINGS COMMAND ERROR]', replyExecutionExceptionError);
        }
    }
};
