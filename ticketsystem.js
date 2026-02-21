// =========================================================================================================
// 🚀 نظام التكتات الشامل العالمي (UNIVERSAL TICKET SYSTEM - PUBLIC ENTERPRISE EDITION)
// ---------------------------------------------------------------------------------------------------------
// هذا النظام مبرمج ليعمل كـ "Public Bot". لا يحتوي على أي أسماء سيرفرات ثابتة.
// يعتمد النظام على جلب البيانات ديناميكياً (Dynamically) من قاعدة البيانات لكل سيرفر على حدة.
// تمت كتابة الكود بأسلوب (Extreme Verbosity & Defensive Programming) لضمان استقرار 100% (Zero-Errors).
// =========================================================================================================

// =========================================================================================================
// 📦 1. استدعاء المكاتب الأساسية (Core Dependencies)
// يتم استدعاء كل وحدة بشكل منفصل تماماً لضمان عدم حدوث أي تداخل في الذاكرة (Memory Leaks).
// =========================================================================================================
const discordLibrary = require('discord.js');

// تفكيك الكلاسات الأساسية من مكتبة ديسكورد وتخزينها في متغيرات ثابتة
const EmbedBuilder = discordLibrary.EmbedBuilder;
const ActionRowBuilder = discordLibrary.ActionRowBuilder;
const ButtonBuilder = discordLibrary.ButtonBuilder;
const ButtonStyle = discordLibrary.ButtonStyle;
const ModalBuilder = discordLibrary.ModalBuilder;
const TextInputBuilder = discordLibrary.TextInputBuilder;
const TextInputStyle = discordLibrary.TextInputStyle;
const ChannelType = discordLibrary.ChannelType;
const PermissionFlagsBits = discordLibrary.PermissionFlagsBits;
const StringSelectMenuBuilder = discordLibrary.StringSelectMenuBuilder;
const Collection = discordLibrary.Collection;

// =========================================================================================================
// 📦 2. استدعاء المكاتب الإضافية (External Packages)
// =========================================================================================================
// مكتبة استخراج الترانسكريبت (حفظ المحادثات كملف HTML عالي الجودة)
const discordTranscripts = require('discord-html-transcripts');

// =========================================================================================================
// 📦 3. استدعاء قاعدة البيانات (Database Models)
// يتم جلب الموديل الخاص بإعدادات السيرفرات لضمان العزل التام لبيانات كل سيرفر.
// =========================================================================================================
const GuildConfig = require('./models/GuildConfig');

