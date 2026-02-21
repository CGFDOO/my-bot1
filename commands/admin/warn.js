// =========================================================================================================
// ⚠️ أمر التحذير ونظام العقوبات التلقائي (WARN COMMAND & AUTO-PUNISHMENT SYSTEM)
// ---------------------------------------------------------------------------------------------------------
// المسار: commands/admin/warn.js
// الوظيفة: إعطاء تحذير للعضو، حفظه في قاعدة البيانات، وتطبيق العقوبة التلقائية (Ban, Kick, Timeout) 
// إذا تجاوز العضو الحد الأقصى للتحذيرات المحدد في الداشبورد. (كود مفرود بالكامل بدون اختصارات).
// =========================================================================================================

const discordLibrary = require('discord.js');
const { PermissionFlagsBits, EmbedBuilder } = discordLibrary;

module.exports = {
    name: 'warn',
    aliases: ['تحذير', 'انذار'],

    async execute(incomingMessageObject, commandArgumentsArray, discordClientObject, activeGuildConfigurationDocumentObject) {
        
        // =========================================================================================================
        // 🛡️ 1. فحص الصلاحيات (Permissions Validation)
        // =========================================================================================================
        const executingMemberPermissionsObject = incomingMessageObject.member.permissions;
        
        if (executingMemberPermissionsObject.has(PermissionFlagsBits.ModerateMembers) === false && executingMemberPermissionsObject.has(PermissionFlagsBits.Administrator) === false) {
            try { 
                return await incomingMessageObject.reply({ content: '**❌ لا تمتلك صلاحية (Moderate Members) لاستخدام أمر التحذير.**' }); 
            } catch (replyExceptionError) { return; }
        }

        // =========================================================================================================
        // 🎯 2. تحديد العضو المستهدف (Target Member Extraction)
        // =========================================================================================================
        let targetMemberToWarnObject = incomingMessageObject.mentions.members.first();
        
        if (targetMemberToWarnObject === undefined && commandArgumentsArray[0] !== undefined) {
            try { 
                targetMemberToWarnObject = await incomingMessageObject.guild.members.fetch(commandArgumentsArray[0]); 
            } catch (fetchExceptionError) {}
        }

        if (targetMemberToWarnObject === undefined || targetMemberToWarnObject === null) {
            try { 
                return await incomingMessageObject.reply({ content: '**⚠️ الرجاء عمل منشن للعضو أو إدخال الأيدي الخاص به.**' }); 
            } catch (replyExceptionError) { return; }
        }

        if (targetMemberToWarnObject.user.bot === true) {
            try { 
                return await incomingMessageObject.reply({ content: '**❌ لا يمكنك إعطاء تحذير لبوت (Bot).**' }); 
            } catch (replyExceptionError) { return; }
        }

        // فحص تسلسل الرتب
        if (targetMemberToWarnObject.roles.highest.position >= incomingMessageObject.member.roles.highest.position && incomingMessageObject.member.id !== incomingMessageObject.guild.ownerId) {
            try { 
                return await incomingMessageObject.reply({ content: '**❌ لا يمكنك تحذير هذا العضو لأن رتبته أعلى من رتبتك أو تساويها.**' }); 
            } catch (replyExceptionError) { return; }
        }

        // =========================================================================================================
        // 📝 3. استخراج سبب التحذير (Reason Extraction)
        // =========================================================================================================
        const providedWarningReasonArray = commandArgumentsArray.slice(1);
        let compiledWarningReasonString = 'لم يتم تحديد سبب للتحذير.';
        
        if (providedWarningReasonArray.length > 0) {
            compiledWarningReasonString = providedWarningReasonArray.join(' ');
        }

        // =========================================================================================================
        // 🗄️ 4. تسجيل التحذير في قاعدة البيانات (Saving Warning to Database)
        // =========================================================================================================
        const targetMemberDiscordIdString = targetMemberToWarnObject.id;
        const currentGuildWarningsConfigurationObject = activeGuildConfigurationDocumentObject.warnings;
        
        // جلب سجلات التحذيرات من الـ Map في الداتابيز أو إنشاء مصفوفة جديدة إذا لم تكن موجودة
        let targetUserWarningsRecordsArray = currentGuildWarningsConfigurationObject.userRecords.get(targetMemberDiscordIdString) || [];
        
        // إنشاء كائن التحذير الجديد
        const newWarningEntryObject = {
            reason: compiledWarningReasonString,
            moderatorId: incomingMessageObject.author.id,
            timestamp: Date.now()
        };

        targetUserWarningsRecordsArray.push(newWarningEntryObject);
        
        // تحديث السجل في الداتابيز
        currentGuildWarningsConfigurationObject.userRecords.set(targetMemberDiscordIdString, targetUserWarningsRecordsArray);
        
        try {
            await activeGuildConfigurationDocumentObject.save();
        } catch (databaseSaveExceptionError) {
            console.error('[WARN COMMAND ERROR] Failed to save warning to database.', databaseSaveExceptionError);
            try { 
                return await incomingMessageObject.reply({ content: '**❌ حدث خطأ داخلي أثناء محاولة حفظ التحذير في قاعدة البيانات.**' }); 
            } catch (e) { return; }
        }

        const currentTotalWarningsNumber = targetUserWarningsRecordsArray.length;
        const dashboardConfiguredMaxWarningsNumber = currentGuildWarningsConfigurationObject.maxWarnings || 3;

        // =========================================================================================================
        // 📩 5. إرسال الإشعار وتطبيق المربع الفخم (Box Formatting)
        // =========================================================================================================
        
        let luxuriousBoxedWarningMessageString = `**⚠️ إشعار تحذير إداري!**\n`;
        luxuriousBoxedWarningMessageString += `\`\`\`text\n`;
        luxuriousBoxedWarningMessageString += `-------------------------------------------\n`;
        luxuriousBoxedWarningMessageString += `⚠️         لقد تلقيت تحذيراً إدارياً       ⚠️\n`;
        luxuriousBoxedWarningMessageString += `-------------------------------------------\n`;
        luxuriousBoxedWarningMessageString += `السيرفر: ${incomingMessageObject.guild.name}\n`;
        luxuriousBoxedWarningMessageString += `السبب: ${compiledWarningReasonString}\n`;
        luxuriousBoxedWarningMessageString += `تحذير رقم: [ ${currentTotalWarningsNumber} / ${dashboardConfiguredMaxWarningsNumber} ]\n`;
        luxuriousBoxedWarningMessageString += `بواسطة: ${incomingMessageObject.author.tag}\n`;
        luxuriousBoxedWarningMessageString += `-------------------------------------------\n`;
        luxuriousBoxedWarningMessageString += `\`\`\``;

        try {
            await targetMemberToWarnObject.send({ content: luxuriousBoxedWarningMessageString });
        } catch (directMessageClosedExceptionError) {
            // تجاهل الخطأ بصمت إذا كان العضو يغلق الخاص
        }

        const successWarningEmbedObject = new EmbedBuilder();
        successWarningEmbedObject.setTitle('⚠️ تم تسجيل التحذير بنجاح');
        successWarningEmbedObject.setDescription(`تم تحذير العضو <@${targetMemberDiscordIdString}>.\n**السبب:** ${compiledWarningReasonString}`);
        successWarningEmbedObject.addFields({ name: 'عدد تحذيراته الحالية:', value: `\`${currentTotalWarningsNumber}\` من أصل \`${dashboardConfiguredMaxWarningsNumber}\`` });
        successWarningEmbedObject.setColor('#fee75c'); // أصفر لون التحذير
        
        try {
            await incomingMessageObject.reply({ embeds: [successWarningEmbedObject] });
        } catch (replyExceptionError) {}

        // =========================================================================================================
        // 🔨 6. نظام العقاب التلقائي (Auto-Punishment Engine)
        // =========================================================================================================
        
        if (currentTotalWarningsNumber >= dashboardConfiguredMaxWarningsNumber) {
            
            const dashboardConfiguredAutoActionString = currentGuildWarningsConfigurationObject.autoAction || 'timeout';
            const executionReasonString = `تجاوز الحد الأقصى للتحذيرات (${dashboardConfiguredMaxWarningsNumber} تحذيرات).`;

            try {
                if (dashboardConfiguredAutoActionString === 'ban') {
                    if (targetMemberToWarnObject.bannable === true) {
                        await targetMemberToWarnObject.ban({ reason: executionReasonString });
                        await incomingMessageObject.channel.send(`**🚨 تم تطبيق العقوبة التلقائية (حظر / Ban) على <@${targetMemberDiscordIdString}> لتجاوزه الحد الأقصى للتحذيرات.**`);
                    }
                } 
                else if (dashboardConfiguredAutoActionString === 'kick') {
                    if (targetMemberToWarnObject.kickable === true) {
                        await targetMemberToWarnObject.kick(executionReasonString);
                        await incomingMessageObject.channel.send(`**🚨 تم تطبيق العقوبة التلقائية (طرد / Kick) على <@${targetMemberDiscordIdString}> لتجاوزه الحد الأقصى للتحذيرات.**`);
                    }
                } 
                else if (dashboardConfiguredAutoActionString === 'timeout') {
                    if (targetMemberToWarnObject.moderatable === true) {
                        // تايم أوت لمدة 24 ساعة كعقوبة افتراضية
                        const twentyFourHoursInMilliseconds = 24 * 60 * 60 * 1000;
                        await targetMemberToWarnObject.timeout(twentyFourHoursInMilliseconds, executionReasonString);
                        await incomingMessageObject.channel.send(`**🚨 تم تطبيق العقوبة التلقائية (إسكات / Timeout لمدة 24 ساعة) على <@${targetMemberDiscordIdString}> لتجاوزه الحد الأقصى للتحذيرات.**`);
                    }
                }
                
                // تصفير التحذيرات بعد تطبيق العقوبة القسوى لكي لا يُعاقب العضو مراراً وتكراراً
                currentGuildWarningsConfigurationObject.userRecords.set(targetMemberDiscordIdString, []);
                await activeGuildConfigurationDocumentObject.save();

            } catch (autoPunishmentExceptionError) {
                console.error('[AUTO PUNISHMENT ERROR]', autoPunishmentExceptionError);
                await incomingMessageObject.channel.send('**❌ حاولت تطبيق العقوبة التلقائية ولكن حدث خطأ (قد يكون بسبب صلاحيات الرتب).**');
            }
        }
    }
};
