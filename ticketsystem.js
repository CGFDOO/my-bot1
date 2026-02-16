/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC HYBRID OVERLORD V3000 ]
 * █ ▀ █ █ ▀█ █ ▄  [ SECURITY LEVEL: GOD MODE ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * @project     MNC Enterprise System
 * @version     3000.0.0 (The Beast)
 * @language    Hybrid (English System / Arabic Interface)
 * @author      MNC Developer
 * @architecture Monolithic Class-Based Service
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { 
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, 
    ChannelType, PermissionFlagsBits, StringSelectMenuBuilder, Colors 
} = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');

// =====================================================================================
// [SECTION 1] ADVANCED CONFIGURATION MATRIX (THE BRAIN)
// =====================================================================================
const SYSTEM_CONFIG = {
    // 💀 Server Credentials
    GUILD_ID: '1453877816142860350', 
    CATEGORY_ID: '1453943996392013901',
    PREFIX: '!',

    // 🛡️ Security Clearance (Roles)
    ROLES: {
        STAFF: '1454199885460144189',      // Support Team
        ADMIN: '1453946893053726830',      // High Command
        MEDIATOR: '1454563893249703998',   // Middleman
        HIGH_MED: ['1454560063480922375', '1466937817639948349'] // Elite Unit
    },

    // 📡 Telemetry Channels (Logs)
    CHANNELS: {
        OPS_LOGS: '1453948413963141153',       // Main Logs
        EVIDENCE: '1472218573710823679',       // Transcripts
        RATE_MED: '1472439331443441828',       // Med Reviews
        RATE_STAFF: '1472023428658630686'      // Staff Reviews
    },

    // 🎨 UI Theme Palette
    THEME: {
        MAIN: '#FFFFFF',    // Pure White
        DARK: '#2F3136',    // Discord Dark
        GOLD: '#FFD700',    // Mediator Gold
        RED: '#ED4245',     // Danger/Delete
        GREEN: '#57F287',   // Success
        BLUE: '#5865F2'     // Info
    },

    // ⚙️ Core Flags
    FLAGS: {
        ONE_TICKET_LIMIT: true,
        START_TICKET_ID: 356
    }
};

// =====================================================================================
// [SECTION 2] IN-MEMORY DATABASE ENGINE (THE VAULT)
// =====================================================================================
class TicketDatabase {
    constructor() {
        this.tickets = new Map(); // Active Tickets
        this.users = new Map();   // User Metrics
        this.globalStats = {
            totalTickets: SYSTEM_CONFIG.FLAGS.START_TICKET_ID,
            totalRatings: 1,
            activeCount: 0
        };
        // Quick Lookup Index
        this.userSessionIndex = new Map(); 
        console.log('[MNC-CORE] Memory Database Initialized.');
    }

    /**
     * Creates a new ticket record
     */
    createSession(channelId, ownerId, type) {
        const session = {
            id: channelId,
            uuid: `TKT-${Date.now().toString(16).toUpperCase()}`,
            owner: ownerId,
            type: type,
            status: 'OPEN',
            metadata: {
                created: Date.now(),
                tradeInfo: null,
                priority: 'NORMAL',
                closureReason: null
            },
            staff: {
                claimer: null,
                closer: null,
                deleter: null
            },
            accessList: [ownerId]
        };
        
        this.tickets.set(channelId, session);
        this.userSessionIndex.set(ownerId, channelId);
        this.globalStats.totalTickets++;
        this.globalStats.activeCount++;
        
        this._initUser(ownerId);
        return this.globalStats.totalTickets;
    }

    updateData(id, section, key, value) {
        const t = this.tickets.get(id);
        if (!t) return false;
        if (section) t[section][key] = value;
        else t[key] = value;
        this.tickets.set(id, t);
        return true;
    }

    get(id) { return this.tickets.get(id); }

    closeSession(id, userId) {
        const t = this.tickets.get(id);
        if (t) {
            t.status = 'CLOSED';
            t.staff.closer = userId;
            this.userSessionIndex.delete(t.owner); // Release User Lock
            this.globalStats.activeCount--;
        }
    }

    // --- Analytics ---
    _initUser(uid) {
        if (!this.users.has(uid)) this.users.set(uid, { medRatings: 0, staffRatings: 0, claims: 0 });
    }

    incrementStat(uid, type) {
        this._initUser(uid);
        const u = this.users.get(uid);
        if (type === 'MED') u.medRatings++;
        else if (type === 'STAFF') u.staffRatings++;
        else if (type === 'CLAIM') u.claims++;
        this.users.set(uid, u);
        return u;
    }

    hasActiveTicket(userId) {
        return this.userSessionIndex.get(userId) || false;
    }
}

const DB = new TicketDatabase();

// =====================================================================================
// [SECTION 3] SECURITY & PERMISSION CONTROLLER (THE FIREWALL)
// =====================================================================================
class SecurityOfficer {
    static validateAccess(member, level) {
        if (!member) return false;
        const roles = member.roles.cache;
        
        switch (level) {
            case 'ROOT': // Admin + High Med
                return roles.has(SYSTEM_CONFIG.ROLES.ADMIN) || SYSTEM_CONFIG.ROLES.HIGH_MED.some(id => roles.has(id));
            case 'STAFF': 
                return roles.has(SYSTEM_CONFIG.ROLES.STAFF) || this.validateAccess(member, 'ROOT');
            case 'MED': 
                return roles.has(SYSTEM_CONFIG.ROLES.MEDIATOR) || this.validateAccess(member, 'ROOT');
            default: return false;
        }
    }

    static async safeMemberFetch(guild, id) {
        try {
            return await guild.members.fetch(id);
        } catch {
            return null;
        }
    }
}

// =====================================================================================
// [SECTION 4] INTERFACE FACTORY (UI GENERATOR)
// =====================================================================================
class InterfaceFactory {
    static buildEmbed({ title, desc, color, thumbnail, footer }) {
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(desc)
            .setColor(color || SYSTEM_CONFIG.THEME.MAIN)
            .setTimestamp();
        
        if (thumbnail) embed.setThumbnail(thumbnail);
        if (footer) embed.setFooter({ text: 'MNC Security System V3000', iconURL: 'https://cdn.discordapp.com/embed/avatars/0.png' });
        
        return embed;
    }

    // English Controls (Professional Look)
    static getTicketControls() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_claim').setLabel('Claim Ticket').setStyle(ButtonStyle.Success).setEmoji('🙋‍♂️'),
            new ButtonBuilder().setCustomId('btn_close').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
            new ButtonBuilder().setCustomId('btn_add_user').setLabel('Add User').setStyle(ButtonStyle.Primary).setEmoji('👤'),
            new ButtonBuilder().setCustomId('btn_trade_save').setLabel('Log Trade').setStyle(ButtonStyle.Secondary).setEmoji('📜'),
            new ButtonBuilder().setCustomId('btn_alert').setLabel('Alert User').setStyle(ButtonStyle.Secondary).setEmoji('🔔')
        );
    }

    // English Closed Controls
    static getClosedControls() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📄'),
            new ButtonBuilder().setCustomId('btn_reopen').setLabel('Reopen').setStyle(ButtonStyle.Success).setEmoji('🔓'),
            new ButtonBuilder().setCustomId('btn_delete').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
            new ButtonBuilder().setCustomId('btn_reason').setLabel('Delete w/Reason').setStyle(ButtonStyle.Danger).setEmoji('📝')
        );
    }

    // Arabic Setup Menu
    static getSetupMenu() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('create_mediator').setLabel('طلب وسيط').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('create_support').setLabel('دعم فني').setEmoji('🛠️').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('create_gift').setLabel('استلام هدايا').setEmoji('🎁').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('create_creator').setLabel('صانع محتوى').setEmoji('🎥').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('create_admin').setLabel('شكوى إداري').setEmoji('⚠️').setStyle(ButtonStyle.Secondary)
        );
    }
}

