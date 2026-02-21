// =========================================================================================================
// 💬 مراقب الرسائل الشامل (MESSAGE CREATE EVENT - ENTERPRISE EDITION)
// ---------------------------------------------------------------------------------------------------------
// هذا الحدث يستمع لجميع الرسائل في جميع السيرفرات المتواجد بها البوت.
// وظيفته:
// 1. فلترة الرسائل (تجاهل البوتات ورسائل الخاص).
// 2. جلب إعدادات السيرفر (GuildConfig) بشكل معزول ومستقل.
// 3. التحقق من الردود التلقائية (Auto Responders) وتنفيذها.
// 4. استخراج الأوامر بناءً على البريفكس الديناميكي وتنفيذها من الذاكرة (RAM).
// =========================================================================================================

// استدعاء الموديل الخاص بقاعدة البيانات لجلب إعدادات السيرفر
const GuildConfigurationDatabaseModel = require('../models/GuildConfig');

module.exports = {
    // اسم الحدث كما هو معروف في مكتبة ديسكورد
    name: 'messageCreate',
    
    // هل يعمل هذا الحدث مرة واحدة فقط؟ (لا، نريده أن يعمل مع كل رسالة)
    once: false,

    // الدالة الرئيسية التي يتم تنفيذها عند استلام أي رسالة
    async execute(incomingMessageObject, discordClientObject) {
        
        // =========================================================================================================
        // 🛡️ 1. فحوصات الأمان الأساسية (Primary Security & Validation Checks)
        // =========================================================================================================
        
        // التحقق مما إذا كان مرسل الرسالة هو بوت (لمنع الـ Infinite Loops ورد البوتات على بعضها)
        const isMessageAuthorABotBoolean = incomingMessageObject.author.bot;
        if (isMessageAuthorABotBoolean === true) {
            return; // إنهاء التنفيذ فوراً
        }

        // التحقق مما إذا كانت الرسالة قد أُرسلت في رسائل خاصة (DMs) وليس داخل سيرفر
        const targetDiscordGuildObject = incomingMessageObject.guild;
        if (!targetDiscordGuildObject) {
            return; // إنهاء التنفيذ لأن نظامنا يعتمد على إعدادات السيرفرات
        }

        // =========================================================================================================
        // 🗄️ 2. الاتصال بقاعدة البيانات وجلب الإعدادات (Database Fetching & Isolation)
        // =========================================================================================================
        
        const currentGuildDiscordIdString = targetDiscordGuildObject.id;
        let activeGuildConfigurationDocument = null;

        try {
            // البحث عن إعدادات السيرفر الحالي فقط (عزل تام للبيانات)
            activeGuildConfigurationDocument = await GuildConfigurationDatabaseModel.findOne({ 
                guildId: currentGuildDiscordIdString 
            });
        } catch (databaseFetchException) {
            console.log(`[MESSAGE CREATE ERROR] ❌ Exception while fetching config for guild ID: ${currentGuildDiscordIdString}`);
            console.error(databaseFetchException);
            return; // إيقاف التنفيذ بأمان في حال فشل الاتصال بقاعدة البيانات
        }

        // إذا لم يكن السيرفر مسجلاً في قاعدة البيانات (لم يقم بتفعيل البوت من الداشبورد)، نتجاهل الرسالة
        const isGuildConfigMissingBoolean = (!activeGuildConfigurationDocument);
        if (isGuildConfigMissingBoolean === true) {
            return; 
        }

        // =========================================================================================================
        // 🤖 3. نظام الردود التلقائية الديناميكي (Dynamic Auto Responders System)
        // =========================================================================================================
        
        const serverAutoRespondersArray = activeGuildConfigurationDocument.autoResponders;
        const doesServerHaveAutoRespondersBoolean = (serverAutoRespondersArray && serverAutoRespondersArray.length > 0);

        if (doesServerHaveAutoRespondersBoolean === true) {
            
            const rawMessageContentForAutoResponderString = incomingMessageObject.content;

            // المرور على جميع الردود التلقائية المبرمجة لهذا السيرفر
            for (let responderIndexNumber = 0; responderIndexNumber < serverAutoRespondersArray.length; responderIndexNumber++) {
                
                const currentAutoResponderObject = serverAutoRespondersArray[responderIndexNumber];
                const targetTriggerWordString = currentAutoResponderObject.triggerWord;
                
                // إذا كانت رسالة العضو تحتوي على الكلمة المفتاحية (Trigger Word)
                const isTriggerWordIncludedInMessageBoolean = rawMessageContentForAutoResponderString.includes(targetTriggerWordString);
                
                if (isTriggerWordIncludedInMessageBoolean === true) {
                    
                    const configuredReplyContentTextString = currentAutoResponderObject.replyMessage;
                    
                    // تنسيق الرد التلقائي ليكون بالخط العريض (Bold)
                    const elegantlyFormattedReplyString = `**${configuredReplyContentTextString}**`;

                    try {
                        // إرسال الرد في نفس الروم
                        await incomingMessageObject.reply({ content: elegantlyFormattedReplyString });
                    } catch (autoResponderReplyException) {
                        // التجاهل بصمت (مثلاً إذا تم حذف الرسالة الأصلية بسرعة أو البوت لا يمتلك صلاحية الكتابة)
                        console.log(`[AUTO RESPONDER WARNING] Could not reply to message in guild: ${targetDiscordGuildObject.name}`);
                    }
                }
            }
        }

        // =========================================================================================================
        // ⚙️ 4. معالجة الأوامر والبريفكس (Prefix Parsing & Command Extraction)
        // =========================================================================================================
        
        let dynamicallyConfiguredPrefixString = activeGuildConfigurationDocument.prefix;
        
        // حماية إضافية: تعيين بريفكس افتراضي في حال كان الحقل في قاعدة البيانات فارغاً بطريق الخطأ
        const isPrefixNullOrEmptyBoolean = (!dynamicallyConfiguredPrefixString || dynamicallyConfiguredPrefixString.trim() === '');
        if (isPrefixNullOrEmptyBoolean === true) {
            dynamicallyConfiguredPrefixString = '!'; 
        }

        const rawMessageContentForCommandCheckString = incomingMessageObject.content;
        
        // التحقق مما إذا كانت الرسالة تبدأ بالبريفكس المخصص لهذا السيرفر
        const doesMessageStartWithPrefixBoolean = rawMessageContentForCommandCheckString.startsWith(dynamicallyConfiguredPrefixString);

        if (doesMessageStartWithPrefixBoolean === false) {
            return; // الرسالة ليست أمراً، نُنهي التنفيذ هنا للحفاظ على موارد المعالج
        }

        // -----------------------------------------------------------------------------------------
        // استخراج اسم الأمر والمتغيرات (Arguments) من الرسالة
        // -----------------------------------------------------------------------------------------
        
        const prefixLengthNumber = dynamicallyConfiguredPrefixString.length;
        // إزالة البريفكس من النص
        const messageContentWithoutPrefixString = rawMessageContentForCommandCheckString.slice(prefixLengthNumber);
        
        // إزالة المسافات الزائدة من البداية والنهاية، ثم تقسيم النص بناءً على المسافات لتكوين مصفوفة
        const trimmedMessageContentWithoutPrefixString = messageContentWithoutPrefixString.trim();
        const extractedCommandArgumentsArray = trimmedMessageContentWithoutPrefixString.split(/ +/);
        
        // استخراج أول عنصر ليكون هو اسم الأمر (مثال: come، ban، clear)
        const rawExtractedCommandNameString = extractedCommandArgumentsArray.shift();
        
        const isCommandNameEmptyBoolean = (!rawExtractedCommandNameString || rawExtractedCommandNameString === '');
        if (isCommandNameEmptyBoolean === true) {
            return; 
        }

        // تحويل اسم الأمر إلى أحرف صغيرة لضمان المطابقة حتى لو كتبه المستخدم بأحرف كبيرة (مثال: !CoMe -> come)
        const targetCommandNameLowerCaseString = rawExtractedCommandNameString.toLowerCase();

        // =========================================================================================================
        // 🚀 5. البحث عن الأمر في الذاكرة وتنفيذه (Command Lookup & Execution Engine)
        // =========================================================================================================
        
        // البحث عن الأمر في الذاكرة (Collection) التي تم بناؤها بواسطة commandsHandler.js
        const requestedCommandModuleObject = discordClientObject.commands.get(targetCommandNameLowerCaseString) 
            || discordClientObject.commands.find(cmd => cmd.aliases && cmd.aliases.includes(targetCommandNameLowerCaseString));

        // إذا لم يكن الأمر موجوداً في قائمة الأوامر المبرمجة
        const doesCommandExistInRamBoolean = (requestedCommandModuleObject !== undefined && requestedCommandModuleObject !== null);
        if (doesCommandExistInRamBoolean === false) {
            return; // نتجاهل الرسالة (قد يكون أمر لبوت آخر)
        }

        // تنفيذ الأمر داخل كتلة Try/Catch لضمان عدم سقوط البوت إذا احتوى الأمر على خطأ برمجي
        try {
            console.log(`[COMMAND EXECUTION] ⚡ User [${incomingMessageObject.author.tag}] executed command: [${targetCommandNameLowerCaseString}] in guild: [${targetDiscordGuildObject.name}]`);
            
            // استدعاء دالة التنفيذ (execute) وتمرير جميع الكائنات التي سيحتاجها الأمر
            await requestedCommandModuleObject.execute(
                incomingMessageObject, 
                extractedCommandArgumentsArray, 
                discordClientObject, 
                activeGuildConfigurationDocument
            );
            
        } catch (commandExecutionException) {
            console.log(`[COMMAND EXECUTION ERROR] ❌ Critical Exception while executing command: [${targetCommandNameLowerCaseString}]`);
            console.error(commandExecutionException);
            
            const unexpectedErrorMessageContentString = '**❌ حدث خطأ داخلي غير متوقع أثناء محاولة تنفيذ هذا الأمر. يرجى إبلاغ الدعم الفني.**';
            
            try {
                // محاولة إبلاغ المستخدم بحدوث خطأ
                await incomingMessageObject.reply({ content: unexpectedErrorMessageContentString });
            } catch (errorReplyException) {
                // التجاهل بأمان إذا كان البوت لا يمتلك صلاحية الرد أو تم حذف رسالة المستخدم
            }
        }
    }
};
