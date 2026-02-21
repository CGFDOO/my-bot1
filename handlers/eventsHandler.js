// =========================================================================================================
// 📡 محرك تحميل الأحداث الديناميكي (DYNAMIC EVENTS HANDLER - ENTERPRISE EDITION)
// ---------------------------------------------------------------------------------------------------------
// وظيفة هذا الملف هي قراءة مجلد "events" بالكامل، واستخراج كل ملف حدث (مثل messageCreate و interactionCreate)،
// ثم تسجيل هذا الحدث في ذاكرة البوت (client.on أو client.once).
// تم تصميمه ببرمجة دفاعية صارمة (Strict Defensive Programming) لضمان عدم توقف البوت عند وجود ملف تالف.
// =========================================================================================================

const fileSystemModule = require('fs');
const pathUtilities = require('path');

module.exports = (discordClientObject) => {
    console.log('====================================================');
    console.log('[EVENTS HANDLER] 🔄 Initiating Dynamic Events Loading Process...');
    
    // 1. تحديد المسار المطلق (Absolute Path) لمجلد الأحداث
    const eventsDirectoryAbsolutePathString = pathUtilities.join(__dirname, '../events');
    
    // 2. التحقق من وجود مجلد الأحداث لحماية البوت من التوقف (Crash)
    const doesEventsDirectoryExistBoolean = fileSystemModule.existsSync(eventsDirectoryAbsolutePathString);
    
    if (doesEventsDirectoryExistBoolean === false) {
        console.log('[EVENTS HANDLER WARNING] ⚠️ "events" directory was not found. Creating a new empty directory...');
        try {
            // إنشاء المجلد إذا لم يكن موجوداً
            fileSystemModule.mkdirSync(eventsDirectoryAbsolutePathString, { recursive: true });
            console.log('[EVENTS HANDLER] ✅ Successfully created "events" directory.');
        } catch (directoryCreationException) {
            console.log('[EVENTS HANDLER CRITICAL ERROR] ❌ Failed to create "events" directory. Please check folder permissions.');
            console.error(directoryCreationException);
            return; // إنهاء التنفيذ مبكراً لمنع الانهيار
        }
    }

    // 3. قراءة محتويات مجلد الأحداث وفلترة ملفات الجافاسكريبت فقط (.js)
    let javascriptEventFilesArray = [];
    try {
        const rawFilesInEventsDirectoryArray = fileSystemModule.readdirSync(eventsDirectoryAbsolutePathString);
        javascriptEventFilesArray = rawFilesInEventsDirectoryArray.filter(fileName => fileName.endsWith('.js'));
    } catch (readDirectoryException) {
        console.log('[EVENTS HANDLER ERROR] ❌ Failed to read files inside the "events" directory.');
        console.error(readDirectoryException);
        return;
    }

    // 4. تعريف عدادات الإحصائيات لمراقبة الأداء
    let successfullyLoadedEventFilesCountNumber = 0;
    let failedToLoadEventFilesCountNumber = 0;

    // 5. حلقة تكرارية (Loop) للمرور على كل ملف حدث وتحميله
    for (let currentFileIndex = 0; currentFileIndex < javascriptEventFilesArray.length; currentFileIndex++) {
        
        const currentEventFileNameString = javascriptEventFilesArray[currentFileIndex];
        const currentEventFileAbsolutePathString = pathUtilities.join(eventsDirectoryAbsolutePathString, currentEventFileNameString);

        try {
            // استدعاء ملف الحدث من المسار
            const extractedEventModuleObject = require(currentEventFileAbsolutePathString);

            // 6. التحقق من صحة الهيكلة البرمجية لملف الحدث
            const hasEventNamePropertyBoolean = (extractedEventModuleObject.name !== undefined && extractedEventModuleObject.name !== null);
            const hasExecuteFunctionPropertyBoolean = (typeof extractedEventModuleObject.execute === 'function');

            if (hasEventNamePropertyBoolean === true && hasExecuteFunctionPropertyBoolean === true) {
                
                const currentEventNameString = extractedEventModuleObject.name;
                const isEventTriggeredOnceBoolean = (extractedEventModuleObject.once === true);

                // تسجيل الحدث في نظام ديسكورد بناءً على نوعه (مرة واحدة أو مستمر)
                if (isEventTriggeredOnceBoolean === true) {
                    discordClientObject.once(currentEventNameString, (...eventArguments) => {
                        extractedEventModuleObject.execute(...eventArguments, discordClientObject);
                    });
                } else {
                    discordClientObject.on(currentEventNameString, (...eventArguments) => {
                        extractedEventModuleObject.execute(...eventArguments, discordClientObject);
                    });
                }
                
                successfullyLoadedEventFilesCountNumber++;
                console.log(`[EVENTS HANDLER] ⚡ Successfully linked event: [${currentEventNameString}] from file (${currentEventFileNameString})`);

            } else {
                console.log(`[EVENTS HANDLER WARNING] ⚠️ File (${currentEventFileNameString}) is invalid. Missing "name" string or "execute" function. Skipped.`);
                failedToLoadEventFilesCountNumber++;
            }

        } catch (eventFileLoadException) {
            console.log(`[EVENTS HANDLER ERROR] ❌ Critical failure while loading event file: (${currentEventFileNameString})`);
            console.error(eventFileLoadException);
            failedToLoadEventFilesCountNumber++;
        }
    }

    // 7. طباعة الملخص النهائي
    console.log(`[EVENTS HANDLER SUMMARY] 📊 Total Events Loaded: ${successfullyLoadedEventFilesCountNumber} | Failed/Skipped: ${failedToLoadEventFilesCountNumber}`);
    console.log('====================================================');
};