// =========================================================================================================
// 🚀 4. تصدير الموديل الرئيسي للتشغيل (Main Module Export)
// =========================================================================================================
module.exports = (client) => {
    
    // =========================================================================================================
    // 🎧 الاستماع لجميع التفاعلات (Interaction Create Event)
    // هذا الحدث هو القلب النابض الذي يستقبل جميع ضغطات الأزرار، النوافذ، والقوائم المنسدلة في جميع السيرفرات.
    // =========================================================================================================
    client.on('interactionCreate', async (interaction) => {

        // =========================================================================================================
        // 🛡️ فحص أساسي: التأكد من وجود التفاعل بشكل سليم
        // =========================================================================================================
        const isInteractionValidObject = (interaction !== null && typeof interaction !== 'undefined');
        if (isInteractionValidObject === false) {
            return; // إنهاء التنفيذ مبكراً إذا كان التفاعل معطوباً
        }

        // =========================================================================================================
        // ⭐ القسم الأول: تفاعلات نظام التقييم الخاص (Rating System - Stars Button)
        // عندما يضغط العميل على عدد النجوم في الرسالة الخاصة للتقييم، نقوم ببناء نافذة لطلب تعليق إضافي.
        // =========================================================================================================
        const isInteractionAButtonEvent = interaction.isButton();
        
        if (isInteractionAButtonEvent === true) {
            
            // سحب المعرف البرمجي للزر الذي تم الضغط عليه
            const rawCustomInteractionIdString = interaction.customId;
            
            // التحقق مما إذا كان الزر ينتمي لنظام التقييم
            const isRatingButtonActionDetected = rawCustomInteractionIdString.startsWith('rate_');
            
            if (isRatingButtonActionDetected === true) {
                
                // -----------------------------------------------------------------------------------------
                // 1. تفكيك المعرف الخاص بالزر لفهم تفاصيل التقييم (Defensive Splitting)
                // -----------------------------------------------------------------------------------------
                const customIdPartsArray = rawCustomInteractionIdString.split('_');
                
                // استخراج المتغيرات بدقة متناهية لمنع تداخل البيانات
                const ratingActionPrefixString = customIdPartsArray[0]; // كلمة 'rate'
                const ratingTargetRoleTypeString = customIdPartsArray[1]; // نوع التقييم (staff أو mediator)
                const selectedStarCountString = customIdPartsArray[2]; // عدد النجوم التي اختارها العضو
                const ratedTargetUserIdString = customIdPartsArray[3]; // الأيدي الخاص بالشخص المُقيَّم
                const originalGuildIdString = customIdPartsArray[4]; // الأيدي الخاص بالسيرفر لضمان العزل
                
                // -----------------------------------------------------------------------------------------
                // 2. بناء النافذة المنبثقة (Modal Builder) لطلب تعليق العميل
                // -----------------------------------------------------------------------------------------
                const clientFeedbackModalObject = new ModalBuilder();
                
                // بناء المعرف الخاص بالنافذة لتمرير نفس البيانات الدقيقة للحدث القادم
                let uniquelyGeneratedModalIdString = '';
                uniquelyGeneratedModalIdString += 'modalrate_';
                uniquelyGeneratedModalIdString += ratingTargetRoleTypeString + '_';
                uniquelyGeneratedModalIdString += selectedStarCountString + '_';
                uniquelyGeneratedModalIdString += ratedTargetUserIdString + '_';
                uniquelyGeneratedModalIdString += originalGuildIdString;
                
                // تعيين المعرف للنافذة
                clientFeedbackModalObject.setCustomId(uniquelyGeneratedModalIdString);
                
                // تحديد عنوان النافذة (Title)
                const modalDisplayTitleTextString = 'إضافة تعليق (اختياري)';
                clientFeedbackModalObject.setTitle(modalDisplayTitleTextString);

                // -----------------------------------------------------------------------------------------
                // 3. بناء حقل الإدخال النصي داخل النافذة (Text Input Builder)
                // -----------------------------------------------------------------------------------------
                const userCommentTextInputObject = new TextInputBuilder();
                
                // تعيين معرف الحقل النصي
                const internalInputCustomIdString = 'rating_comment';
                userCommentTextInputObject.setCustomId(internalInputCustomIdString);
                
                // تعيين السؤال الذي سيظهر للعميل
                const displayInputLabelTextString = 'هل لديك أي تعليق إضافي للإدارة؟';
                userCommentTextInputObject.setLabel(displayInputLabelTextString);
                
                // جعل الحقل من نوع "نص طويل" (Paragraph) ليتسع لشكاوى أو شكر العميل
                const desiredInputStyleType = TextInputStyle.Paragraph;
                userCommentTextInputObject.setStyle(desiredInputStyleType);
                
                // جعل الحقل غير إجباري (اختياري) حتى لا نجبر العميل على الكتابة
                const isCommentFieldRequiredBoolean = false;
                userCommentTextInputObject.setRequired(isCommentFieldRequiredBoolean); 
                
                // تعيين نص توضيحي باهت داخل الحقل (Placeholder)
                const internalInputPlaceholderTextString = 'اكتب تعليقك هنا... (يمكنك تركه فارغاً والضغط على إرسال)';
                userCommentTextInputObject.setPlaceholder(internalInputPlaceholderTextString);

                // -----------------------------------------------------------------------------------------
                // 4. تجميع الحقل داخل صف العمليات (Action Row Builder)
                // -----------------------------------------------------------------------------------------
                const inputModalActionRowObject = new ActionRowBuilder();
                
                // إضافة حقل النص إلى الصف
                inputModalActionRowObject.addComponents(userCommentTextInputObject);
                
                // إضافة الصف بالكامل إلى النافذة المنبثقة
                clientFeedbackModalObject.addComponents(inputModalActionRowObject);

                // -----------------------------------------------------------------------------------------
                // 5. إرسال النافذة للعضو في الخاص بأمان (Safe Execution)
                // -----------------------------------------------------------------------------------------
                try {
                    // محاولة عرض النافذة للمستخدم
                    await interaction.showModal(clientFeedbackModalObject);
                } catch (modalPresentationException) {
                    // التقاط الخطأ في حال كان ديسكورد يعاني من تأخير أو مشاكل في الاتصال
                    console.log("[UNIVERSAL TICKET SYSTEM] Error displaying rating modal to the user in DMs. Exception details: ", modalPresentationException);
                }
                
                // إنهاء التنفيذ لهذه الجزئية لعدم تداخل الأوامر الأخرى
                return; 
            }
        }
// ==================== نهاية الجزء 1 من 7 ====================

              // =========================================================================================================
        // ⭐ القسم الثاني: استلام تعليق التقييم (Modal Submit) وإرسال اللوج للسيرفر الصحيح
        // =========================================================================================================
        
        // التحقق مما إذا كان التفاعل عبارة عن إرسال نموذج (Modal Submit)
        const isInteractionAModalSubmitEvent = interaction.isModalSubmit();
        
        if (isInteractionAModalSubmitEvent === true) {
            
            const customInteractionIdString = interaction.customId;
            const isRatingModalSubmitAction = customInteractionIdString.startsWith('modalrate_');
            
            // -----------------------------------------------------------------------------------------
            // إذا كانت النافذة المرسلة هي بالفعل نافذة التقييم الخاصة بالعميل
            // -----------------------------------------------------------------------------------------
            if (isRatingModalSubmitAction === true) {
                
                // 🔥 السرعة الصاروخية (Immediate Deferral): 
                // نقوم بتأجيل التحديث فوراً في أقل من 0.001 ثانية لمنع رسالة (Interaction Failed) المزعجة!
                try {
                    await interaction.deferUpdate();
                } catch (deferUpdateException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Error deferring update for rating modal. Exception: ", deferUpdateException);
                }

                // -----------------------------------------------------------------------------------------
                // 1. تفكيك البيانات من المعرف الذي تم تمريره من الجزء الأول
                // -----------------------------------------------------------------------------------------
                const customIdPartsArray = customInteractionIdString.split('_');
                
                // استخراج المتغيرات الدقيقة لضمان عدم الخلط بين التقييمات
                const ratingTargetRoleTypeString = customIdPartsArray[1]; // هل هو staff أم mediator؟
                const selectedStarCountString = customIdPartsArray[2]; // النجوم كنص
                const selectedStarsNumber = parseInt(selectedStarCountString); // تحويل النجوم إلى رقم صحيح
                const ratedTargetUserIdString = customIdPartsArray[3]; // أيدي الشخص الذي تم تقييمه
                const originalGuildIdString = customIdPartsArray[4]; // أيدي السيرفر الذي حدث فيه التقييم
                
                // -----------------------------------------------------------------------------------------
                // 2. سحب النص المكتوب وتأمينه ضد الإدخالات الفارغة (Defensive Validation)
                // -----------------------------------------------------------------------------------------
                const targetInputCustomIdString = 'rating_comment';
                let providedFeedbackTextString = interaction.fields.getTextInputValue(targetInputCustomIdString);
                
                // التأكد من أن النص ليس فارغاً (مسافات فقط أو غير موجود)
                const isFeedbackNullOrEmptyBoolean = (!providedFeedbackTextString || providedFeedbackTextString.trim() === '');
                
                if (isFeedbackNullOrEmptyBoolean === true) {
                    providedFeedbackTextString = 'لا يوجد تعليق مضاف من العميل. (اكتفى بالتقييم بالنجوم)';
                }

                // -----------------------------------------------------------------------------------------
                // 3. جلب إعدادات السيرفر المحدد (لضمان العزل التام للبيانات - Multi-Guild Support)
                // -----------------------------------------------------------------------------------------
                const databaseSearchFilterObject = { guildId: originalGuildIdString };
                let targetServerConfigurationDocument = null;
                
                try {
                    targetServerConfigurationDocument = await GuildConfig.findOne(databaseSearchFilterObject);
                } catch (databaseFetchException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Error fetching guild config from DB: ", databaseFetchException);
                }
                
                if (!targetServerConfigurationDocument) {
                    // إيقاف التنفيذ بأمان إذا كان السيرفر غير مسجل في قاعدة البيانات
                    return; 
                }

                // -----------------------------------------------------------------------------------------
                // 4. تحديد روم اللوج بناءً على نوع التقييم بشكل ديناميكي
                // -----------------------------------------------------------------------------------------
                let targetRatingLogChannelIdString = null;
                
                const isStaffRatingActionDetected = (ratingTargetRoleTypeString === 'staff');
                const isMediatorRatingActionDetected = (ratingTargetRoleTypeString === 'mediator');
                
                if (isStaffRatingActionDetected === true) {
                    targetRatingLogChannelIdString = targetServerConfigurationDocument.staffRatingChannelId;
                } else if (isMediatorRatingActionDetected === true) { 
                    targetRatingLogChannelIdString = targetServerConfigurationDocument.middlemanRatingChannelId; 
                }

                // -----------------------------------------------------------------------------------------
                // 5. جلب السيرفر وإرسال اللوج (مع استخراج تفاصيل التريد إذا وجدت)
                // -----------------------------------------------------------------------------------------
                const targetDiscordGuildObject = client.guilds.cache.get(originalGuildIdString);
                
                if (targetDiscordGuildObject && targetRatingLogChannelIdString) {
                    
                    const guildChannelsCacheManager = targetDiscordGuildObject.channels.cache;
                    const ratingLogChannelObject = guildChannelsCacheManager.get(targetRatingLogChannelIdString);
                    
                    if (ratingLogChannelObject) {
                        
                        // =========================================================================
                        // 📦 سحب تفاصيل التريد المفقودة من الإيمبد القديم (ميزة خاصة بتقييم الوساطة)
                        // =========================================================================
                        let dynamicallyExtractedTradeDetailsText = 'لا توجد تفاصيل (تم إرسال طلب التقييم بدون نافذة المعاملة).';
                        
                        const interactionOriginalMessageObject = interaction.message;
                        const originalMessageEmbedsArray = interactionOriginalMessageObject.embeds;
                        
                        const hasEmbedsInOriginalMessageBoolean = (originalMessageEmbedsArray && originalMessageEmbedsArray.length > 0);
                        
                        if (hasEmbedsInOriginalMessageBoolean === true) {
                            
                            const referenceEmbedObject = originalMessageEmbedsArray[0];
                            const referenceEmbedDescriptionString = referenceEmbedObject.description;
                            
                            const specificTradeIdentifierString = '**📦 تفاصيل المعاملة:**';
                            
                            // فحص هل الإيمبد يحتوي فعلاً على قسم التفاصيل
                            const doesContainTradeDetailsBoolean = (referenceEmbedDescriptionString && referenceEmbedDescriptionString.includes(specificTradeIdentifierString));
                            
                            if (doesContainTradeDetailsBoolean === true) {
                                
                                // تقسيم النص وسحب الجزء الذي يلي جملة التفاصيل
                                const descriptionSplitByTradePhraseArray = referenceEmbedDescriptionString.split(specificTradeIdentifierString);
                                
                                if (descriptionSplitByTradePhraseArray.length > 1) {
                                    const rawTradeDetailsTextString = descriptionSplitByTradePhraseArray[1];
                                    dynamicallyExtractedTradeDetailsText = rawTradeDetailsTextString.trim();
                                }
                            }
                        }

                        // =========================================================================
                        // 📈 تحديث إحصائيات التقييمات وقاعدة البيانات بأمان (Safe Increment)
                        // =========================================================================
                        
                        // تحديث إجمالي تقييمات السيرفر
                        let currentTotalServerRatingsCountNumber = targetServerConfigurationDocument.totalServerRatings;
                        
                        if (!currentTotalServerRatingsCountNumber || isNaN(currentTotalServerRatingsCountNumber)) {
                            currentTotalServerRatingsCountNumber = 0;
                        }
                        
                        currentTotalServerRatingsCountNumber = currentTotalServerRatingsCountNumber + 1;
                        targetServerConfigurationDocument.totalServerRatings = currentTotalServerRatingsCountNumber;

                        // تحديث تقييمات الفرد (الإداري أو الوسيط)
                        let individualStaffRatingCountNumber = 1;

                        if (isStaffRatingActionDetected === true) {
                            
                            const staffRatingsMapObject = targetServerConfigurationDocument.staffRatingsCount;
                            let currentIndividualStaffCountNumber = staffRatingsMapObject.get(ratedTargetUserIdString);
                            
                            if (!currentIndividualStaffCountNumber || isNaN(currentIndividualStaffCountNumber)) { 
                                currentIndividualStaffCountNumber = 0; 
                            }
                            
                            individualStaffRatingCountNumber = currentIndividualStaffCountNumber + 1;
                            targetServerConfigurationDocument.staffRatingsCount.set(ratedTargetUserIdString, individualStaffRatingCountNumber);
                            
                        } else if (isMediatorRatingActionDetected === true) {
                            
                            const middlemanRatingsMapObject = targetServerConfigurationDocument.middlemanRatingsCount;
                            let currentIndividualMiddlemanCountNumber = middlemanRatingsMapObject.get(ratedTargetUserIdString);
                            
                            if (!currentIndividualMiddlemanCountNumber || isNaN(currentIndividualMiddlemanCountNumber)) { 
                                currentIndividualMiddlemanCountNumber = 0; 
                            }
                            
                            individualStaffRatingCountNumber = currentIndividualMiddlemanCountNumber + 1;
                            targetServerConfigurationDocument.middlemanRatingsCount.set(ratedTargetUserIdString, individualStaffRatingCountNumber);
                        }
                        
                        // محاولة حفظ البيانات في قاعدة البيانات
                        try {
                            await targetServerConfigurationDocument.save();
                        } catch (saveDatabaseException) {
                            console.log("[UNIVERSAL TICKET SYSTEM] Error saving updated rating counts to database: ", saveDatabaseException);
                        }

                        // =========================================================================
                        // 🎨 بناء إيمبد اللوج العالمي (يقرأ اسم السيرفر ديناميكياً بدون أسماء ثابتة)
                        // =========================================================================
                        
                        // توليد النجوم بصيغة الإيموجي للوصف
                        let starsEmojiDisplayString = '';
                        for (let starIndexCounter = 0; starIndexCounter < selectedStarsNumber; starIndexCounter++) {
                            starsEmojiDisplayString += '⭐';
                        }

                        let logEmbedAuthorDisplayTitleString = '';
                        let logEmbedThemeColorHexCode = '';
                        let evaluatedPersonRoleLabelTextString = '';
                        
                        // سحب اسم السيرفر ديناميكياً
                        const dynamicallyFetchedGuildNameString = targetDiscordGuildObject.name;

                        // تخصيص الألوان والعناوين بناءً على نوع التقييم (يُقرأ من الداشبورد)
                        if (isStaffRatingActionDetected === true) {
                            logEmbedAuthorDisplayTitleString = `${dynamicallyFetchedGuildNameString} STAFF REVIEW`;
                            const dashboardConfiguredStaffColorHex = targetServerConfigurationDocument.staffRatingColor;
                            logEmbedThemeColorHexCode = dashboardConfiguredStaffColorHex ? dashboardConfiguredStaffColorHex : '#3ba55d';
                            evaluatedPersonRoleLabelTextString = 'الإداري (Staff) 👮';
                            
                        } else if (isMediatorRatingActionDetected === true) {
                            logEmbedAuthorDisplayTitleString = `${dynamicallyFetchedGuildNameString} MIDDLEMAN REVIEW`;
                            const dashboardConfiguredMediatorColorHex = targetServerConfigurationDocument.basicRatingColor;
                            logEmbedThemeColorHexCode = dashboardConfiguredMediatorColorHex ? dashboardConfiguredMediatorColorHex : '#f2a658';
                            evaluatedPersonRoleLabelTextString = 'الوسيط (MiddleMan) 🛡️';
                        }

                        // إنشاء كائن الإيمبد
                        const finalRatingLogEmbedObject = new EmbedBuilder();
                        const dynamicGuildIconUrlString = targetDiscordGuildObject.iconURL({ dynamic: true });
                        
                        // ضبط المؤلف وصورة السيرفر
                        finalRatingLogEmbedObject.setAuthor({ 
                            name: `📊 ${logEmbedAuthorDisplayTitleString}`, 
                            iconURL: dynamicGuildIconUrlString 
                        });
                        
                        finalRatingLogEmbedObject.setThumbnail(dynamicGuildIconUrlString);
                        
                        // بناء الوصف بشكل مفصل جداً ومفرود سطر بسطر (Defensive String Building)
                        let comprehensiveEmbedDescriptionBuilderString = '';
                        comprehensiveEmbedDescriptionBuilderString += `**العميل (المُقيِّم) 👤**\n`;
                        comprehensiveEmbedDescriptionBuilderString += `<@${interaction.user.id}>\n\n`;
                        comprehensiveEmbedDescriptionBuilderString += `**${evaluatedPersonRoleLabelTextString}**\n`;
                        comprehensiveEmbedDescriptionBuilderString += `<@${ratedTargetUserIdString}>\n\n`;
                        
                        // إضافة تفاصيل التريد حصرياً إذا كان التقييم للوساطة
                        if (isMediatorRatingActionDetected === true) {
                            comprehensiveEmbedDescriptionBuilderString += `**📦 تفاصيل المعاملة (التريد):**\n`;
                            comprehensiveEmbedDescriptionBuilderString += `${dynamicallyExtractedTradeDetailsText}\n\n`;
                        }

                        // إضافة الإحصائيات لمتابعة أداء الإدارة
                        comprehensiveEmbedDescriptionBuilderString += `**الإحصائيات 📈**\n`;
                        comprehensiveEmbedDescriptionBuilderString += `عدد التقييمات للفرد: #${individualStaffRatingCountNumber}\n`;
                        comprehensiveEmbedDescriptionBuilderString += `إجمالي تقييمات السيرفر: #${currentTotalServerRatingsCountNumber}\n\n`;
                        comprehensiveEmbedDescriptionBuilderString += `-------------------------------------------------\n\n`;
                        comprehensiveEmbedDescriptionBuilderString += `**مستوى التقييم ⭐**\n`;
                        comprehensiveEmbedDescriptionBuilderString += `**${starsEmojiDisplayString} (${selectedStarsNumber}/5)**\n\n`;
                        comprehensiveEmbedDescriptionBuilderString += `**تعليق العميل 💬**\n`;
                        comprehensiveEmbedDescriptionBuilderString += `\`\`\`${providedFeedbackTextString}\`\`\``;

                        // تعيين الوصف واللون
                        finalRatingLogEmbedObject.setDescription(comprehensiveEmbedDescriptionBuilderString);
                        finalRatingLogEmbedObject.setColor(logEmbedThemeColorHexCode);
                        
                        const interactionUserDynamicAvatarUrl = interaction.user.displayAvatarURL({ dynamic: true });
                        const interactionUsernameStringText = interaction.user.username;
                        
                        // تعيين الفوتر
                        finalRatingLogEmbedObject.setFooter({ 
                            text: `Rated by: ${interactionUsernameStringText}`, 
                            iconURL: interactionUserDynamicAvatarUrl 
                        });
                        
                        finalRatingLogEmbedObject.setTimestamp();

                        // رسالة نصية بسيطة مع الإيمبد لمنشن الإداري
                        const alertLogMessageContentString = `**New Rating Alert! <@${ratedTargetUserIdString}> received a review.**`;
                        
                        // إرسال اللوج النهائي إلى الروم المخصصة في السيرفر
                        try {
                            await ratingLogChannelObject.send({ 
                                content: alertLogMessageContentString, 
                                embeds: [finalRatingLogEmbedObject] 
                            });
                        } catch (logChannelSendException) {
                            console.log("[UNIVERSAL TICKET SYSTEM] Exception while sending rating log: ", logChannelSendException);
                        }
                    }
                }
                
                // =========================================================================
                // ✅ شكر العميل وتعديل الرسالة في الخاص (إخفاء الأزرار)
                // =========================================================================
                const thankYouReplyEmbedObject = new EmbedBuilder();
                
                let thankYouMessageContentText = `**✅ شكراً لك جزيل الشكر!**\n`;
                thankYouMessageContentText += `تم استلام تقييمك بنجاح وتم إرساله إلى إدارة السيرفر.\n\n`;
                thankYouMessageContentText += `**التقييم الذي أعطيته:** ${selectedStarsNumber}/5 نجوم`;
                
                thankYouReplyEmbedObject.setDescription(thankYouMessageContentText);
                
                // لون أخضر للنجاح
                const successGreenThemeColorHex = '#3ba55d';
                thankYouReplyEmbedObject.setColor(successGreenThemeColorHex);
                
                // مصفوفة فارغة لإزالة جميع أزرار النجوم بعد الاستخدام
                const emptyComponentsActionRowArray = []; 
                
                try { 
                    await interaction.editReply({ 
                        embeds: [thankYouReplyEmbedObject], 
                        components: emptyComponentsActionRowArray 
                    }); 
                } catch (editDirectMessageReplyException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Exception while editing user DM reply to remove buttons: ", editDirectMessageReplyException);
                }
                
                // إنهاء التنفيذ لهذه المرحلة بنجاح
                return; 
            }
        }

        // =========================================================================================================
        // ⭐ القسم الثالث: التأمين وحجب التفاعلات غير المخصصة للسيرفر (DM Blocking)
        // هذا القسم يمنع البوت من محاولة قراءة أوامر التكتات داخل الخاص (DMs) لمنع الأخطاء.
        // =========================================================================================================
        const currentInteractionGuildObject = interaction.guild;
        
        // إذا لم يكن هناك سيرفر (يعني التفاعل حدث في رسالة خاصة)
        const isInteractionInDirectMessageBoolean = (!currentInteractionGuildObject || currentInteractionGuildObject === null);
        
        if (isInteractionInDirectMessageBoolean === true) {
            // تجاهل أي زرار يُضغط في الخاص ولا ينتمي لنظام التقييم
            return; 
        }
        
        // جلب الإعدادات الخاصة بالسيرفر الحالي الذي تم فيه التفاعل
        const safeActiveGuildIdString = currentInteractionGuildObject.id;
        const guildConfigDatabaseSearchFilter = { guildId: safeActiveGuildIdString };
        
        let safeActiveGuildConfigDocument = null;
        
        try {
            safeActiveGuildConfigDocument = await GuildConfig.findOne(guildConfigDatabaseSearchFilter);
        } catch (databaseFetchErrorForServer) {
            console.log("[UNIVERSAL TICKET SYSTEM] Error fetching config for active guild: ", databaseFetchErrorForServer);
        }
        
        // إذا لم يكن السيرفر مسجلاً في الداشبورد، يتم إيقاف التفاعل بأمان
        if (!safeActiveGuildConfigDocument) {
            return; 
        }

// ======================================= نهاية الجزء 2 من السلسلة =======================================

              // =========================================================================================================
        // ⚖️ القسم الرابع: تفاعلات نافذة أمر التريد (Trade System) وطلب الموافقة العليا
        // في هذا القسم يتم معالجة طلبات التريد وحماية أزرار الموافقة من أي تلاعب أو استخدام غير مصرح به.
        // =========================================================================================================
        
        // التحقق مما إذا كان التفاعل عبارة عن ضغطة زرار
        const isTradeInteractionButtonEvent = interaction.isButton();
        
        if (isTradeInteractionButtonEvent === true) {
            
            const rawButtonCustomIdString = interaction.customId;
            const isOpenTradeModalActionDetected = (rawButtonCustomIdString === 'open_trade_modal');
            
            // -----------------------------------------------------------------------------------------
            // 1. فتح نافذة إدخال تفاصيل التريد للعميل
            // -----------------------------------------------------------------------------------------
            if (isOpenTradeModalActionDetected === true) {
                
                // بناء النافذة المنبثقة (Modal)
                const tradeDetailsModalObject = new ModalBuilder();
                
                const tradeModalCustomIdString = 'submit_trade_modal';
                tradeDetailsModalObject.setCustomId(tradeModalCustomIdString);
                
                const tradeModalDisplayTitleString = 'Trade Details (تفاصيل المعاملة)';
                tradeDetailsModalObject.setTitle(tradeModalDisplayTitleString);
                
                // بناء حقل الإدخال النصي لتفاصيل التريد
                const tradeDetailsInputObject = new TextInputBuilder();
                
                const tradeInputCustomIdString = 'trade_details_input';
                tradeDetailsInputObject.setCustomId(tradeInputCustomIdString);
                
                const tradeInputLabelDisplayString = 'ما هي تفاصيل التريد؟ (الحساب، السعر، إلخ..)';
                tradeDetailsInputObject.setLabel(tradeInputLabelDisplayString);
                
                // جعله نصاً طويلاً ليتسع للتفاصيل الكثيرة
                const tradeInputStyleType = TextInputStyle.Paragraph;
                tradeDetailsInputObject.setStyle(tradeInputStyleType);
                
                // هذا الحقل إجباري (يجب أن يكتب التفاصيل ليتمكن من الإرسال)
                const isTradeInputRequiredBoolean = true;
                tradeDetailsInputObject.setRequired(isTradeInputRequiredBoolean);
                
                // تجميع الحقل في صف العمليات وإضافته للنافذة
                const tradeActionRowContainerObject = new ActionRowBuilder();
                tradeActionRowContainerObject.addComponents(tradeDetailsInputObject);
                
                tradeDetailsModalObject.addComponents(tradeActionRowContainerObject);
                
                // إظهار النافذة للعميل بأمان
                try {
                    await interaction.showModal(tradeDetailsModalObject);
                } catch (showTradeModalException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Exception showing trade modal: ", showTradeModalException);
                }
                
                return; // إنهاء التنفيذ لهذه المرحلة
            }
        }

        // =========================================================================================================
        // 📥 استلام نموذج التريد (Modal Submit) وإرسال طلب الموافقة
        // =========================================================================================================
        const isTradeModalSubmitEvent = interaction.isModalSubmit();
        
        if (isTradeModalSubmitEvent === true) {
            
            const rawModalCustomIdString = interaction.customId;
            const isSubmitTradeModalActionDetected = (rawModalCustomIdString === 'submit_trade_modal');
            
            if (isSubmitTradeModalActionDetected === true) {
                
                // 1. استخراج النص المكتوب في النافذة
                const targetTradeInputCustomIdString = 'trade_details_input';
                const providedTradeDetailsTextString = interaction.fields.getTextInputValue(targetTradeInputCustomIdString);
                
                // -----------------------------------------------------------------------------------------
                // 2. 🔥 تعطيل زر "كتابة تفاصيل التريد" الأصلي لمنع التكرار والسبام (Defensive UX)
                // -----------------------------------------------------------------------------------------
                const originalInteractionMessageObject = interaction.message;
                
                // التأكد من أن الرسالة الأصلية لا تزال موجودة وتحتوي على أزرار
                const doesOriginalMessageExist = (originalInteractionMessageObject !== null && typeof originalInteractionMessageObject !== 'undefined');
                
                if (doesOriginalMessageExist === true) {
                    
                    const originalMessageComponentsArray = originalInteractionMessageObject.components;
                    const hasComponentsInOriginalMessage = (originalMessageComponentsArray && originalMessageComponentsArray.length > 0);
                    
                    if (hasComponentsInOriginalMessage === true) {
                        
                        const firstActionRowObject = originalMessageComponentsArray[0];
                        const rowButtonComponentsArray = firstActionRowObject.components;
                        
                        const hasButtonsInRow = (rowButtonComponentsArray && rowButtonComponentsArray.length > 0);
                        
                        if (hasButtonsInRow === true) {
                            
                            const originalTradeButtonObject = rowButtonComponentsArray[0];
                            
                            // استنساخ الزر الأصلي لتحريره
                            const newlyDisabledButtonObject = ButtonBuilder.from(originalTradeButtonObject);
                            
                            // تعطيل الزر
                            const enforceButtonDisableBoolean = true;
                            newlyDisabledButtonObject.setDisabled(enforceButtonDisableBoolean);
                            
                            // تحويل لونه إلى اللون الرمادي (Secondary) ليدل على أنه تم استخدامه
                            const disabledButtonThemeStyle = ButtonStyle.Secondary; 
                            newlyDisabledButtonObject.setStyle(disabledButtonThemeStyle); 
                            
                            // وضع الزر المعطل في صف جديد
                            const newlyDisabledActionRowObject = new ActionRowBuilder();
                            newlyDisabledActionRowObject.addComponents(newlyDisabledButtonObject);
                            
                            // تحديث الرسالة الأصلية بالزر المعطل
                            try { 
                                await originalInteractionMessageObject.edit({ 
                                    components: [newlyDisabledActionRowObject] 
                                }); 
                            } catch (editOriginalButtonException) {
                                console.log("[UNIVERSAL TICKET SYSTEM] Could not disable the original trade button: ", editOriginalButtonException);
                            }
                        }
                    }
                }

                // -----------------------------------------------------------------------------------------
                // 3. بناء إيمبد طلب الموافقة (Approval Request Embed)
                // -----------------------------------------------------------------------------------------
                const tradeApprovalRequestEmbedObject = new EmbedBuilder();
                
                const tradeApprovalTitleString = '⚖️ Trade Approval Request';
                tradeApprovalRequestEmbedObject.setTitle(tradeApprovalTitleString);
                
                // بناء الوصف وتضمين الخط الجانبي الفخم (>>>)
                let tradeApprovalDescriptionBuilderString = '';
                
                const interactionUserDiscordIdString = interaction.user.id;
                tradeApprovalDescriptionBuilderString += `**MiddleMan:** <@${interactionUserDiscordIdString}>\n\n`;
                
                tradeApprovalDescriptionBuilderString += `**Details:**\n`;
                tradeApprovalDescriptionBuilderString += `>>> ${providedTradeDetailsTextString}\n\n`;
                
                tradeApprovalDescriptionBuilderString += `⏳ *Waiting for approval (في انتظار الموافقة)...*`;
                
                tradeApprovalRequestEmbedObject.setDescription(tradeApprovalDescriptionBuilderString);
                
                // جلب لون الإيمبد الخاص بالتريد من الداشبورد للسيرفر الحالي
                const dashboardConfiguredTradeColorHex = safeActiveGuildConfigDocument.tradeEmbedColor;
                let finalTradeEmbedColorHex = '';
                
                if (dashboardConfiguredTradeColorHex) {
                    finalTradeEmbedColorHex = dashboardConfiguredTradeColorHex;
                } else {
                    finalTradeEmbedColorHex = '#f2a658'; // لون برتقالي افتراضي
                }
                
                tradeApprovalRequestEmbedObject.setColor(finalTradeEmbedColorHex);
                tradeApprovalRequestEmbedObject.setTimestamp();

                // -----------------------------------------------------------------------------------------
                // 4. بناء أزرار الموافقة والرفض (Approve / Reject)
                // -----------------------------------------------------------------------------------------
                const approvalDecisionActionRowObject = new ActionRowBuilder();
                
                // زر الموافقة
                const approveTradeDecisionButtonObject = new ButtonBuilder();
                const approveTradeCustomIdString = 'trade_approve';
                approveTradeDecisionButtonObject.setCustomId(approveTradeCustomIdString);
                
                const approveTradeLabelString = 'Approve ✅';
                approveTradeDecisionButtonObject.setLabel(approveTradeLabelString);
                
                const approveTradeStyleType = ButtonStyle.Success; // لون أخضر
                approveTradeDecisionButtonObject.setStyle(approveTradeStyleType);
                
                // زر الرفض
                const rejectTradeDecisionButtonObject = new ButtonBuilder();
                const rejectTradeCustomIdString = 'trade_reject';
                rejectTradeDecisionButtonObject.setCustomId(rejectTradeCustomIdString);
                
                const rejectTradeLabelString = 'Reject ❌';
                rejectTradeDecisionButtonObject.setLabel(rejectTradeLabelString);
                
                const rejectTradeStyleType = ButtonStyle.Danger; // لون أحمر
                rejectTradeDecisionButtonObject.setStyle(rejectTradeStyleType);
                
                // إضافة الأزرار إلى الصف
                approvalDecisionActionRowObject.addComponents(approveTradeDecisionButtonObject, rejectTradeDecisionButtonObject);

                // -----------------------------------------------------------------------------------------
                // 5. بناء نظام النداء العاجل (Mentions) للرتب المخصصة للموافقة
                // -----------------------------------------------------------------------------------------
                let finalMentionsToDropString = '';
                const dashboardConfiguredMentionRolesArray = safeActiveGuildConfigDocument.tradeMentionRoles;
                
                const hasMentionRolesConfigured = (dashboardConfiguredMentionRolesArray && dashboardConfiguredMentionRolesArray.length > 0);
                
                if (hasMentionRolesConfigured === true) {
                    // المرور على جميع الرتب المحددة في الداشبورد وإضافتها للنص
                    for (let roleIndexCounter = 0; roleIndexCounter < dashboardConfiguredMentionRolesArray.length; roleIndexCounter++) {
                        const targetRoleIdString = dashboardConfiguredMentionRolesArray[roleIndexCounter];
                        finalMentionsToDropString += `<@&${targetRoleIdString}> `;
                    }
                }
                
                // تجهيز محتوى الرسالة النصية التي ستُرسل فوق الإيمبد
                let finalMessageContentText = null;
                const isMentionStringNotEmpty = (finalMentionsToDropString !== '');
                
                if (isMentionStringNotEmpty === true) {
                    finalMessageContentText = `**🔔 نداء للموافقات العليا:** ${finalMentionsToDropString}`;
                }

                // -----------------------------------------------------------------------------------------
                // 6. إرسال طلب الموافقة إلى الروم بشكل نهائي
                // -----------------------------------------------------------------------------------------
                try {
                    await interaction.reply({ 
                        content: finalMessageContentText, 
                        embeds: [tradeApprovalRequestEmbedObject], 
                        components: [approvalDecisionActionRowObject] 
                    });
                } catch (sendTradeApprovalReplyException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Error sending trade approval request: ", sendTradeApprovalReplyException);
                }
                
                return; // إنهاء التنفيذ
            }
        }

        // =========================================================================================================
        // 🛡️ معالجة ضغطة زر الموافقة أو الرفض (Approve / Reject Protection)
        // هذا هو الجدار الفولاذي الذي يمنع أي شخص غير مخول من التدخل في التريد.
        // =========================================================================================================
        const isApprovalDecisionButtonEvent = interaction.isButton();
        
        if (isApprovalDecisionButtonEvent === true) {
            
            const rawDecisionCustomIdString = interaction.customId;
            
            const isTradeApproveActionDetected = (rawDecisionCustomIdString === 'trade_approve');
            const isTradeRejectActionDetected = (rawDecisionCustomIdString === 'trade_reject');
            
            const isAnyTradeDecisionActionDetected = (isTradeApproveActionDetected || isTradeRejectActionDetected);
            
            if (isAnyTradeDecisionActionDetected === true) {
                
                // -----------------------------------------------------------------------------------------
                // 1. جلب الرتب المسموح لها بالموافقة من الداشبورد للسيرفر الحالي
                // -----------------------------------------------------------------------------------------
                let authorizedTradeApproveRolesArray = safeActiveGuildConfigDocument.tradeApproveRoles;
                
                const isAuthorizedRolesArrayEmpty = (!authorizedTradeApproveRolesArray || authorizedTradeApproveRolesArray.length === 0);
                
                // إذا لم يحدد الأونر رتب موافقة مخصصة، نعتمد على رتب "High MiddleMan" كإجراء احتياطي (Fallback)
                if (isAuthorizedRolesArrayEmpty === true) {
                    authorizedTradeApproveRolesArray = safeActiveGuildConfigDocument.highMiddlemanRoles; 
                }
                
                // -----------------------------------------------------------------------------------------
                // 2. فحص صلاحيات العضو الذي ضغط على الزر (Strict Permission Checking)
                // -----------------------------------------------------------------------------------------
                let doesMemberHaveTradePermissionBoolean = false;
                
                const interactingMemberObject = interaction.member;
                const interactingMemberPermissionsObject = interactingMemberObject.permissions;
                
                // الأونر والإداريين الذين يملكون صلاحية Administrator لديهم موافقة تلقائية
                const hasAdministratorPermissionOverride = interactingMemberPermissionsObject.has('Administrator');
                
                if (hasAdministratorPermissionOverride === true) {
                    
                    doesMemberHaveTradePermissionBoolean = true;
                    
                } else {
                    
                    // إذا لم يكن Administrator، نفحص الرتبة رتبة
                    const hasAuthorizedRolesToIterate = (authorizedTradeApproveRolesArray && authorizedTradeApproveRolesArray.length > 0);
                    
                    if (hasAuthorizedRolesToIterate === true) {
                        
                        const memberAssignedRolesCacheManager = interactingMemberObject.roles.cache;
                        
                        for (let roleIndexCounter = 0; roleIndexCounter < authorizedTradeApproveRolesArray.length; roleIndexCounter++) {
                            
                            const requiredAuthorizedRoleIdString = authorizedTradeApproveRolesArray[roleIndexCounter];
                            const doesMemberPossessThisRole = memberAssignedRolesCacheManager.has(requiredAuthorizedRoleIdString);
                            
                            if (doesMemberPossessThisRole === true) {
                                doesMemberHaveTradePermissionBoolean = true;
                                break; // بمجرد العثور على رتبة واحدة متطابقة، نوقف الفحص
                            }
                        }
                    }
                }
                
                // -----------------------------------------------------------------------------------------
                // 3. اتخاذ الإجراء في حال عدم وجود صلاحية (Access Denied)
                // -----------------------------------------------------------------------------------------
                if (doesMemberHaveTradePermissionBoolean === false) {
                    
                    const accessDeniedMessageContentString = '**❌ عذراً، لا تمتلك الصلاحية الكافية للموافقة أو الرفض على هذا الطلب! (Access Denied)**';
                    
                    try {
                        // إرسال رسالة مخفية (ephemeral) للشخص الذي حاول الضغط فقط
                        return await interaction.reply({ 
                            content: accessDeniedMessageContentString, 
                            ephemeral: true 
                        });
                    } catch (accessDeniedReplyException) {
                        return; // في حال فشل الإرسال، نتجاهل الخطأ وننهي الدالة
                    }
                }

                // -----------------------------------------------------------------------------------------
                // 4. تنفيذ القرار (موافقة أو رفض) وتحديث الإيمبد
                // -----------------------------------------------------------------------------------------
                const originalTradeRequestMessageObject = interaction.message;
                const originalTradeRequestEmbedsArray = originalTradeRequestMessageObject.embeds;
                
                // سحب الإيمبد القديم لتعديله
                const oldTradeRequestEmbedObject = originalTradeRequestEmbedsArray[0];
                const successfullyUpdatedTradeEmbedObject = EmbedBuilder.from(oldTradeRequestEmbedObject);
                
                const authorizedInteractingUserIdString = interaction.user.id;
                
                // حالة الموافقة (Approve)
                if (isTradeApproveActionDetected === true) {
                    
                    const approveSuccessColorHexCode = '#3ba55d'; // لون أخضر
                    successfullyUpdatedTradeEmbedObject.setColor(approveSuccessColorHexCode);
                    
                    const statusDecisionFieldNameString = 'Status (الحالة):';
                    const statusDecisionFieldValueString = `**✅ Approved by <@${authorizedInteractingUserIdString}>**`;
                    
                    // إضافة حقل النتيجة للإيمبد
                    successfullyUpdatedTradeEmbedObject.addFields({ 
                        name: statusDecisionFieldNameString, 
                        value: statusDecisionFieldValueString 
                    });
                    
                } 
                // حالة الرفض (Reject)
                else if (isTradeRejectActionDetected === true) {
                    
                    const rejectFailureColorHexCode = '#ed4245'; // لون أحمر
                    successfullyUpdatedTradeEmbedObject.setColor(rejectFailureColorHexCode);
                    
                    const statusDecisionFieldNameString = 'Status (الحالة):';
                    const statusDecisionFieldValueString = `**❌ Rejected by <@${authorizedInteractingUserIdString}>**`;
                    
                    // إضافة حقل النتيجة للإيمبد
                    successfullyUpdatedTradeEmbedObject.addFields({ 
                        name: statusDecisionFieldNameString, 
                        value: statusDecisionFieldValueString 
                    });
                }

                // -----------------------------------------------------------------------------------------
                // 5. تحديث الرسالة وإزالة الأزرار لمنع الضغط مرة أخرى
                // -----------------------------------------------------------------------------------------
                try {
                    const emptyComponentsActionRowArrayToRemoveButtons = [];
                    
                    await interaction.update({ 
                        embeds: [successfullyUpdatedTradeEmbedObject], 
                        components: emptyComponentsActionRowArrayToRemoveButtons 
                    });
                } catch (updateTradeDecisionMessageException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Exception updating trade decision message: ", updateTradeDecisionMessageException);
                }
                
                return; // إنهاء التنفيذ بنجاح
            }
        }
// ======================================= نهاية الجزء 3 من السلسلة =======================================

              // =========================================================================================================
        // 🟢 القسم الخامس: زر تحميل الترانسكريبت المباشر (Direct Transcript Download)
        // عندما يضغط الإداري على زر "Direct Transcript" في روم اللوجات لتحميل المحادثة كملف HTML.
        // =========================================================================================================
        const isTranscriptButtonInteractionEvent = interaction.isButton();
        
        if (isTranscriptButtonInteractionEvent === true) {
            
            const rawTranscriptButtonCustomIdString = interaction.customId;
            const isDirectTranscriptActionDetected = (rawTranscriptButtonCustomIdString === 'direct_transcript_btn');
            
            if (isDirectTranscriptActionDetected === true) {
                
                // 1. تأجيل الرد فوراً (Immediate Deferral) لأن استخراج الترانسكريبت قد يستغرق ثواني
                try {
                    await interaction.deferReply({ ephemeral: true });
                } catch (deferTranscriptReplyException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Exception deferring transcript reply: ", deferTranscriptReplyException);
                }
                
                // 2. سحب اسم التكت من محتوى الرسالة التي تحتوي على الزر
                const interactionLogMessageObject = interaction.message;
                const logMessageContentTextString = interactionLogMessageObject.content;
                
                // تنظيف النص للحصول على اسم التكت فقط (مثال: ticket-001)
                let extractedTicketChannelNameString = logMessageContentTextString.replace('**📄 Transcript for ', '');
                extractedTicketChannelNameString = extractedTicketChannelNameString.replace('**', '');
                
                const currentLogChannelObject = interaction.channel;
                
                // 3. محاولة توليد ملف الترانسكريبت باستخدام المكتبة
                try {
                    const generatedHtmlFileAttachmentObject = await discordTranscripts.createTranscript(currentLogChannelObject, { 
                        limit: -1, // سحب جميع الرسائل بدون حد أقصى
                        returnType: 'attachment', // إرجاع كملف مرفق
                        filename: `${extractedTicketChannelNameString}.html`, // تسمية الملف باسم التكت
                        saveImages: true // حفظ الصور داخل الملف
                    });
                    
                    const successTranscriptDownloadMessage = '**✅ تفضل، هذا هو ملف الترانسكريبت المباشر:**';
                    
                    // إرسال الملف للإداري الذي ضغط على الزر في رسالة مخفية (Ephemeral)
                    await interaction.editReply({ 
                        content: successTranscriptDownloadMessage, 
                        files: [generatedHtmlFileAttachmentObject] 
                    });
                    
                } catch (transcriptGenerationException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Error generating direct transcript: ", transcriptGenerationException);
                    const errorTranscriptDownloadMessage = '**❌ عذراً، حدث خطأ أثناء محاولة استخراج الترانسكريبت.**';
                    
                    try {
                        await interaction.editReply({ 
                            content: errorTranscriptDownloadMessage 
                        });
                    } catch (editErrorReplyException) {
                        // التجاهل في حال فشل التعديل
                    }
                }
                
                return; // إنهاء التنفيذ لهذه المرحلة
            }
        }

        // =========================================================================================================
        // 🎟️ القسم السادس: فتح التكت من البانرات المتعددة (Multi-Panels Ticket Creation)
        // هذا هو المحرك الأساسي الذي يستجيب لضغطات الأعضاء على أزرار الدعم الفني لفتح تذاكر جديدة.
        // =========================================================================================================
        const isTicketOpenButtonInteractionEvent = interaction.isButton();
        
        if (isTicketOpenButtonInteractionEvent === true) {
            
            const rawTicketOpenButtonCustomIdString = interaction.customId;
            const isTicketOpenActionDetected = rawTicketOpenButtonCustomIdString.startsWith('ticket_open_');
            
            if (isTicketOpenActionDetected === true) {
                
                // 1. استخراج المعرف الحقيقي للزر من الداتابيز
                const extractedButtonRealIdString = rawTicketOpenButtonCustomIdString.replace('ticket_open_', '');
                
                let matchingTargetButtonDataObject = null;
                let matchingTargetPanelDataObject = null;
                
                // جلب جميع البانلات المسجلة لهذا السيرفر من قاعدة البيانات
                const configuredTicketPanelsArray = safeActiveGuildConfigDocument.ticketPanels;
                
                const hasConfiguredPanelsBoolean = (configuredTicketPanelsArray && configuredTicketPanelsArray.length > 0);
                
                if (hasConfiguredPanelsBoolean === true) {
                    
                    // البحث الدقيق في جميع البانلات عن الزر المضغوط
                    for (let panelIndexCounter = 0; panelIndexCounter < configuredTicketPanelsArray.length; panelIndexCounter++) {
                        
                        const currentIterationPanelObject = configuredTicketPanelsArray[panelIndexCounter];
                        const currentPanelButtonsArray = currentIterationPanelObject.buttons;
                        
                        const hasButtonsInCurrentPanel = (currentPanelButtonsArray && currentPanelButtonsArray.length > 0);
                        
                        if (hasButtonsInCurrentPanel === true) {
                            
                            for (let buttonIndexCounter = 0; buttonIndexCounter < currentPanelButtonsArray.length; buttonIndexCounter++) {
                                
                                const currentIterationButtonObject = currentPanelButtonsArray[buttonIndexCounter];
                                
                                const isThisThePressedButton = (currentIterationButtonObject.id === extractedButtonRealIdString);
                                
                                if (isThisThePressedButton === true) {
                                    matchingTargetButtonDataObject = currentIterationButtonObject;
                                    matchingTargetPanelDataObject = currentIterationPanelObject;
                                    break;
                                }
                            }
                        }
                        
                        // إذا وجدنا الزر، نوقف البحث في باقي البانلات
                        if (matchingTargetButtonDataObject !== null) {
                            break; 
                        }
                    }
                }
                
                // 2. إذا كان الزر محذوفاً أو غير موجود في قاعدة البيانات
                if (matchingTargetButtonDataObject === null) {
                    const noMatchingButtonMessageContent = '**❌ عذراً، هذا الزر لم يعد مسجلاً في قاعدة بيانات السيرفر (قد يكون تم حذفه).**';
                    
                    try {
                        return await interaction.reply({ 
                            content: noMatchingButtonMessageContent, 
                            ephemeral: true 
                        });
                    } catch (replyMissingButtonException) {
                        return;
                    }
                }

                // -----------------------------------------------------------------------------------------
                // 3. حماية (Anti-Spam): فحص الحد الأقصى للتكتات المسموح بها للعضو الواحد
                // -----------------------------------------------------------------------------------------
                let configuredMaximumTicketsAllowedNumber = safeActiveGuildConfigDocument.maxTicketsPerUser;
                
                // إذا لم يكن هناك حد أقصى مخصص، نجعله 1 كإجراء افتراضي آمن
                if (!configuredMaximumTicketsAllowedNumber || isNaN(configuredMaximumTicketsAllowedNumber)) {
                    configuredMaximumTicketsAllowedNumber = 1;
                }

                const allGuildChannelsCacheCollection = interaction.guild.channels.cache;
                const interactingUserIdString = interaction.user.id;
                
                // فلترة الرومات لحساب عدد التكتات المفتوحة التي يملكها هذا العضو تحديداً
                const existingOpenTicketsForUserCollection = allGuildChannelsCacheCollection.filter((channelObj) => {
                    
                    const currentChannelNameString = channelObj.name;
                    // التأكد من أن الروم هي تكت فعلاً (تبدأ بـ ticket-)
                    const isTicketNameFormatDetected = currentChannelNameString.startsWith('ticket-');
                    
                    let isOwnedByCurrentInteractingUser = false;
                    const currentChannelTopicString = channelObj.topic;
                    
                    // التحقق مما إذا كان أول أيدي في التوبيك يعود للعضو الحالي
                    const hasValidTopicString = (currentChannelTopicString !== null && typeof currentChannelTopicString !== 'undefined');
                    
                    if (hasValidTopicString === true) {
                        const startsWithUserIdBoolean = currentChannelTopicString.startsWith(interactingUserIdString);
                        if (startsWithUserIdBoolean === true) {
                            isOwnedByCurrentInteractingUser = true;
                        }
                    }
                    
                    // إرجاع النتيجة للفلتر (يجب أن تتحقق الشرطين)
                    const isUserTicketMatch = (isTicketNameFormatDetected === true && isOwnedByCurrentInteractingUser === true);
                    return isUserTicketMatch;
                });
                
                // حساب العدد الإجمالي
                const existingOpenTicketsCountNumber = existingOpenTicketsForUserCollection.size;
                
                // إذا تجاوز الحد الأقصى، نمنعه من فتح تكت جديد
                if (existingOpenTicketsCountNumber >= configuredMaximumTicketsAllowedNumber) {
                    
                    const maxTicketsReachedMessageContent = `**❌ عذراً، لقد وصلت للحد الأقصى المسموح به (${configuredMaximumTicketsAllowedNumber} تذكرة مفتوحة). يرجى إغلاق تذكرة سابقة أولاً.**`;
                    
                    try {
                        return await interaction.reply({ 
                            content: maxTicketsReachedMessageContent, 
                            ephemeral: true 
                        });
                    } catch (replyMaxTicketsException) {
                        return;
                    }
                }

                // -----------------------------------------------------------------------------------------
                // 4. معالجة نوع الزر (هل يفتح نافذة أسئلة Modal أم يفتح التكت مباشرة؟)
                // -----------------------------------------------------------------------------------------
                let hasConfiguredModalFieldsBoolean = false;
                const buttonConfiguredModalFieldsArray = matchingTargetButtonDataObject.modalFields;
                
                if (buttonConfiguredModalFieldsArray && buttonConfiguredModalFieldsArray.length > 0) {
                    hasConfiguredModalFieldsBoolean = true;
                }
                
                const doesButtonRequireModalBoolean = matchingTargetButtonDataObject.requireModal;
                
                // إذا كان الزر يتطلب نافذة ويحتوي فعلاً على أسئلة مبرمجة
                if (doesButtonRequireModalBoolean === true && hasConfiguredModalFieldsBoolean === true) {
                    
                    // بناء النافذة المنبثقة للأسئلة
                    const newTicketQuestionModalObject = new ModalBuilder();
                    
                    const generatedTicketModalCustomIdString = `modalticket_${extractedButtonRealIdString}`;
                    newTicketQuestionModalObject.setCustomId(generatedTicketModalCustomIdString);
                    
                    let configuredModalTitleString = matchingTargetButtonDataObject.modalTitle;
                    if (!configuredModalTitleString) {
                        configuredModalTitleString = 'بيانات التذكرة المطلوبة';
                    }
                    
                    newTicketQuestionModalObject.setTitle(configuredModalTitleString);

                    // إضافة الحقول (الأسئلة) للنافذة بناءً على الإعدادات في الداشبورد
                    for (let fieldIndexCounter = 0; fieldIndexCounter < buttonConfiguredModalFieldsArray.length; fieldIndexCounter++) {
                        
                        const currentFieldConfigurationObject = buttonConfiguredModalFieldsArray[fieldIndexCounter];
                        const newQuestionInputObject = new TextInputBuilder();
                        
                        const generatedFieldCustomIdString = `field_${fieldIndexCounter}`;
                        newQuestionInputObject.setCustomId(generatedFieldCustomIdString);
                        
                        // تأمين طول العنوان حتى لا يتجاوز الحد المسموح في ديسكورد (45 حرف)
                        let safeDisplayLabelString = currentFieldConfigurationObject.label;
                        if (safeDisplayLabelString.length > 45) {
                            safeDisplayLabelString = safeDisplayLabelString.substring(0, 45); 
                        }
                        
                        newQuestionInputObject.setLabel(safeDisplayLabelString);
                        
                        // تعيين نوع الحقل إلى نص طويل ليستوعب الإجابات الكاملة
                        const desiredTextInputStyleType = TextInputStyle.Paragraph;
                        newQuestionInputObject.setStyle(desiredTextInputStyleType);
                        
                        let safePlaceholderDisplayString = currentFieldConfigurationObject.placeholder;
                        if (!safePlaceholderDisplayString) {
                            safePlaceholderDisplayString = 'اكتب إجابتك هنا بوضوح...';
                        }
                        newQuestionInputObject.setPlaceholder(safePlaceholderDisplayString);
                        
                        // تحديد ما إذا كان السؤال إجبارياً أم لا
                        let isQuestionFieldRequiredBoolean = false;
                        if (currentFieldConfigurationObject.required === true || String(currentFieldConfigurationObject.required) === 'true') {
                            isQuestionFieldRequiredBoolean = true;
                        }
                        
                        newQuestionInputObject.setRequired(isQuestionFieldRequiredBoolean);
                        
                        // تجميع الحقل في صف العمليات وإضافته
                        const questionFieldActionRowObject = new ActionRowBuilder();
                        questionFieldActionRowObject.addComponents(newQuestionInputObject);
                        
                        newTicketQuestionModalObject.addComponents(questionFieldActionRowObject);
                    }
                    
                    // إظهار نافذة الأسئلة للعميل
                    try {
                        await interaction.showModal(newTicketQuestionModalObject);
                    } catch (showTicketModalException) {
                        console.log("[UNIVERSAL TICKET SYSTEM] Error showing ticket questions modal: ", showTicketModalException);
                    }
                    
                } else {
                    
                    // -----------------------------------------------------------------------------------------
                    // 5. في حال لم يكن الزر يحتاج نافذة، نفتح التكت فوراً
                    // -----------------------------------------------------------------------------------------
                    try {
                        // تأجيل الرد فوراً (Immediate Deferral) لأن فتح الروم يستغرق بعض الوقت
                        await interaction.deferReply({ ephemeral: true });
                    } catch (deferTicketCreationException) {
                        console.log("[UNIVERSAL TICKET SYSTEM] Exception deferring ticket creation reply: ", deferTicketCreationException);
                    }
                    
                    const emptyUserAnswersArray = []; // مصفوفة فارغة لأنه لا توجد أسئلة
                    
                    // استدعاء دالة بناء التكت الفعلية (سيتم تعريفها في الجزء الأخير)
                    await executeTicketCreationProcess(interaction, matchingTargetButtonDataObject, safeActiveGuildConfigDocument, emptyUserAnswersArray, matchingTargetPanelDataObject);
                }
            }
        }

        // =========================================================================================================
        // 📝 القسم السابع: استلام إجابات نافذة التكت (Modal Submit) وبدء إنشاء الروم
        // =========================================================================================================
        const isModalTicketSubmitInteractionEvent = interaction.isModalSubmit();
        
        if (isModalTicketSubmitInteractionEvent === true) {
            
            const rawModalTicketCustomIdString = interaction.customId;
            const isModalTicketSubmitActionDetected = rawModalTicketCustomIdString.startsWith('modalticket_');
            
            if (isModalTicketSubmitActionDetected === true) {
                
                // تأجيل الرد الصاروخي
                try {
                    await interaction.deferReply({ ephemeral: true });
                } catch (deferModalSubmitReplyException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Exception deferring modal submit reply: ", deferModalSubmitReplyException);
                }

                // استخراج المعرف الأصلي للزر
                const extractedButtonRealIdFromModalString = rawModalTicketCustomIdString.replace('modalticket_', '');
                
                let confirmedTargetButtonDataObject = null;
                let confirmedTargetPanelDataObject = null;
                
                const configuredTicketPanelsArray = safeActiveGuildConfigDocument.ticketPanels;
                
                // البحث العكسي لإيجاد البانل والزر بناءً على الإجابات
                if (configuredTicketPanelsArray && configuredTicketPanelsArray.length > 0) {
                    
                    for (let panelIndexCounter = 0; panelIndexCounter < configuredTicketPanelsArray.length; panelIndexCounter++) {
                        
                        const currentIterationPanelObject = configuredTicketPanelsArray[panelIndexCounter];
                        const currentPanelButtonsArray = currentIterationPanelObject.buttons;
                        
                        if (currentPanelButtonsArray && currentPanelButtonsArray.length > 0) {
                            
                            for (let buttonIndexCounter = 0; buttonIndexCounter < currentPanelButtonsArray.length; buttonIndexCounter++) {
                                
                                const currentIterationButtonObject = currentPanelButtonsArray[buttonIndexCounter];
                                
                                if (currentIterationButtonObject.id === extractedButtonRealIdFromModalString) {
                                    confirmedTargetButtonDataObject = currentIterationButtonObject;
                                    confirmedTargetPanelDataObject = currentIterationPanelObject;
                                    break;
                                }
                            }
                        }
                        
                        if (confirmedTargetButtonDataObject !== null) {
                            break;
                        }
                    }
                }
                
                if (confirmedTargetButtonDataObject === null) {
                    return; // إيقاف التنفيذ إذا كان الزر قد تم حذفه أثناء إجابة العميل
                }
                
                // -----------------------------------------------------------------------------------------
                // تجميع إجابات العضو وتجهيزها للإرسال داخل التكت
                // -----------------------------------------------------------------------------------------
                const collectedUserAnswersArray = [];
                const buttonConfiguredModalFieldsArray = confirmedTargetButtonDataObject.modalFields;
                
                for (let fieldIndexCounter = 0; fieldIndexCounter < buttonConfiguredModalFieldsArray.length; fieldIndexCounter++) {
                    
                    const currentFieldConfigurationObject = buttonConfiguredModalFieldsArray[fieldIndexCounter];
                    const generatedFieldCustomIdString = `field_${fieldIndexCounter}`;
                    
                    // استخراج الإجابة
                    const writtenAnswerValueString = interaction.fields.getTextInputValue(generatedFieldCustomIdString);
                    
                    // بناء كائن الإجابة
                    const answerObjectToStore = {
                        label: currentFieldConfigurationObject.label,
                        value: writtenAnswerValueString
                    };
                    
                    collectedUserAnswersArray.push(answerObjectToStore);
                }
                
                // استدعاء دالة بناء التكت الفعلية
                await executeTicketCreationProcess(interaction, confirmedTargetButtonDataObject, safeActiveGuildConfigDocument, collectedUserAnswersArray, confirmedTargetPanelDataObject);
            }
        }
// ======================================= نهاية الجزء 4 من السلسلة =======================================

              // =========================================================================================================
        // ⚙️ القسم الثامن: أزرار التحكم داخل التذكرة (Close, Claim, Delete, Reopen, Add User)
        // يتم معالجة جميع تفاعلات الأزرار التي تظهر داخل التكت، مع تطبيق حماية صارمة وسرعة استجابة فائقة.
        // =========================================================================================================
        const isTicketControlButtonInteractionEvent = interaction.isButton();
        
        if (isTicketControlButtonInteractionEvent === true) {
            
            const rawControlButtonCustomIdString = interaction.customId;
            const currentTicketChannelObject = interaction.channel;
            
            // -----------------------------------------------------------------------------------------
            // 🔒 1. زر الإغلاق المبدئي (Ticket Close) - يطلب تأكيداً لمنع الإغلاق بالخطأ
            // -----------------------------------------------------------------------------------------
            if (rawControlButtonCustomIdString === 'ticket_close') {
                
                const closeConfirmationActionRowObject = new ActionRowBuilder();
                
                const confirmTicketCloseButtonObject = new ButtonBuilder();
                confirmTicketCloseButtonObject.setCustomId('confirm_close');
                confirmTicketCloseButtonObject.setLabel('Confirm Close (تأكيد القفل)');
                confirmTicketCloseButtonObject.setStyle(ButtonStyle.Danger);
                
                const cancelTicketCloseButtonObject = new ButtonBuilder();
                cancelTicketCloseButtonObject.setCustomId('cancel_close');
                cancelTicketCloseButtonObject.setLabel('Cancel (إلغاء)');
                cancelTicketCloseButtonObject.setStyle(ButtonStyle.Secondary);
                
                closeConfirmationActionRowObject.addComponents(confirmTicketCloseButtonObject, cancelTicketCloseButtonObject);
                
                const closingWarningMessageString = '**⚠️ هل أنت متأكد من رغبتك في إغلاق هذه التذكرة؟**';
                
                try {
                    await interaction.reply({ 
                        content: closingWarningMessageString, 
                        components: [closeConfirmationActionRowObject], 
                        ephemeral: true 
                    });
                } catch (replyCloseWarningException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Exception replying with close confirmation: ", replyCloseWarningException);
                }
                
                return;
            }

            // -----------------------------------------------------------------------------------------
            // ❌ 2. زر إلغاء الإغلاق (Cancel Close)
            // -----------------------------------------------------------------------------------------
            if (rawControlButtonCustomIdString === 'cancel_close') {
                
                const operationCancelledMessageString = '**✅ تم إلغاء عملية الإغلاق.**';
                
                try {
                    await interaction.update({ 
                        content: operationCancelledMessageString, 
                        components: [] 
                    });
                } catch (updateCancelCloseException) {
                    // التجاهل بأمان
                }
                
                return;
            }

            // -----------------------------------------------------------------------------------------
            // ✅ 3. تأكيد الإغلاق الفعلي (Confirm Close) - السرعة الصاروخية
            // -----------------------------------------------------------------------------------------
            if (rawControlButtonCustomIdString === 'confirm_close') {
                
                // 🔥 السرعة الصاروخية: تحديث الرسالة فوراً لمسح الأزرار وإعلام الإداري ببدء العملية
                const startingCloseOperationMessage = '**🔒 جاري إغلاق التكت وسحب الصلاحيات...**';
                
                try {
                    await interaction.update({ 
                        content: startingCloseOperationMessage,
                        components: [] 
                    }); 
                } catch (updateConfirmCloseException) {}
                
                // 1. استخراج بيانات التكت من الوصف (Topic)
                let currentChannelTopicString = currentTicketChannelObject.topic;
                if (!currentChannelTopicString) {
                    currentChannelTopicString = '';
                }
                
                // صيغة التوبيك: OwnerId_ButtonId_ClaimerId_AddedUsers_CloserId_IsMiddleMan
                const parsedTopicDataArray = currentChannelTopicString.split('_');
                
                const originalTicketOwnerIdString = parsedTopicDataArray[0];
                const usedButtonRealIdString = parsedTopicDataArray[1];
                
                let claimedByAdminUserIdString = null;
                if (parsedTopicDataArray.length > 2 && parsedTopicDataArray[2] !== 'none') {
                    claimedByAdminUserIdString = parsedTopicDataArray[2];
                }
                
                let isMiddleManTicketBoolean = false;
                if (parsedTopicDataArray.length > 5 && parsedTopicDataArray[5] === 'true') {
                    isMiddleManTicketBoolean = true;
                }

                // 2. تغيير اسم الروم لتدل على أنها مغلقة (closed-001)
                const currentChannelNameTextString = currentTicketChannelObject.name;
                const channelNameSplitPartsArray = currentChannelNameTextString.split('-');
                
                let ticketSequenceNumberString = channelNameSplitPartsArray[1];
                if (!ticketSequenceNumberString) {
                    ticketSequenceNumberString = '0';
                }
                
                const newlyClosedChannelNameString = `closed-${ticketSequenceNumberString}`;
                
                try {
                    await currentTicketChannelObject.setName(newlyClosedChannelNameString);
                } catch (setChannelNameException) {}

                // 3. إعلان الإغلاق في الروم
                const closingAdminUserIdString = interaction.user.id;
                const officialClosingNotificationMessage = `**🔒 تم إغلاق التذكرة بواسطة <@${closingAdminUserIdString}>**`;
                
                try {
                    await currentTicketChannelObject.send(officialClosingNotificationMessage);
                } catch (sendClosingNotificationException) {}

                // 4. سحب الصلاحيات من صاحب التكت لكي لا يرى التكت المغلق
                if (originalTicketOwnerIdString && originalTicketOwnerIdString !== 'none') {
                    try {
                        await currentTicketChannelObject.permissionOverwrites.edit(originalTicketOwnerIdString, { 
                            SendMessages: false, 
                            ViewChannel: false 
                        });
                    } catch (removeOwnerPermissionsException) {
                        console.log("[UNIVERSAL TICKET SYSTEM] Could not remove owner permissions.");
                    }
                }

                // 5. تحديث التوبيك لتسجيل من قام بالإغلاق
                while(parsedTopicDataArray.length < 6) {
                    parsedTopicDataArray.push('none');
                }
                
                parsedTopicDataArray[4] = closingAdminUserIdString; // الخانة الخاصة بالـ Closer
                
                const newlyUpdatedTopicStringForChannel = parsedTopicDataArray.join('_');
                
                try {
                    await currentTicketChannelObject.setTopic(newlyUpdatedTopicStringForChannel);
                } catch (setNewTopicException) {}

                // -----------------------------------------------------------------------------------------
                // 🌟 إرسال تقييم الإدارة (بشرط ألا يكون التكت وساطة، وأن يكون التقييم مفعلاً)
                // -----------------------------------------------------------------------------------------
                let specificButtonConfigurationObject = null;
                const configuredTicketPanelsArray = safeActiveGuildConfigDocument.ticketPanels;
                
                if (configuredTicketPanelsArray && configuredTicketPanelsArray.length > 0) {
                    for (let panelIndex = 0; panelIndex < configuredTicketPanelsArray.length; panelIndex++) {
                        const panelIterationObject = configuredTicketPanelsArray[panelIndex];
                        const panelButtonsIterationArray = panelIterationObject.buttons;
                        
                        if (panelButtonsIterationArray && panelButtonsIterationArray.length > 0) {
                            for (let buttonIndex = 0; buttonIndex < panelButtonsIterationArray.length; buttonIndex++) {
                                const currentButtonIterationObject = panelButtonsIterationArray[buttonIndex];
                                
                                if (currentButtonIterationObject.id === usedButtonRealIdString) {
                                    specificButtonConfigurationObject = currentButtonIterationObject;
                                    break;
                                }
                            }
                        }
                        if (specificButtonConfigurationObject) { break; }
                    }
                }

                let shouldSendStaffRatingBoolean = true;
                
                // إلغاء تقييم الإدارة إذا كان تكت وساطة (حتى لا يتم التقييم مرتين)
                if (isMiddleManTicketBoolean === true || (specificButtonConfigurationObject && specificButtonConfigurationObject.isMiddleMan === true)) {
                    shouldSendStaffRatingBoolean = false; 
                } else if (specificButtonConfigurationObject && specificButtonConfigurationObject.enableRating === false) {
                    shouldSendStaffRatingBoolean = false; // إذا كان الأونر معطل التقييم من الداشبورد لهذا الزر
                }

                const hasStaffRatingChannelConfigured = safeActiveGuildConfigDocument.staffRatingChannelId;
                
                if (shouldSendStaffRatingBoolean === true && originalTicketOwnerIdString && claimedByAdminUserIdString && hasStaffRatingChannelConfigured) {
                    
                    try {
                        const interactionGuildCurrentObject = interaction.guild;
                        const originalTicketOwnerUserObject = await interactionGuildCurrentObject.members.fetch(originalTicketOwnerIdString);
                        const dynamicGuildNameTextString = interactionGuildCurrentObject.name;
                        
                        const staffRatingEmbedObject = new EmbedBuilder();
                        
                        let customRatingEmbedTitleString = '';
                        let customRatingEmbedDescriptionString = '';
                        
                        const isCustomRatingStyleEnabled = (safeActiveGuildConfigDocument.ratingStyle === 'custom');
                        const hasCustomRatingTextConfigured = safeActiveGuildConfigDocument.customRatingText;
                        
                        if (isCustomRatingStyleEnabled === true && hasCustomRatingTextConfigured) {
                            
                            customRatingEmbedTitleString = safeActiveGuildConfigDocument.customRatingTitle;
                            if (!customRatingEmbedTitleString) {
                                customRatingEmbedTitleString = 'تقييم فريق العمل';
                            }
                            
                            customRatingEmbedDescriptionString = safeActiveGuildConfigDocument.customRatingText;
                            customRatingEmbedDescriptionString = customRatingEmbedDescriptionString.replace(/\[staff\]/g, `<@${claimedByAdminUserIdString}>`);
                            customRatingEmbedDescriptionString = customRatingEmbedDescriptionString.replace(/\[user\]/g, `<@${originalTicketOwnerUserObject.id}>`);
                            customRatingEmbedDescriptionString = customRatingEmbedDescriptionString.replace(/\[server\]/g, dynamicGuildNameTextString);
                            
                        } else {
                            customRatingEmbedTitleString = 'تقييم فريق العمل';
                            customRatingEmbedDescriptionString = `شكرا لتواصلك مع الدعم الفني الخاص بسيرفر **${dynamicGuildNameTextString}**\n\n`;
                            customRatingEmbedDescriptionString += `يرجى تقييم مستوى الخدمة التي تلقيتها من <@${claimedByAdminUserIdString}>، رأيك يهمنا ويساعدنا في تحسين جودة الخدمة.`;
                        }
                        
                        staffRatingEmbedObject.setTitle(customRatingEmbedTitleString);
                        staffRatingEmbedObject.setDescription(customRatingEmbedDescriptionString);
                        
                        let staffRatingColorHexCode = safeActiveGuildConfigDocument.staffRatingColor;
                        if (!staffRatingColorHexCode) {
                            staffRatingColorHexCode = '#3ba55d';
                        }
                        staffRatingEmbedObject.setColor(staffRatingColorHexCode);
                        
                        const currentGuildIconUrlString = interactionGuildCurrentObject.iconURL({ dynamic: true });
                        staffRatingEmbedObject.setFooter({ 
                            text: dynamicGuildNameTextString, 
                            iconURL: currentGuildIconUrlString 
                        });
                        staffRatingEmbedObject.setTimestamp();
                        
                        // بناء أزرار التقييم وتمرير الداتا فيها
                        const ratingStarsActionRowObject = new ActionRowBuilder();
                        const dynamicGuildIdString = interactionGuildCurrentObject.id;
                        
                        const star1ButtonObj = new ButtonBuilder().setCustomId(`rate_staff_1_${claimedByAdminUserIdString}_${dynamicGuildIdString}`).setLabel('⭐').setStyle(ButtonStyle.Secondary);
                        const star2ButtonObj = new ButtonBuilder().setCustomId(`rate_staff_2_${claimedByAdminUserIdString}_${dynamicGuildIdString}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary);
                        const star3ButtonObj = new ButtonBuilder().setCustomId(`rate_staff_3_${claimedByAdminUserIdString}_${dynamicGuildIdString}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        const star4ButtonObj = new ButtonBuilder().setCustomId(`rate_staff_4_${claimedByAdminUserIdString}_${dynamicGuildIdString}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        const star5ButtonObj = new ButtonBuilder().setCustomId(`rate_staff_5_${claimedByAdminUserIdString}_${dynamicGuildIdString}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                        
                        ratingStarsActionRowObject.addComponents(star1ButtonObj, star2ButtonObj, star3ButtonObj, star4ButtonObj, star5ButtonObj);
                        
                        await originalTicketOwnerUserObject.send({ 
                            embeds: [staffRatingEmbedObject], 
                            components: [ratingStarsActionRowObject] 
                        });
                        
                    } catch (sendRatingToUserException) { 
                        console.log("[UNIVERSAL TICKET SYSTEM] Could not send rating to user. DM might be closed.");
                    }
                }

                // -----------------------------------------------------------------------------------------
                // 🖥️ بناء بانل التحكم (Control Panel) مطابق للصور تماماً
                // -----------------------------------------------------------------------------------------
                const closedTicketControlEmbedObject = new EmbedBuilder();
                
                const controlPanelTitleString = 'Ticket control';
                closedTicketControlEmbedObject.setTitle(controlPanelTitleString);
                
                const controlPanelDescriptionString = `Closed By: <@${closingAdminUserIdString}>\n(${closingAdminUserIdString})`;
                closedTicketControlEmbedObject.setDescription(controlPanelDescriptionString);
                
                let configuredCloseEmbedColorHex = safeActiveGuildConfigDocument.closeEmbedColor;
                if (!configuredCloseEmbedColorHex) {
                    configuredCloseEmbedColorHex = '#2b2d31';
                }
                closedTicketControlEmbedObject.setColor(configuredCloseEmbedColorHex);
                
                // الصف الأول: إعادة فتح (رمادي) وحذف مباشر (أحمر)
                const controlPanelActionRow1Object = new ActionRowBuilder();
                
                const reopenTicketButtonObject = new ButtonBuilder();
                reopenTicketButtonObject.setCustomId('ticket_reopen');
                reopenTicketButtonObject.setLabel('Reopen ticket');
                reopenTicketButtonObject.setStyle(ButtonStyle.Secondary);
                
                const directDeleteTicketButtonObject = new ButtonBuilder();
                directDeleteTicketButtonObject.setCustomId('ticket_delete');
                directDeleteTicketButtonObject.setLabel('Delete ticket');
                directDeleteTicketButtonObject.setStyle(ButtonStyle.Danger);
                
                controlPanelActionRow1Object.addComponents(reopenTicketButtonObject, directDeleteTicketButtonObject);
                
                // الصف الثاني: حذف مع سبب (أحمر) ليكون عريضاً وبارزاً
                const controlPanelActionRow2Object = new ActionRowBuilder();
                
                const deleteWithReasonButtonObject = new ButtonBuilder();
                deleteWithReasonButtonObject.setCustomId('ticket_delete_reason');
                deleteWithReasonButtonObject.setLabel('Delete With Reason');
                deleteWithReasonButtonObject.setStyle(ButtonStyle.Danger);
                
                controlPanelActionRow2Object.addComponents(deleteWithReasonButtonObject);
                
                // إرسال البانل في الروم
                try {
                    await currentTicketChannelObject.send({ 
                        embeds: [closedTicketControlEmbedObject], 
                        components: [controlPanelActionRow1Object, controlPanelActionRow2Object] 
                    });
                } catch (sendControlPanelException) {}
                
                return;
            }

            // -----------------------------------------------------------------------------------------
            // 🕵️‍♂️ 4. زر الاستلام (Claim) مع نظام العزل والإخفاء للإدارة
            // -----------------------------------------------------------------------------------------
            if (rawControlButtonCustomIdString === 'ticket_claim') {
                
                // البحث عن إعدادات الزر الذي تم فتح التكت منه
                let currentTopicStringForClaim = currentTicketChannelObject.topic;
                if (!currentTopicStringForClaim) {
                    currentTopicStringForClaim = '';
                }
                
                const topicDataArrayForClaim = currentTopicStringForClaim.split('_');
                const sourceButtonIdString = topicDataArrayForClaim[1];
                
                let targetButtonSettingsObject = null;
                const panelsArrayForClaim = safeActiveGuildConfigDocument.ticketPanels;
                
                if (panelsArrayForClaim && panelsArrayForClaim.length > 0) {
                    for (let pIndex = 0; pIndex < panelsArrayForClaim.length; pIndex++) {
                        const pBtns = panelsArrayForClaim[pIndex].buttons;
                        if (pBtns && pBtns.length > 0) {
                            for (let bIndex = 0; bIndex < pBtns.length; bIndex++) {
                                if (pBtns[bIndex].id === sourceButtonIdString) {
                                    targetButtonSettingsObject = pBtns[bIndex];
                                    break;
                                }
                            }
                        }
                        if (targetButtonSettingsObject) { break; }
                    }
                }

                // تحديد من يحق له عمل Claim
                let rolesAllowedToClaimArray = [];
                const hasCustomClaimRolesArray = (targetButtonSettingsObject && targetButtonSettingsObject.allowedClaimRoles && targetButtonSettingsObject.allowedClaimRoles.length > 0);
                
                if (hasCustomClaimRolesArray === true) {
                    rolesAllowedToClaimArray = targetButtonSettingsObject.allowedClaimRoles;
                } else {
                    const defaultStaffRolesArray = [
                        safeActiveGuildConfigDocument.adminRoleId, 
                        safeActiveGuildConfigDocument.middlemanRoleId,
                        ...safeActiveGuildConfigDocument.highAdminRoles, 
                        ...safeActiveGuildConfigDocument.highMiddlemanRoles
                    ];
                    
                    for (let rIndex = 0; rIndex < defaultStaffRolesArray.length; rIndex++) {
                        if (defaultStaffRolesArray[rIndex]) {
                            rolesAllowedToClaimArray.push(defaultStaffRolesArray[rIndex]);
                        }
                    }
                }

                // فحص الصلاحية
                let hasPermissionToClaimBoolean = false;
                const interactorMemberObject = interaction.member;
                
                if (interactorMemberObject.permissions.has('Administrator') === true) {
                    hasPermissionToClaimBoolean = true;
                } else {
                    for (let rIndex = 0; rIndex < rolesAllowedToClaimArray.length; rIndex++) {
                        if (interactorMemberObject.roles.cache.has(rolesAllowedToClaimArray[rIndex])) {
                            hasPermissionToClaimBoolean = true;
                            break;
                        }
                    }
                }

                if (hasPermissionToClaimBoolean === false) {
                    const claimDeniedMessageString = '**❌ عذراً، لا تمتلك صلاحية استلام هذا التكت.**';
                    try {
                        return await interaction.reply({ content: claimDeniedMessageString, ephemeral: true });
                    } catch (replyClaimDeniedException) { return; }
                }

                // 🔥 التحديث الفوري للزر لمنع التعليق
                const originalTicketMessageObject = interaction.message;
                const currentComponentsRowsArray = originalTicketMessageObject.components;
                const newlyUpdatedComponentsRowsArray = [];
                
                for (let rIndex = 0; rIndex < currentComponentsRowsArray.length; rIndex++) {
                    const oldRowObject = currentComponentsRowsArray[rIndex];
                    const newRowObject = new ActionRowBuilder();
                    
                    for (let bIndex = 0; bIndex < oldRowObject.components.length; bIndex++) {
                        const oldButtonObj = oldRowObject.components[bIndex];
                        const clonedButtonObj = ButtonBuilder.from(oldButtonObj);
                        
                        if (oldButtonObj.customId === 'ticket_claim') {
                            clonedButtonObj.setDisabled(true); 
                            clonedButtonObj.setStyle(ButtonStyle.Success);
                            clonedButtonObj.setLabel('Claimed (تم الاستلام)');
                        }
                        
                        newRowObject.addComponents(clonedButtonObj);
                    }
                    newlyUpdatedComponentsRowsArray.push(newRowObject);
                }
                
                try {
                    await interaction.update({ components: newlyUpdatedComponentsRowsArray });
                } catch (updateClaimButtonException) {}
                
                const claimSuccessAnnouncementMessage = `**✅ تم استلام التكت وبدء العمل عليه بواسطة <@${interaction.user.id}>**`;
                
                try {
                    await currentTicketChannelObject.send(claimSuccessAnnouncementMessage);
                } catch (sendClaimAnnouncementException) {}

                // 🔥 تطبيق هندسة الإخفاء (Hide) أو القراءة فقط (Read-Only)
                const currentChannelOverwritesCollection = currentTicketChannelObject.permissionOverwrites.cache;
                const pendingOverwritesDataArray = [];
                
                currentChannelOverwritesCollection.forEach((overwriteObj) => {
                    const mappedOverwriteObject = {
                        id: overwriteObj.id,
                        allow: overwriteObj.allow.toArray(),
                        deny: overwriteObj.deny.toArray()
                    };
                    pendingOverwritesDataArray.push(mappedOverwriteObject);
                });

                for (let rIndex = 0; rIndex < rolesAllowedToClaimArray.length; rIndex++) {
                    
                    const specificStaffRoleIdString = rolesAllowedToClaimArray[rIndex];
                    let specificRoleOverwriteObject = null;
                    
                    for (let arrayIndex = 0; arrayIndex < pendingOverwritesDataArray.length; arrayIndex++) {
                        if (pendingOverwritesDataArray[arrayIndex].id === specificStaffRoleIdString) {
                            specificRoleOverwriteObject = pendingOverwritesDataArray[arrayIndex];
                            break;
                        }
                    }
                    
                    if (!specificRoleOverwriteObject) {
                        specificRoleOverwriteObject = { id: specificStaffRoleIdString, allow: [], deny: [] };
                        pendingOverwritesDataArray.push(specificRoleOverwriteObject);
                    }
                    
                    const hideTicketSettingEnabledBoolean = safeActiveGuildConfigDocument.hideTicketOnClaim;
                    const readOnlySettingEnabledBoolean = safeActiveGuildConfigDocument.readOnlyStaffOnClaim;
                    
                    if (hideTicketSettingEnabledBoolean === true) {
                        // إخفاء التكت تماماً عن باقي الإدارة
                        if (specificRoleOverwriteObject.deny.includes('ViewChannel') === false) {
                            specificRoleOverwriteObject.deny.push('ViewChannel');
                        }
                        specificRoleOverwriteObject.allow = specificRoleOverwriteObject.allow.filter(perm => perm !== 'ViewChannel');
                        
                    } else if (readOnlySettingEnabledBoolean === true) {
                        // سحب صلاحية الكتابة فقط
                        if (specificRoleOverwriteObject.allow.includes('ViewChannel') === false) {
                            specificRoleOverwriteObject.allow.push('ViewChannel');
                        }
                        if (specificRoleOverwriteObject.deny.includes('SendMessages') === false) {
                            specificRoleOverwriteObject.deny.push('SendMessages');
                        }
                        specificRoleOverwriteObject.allow = specificRoleOverwriteObject.allow.filter(perm => perm !== 'SendMessages');
                    }
                }
                
                // إعطاء صلاحيات كاملة للشخص الذي ضغط على زر الاستلام
                let claimerOverwriteObject = null;
                const interactingClaimerIdString = interaction.user.id;
                
                for (let arrayIndex = 0; arrayIndex < pendingOverwritesDataArray.length; arrayIndex++) {
                    if (pendingOverwritesDataArray[arrayIndex].id === interactingClaimerIdString) {
                        claimerOverwriteObject = pendingOverwritesDataArray[arrayIndex];
                        break;
                    }
                }
                
                if (!claimerOverwriteObject) {
                    const newClaimerPermObject = { 
                        id: interactingClaimerIdString, 
                        allow: ['ViewChannel', 'SendMessages'], 
                        deny: [] 
                    };
                    pendingOverwritesDataArray.push(newClaimerPermObject);
                } else {
                    if (claimerOverwriteObject.allow.includes('ViewChannel') === false) {
                        claimerOverwriteObject.allow.push('ViewChannel');
                    }
                    if (claimerOverwriteObject.allow.includes('SendMessages') === false) {
                        claimerOverwriteObject.allow.push('SendMessages');
                    }
                }

                try {
                    await currentTicketChannelObject.permissionOverwrites.set(pendingOverwritesDataArray);
                } catch (applyOverwritesException) {}
                
                // تحديث التوبيك لحفظ من استلم التكت
                while(topicDataArrayForClaim.length < 6) {
                    topicDataArrayForClaim.push('none');
                }
                topicDataArrayForClaim[2] = interactingClaimerIdString;
                
                const updatedTopicWithClaimerString = topicDataArrayForClaim.join('_');
                try {
                    await currentTicketChannelObject.setTopic(updatedTopicWithClaimerString);
                } catch (setTopicClaimException) {}
                
                return;
            }
// ======================================= نهاية الجزء 5 من السلسلة =======================================

        // -----------------------------------------------------------------------------------------
            // 🔓 5. زر إعادة فتح التذكرة (Reopen Ticket)
            // -----------------------------------------------------------------------------------------
            if (rawControlButtonCustomIdString === 'ticket_reopen') {
                
                // استخراج بيانات التكت من التوبيك لمعرفة الأيدي الخاص بالمالك
                let currentTopicStringForReopen = currentTicketChannelObject.topic;
                if (!currentTopicStringForReopen) {
                    currentTopicStringForReopen = '';
                }
                
                const topicDataArrayForReopen = currentTopicStringForReopen.split('_');
                const originalTicketOwnerUserIdString = topicDataArrayForReopen[0];
                
                // إعادة صلاحيات الرؤية والكتابة لصاحب التذكرة الأصلي
                if (originalTicketOwnerUserIdString && originalTicketOwnerUserIdString !== 'none') {
                    try {
                        await currentTicketChannelObject.permissionOverwrites.edit(originalTicketOwnerUserIdString, { 
                            SendMessages: true, 
                            ViewChannel: true 
                        });
                    } catch (restoreOwnerPermissionsException) {
                        console.log("[UNIVERSAL TICKET SYSTEM] Exception restoring owner permissions on reopen: ", restoreOwnerPermissionsException);
                    }
                }
                
                // تغيير اسم الروم للعودة إلى حالة التكت المفتوح
                const currentClosedChannelNameString = currentTicketChannelObject.name;
                const channelNameSplitArray = currentClosedChannelNameString.split('-');
                
                let existingTicketSequenceNumberString = channelNameSplitArray[1];
                if (!existingTicketSequenceNumberString) {
                    existingTicketSequenceNumberString = '0';
                }
                
                const newlyOpenedChannelNameString = `ticket-${existingTicketSequenceNumberString}`;
                
                try {
                    await currentTicketChannelObject.setName(newlyOpenedChannelNameString);
                } catch (reopenChannelRenameException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Exception renaming channel on reopen: ", reopenChannelRenameException);
                }
                
                // الرد برسالة تأكيد إعادة الفتح
                const successfullyReopenedMessageContent = '**✅ تم إعادة فتح التذكرة بنجاح.**';
                
                try {
                    await interaction.reply({ 
                        content: successfullyReopenedMessageContent 
                    });
                } catch (replyReopenSuccessException) {}
                
                // حذف رسالة الكنترول بانل لتنظيف التكت
                const controlPanelInteractionMessageObject = interaction.message;
                
                try {
                    await controlPanelInteractionMessageObject.delete();
                } catch (deleteControlPanelMessageException) {}
                
                return; // إنهاء التنفيذ لهذه المرحلة
            }

            // -----------------------------------------------------------------------------------------
            // 🗑️ 6. زر الحذف المباشر (Direct Delete Ticket) - بدون طلب سبب
            // -----------------------------------------------------------------------------------------
            if (rawControlButtonCustomIdString === 'ticket_delete') {
                
                const imminentDeletionMessageContent = '**🗑️ جاري تجهيز الترانسكريبت وحذف التذكرة خلال ثوانٍ معدودة...**';
                
                try {
                    // الرد السريع لمنع تعليق الزر
                    await interaction.reply({ 
                        content: imminentDeletionMessageContent, 
                        ephemeral: true 
                    });
                } catch (replyDirectDeleteException) {}
                
                const interactionExecutorUserObject = interaction.user;
                const defaultDeletionReasonTextString = "حذف يدوي مباشر (Manual Delete)";
                
                // استدعاء دالة الحذف واللوج (سيتم برمجتها في الجزء السابع والأخير)
                await executeTicketDeletionAndLoggingProcess(currentTicketChannelObject, interactionExecutorUserObject, safeActiveGuildConfigDocument, defaultDeletionReasonTextString);
                
                return;
            }

            // -----------------------------------------------------------------------------------------
            // 📝 7. زر الحذف مع كتابة سبب (Delete With Reason) - يفتح نافذة Modal
            // -----------------------------------------------------------------------------------------
            if (rawControlButtonCustomIdString === 'ticket_delete_reason') {
                
                // بناء نافذة طلب سبب الحذف
                const requestDeleteReasonModalObject = new ModalBuilder();
                
                const deleteReasonModalCustomIdString = 'modal_delete_reason';
                requestDeleteReasonModalObject.setCustomId(deleteReasonModalCustomIdString);
                
                const deleteReasonModalTitleString = 'سبب حذف التذكرة (Delete Reason)';
                requestDeleteReasonModalObject.setTitle(deleteReasonModalTitleString);
                
                // بناء حقل الإدخال النصي للسبب
                const deletionReasonTextInputObject = new TextInputBuilder();
                
                const reasonInputCustomIdString = 'delete_reason_input_field';
                deletionReasonTextInputObject.setCustomId(reasonInputCustomIdString);
                
                const reasonInputLabelString = 'يرجى كتابة سبب الحذف هنا:';
                deletionReasonTextInputObject.setLabel(reasonInputLabelString);
                
                // نص قصير يكفي لكتابة السبب
                const reasonInputStyleType = TextInputStyle.Short;
                deletionReasonTextInputObject.setStyle(reasonInputStyleType);
                
                // جعل الحقل إجبارياً
                const isReasonInputRequiredBoolean = true;
                deletionReasonTextInputObject.setRequired(isReasonInputRequiredBoolean);
                
                // تجميع الحقل وعرض النافذة
                const deleteReasonActionRowObject = new ActionRowBuilder();
                deleteReasonActionRowObject.addComponents(deletionReasonTextInputObject);
                
                requestDeleteReasonModalObject.addComponents(deleteReasonActionRowObject);
                
                try {
                    await interaction.showModal(requestDeleteReasonModalObject);
                } catch (showDeleteReasonModalException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Exception showing delete reason modal: ", showDeleteReasonModalException);
                }
                
                return;
            }

            // -----------------------------------------------------------------------------------------
            // ➕ 8. زر إضافة عضو آخر إلى التذكرة (Add User) - يفتح نافذة Modal
            // -----------------------------------------------------------------------------------------
            if (rawControlButtonCustomIdString === 'ticket_add_user') {
                
                // بناء نافذة طلب الأيدي الخاص بالعضو
                const requestAddUserModalObject = new ModalBuilder();
                
                const addUserModalCustomIdString = 'modal_add_user_to_ticket';
                requestAddUserModalObject.setCustomId(addUserModalCustomIdString);
                
                const addUserModalTitleString = 'إضافة عضو للتذكرة (Add User)';
                requestAddUserModalObject.setTitle(addUserModalTitleString);
                
                // بناء حقل الإدخال النصي للأيدي
                const targetUserIdTextInputObject = new TextInputBuilder();
                
                const targetUserIdInputCustomIdString = 'user_id_to_add_field';
                targetUserIdTextInputObject.setCustomId(targetUserIdInputCustomIdString);
                
                const targetUserIdInputLabelString = 'أيدي العضو (User ID):';
                targetUserIdTextInputObject.setLabel(targetUserIdInputLabelString);
                
                // نص قصير يكفي لكتابة الأيدي
                const userIdInputStyleType = TextInputStyle.Short;
                targetUserIdTextInputObject.setStyle(userIdInputStyleType);
                
                const isUserIdInputRequiredBoolean = true;
                targetUserIdTextInputObject.setRequired(isUserIdInputRequiredBoolean);
                
                // تجميع الحقل وعرض النافذة
                const addUserActionRowObject = new ActionRowBuilder();
                addUserActionRowObject.addComponents(targetUserIdTextInputObject);
                
                requestAddUserModalObject.addComponents(addUserActionRowObject);
                
                try {
                    await interaction.showModal(requestAddUserModalObject);
                } catch (showAddUserModalException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Exception showing add user modal: ", showAddUserModalException);
                }
                
                return;
            }
        }

        // =========================================================================================================
        // 🧩 القسم التاسع: معالجة النوافذ المنبثقة للإدارة (Modal Submits for Control Panel)
        // يتعامل مع إجابات الإدارة عند إدخال سبب الحذف أو إدخال الأيدي لإضافة عضو.
        // =========================================================================================================
        const isAdministrativeModalSubmitInteractionEvent = interaction.isModalSubmit();
        
        if (isAdministrativeModalSubmitInteractionEvent === true) {
            
            const rawAdministrativeModalCustomIdString = interaction.customId;
            const currentTicketChannelObjectForModal = interaction.channel;
            
            // -----------------------------------------------------------------------------------------
            // 🗑️ معالجة نافذة الحذف مع ذكر السبب
            // -----------------------------------------------------------------------------------------
            if (rawAdministrativeModalCustomIdString === 'modal_delete_reason') {
                
                const targetReasonInputCustomIdString = 'delete_reason_input_field';
                const providedDeletionReasonTextString = interaction.fields.getTextInputValue(targetReasonInputCustomIdString);
                
                const processingDeletionMessageContent = '**🗑️ جاري تجهيز الترانسكريبت وحذف التذكرة خلال ثوانٍ...**';
                
                try {
                    // الرد السريع
                    await interaction.reply({ 
                        content: processingDeletionMessageContent, 
                        ephemeral: true 
                    });
                } catch (replyProcessingDeletionException) {}
                
                const interactingExecutorUserObject = interaction.user;
                
                // استدعاء دالة الحذف واللوج وتمرير السبب المكتوب
                await executeTicketDeletionAndLoggingProcess(currentTicketChannelObjectForModal, interactingExecutorUserObject, safeActiveGuildConfigDocument, providedDeletionReasonTextString);
                
                return;
            }

            // -----------------------------------------------------------------------------------------
            // ➕ معالجة نافذة إضافة العضو للتذكرة
            // -----------------------------------------------------------------------------------------
            if (rawAdministrativeModalCustomIdString === 'modal_add_user_to_ticket') {
                
                // تأجيل الرد لتجنب مشكلة Interaction Failed في حال كان ديسكورد بطيئاً في جلب العضو
                try {
                    await interaction.deferReply();
                } catch (deferAddUserReplyException) {}
                
                const targetUserIdInputCustomIdString = 'user_id_to_add_field';
                const providedUserIdToAddString = interaction.fields.getTextInputValue(targetUserIdInputCustomIdString).trim();
                
                const targetInteractionGuildObject = interaction.guild;
                
                try {
                    // التحقق من أن العضو موجود فعلاً في السيرفر
                    const memberToAddToTicketObject = await targetInteractionGuildObject.members.fetch(providedUserIdToAddString);
                    
                    // إعطاء العضو صلاحيات الرؤية والكتابة داخل التكت
                    await currentTicketChannelObjectForModal.permissionOverwrites.edit(providedUserIdToAddString, { 
                        ViewChannel: true, 
                        SendMessages: true 
                    });
                    
                    // استخراج التوبيك الحالي لتحديث قائمة الأعضاء المضافين (AddedUsers)
                    let currentActiveTopicString = currentTicketChannelObjectForModal.topic;
                    if (!currentActiveTopicString) {
                        currentActiveTopicString = '';
                    }
                    
                    const topicDataPartsArray = currentActiveTopicString.split('_');
                    
                    // ضمان أن التوبيك يحتوي على جميع الخانات لتجنب الأخطاء
                    while(topicDataPartsArray.length < 6) {
                        topicDataPartsArray.push('none');
                    }
                    
                    let historicallyAddedUsersString = topicDataPartsArray[3];
                    
                    if (historicallyAddedUsersString === 'none') {
                        historicallyAddedUsersString = providedUserIdToAddString;
                    } else {
                        // إضافة الأيدي الجديد مفصولاً بفاصلة
                        historicallyAddedUsersString = `${historicallyAddedUsersString},${providedUserIdToAddString}`;
                    }
                    
                    topicDataPartsArray[3] = historicallyAddedUsersString; // تحديث خانة الأعضاء المضافين
                    
                    const newlyUpdatedTopicWithAddedUserString = topicDataPartsArray.join('_');
                    
                    try {
                        await currentTicketChannelObjectForModal.setTopic(newlyUpdatedTopicWithAddedUserString);
                    } catch (updateTopicWithAddedUserException) {
                        console.log("[UNIVERSAL TICKET SYSTEM] Exception updating topic with added user: ", updateTopicWithAddedUserException);
                    }

                    const interactingAdminUserIdString = interaction.user.id;
                    const successfulUserAdditionMessageContent = `**✅ تم إضافة العضو <@${providedUserIdToAddString}> إلى التذكرة بنجاح بواسطة <@${interactingAdminUserIdString}>.**`;
                    
                    try {
                        await interaction.editReply({ 
                            content: successfulUserAdditionMessageContent 
                        });
                    } catch (editAddUserSuccessReplyException) {}
                    
                } catch (memberFetchOrPermissionException) { 
                    // إذا فشل جلب العضو (الأيدي غير صحيح أو العضو غادر السيرفر)
                    const invalidMemberMessageContent = '**❌ لم أتمكن من العثور على هذا العضو في السيرفر. يرجى التأكد من صحة الأيدي.**';
                    
                    try {
                        await interaction.editReply({ 
                            content: invalidMemberMessageContent 
                        }); 
                    } catch (editAddUserErrorReplyException) {}
                }
                
                return;
            }
        }
    }); // نهاية حدث (interactionCreate)

// ======================================= نهاية الجزء 6 من السلسلة =======================================

    // =========================================================================================================
    // 🛠️ القسم العاشر: الدوال الأساسية المساعدة (Core Helper Functions)
    // هذه الدوال هي المحركات التي تقوم بإنشاء التذاكر وحذفها وتصدير سجلاتها.
    // =========================================================================================================
    
    // -----------------------------------------------------------------------------------------
    // 🏗️ دالة إنشاء التذكرة (Ticket Creation Process)
    // -----------------------------------------------------------------------------------------
    async function executeTicketCreationProcess(interactionObject, buttonDataObject, configDocument, answersArray, targetPanelDataObject) {
        
        // 1. تحديد رقم التذكرة بناءً على عداد السيرفر
        let currentTicketCountNumber = configDocument.ticketCount;
        if (!currentTicketCountNumber || isNaN(currentTicketCountNumber)) {
            currentTicketCountNumber = 0;
        }
        
        const newGeneratedTicketSequenceNumber = currentTicketCountNumber + 1;
        
        // 2. تحديد القسم (Category) الذي سيتم فتح التذكرة داخله
        let targetCategoryToOpenTicketInString = null;
        
        if (targetPanelDataObject && targetPanelDataObject.ticketCategoryId) {
            targetCategoryToOpenTicketInString = targetPanelDataObject.ticketCategoryId;
        }
        
        if (!targetCategoryToOpenTicketInString) {
            targetCategoryToOpenTicketInString = configDocument.defaultCategoryId; // Fallback
        }
        
        // 3. بناء مصفوفة الصلاحيات الأولية (Permissions Array)
        const initialChannelPermissionsDataArray = [];
        
        const interactingGuildObject = interactionObject.guild;
        const interactingGuildIdString = interactingGuildObject.id;
        
        // منع الجميع من رؤية التذكرة (@everyone)
        const denyEveryoneRolePermissionObject = { 
            id: interactingGuildIdString, 
            deny: [PermissionFlagsBits.ViewChannel] 
        };
        initialChannelPermissionsDataArray.push(denyEveryoneRolePermissionObject);
        
        // السماح لصاحب التذكرة بالرؤية والكتابة
        const interactingUserObject = interactionObject.user;
        const interactingUserIdString = interactingUserObject.id;
        
        const allowOwnerPermissionObject = { 
            id: interactingUserIdString, 
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
        };
        initialChannelPermissionsDataArray.push(allowOwnerPermissionObject);
        
        // جلب رتب الإدارة المسموح لها برؤية التذكرة
        const administrativeRolesArrayList = [
            configDocument.adminRoleId, 
            configDocument.middlemanRoleId, 
            ...configDocument.highAdminRoles, 
            ...configDocument.highMiddlemanRoles 
        ];
        
        // السماح لرتب الإدارة برؤية التذكرة
        for (let roleIndex = 0; roleIndex < administrativeRolesArrayList.length; roleIndex++) {
            const specificAdminRoleIdString = administrativeRolesArrayList[roleIndex];
            
            if (specificAdminRoleIdString) {
                const allowAdminRolePermissionObject = { 
                    id: specificAdminRoleIdString, 
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] 
                };
                initialChannelPermissionsDataArray.push(allowAdminRolePermissionObject);
            }
        }

        // 4. تجهيز بيانات الوصف (Topic) لتعمل كقاعدة بيانات مصغرة للتذكرة
        let isMiddleManTicketIndicatorString = 'false';
        const buttonConfiguredAsMiddleManBoolean = buttonDataObject.isMiddleMan;
        
        if (buttonConfiguredAsMiddleManBoolean === true) {
            isMiddleManTicketIndicatorString = 'true';
        }
        
        const usedButtonInternalIdString = buttonDataObject.id;
        
        // بناء التوبيك: Owner_Button_Claimer_AddedUsers_Closer_IsMiddleman
        const initialChannelTopicDataString = `${interactingUserIdString}_${usedButtonInternalIdString}_none_none_none_${isMiddleManTicketIndicatorString}`;

        // 5. إنشاء الروم (القناة) في ديسكورد
        const newlyGeneratedChannelNameString = `ticket-${newGeneratedTicketSequenceNumber}`;
        const guildChannelsManagerObject = interactingGuildObject.channels;
        
        let successfullyCreatedChannelObject = null;
        
        try {
            successfullyCreatedChannelObject = await guildChannelsManagerObject.create({
                name: newlyGeneratedChannelNameString, 
                type: ChannelType.GuildText, 
                parent: targetCategoryToOpenTicketInString, 
                topic: initialChannelTopicDataString, 
                permissionOverwrites: initialChannelPermissionsDataArray
            });
        } catch (channelCreationException) {
            console.log("[UNIVERSAL TICKET SYSTEM] Exception creating ticket text channel: ", channelCreationException);
            
            const channelCreationFailureMessage = '**❌ فشل إنشاء التذكرة. يرجى التأكد من صلاحيات البوت (Administrator) وإعدادات القسم.**';
            try {
                return await interactionObject.editReply({ content: channelCreationFailureMessage });
            } catch (err) { return; }
        }
        
        // 6. تحديث عداد التذاكر في قاعدة البيانات للسيرفر الحالي
        const currentGuildDatabaseFilterObject = { guildId: interactingGuildIdString };
        const incrementTicketCountUpdateObject = { $inc: { ticketCount: 1 } };
        
        try {
            await GuildConfig.findOneAndUpdate(currentGuildDatabaseFilterObject, incrementTicketCountUpdateObject);
        } catch (databaseTicketCountUpdateException) {
            console.log("[UNIVERSAL TICKET SYSTEM] Could not increment ticket count in database.");
        }

        // 7. بناء محتوى التذكرة (الرسالة الترحيبية + الإيمبدات)
        const customButtonLabelTextString = buttonDataObject.label;
        const initialWelcomeMessageContentTextString = `**Welcome <@${interactingUserIdString}>**\n**Reason:** ${customButtonLabelTextString}`;
        
        const ticketEmbedsListArray = [];

        // 🟢 الإيمبد الأول: الترحيب والتعليمات
        const welcomeInformationEmbedObject = new EmbedBuilder();
        
        let configuredInsideEmbedTitleString = buttonDataObject.insideEmbedTitle;
        if (!configuredInsideEmbedTitleString) {
            configuredInsideEmbedTitleString = 'تذكرة الدعم الفني';
        }
        welcomeInformationEmbedObject.setTitle(configuredInsideEmbedTitleString);
        
        let configuredInsideEmbedDescriptionString = buttonDataObject.insideEmbedDesc;
        if (!configuredInsideEmbedDescriptionString) {
            configuredInsideEmbedDescriptionString = 'يرجى كتابة مشكلتك أو طلبك بوضوح وانتظار الإدارة.';
        }
        welcomeInformationEmbedObject.setDescription(configuredInsideEmbedDescriptionString);
        
        let configuredInsideEmbedColorHexCode = buttonDataObject.insideEmbedColor;
        if (!configuredInsideEmbedColorHexCode) {
            configuredInsideEmbedColorHexCode = '#2b2d31';
        }
        welcomeInformationEmbedObject.setColor(configuredInsideEmbedColorHexCode);
        
        ticketEmbedsListArray.push(welcomeInformationEmbedObject);

        // 🟢 الإيمبد الثاني: إجابات نافذة العميل (إن وجدت) - مع الخط الجانبي الفخم
        const doesUserHaveAnswersBoolean = (answersArray && answersArray.length > 0);
        
        if (doesUserHaveAnswersBoolean === true) {
            
            const userAnswersDisplayEmbedObject = new EmbedBuilder();
            
            let databaseConfiguredAnswersColorHexCode = configDocument.answersEmbedColor;
            if (!databaseConfiguredAnswersColorHexCode) {
                databaseConfiguredAnswersColorHexCode = '#2b2d31';
            }
            userAnswersDisplayEmbedObject.setColor(databaseConfiguredAnswersColorHexCode);
            
            for (let answerIndex = 0; answerIndex < answersArray.length; answerIndex++) {
                
                const singleUserAnswerObject = answersArray[answerIndex];
                
                let textValueToDisplayString = singleUserAnswerObject.value;
                const isTextValueNullOrEmpty = (!textValueToDisplayString || textValueToDisplayString.trim() === '');
                
                if (isTextValueNullOrEmpty === true) {
                    textValueToDisplayString = 'N/A (لم يتم الإجابة)';
                }
                
                // تطبيق الخط الجانبي المنسق (>>> )
                const beautifullyFormattedAnswerString = `>>> ${textValueToDisplayString}`;
                const beautifullyFormattedQuestionLabelString = `**${singleUserAnswerObject.label}**`;
                
                userAnswersDisplayEmbedObject.addFields({ 
                    name: beautifullyFormattedQuestionLabelString, 
                    value: beautifullyFormattedAnswerString 
                });
            }
            
            ticketEmbedsListArray.push(userAnswersDisplayEmbedObject);
        }

        // 8. بناء أزرار التحكم للإدارة (Control Buttons) لداخل التذكرة
        const administrativeControlsActionRow1Object = new ActionRowBuilder();
        
        const addUserToTicketButtonObject = new ButtonBuilder();
        addUserToTicketButtonObject.setCustomId('ticket_add_user');
        addUserToTicketButtonObject.setLabel('Add User (إضافة عضو)');
        addUserToTicketButtonObject.setStyle(ButtonStyle.Secondary); 
        
        const claimTicketButtonObject = new ButtonBuilder();
        claimTicketButtonObject.setCustomId('ticket_claim');
        claimTicketButtonObject.setLabel('Claim (استلام)');
        claimTicketButtonObject.setStyle(ButtonStyle.Success); 
        
        const closeTicketButtonObject = new ButtonBuilder();
        closeTicketButtonObject.setCustomId('ticket_close');
        closeTicketButtonObject.setLabel('Close (إغلاق)');
        closeTicketButtonObject.setStyle(ButtonStyle.Danger); 
        
        administrativeControlsActionRow1Object.addComponents(addUserToTicketButtonObject, claimTicketButtonObject, closeTicketButtonObject);

        const administrativeControlsActionRow2Object = new ActionRowBuilder();
        
        const deleteTicketWithReasonButtonObject = new ButtonBuilder();
        deleteTicketWithReasonButtonObject.setCustomId('ticket_delete_reason');
        deleteTicketWithReasonButtonObject.setLabel('Delete With Reason (حذف لسبب)');
        deleteTicketWithReasonButtonObject.setStyle(ButtonStyle.Danger); 
        
        administrativeControlsActionRow2Object.addComponents(deleteTicketWithReasonButtonObject);
        
        // 9. إرسال المحتويات إلى التذكرة الجديدة
        try {
            await successfullyCreatedChannelObject.send({ 
                content: initialWelcomeMessageContentTextString, 
                embeds: ticketEmbedsListArray, 
                components: [administrativeControlsActionRow1Object, administrativeControlsActionRow2Object] 
            });
        } catch (sendInitialTicketMessageException) {
            console.log("[UNIVERSAL TICKET SYSTEM] Exception sending initial embeds to new ticket.");
        }
        
        // 10. إبلاغ العميل بنجاح العملية وتوجيهه للتذكرة
        const successfullyOpenedReplyMessageContent = `**✅ تم فتح تذكرتك بنجاح: <#${successfullyCreatedChannelObject.id}>**`;
        
        try {
            await interactionObject.editReply({ content: successfullyOpenedReplyMessageContent });
        } catch (editReplyForTicketSuccessException) {
            try {
                // محاولة الرد مباشرة إذا فشل التعديل
                await interactionObject.reply({ content: successfullyOpenedReplyMessageContent, ephemeral: true });
            } catch (fallbackReplyException) {}
        }
    }

    // -----------------------------------------------------------------------------------------
    // 🗑️ دالة حذف التذكرة وتصدير سجل المحادثة (Deletion & Transcript Process)
    // -----------------------------------------------------------------------------------------
    async function executeTicketDeletionAndLoggingProcess(ticketChannelObject, closedByAdminUserObject, configDocument, deletionReasonTextString) {
        
        // 1. استخراج جميع البيانات المخزنة في التوبيك لتوثيقها في اللوج
        let activeChannelTopicDataString = ticketChannelObject.topic;
        if (!activeChannelTopicDataString) {
            activeChannelTopicDataString = '';
        }
        
        const topicDataSplitArray = activeChannelTopicDataString.split('_');
        
        let originalTicketOwnerDiscordIdString = null; 
        if (topicDataSplitArray[0] && topicDataSplitArray[0] !== 'none') {
            originalTicketOwnerDiscordIdString = topicDataSplitArray[0];
        }
        
        let adminClaimerDiscordIdString = null; 
        if (topicDataSplitArray[2] && topicDataSplitArray[2] !== 'none') {
            adminClaimerDiscordIdString = topicDataSplitArray[2];
        }
        
        let historicallyAddedUsersArray = []; 
        if (topicDataSplitArray[3] && topicDataSplitArray[3] !== 'none') {
            historicallyAddedUsersArray = topicDataSplitArray[3].split(',');
        }
        
        const deletingAdminDiscordIdString = closedByAdminUserObject.id;
        let adminWhoClosedTicketIdString = deletingAdminDiscordIdString; 
        
        if (topicDataSplitArray[4] && topicDataSplitArray[4] !== 'none') {
            adminWhoClosedTicketIdString = topicDataSplitArray[4]; 
        }

        // تنسيق الأسماء للمنشن داخل اللوج
        let formattedOwnerMentionString = 'غير معروف (Unknown)'; 
        if (originalTicketOwnerDiscordIdString) {
            formattedOwnerMentionString = `<@${originalTicketOwnerDiscordIdString}>`;
        }
        
        let formattedClaimerMentionString = 'لم يستلمها أحد (None)'; 
        if (adminClaimerDiscordIdString) {
            formattedClaimerMentionString = `<@${adminClaimerDiscordIdString}>`;
        }
        
        let formattedAddedUsersMentionString = 'لا يوجد (None)';
        if (historicallyAddedUsersArray.length > 0) {
            const tempMentionsStorageArray = [];
            for (let uIndex = 0; uIndex < historicallyAddedUsersArray.length; uIndex++) {
                const targetUidString = historicallyAddedUsersArray[uIndex];
                tempMentionsStorageArray.push(`<@${targetUidString}>`);
            }
            formattedAddedUsersMentionString = tempMentionsStorageArray.join(', ');
        }

        // 2. بناء إيمبد اللوج الشامل
        const masterDeletionLogEmbedObject = new EmbedBuilder();
        
        const targetTicketGuildObject = ticketChannelObject.guild;
        const dynamicallyFetchedGuildIconUrlString = targetTicketGuildObject.iconURL({ dynamic: true });
        
        masterDeletionLogEmbedObject.setAuthor({ 
            name: `${targetTicketGuildObject.name} TICKET LOGS`, 
            iconURL: dynamicallyFetchedGuildIconUrlString 
        });
        
        const deletionLogTitleString = '🗑️ Ticket Deleted (تم حذف التذكرة)';
        masterDeletionLogEmbedObject.setTitle(deletionLogTitleString);
        
        const targetTicketChannelNameString = ticketChannelObject.name;
        
        let comprehensiveLogDescriptionBuilderString = '';
        comprehensiveLogDescriptionBuilderString += `**Ticket (التذكرة):** ${targetTicketChannelNameString} was deleted.\n\n`;
        comprehensiveLogDescriptionBuilderString += `👑 **Owner (المالك)**\n${formattedOwnerMentionString}\n\n`;
        comprehensiveLogDescriptionBuilderString += `🗑️ **Deleted By (حذفت بواسطة)**\n<@${deletingAdminDiscordIdString}>\n\n`;
        comprehensiveLogDescriptionBuilderString += `🙋 **Claimed By (استلمت بواسطة)**\n${formattedClaimerMentionString}\n\n`;
        comprehensiveLogDescriptionBuilderString += `🔒 **Closed By (أغلقت بواسطة)**\n<@${adminWhoClosedTicketIdString}>\n\n`;
        comprehensiveLogDescriptionBuilderString += `➕ **Added Users (أعضاء مضافين)**\n${formattedAddedUsersMentionString}\n\n`;
        comprehensiveLogDescriptionBuilderString += `📝 **Reason (السبب)**\n>>> ${deletionReasonTextString}`;
        
        masterDeletionLogEmbedObject.setDescription(comprehensiveLogDescriptionBuilderString);
        
        let dashboardConfiguredLogEmbedColorHex = configDocument.logEmbedColor;
        if (!dashboardConfiguredLogEmbedColorHex) {
            dashboardConfiguredLogEmbedColorHex = '#ed4245'; // أحمر افتراضي
        }
        
        masterDeletionLogEmbedObject.setColor(dashboardConfiguredLogEmbedColorHex);
        masterDeletionLogEmbedObject.setTimestamp();

        // 3. إرسال اللوج إلى الروم المخصصة (إن وجدت)
        const specificTicketLogChannelIdString = configDocument.ticketLogChannelId;
        const currentGuildChannelsCacheManager = targetTicketGuildObject.channels.cache;
        
        if (specificTicketLogChannelIdString) { 
            const officialLogChannelObject = currentGuildChannelsCacheManager.get(specificTicketLogChannelIdString); 
            if (officialLogChannelObject) {
                try {
                    await officialLogChannelObject.send({ embeds: [masterDeletionLogEmbedObject] });
                } catch (sendLogToChannelException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Could not send log to the designated log channel.");
                }
            }
        }
        
        // 4. استخراج الترانسكريبت وإرساله إلى روم الترانسكريبت
        const specificTranscriptChannelIdString = configDocument.transcriptChannelId;
        const isTranscriptChannelDifferentFromLogChannel = (specificTranscriptChannelIdString !== specificTicketLogChannelIdString);
        
        if (specificTranscriptChannelIdString && isTranscriptChannelDifferentFromLogChannel === true) { 
            
            const officialTranscriptChannelObject = currentGuildChannelsCacheManager.get(specificTranscriptChannelIdString); 
            
            if (officialTranscriptChannelObject) {
                
                try {
                    // توليد الملف
                    const generatedHtmlTranscriptAttachmentObject = await discordTranscripts.createTranscript(ticketChannelObject, { 
                        limit: -1, 
                        returnType: 'attachment', 
                        filename: `${targetTicketChannelNameString}.html`, 
                        saveImages: true 
                    });
                    
                    let dashboardConfiguredTranscriptColorHex = configDocument.transcriptEmbedColor;
                    if (!dashboardConfiguredTranscriptColorHex) {
                        dashboardConfiguredTranscriptColorHex = '#2b2d31';
                    }
                    
                    masterDeletionLogEmbedObject.setColor(dashboardConfiguredTranscriptColorHex);
                    
                    // بناء زر التحميل المباشر للترانسكريبت
                    const directTranscriptDownloadActionRowObject = new ActionRowBuilder();
                    
                    const directDownloadButtonObject = new ButtonBuilder();
                    directDownloadButtonObject.setCustomId('direct_transcript_btn');
                    directDownloadButtonObject.setLabel('Direct Transcript (تحميل مباشر)');
                    directDownloadButtonObject.setStyle(ButtonStyle.Primary);
                    
                    directTranscriptDownloadActionRowObject.addComponents(directDownloadButtonObject);

                    const transcriptAccompanyingMessageTextString = `**📄 Transcript for ${targetTicketChannelNameString}**`;
                    
                    // الإرسال
                    await officialTranscriptChannelObject.send({ 
                        content: transcriptAccompanyingMessageTextString, 
                        files: [generatedHtmlTranscriptAttachmentObject], 
                        embeds: [masterDeletionLogEmbedObject], 
                        components: [directTranscriptDownloadActionRowObject] 
                    });
                    
                } catch (transcriptProcessFailureException) {
                    console.log("[UNIVERSAL TICKET SYSTEM] Exception generating or sending transcript: ", transcriptProcessFailureException);
                }
            }
        }
        
        // 5. الحذف الفعلي للروم بعد مرور 3 ثوانٍ لضمان اكتمال جميع العمليات
        setTimeout(() => { 
            try {
                ticketChannelObject.delete();
            } catch (finalChannelDeletionException) {
                console.log("[UNIVERSAL TICKET SYSTEM] Exception deleting channel: ", finalChannelDeletionException);
            }
        }, 3000);
    }
}; // نهاية الموديول
