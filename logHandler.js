// =========================================================================================================
// 📁 نظام السجلات والترحيب العالمي (UNIVERSAL LOGS & WELCOME HANDLER)
// =========================================================================================================

const discordLibrary = require('discord.js');
const EmbedBuilder = discordLibrary.EmbedBuilder;
const AuditLogEvent = discordLibrary.AuditLogEvent;

const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {

    // =========================================================================================================
    // 🎉 1. نظام الترحيب وإعطاء الرتبة التلقائية وتسجيل الدخول (Guild Member Add)
    // =========================================================================================================
    client.on('guildMemberAdd', async (member) => {
        
        const targetGuildObject = member.guild;
        if (!targetGuildObject) return;

        const currentGuildIdString = targetGuildObject.id;
        
        let serverConfigDocument = null;
        try {
            serverConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        } catch (dbError) {
            console.log("[LOG HANDLER] Error fetching config for member add: ", dbError);
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
            } catch (roleAssignException) {
                console.log("[LOG HANDLER] Could not assign auto-role.");
            }
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
                
                // استبدال المتغيرات بدقة
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
                joinLogEmbedObject.setColor('#3ba55d'); // لون أخضر للدخول
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

        const serverConfigDocument = await GuildConfig.findOne({ guildId: targetGuildObject.id }).catch(()=>{});
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
                leaveLogEmbedObject.setColor('#ed4245'); // لون أحمر للخروج
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

        const serverConfigDocument = await GuildConfig.findOne({ guildId: message.guild.id }).catch(()=>{});
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
                    safeMessageContent = '(رسالة فارغة أو تحتوي على مرفقات فقط)';
                } else if (safeMessageContent.length > 1024) {
                    safeMessageContent = safeMessageContent.substring(0, 1020) + '...';
                }
                
                deleteLogEmbedObject.addFields({ name: 'محتوى الرسالة:', value: safeMessageContent });
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
        
        if (oldMessage.partial) return;
        if (newMessage.partial) return;
        if (oldMessage.author && oldMessage.author.bot) return;
        if (!oldMessage.guild) return;
        if (oldMessage.content === newMessage.content) return; // منع اللوج إذا كان التعديل في الإيمبد فقط

        const serverConfigDocument = await GuildConfig.findOne({ guildId: oldMessage.guild.id }).catch(()=>{});
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
                
                updateLogEmbedObject.setColor('#f2a658'); // لون برتقالي للتعديل
                updateLogEmbedObject.setTimestamp();
                
                try { await msgUpdateLogChannelObject.send({ embeds: [updateLogEmbedObject] }); } catch (e) {}
            }
        }
    });

    // =========================================================================================================
    // 🎙️ 5. سجل الرومات الصوتية (Voice State Update)
    // =========================================================================================================
    client.on('voiceStateUpdate', async (oldState, newState) => {
        
        const targetGuildObject = newState.guild || oldState.guild;
        if (!targetGuildObject) return;
        
        if (newState.member && newState.member.user.bot) return;

        const serverConfigDocument = await GuildConfig.findOne({ guildId: targetGuildObject.id }).catch(()=>{});
        if (!serverConfigDocument) return;

        const voiceLogChannelIdString = serverConfigDocument.logVoiceId;
        if (!voiceLogChannelIdString) return;

        const voiceLogChannelObject = targetGuildObject.channels.cache.get(voiceLogChannelIdString);
        if (!voiceLogChannelObject) return;

        const memberIdString = newState.id;
        const voiceLogEmbedObject = new EmbedBuilder();
        voiceLogEmbedObject.setTimestamp();

        // دخول روم صوتي
        if (!oldState.channelId && newState.channelId) {
            voiceLogEmbedObject.setAuthor({ name: '🎙️ دخول روم صوتي', iconURL: newState.member.user.displayAvatarURL({ dynamic: true }) });
            voiceLogEmbedObject.setDescription(`**العضو:** <@${memberIdString}>\n**الروم:** <#${newState.channelId}>`);
            voiceLogEmbedObject.setColor('#3ba55d');
            try { await voiceLogChannelObject.send({ embeds: [voiceLogEmbedObject] }); } catch (e) {}
        }
        // خروج من روم صوتي
        else if (oldState.channelId && !newState.channelId) {
            voiceLogEmbedObject.setAuthor({ name: '🔇 خروج من روم صوتي', iconURL: newState.member.user.displayAvatarURL({ dynamic: true }) });
            voiceLogEmbedObject.setDescription(`**العضو:** <@${memberIdString}>\n**الروم:** <#${oldState.channelId}>`);
            voiceLogEmbedObject.setColor('#ed4245');
            try { await voiceLogChannelObject.send({ embeds: [voiceLogEmbedObject] }); } catch (e) {}
        }
        // انتقال بين الرومات
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            voiceLogEmbedObject.setAuthor({ name: '🔄 انتقال صوتي', iconURL: newState.member.user.displayAvatarURL({ dynamic: true }) });
            voiceLogEmbedObject.setDescription(`**العضو:** <@${memberIdString}>\n**من روم:** <#${oldState.channelId}>\n**إلى روم:** <#${newState.channelId}>`);
            voiceLogEmbedObject.setColor('#f2a658');
            try { await voiceLogChannelObject.send({ embeds: [voiceLogEmbedObject] }); } catch (e) {}
        }
    });

    // =========================================================================================================
    // 🎭 6. سجل تحديث رتب الأعضاء (Member Role Update)
    // =========================================================================================================
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        
        if (oldMember.roles.cache.size === newMember.roles.cache.size) return;

        const targetGuildObject = newMember.guild;
        const serverConfigDocument = await GuildConfig.findOne({ guildId: targetGuildObject.id }).catch(()=>{});
        if (!serverConfigDocument) return;

        const roleUpdateLogChannelIdString = serverConfigDocument.logMemberRoleUpdateId;
        if (!roleUpdateLogChannelIdString) return;

        const roleLogChannelObject = targetGuildObject.channels.cache.get(roleUpdateLogChannelIdString);
        if (!roleLogChannelObject) return;

        // اكتشاف الرتب المضافة أو المزالة
        const addedRolesCollection = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
        const removedRolesCollection = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

        const roleLogEmbedObject = new EmbedBuilder();
        roleLogEmbedObject.setAuthor({ name: '🎭 تحديث رتب العضو', iconURL: newMember.user.displayAvatarURL({ dynamic: true }) });
        roleLogEmbedObject.setTimestamp();

        let descriptionBuilderString = `**العضو:** <@${newMember.id}>\n\n`;

        if (addedRolesCollection.size > 0) {
            const addedRolesMap = addedRolesCollection.map(r => `<@&${r.id}>`).join(', ');
            descriptionBuilderString += `**✅ رتب أُضيفت:**\n${addedRolesMap}\n\n`;
            roleLogEmbedObject.setColor('#3ba55d');
        }

        if (removedRolesCollection.size > 0) {
            const removedRolesMap = removedRolesCollection.map(r => `<@&${r.id}>`).join(', ');
            descriptionBuilderString += `**❌ رتب سُحبت:**\n${removedRolesMap}\n`;
            if (addedRolesCollection.size === 0) roleLogEmbedObject.setColor('#ed4245');
        }

        roleLogEmbedObject.setDescription(descriptionBuilderString);
        try { await roleLogChannelObject.send({ embeds: [roleLogEmbedObject] }); } catch (e) {}
    });

}; // نهاية ملف اللوجات
