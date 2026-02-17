/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC ULTIMATE SYSTEM - V6.0 ]
 * █ ▀ █ █ ▀█ █ ▄  [ ENTERPRISE EDITION ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * @project   MNC Ticket System
 * @security  High Level
 * @style     Professional / Detailed
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { 
    Client, GatewayIntentBits, Partials, EmbedBuilder, ActionRowBuilder, 
    ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, 
    TextInputStyle, InteractionType, ChannelType, PermissionFlagsBits, 
    Collection 
} = require('discord.js');
const { createTranscript } = require('discord-html-transcripts');

module.exports = async (client) => {

    // ====================================================
    // ⚙️ SYSTEM CONFIGURATION (إعدادات النظام)
    // ====================================================
    const CONFIG = {
        prefix: '!',
        guildID: '1453877816142860350', // أيدي السيرفر
        categoryID: '1453943996392013901', // أيدي الكاتيجوري
        
        // --- الرتب (Roles) ---
        staffRole: '1454199885460144189',      // إدارة صغرى
        adminRole: '1453946893053726830',      // إدارة عليا
        mediatorRole: '1454563893249703998',   // وسطاء
        highMediators: ['1454560063480922375', '1466937817639948349'], // رتب الوساطة العليا

        // --- القنوات (Logs) ---
        logsChannel: '1453948413963141153',       // لوق العمليات العامة
        transcriptChannel: '1472218573710823679', // لوق الترانسكربت
        mediatorRatingLog: '1472439331443441828', // لوق تقييم الوسطاء
        staffRatingLog: '1472023428658630686',    // لوق تقييم الإدارة
    };

    // ====================================================
    // 💾 MEMORY STORAGE (قواعد البيانات المؤقتة)
    // ====================================================
    // تخزين البيانات في الذاكرة (تصفر عند إعادة التشغيل)
    
    // عدادات التذاكر
    if (!client.ticketCounter) client.ticketCounter = 346; 
    
    // عدادات التقييمات (Global)
    if (!client.globalStats) client.globalStats = { mediators: 0, staff: 0 };

    // خرائط البيانات (Maps)
    const activeTrades = new Map();     // TicketID -> Trade Details
    const ticketTypes = new Map();      // TicketID -> Type (support, med, etc)
    const ticketMediator = new Map();   // TicketID -> Mediator ID
    const ticketClaimer = new Map();    // TicketID -> Staff ID (من استلم التكت)
    
    // عدادات فردية
    const mediatorCounts = new Map();   // MediatorID -> Count
    const staffCounts = new Map();      // StaffID -> Count

    // ====================================================
    // 🎨 DESIGN UTILITIES (أدوات التصميم الفخم)
    // ====================================================
    const COLORS = {
        MAIN: '#2B2D31',
        GOLD: '#FFD700',
        BLUE: '#3498DB',
        RED: '#ED4245',
        GREEN: '#57F287',
        PURPLE: '#9B59B6'
    };

    // دالة لصنع إيمبدات فخمة وموحدة
    const createEmbed = (title, desc, color = COLORS.MAIN) => {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(desc)
            .setColor(color)
            .setFooter({ text: 'MNC Security System • V6.0', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
    };

    console.log('💎 [MNC SYSTEM] Ultimate V6 Module Loaded Successfully.');

    // ====================================================
    // 1️⃣ MESSAGE COMMANDS (الأوامر الكتابية)
    // ====================================================
    client.on('messageCreate', async (message) => {
        if (!message.guild || message.author.bot || !message.content.startsWith(CONFIG.prefix)) return;
        
        const args = message.content.slice(CONFIG.prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        
        // التحقق من الرتب
        const hasRole = (roleId) => message.member.roles.cache.has(roleId);
        const isHighMed = CONFIG.highMediators.some(id => hasRole(id));
        const isMed = hasRole(CONFIG.mediatorRole) || isHighMed;
        const isAdmin = hasRole(CONFIG.adminRole) || isHighMed;
        const isStaff = hasRole(CONFIG.staffRole) || isAdmin;

        // ---------------------------------------------------
        // 🛠️ !setup-mnc (لوحة التحكم الرئيسية)
        // ---------------------------------------------------
        if (command === 'setup-mnc' && isAdmin) {
            message.delete().catch(() => {});
            
            const embed = new EmbedBuilder()
                .setColor(COLORS.MAIN)
                .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL() })
                .setTitle('🏛️ **MNC OFFICIAL SUPPORT CENTER**')
                .setDescription(
                    `> **أهلاً بك في مركز الدعم الرسمي.**\n` +
                    `> يرجى اختيار القسم المناسب لاستفسارك من الأزرار أدناه.\n\n` +
                    `**📜 قوانين هامة لتجنب العقوبات:**\n` +
                    `\` 1 \` **الكتابة الفورية:** اشرح مشكلتك فور فتح التذكرة.\n` +
                    `\` 2 \` **عدم التكرار:** يمنع فتح أكثر من تذكرة لنفس السبب.\n` +
                    `\` 3 \` **المنشن:** يمنع الإشارة للإدارة، سيتم الرد حسب الأولوية.\n` +
                    `\` 4 \` **الأدلة:** ارفق الصور والفيديو لضمان حقك.\n` +
                    `\` 5 \` **الاحترام:** أي تجاوز داخل التذكرة يعرضك للحظر النهائي.\n\n` +
                    `**👇 حدد وجهتك الآن:**`
                )
                .setImage('https://media.discordapp.net/attachments/120000/line_separator.png?width=100&height=10') // خط فاصل وهمي للتنسيق (اختياري)
                .setThumbnail(message.guild.iconURL({ dynamic: true }));

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('create_mediator').setLabel('طلب وسيط').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('create_support').setLabel('دعم فني').setEmoji('🛠️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('create_gift').setLabel('استلام هدايا').setEmoji('🎁').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('create_creator').setLabel('صانع محتوى').setEmoji('🎥').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('create_admin').setLabel('شكوى إداري').setEmoji('⛔').setStyle(ButtonStyle.Danger)
            );

            return message.channel.send({ embeds: [embed], components: [row] });
        }

        // ---------------------------------------------------
        // 📝 !trade (تسجيل بيانات التريد)
        // ---------------------------------------------------
        if (command === 'trade' && isMed && message.channel.name.startsWith('ticket-')) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_trade_input').setLabel('📝 تسجيل/تعديل بيانات التريد').setStyle(ButtonStyle.Primary)
            );
            
            const embed = createEmbed('📦 إدارة التريد', 'يا وسيط، اضغط الزر بالأسفل لتسجيل تفاصيل الصفقة لضمان الحقوق.')
                .setColor(COLORS.GOLD);

            return message.reply({ embeds: [embed], components: [row] });
        }

        // ---------------------------------------------------
        // ⚖️ !req-high (طلب وساطة عليا)
        // ---------------------------------------------------
        if (command === 'req-high' && isMed && message.channel.name.startsWith('ticket-')) {
            const trade = activeTrades.get(message.channel.id) || "⚠️ لم يتم تسجيل بيانات التريد بعد!";
            
            const embed = new EmbedBuilder()
                .setTitle('⚖️ **طلب تصعيد: موافقة وساطة عليا**')
                .setDescription(
                    `**قام الوسيط بطلب مراجعة من الرتب العليا.**\n\n` +
                    `👤 **الوسيط الطالب:** ${message.author}\n` +
                    `📦 **تفاصيل العملية:**\n\`\`\`\n${trade}\n\`\`\``
                )
                .setColor('#E67E22') // برتقالي
                .setThumbnail(message.author.displayAvatarURL());
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('high_approve').setLabel('موافقة (Accept)').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('high_reject').setLabel('رفض (Reject)').setStyle(ButtonStyle.Danger)
            );
            
            const mentions = CONFIG.highMediators.map(r => `<@&${r}>`).join(' ');
            return message.channel.send({ content: `🚨 **تنبيه للإدارة العليا:** ${mentions}`, embeds: [embed], components: [row] });
        }

        // ---------------------------------------------------
        // ✅ !done (إنهاء وتقييم الوساطة)
        // ---------------------------------------------------
        if (command === 'done' && isMed && message.channel.name.startsWith('ticket-')) {
            const ownerId = message.channel.topic;
            // تسجيل الوسيط الحالي لهذه التذكرة
            ticketMediator.set(message.channel.id, message.author.id);

            const owner = await message.guild.members.fetch(ownerId).catch(() => null);
            if (owner) {
                const ticketID = message.channel.id;
                
                const row = new ActionRowBuilder().addComponents(
                    [1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_med_${i}_${ticketID}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary))
                );
                
                const dmEmbed = createEmbed('⭐ تقييم خدمة الوساطة', `**عزيزي العميل،**\nيرجى تقييم أداء الوسيط **${message.author.username}**.\nرأيك يهمنا لتحسين الخدمة.`, COLORS.GOLD);

                await owner.send({ embeds: [dmEmbed], components: [row] }).then(() => {
                    return message.channel.send('✅ **تم إرسال طلب التقييم للعميل في الخاص بنجاح.**');
                }).catch(() => {
                    return message.channel.send('❌ **عذراً، خاص العميل مغلق. لا يمكن إرسال التقييم.**');
                });
            } else {
                return message.channel.send('⚠️ **لم يتم العثور على صاحب التذكرة (ربما غادر السيرفر).**');
            }
        }

        // ---------------------------------------------------
        // 🚨 !come (الاستدعاء الفخم)
        // ---------------------------------------------------
        if (command === 'come' && isStaff) {
            const target = message.mentions.members.first();
            if (!target) return message.reply('**❌ يجب عمل منشن للعضو المراد استدعاؤه.**');
            
            message.delete().catch(() => {});
            const invite = await message.channel.createInvite({ maxAge: 86400, maxUses: 1 });
            
            const dmEmbed = new EmbedBuilder()
                .setColor(COLORS.RED)
                .setAuthor({ name: 'MNC Administration', iconURL: message.guild.iconURL() })
                .setTitle('🚨 **إشعار استدعاء إداري عاجل**')
                .setDescription(
                    `**مرحباً بك،**\n\n` +
                    `لقد طلب طاقم الإدارة تواجدك فوراً في الروم التالي.\n` +
                    `**📍 المكان:** <#${message.channel.id}>\n` +
                    `**👮‍♂️ المسؤول:** ${message.author}\n\n` +
                    `*يرجى الدخول فوراً لتجنب الإجراءات العقابية.*`
                )
                .addFields({ name: '🔗 رابط الدخول المباشر', value: `[اضغط هنا للانتقال للسيرفر](${invite.url})` })
                .setThumbnail(message.guild.iconURL())
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setLabel('الانتقال للتذكرة').setStyle(ButtonStyle.Link).setURL(invite.url)
            );
            
            await target.send({ content: `🚨 **تنبيـــه!** ${target}`, embeds: [dmEmbed], components: [row] })
                .then(() => message.channel.send(`✅ **تم إرسال برقية استدعاء للعضو ${target} بنجاح.**`))
                .catch(() => message.channel.send(`❌ **فشل الإرسال: خاص العضو ${target} مغلق.**`));
        }
    });

    // ====================================================
    // 2️⃣ INTERACTION HANDLER (الأزرار والمودالات)
    // ====================================================
    client.on('interactionCreate', async (interaction) => {
        const { customId, guild, user, channel, member } = interaction;

        // ---------------------------------------------------
        // 🅰️ فتح التذاكر (Ticket Creation)
        // ---------------------------------------------------
        if (interaction.isButton() && customId.startsWith('create_')) {
            const type = customId.split('_')[1];
            
            // طلب بيانات إضافية عبر المودال
            if (['mediator', 'support', 'creator'].includes(type)) {
                const modalTitle = type === 'mediator' ? 'بيانات الوساطة' : type === 'support' ? 'بيانات المشكلة' : 'بيانات التقديم';
                const modal = new ModalBuilder().setCustomId(`modal_create_${type}`).setTitle(modalTitle);
                
                if (type === 'mediator') {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('target_user').setLabel('يوزر الطرف الثاني (User/ID)').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_details').setLabel('تفاصيل الصفقة بالكامل').setStyle(TextInputStyle.Paragraph).setRequired(true))
                    );
                } else if (type === 'support') {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('issue_details').setLabel('اشرح مشكلتك بالتفصيل').setStyle(TextInputStyle.Paragraph).setRequired(true))
                    );
                } else if (type === 'creator') {
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('links').setLabel('رابط القناة / الحساب').setStyle(TextInputStyle.Short).setRequired(true)),
                        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('subs').setLabel('عدد المتابعين الحالي').setStyle(TextInputStyle.Short).setRequired(true))
                    );
                }
                return await interaction.showModal(modal);
            }
            // أنواع لا تحتاج مودال (مثل الهدايا والشكاوى)
            return await createTicket(interaction, type, null);
        }

        // ---------------------------------------------------
        // 🅱️ استقبال المودالات (Modal Submissions)
        // ---------------------------------------------------
        if (interaction.type === InteractionType.ModalSubmit) {
            
            // 1. إنشاء التكت بعد المودال
            if (customId.startsWith('modal_create_')) {
                const type = customId.replace('modal_create_', '');
                return await createTicket(interaction, type, interaction.fields);
            }

            // 2. حفظ التريد (Trade Save)
            if (customId === 'modal_trade_save') {
                const trade = interaction.fields.getTextInputValue('trade_val');
                activeTrades.set(channel.id, trade); // ✅ حفظ البيانات لاستخدامها في التقييم
                
                const embed = createEmbed('✅ تم حفظ البيانات', `**تم تحديث بيانات الصفقة بنجاح.**\n\n\`\`\`\n${trade}\n\`\`\``, COLORS.GREEN);
                await interaction.reply({ embeds: [embed] });
                // منشن للوسطاء لتنبيههم
                return channel.send({ content: `**تنبيه:** <@&${CONFIG.mediatorRole}> تم تحديث البيانات.` });
            }

            // 3. إضافة عضو (Fix Add User)
            if (customId === 'modal_add_user') {
                const targetId = interaction.fields.getTextInputValue('uid');
                await interaction.deferReply();
                
                try {
                    // ⚠️ الإصلاح: التأكد من وجود العضو فعلياً
                    const targetMember = await guild.members.fetch(targetId);
                    await channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: true, SendMessages: true });
                    
                    return interaction.editReply({ content: `✅ **تمت إضافة العضو ${targetMember} إلى التذكرة بنجاح.**` });
                } catch (e) {
                    return interaction.editReply({ content: `❌ **خطأ:** لم يتم العثور على عضو بهذا الآيدي \`${targetId}\`. تأكد من صحة الرقم.` });
                }
            }

            // 4. الحذف بسبب
            if (customId === 'modal_delete_reason') {
                const reason = interaction.fields.getTextInputValue('reason');
                await interaction.reply(`🗑️ **جاري حذف التذكرة...**\nالسبب: ${reason}`);
                
                const ownerId = channel.topic;
                // إرسال لوج قبل الحذف
                sendLog(guild, 'Force Delete', channel, user, ownerId, null, reason);
                setTimeout(() => channel.delete().catch(() => {}), 4000);
            }

            // 5. التقييم النهائي (Rating System) - الجزء الأهم 🔥
            if (customId.startsWith('modal_rate_')) {
                // RateID Format: modal_rate_USERID_STARS_TYPE_TICKETID
                const parts = customId.split('_');
                const targetId = parts[2]; // العضو اللي بيقيم
                const stars = parseInt(parts[3]);
                const type = parts[4]; // med or staff
                const ticketId = parts[5];

                const comment = interaction.fields.getTextInputValue('comment') || 'لا يوجد تعليق إضافي';
                
                // جلب البيانات المحفوظة
                const tradeData = activeTrades.get(ticketId) || "⚠️ لا توجد بيانات مسجلة للصفقة";
                
                // تحديد من يتم تقييمه
                let ratedUserId = null;
                let ratingCount = 0;
                let globalCount = 0;

                if (type === 'med') {
                    ratedUserId = ticketMediator.get(ticketId);
                    if (ratedUserId) {
                        // تحديث العدادات
                        const current = mediatorCounts.get(ratedUserId) || 0;
                        mediatorCounts.set(ratedUserId, current + 1);
                        ratingCount = current + 1;
                        
                        client.globalStats.mediators++;
                        globalCount = client.globalStats.mediators;
                    }
                } else {
                    // Staff Rating
                    ratedUserId = ticketClaimer.get(ticketId); // جلب من استلم التكت
                    if (ratedUserId) {
                        const current = staffCounts.get(ratedUserId) || 0;
                        staffCounts.set(ratedUserId, current + 1);
                        ratingCount = current + 1;
                    }
                    client.globalStats.staff++;
                    globalCount = client.globalStats.staff;
                }

                const ratedUserMention = ratedUserId ? `<@${ratedUserId}>` : "⚠️ غير محدد";
                
                // تحديد وصف النجوم
                const starEmojis = "⭐".repeat(stars);
                const starNames = ["سيء جداً 😡", "سيء 😞", "مقبول 😐", "جيد 🙂", "ممتاز 🤩"];
                const starLabel = starNames[stars - 1] || "تم";

                // بناء الإيمبد الطرش (Super Embed)
                const logEmbed = new EmbedBuilder()
                    .setAuthor({ name: guild.name, iconURL: guild.iconURL() })
                    .setTitle(type === 'med' ? `🛡️ تقييم خدمة وساطة` : `🛠️ تقييم خدمة إدارية`)
                    .setColor(type === 'med' ? COLORS.GOLD : COLORS.BLUE)
                    .setThumbnail(user.displayAvatarURL())
                    .addFields(
                        { name: '👤 العميل (المُقيِّم)', value: `<@${targetId}>`, inline: true },
                        { name: type === 'med' ? '🛡️ الوسيط' : '👮‍♂️ الإداري المستلم', value: ratedUserMention, inline: true },
                        { name: '📊 إحصائيات التقييم', value: `> رقم التقييم لهذا الشخص: **#${ratingCount}**\n> رقم التقييم في السيرفر: **#${globalCount}**`, inline: false },
                        { name: '\u200b', value: '━━━━━━━━━━━━━━━━━━━━━━' }, // فاصل
                        { name: '⭐ مستوى الخدمة', value: `${starEmojis} **(${stars}/5) - ${starLabel}**`, inline: true },
                        { name: '💬 التعليق', value: `\`\`\`${comment}\`\`\``, inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: `Ticket ID: ${ticketId}` });

                // إضافة تفاصيل التريد فقط للوساطة
                if (type === 'med') {
                    logEmbed.addFields({ name: '📦 تفاصيل العملية (Archived)', value: `\`\`\`yaml\n${tradeData}\n\`\`\`` });
                }

                // إرسال للوج المناسب
                const logChannelId = type === 'med' ? CONFIG.mediatorRatingLog : CONFIG.staffRatingLog;
                const logCh = client.channels.cache.get(logChannelId);
                
                if(logCh) {
                    await logCh.send({ content: type === 'med' ? `**تقييم جديد للوساطة!** ${ratedUserMention}` : `**تقييم جديد للإدارة!** ${ratedUserMention}`, embeds: [logEmbed] });
                }
                
                return interaction.reply({ content: '✅ **شكراً لك! تم تسجيل تقييمك ونشره في السيرفر.**', ephemeral: true });
            }
        }

        // ---------------------------------------------------
        // ☪️ معالجة الأزرار (Buttons Handler)
        // ---------------------------------------------------
        if (interaction.isButton()) {
            
            // 1. استلام التذكرة (Claim)
            if (customId === 'btn_claim') {
                // التحقق من الصلاحيات
                if (!member.roles.cache.has(CONFIG.staffRole) && !member.roles.cache.has(CONFIG.adminRole)) 
                    return interaction.reply({ content: '❌ **هذا الزر للإدارة فقط.**', ephemeral: true });

                const type = ticketTypes.get(channel.id);
                // منع الإدارة الصغرى من استلام تذاكر الشكاوى أو صناع المحتوى
                if ((type === 'creator' || type === 'admin') && !member.roles.cache.has(CONFIG.adminRole)) {
                    return interaction.reply({ content: '❌ **هذه التذكرة للإدارة العليا فقط.**', ephemeral: true });
                }

                // تسجيل المستلم (عشان التقييم بعدين)
                ticketClaimer.set(channel.id, user.id);

                // تعديل الصلاحيات
                await channel.permissionOverwrites.edit(CONFIG.staffRole, { ViewChannel: false }); // إخفاء عن باقي الطاقم
                await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true }); // إظهار للمستلم
                await channel.permissionOverwrites.edit(CONFIG.adminRole, { ViewChannel: true }); // إبقاء العليا

                // تعطيل الزر
                const row = ActionRowBuilder.from(interaction.message.components[0]);
                row.components[0].setDisabled(true).setLabel(`Claimed by ${user.username}`).setStyle(ButtonStyle.Secondary);
                await interaction.update({ components: [row] });
                
                const embed = createEmbed('✅ تم الاستلام', `قام الإداري <@${user.id}> باستلام التذكرة وسيقوم بمساعدتك الآن.`, COLORS.GREEN);
                await channel.send({ embeds: [embed] });
                
                sendLog(guild, 'Claim', channel, user, channel.topic);
            }

            // 2. طلب الإغلاق (Close Request)
            if (customId === 'btn_close') {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_confirm_close').setLabel('تأكيد الإغلاق').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('btn_cancel_close').setLabel('إلغاء').setStyle(ButtonStyle.Secondary)
                );
                return interaction.reply({ content: '❓ **هل أنت متأكد من رغبتك في إغلاق التذكرة؟**', components: [row] });
            }

            if (customId === 'btn_cancel_close') {
                return interaction.update({ content: '✅ **تم إلغاء عملية الإغلاق.**', components: [] });
            }

            // 3. تأكيد الإغلاق (Confirm Close)
            if (customId === 'btn_confirm_close') {
                const ownerId = channel.topic;
                // سحب صلاحية الرؤية من العضو
                await channel.permissionOverwrites.edit(ownerId, { ViewChannel: false });
                
                await interaction.update({ content: '🔒 **تم إغلاق التذكرة بنجاح.**', components: [] });
                
                // لوحة تحكم ما بعد الإغلاق
                const controlRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('btn_transcript').setLabel('حفظ السجل (Transcript)').setEmoji('📜').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('btn_reopen').setLabel('إعادة فتح').setEmoji('🔓').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('btn_delete').setLabel('حذف نهائي').setEmoji('⛔').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('btn_delete_reason').setLabel('حذف مع سبب').setEmoji('📝').setStyle(ButtonStyle.Danger)
                );
                
                const panelEmbed = createEmbed('⚙️ لوحة التحكم', `**تم إغلاق التذكرة بواسطة:** <@${user.id}>\nاختر إجراء من الأسفل.`, COLORS.Main);
                await channel.send({ embeds: [panelEmbed], components: [controlRow] });

                // إنشاء الترانسكريبت تلقائياً
                const attachment = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
                
                const transcriptEmbed = new EmbedBuilder()
                    .setColor(COLORS.GREEN)
                    .setTitle('📄 Ticket Transcript Log')
                    .addFields(
                        { name: 'Ticket', value: channel.name, inline: true },
                        { name: 'Owner', value: `<@${ownerId}>`, inline: true },
                        { name: 'Closed By', value: `<@${user.id}>`, inline: true },
                        { name: 'Claimed By', value: ticketClaimer.get(channel.id) ? `<@${ticketClaimer.get(channel.id)}>` : 'None', inline: true }
                    );

                const logCh = client.channels.cache.get(CONFIG.transcriptChannel);
                let logMsg = null;
                if (logCh) logMsg = await logCh.send({ embeds: [transcriptEmbed], files: [attachment] });
                
                sendLog(guild, 'Close', channel, user, ownerId, logMsg ? logMsg.url : null);

                // --- طلب تقييم الإدارة (Staff Rating Trigger) ---
                // يرسل فقط إذا لم تكن تذكرة وساطة (لأن الوساطة لها تقييم خاص بـ done)
                const type = ticketTypes.get(channel.id);
                if (type !== 'mediator') {
                    const owner = await client.users.fetch(ownerId).catch(() => null);
                    if (owner) {
                        const ticketID = channel.id;
                        const rateRow = new ActionRowBuilder().addComponents(
                            [1,2,3,4,5].map(i => new ButtonBuilder().setCustomId(`rate_staff_${i}_${ticketID}`).setLabel(`${i} ⭐`).setStyle(ButtonStyle.Primary))
                        );
                        
                        const staffMember = ticketClaimer.get(channel.id);
                        const staffText = staffMember ? `للإداري <@${staffMember}>` : "للطاقم الإداري";
                        
                        const ratingDmEmbed = createEmbed('⭐ تقييم الأداء', `**شكراً لتواصلك معنا.**\nيرجى تقييم تجربتك مع الدعم الفني ${staffText} لتحسين خدماتنا.`, COLORS.BLUE);
                        
                        await owner.send({ embeds: [ratingDmEmbed], components: [rateRow] }).catch(() => {});
                    }
                }
            }

            // 4. إعادة الفتح (Reopen)
            if (customId === 'btn_reopen') {
                const ownerId = channel.topic;
                await channel.permissionOverwrites.edit(ownerId, { ViewChannel: true });
                await interaction.message.delete();
                await interaction.reply({ content: '🔓 **تم إعادة فتح التذكرة.**' });
                sendLog(guild, 'Reopen', channel, user, ownerId);
            }

            // 5. الحذف (Delete)
            if (customId === 'btn_delete') {
                await interaction.reply('🗑️ **سيتم حذف التذكرة خلال 5 ثواني...**');
                setTimeout(() => channel.delete().catch(() => {}), 5000);
                sendLog(guild, 'Delete', channel, user, channel.topic);
            }

            // 6. حذف مع سبب (Modal Trigger)
            if (customId === 'btn_delete_reason') {
                const modal = new ModalBuilder().setCustomId('modal_delete_reason').setTitle('سبب الحذف');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('reason').setLabel('اكتب السبب هنا').setStyle(TextInputStyle.Short).setRequired(true)));
                return await interaction.showModal(modal);
            }

            // 7. الترانسكريبت اليدوي
            if (customId === 'btn_transcript') {
                const attachment = await createTranscript(channel, { limit: -1, fileName: `MNC-${channel.name}.html` });
                const logCh = client.channels.cache.get(CONFIG.transcriptChannel);
                if(logCh) await logCh.send({ 
                    content: `📝 **Manual Transcript:** \`${channel.name}\` requested by <@${user.id}>`, 
                    files: [attachment] 
                });
                return interaction.reply({ content: '✅ **تم استخراج السجل وإرساله للوج.**', ephemeral: true });
            }

            // 8. أزرار المودالات الداخلية
            if (customId === 'btn_trade_input') {
                const modal = new ModalBuilder().setCustomId('modal_trade_save').setTitle('Trade Details');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_val').setLabel('بيانات الصفقة').setStyle(TextInputStyle.Paragraph).setRequired(true)));
                return await interaction.showModal(modal);
            }

            if (customId === 'btn_add_user') {
                const modal = new ModalBuilder().setCustomId('modal_add_user').setTitle('إضافة عضو');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('uid').setLabel('آيدي العضو (User ID)').setStyle(TextInputStyle.Short).setRequired(true)));
                return await interaction.showModal(modal);
            }

            // 9. أزرار الوساطة العليا
            if (['high_approve', 'high_reject'].includes(customId)) {
                if (!CONFIG.highMediators.some(r => member.roles.cache.has(r))) {
                    return interaction.reply({ content: '❌ **هذا الزر لمسؤولي الوساطة العليا فقط.**', ephemeral: true });
                }
                const isApprove = customId === 'high_approve';
                const statusEmbed = new EmbedBuilder()
                    .setDescription(isApprove ? `✅ **تمت الموافقة بواسطة <@${user.id}>**` : `❌ **تم الرفض بواسطة <@${user.id}>**`)
                    .setColor(isApprove ? COLORS.GREEN : COLORS.RED);

                await interaction.update({ components: [], embeds: [interaction.message.embeds[0], statusEmbed] });
            }

            // 10. تفعيل مودال التقييم عند ضغط النجوم
            if (customId.startsWith('rate_')) {
                // تعطيل الأزرار لمنع التكرار
                const row = ActionRowBuilder.from(interaction.message.components[0]);
                row.components.forEach(btn => btn.setDisabled(true));
                await interaction.message.edit({ components: [row] });

                const parts = customId.split('_');
                const stars = parts[2];
                const type = parts[1]; // med or staff
                const ticketId = parts[3];

                const modalId = `modal_rate_${user.id}_${stars}_${type}_${ticketId}`;
                const modal = new ModalBuilder().setCustomId(modalId).setTitle('رأيك يهمنا');
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('comment').setLabel('تعليق إضافي (اختياري)').setStyle(TextInputStyle.Paragraph).setRequired(false)));
                return await interaction.showModal(modal);
            }
        }
    });

    // ====================================================
    // 3️⃣ CORE FUNCTIONS (الوظائف الأساسية)
    // ====================================================
    async function createTicket(interaction, type, fields) {
        const { guild, user } = interaction;
        const count = client.ticketCounter++;
        
        // إنشاء الروم
        const channel = await guild.channels.create({
            name: `ticket-${count}-${user.username}`,
            type: ChannelType.GuildText,
            parent: CONFIG.categoryID,
            topic: user.id, // حفظ آيدي صاحب التكت في وصف الروم
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: CONFIG.staffRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        // حفظ نوع التكت
        ticketTypes.set(channel.id, type);
        
        await interaction.reply({ content: `✅ **تم فتح تذكرتك بنجاح:** ${channel}`, ephemeral: true });
        
        // تجهيز الإيمبد الترحيبي
        const embed = new EmbedBuilder().setColor(COLORS.MAIN).setTimestamp().setFooter({ text: 'MNC Ticket System', iconURL: client.user.displayAvatarURL() });
        let mentionText = `|| <@${user.id}> ||`;

        // تخصيص المحتوى حسب النوع
        if (type === 'mediator') {
            const tUser = fields?.getTextInputValue('target_user') || 'N/A';
            const tDetails = fields?.getTextInputValue('trade_details') || 'N/A';
            
            // حفظ تفاصيل التريد تلقائياً عند الإنشاء
            activeTrades.set(channel.id, `الطرف الثاني: ${tUser}\nالتفاصيل: ${tDetails}`);

            embed.setTitle('🛡️ طلب وسيط جديد')
                .setDescription(`> **يرجى انتظار دخول أحد الوسطاء المعتمدين.**\n> لا تقم بأي تحويل قبل دخول الوسيط والتأكد من رتبته.`)
                .addFields(
                    { name: '👤 الطرف الثاني', value: `\`${tUser}\``, inline: true },
                    { name: '📝 تفاصيل الاتفاق', value: `\`\`\`\n${tDetails}\n\`\`\`` }
                );
            mentionText += ` <@&${CONFIG.mediatorRole}>`;

        } else if (type === 'support') {
            const issue = fields?.getTextInputValue('issue_details') || 'N/A';
            embed.setTitle('🛠️ طلب دعم فني')
                .setDescription(`> **مرحباً بك في الدعم الفني.**\n> سيقوم أحد الإداريين بالرد عليك قريباً.`)
                .addFields({ name: '❓ المشكلة', value: `\`\`\`\n${issue}\n\`\`\`` });
            mentionText += ` <@&${CONFIG.staffRole}>`;

        } else if (type === 'gift') {
            embed.setTitle('🎁 استلام جائزة / هدية')
                .setDescription(`> **مبروك الفوز!** 🎉\n> يرجى إرسال إثبات الفوز (صورة) وانتظار المسؤول.`);
            mentionText += ` <@&${CONFIG.staffRole}>`;

        } else if (type === 'admin') {
            embed.setTitle('⛔ شكوى إدارية')
                .setDescription(`> **هذه التذكرة سرية.**\n> لا يراها إلا الإدارة العليا. يرجى كتابة شكواك بوضوح مع الأدلة.`);
            mentionText += ` <@&${CONFIG.adminRole}>`;
            
            // تعديل الصلاحيات: إخفاء عن الإدارة الصغرى
            await channel.permissionOverwrites.edit(CONFIG.staffRole, { ViewChannel: false });
            await channel.permissionOverwrites.edit(CONFIG.adminRole, { ViewChannel: true });

        } else if (type === 'creator') {
            const links = fields?.getTextInputValue('links') || 'N/A';
            const subs = fields?.getTextInputValue('subs') || 'N/A';
            embed.setTitle('🎥 تقديم صانع محتوى')
                .addFields(
                    { name: '🔗 الروابط', value: links },
                    { name: '👥 عدد المتابعين', value: subs }
                );
            mentionText += ` <@&${CONFIG.adminRole}>`; // فرضا أن الإدارة العليا هي المسؤولة عن اليوتيوبرز
            await channel.permissionOverwrites.edit(CONFIG.staffRole, { ViewChannel: false });
            await channel.permissionOverwrites.edit(CONFIG.adminRole, { ViewChannel: true });
        }

        await channel.send({ content: mentionText });

        const controlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_claim').setLabel('استلام التذكرة (Claim)').setEmoji('🙋‍♂️').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('btn_close').setLabel('إغلاق (Close)').setEmoji('🔒').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('btn_add_user').setLabel('إضافة عضو').setEmoji('👤').setStyle(ButtonStyle.Secondary)
        );

        await channel.send({ embeds: [embed], components: [controlRow] });
        
        sendLog(guild, 'Open', channel, user, user.id);
    }

    // دالة اللوج (Logging Function)
    function sendLog(guild, action, channel, executor, ownerId, link = '', reason = null) {
        const embed = new EmbedBuilder()
            .setAuthor({ name: 'MNC SYSTEM LOGS', iconURL: guild.iconURL() })
            .setTitle(`${action === 'Delete' || action === 'Force Delete' ? '🗑️' : '📝'} Ticket Operation: ${action}`)
            .setColor(action.includes('Delete') ? COLORS.RED : COLORS.MAIN)
            .addFields(
                { name: 'Ticket', value: `\`${channel.name}\``, inline: true },
                { name: 'Executor', value: `<@${executor.id}>`, inline: true },
                { name: 'Owner', value: `<@${ownerId || 'Unknown'}>`, inline: true }
            )
            .setTimestamp();
        
        if (link) embed.addFields({ name: '📎 Transcript', value: `[Click to Download](${link})` });
        if (reason) embed.addFields({ name: '📝 Reason', value: reason });

        const logChannel = guild.channels.cache.get(CONFIG.logsChannel);
        if (logChannel) logChannel.send({ embeds: [embed] });
    }
};
