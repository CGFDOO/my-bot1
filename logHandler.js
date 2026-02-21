// =========================================================================================================
// 📁 نظام السجلات والترحيب العالمي (UNIVERSAL LOGS & WELCOME HANDLER)
// =========================================================================================================

const discordLibrary = require('discord.js');
const EmbedBuilder = discordLibrary.EmbedBuilder;
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {

    // =========================================================================================================
    // 🎉 1. نظام الترحيب وإعطاء الرتبة التلقائية (Guild Member Add)
    // =========================================================================================================
    client.on('guildMemberAdd', async (member) => {
        
        const targetGuildObject = member.guild;
        if (!targetGuildObject) return;

        const currentGuildIdString = targetGuildObject.id;
        
        let serverConfigDocument = null;
        try {
            serverConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        } catch (databaseFetchException) {
            return;
        }
        
        if (!serverConfigDocument) return;

        // -------------------------------------------------------------------------
        // 🏅 إعطاء الرتبة التلقائية (Auto Role)
        // -------------------------------------------------------------------------
        const autoRoleIdString = serverConfigDocument.autoRoleId;
        if (autoRoleIdString) {
            try {
                const roleToAssignObject = targetGuildObject.roles.cache.get(autoRoleIdString);
                if (roleToAssignObject) {
                    await member.roles.add(roleToAssignObject);
                }
            } catch (roleAssignException) {}
        }

        // -------------------------------------------------------------------------
        // 🖼️ إرسال رسالة الترحيب (Welcome Message)
        // -------------------------------------------------------------------------
        const welcomeChannelIdString = serverConfigDocument.welcomeChannelId;
        if (welcomeChannelIdString) {
            const welcomeChannelObject = targetGuildObject.channels.cache.get(welcomeChannelIdString);
            
            if (welcomeChannelObject) {
                
                let rawWelcomeMessageString = serverConfigDocument.welcomeMessage;
                if (!rawWelcomeMessageString) {
                    rawWelcomeMessageString = 'حياك الله يا [user] في [server]! أنت العضو رقم [memberCount].';
                }
                
                let formattedWelcomeMessageString = rawWelcomeMessageString;
                formattedWelcomeMessageString = formattedWelcomeMessageString.replace(/\[user\]/g, `<@${member.id}>`);
                formattedWelcomeMessageString = formattedWelcomeMessageString.replace(/\[server\]/g, targetGuildObject.name);
                formattedWelcomeMessageString = formattedWelcomeMessageString.replace(/\[memberCount\]/g, targetGuildObject.memberCount);

                const welcomeEmbedObject = new EmbedBuilder();
                welcomeEmbedObject.setDescription(formattedWelcomeMessageString);
                
                const configuredWelcomeColorHex = serverConfigDocument.welcomeEmbedColor;
                welcomeEmbedObject.setColor(configuredWelcomeColorHex || '#5865F2');
                
                const configuredWelcomeImageUrl = serverConfigDocument.welcomeBgImage;
                if (configuredWelcomeImageUrl) {
                    welcomeEmbedObject.setImage(configuredWelcomeImageUrl);
                }
                
                welcomeEmbedObject.setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }));
                welcomeEmbedObject.setTimestamp();

                try {
                    await welcomeChannelObject.send({ content: `<@${member.id}>`, embeds: [welcomeEmbedObject] });
                } catch (welcomeSendException) {}
            }
        }

        // -------------------------------------------------------------------------
        // 📥 سجل الدخول (Join Log)
        // -------------------------------------------------------------------------
        const joinLeaveLogChannelIdString = serverConfigDocument.logJoinLeaveId;
        if (joinLeaveLogChannelIdString) {
            const joinLeaveLogChannelObject = targetGuildObject.channels.cache.get(joinLeaveLogChannelIdString);
            if (joinLeaveLogChannelObject) {
                
                const joinLogEmbedObject = new EmbedBuilder();
                joinLogEmbedObject.setAuthor({ name: '📥 عضو جديد انضم', iconURL: member.user.displayAvatarURL({ dynamic: true }) });
                
                let joinDescriptionString = `**العضو:** <@${member.id}> (${member.user.tag})\n`;
                joinDescriptionString += `**الأيدي:** ${member.id}\n`;
                joinDescriptionString += `**تاريخ إنشاء الحساب:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n`;
                joinDescriptionString += `**عدد الأعضاء الآن:** ${targetGuildObject.memberCount}`;
                
                joinLogEmbedObject.setDescription(joinDescriptionString);
                joinLogEmbedObject.setColor('#3ba55d');
                joinLogEmbedObject.setTimestamp();
                
                try { await joinLeaveLogChannelObject.send({ embeds: [joinLogEmbedObject] }); } catch (e) {}
            }
        }
    });

    // =========================================================================================================
    // 🚪 2. تسجيل الخروج (Guild Member Remove)
    // =========================================================================================================
    client.on('guildMemberRemove', async (member) => {
        
        const targetGuildObject = member.guild;
        if (!targetGuildObject) return;

        let serverConfigDocument = null;
        try { serverConfigDocument = await GuildConfig.findOne({ guildId: targetGuildObject.id }); } catch(e) {}
        if (!serverConfigDocument) return;

        const joinLeaveLogChannelIdString = serverConfigDocument.logJoinLeaveId;
        if (joinLeaveLogChannelIdString) {
            const joinLeaveLogChannelObject = targetGuildObject.channels.cache.get(joinLeaveLogChannelIdString);
            if (joinLeaveLogChannelObject) {
                
                const leaveLogEmbedObject = new EmbedBuilder();
                leaveLogEmbedObject.setAuthor({ name: '📤 عضو غادر السيرفر', iconURL: member.user.displayAvatarURL({ dynamic: true }) });
                
                let leaveDescriptionString = `**العضو:** ${member.user.tag}\n`;
                leaveDescriptionString += `**الأيدي:** ${member.id}\n`;
                leaveDescriptionString += `**عدد الأعضاء الآن:** ${targetGuildObject.memberCount}`;
                
                leaveLogEmbedObject.setDescription(leaveDescriptionString);
                leaveLogEmbedObject.setColor('#ed4245');
                leaveLogEmbedObject.setTimestamp();
                
                try { await joinLeaveLogChannelObject.send({ embeds: [leaveLogEmbedObject] }); } catch (e) {}
            }
        }
    });

    // =========================================================================================================
    // 🗑️ 3. سجل حذف الرسائل (Message Delete)
    // =========================================================================================================
    client.on('messageDelete', async (message) => {
        
        if (message.partial) return;
        if (message.author && message.author.bot) return;
        if (!message.guild) return;

        let serverConfigDocument = null;
        try { serverConfigDocument = await GuildConfig.findOne({ guildId: message.guild.id }); } catch(e) {}
        if (!serverConfigDocument) return;

        const msgDeleteLogChannelIdString = serverConfigDocument.logMsgDeleteId;
        if (msgDeleteLogChannelIdString) {
            const msgDeleteLogChannelObject = message.guild.channels.cache.get(msgDeleteLogChannelIdString);
            if (msgDeleteLogChannelObject) {
                
                const deleteLogEmbedObject = new EmbedBuilder();
                deleteLogEmbedObject.setAuthor({ name: '🗑️ رسالة حُذفت', iconURL: message.author.displayAvatarURL({ dynamic: true }) });
                
                let deleteDescriptionString = `**المرسل:** <@${message.author.id}>\n`;
                deleteDescriptionString += `**الروم:** <#${message.channel.id}>\n\n`;
                
                let safeMessageContent = message.content;
                if (!safeMessageContent || safeMessageContent === '') {
                    safeMessageContent = '(رسالة فارغة أو إيمبد)';
                } else if (safeMessageContent.length > 1024) {
                    safeMessageContent = safeMessageContent.substring(0, 1020) + '...';
                }
                
                deleteLogEmbedObject.addFields({ name: 'المحتوى:', value: safeMessageContent });
                deleteLogEmbedObject.setColor('#ed4245');
                deleteLogEmbedObject.setTimestamp();
                
                try { await msgDeleteLogChannelObject.send({ embeds: [deleteLogEmbedObject] }); } catch (e) {}
            }
        }
    });

    // =========================================================================================================
    // ✏️ 4. سجل تعديل الرسائل (Message Update)
    // =========================================================================================================
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        
        if (oldMessage.partial || newMessage.partial) return;
        if (oldMessage.author && oldMessage.author.bot) return;
        if (!oldMessage.guild) return;
        if (oldMessage.content === newMessage.content) return;

        let serverConfigDocument = null;
        try { serverConfigDocument = await GuildConfig.findOne({ guildId: oldMessage.guild.id }); } catch(e) {}
        if (!serverConfigDocument) return;

        const msgUpdateLogChannelIdString = serverConfigDocument.logMsgUpdateId;
        if (msgUpdateLogChannelIdString) {
            const msgUpdateLogChannelObject = oldMessage.guild.channels.cache.get(msgUpdateLogChannelIdString);
            if (msgUpdateLogChannelObject) {
                
                const updateLogEmbedObject = new EmbedBuilder();
                updateLogEmbedObject.setAuthor({ name: '✏️ رسالة عُدلت', iconURL: oldMessage.author.displayAvatarURL({ dynamic: true }) });
                
                let updateDescriptionString = `**المرسل:** <@${oldMessage.author.id}>\n`;
                updateDescriptionString += `**الروم:** <#${oldMessage.channel.id}>\n`;
                updateDescriptionString += `[الذهاب للرسالة](${newMessage.url})`;
                
                updateLogEmbedObject.setDescription(updateDescriptionString);
                
                let safeOldContent = oldMessage.content || 'فارغ';
                if (safeOldContent.length > 1024) safeOldContent = safeOldContent.substring(0, 1020) + '...';
                
                let safeNewContent = newMessage.content || 'فارغ';
                if (safeNewContent.length > 1024) safeNewContent = safeNewContent.substring(0, 1020) + '...';

                updateLogEmbedObject.addFields(
                    { name: 'قبل التعديل:', value: safeOldContent },
                    { name: 'بعد التعديل:', value: safeNewContent }
                );
                
                updateLogEmbedObject.setColor('#f2a658');
                updateLogEmbedObject.setTimestamp();
                
                try { await msgUpdateLogChannelObject.send({ embeds: [updateLogEmbedObject] }); } catch (e) {}
            }
        }
    });
};