// =====================================================================================
// [SECTION 5] MAIN EXPORT MODULE (THE ENGINE)
// =====================================================================================
module.exports = async (client) => {

    console.log(`
    █▀▄▀█ █▄ █ ▄▀▄ 
    █ ▀ █ █ ▀█ █ ▄ 
    [ MNC HYBRID ENGINE V3000 ACTIVATED ]
    [ MODE: ENGLISH SYSTEM / ARABIC USER ]
    `);

    // ░░░░░░░░░░░░░░░░░░ MESSAGE HANDLER ░░░░░░░░░░░░░░░░░░
    client.on('messageCreate', async (message) => {
        if (!message.guild || message.author.bot || !message.content.startsWith(SYSTEM_CONFIG.PREFIX)) return;
        
        const args = message.content.slice(SYSTEM_CONFIG.PREFIX.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const member = message.member;

        // --- COMMAND: SETUP (Arabic UI) ---
        if (command === 'setup-mnc' && SecurityOfficer.validateAccess(member, 'ROOT')) {
            message.delete().catch(()=>{});
            
            // النصوص العربية كما طلبت
            const desc = 
                `**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**\n` +
                `**・ عند فتح تذكرة وعدم كتابة استفسارك أو مشكلتك فورا سيتم حذفها بدون أي تردد**\n` +
                `**・ يمنع فتح أكثر من تذكرتين في نفس الوقت النظام سيقوم بحظر التذاكر المكررة تلقائيا**\n` +
                `**・ يمنع منشن طاقم الإدارة العليا أو الصغرى الرد يتم حسب الأولوية ووقت فتح التذكرة.**\n` +
                `**・ يرجى إرفاق كافة الأدلة الصور المتعلقة بمشكلتك لضمان سرعة الرد وحل المشكلة**\n` +
                `**・ أي تجاوز أو إساءة في التعامل مع الفريق الإداري داخل التذكرة يعرضك للعقوبات**\n` +
                `**・ تذكرتك لا يراها إلا الطاقم المختص؛ يرجى عدم مشاركة تفاصيل حساسة خارج التذكرة.**\n` +
                `**━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━**\n` +
                `**👇 اختر القسم المناسب لفتح تذكرتك:**`;

            const embed = InterfaceFactory.buildEmbed({
                title: '# 📋 قوانين التكت لتجنب أي عقوبات',
                desc: desc,
                color: SYSTEM_CONFIG.THEME.MAIN,
                thumbnail: message.guild.iconURL()
            });

            message.channel.send({ embeds: [embed], components: [InterfaceFactory.getSetupMenu()] });
        }

        // --- COMMAND: TRADE (For Mediators) ---
        if (command === 'trade' && SecurityOfficer.validateAccess(member, 'MED') && message.channel.name.startsWith('ticket-')) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_trade_save').setLabel('Log Trade Details').setStyle(ButtonStyle.Primary)
            );
            message.reply({ content: '**👇 Mediator Panel:**', components: [row] });
        }

        // --- COMMAND: REQ-HIGH (High Approval) ---
        if (command === 'req-high' && SecurityOfficer.validateAccess(member, 'MED')) {
            const ticket = DB.get(message.channel.id);
            const trade = ticket?.metadata?.tradeInfo || "⚠️ N/A";
            
            const embed = InterfaceFactory.buildEmbed({
                title: '⚖️ **طلب موافقة وساطة عليا**',
                desc: `**━━━━━━━━━━━━━━━━━━━━━━━━**\n**👤 الوسيط الطالب:** ${message.author}\n**📦 تفاصيل التريد:**\n\`\`\`${trade}\`\`\`\n**━━━━━━━━━━━━━━━━━━━━━━━━**`,
                color: SYSTEM_CONFIG.THEME.GOLD,
                thumbnail: message.author.displayAvatarURL()
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('high_approve').setLabel('Approve').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('high_reject').setLabel('Reject').setStyle(ButtonStyle.Danger)
            );
            const mentions = SYSTEM_CONFIG.ROLES.HIGH_MED.map(r => `<@&${r}>`).join(' ');
            message.channel.send({ content: `⚠️ **Urgent Approval Needed:** ${mentions}`, embeds: [embed], components: [row] });
        }

        // --- COMMAND: DONE (Trigger Rating) ---
        if (command === 'done' && SecurityOfficer.validateAccess(member, 'MED')) {
            const ticket = DB.get(message.channel.id);
            if (!ticket) return;
            
            DB.updateData(message.channel.id, 'staff', 'claimer', message.author.id);
            const owner = await message.guild.members.fetch(ticket.owner).catch(()=>null);
            
            if (owner) {
                const stats = DB.users.get(message.author.id) || { medRatings: 0 };
                const row = new ActionRowBuilder().addComponents(
                    [1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_med_${i}_${message.channel.id}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary))
                );
                await owner.send({ content: `⭐ **MNC Mediator Rating:**\n**يرجى تقييم خدمة الوسيط (العملية رقم #${stats.medRatings + 1}):**`, components: [row] }).catch(()=>{});
                message.channel.send('✅ **Rating Request Sent to User.**');
            }
        }

        // --- COMMAND: COME (Arabic Reply, Fancy English Embed) ---
        if (command === 'come') {
            const target = message.mentions.members.first();
            if (!target) return message.reply('**❌ Syntax Error: Mention a User.**');
            
            message.delete().catch(()=>{});
            const invite = await message.channel.createInvite({ maxAge: 86400, maxUses: 1 });
            
            const dmEmbed = InterfaceFactory.buildEmbed({
                title: '🚨 **ADMINISTRATIVE SUMMON**',
                desc: `**━━━━━━━━━━━━━━━━━━━━━━━━**\n**👋 Hello ${target}**\n\n**⚠️ High Command requested your presence immediately!**\n**📍 Channel:** <#${message.channel.id}>\n**🔗 Fast Link:** [CLICK TO JOIN](${invite.url})\n**━━━━━━━━━━━━━━━━━━━━━━━━**`,
                color: SYSTEM_CONFIG.THEME.RED,
                thumbnail: message.guild.iconURL()
            });

            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Join Ticket').setStyle(ButtonStyle.Link).setURL(invite.url));
            
            try {
                await target.send({ content: `🚨 **URGENT ALERT!**`, embeds: [dmEmbed], components: [row] });
                // Arabic Chat Response
                message.channel.send(`✅ **تم استدعاء العضو ${target} بنجاح.**`);
            } catch {
                message.channel.send(`⚠️ **Could not DM ${target} (Privacy Settings), but summoned.**`);
            }
        }
    });

    // ░░░░░░░░░░░░░░░░░░ 2. INTERACTION HANDLER ░░░░░░░░░░░░░░░░░░
    client.on('interactionCreate', async (interaction) => {
        try {
            const { customId, guild, user, channel } = interaction;

            // --- A. TICKET CREATION LOGIC ---
            if (customId && customId.startsWith('create_')) {
                // Anti-Spam (English Error)
                if (SYSTEM_CONFIG.FLAGS.ONE_TICKET_LIMIT && DB.hasActiveTicket(user.id)) {
                    return interaction.reply({ content: `⛔ **Security Alert:** You already have an active ticket: <#${DB.hasActiveTicket(user.id)}>`, ephemeral: true });
                }

                const type = customId.split('_')[1];
                
                // Modals (Labels in English/Arabic mixed based on context)
                if (['mediator', 'support', 'creator'].includes(type)) {
                    const modal = new ModalBuilder().setCustomId(`modal_init_${type}`).setTitle(`Ticket Details: ${type}`);
                    
                    if (type === 'mediator') {
                        modal.addComponents(
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target').setLabel('الطرف الثاني (Target)').setStyle(TextInputStyle.Short).setRequired(true)),
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade').setLabel('تفاصيل التريد (Trade Details)').setStyle(TextInputStyle.Paragraph).setRequired(true))
                        );
                    } else if (type === 'support') {
                        modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('issue').setLabel('المشكلة (Issue)').setStyle(TextInputStyle.Paragraph).setRequired(true)));
                    } else if (type === 'creator') {
                        modal.addComponents(
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('links').setLabel('الروابط (Links)').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                            new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('subs').setLabel('المتابعين (Followers)').setStyle(TextInputStyle.Short).setRequired(true))
                        );
                    }
                    return await interaction.showModal(modal);
                }
                // Direct Create
                return await createTicketSequence(interaction, type, null);
            }

            // --- B. MODAL SUBMISSIONS ---
            if (interaction.type === InteractionType.ModalSubmit) {
                if (customId.startsWith('modal_init_')) return await createTicketSequence(interaction, customId.replace('modal_init_', ''), interaction.fields);
                
                if (customId === 'modal_trade_save') {
                    const trade = interaction.fields.getTextInputValue('val');
                    DB.updateData(channel.id, 'metadata', 'tradeInfo', trade);
                    await interaction.reply({ content: `**✅ Trade Details Updated:**\n\`\`\`${trade}\`\`\`` });
                    return channel.send('**done**'); 
                }

                if (customId === 'modal_add_user') {
                    const uid = interaction.fields.getTextInputValue('uid');
                    const member = await SecurityOfficer.safeMemberFetch(guild, uid);
                    if (member) {
                        await channel.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true });
                        await interaction.reply({ content: `**✅ Access Granted to <@${member.id}>**` });
                        return channel.send(`➕ **System:** User <@${member.id}> added by <@${user.id}>`);
                    }
                    return interaction.reply({ content: '**❌ Error: User Not Found.**', ephemeral: true });
                }

                if (customId === 'modal_del_reason') {
                    const reason = interaction.fields.getTextInputValue('reason');
                    await interaction.reply(`**🗑️ Purging Ticket in 5s... Reason:** ${reason}`);
                    DB.updateData(channel.id, 'metadata', 'closureReason', reason);
                    await logTicketAction(guild, channel, 'Delete', user);
                    setTimeout(() => channel.delete().catch(()=>{}), 5000);
                }

                // --- 💀 DUAL RATING (English System, Arabic Context) ---
                if (customId.startsWith('rate_final_')) {
                    const [_, type, stars, tid] = customId.split('_');
                    const comment = interaction.fields.getTextInputValue('comment') || 'No Comment';
                    
                    const ticket = DB.getTicket(tid);
                    const claimer = ticket?.staff?.claimer;
                    const trade = ticket?.metadata?.tradeInfo || 'N/A';

                    DB.globalStats.totalRatings++;
                    const stats = DB.incrementStat(claimer, type === 'MED' ? 'MED_RATE' : 'STAFF_RATE');
                    const count = type === 'MED' ? stats.medRatings : stats.staffRatings;
                    const starStr = '⭐'.repeat(parseInt(stars));

                    const embed = InterfaceFactory.buildEmbed({
                        title: type === 'MED' ? '🛡️ New Mediator Review' : '👨‍💼 New Staff Review',
                        desc: `**🌍 Global Rating Sequence #${DB.globalStats.totalRatings}**`,
                        color: type === 'MED' ? SYSTEM_CONFIG.THEME.GOLD : SYSTEM_CONFIG.THEME.BLUE,
                        thumbnail: user.displayAvatarURL()
                    });

                    if (type === 'MED') {
                        embed.addFields(
                            { name: '👤 Client', value: `<@${user.id}>`, inline: true },
                            { name: '🛡️ Mediator', value: claimer ? `<@${claimer}>` : 'Unknown', inline: true },
                            { name: '📊 Stats', value: `**#${count}**`, inline: true },
                            { name: '⭐ Rating', value: starStr, inline: false },
                            { name: '📦 Trade Info', value: `\`\`\`${trade}\`\`\`` },
                            { name: '💬 Comment', value: `\`${comment}\`` }
                        );
                    } else {
                        embed.addFields(
                            { name: '👤 Client', value: `<@${user.id}>`, inline: true },
                            { name: '👮 Staff', value: claimer ? `<@${claimer}>` : 'Unknown', inline: true },
                            { name: '📊 Stats', value: `**#${count}**`, inline: true },
                            { name: '⭐ Rating', value: starStr, inline: false },
                            { name: '💬 Comment', value: `\`${comment}\`` }
                        );
                    }

                    const logChannel = type === 'MED' ? SYSTEM_CONFIG.CHANNELS.RATE_MED : SYSTEM_CONFIG.CHANNELS.RATE_STAFF;
                    client.channels.cache.get(logChannel)?.send({ embeds: [embed] });
                    return interaction.reply({ content: '**✅ Feedback Registered.**', ephemeral: true });
                }
            }

            // --- C. BUTTON HANDLERS (ENGLISH SYSTEM) ---
            
            if (customId === 'btn_claim') {
                const ticket = DB.getTicket(channel.id);
                // Check for Admin Tickets
                if ((ticket.type === 'creator' || ticket.type === 'admin') && !SecurityOfficer.validateAccess(interaction.member, 'ROOT')) {
                    return interaction.reply({ content: '❌ **Access Denied: High Command Only.**', ephemeral: true });
                }
                if (!SecurityOfficer.validateAccess(interaction.member, 'STAFF')) return;

                DB.updateData(channel.id, 'staff', 'claimer', user.id);
                DB.incrementStat(user.id, 'CLAIM');

                await Promise.all([
                    channel.permissionOverwrites.edit(SYSTEM_CONFIG.ROLES.STAFF, { ViewChannel: false }),
                    channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true }),
                    channel.permissionOverwrites.edit(SYSTEM_CONFIG.ROLES.ADMIN, { ViewChannel: true })
                ]);

                const row = ActionRowBuilder.from(interaction.message.components[0]);
                row.components[0].setDisabled(true); 
                await interaction.update({ components: [row] });
                await channel.send(`**✅ Ticket Claimed by <@${user.id}>**`);
            }

            if (customId === 'btn_close') {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_confirm').setLabel('Confirm Close').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('btn_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
                );
                interaction.reply({ content: '**⚠️ Are you sure you want to close this ticket?**', components: [row] });
            }
            if (customId === 'btn_cancel') interaction.update({ content: '**✅ Cancelled.**', components: [] });

            if (customId === 'btn_confirm') {
                const ticket = DB.getTicket(channel.id);
                if (!ticket.staff.claimer) DB.updateData(channel.id, 'staff', 'claimer', user.id);
                DB.closeSession(channel.id, user.id);

                await channel.permissionOverwrites.edit(ticket.owner, { ViewChannel: false });
                await interaction.update({ content: '**🔒 Ticket Closed.**', components: [] });
                await channel.send({ content: `**CONTROL PANEL | Sealed by <@${user.id}>**`, components: [InterfaceFactory.getClosedControls()] });

                // Force Log
                await logTicketAction(guild, channel, 'Close', user);

                // Staff Rating Request (Arabic Context)
                if (ticket.type !== 'mediator') {
                    const owner = await SecurityOfficer.safeMemberFetch(guild, ticket.owner);
                    if (owner) {
                        const claimer = ticket.staff.claimer || user.id;
                        const stats = DB.users.get(claimer) || { staffRatings: 0 };
                        const row = new ActionRowBuilder().addComponents(
                            [1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_final_STAFF_${i}_${channel.id}`).setLabel(`${i}⭐`).setStyle(ButtonStyle.Primary))
                        );
                        owner.send({ content: `**📋 MNC Staff Rating:**\nيرجى تقييم أداء الطاقم الإداري <@${claimer}> (التقييم رقم #${stats.staffRatings+1}):`, components: [row] }).catch(()=>{});
                    }
                }
            }

            if (customId === 'btn_reopen') {
                const ticket = DB.getTicket(channel.id);
                await channel.permissionOverwrites.edit(ticket.owner, { ViewChannel: true });
                await interaction.message.delete();
                await interaction.reply('**🔓 Ticket Reopened.**');
            }

            if (customId === 'btn_delete') {
                interaction.reply('**🗑️ Purging Ticket...**');
                await logTicketAction(guild, channel, 'Delete', user);
                setTimeout(() => channel.delete().catch(()=>{}), 5000);
            }

            if (customId === 'btn_transcript') {
                const file = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
                interaction.reply({ content: '**✅ Transcript Generated:**', files: [file], ephemeral: true });
            }

            if (customId === 'btn_trade_save') {
                const modal = new ModalBuilder().setCustomId('modal_trade_save').setTitle('Log Trade Details');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('val').setLabel('Details').setStyle(TextInputStyle.Paragraph).setRequired(true)));
                interaction.showModal(modal);
            }

            if (customId === 'btn_add_user') {
                const modal = new ModalBuilder().setCustomId('modal_add_user').setTitle('Grant Access');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('uid').setLabel('User ID').setStyle(TextInputStyle.Short).setRequired(true)));
                interaction.showModal(modal);
            }

            if (customId === 'btn_reason') {
                const modal = new ModalBuilder().setCustomId('modal_del_reason').setTitle('Deletion Reason');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('Reason').setStyle(TextInputStyle.Short).setRequired(true)));
                interaction.showModal(modal);
            }

            if (customId === 'btn_alert') {
                const t = DB.getTicket(channel.id);
                const owner = await SecurityOfficer.safeMemberFetch(guild, t.owner);
                if(owner) {
                    owner.send(`🔔 **Action Required:** Please reply to your ticket in **${guild.name}**.`);
                    interaction.reply({ content: '**✅ Alert Sent.**', ephemeral: true });
                }
            }

            if (['high_approve', 'high_reject'].includes(customId)) {
                if (!SecurityOfficer.checkAccess(interaction.member, 'MED')) return interaction.reply({ content: '❌ Access Denied.', ephemeral: true });
                const status = customId === 'high_approve' ? '✅ APPROVED' : '❌ REJECTED';
                interaction.update({ content: `**${status} by <@${user.id}>**`, components: [], embeds: [interaction.message.embeds[0]] });
            }

            // Rate Trigger (Starts Modal)
            if (customId.startsWith('rate_')) {
                const row = ActionRowBuilder.from(interaction.message.components[0]);
                row.components.forEach(b => b.setDisabled(true));
                interaction.message.edit({ components: [row] });
                
                const [_, type, stars, tid] = customId.split('_'); 
                const modal = new ModalBuilder().setCustomId(`rate_final_${type === 'med' ? 'MED' : 'STAFF'}_${stars}_${tid}`).setTitle('تعليق إضافي');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('comment').setLabel('تعليقك (اختياري)').setStyle(TextInputStyle.Paragraph).setRequired(false)));
                interaction.showModal(modal);
            }

        } catch (error) {
            console.error('SYSTEM FAULT:', error);
        }
    });
};

