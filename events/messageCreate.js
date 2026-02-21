// =========================================================================================================
// 💬 مراقب الرسائل الشامل (MESSAGE CREATE EVENT - ULTIMATE UNABBREVIATED ROUTER)
// ---------------------------------------------------------------------------------------------------------
// هذا الملف يستمع لكل رسالة. تمت كتابته بطريقة (Hyper-Verbose) وبدون أي اختصارات برمجية.
// كل خطوة مفصولة، ولها متغيرات طويلة وواضحة، مع معالجة الأخطاء لكل سطر.
// =========================================================================================================

const GuildConfigurationDatabaseModel = require('../models/GuildConfig');

module.exports = {
    name: 'messageCreate',
    once: false,

    async execute(incomingMessageObject, discordClientObject) {
        
        // =========================================================================================================
        // 🛡️ 1. فحوصات الأمان الأساسية والبديهية (Basic Security Validations)
        // =========================================================================================================
        
        // منع البوتات من استخدام الأوامر أو الرد على بعضها
        const isMessageAuthorABotBoolean = incomingMessageObject.author.bot;
        if (isMessageAuthorABotBoolean === true) {
            return; 
        }
        
        // التأكد من أن الرسالة أُرسلت داخل سيرفر وليس في الخاص
        const targetDiscordGuildObject = incomingMessageObject.guild;
        if (targetDiscordGuildObject === null || targetDiscordGuildObject === undefined) {
            return; 
        }

        // =========================================================================================================
        // 🗄️ 2. جلب إعدادات السيرفر من قاعدة البيانات (Database Configuration Fetching)
        // =========================================================================================================
        
        const currentGuildDiscordIdentifierString = targetDiscordGuildObject.id;
        let activeGuildConfigurationDocumentObject = null;

        try {
            activeGuildConfigurationDocumentObject = await GuildConfigurationDatabaseModel.findOne({ 
                guildId: currentGuildDiscordIdentifierString 
            });
        } catch (databaseFetchExceptionError) {
            console.error('[MESSAGE CREATE EVENT ERROR] Failed to fetch database configuration for guild.', databaseFetchExceptionError);
            return; 
        }

        // إذا لم يكن السيرفر مسجلاً في قاعدة البيانات
        const isGuildConfigurationMissingBoolean = (activeGuildConfigurationDocumentObject === null);
        if (isGuildConfigurationMissingBoolean === true) {
            return; 
        }

        // =========================================================================================================
        // 🤖 3. معالجة الردود التلقائية (Auto Responders Engine)
        // =========================================================================================================
        
        const configuredServerAutoRespondersArray = activeGuildConfigurationDocumentObject.autoResponders;
        const doesServerHaveAutoRespondersBoolean = (configuredServerAutoRespondersArray && configuredServerAutoRespondersArray.length > 0);
        
        if (doesServerHaveAutoRespondersBoolean === true) {
            
            const rawMessageContentForAutoResponderProcessingString = incomingMessageObject.content;

            for (let responderIndexNumber = 0; responderIndexNumber < configuredServerAutoRespondersArray.length; responderIndexNumber++) {
                
                const currentAutoResponderItemObject = configuredServerAutoRespondersArray[responderIndexNumber];
                const targetTriggerWordToSearchForString = currentAutoResponderItemObject.triggerWord;
                
                const isTriggerWordIncludedInUserMessageBoolean = rawMessageContentForAutoResponderProcessingString.includes(targetTriggerWordToSearchForString);
                
                if (isTriggerWordIncludedInUserMessageBoolean === true) {
                    
                    const configuredReplyContentTextString = currentAutoResponderItemObject.replyMessage;
                    const elegantlyFormattedReplyToUserString = `**${configuredReplyContentTextString}**`;
                    
                    try {
                        await incomingMessageObject.reply({ content: elegantlyFormattedReplyToUserString });
                    } catch (autoResponderReplyExceptionError) {
                        console.log(`[AUTO RESPONDER WARNING] Could not reply to message in guild: ${targetDiscordGuildObject.name}`);
                    }
                }
            }
        }

        // =========================================================================================================
        // ⚙️ 4. معالجة البريفكس واستخراج اسم الأمر (Prefix Processing & Command Extraction)
        // =========================================================================================================
        
        let dynamicallyConfiguredGuildPrefixString = activeGuildConfigurationDocumentObject.prefix;
        
        const isPrefixNullOrEmptyBoolean = (!dynamicallyConfiguredGuildPrefixString || dynamicallyConfiguredGuildPrefixString.trim() === '');
        if (isPrefixNullOrEmptyBoolean === true) {
            dynamicallyConfiguredGuildPrefixString = '!'; 
        }

        const rawMessageContentForCommandValidationString = incomingMessageObject.content;
        
        const doesMessageStartWithValidPrefixBoolean = rawMessageContentForCommandValidationString.startsWith(dynamicallyConfiguredGuildPrefixString);
        if (doesMessageStartWithValidPrefixBoolean === false) {
            return; 
        }

        const prefixLengthNumber = dynamicallyConfiguredGuildPrefixString.length;
        const messageContentWithoutPrefixString = rawMessageContentForCommandValidationString.slice(prefixLengthNumber);
        
        const trimmedMessageContentWithoutPrefixString = messageContentWithoutPrefixString.trim();
        const extractedCommandArgumentsArray = trimmedMessageContentWithoutPrefixString.split(/ +/);
        
        const rawExtractedCommandNameString = extractedCommandArgumentsArray.shift();
        
        const isCommandNameEmptyBoolean = (!rawExtractedCommandNameString || rawExtractedCommandNameString === '');
        if (isCommandNameEmptyBoolean === true) {
            return; 
        }

        const typedCommandNameLowerCaseString = rawExtractedCommandNameString.toLowerCase();

        // =========================================================================================================
        // 🔄 5. الموجه الديناميكي للأوامر (Dynamic Command Router Engine)
        // =========================================================================================================
        
        const databaseCommandsConfigurationObject = activeGuildConfigurationDocumentObject.commands;
        
        // دالة تنظيف صارمة لاستخراج اسم الأمر من الداشبورد بدون مسافات أو بريفكس خاطئ
        const cleanDatabaseCommandNameFunction = function(providedCommandString) {
            if (providedCommandString === null || providedCommandString === undefined || providedCommandString === '') {
                return null;
            }
            let cleanedCommandString = providedCommandString.toLowerCase().trim();
            if (cleanedCommandString.startsWith(dynamicallyConfiguredGuildPrefixString) === true) {
                cleanedCommandString = cleanedCommandString.slice(dynamicallyConfiguredGuildPrefixString.length);
            }
            return cleanedCommandString;
        };

        // بناء خريطة الربط الديناميكية (Dynamic Map) لتوجيه الاسم المخصص للملف الصحيح
        const dynamicCommandMappingDictionaryObject = {};
        
        // ربط أمر مسح الرسائل
        dynamicCommandMappingDictionaryObject[cleanDatabaseCommandNameFunction(databaseCommandsConfigurationObject.clearCmd) || 'clear'] = 'clear';
        // ربط أمر الحظر
        dynamicCommandMappingDictionaryObject[cleanDatabaseCommandNameFunction(databaseCommandsConfigurationObject.banCmd) || 'ban'] = 'ban';
        // ربط أمر الإسكات
        dynamicCommandMappingDictionaryObject[cleanDatabaseCommandNameFunction(databaseCommandsConfigurationObject.timeoutCmd) || 'timeout'] = 'timeout';
        // ربط أمر الاستدعاء
        dynamicCommandMappingDictionaryObject[cleanDatabaseCommandNameFunction(databaseCommandsConfigurationObject.comeCmd) || 'come'] = 'come';
        // ربط أمر التقييم
        dynamicCommandMappingDictionaryObject[cleanDatabaseCommandNameFunction(databaseCommandsConfigurationObject.doneCmd) || 'done'] = 'done';
        // ربط أمر تفاصيل المعاملة
        dynamicCommandMappingDictionaryObject[cleanDatabaseCommandNameFunction(databaseCommandsConfigurationObject.tradeCmd) || 'trade'] = 'trade';

        // البحث عن اسم الملف البرمجي الحقيقي المطابق لما كتبه العضو
        const mappedRealCommandFileNameString = dynamicCommandMappingDictionaryObject[typedCommandNameLowerCaseString];
        
        let requestedCommandModuleToExecuteObject = null;

        if (mappedRealCommandFileNameString !== undefined && mappedRealCommandFileNameString !== null) {
            // إذا كان الأمر مخصصاً من الداشبورد
            requestedCommandModuleToExecuteObject = discordClientObject.commands.get(mappedRealCommandFileNameString);
        } else {
            // البحث الاعتيادي (Fallback) بالاسم المباشر أو الاختصارات المبرمجة مسبقاً
            requestedCommandModuleToExecuteObject = discordClientObject.commands.get(typedCommandNameLowerCaseString);
            
            if (requestedCommandModuleToExecuteObject === undefined || requestedCommandModuleToExecuteObject === null) {
                requestedCommandModuleToExecuteObject = discordClientObject.commands.find(function(commandModule) {
                    return commandModule.aliases && commandModule.aliases.includes(typedCommandNameLowerCaseString);
                });
            }
        }

        // إذا لم يكن الأمر موجوداً تماماً، يتم تجاهل الرسالة بصمت
        const isCommandValidAndFoundBoolean = (requestedCommandModuleToExecuteObject !== undefined && requestedCommandModuleToExecuteObject !== null);
        if (isCommandValidAndFoundBoolean === false) {
            return; 
        }

        // =========================================================================================================
        // 🚀 6. التنفيذ الفعلي للأمر مع حماية شاملة (Execution Engine with Full Protection)
        // =========================================================================================================
        
        try {
            console.log(`[COMMAND EXECUTION LOG] User [${incomingMessageObject.author.tag}] is executing command: [${typedCommandNameLowerCaseString}] in guild: [${targetDiscordGuildObject.name}]`);
            
            await requestedCommandModuleToExecuteObject.execute(
                incomingMessageObject, 
                extractedCommandArgumentsArray, 
                discordClientObject, 
                activeGuildConfigurationDocumentObject
            );
            
        } catch (criticalCommandExecutionExceptionError) {
            
            console.error(`[CRITICAL COMMAND EXECUTION ERROR] Exception caught while executing command: [${typedCommandNameLowerCaseString}]`);
            console.error(criticalCommandExecutionExceptionError);
            
            const unexpectedErrorMessageContentTextString = '**❌ حدث خطأ داخلي غير متوقع أثناء محاولة تنفيذ هذا الأمر. يرجى مراجعة سجلات النظام.**';
            
            try {
                await incomingMessageObject.reply({ content: unexpectedErrorMessageContentTextString });
            } catch (errorReplyDeliveryExceptionError) {
                // التجاهل بأمان إذا تم حذف الرسالة الأصلية قبل إرسال التنبيه
            }
        }
    }
};
