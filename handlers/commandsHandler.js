// =========================================================================================================
// ⚙️ محرك تحميل الأوامر الديناميكي (DYNAMIC COMMANDS HANDLER - ENTERPRISE EDITION)
// ---------------------------------------------------------------------------------------------------------
// هذا الملف مصمم لقراءة المجلدات الفرعية (Sub-categories) داخل مجلد "commands".
// يقوم باستخراج كل أمر، التحقق من هيكلته، ثم تخزينه في حاوية الذاكرة (client.commands).
// التصميم يضمن السرعة القصوى أثناء تنفيذ الأوامر لأنها تكون مقروءة مسبقاً في الرامات (RAM).
// =========================================================================================================

const fileSystemModule = require('fs');
const pathUtilities = require('path');

module.exports = (discordClientObject) => {
    console.log('[COMMANDS HANDLER] 🔄 Initiating Dynamic Commands Loading Process...');
    
    // 1. تحديد المسار المطلق لمجلد الأوامر الرئيسي
    const commandsRootDirectoryAbsolutePathString = pathUtilities.join(__dirname, '../commands');

    // 2. التحقق من وجود المجلد الأساسي
    const doesCommandsDirectoryExistBoolean = fileSystemModule.existsSync(commandsRootDirectoryAbsolutePathString);
    
    if (doesCommandsDirectoryExistBoolean === false) {
        console.log('[COMMANDS HANDLER WARNING] ⚠️ "commands" root directory was not found. Creating it now...');
        try {
            fileSystemModule.mkdirSync(commandsRootDirectoryAbsolutePathString, { recursive: true });
            console.log('[COMMANDS HANDLER] ✅ Successfully created "commands" directory. Add your categories folders inside it.');
        } catch (directoryCreationException) {
            console.log('[COMMANDS HANDLER CRITICAL ERROR] ❌ Failed to create "commands" root directory.');
            console.error(directoryCreationException);
            return;
        }
    }

    // 3. قراءة المجلدات الفرعية (Categories) مثل (admin, general, tickets)
    let commandCategoryFoldersArray = [];
    try {
        commandCategoryFoldersArray = fileSystemModule.readdirSync(commandsRootDirectoryAbsolutePathString);
    } catch (readDirectoryException) {
        console.log('[COMMANDS HANDLER ERROR] ❌ Failed to read the "commands" root directory.');
        console.error(readDirectoryException);
        return;
    }

    // 4. عدادات الإحصائيات
    let successfullyLoadedCommandsCountNumber = 0;
    let failedToLoadCommandsCountNumber = 0;

    // 5. حلقة تكرارية للمرور على كل مجلد فرعي
    for (let categoryIndexNumber = 0; categoryIndexNumber < commandCategoryFoldersArray.length; categoryIndexNumber++) {
        
        const currentCategoryFolderNameString = commandCategoryFoldersArray[categoryIndexNumber];
        const currentCategoryAbsolutePathString = pathUtilities.join(commandsRootDirectoryAbsolutePathString, currentCategoryFolderNameString);

        // التأكد من أن المسار الحالي هو مجلد (Directory) وليس ملفاً منفرداً
        const isCurrentPathADirectoryBoolean = fileSystemModule.statSync(currentCategoryAbsolutePathString).isDirectory();
        
        if (isCurrentPathADirectoryBoolean === true) {
            
            // قراءة ملفات الجافاسكريبت داخل هذا المجلد الفرعي
            const commandFilesInsideCategoryArray = fileSystemModule.readdirSync(currentCategoryAbsolutePathString).filter(fileName => fileName.endsWith('.js'));

            for (let commandFileIndex = 0; commandFileIndex < commandFilesInsideCategoryArray.length; commandFileIndex++) {
                
                const currentCommandFileNameString = commandFilesInsideCategoryArray[commandFileIndex];
                const currentCommandFileAbsolutePathString = pathUtilities.join(currentCategoryAbsolutePathString, currentCommandFileNameString);

                try {
                    // استدعاء ملف الأمر
                    const extractedCommandModuleObject = require(currentCommandFileAbsolutePathString);

                    // 6. التحقق من صحة الهيكلة البرمجية للأمر
                    const hasCommandNamePropertyBoolean = (extractedCommandModuleObject.name !== undefined && extractedCommandModuleObject.name !== null);
                    const hasExecuteFunctionPropertyBoolean = (typeof extractedCommandModuleObject.execute === 'function');

                    if (hasCommandNamePropertyBoolean === true && hasExecuteFunctionPropertyBoolean === true) {
                        
                        const targetCommandNameString = extractedCommandModuleObject.name;
                        
                        // حفظ الأمر في ذاكرة البوت
                        discordClientObject.commands.set(targetCommandNameString, extractedCommandModuleObject);
                        
                        // حفظ اختصارات الأمر (Aliases) إن وجدت
                        const hasAliasesArrayBoolean = (extractedCommandModuleObject.aliases && Array.isArray(extractedCommandModuleObject.aliases));
                        if (hasAliasesArrayBoolean === true) {
                            for (let aliasIndex = 0; aliasIndex < extractedCommandModuleObject.aliases.length; aliasIndex++) {
                                const currentAliasString = extractedCommandModuleObject.aliases[aliasIndex];
                                discordClientObject.aliases.set(currentAliasString, extractedCommandModuleObject.name);
                            }
                        }

                        successfullyLoadedCommandsCountNumber++;
                        console.log(`[COMMANDS HANDLER] 🛠️ Loaded command: [${targetCommandNameString}] from category: <${currentCategoryFolderNameString}>`);

                    } else {
                        console.log(`[COMMANDS HANDLER WARNING] ⚠️ File (${currentCommandFileNameString}) is missing "name" or "execute". Skipped.`);
                        failedToLoadCommandsCountNumber++;
                    }

                } catch (commandFileLoadException) {
                    console.log(`[COMMANDS HANDLER ERROR] ❌ Failed to load command file: (${currentCommandFileNameString})`);
                    console.error(commandFileLoadException);
                    failedToLoadCommandsCountNumber++;
                }
            }
        }
    }

    // 7. طباعة الملخص النهائي
    console.log(`[COMMANDS HANDLER SUMMARY] 📊 Total Commands Loaded into RAM: ${successfullyLoadedCommandsCountNumber} | Failed/Skipped: ${failedToLoadCommandsCountNumber}`);
    console.log('====================================================');
};