// =====================================================================================
// [SECTION 6] CORE LOGIC FUNCTIONS (THE WORKERS)
// =====================================================================================
async function createTicketSequence(interaction, type, fields) {
    const { guild, user } = interaction;
    const count = DB.createSession('TEMP', user.id, type);
    const channelName = `ticket-${count}-${user.username}`.substring(0, 32);

    const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: SYSTEM_CONFIG.CATEGORY_ID,
        topic: `UUID: ${user.id} | TYPE: ${type} | STATUS: ACTIVE`,
        permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: SYSTEM_CONFIG.ROLES.STAFF, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
    });

    DB.tickets.delete('TEMP');
    DB.createSession(channel.id, user.id, type);
    if (type === 'mediator') DB.updateData(channel.id, 'metadata', 'tradeInfo', fields?.getTextInputValue('trade'));

    await interaction.reply({ content: `**✅ System Initialized:** ${channel}`, ephemeral: true });

    // ARABIC WELCOME EMBED
    const embed = InterfaceFactory.buildEmbed({
        title: type === 'mediator' ? '🛡️ طلب وسيط' : (type === 'support' ? '🛠️ دعم فني' : (type === 'gift' ? '🎁 استلام هدايا' : '⚠️ شكوى إداري')),
        desc: `**حياك الله <@${user.id}>**\n**━━━━━━━━━━━━━━━━━━━━━━━━**\n**يرجى الانتظار لحين استجابة الطاقم المختص.**\n**رقم التذكرة:** \`#${count}\``,
        color: SYSTEM_CONFIG.THEME.MAIN,
        thumbnail: user.displayAvatarURL()
    });

    if (fields) {
        if(type==='mediator') embed.addFields({ name: '👤 الطرف الثاني', value: fields.getTextInputValue('target') }, { name: '📝 التريد', value: `\`\`\`${fields.getTextInputValue('trade')}\`\`\`` });
        if(type==='support') embed.addFields({ name: '❓ المشكلة', value: `\`\`\`${fields.getTextInputValue('issue')}\`\`\`` });
        if(type==='creator') embed.addFields({ name: '🔗 الروابط', value: fields.getTextInputValue('links') }, { name: '👥 المتابعين', value: fields.getTextInputValue('subs') });
    }

    if (['admin', 'creator'].includes(type)) {
        await Promise.all([
            channel.permissionOverwrites.edit(SYSTEM_CONFIG.ROLES.STAFF, { ViewChannel: false }),
            channel.permissionOverwrites.edit(SYSTEM_CONFIG.ROLES.ADMIN, { ViewChannel: true })
        ]);
        embed.setDescription(embed.data.description + `\n🔒 **خاص بالإدارة العليا**`);
    }

    await channel.send({ embeds: [embed], components: [InterfaceFactory.getTicketControls()] });
    channel.send(`ℹ️ **System Log:** Created at <t:${Math.floor(Date.now()/1000)}:f>`);
}

