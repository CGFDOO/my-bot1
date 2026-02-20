// =====================================================================
// 📦 استدعاء المكاتب الأساسية (تم الفرد سطر سطر لضمان الدقة)
// =====================================================================
const discordLibrary = require('discord.js');
const EmbedBuilder = discordLibrary.EmbedBuilder;
const AuditLogEvent = discordLibrary.AuditLogEvent;

// استدعاء قاعدة البيانات الشاملة
const GuildConfig = require('./models/GuildConfig');

module.exports = (client) => {

    // =====================================================================
    // 🗑️ 1. نظام مراقبة حذف الرسائل (Message Delete)
    // =====================================================================
    client.on('messageDelete', async (message) => {
        
        const messageAuthorIsBot = message.author?.bot;
        if (messageAuthorIsBot === true) {
            return;
        }

        const messageGuildObject = message.guild;
        if (!messageGuildObject) {
            return;
        }

        const currentGuildIdString = messageGuildObject.id;
        const guildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        
        if (!guildConfigDocument) {
            return;
        }

        const logChannelIdString = guildConfigDocument.logMsgDeleteId;
        if (!logChannelIdString) {
            return;
        }

        const logChannelObject = messageGuildObject.channels.cache.get(logChannelIdString);
        if (!logChannelObject) {
            return;
        }

        let messageContentString = message.content;
        if (!messageContentString) {
            messageContentString = 'تم حذف رسالة لا تحتوي على نص (ربما صورة أو إيمبد).';
        }

        const deleteLogEmbed = new EmbedBuilder();
        deleteLogEmbed.setTitle('🗑️ Message Deleted (رسالة حُذفت)');
        
        let descriptionString = `**👤 العضو:** <@${message.author.id}>\n`;
        descriptionString += `**📺 الروم:** <#${message.channel.id}>\n\n`;
        descriptionString += `**📝 محتوى الرسالة:**\n>>> ${messageContentString}`;
        
        deleteLogEmbed.setDescription(descriptionString);
        
        let logColorHex = guildConfigDocument.logEmbedColor;
        if (!logColorHex) {
            logColorHex = '#ed4245';
        }
        deleteLogEmbed.setColor(logColorHex);
        deleteLogEmbed.setTimestamp();
        
        try {
            await logChannelObject.send({ embeds: [deleteLogEmbed] });
        } catch (error) {}
    });

    // =====================================================================
    // ✍️ 2. نظام مراقبة تعديل الرسائل (Message Update)
    // =====================================================================
    client.on('messageUpdate', async (oldMessage, newMessage) => {
        
        const messageAuthorIsBot = oldMessage.author?.bot;
        if (messageAuthorIsBot === true) {
            return;
        }

        const messageGuildObject = oldMessage.guild;
        if (!messageGuildObject) {
            return;
        }
        
        if (oldMessage.content === newMessage.content) {
            return; // لم يتغير النص الفعلي
        }

        const currentGuildIdString = messageGuildObject.id;
        const guildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        
        if (!guildConfigDocument) {
            return;
        }

        const logChannelIdString = guildConfigDocument.logMsgUpdateId;
        if (!logChannelIdString) {
            return;
        }

        const logChannelObject = messageGuildObject.channels.cache.get(logChannelIdString);
        if (!logChannelObject) {
            return;
        }

        const updateLogEmbed = new EmbedBuilder();
        updateLogEmbed.setTitle('✍️ Message Updated (رسالة عُدلت)');
        
        let descriptionString = `**👤 العضو:** <@${oldMessage.author.id}>\n`;
        descriptionString += `**📺 الروم:** <#${oldMessage.channel.id}>\n\n`;
        descriptionString += `**🔴 النص القديم:**\n>>> ${oldMessage.content || 'غير معروف'}\n\n`;
        descriptionString += `**🟢 النص الجديد:**\n>>> ${newMessage.content || 'غير معروف'}\n\n`;
        descriptionString += `[الذهاب للرسالة](${newMessage.url})`;
        
        updateLogEmbed.setDescription(descriptionString);
        
        let logColorHex = guildConfigDocument.logEmbedColor;
        if (!logColorHex) {
            logColorHex = '#ed4245';
        }
        updateLogEmbed.setColor(logColorHex);
        updateLogEmbed.setTimestamp();
        
        try {
            await logChannelObject.send({ embeds: [updateLogEmbed] });
        } catch (error) {}
    });

    // =====================================================================
    // 🎙️ 3. نظام مراقبة الغرف الصوتية (Voice State Update)
    // =====================================================================
    client.on('voiceStateUpdate', async (oldState, newState) => {
        
        const messageGuildObject = newState.guild;
        if (!messageGuildObject) {
            return;
        }

        const currentGuildIdString = messageGuildObject.id;
        const guildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        
        if (!guildConfigDocument) {
            return;
        }

        const logChannelIdString = guildConfigDocument.logVoiceId;
        if (!logChannelIdString) {
            return;
        }

        const logChannelObject = messageGuildObject.channels.cache.get(logChannelIdString);
        if (!logChannelObject) {
            return;
        }

        const voiceLogEmbed = new EmbedBuilder();
        
        let logColorHex = guildConfigDocument.logEmbedColor;
        if (!logColorHex) {
            logColorHex = '#ed4245';
        }
        voiceLogEmbed.setColor(logColorHex);
        voiceLogEmbed.setTimestamp();

        const memberIdString = newState.id;

        // حالة الدخول لفويس
        if (!oldState.channelId && newState.channelId) {
            voiceLogEmbed.setTitle('🎙️ Voice Join (دخول للروم الصوتي)');
            voiceLogEmbed.setDescription(`**👤 العضو:** <@${memberIdString}>\n**🔊 الروم:** <#${newState.channelId}>`);
            try { await logChannelObject.send({ embeds: [voiceLogEmbed] }); } catch (e) {}
        }
        // حالة الخروج من فويس
        else if (oldState.channelId && !newState.channelId) {
            voiceLogEmbed.setTitle('🎙️ Voice Leave (خروج من الروم الصوتي)');
            voiceLogEmbed.setDescription(`**👤 العضو:** <@${memberIdString}>\n**🔇 الروم:** <#${oldState.channelId}>`);
            try { await logChannelObject.send({ embeds: [voiceLogEmbed] }); } catch (e) {}
        }
        // حالة النقل من فويس لفويس آخر
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            voiceLogEmbed.setTitle('🎙️ Voice Move (انتقال صوتي)');
            voiceLogEmbed.setDescription(`**👤 العضو:** <@${memberIdString}>\n**🔴 من روم:** <#${oldState.channelId}>\n**🟢 إلى روم:** <#${newState.channelId}>`);
            try { await logChannelObject.send({ embeds: [voiceLogEmbed] }); } catch (e) {}
        }
    });

    // =====================================================================
    // 🚪 4. نظام مراقبة الدخول والخروج وإعطاء رتبة الدخول (Join/Leave & Auto-Role)
    // =====================================================================
    client.on('guildMemberAdd', async (member) => {
        
        const messageGuildObject = member.guild;
        const currentGuildIdString = messageGuildObject.id;
        const guildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        
        if (!guildConfigDocument) {
            return;
        }

        // 🔥 إعطاء رتبة الدخول التلقائية (Auto-Role)
        const autoRoleIdString = guildConfigDocument.autoRoleId;
        if (autoRoleIdString) {
            const roleToGiveObject = messageGuildObject.roles.cache.get(autoRoleIdString);
            if (roleToGiveObject) {
                try {
                    await member.roles.add(roleToGiveObject);
                } catch (roleError) {
                    console.log("Error giving Auto-Role: ", roleError);
                }
            }
        }

        // 📝 لوج الدخول
        const logChannelIdString = guildConfigDocument.logJoinLeaveId;
        if (logChannelIdString) {
            const logChannelObject = messageGuildObject.channels.cache.get(logChannelIdString);
            if (logChannelObject) {
                const joinLogEmbed = new EmbedBuilder();
                joinLogEmbed.setTitle('📥 Member Joined (دخول عضو)');
                joinLogEmbed.setDescription(`**👤 العضو:** <@${member.id}>\n**🆔 الأيدي:** ${member.id}\n**🔢 رقم العضو:** ${messageGuildObject.memberCount}`);
                
                let logColorHex = guildConfigDocument.logEmbedColor;
                if (!logColorHex) {
                    logColorHex = '#3ba55d'; // لون أخضر للدخول كافتراضي
                }
                joinLogEmbed.setColor(logColorHex);
                joinLogEmbed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
                joinLogEmbed.setTimestamp();
                
                try { await logChannelObject.send({ embeds: [joinLogEmbed] }); } catch (e) {}
            }
        }
    });

    client.on('guildMemberRemove', async (member) => {
        
        const messageGuildObject = member.guild;
        const currentGuildIdString = messageGuildObject.id;
        const guildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        
        if (!guildConfigDocument) {
            return;
        }

        const logChannelIdString = guildConfigDocument.logJoinLeaveId;
        if (!logChannelIdString) {
            return;
        }

        const logChannelObject = messageGuildObject.channels.cache.get(logChannelIdString);
        if (!logChannelObject) {
            return;
        }

        const leaveLogEmbed = new EmbedBuilder();
        leaveLogEmbed.setTitle('📤 Member Left (خروج عضو)');
        leaveLogEmbed.setDescription(`**👤 العضو:** <@${member.id}> (${member.user.tag})\n**🆔 الأيدي:** ${member.id}`);
        
        let logColorHex = guildConfigDocument.logEmbedColor;
        if (!logColorHex) {
            logColorHex = '#ed4245'; // لون أحمر للخروج كافتراضي
        }
        leaveLogEmbed.setColor(logColorHex);
        leaveLogEmbed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));
        leaveLogEmbed.setTimestamp();
        
        try { await logChannelObject.send({ embeds: [leaveLogEmbed] }); } catch (e) {}
    });

    // =====================================================================
    // 🛡️ 5. نظام تحديثات الرتب للأعضاء (Member Role Update)
    // =====================================================================
    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        
        const messageGuildObject = newMember.guild;
        const currentGuildIdString = messageGuildObject.id;
        const guildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        
        if (!guildConfigDocument) {
            return;
        }

        const logChannelIdString = guildConfigDocument.logMemberRoleUpdateId;
        if (!logChannelIdString) {
            return;
        }

        const logChannelObject = messageGuildObject.channels.cache.get(logChannelIdString);
        if (!logChannelObject) {
            return;
        }

        // فحص هل هناك اختلاف في الرتب
        const oldRolesCollection = oldMember.roles.cache;
        const newRolesCollection = newMember.roles.cache;
        
        if (oldRolesCollection.size === newRolesCollection.size) {
            return; // لم تتغير الرتب
        }

        const roleLogEmbed = new EmbedBuilder();
        let logColorHex = guildConfigDocument.logEmbedColor;
        if (!logColorHex) {
            logColorHex = '#ed4245';
        }
        roleLogEmbed.setColor(logColorHex);
        roleLogEmbed.setTimestamp();

        // لو الرتب زادت
        if (oldRolesCollection.size < newRolesCollection.size) {
            const addedRolesCollection = newRolesCollection.filter(role => !oldRolesCollection.has(role.id));
            const addedRolesArray = addedRolesCollection.map(role => `<@&${role.id}>`);
            const addedRolesString = addedRolesArray.join(', ');

            roleLogEmbed.setTitle('➕ Role Added to Member (تم إعطاء رتبة)');
            roleLogEmbed.setDescription(`**👤 العضو:** <@${newMember.id}>\n**🏷️ الرتبة المضافة:** ${addedRolesString}`);
            try { await logChannelObject.send({ embeds: [roleLogEmbed] }); } catch (e) {}
        } 
        // لو الرتب نقصت
        else if (oldRolesCollection.size > newRolesCollection.size) {
            const removedRolesCollection = oldRolesCollection.filter(role => !newRolesCollection.has(role.id));
            const removedRolesArray = removedRolesCollection.map(role => `<@&${role.id}>`);
            const removedRolesString = removedRolesArray.join(', ');

            roleLogEmbed.setTitle('➖ Role Removed from Member (تم سحب رتبة)');
            roleLogEmbed.setDescription(`**👤 العضو:** <@${newMember.id}>\n**🏷️ الرتبة المسحوبة:** ${removedRolesString}`);
            try { await logChannelObject.send({ embeds: [roleLogEmbed] }); } catch (e) {}
        }
    });

    // =====================================================================
    // 📁 6. نظام مراقبة إنشاء وحذف الرتب (Role Create/Delete)
    // =====================================================================
    client.on('roleCreate', async (role) => {
        
        const messageGuildObject = role.guild;
        const currentGuildIdString = messageGuildObject.id;
        const guildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        
        if (!guildConfigDocument) return;

        const logChannelIdString = guildConfigDocument.logRoleCreateDeleteId;
        if (!logChannelIdString) return;

        const logChannelObject = messageGuildObject.channels.cache.get(logChannelIdString);
        if (!logChannelObject) return;

        const roleLogEmbed = new EmbedBuilder();
        roleLogEmbed.setTitle('🛡️ New Role Created (إنشاء رتبة جديدة)');
        roleLogEmbed.setDescription(`**🏷️ اسم الرتبة:** <@&${role.id}>\n**🆔 أيدي الرتبة:** ${role.id}`);
        
        let logColorHex = guildConfigDocument.logEmbedColor;
        if (!logColorHex) logColorHex = '#3ba55d';
        roleLogEmbed.setColor(logColorHex);
        roleLogEmbed.setTimestamp();
        
        try { await logChannelObject.send({ embeds: [roleLogEmbed] }); } catch (e) {}
    });

    client.on('roleDelete', async (role) => {
        
        const messageGuildObject = role.guild;
        const currentGuildIdString = messageGuildObject.id;
        const guildConfigDocument = await GuildConfig.findOne({ guildId: currentGuildIdString });
        
        if (!guildConfigDocument) return;

        const logChannelIdString = guildConfigDocument.logRoleCreateDeleteId;
        if (!logChannelIdString) return;

        const logChannelObject = messageGuildObject.channels.cache.get(logChannelIdString);
        if (!logChannelObject) return;

        const roleLogEmbed = new EmbedBuilder();
        roleLogEmbed.setTitle('🗑️ Role Deleted (حذف رتبة)');
        roleLogEmbed.setDescription(`**🏷️ اسم الرتبة:** ${role.name}\n**🆔 أيدي الرتبة:** ${role.id}`);
        
        let logColorHex = guildConfigDocument.logEmbedColor;
        if (!logColorHex) logColorHex = '#ed4245';
        roleLogEmbed.setColor(logColorHex);
        roleLogEmbed.setTimestamp();
        
        try { await logChannelObject.send({ embeds: [roleLogEmbed] }); } catch (e) {}
    });

};
