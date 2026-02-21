// =========================================================================================================
// ⚖️ أمر طلب معلومات المعاملة (TRADE COMMAND - ENTERPRISE EDITION)
// ---------------------------------------------------------------------------------------------------------
// المسار: commands/middleman/trade.js
// الوظيفة: إرسال زر تفاصيل المعاملة بعد التأكد من صلاحيات العضو عبر الداشبورد.
// =========================================================================================================

const discordLibrary = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = discordLibrary;

module.exports = {
    name: 'trade',
    aliases: ['تريد', 'معاملة'],
    
    async execute(incomingMessageObject, commandArgumentsArray, discordClientObject, activeGuildConfigurationDocument) {
        
        // =========================================================================================================
        // 👮 1. فحص الرتب المسموح لها باستخدام الأمر (من المصفوفات في الداشبورد)
        // =========================================================================================================
        const dashboardConfiguredTradeRolesArray = activeGuildConfigurationDocument.commands.tradeAllowedRoles || [];
        let doesMemberHavePermissionToUseTradeBoolean = false;
        
        const executingMemberPermissionsObject = incomingMessageObject.member.permissions;
        const executingMemberRolesCacheObject = incomingMessageObject.member.roles.cache;

        if (executingMemberPermissionsObject.has(PermissionFlagsBits.Administrator) === true) {
            doesMemberHavePermissionToUseTradeBoolean = true;
        } else {
            for (let roleIndex = 0; roleIndex < dashboardConfiguredTradeRolesArray.length; roleIndex++) {
                const currentRoleIdToCheckString = dashboardConfiguredTradeRolesArray[roleIndex];
                if (currentRoleIdToCheckString && executingMemberRolesCacheObject.has(currentRoleIdToCheckString)) {
                    doesMemberHavePermissionToUseTradeBoolean = true; 
                    break;
                }
            }
            
            // دعم احتياطي (Fallback) للرتب الأساسية
            const fallbackMiddlemanRoleIdString = activeGuildConfigurationDocument.roles.middlemanRoleId;
            if (doesMemberHavePermissionToUseTradeBoolean === false && fallbackMiddlemanRoleIdString && executingMemberRolesCacheObject.has(fallbackMiddlemanRoleIdString)) {
                doesMemberHavePermissionToUseTradeBoolean = true;
            }
        }
        
        if (doesMemberHavePermissionToUseTradeBoolean === false) {
            try { 
                return await incomingMessageObject.reply({ content: '**❌ عذراً، لا تمتلك صلاحية لاستخدام أمر تفاصيل المعاملة.**' }); 
            } catch (replyException) { return; }
        }

        // =========================================================================================================
        // ⚖️ 2. حذف رسالة الأمر وإرسال البانل
        // =========================================================================================================
        try { 
            await incomingMessageObject.delete(); 
        } catch (deleteMessageException) {}

        const provideTradeDetailsToClientEmbedObject = new EmbedBuilder();
        provideTradeDetailsToClientEmbedObject.setTitle('⚖️ تفاصيل المعاملة (Trade Details)');
        
        let comprehensiveTradeEmbedDescriptionString = `مرحباً بك عزيزي العميل.\n`;
        comprehensiveTradeEmbedDescriptionString += `يرجى الضغط على الزر أدناه وكتابة جميع تفاصيل المعاملة بدقة (الحسابات، الأسعار، الشروط).\n\n`;
        comprehensiveTradeEmbedDescriptionString += `سيتم إرسال طلبك للإدارة العليا للموافقة عليه، وسيتم إرفاقه في التقييم لضمان حقك.`;
        
        provideTradeDetailsToClientEmbedObject.setDescription(comprehensiveTradeEmbedDescriptionString);
        provideTradeDetailsToClientEmbedObject.setColor(activeGuildConfigurationDocument.commands.tradeEmbedColor || '#f2a658');
        
        const openTradeModalActionRowObject = new ActionRowBuilder();
        const openTradeModalInteractiveButtonObject = new ButtonBuilder();
        openTradeModalInteractiveButtonObject.setCustomId('open_trade_modal');
        openTradeModalInteractiveButtonObject.setLabel('إدخال تفاصيل التريد 📝');
        openTradeModalInteractiveButtonObject.setStyle(ButtonStyle.Primary);
        
        openTradeModalActionRowObject.addComponents(openTradeModalInteractiveButtonObject);
        
        try {
            await incomingMessageObject.channel.send({ 
                embeds: [provideTradeDetailsToClientEmbedObject], 
                components: [openTradeModalActionRowObject] 
            });
        } catch (sendTradePanelException) { 
            console.error('[TRADE COMMAND ERROR]', sendTradePanelException); 
        }
    }
};