async function logTicketAction(guild, channel, action, user) {
    const ticket = DB.getTicket(channel.id);
    if (!ticket) return;
    const logChannel = guild.channels.cache.get(SYSTEM_CONFIG.CHANNELS.TRANSCRIPTS);
    
    const file = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
    const msg = await logChannel.send({ files: [file] });
    
    const embed = InterfaceFactory.buildEmbed({
        title: action === 'Delete' ? '🗑️ TICKET PURGED' : '📦 TICKET ARCHIVED',
        desc: `**Action By:** <@${user.id}>`,
        color: action === 'Delete' ? SYSTEM_CONFIG.THEME.RED : SYSTEM_CONFIG.THEME.GREEN
    });

    embed.addFields(
        { name: '🎫 Channel', value: `\`${channel.name}\``, inline: true },
        { name: '👤 Owner', value: `<@${ticket.owner}>`, inline: true },
        { name: '👮 Claimer', value: ticket.staff.claimer ? `<@${ticket.staff.claimer}>` : 'None', inline: true },
        { name: '⏱️ Created', value: `<t:${Math.floor(ticket.metadata.created/1000)}:R>`, inline: true }
    );

    if (ticket.metadata.closureReason) embed.addFields({ name: '📝 Reason', value: `\`${ticket.metadata.closureReason}\`` });
    embed.addFields({ name: '📂 Evidence File', value: `[Download Secure Log](${msg.attachments.first().url})` });

    await logChannel.send({ embeds: [embed] });
}
