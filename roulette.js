const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const GIFEncoder = require('gifencoder'); // المكتبة الجديدة لصناعة العجلة المتحركة

// ================= تسجيل الخط =================
if (fs.existsSync('./font.ttf')) {
    registerFont('./font.ttf', { family: 'CustomFont' });
}

// ================= إعدادات الداتا بيز =================
const dbPath = './roulette_db.json';
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));
const loadDB = () => JSON.parse(fs.readFileSync(dbPath));
const saveDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));

// ================= إعدادات الرومات والرتب =================
const ALLOWED_CHANNELS = ['1453939768885903462']; 
const ROLET_ROLES = ['1453946893053726830']; 
const ADMIN_ROLES = ['1453904793746804766']; 
const POINTS_ROLES = ['1453904793746804766']; 
const VIP_ROLES = ['1453904793746804766']; 

const REWARD_POINTS = 10; 
const LOSE_POINTS = 3;    
const TURN_TIME = 20000; 
const DELAY_TIME = 10000; // 10 ثواني فاصل زي ما طلبت

const STORE_PRICES = { double_kick: 350, revive_friend: 250, self_revive: 300, nuke: 7500 };
const activeGames = new Map();

module.exports = (client) => {

    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton()) return;
        if (interaction.customId.startsWith('buy_')) {
            const itemMap = {
                'buy_double': { name: 'طرد مرتين', key: 'double_kick', price: STORE_PRICES.double_kick },
                'buy_friend': { name: 'إنعاش صديق', key: 'revive_friend', price: STORE_PRICES.revive_friend },
                'buy_revive': { name: 'إنعاش ذاتي', key: 'self_revive', price: STORE_PRICES.self_revive },
                'buy_nuke': { name: 'نووي', key: 'nuke', price: STORE_PRICES.nuke }
            };
            const item = itemMap[interaction.customId];
            if (!item) return;

            const db = loadDB(); 
            const user = db[interaction.user.id] || { points: 0, inventory: {} };

            if (user.points < item.price) {
                return interaction.reply({ content: `❌ نقاطك غير كافية! تحتاج **${item.price}** وأنت تمتلك **${user.points}**`, ephemeral: true });
            }

            user.points -= item.price;
            user.inventory[item.key] = (user.inventory[item.key] || 0) + 1;
            db[interaction.user.id] = user; 
            saveDB(db);

            const updatedShopRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('buy_double').setLabel(`طرد مرتين (${STORE_PRICES.double_kick})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_friend').setLabel(`إنعاش صديق (${STORE_PRICES.revive_friend})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_revive').setLabel(`إنعاش ذاتي (${STORE_PRICES.self_revive})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_nuke').setLabel(`نووي (${STORE_PRICES.nuke})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('show_points').setLabel(`💰 نقاطك: ${user.points}`).setStyle(ButtonStyle.Success).setDisabled(true)
            );
            await interaction.update({ components: [updatedShopRow] }).catch(()=>{});
            await interaction.followUp({ content: `✅ تم شراء **${item.name}** بنجاح، وستظل في مخزنك.`, ephemeral: true }).catch(()=>{});
        }
    });

    client.on('messageCreate', async message => {
        if (message.author.bot) return;
        const args = message.content.trim().split(/ +/);
        const command = args[0].toLowerCase();

        const hasAdminRole = message.member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));
        const hasRoletRole = message.member.roles.cache.some(r => ROLET_ROLES.includes(r.id));
        const hasPointsRole = message.member.roles.cache.some(r => POINTS_ROLES.includes(r.id));

        if (command === '!توقيف' || command === '$توقيف') {
            if (!hasAdminRole && !hasRoletRole) return;
            if (!activeGames.has(message.channel.id)) return message.reply('⚠️ لا توجد لعبة نشطة.');
            activeGames.delete(message.channel.id); 
            return message.reply('🛑 تم إيقاف لعبة الروليت نهائياً.');
        }

        if (command === '!متجر' || command === '!shop') {
            const db = loadDB();
            const user = db[message.author.id] || { points: 0, inventory: {} };
            const shopEmbed = new EmbedBuilder().setTitle('🛒 متجر الروليت').setColor('#2b2d31').setDescription('الأدوات المحفوظة:');
            const shopRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('buy_double').setLabel(`طرد مرتين (${STORE_PRICES.double_kick})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_friend').setLabel(`إنعاش صديق (${STORE_PRICES.revive_friend})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_revive').setLabel(`إنعاش ذاتي (${STORE_PRICES.self_revive})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_nuke').setLabel(`نووي (${STORE_PRICES.nuke})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('show_points').setLabel(`💰 نقاطك: ${user.points}`).setStyle(ButtonStyle.Success).setDisabled(true)
            );
            return message.reply({ embeds: [shopEmbed], components: [shopRow] });
        }

        if (command === '!point' || command === '!points') {
            if (!hasPointsRole) return;
            const targetUser = message.mentions.users.first();
            const amount = parseInt(args[2]);
            if (!targetUser || isNaN(amount)) return message.reply('❗ الاستخدام: `!point @user 100`');
            const db = loadDB();
            const userDb = db[targetUser.id] || { points: 0, inventory: {} };
            userDb.points += amount; db[targetUser.id] = userDb; saveDB(db);
            return message.reply(`✅ تم إضافة **${amount}** نقطة لـ <@${targetUser.id}>.`);
        }

        // ================= أمر سحب النقاط الجديد =================
        if (command === '!rpoint') {
            if (!hasPointsRole) return;
            const targetUser = message.mentions.users.first();
            const amount = parseInt(args[2]);
            if (!targetUser || isNaN(amount)) return message.reply('❗ الاستخدام: `!rpoint @user 100`');
            const db = loadDB();
            const userDb = db[targetUser.id] || { points: 0, inventory: {} };
            userDb.points = Math.max(0, userDb.points - amount); db[targetUser.id] = userDb; saveDB(db);
            return message.reply(`📉 تم سحب **${amount}** نقطة من <@${targetUser.id}>.`);
        }

        if (command === '!روليت' || command === '$روليت') {
            if (!hasAdminRole && (!ALLOWED_CHANNELS.includes(message.channel.id) || !hasRoletRole)) return;
            if (activeGames.has(message.channel.id)) return message.reply('⚠️ هناك لعبة تعمل حالياً.');

            let players = [];
            const waitTime = 60; 
            const endTime = Math.floor(Date.now() / 1000) + waitTime;

            const startEmbed = new EmbedBuilder()
                .setTitle('## روليت')
                .setColor('#800080')
                .setDescription('**طريقة اللعب**\n1- اختر الرقم الذي سيمثلك\n2- يتم تدوير العجلة\n3- اللاعب المختار يطرد شخصاً\n4- يستمر اللعب حتى يتبقى فائز')
                .addFields(
                    { name: 'الوقت المتبقي للبدء:', value: `⏳ <t:${endTime}:R>`, inline: false },
                    { name: 'المشاركين:', value: `(0/200)\nلا يوجد مشاركين.`, inline: false }
                )
                .setImage('https://cdn.discordapp.com/attachments/1454420195539025941/1482162249001865328/1773445405834.jpg');

            const joinRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('join_roulette').setLabel('دخول 🎯').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('leave_roulette').setLabel('خروج 🚪').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('open_shop_main').setLabel('🛒 المتجر').setStyle(ButtonStyle.Primary)
            );

            const gameMessage = await message.channel.send({ embeds: [startEmbed], components: [joinRow] });
            const collector = gameMessage.createMessageComponentCollector({ time: waitTime * 1000 });
            activeGames.set(message.channel.id, { collector });

            collector.on('collect', async i => {
                if (i.customId === 'open_shop_main') {
                    const db = loadDB();
                    const user = db[i.user.id] || { points: 0, inventory: {} };
                    const shopEmbed = new EmbedBuilder().setTitle('🛒 متجر الروليت');
                    const shopRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('buy_double').setLabel(`طرد مرتين`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_friend').setLabel(`إنعاش صديق`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_revive').setLabel(`إنعاش ذاتي`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_nuke').setLabel(`نووي`).setStyle(ButtonStyle.Secondary)
                    );
                    return i.reply({ embeds: [shopEmbed], components: [shopRow], ephemeral: true });
                }

                if (i.customId === 'join_roulette') {
                    if (players.includes(i.user.id)) return i.reply({ content: 'مسجل بالفعل!', ephemeral: true });
                    players.push(i.user.id);
                    await i.reply({ content: 'تم الدخول.', ephemeral: true });
                } else if (i.customId === 'leave_roulette') {
                    players = players.filter(id => id !== i.user.id);
                    await i.reply({ content: 'تم الخروج.', ephemeral: true });
                }

                let mentionsList = players.slice(0, 30).map((p, idx) => `**${idx + 1}-** <@${p}>`).join('\n');
                if (players.length > 30) mentionsList += `\n... و ${players.length - 30} آخرين`;
                if (players.length === 0) mentionsList = 'لا يوجد مشاركين.';

                startEmbed.setFields(
                    { name: 'الوقت المتبقي للبدء:', value: `⏳ <t:${endTime}:R>`, inline: false },
                    { name: `المشاركين (${players.length}/200):`, value: mentionsList, inline: false }
                );
                await gameMessage.edit({ embeds: [startEmbed] });
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'force_stop') return; 
                const disabledJoinRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('join_done').setLabel('دخول 🎯').setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('leave_done').setLabel('خروج 🚪').setStyle(ButtonStyle.Danger).setDisabled(true)
                );

                if (players.length < 4) {
                    activeGames.delete(message.channel.id);
                    await gameMessage.edit({ components: [disabledJoinRow] }).catch(() => {});
                    return message.channel.send('❌ تم إلغاء الروليت لعدم اكتمال العدد.');
                }
                
                const endEmbed = EmbedBuilder.from(startEmbed);
                endEmbed.setFields({ name: 'حالة اللعبة:', value: `🚀 بدأت اللعبة بـ **${players.length}** لاعبين!`, inline: false });
                await gameMessage.edit({ embeds: [endEmbed], components: [disabledJoinRow] }).catch(() => {});
                
                startGameLoop(message.channel, players);
            });
        }
    });

    // ================= دالة صنع العجلة المتحركة (GIF) =================
    async function createSpinningGIF(playersInfo) {
        const size = 400;
        const encoder = new GIFEncoder(size, size);
        encoder.start();
        encoder.setRepeat(0); // تكرار لا نهائي
        encoder.setDelay(100); // سرعة اللفة
        encoder.setQuality(10);

        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const radius = size / 2 - 20;
        const sliceAngle = (2 * Math.PI) / playersInfo.length;
        const fontStr = fs.existsSync('./font.ttf') ? 'bold 14px "CustomFont", sans-serif' : 'bold 14px sans-serif';

        // رسم 10 فريمات (لقطات) عشان نعمل حركة الدوران
        for (let frame = 0; frame < 10; frame++) {
            ctx.fillStyle = '#1e1f22';
            ctx.fillRect(0, 0, size, size);

            ctx.save();
            ctx.translate(center, center);
            ctx.rotate((frame * Math.PI) / 5); // تدوير العجلة في كل فريم
            ctx.translate(-center, -center);

            for (let i = 0; i < playersInfo.length; i++) {
                const startAngle = i * sliceAngle;
                const endAngle = startAngle + sliceAngle;
                ctx.fillStyle = i % 2 === 0 ? '#b30000' : '#2f3136';
                ctx.beginPath();
                ctx.moveTo(center, center);
                ctx.arc(center, center, radius, startAngle, endAngle);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();

                ctx.save();
                ctx.translate(center, center);
                ctx.rotate(startAngle + sliceAngle / 2);
                ctx.textAlign = 'right';
                ctx.fillStyle = '#ffffff';
                ctx.font = fontStr; 
                ctx.fillText(`${playersInfo[i].globalIdx}- ${playersInfo[i].name.substring(0, 10)}`, radius - 20, 5);
                ctx.restore();
            }
            ctx.restore();

            // المركز المؤشر (ثابتين مابيلفوش)
            ctx.beginPath(); ctx.arc(center, center, 45, 0, Math.PI * 2);
            ctx.fillStyle = '#1e1f22'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
            ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = 'bold 14px sans-serif'; ctx.fillText('SPIN', center, center + 5);

            ctx.fillStyle = '#ffffff'; ctx.beginPath();
            ctx.moveTo(size - 20, center - 10); ctx.lineTo(size, center); ctx.lineTo(size - 20, center + 10); ctx.closePath(); ctx.fill();

            encoder.addFrame(ctx);
        }
        encoder.finish();
        return encoder.out.getData();
    }

    // ================= دالة الصورة الثابتة (بتظهر الافتار) =================
    async function generateStaticImage(playersInfo, winnerId, guild) {
        const size = 500;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const radius = size / 2 - 20;
        const sliceAngle = (2 * Math.PI) / playersInfo.length;
        const fontStr = fs.existsSync('./font.ttf') ? 'bold 16px "CustomFont", sans-serif' : 'bold 16px sans-serif';

        // حساب زاوية الفائز عشان المؤشر يقف عليه
        const winnerIndex = playersInfo.findIndex(p => p.id === winnerId);
        const offsetAngle = -(winnerIndex * sliceAngle + sliceAngle / 2); 

        ctx.fillStyle = '#1e1f22';
        ctx.fillRect(0, 0, size, size);

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(offsetAngle); 
        ctx.translate(-center, -center);

        for (let i = 0; i < playersInfo.length; i++) {
            const startAngle = i * sliceAngle;
            const endAngle = startAngle + sliceAngle;
            ctx.fillStyle = i % 2 === 0 ? '#b30000' : '#2f3136';
            ctx.beginPath(); ctx.moveTo(center, center);
            ctx.arc(center, center, radius, startAngle, endAngle); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();

            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.font = fontStr; 
            ctx.fillText(`${playersInfo[i].globalIdx}- ${playersInfo[i].name.substring(0, 12)}`, radius - 20, 5);
            ctx.restore();
        }
        ctx.restore();

        // رسم أفتار الفائز في النص!
        const member = guild.members.cache.get(winnerId);
        if (member) {
            try {
                const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true });
                const img = await loadImage(avatarUrl);
                ctx.save(); ctx.beginPath(); ctx.arc(center, center, 55, 0, Math.PI * 2); ctx.clip();
                ctx.drawImage(img, center - 55, center - 55, 110, 110); ctx.restore();
                ctx.beginPath(); ctx.arc(center, center, 55, 0, Math.PI * 2);
                ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke();
            } catch(e) {}
        }

        ctx.fillStyle = '#ffffff'; ctx.beginPath();
        ctx.moveTo(size - 20, center - 15); ctx.lineTo(size, center); ctx.lineTo(size - 20, center + 15); ctx.closePath(); ctx.fill();

        return canvas.toBuffer();
    }

    function getTurnComponents(playersInfo, targetPlayers, page, turnPlayerId, guild) {
        let rows = [];
        let currentRow = new ActionRowBuilder();
        const start = page * 20;
        const end = start + 20;
        const currentTargets = targetPlayers.slice(start, end);
        const totalPages = Math.ceil(targetPlayers.length / 20);

        currentTargets.forEach((id) => {
            if (currentRow.components.length === 5) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
            }
            const playerObj = playersInfo.find(p => p.id === id);
            const globalIdx = playerObj ? playerObj.globalIdx : 0;
            const name = playerObj ? playerObj.name.substring(0, 10) : 'User';
            currentRow.addComponents(new ButtonBuilder().setCustomId(`kick_${id}`).setLabel(`${globalIdx}- ${name}`).setStyle(ButtonStyle.Secondary));
        });
        if (currentRow.components.length > 0) rows.push(currentRow);

        const controlRow = new ActionRowBuilder();
        if (totalPages > 1) { controlRow.addComponents(new ButtonBuilder().setCustomId(`prev_${page}`).setLabel('⬅️').setStyle(ButtonStyle.Primary).setDisabled(page === 0)); }
        controlRow.addComponents(
            new ButtonBuilder().setCustomId('random_kick').setLabel('طرد عشوائي').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('withdraw').setLabel('انسحاب').setStyle(ButtonStyle.Danger)
        );
        if (totalPages > 1) {
            controlRow.addComponents(new ButtonBuilder().setCustomId('page_info').setLabel(`${page + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true));
            controlRow.addComponents(new ButtonBuilder().setCustomId(`next_${page}`).setLabel('➡️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1));
        }
        rows.push(controlRow);

        const db = loadDB();
        const userDb = db[turnPlayerId] || { inventory: {} };
        const turnMember = guild.members.cache.get(turnPlayerId);
        const isVipUser = turnMember ? turnMember.roles.cache.some(r => VIP_ROLES.includes(r.id)) : false;

        const itemsRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('use_double').setLabel('طرد مرتين').setStyle(ButtonStyle.Secondary).setDisabled(!isVipUser && (userDb.inventory['double_kick'] || 0) < 1),
            new ButtonBuilder().setCustomId('use_nuke').setLabel('نووي ☢️').setStyle(ButtonStyle.Danger).setDisabled(!isVipUser && (userDb.inventory['nuke'] || 0) < 1),
            new ButtonBuilder().setCustomId('use_revive_friend').setLabel('إنعاش صديق 🤝').setStyle(ButtonStyle.Success).setDisabled(!isVipUser && (userDb.inventory['revive_friend'] || 0) < 1),
            new ButtonBuilder().setCustomId('info_self_revive').setLabel('إنعاش ذاتي ❤️').setStyle(ButtonStyle.Secondary).setDisabled(!isVipUser && (userDb.inventory['self_revive'] || 0) < 1)
        );
        rows.push(itemsRow);
        return rows;
    }

    async function startGameLoop(channel, players) {
        let alivePlayers = [...players];
        let deadPlayers = [];
        let db = loadDB();

        while (alivePlayers.length > 1) {
            if (!activeGames.has(channel.id)) break;

            if (alivePlayers.length === 2) {
                const winnerId = alivePlayers[Math.floor(Math.random() * 2)];
                const ObjectPlayersInfo = alivePlayers.map((id, index) => {
                    const member = channel.guild.members.cache.get(id);
                    return { id, name: member ? member.displayName : 'User', globalIdx: index + 1 };
                });
                
                const buffer = await generateStaticImage(ObjectPlayersInfo, winnerId, channel.guild);
                const attachment = new AttachmentBuilder(buffer, { name: 'win.png' });

                db = loadDB();
                const winnerDb = db[winnerId] || { points: 0, inventory: {} };
                winnerDb.points += REWARD_POINTS;
                db[winnerId] = winnerDb;
                saveDB(db);

                const winEmbed = new EmbedBuilder()
                    .setColor('#800080')
                    .setTitle('👑 الجولة الأخيرة!')
                    .setDescription(`هذه الجولة الأخيرة ! الفائز باللعبة هو <@${winnerId}>\nتم إضافة **${REWARD_POINTS}** نقطة لحسابه!`)
                    .setImage('attachment://win.png');

                await channel.send({ content: `<@${winnerId}>`, embeds: [winEmbed], files: [attachment] });
                activeGames.delete(channel.id);
                return; 
            }

            const turnIndex = Math.floor(Math.random() * alivePlayers.length);
            const turnPlayerId = alivePlayers[turnIndex];

            const ObjectPlayersInfo = alivePlayers.map((id, index) => {
                const member = channel.guild.members.cache.get(id);
                return { id, name: member ? member.displayName : 'User', globalIdx: index + 1 };
            });

            // 🌟 إرسال الـ GIF الحقيقي للعجلة وهي بتلف 🌟
            const gifBuffer = await createSpinningGIF(ObjectPlayersInfo);
            const spinMsg = await channel.send({
                content: `🎰 العجلة تدور لاختيار اللاعب...`,
                files: [new AttachmentBuilder(gifBuffer, { name: 'spin.gif' })]
            });
            
            // انتظار 4 ثواني للمتعة
            await new Promise(r => setTimeout(r, 4000));
            await spinMsg.delete().catch(()=>{});

            // 🌟 إرسال الصورة الثابتة بالأفتار والزراير 🌟
            const staticBuffer = await generateStaticImage(ObjectPlayersInfo, turnPlayerId, channel.guild);
            const attachment = new AttachmentBuilder(staticBuffer, { name: 'roulette.png' });

            const targetPlayers = alivePlayers.filter(id => id !== turnPlayerId);
            let currentPage = 0;
            let currentRows = getTurnComponents(ObjectPlayersInfo, targetPlayers, currentPage, turnPlayerId, channel.guild);

            const turnMsg = await channel.send({
                content: `<@${turnPlayerId}> لديك **20 ثانية** لاختيار لاعب لطرده`,
                files: [attachment],
                components: currentRows
            });

            const filter = i => i.user.id === turnPlayerId;
            const collector = turnMsg.createMessageComponentCollector({ filter, time: TURN_TIME });

            let kickedIds = [];
            let actionTaken = false;
            let isRandomKick = false;
            let nukeUsed = false;
            let doubleKickActive = false;

            const tMember = channel.guild.members.cache.get(turnPlayerId);
            const isVipUser = tMember ? tMember.roles.cache.some(r => VIP_ROLES.includes(r.id)) : false;

            await new Promise((resolve) => {
                collector.on('collect', async interaction => {
                    db = loadDB();
                    let uDb = db[turnPlayerId] || { inventory: {} };

                    if (interaction.customId === 'info_self_revive') {
                        return interaction.reply({ content: '❤️ الإنعاش الذاتي يعمل تلقائياً عندما يقوم شخص بطردك!', ephemeral: true });
                    }
                    if (interaction.customId === 'use_nuke') {
                        if (!isVipUser) { uDb.inventory['nuke'] -= 1; db[turnPlayerId] = uDb; saveDB(db); }
                        kickedIds = [...targetPlayers]; // طرد الكل
                        nukeUsed = true; actionTaken = true;
                        await interaction.reply({ content: '☢️ تم إطلاق النووي!', ephemeral: true });
                        collector.stop(); return;
                    }
                    if (interaction.customId === 'use_double') {
                        if (!isVipUser) { uDb.inventory['double_kick'] -= 1; db[turnPlayerId] = uDb; saveDB(db); }
                        doubleKickActive = true;
                        await interaction.reply({ content: '🔪 اختر لاعبين للرد.', ephemeral: true });
                        return;
                    }
                    if (interaction.customId === 'use_revive_friend') {
                        if (deadPlayers.length === 0) return interaction.reply({ content: '❌ لا يوجد أموات.', ephemeral: true });
                        const deadOptions = deadPlayers.slice(0, 25).map(id => {
                            const m = channel.guild.members.cache.get(id);
                            return { label: m ? m.displayName.substring(0,25) : id, value: id };
                        });
                        const selectMenu = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder().setCustomId('revive_select').setPlaceholder('اختر صديق لإنعاشه').addOptions(deadOptions)
                        );
                        await interaction.reply({ content: 'اختر صديق:', components: [selectMenu], ephemeral: true });
                        return;
                    }
                    if (interaction.customId === 'revive_select') {
                        const revivedId = interaction.values[0];
                        if (!isVipUser) { uDb.inventory['revive_friend'] -= 1; db[turnPlayerId] = uDb; saveDB(db); }
                        alivePlayers.push(revivedId); // إرجاع للحياة
                        deadPlayers = deadPlayers.filter(id => id !== revivedId);
                        await interaction.update({ content: `✅ تم إنعاش <@${revivedId}>! كمل طردك.`, components: [] });
                        return;
                    }

                    if (interaction.customId.startsWith('prev_')) {
                        currentPage--;
                        currentRows = getTurnComponents(ObjectPlayersInfo, targetPlayers, currentPage, turnPlayerId, channel.guild);
                        await interaction.update({ components: currentRows });
                    } else if (interaction.customId.startsWith('next_')) {
                        currentPage++;
                        currentRows = getTurnComponents(ObjectPlayersInfo, targetPlayers, currentPage, turnPlayerId, channel.guild);
                        await interaction.update({ components: currentRows });
                    } else if (interaction.customId === 'withdraw') {
                        kickedIds.push(turnPlayerId);
                        actionTaken = true;
                        await interaction.reply({ content: `تم الانسحاب.`, ephemeral: true });
                        collector.stop();
                    } else if (interaction.customId === 'random_kick') {
                        kickedIds.push(targetPlayers[Math.floor(Math.random() * targetPlayers.length)]);
                        actionTaken = true; isRandomKick = true;
                        await interaction.reply({ content: `تم الطرد العشوائي.`, ephemeral: true });
                        collector.stop();
                    } else if (interaction.customId.startsWith('kick_')) {
                        const kid = interaction.customId.split('_')[1];
                        if (!kickedIds.includes(kid)) kickedIds.push(kid);
                        
                        if (doubleKickActive && kickedIds.length < 2) {
                            await interaction.reply({ content: `✅ تم، اختر الثاني!`, ephemeral: true });
                        } else {
                            actionTaken = true;
                            await interaction.reply({ content: `تم التأكيد. ✅`, ephemeral: true });
                            collector.stop();
                        }
                    }
                });
                collector.on('end', () => resolve());
            });

            if (!activeGames.has(channel.id)) break;

            const disabledRows = turnMsg.components.map(row => {
                const newRow = new ActionRowBuilder();
                row.components.forEach(btn => newRow.addComponents(ButtonBuilder.from(btn).setDisabled(true)));
                return newRow;
            });
            await turnMsg.edit({ components: disabledRows }).catch(() => {});

            if (nukeUsed) {
                await channel.send(`☢️ | أطلق <@${turnPlayerId}> النووي! تم إبادة الجميع! سيتم بدء الجولة القادمة...`);
            } else if (!actionTaken) {
                kickedIds = [turnPlayerId];
                await channel.send(`💣 | تم طرد <@${turnPlayerId}> لتأخره في الاختيار ، سيتم بدء الجولة القادمة...`);
            } else if (kickedIds.includes(turnPlayerId)) {
                await channel.send(`💣 | لقد انسحب <@${turnPlayerId}> من اللعبة ، سيتم بدء الجولة القادمة...`);
            } else if (isRandomKick) {
                const mentions = kickedIds.map(id => `<@${id}>`).join(' و ');
                await channel.send(`💣 | قام <@${turnPlayerId}> بطرد ${mentions} **عشوائياً** من اللعبة ، سيتم بدء الجولة القادمة...`);
            } else {
                const mentions = kickedIds.map(id => `<@${id}>`).join(' و ');
                await channel.send(`💣 | قام <@${turnPlayerId}> بطرد ${mentions} من اللعبة ، سيتم بدء الجولة القادمة...`);
            }

            db = loadDB();
            for (const kid of kickedIds) {
                const kickedUserDb = db[kid] || { points: 0, inventory: {} };
                const kidMember = channel.guild.members.cache.get(kid);
                const kidIsVip = kidMember ? kidMember.roles.cache.some(r => VIP_ROLES.includes(r.id)) : false;

                if ((kidIsVip || kickedUserDb.inventory['self_revive'] > 0) && kid !== turnPlayerId) {
                    if (!kidIsVip) { 
                        kickedUserDb.inventory['self_revive'] -= 1;
                        db[kid] = kickedUserDb;
                    }
                    await channel.send(`❤️ **إنعاش!** اللاعب <@${kid}> استخدم الإنعاش الذاتي ورجع للعبة!`);
                } else {
                    alivePlayers = alivePlayers.filter(id => id !== kid);
                    deadPlayers.push(kid);
                    kickedUserDb.points += LOSE_POINTS;
                    db[kid] = kickedUserDb;
                }
            }
            saveDB(db);

            await new Promise(r => setTimeout(r, DELAY_TIME));
        }
        
        if (alivePlayers.length === 1 && activeGames.has(channel.id)) {
            const winnerId = alivePlayers[0];
            db = loadDB();
            const winnerDb = db[winnerId] || { points: 0, inventory: {} };
            winnerDb.points += REWARD_POINTS;
            db[winnerId] = winnerDb;
            saveDB(db);

            const winEmbed = new EmbedBuilder()
                .setColor('#800080')
                .setTitle('👑 الفائز بالروليت!')
                .setDescription(`🎉 فاز باللعبة <@${winnerId}>\nتم إضافة **${REWARD_POINTS}** نقطة لحسابه!`);
            await channel.send({ content: `<@${winnerId}>`, embeds: [winEmbed] });
        }
        activeGames.delete(channel.id);
    }
};
