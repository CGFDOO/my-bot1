// =========================================================================================================
// 🎯 محرك التفاعلات الشامل (INTERACTION CREATE EVENT - ENTERPRISE EDITION) - PART 1
// ---------------------------------------------------------------------------------------------------------
// هذا الحدث هو "القلب النابض" للتذاكر، الأزرار، والنوافذ المنبثقة (Modals).
// تم تصميمه بـ "الاستجابة الفورية" (Zero-Latency) لمنع خطأ Interaction Failed.
// يحتوي على نظام (المربعات/Code Blocks) المخصص لإجابات الأعضاء.
// =========================================================================================================

const discordLibrary = require('discord.js');
const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, 
    PermissionFlagsBits 
} = discordLibrary;

const GuildConfigDatabaseModel = require('../models/GuildConfig');

module.exports = {
    name: 'interactionCreate',
    once: false,

    async execute(incomingInteractionObject, discordClientObject) {
        
        // =========================================================================================================
        // 🛡️ 1. فحوصات الأمان الأساسية وجلب البيانات
        // =========================================================================================================
        
        const targetDiscordGuildObject = incomingInteractionObject.guild;
        if (!targetDiscordGuildObject) {
            return; // نتجاهل تفاعلات الخاص
        }

        const currentGuildDiscordIdString = targetDiscordGuildObject.id;
        let activeGuildConfigurationDocument = null;

        try {
            activeGuildConfigurationDocument = await GuildConfigDatabaseModel.findOne({ 
                guildId: currentGuildDiscordIdString 
            });
        } catch (databaseFetchException) {
            console.error('[INTERACTION ERROR] Database fetch failed:', databaseFetchException);
            return;
        }

        if (!activeGuildConfigurationDocument) {
            return; 
        }

        // =========================================================================================================
        // 🖱️ 2. التعامل مع الأزرار (Buttons Handler) - فتح النوافذ
        // =========================================================================================================
        
        const isInteractionAButtonBoolean = incomingInteractionObject.isButton();
        
        if (isInteractionAButtonBoolean === true) {
            
            const clickedButtonCustomIdString = incomingInteractionObject.customId;

            // -----------------------------------------------------------------------------------------
            // 🛡️ أ. زر فتح تذكرة الوساطة الأساسية (Middleman Panel)
            // -----------------------------------------------------------------------------------------
            const isMiddlemanTicketButtonBoolean = (clickedButtonCustomIdString === 'open_middleman_ticket');
            
            if (isMiddlemanTicketButtonBoolean === true) {
                
                const middlemanSystemConfigObject = activeGuildConfigurationDocument.middlemanSystem;
                
                // التأكد أن نظام الوساطة مفعل
                if (middlemanSystemConfigObject && middlemanSystemConfigObject.enabled === true) {
                    
                    // بناء النافذة المنبثقة (Modal) للوساطة فوراً (في أقل من ثانية)
                    const middlemanTicketModalBuilderObject = new ModalBuilder();
                    middlemanTicketModalBuilderObject.setCustomId('submit_middleman_ticket');
                    
                    const configuredMiddlemanModalTitleString = middlemanSystemConfigObject.modalTitle || 'بيانات الوساطة';
                    // قص العنوان إذا زاد عن 45 حرف (حدود ديسكورد)
                    middlemanTicketModalBuilderObject.setTitle(configuredMiddlemanModalTitleString.substring(0, 45));

                    const middlemanModalFieldsArray = middlemanSystemConfigObject.modalFields;
                    
                    for (let fieldIndex = 0; fieldIndex < middlemanModalFieldsArray.length; fieldIndex++) {
                        const currentFieldConfigObject = middlemanModalFieldsArray[fieldIndex];
                        
                        const textInputBuilderObject = new TextInputBuilder();
                        textInputBuilderObject.setCustomId(`mm_field_${fieldIndex}`);
                        textInputBuilderObject.setLabel(currentFieldConfigObject.label.substring(0, 45));
                        
                        const mappedInputStyle = (currentFieldConfigObject.style === 'Short') ? TextInputStyle.Short : TextInputStyle.Paragraph;
                        textInputBuilderObject.setStyle(mappedInputStyle);
                        
                        if (currentFieldConfigObject.placeholder) {
                            textInputBuilderObject.setPlaceholder(currentFieldConfigObject.placeholder.substring(0, 100));
                        }
                        textInputBuilderObject.setRequired(currentFieldConfigObject.required);

                        const actionRowContainerObject = new ActionRowBuilder().addComponents(textInputBuilderObject);
                        middlemanTicketModalBuilderObject.addComponents(actionRowContainerObject);
                    }

                    try {
                        // إظهار النافذة للعميل فوراً لمنع التعليق
                        await incomingInteractionObject.showModal(middlemanTicketModalBuilderObject);
                    } catch (showModalException) {
                        console.error('[INTERACTION ERROR] Failed to show Middleman Modal:', showModalException);
                    }
                }
                return;
            }

            // -----------------------------------------------------------------------------------------
            // 🎟️ ب. أزرار التذاكر المتعددة العادية (Custom Ticket Panels)
            // -----------------------------------------------------------------------------------------
            const isCustomTicketButtonBoolean = clickedButtonCustomIdString.startsWith('open_ticket_');
            
            if (isCustomTicketButtonBoolean === true) {
                
                const internalButtonIdString = clickedButtonCustomIdString.replace('open_ticket_', '');
                let matchedTicketButtonConfigObject = null;
                let matchedTicketPanelConfigObject = null;

                const allTicketPanelsArray = activeGuildConfigurationDocument.ticketPanels;
                
                for (let panelIndex = 0; panelIndex < allTicketPanelsArray.length; panelIndex++) {
                    const currentPanelObject = allTicketPanelsArray[panelIndex];
                    
                    for (let buttonIndex = 0; buttonIndex < currentPanelObject.buttons.length; buttonIndex++) {
                        const currentButtonObject = currentPanelObject.buttons[buttonIndex];
                        if (currentButtonObject.id === internalButtonIdString) {
                            matchedTicketButtonConfigObject = currentButtonObject;
                            matchedTicketPanelConfigObject = currentPanelObject;
                            break;
                        }
                    }
                    if (matchedTicketButtonConfigObject !== null) break;
                }

                if (matchedTicketButtonConfigObject !== null) {
                    
                    // هل هذا التكت يتطلب نافذة (Modal)؟
                    const doesTicketRequireModalBoolean = matchedTicketButtonConfigObject.requireModal;
                    
                    if (doesTicketRequireModalBoolean === true && matchedTicketButtonConfigObject.modalFields.length > 0) {
                        
                        // بناء النافذة للتكت العادي
                        const normalTicketModalBuilderObject = new ModalBuilder();
                        // ندمج الأيدي الخاص بالزر لكي نعرفه عند الإرسال
                        normalTicketModalBuilderObject.setCustomId(`submit_normal_ticket_${internalButtonIdString}`);
                        
                        const configuredNormalModalTitleString = matchedTicketButtonConfigObject.modalTitle || 'بيانات التذكرة';
                        normalTicketModalBuilderObject.setTitle(configuredNormalModalTitleString.substring(0, 45));

                        const normalModalFieldsArray = matchedTicketButtonConfigObject.modalFields;
                        
                        for (let fieldIndex = 0; fieldIndex < normalModalFieldsArray.length; fieldIndex++) {
                            const currentNormalFieldObject = normalModalFieldsArray[fieldIndex];
                            
                            const normalTextInputBuilderObject = new TextInputBuilder();
                            normalTextInputBuilderObject.setCustomId(`normal_field_${fieldIndex}`);
                            normalTextInputBuilderObject.setLabel(currentNormalFieldObject.label.substring(0, 45));
                            
                            const mappedInputStyle = (currentNormalFieldObject.style === 'Short') ? TextInputStyle.Short : TextInputStyle.Paragraph;
                            normalTextInputBuilderObject.setStyle(mappedInputStyle);
                            
                            if (currentNormalFieldObject.placeholder) {
                                normalTextInputBuilderObject.setPlaceholder(currentNormalFieldObject.placeholder.substring(0, 100));
                            }
                            normalTextInputBuilderObject.setRequired(currentNormalFieldObject.required);

                            const normalActionRowContainerObject = new ActionRowBuilder().addComponents(normalTextInputBuilderObject);
                            normalTicketModalBuilderObject.addComponents(normalActionRowContainerObject);
                        }

                        try {
                            await incomingInteractionObject.showModal(normalTicketModalBuilderObject);
                        } catch (showModalException) {
                            console.error('[INTERACTION ERROR] Failed to show Normal Ticket Modal:', showModalException);
                        }
                    } else {
                        // إذا لم يكن هناك نافذة أسئلة، نقوم بإنشاء التكت فوراً
                        // ولكن أولاً نرد برد مؤقت (Defer) لمنع التعليق
                        await incomingInteractionObject.deferReply({ ephemeral: true });
                        // ... سيتم إضافة دالة الإنشاء المباشر في الجزء الثاني
                    }
                }
                return;
            }
        }

        // =========================================================================================================
        // 📝 3. التعامل مع إرسال النوافذ (Modal Submit Handler) - إنشاء التذاكر والمربعات
        // =========================================================================================================
        
        const isInteractionAModalSubmitBoolean = incomingInteractionObject.isModalSubmit();
        
        if (isInteractionAModalSubmitBoolean === true) {
            
            const submittedModalCustomIdString = incomingInteractionObject.customId;

            // -----------------------------------------------------------------------------------------
            // 🛡️ أ. استقبال بيانات تذكرة الوساطة (Middleman Ticket Submit)
            // -----------------------------------------------------------------------------------------
            const isMiddlemanModalSubmitBoolean = (submittedModalCustomIdString === 'submit_middleman_ticket');
            
            if (isMiddlemanModalSubmitBoolean === true) {
                
                // الرد الفوري الاستباقي لمنع خطأ Interaction Failed
                await incomingInteractionObject.deferReply({ ephemeral: true });

                const middlemanSystemConfigObject = activeGuildConfigurationDocument.middlemanSystem;
                
                // تحديث عداد التذاكر العالمي في الداتابيز
                activeGuildConfigurationDocument.ticketCount += 1;
                await activeGuildConfigurationDocument.save();
                
                const ticketSequenceNumberInt = activeGuildConfigurationDocument.ticketCount;
                const formattedTicketSequenceString = ticketSequenceNumberInt.toString().padStart(4, '0');
                
                const middlemanTicketChannelNameString = `ticket-${formattedTicketSequenceString}`;
                const interactingUserDiscordIdString = incomingInteractionObject.user.id;

                // بناء أذونات الروم (Permissions)
                const channelPermissionOverwritesArray = [
                    {
                        id: targetDiscordGuildObject.id, // رتبة الجميع @everyone
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interactingUserDiscordIdString, // صاحب التذكرة
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: discordClientObject.user.id, // البوت نفسه
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
                    }
                ];

                // إضافة صلاحيات الوسيط إذا كانت محددة
                const assignedMiddlemanRoleIdString = activeGuildConfigurationDocument.roles.middlemanRoleId;
                if (assignedMiddlemanRoleIdString) {
                    channelPermissionOverwritesArray.push({
                        id: assignedMiddlemanRoleIdString,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    });
                }

                try {
                    // إنشاء الروم
                    const createdMiddlemanTicketChannelObject = await targetDiscordGuildObject.channels.create({
                        name: middlemanTicketChannelNameString,
                        type: ChannelType.GuildText,
                        parent: middlemanSystemConfigObject.categoryId || null,
                        permissionOverwrites: channelPermissionOverwritesArray,
                        // التوبيك الخاص بالوساطة لفصله عن الإدارة (يحتوي على الأيدي ومنشن الوساطة)
                        topic: `${interactingUserDiscordIdString}_middleman_${ticketSequenceNumberInt}_open_none`
                    });

                    // ---------------------------------------------------------
                    // 🎨 بناء الإيمبد الفخم داخل التذكرة (مع نظام المربعات Code Blocks)
                    // ---------------------------------------------------------
                    const insideMiddlemanTicketEmbedObject = new EmbedBuilder();
                    
                    insideMiddlemanTicketEmbedObject.setTitle(middlemanSystemConfigObject.insideTicketTitle || 'تذكرة الوساطة');
                    insideMiddlemanTicketEmbedObject.setDescription(middlemanSystemConfigObject.insideTicketDescription || 'يرجى انتظار الوسيط.');
                    insideMiddlemanTicketEmbedObject.setColor(middlemanSystemConfigObject.insideTicketColor || '#f2a658');

                    // جلب الإجابات ووضعها داخل Code Blocks (المربع الفخم)
                    const middlemanModalFieldsArray = middlemanSystemConfigObject.modalFields;
                    
                    for (let fieldIndex = 0; fieldIndex < middlemanModalFieldsArray.length; fieldIndex++) {
                        const currentFieldConfigObject = middlemanModalFieldsArray[fieldIndex];
                        const extractedUserAnswerString = incomingInteractionObject.fields.getTextInputValue(`mm_field_${fieldIndex}`);
                        
                        // هنا السر: وضع النص بين ``` لعمل المربع
                        const boxedAnswerString = "```text\n" + extractedUserAnswerString + "\n```";
                        
                        insideMiddlemanTicketEmbedObject.addFields({
                            name: currentFieldConfigObject.label,
                            value: boxedAnswerString,
                            inline: false
                        });
                    }

                    // ---------------------------------------------------------
                    // 🎛️ بناء أزرار التحكم (باللغة الإنجليزية كما طلبت)
                    // ---------------------------------------------------------
                    const ticketControlTopActionRowObject = new ActionRowBuilder();
                    
                    const claimTicketButtonObject = new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success);
                    const closeTicketButtonObject = new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger);
                    const addUserButtonObject = new ButtonBuilder().setCustomId('ticket_add_user').setLabel('Add User').setStyle(ButtonStyle.Secondary);
                    
                    ticketControlTopActionRowObject.addComponents(addUserButtonObject, claimTicketButtonObject, closeTicketButtonObject);
                    
                    const ticketControlBottomActionRowObject = new ActionRowBuilder();
                    const deleteWithReasonButtonObject = new ButtonBuilder().setCustomId('ticket_delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger);
                    
                    ticketControlBottomActionRowObject.addComponents(deleteWithReasonButtonObject);

                    // رسائل المنشن الخارجية (منفصلة عن الإيمبد)
                    let externalMentionMessageString = `**Welcome <@${interactingUserDiscordIdString}>**\n`;
                    if (assignedMiddlemanRoleIdString) {
                        externalMentionMessageString += `**Reason: تذكرة وساطة** | <@&${assignedMiddlemanRoleIdString}>`;
                    } else {
                        externalMentionMessageString += `**Reason: تذكرة وساطة**`;
                    }

                    await createdMiddlemanTicketChannelObject.send({
                        content: externalMentionMessageString,
                        embeds: [insideMiddlemanTicketEmbedObject],
                        components: [ticketControlTopActionRowObject, ticketControlBottomActionRowObject]
                    });

                    // الرد على العضو في النافذة أنه تم فتح التذكرة
                    await incomingInteractionObject.editReply({ 
                        content: `**✅ تم فتح تذكرة الوساطة بنجاح: <#${createdMiddlemanTicketChannelObject.id}>**` 
                    });

                } catch (ticketCreationException) {
                    console.error('[INTERACTION ERROR] Failed to create Middleman Ticket:', ticketCreationException);
                    await incomingInteractionObject.editReply({ content: '**❌ حدث خطأ أثناء إنشاء التذكرة. تأكد من صلاحيات البوت.**' });
                }
                return;
            }

      // -----------------------------------------------------------------------------------------
            // 🎟️ ب. استقبال بيانات التذكرة العادية (Normal Ticket Submit)
            // -----------------------------------------------------------------------------------------
            const isNormalTicketModalSubmitBoolean = submittedModalCustomIdString.startsWith('submit_normal_ticket_');
            
            if (isNormalTicketModalSubmitBoolean === true) {
                
                // الرد الفوري الاستباقي (Defer) لقتل إيرور Interaction Failed
                await incomingInteractionObject.deferReply({ ephemeral: true });

                const extractedPanelIdString = submittedModalCustomIdString.replace('submit_normal_ticket_', '');
                let targetTicketPanelConfigObject = null;
                let targetTicketButtonConfigObject = null;

                const allTicketPanelsArray = activeGuildConfigurationDocument.ticketPanels;
                
                for (let panelIndex = 0; panelIndex < allTicketPanelsArray.length; panelIndex++) {
                    const currentPanelObject = allTicketPanelsArray[panelIndex];
                    for (let buttonIndex = 0; buttonIndex < currentPanelObject.buttons.length; buttonIndex++) {
                        const currentButtonObject = currentPanelObject.buttons[buttonIndex];
                        if (currentButtonObject.id === extractedPanelIdString) {
                            targetTicketPanelConfigObject = currentPanelObject;
                            targetTicketButtonConfigObject = currentButtonObject;
                            break;
                        }
                    }
                    if (targetTicketPanelConfigObject !== null) break;
                }

                if (targetTicketButtonConfigObject !== null) {
                    
                    // تحديث عداد التذاكر
                    activeGuildConfigurationDocument.ticketCount += 1;
                    await activeGuildConfigurationDocument.save();
                    
                    const ticketSequenceNumberInt = activeGuildConfigurationDocument.ticketCount;
                    const formattedTicketSequenceString = ticketSequenceNumberInt.toString().padStart(4, '0');
                    
                    const normalTicketChannelNameString = `ticket-${formattedTicketSequenceString}`;
                    const interactingUserDiscordIdString = incomingInteractionObject.user.id;

                    // الصلاحيات (الجميع ممنوع، صاحب التذكرة مسموح، البوت مسموح)
                    const channelPermissionOverwritesArray = [
                        {
                            id: targetDiscordGuildObject.id, // @everyone
                            deny: [PermissionFlagsBits.ViewChannel]
                        },
                        {
                            id: interactingUserDiscordIdString, // صاحب التذكرة
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                        },
                        {
                            id: discordClientObject.user.id, // البوت
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
                        }
                    ];

                    // إضافة صلاحية رتبة الإدارة (Admin Role) لرؤية هذا النوع من التذاكر
                    const assignedAdminRoleIdString = activeGuildConfigurationDocument.roles.adminRoleId;
                    if (assignedAdminRoleIdString) {
                        channelPermissionOverwritesArray.push({
                            id: assignedAdminRoleIdString,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                        });
                    }

                    try {
                        const createdNormalTicketChannelObject = await targetDiscordGuildObject.channels.create({
                            name: normalTicketChannelNameString,
                            type: ChannelType.GuildText,
                            parent: targetTicketPanelConfigObject.categoryId || null,
                            permissionOverwrites: channelPermissionOverwritesArray,
                            // التوبيك يحفظ (صاحب التذكرة _ نوعها _ رقمها _ حالتها) لفصل التقييمات لاحقاً
                            topic: `${interactingUserDiscordIdString}_normal_${ticketSequenceNumberInt}_open_none`
                        });

                        // 🎨 بناء الإيمبد الفخم داخل التذكرة (مع نظام الـ Code Blocks / المربعات)
                        const insideNormalTicketEmbedObject = new EmbedBuilder();
                        
                        insideNormalTicketEmbedObject.setTitle(targetTicketButtonConfigObject.insideEmbedTitle || 'تذكرة دعم فني');
                        insideNormalTicketEmbedObject.setDescription(targetTicketButtonConfigObject.insideEmbedDesc || 'فريق الدعم سيقوم بالرد عليك قريباً.');
                        insideNormalTicketEmbedObject.setColor(targetTicketButtonConfigObject.insideEmbedColor || '#2b2d31');

                        const normalModalFieldsArray = targetTicketButtonConfigObject.modalFields;
                        
                        for (let fieldIndex = 0; fieldIndex < normalModalFieldsArray.length; fieldIndex++) {
                            const currentFieldConfigObject = normalModalFieldsArray[fieldIndex];
                            const extractedUserAnswerString = incomingInteractionObject.fields.getTextInputValue(`normal_field_${fieldIndex}`);
                            
                            // نظام المربعات: إجابة العميل يتم وضعها في Code Block رمادي محدد الحواف
                            const boxedAnswerString = "```text\n" + extractedUserAnswerString + "\n```";
                            
                            insideNormalTicketEmbedObject.addFields({
                                name: currentFieldConfigObject.label,
                                value: boxedAnswerString,
                                inline: false
                            });
                        }

                        // 🎛️ بناء أزرار التحكم باللغة الإنجليزية للوحة التذكرة
                        const normalTicketControlTopActionRowObject = new ActionRowBuilder();
                        
                        const claimTicketButtonObject = new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Success);
                        const closeTicketButtonObject = new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Danger);
                        const addUserButtonObject = new ButtonBuilder().setCustomId('ticket_add_user').setLabel('Add User').setStyle(ButtonStyle.Secondary);
                        
                        normalTicketControlTopActionRowObject.addComponents(addUserButtonObject, claimTicketButtonObject, closeTicketButtonObject);
                        
                        const normalTicketControlBottomActionRowObject = new ActionRowBuilder();
                        const deleteWithReasonButtonObject = new ButtonBuilder().setCustomId('ticket_delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger);
                        
                        normalTicketControlBottomActionRowObject.addComponents(deleteWithReasonButtonObject);

                        // رسائل المنشن الخارجية للتنسيق الفخم
                        let externalMentionMessageString = `**Welcome <@${interactingUserDiscordIdString}>**\n`;
                        if (assignedAdminRoleIdString) {
                            externalMentionMessageString += `**Reason: ${targetTicketButtonConfigObject.label}** | <@&${assignedAdminRoleIdString}>`;
                        } else {
                            externalMentionMessageString += `**Reason: ${targetTicketButtonConfigObject.label}**`;
                        }

                        await createdNormalTicketChannelObject.send({
                            content: externalMentionMessageString,
                            embeds: [insideNormalTicketEmbedObject],
                            components: [normalTicketControlTopActionRowObject, normalTicketControlBottomActionRowObject]
                        });

                        await incomingInteractionObject.editReply({ 
                            content: `**✅ تم فتح تذكرة الدعم بنجاح: <#${createdNormalTicketChannelObject.id}>**` 
                        });

                    } catch (normalTicketCreationException) {
                        console.error('[INTERACTION ERROR] Failed to create Normal Ticket:', normalTicketCreationException);
                        await incomingInteractionObject.editReply({ content: '**❌ حدث خطأ أثناء إنشاء التذكرة.**' });
                    }
                }
                return;
            }

            // -----------------------------------------------------------------------------------------
            // 🛡️ ج. استقبال نافذة "إضافة عضو" (Add User Modal)
            // -----------------------------------------------------------------------------------------
            const isAddUserModalSubmitBoolean = (submittedModalCustomIdString === 'modal_add_user_submit');
            if (isAddUserModalSubmitBoolean === true) {
                await incomingInteractionObject.deferReply({ ephemeral: true });
                
                const providedUserIdString = incomingInteractionObject.fields.getTextInputValue('user_id_input');
                const currentTicketChannelObject = incomingInteractionObject.channel;

                try {
                    const targetUserToAddObject = await targetDiscordGuildObject.members.fetch(providedUserIdString);
                    if (!targetUserToAddObject) {
                        return await incomingInteractionObject.editReply({ content: '**❌ لم أتمكن من العثور على العضو بهذا الأيدي.**' });
                    }

                    await currentTicketChannelObject.permissionOverwrites.edit(providedUserIdString, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    });

                    await currentTicketChannelObject.send(`**✅ تم إضافة <@${providedUserIdString}> إلى التذكرة بواسطة <@${incomingInteractionObject.user.id}>.**`);
                    await incomingInteractionObject.editReply({ content: '**✅ تمت إضافة العضو بنجاح.**' });

                } catch (addUserException) {
                    await incomingInteractionObject.editReply({ content: '**❌ فشلت العملية، تأكد من أن الأيدي صحيح والعضو موجود في السيرفر.**' });
                }
                return;
            }

            // -----------------------------------------------------------------------------------------
            // 🗑️ د. استقبال نافذة "الحذف مع ذكر السبب" (Delete With Reason Modal)
            // -----------------------------------------------------------------------------------------
            const isDeleteWithReasonModalSubmitBoolean = (submittedModalCustomIdString === 'modal_delete_reason_submit');
            if (isDeleteWithReasonModalSubmitBoolean === true) {
                await incomingInteractionObject.deferReply({ ephemeral: false }); // ليس مخفياً ليعلم الجميع
                
                const providedDeleteReasonString = incomingInteractionObject.fields.getTextInputValue('delete_reason_input');
                const currentTicketChannelObject = incomingInteractionObject.channel;

                await incomingInteractionObject.editReply({ content: `**🗑️ سيتم حذف التذكرة بعد 5 ثوانٍ.**\n**السبب:** ${providedDeleteReasonString}` });

                setTimeout(async () => {
                    try {
                        await currentTicketChannelObject.delete(`تم الحذف بواسطة ${incomingInteractionObject.user.tag} - السبب: ${providedDeleteReasonString}`);
                    } catch (deleteChannelException) {}
                }, 5000);
                
                return;
            }
        }

        // =========================================================================================================
        // 🔘 4. التعامل مع أزرار التحكم داخل التذاكر (Ticket Control Buttons)
        // =========================================================================================================
        
        if (isInteractionAButtonBoolean === true) {
            
            const clickedControlCustomIdString = incomingInteractionObject.customId;
            const currentInteractionChannelObject = incomingInteractionObject.channel;

            // -----------------------------------------------------------------------------------------
            // 🛡️ زر استلام التذكرة (Claim)
            // -----------------------------------------------------------------------------------------
            if (clickedControlCustomIdString === 'ticket_claim') {
                await incomingInteractionObject.deferReply({ ephemeral: false });
                
                const claimingStaffUserIdString = incomingInteractionObject.user.id;
                
                const claimedEmbedObject = new EmbedBuilder();
                claimedEmbedObject.setDescription(`**✅ The ticket has been claimed by <@${claimingStaffUserIdString}>**`);
                claimedEmbedObject.setColor('#3ba55d');

                try {
                    // سحب الصلاحيات من باقي الإدارة وتركها للمستلم فقط (إذا كانت مفعلة في الداشبورد)
                    if (activeGuildConfigurationDocument.ticketControls.hideTicketOnClaim === true) {
                        const adminRoleIdString = activeGuildConfigurationDocument.roles.adminRoleId;
                        if (adminRoleIdString) {
                            await currentInteractionChannelObject.permissionOverwrites.edit(adminRoleIdString, {
                                ViewChannel: false
                            });
                        }
                    }

                    // إعطاء المستلم صلاحيات كاملة للتأكيد
                    await currentInteractionChannelObject.permissionOverwrites.edit(claimingStaffUserIdString, {
                        ViewChannel: true,
                        SendMessages: true,
                        ReadMessageHistory: true
                    });

                    await incomingInteractionObject.editReply({ embeds: [claimedEmbedObject] });
                    
                    // تغيير اسم التذكرة لإضافة كلمة claim
                    const originalChannelNameString = currentInteractionChannelObject.name;
                    const channelSequenceMatchArray = originalChannelNameString.match(/\d+/);
                    if (channelSequenceMatchArray) {
                        await currentInteractionChannelObject.setName(`claim-${channelSequenceMatchArray[0]}`);
                    }

                } catch (claimException) {
                    await incomingInteractionObject.editReply({ content: '**❌ حدث خطأ أثناء الاستلام.**' });
                }
                return;
            }

            // -----------------------------------------------------------------------------------------
            // 🔒 زر إغلاق التذكرة (Close) - مع التقييم الخاص بالإدارة
            // -----------------------------------------------------------------------------------------
            if (clickedControlCustomIdString === 'ticket_close') {
                await incomingInteractionObject.deferReply({ ephemeral: false });

                const closingStaffUserIdString = incomingInteractionObject.user.id;
                const channelTopicDataString = currentInteractionChannelObject.topic;
                let ticketOwnerDiscordIdString = null;
                let ticketTypeString = 'normal';

                // تحليل بيانات التوبيك لمعرفة نوع التذكرة وصاحبها
                if (channelTopicDataString) {
                    const topicExtractedPartsArray = channelTopicDataString.split('_');
                    ticketOwnerDiscordIdString = topicExtractedPartsArray[0];
                    ticketTypeString = topicExtractedPartsArray[1];
                }

                try {
                    // سحب صلاحية الكتابة والرؤية من العميل
                    if (ticketOwnerDiscordIdString && ticketOwnerDiscordIdString !== 'none') {
                        await currentInteractionChannelObject.permissionOverwrites.edit(ticketOwnerDiscordIdString, {
                            ViewChannel: false,
                            SendMessages: false
                        });
                    }

                    // تغيير اسم التذكرة إلى Closed
                    const originalChannelNameString = currentInteractionChannelObject.name;
                    const channelSequenceMatchArray = originalChannelNameString.match(/\d+/);
                    if (channelSequenceMatchArray) {
                        await currentInteractionChannelObject.setName(`closed-${channelSequenceMatchArray[0]}`);
                    }

                    // إرسال رسالة الإغلاق (Control Panel) للإدارة
                    const closedTicketControlEmbedObject = new EmbedBuilder();
                    closedTicketControlEmbedObject.setTitle('Ticket control');
                    closedTicketControlEmbedObject.setDescription(`Closed By: <@${closingStaffUserIdString}>\n(${closingStaffUserIdString})`);
                    closedTicketControlEmbedObject.setColor(activeGuildConfigurationDocument.ticketControls.controlPanelColor || '#2b2d31');

                    const controlPanelTopActionRowObject = new ActionRowBuilder();
                    const reopenTicketButtonObject = new ButtonBuilder().setCustomId('ticket_reopen').setLabel('Reopen ticket').setStyle(ButtonStyle.Secondary);
                    const deleteTicketButtonObject = new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete ticket').setStyle(ButtonStyle.Danger);
                    controlPanelTopActionRowObject.addComponents(reopenTicketButtonObject, deleteTicketButtonObject);
                    
                    const controlPanelBottomActionRowObject = new ActionRowBuilder();
                    const deleteWithReasonTicketButtonObject = new ButtonBuilder().setCustomId('ticket_delete_reason').setLabel('Delete With Reason').setStyle(ButtonStyle.Danger);
                    controlPanelBottomActionRowObject.addComponents(deleteWithReasonTicketButtonObject);

                    await incomingInteractionObject.editReply({ content: '**🔒 تم إغلاق التذكرة.**', embeds: [closedTicketControlEmbedObject], components: [controlPanelTopActionRowObject, controlPanelBottomActionRowObject] });

                    // --------------------------------------------------------------------------------
                    // ⭐ نظام تقييم الإدارة (Staff Rating System) - يرسل في التذاكر العادية فقط
                    // --------------------------------------------------------------------------------
                    // إذا كانت التذكرة (وساطة)، لا يتم إرسال تقييم هنا، لأن أمر !done هو المسؤول عنها.
                    if (ticketTypeString === 'normal' && ticketOwnerDiscordIdString && ticketOwnerDiscordIdString !== 'none') {
                        
                        const doesGuildHaveStaffRatingChannelBoolean = activeGuildConfigurationDocument.ratings.staffLogChannelId;
                        
                        if (doesGuildHaveStaffRatingChannelBoolean) {
                            try {
                                const targetTicketOwnerMemberObject = await targetDiscordGuildObject.members.fetch(ticketOwnerDiscordIdString);
                                
                                const staffRatingRequestEmbedObject = new EmbedBuilder();
                                staffRatingRequestEmbedObject.setTitle('تقييم الدعم الفني (Staff Review)');
                                staffRatingRequestEmbedObject.setDescription(`شكراً لتواصلك معنا في **${targetDiscordGuildObject.name}**\n\nيرجى تقييم أداء الإداري <@${closingStaffUserIdString}> لحل مشكلتك.`);
                                staffRatingRequestEmbedObject.setColor(activeGuildConfigurationDocument.ratings.staffEmbedColor || '#3ba55d');
                                staffRatingRequestEmbedObject.setTimestamp();
                                staffRatingRequestEmbedObject.setFooter({ text: targetDiscordGuildObject.name, iconURL: targetDiscordGuildObject.iconURL({ dynamic: true }) });

                                const staffRatingActionRowObject = new ActionRowBuilder();
                                // إرسال أزرار التقييم للإدارة
                                const s1 = new ButtonBuilder().setCustomId(`rate_staff_1_${closingStaffUserIdString}_${targetDiscordGuildObject.id}`).setLabel('⭐').setStyle(ButtonStyle.Secondary);
                                const s2 = new ButtonBuilder().setCustomId(`rate_staff_2_${closingStaffUserIdString}_${targetDiscordGuildObject.id}`).setLabel('⭐⭐').setStyle(ButtonStyle.Secondary);
                                const s3 = new ButtonBuilder().setCustomId(`rate_staff_3_${closingStaffUserIdString}_${targetDiscordGuildObject.id}`).setLabel('⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                                const s4 = new ButtonBuilder().setCustomId(`rate_staff_4_${closingStaffUserIdString}_${targetDiscordGuildObject.id}`).setLabel('⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);
                                const s5 = new ButtonBuilder().setCustomId(`rate_staff_5_${closingStaffUserIdString}_${targetDiscordGuildObject.id}`).setLabel('⭐⭐⭐⭐⭐').setStyle(ButtonStyle.Secondary);

                                staffRatingActionRowObject.addComponents(s1, s2, s3, s4, s5);

                                await targetTicketOwnerMemberObject.send({ embeds: [staffRatingRequestEmbedObject], components: [staffRatingActionRowObject] });
                            } catch (dmClosedException) {
                                console.log('[TICKET CONTROL WARNING] Could not send Staff Rating. User DM is closed.');
                            }
                        }
                    }

                } catch (closeException) {
                    await incomingInteractionObject.editReply({ content: '**❌ حدث خطأ أثناء إغلاق التذكرة.**' });
                }
                return;
            }

            // -----------------------------------------------------------------------------------------
            // ➕ زر إضافة عضو للتذكرة (Add User)
            // -----------------------------------------------------------------------------------------
            if (clickedControlCustomIdString === 'ticket_add_user') {
                const addUserModalBuilderObject = new ModalBuilder();
                addUserModalBuilderObject.setCustomId('modal_add_user_submit');
                addUserModalBuilderObject.setTitle('Add User | إضافة عضو');

                const userIdTextInputObject = new TextInputBuilder();
                userIdTextInputObject.setCustomId('user_id_input');
                userIdTextInputObject.setLabel('User ID (أيدي العضو المراد إضافته):');
                userIdTextInputObject.setStyle(TextInputStyle.Short);
                userIdTextInputObject.setRequired(true);

                const addUserActionRowObject = new ActionRowBuilder().addComponents(userIdTextInputObject);
                addUserModalBuilderObject.addComponents(addUserActionRowObject);

                await incomingInteractionObject.showModal(addUserModalBuilderObject);
                return;
            }

            // -----------------------------------------------------------------------------------------
            // 🗑️ زر الحذف المباشر (Delete)
            // -----------------------------------------------------------------------------------------
            if (clickedControlCustomIdString === 'ticket_delete') {
                await incomingInteractionObject.deferReply({ ephemeral: false });
                await incomingInteractionObject.editReply({ content: '**🗑️ سيتم حذف التذكرة نهائياً خلال 5 ثوانٍ.**' });
                
                setTimeout(async () => {
                    try {
                        await currentInteractionChannelObject.delete();
                    } catch (e) {}
                }, 5000);
                return;
            }

            // -----------------------------------------------------------------------------------------
            // 🗑️ زر الحذف مع السبب (Delete With Reason)
            // -----------------------------------------------------------------------------------------
            if (clickedControlCustomIdString === 'ticket_delete_reason') {
                const deleteReasonModalBuilderObject = new ModalBuilder();
                deleteReasonModalBuilderObject.setCustomId('modal_delete_reason_submit');
                deleteReasonModalBuilderObject.setTitle('Delete Ticket | حذف التذكرة');

                const deleteReasonTextInputObject = new TextInputBuilder();
                deleteReasonTextInputObject.setCustomId('delete_reason_input');
                deleteReasonTextInputObject.setLabel('Reason for deletion (سبب الحذف):');
                deleteReasonTextInputObject.setStyle(TextInputStyle.Paragraph);
                deleteReasonTextInputObject.setRequired(true);

                const deleteReasonActionRowObject = new ActionRowBuilder().addComponents(deleteReasonTextInputObject);
                deleteReasonModalBuilderObject.addComponents(deleteReasonActionRowObject);

                await incomingInteractionObject.showModal(deleteReasonModalBuilderObject);
                return;
            }

            // -----------------------------------------------------------------------------------------
            // 🔓 زر إعادة الفتح (Reopen)
            // -----------------------------------------------------------------------------------------
            if (clickedControlCustomIdString === 'ticket_reopen') {
                await incomingInteractionObject.deferReply({ ephemeral: false });

                const channelTopicDataStringForReopen = currentInteractionChannelObject.topic;
                let ticketOwnerDiscordIdForReopenString = null;

                if (channelTopicDataStringForReopen) {
                    const topicExtractedPartsForReopenArray = channelTopicDataStringForReopen.split('_');
                    ticketOwnerDiscordIdForReopenString = topicExtractedPartsForReopenArray[0];
                }

                try {
                    // إعادة الصلاحية للعميل
                    if (ticketOwnerDiscordIdForReopenString && ticketOwnerDiscordIdForReopenString !== 'none') {
                        await currentInteractionChannelObject.permissionOverwrites.edit(ticketOwnerDiscordIdForReopenString, {
                            ViewChannel: true,
                            SendMessages: true
                        });
                    }

                    // إرجاع اسم التذكرة لشكلها الأصلي
                    const originalChannelNameStringForReopen = currentInteractionChannelObject.name;
                    const channelSequenceMatchForReopenArray = originalChannelNameStringForReopen.match(/\d+/);
                    if (channelSequenceMatchForReopenArray) {
                        await currentInteractionChannelObject.setName(`ticket-${channelSequenceMatchForReopenArray[0]}`);
                    }

                    // مسح بانل الإغلاق
                    try {
                        await incomingInteractionObject.message.delete();
                    } catch (e) {}

                    await incomingInteractionObject.channel.send(`**🔓 تم إعادة فتح التذكرة بواسطة <@${incomingInteractionObject.user.id}>.**`);

                } catch (reopenException) {
                    await incomingInteractionObject.editReply({ content: '**❌ حدث خطأ أثناء محاولة إعادة الفتح.**' });
                }
                return;
            }
        }
    }
};
