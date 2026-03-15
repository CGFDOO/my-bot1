const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const GIFEncoder = require('gifencoder');

// ================= تسجيل الخط =================
try {
    if (fs.existsSync('./font.ttf')) {
        registerFont('./font.ttf', { family: 'CustomFont' });
    }
} catch (e) {}

// ================= الداتا بيز =================
const dbPath = './roulette_db.json';
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));
const loadDB = () => JSON.parse(fs.readFileSync(dbPath));
const saveDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));

// ================= إعدادات الرومات والرتب =================
const ALLOWED_CHANNELS = ['1453939768885903462']; 
const ROLET_ROLES = ['1453946893053726830']; 
const ADMIN_ROLES = ['1453904793746804766']; 
const POINTS_ROLES = ['1453904793746804766']; 

const REWARD_POINTS = 10; 
const LOSE_POINTS = 3;    
const TURN_TIME = 20000; 
const DELAY_TIME = 10000; 

const STORE_PRICES = { double_kick: 350, revive_friend: 250, self_revive: 300, nuke: 7500, freeze: 400 };
const activeGames = new Map();

module.exports = (client) => {

    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton()) return;
        if (interaction.customId.startsWith('buy_')) {
            const itemMap = {
                'buy_double': { name: 'طرد مرتين', key: 'double_kick', price: STORE_PRICES.double_kick },
                'buy_friend': { name: 'إنعاش صديق', key: 'revive_friend', price: STORE_PRICES.revive_friend },
                'buy_revive': { name: 'إنعاش ذاتي', key: 'self_revive', price: STORE_PRICES.self_revive },
                'buy_nuke': { name: 'نووي', key: 'nuke', price: STORE_PRICES.nuke },
                'buy_freeze': { name: 'تجميد', key: 'freeze', price: STORE_PRICES.freeze }
            };
            const item = itemMap[interaction.customId];
            if (!item) return;

            const db = loadDB(); 
            const user = db[interaction.user.id] || { points: 0, inventory: {} };

            if (user.points < item.price) {
                return interaction.reply({ content: `❌ نقاطك غير كافية! السعر **${item.price}** وأنت تمتلك **${user.points}**`, ephemeral: true });
            }

            user.points -= item.price;
            user.inventory[item.key] = (user.inventory[item.key] || 0) + 1;
            db[interaction.user.id] = user; 
            saveDB(db);

            const updatedShopRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('buy_double').setLabel(`طرد مرتين 🎯 (${STORE_PRICES.double_kick})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_friend').setLabel(`إنعاش صديق 🤝 (${STORE_PRICES.revive_friend})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_revive').setLabel(`إنعاش ذاتي 💉 (${STORE_PRICES.self_revive})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_freeze').setLabel(`تجميد 🧊 (${STORE_PRICES.freeze})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_nuke').setLabel(`نووي ☢️ (${STORE_PRICES.nuke})`).setStyle(ButtonStyle.Secondary)
            );
            
            const infoRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('show_balance').setLabel(`💰 رصيدك الحالي: ${user.points}`).setStyle(ButtonStyle.Success).setDisabled(true)
            );

            await interaction.update({ components: [updatedShopRow, infoRow] }).catch(()=>{});
            await interaction.followUp({ content: `✅ تم شراء **${item.name}** بنجاح.`, ephemeral: true }).catch(()=>{});
        }
    });

    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild || !message.member) return;
        if (!message.content.startsWith('!') && !message.content.startsWith('$')) return;
        
        const args = message.content.slice(1).trim().split(/ +/);
        const command = args[0].toLowerCase();

        const hasAdminRole = message.member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));
        const hasRoletRole = message.member.roles.cache.some(r => ROLET_ROLES.includes(r.id));
        const hasPointsRole = message.member.roles.cache.some(r => POINTS_ROLES.includes(r.id));

        if (command === 'توقيف') {
            if (!hasAdminRole && !hasRoletRole) return;
            if (!activeGames.has(message.channel.id)) return message.reply('⚠️ لا توجد لعبة نشطة لإيقافها.');
            
            const gameData = activeGames.get(message.channel.id);
            if (gameData.collector) gameData.collector.stop('force_stop');
            if (gameData.gameMessage) gameData.gameMessage.delete().catch(()=>{});
            
            activeGames.delete(message.channel.id); 
            return message.channel.send('🛑 **تم إيقاف اللعبة وحذفها.**');
        }

        if (command === 'point' || command === 'points') {
            if (!hasPointsRole && !hasAdminRole) return;
            const targetUser = message.mentions.users.first();
            const amountStr = args.find(arg => /^\d+$/.test(arg));
            const amount = parseInt(amountStr);
            
            if (!targetUser || isNaN(amount)) return message.reply('❗ الاستخدام: `!point @user 1000`');
            
            const db = loadDB();
            const userDb = db[targetUser.id] || { points: 0, inventory: {} };
            userDb.points += amount; db[targetUser.id] = userDb; saveDB(db);
            return message.reply(`✅ تم إضافة **${amount}** نقطة إلى <@${targetUser.id}>.`);
        }

        if (command === 'rpoint') {
            if (!hasPointsRole && !hasAdminRole) return;
            const targetUser = message.mentions.users.first();
            const amountStr = args.find(arg => /^\d+$/.test(arg));
            const amount = parseInt(amountStr);
            
            if (!targetUser || isNaN(amount)) return message.reply('❗ الاستخدام: `!rpoint @user 1000`');
            
            const db = loadDB();
            const userDb = db[targetUser.id] || { points: 0, inventory: {} };
            const actualDeducted = Math.min(userDb.points, amount);
            userDb.points -= actualDeducted;
            db[targetUser.id] = userDb; saveDB(db);
            if (actualDeducted === 0) return message.reply(`⚠️ اللاعب <@${targetUser.id}> لا يمتلك أي نقاط لسحبها.`);
            return message.reply(`📉 تم سحب **${actualDeducted}** نقطة من <@${targetUser.id}>.`);
        }

        if (command === 'روليت') {
            if (!hasAdminRole && (!ALLOWED_CHANNELS.includes(message.channel.id) || !hasRoletRole)) {
                return message.reply('❌ **هذا الأمر مخصص للإدارة والإدارة العليا فقط.**');
            }
            if (activeGames.has(message.channel.id)) return message.reply('⚠️ هناك لعبة تعمل حالياً.');

            let players = [];
            const waitTime = 60; 
            const endTime = Math.floor(Date.now() / 1000) + waitTime;

            const startEmbed = new EmbedBuilder()
                .setTitle('## روليت')
                .setColor('#2b2d31')
                .setDescription('**قوانين اللعبة**\n1- ادخل اللعبة وانتظر العجلة\n2- عندما يقع عليك الاختيار، لديك 20 ثانية لطرد خصمك\n3- البقاء للأقوى!')
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
            
            // إضافة خاصية التجميد المعلق
            activeGames.set(message.channel.id, { collector, gameMessage, pendingFreezes: new Set() });

            collector.on('collect', async i => {
                if (i.customId === 'open_shop_main') {
                    const db = loadDB(); 
                    const user = db[i.user.id] || { points: 0, inventory: {} };

                    const shopEmbed = new EmbedBuilder().setTitle('🛒 المتجر').setColor('#2b2d31');
                    const shopRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('buy_double').setLabel(`طرد مرتين 🎯 (${STORE_PRICES.double_kick})`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_friend').setLabel(`إنعاش صديق 🤝 (${STORE_PRICES.revive_friend})`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_revive').setLabel(`إنعاش ذاتي 💉 (${STORE_PRICES.self_revive})`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_freeze').setLabel(`تجميد 🧊 (${STORE_PRICES.freeze})`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_nuke').setLabel(`نووي ☢️ (${STORE_PRICES.nuke})`).setStyle(ButtonStyle.Secondary)
                    );
                    const infoRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('show_balance').setLabel(`💰 رصيدك الحالي: ${user.points}`).setStyle(ButtonStyle.Success).setDisabled(true)
                    );
                    return i.reply({ embeds: [shopEmbed], components: [shopRow, infoRow], ephemeral: true });
                }

                if (i.customId === 'join_roulette') {
                    if (players.includes(i.user.id)) return i.reply({ content: 'أنت داخل اللعبة بالفعل!', ephemeral: true });
                    players.push(i.user.id);
                    await i.reply({ content: '✅ تم تسجيل دخولك.', ephemeral: true });
                } else if (i.customId === 'leave_roulette') {
                    if (!players.includes(i.user.id)) return i.reply({ content: '❌ أنت لست مسجلاً أصلاً!', ephemeral: true });
                    players = players.filter(id => id !== i.user.id);
                    await i.reply({ content: '🚪 تم سحب تسجيلك.', ephemeral: true });
                }

                let mentionsList = players.slice(0, 30).map((p, idx) => `**${idx + 1}-** <@${p}>`).join('\n');
                if (players.length > 30) mentionsList += `\n... و ${players.length - 30} آخرين`;
                if (players.length === 0) mentionsList = 'لا يوجد مشاركين.';

                startEmbed.setFields(
                    { name: 'الوقت المتبقي للبدء:', value: `⏳ <t:${endTime}:R>`, inline: false },
                    { name: `المشاركين (${players.length}/200):`, value: mentionsList, inline: false }
                );
                await gameMessage.edit({ embeds: [startEmbed] }).catch(()=>{});
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'force_stop') return; 
                if (reason === 'messageDelete') {
                    activeGames.delete(message.channel.id);
                    return message.channel.send('🛑 **تم إيقاف اللعبة بسبب حذف رسالة البداية.**');
                }

                const disabledJoinRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('join_done').setLabel('دخول 🎯').setStyle(ButtonStyle.Success).setDisabled(true),
                    new ButtonBuilder().setCustomId('leave_done').setLabel('خروج 🚪').setStyle(ButtonStyle.Danger).setDisabled(true),
                    new ButtonBuilder().setCustomId('shop_done').setLabel('🛒 المتجر').setStyle(ButtonStyle.Primary).setDisabled(true)
                );

                if (players.length < 4) {
                    activeGames.delete(message.channel.id);
                    await gameMessage.edit({ components: [disabledJoinRow] }).catch(() => {});
                    return message.channel.send('❌ **تم إلغاء الروليت لعدم اكتمال العدد.**');
                }
                
                await gameMessage.edit({ components: [disabledJoinRow] }).catch(() => {});
                startGameLoop(message.channel, players);
            });
        }
    });

    // ================= دالة العجلة المتحركة (5 لفات، شفافة وبطيئة) =================
    async function generateRouletteGIF(playersInfo, targetId, guild) {
        const size = 500;
        const encoder = new GIFEncoder(size, size);
        encoder.start();
        encoder.setRepeat(-1); 
        encoder.setQuality(10);
        encoder.setTransparent(0x000000); 

        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const radius = size / 2 - 20;
        const sliceAngle = (2 * Math.PI) / playersInfo.length;
        const fontStr = fs.existsSync('./font.ttf') ? 'bold 16px "CustomFont", sans-serif' : 'bold 16px sans-serif';

        const targetIndex = playersInfo.findIndex(p => p.id === targetId);
        const randomFraction = 0.15 + Math.random() * 0.7; 
        const targetAngle = -(targetIndex * sliceAngle + (sliceAngle * randomFraction));
        
        const totalSpins = 5; // 5 لفات كاملة
        const totalFrames = 60; // فريمات أكتر عشان البطء والنعومة

        let avatarImg = null;
        const member = guild.members.cache.get(targetId);
        if (member) {
            try {
                const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true });
                avatarImg = await loadImage(avatarUrl);
            } catch(e) {}
        }

        for (let frame = 0; frame <= totalFrames; frame++) {
            const t = frame / totalFrames;
            const easeOut = 1 - Math.pow(1 - t, 3); 
            const currentAngle = (targetAngle - (Math.PI * 2 * totalSpins)) + (Math.PI * 2 * totalSpins) * easeOut;

            ctx.fillStyle = '#000000'; // شفافية مطلقة
            ctx.fillRect(0, 0, size, size);

            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(currentAngle); 
            ctx.translate(-center, -center);

            for (let i = 0; i < playersInfo.length; i++) {
                const sAngle = i * sliceAngle;
                const eAngle = sAngle + sliceAngle;
                ctx.fillStyle = i % 2 === 0 ? '#4A148C' : '#1A1A1D';
                ctx.beginPath(); ctx.moveTo(center, center);
                ctx.arc(center, center, radius, sAngle, eAngle); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();

                ctx.save();
                ctx.translate(center, center);
                ctx.rotate(sAngle + sliceAngle / 2);
                ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.font = fontStr; 
                const cleanName = playersInfo[i].name.replace(/[\u1000-\uFFFF]/g, '').substring(0, 10).trim() || 'Player';
                ctx.fillText(`${playersInfo[i].globalIdx}- ${cleanName}`, radius - 20, 5);
                ctx.restore();
            }
            ctx.restore();

            ctx.beginPath(); ctx.arc(center, center, 45, 0, Math.PI * 2);
            ctx.fillStyle = '#1A1A1D'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#FFD700'; ctx.stroke(); 

            if (frame === totalFrames && avatarImg) {
                ctx.save(); ctx.beginPath(); ctx.arc(center, center, 45, 0, Math.PI * 2); ctx.clip();
                ctx.drawImage(avatarImg, center - 45, center - 45, 90, 90); ctx.restore();
                ctx.beginPath(); ctx.arc(center, center, 45, 0, Math.PI * 2);
                ctx.lineWidth = 2; ctx.strokeStyle = '#FFD700'; ctx.stroke();
            } else {
                ctx.fillStyle = '#FFD700'; ctx.textAlign = 'center'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('SPIN', center, center + 6);
            }

            ctx.fillStyle = '#ffffff'; ctx.beginPath();
            ctx.moveTo(size - 15, center - 10); ctx.lineTo(size, center); ctx.lineTo(size - 15, center + 10); ctx.closePath(); ctx.fill();

            encoder.setDelay(frame === totalFrames ? 60000 : 55); 
            encoder.addFrame(ctx);
        }
        encoder.finish();
        return encoder.out.getData();
    }

    // ================= الصورة الثابتة =================
    async function generateStaticImage(playersInfo, targetId, guild) {
        const size = 500;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const radius = size / 2 - 20;
        const sliceAngle = (2 * Math.PI) / playersInfo.length;
        const fontStr = fs.existsSync('./font.ttf') ? 'bold 16px "CustomFont", sans-serif' : 'bold 16px sans-serif';

        const targetIndex = playersInfo.findIndex(p => p.id === targetId);
        const randomFraction = 0.15 + Math.random() * 0.7; 
        const offsetAngle = -(targetIndex * sliceAngle + (sliceAngle * randomFraction));

        ctx.clearRect(0, 0, size, size); // شفاف

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(offsetAngle); 
        ctx.translate(-center, -center);

        for (let i = 0; i < playersInfo.length; i++) {
            const startAngle = i * sliceAngle;
            const endAngle = startAngle + sliceAngle;
            ctx.fillStyle = i % 2 === 0 ? '#4A148C' : '#1A1A1D';
            ctx.beginPath(); ctx.moveTo(center, center);
            ctx.arc(center, center, radius, startAngle, endAngle); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();

            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.font = fontStr; 
            const cleanName = playersInfo[i].name.replace(/[\u1000-\uFFFF]/g, '').substring(0, 10).trim() || 'Player';
            ctx.fillText(`${playersInfo[i].globalIdx}- ${cleanName}`, radius - 20, 5);
            ctx.restore();
        }
        ctx.restore();

        const member = guild.members.cache.get(targetId);
        let avatarDrawn = false;
        if (member) {
            try {
                const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true });
                const img = await loadImage(avatarUrl);
                ctx.save(); ctx.beginPath(); ctx.arc(center, center, 45, 0, Math.PI * 2); ctx.clip();
                ctx.drawImage(img, center - 45, center - 45, 90, 90); ctx.restore();
                ctx.beginPath(); ctx.arc(center, center, 45, 0, Math.PI * 2);
                ctx.lineWidth = 2; ctx.strokeStyle = '#FFD700'; ctx.stroke(); 
                avatarDrawn = true;
            } catch(e) {}
        }

        if (!avatarDrawn) {
            ctx.beginPath(); ctx.arc(center, center, 45, 0, Math.PI * 2);
            ctx.fillStyle = '#1A1A1D'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#FFD700'; ctx.stroke();
        }

        ctx.fillStyle = '#ffffff'; ctx.beginPath();
        ctx.moveTo(size - 15, center - 10); ctx.lineTo(size, center); ctx.lineTo(size - 15, center + 10); ctx.closePath(); ctx.fill();

        return canvas.toBuffer();
    }

    // ================= تصميم الزراير والديناميكية =================
    function getTurnComponents(playersInfo, targetPlayers, page, turnPlayerId, gameLimits) {
        let rows = [];
        const PLAYERS_PER_PAGE = 10; 
        
        let totalPages = Math.ceil(targetPlayers.length / PLAYERS_PER_PAGE) || 1;
        if (page >= totalPages) page = Math.max(0, totalPages - 1);

        const start = page * PLAYERS_PER_PAGE;
        const end = start + PLAYERS_PER_PAGE;
        const currentTargets = targetPlayers.slice(start, end);

        // 1. زراير اللاعبين
        let currentRow = new ActionRowBuilder();
        currentTargets.forEach((id) => {
            if (currentRow.components.length === 5) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
            }
            const p = playersInfo.find(x => x.id === id);
            const cleanName = p.name.replace(/[\u1000-\uFFFF]/g, '').substring(0, 10).trim() || 'Player';
            currentRow.addComponents(new ButtonBuilder().setCustomId(`kick_${id}_${page}`).setLabel(`${p.globalIdx}- ${cleanName}`).setStyle(ButtonStyle.Secondary));
        });
        if (currentRow.components.length > 0) rows.push(currentRow);

        // 2. التحكم الأساسي
        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('random_kick').setLabel('طرد عشوائي 🎲').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('withdraw').setLabel('انسحاب 🚪').setStyle(ButtonStyle.Danger) 
        ));

        // 3. زراير الصفحات الديناميكية (بالأرقام فقط)
        if (totalPages > 1) {
            rows.push(new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`prev_${page}`).setLabel('⬅️ الصفحة السابقة').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('page_info').setLabel(`صفحة ${page + 1}/${totalPages} (${targetPlayers.length} لاعب)`).setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId(`next_${page}`).setLabel('الصفحة التالية ➡️').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
            ));
        }

        // 4. الخواص (مقفولة لو مش معاه)
        const db = loadDB();
        const userDb = db[turnPlayerId] || { inventory: {} };
        const limits = gameLimits[turnPlayerId] || { nuke: false, double: false, revive: false, freeze: false };

        const canDouble = (userDb.inventory['double_kick'] || 0) > 0 && !limits.double;
        const canNuke = (userDb.inventory['nuke'] || 0) > 0 && !limits.nuke;
        const canReviveFriend = (userDb.inventory['revive_friend'] || 0) > 0 && !limits.revive;
        const canFreeze = (userDb.inventory['freeze'] || 0) > 0 && !limits.freeze;

        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('use_double').setLabel('طرد مرتين 🎯').setStyle(ButtonStyle.Secondary).setDisabled(!canDouble),
            new ButtonBuilder().setCustomId('use_nuke').setLabel('نووي ☢️').setStyle(ButtonStyle.Secondary).setDisabled(!canNuke),
            new ButtonBuilder().setCustomId('use_revive_friend').setLabel('إنعاش صديق 🤝').setStyle(ButtonStyle.Secondary).setDisabled(!canReviveFriend),
            new ButtonBuilder().setCustomId('use_freeze').setLabel('تجميد اللاعب 🧊').setStyle(ButtonStyle.Secondary).setDisabled(!canFreeze)
        ));
        
        return rows;
    }

    // ================= اللعبة الأساسية =================
    async function startGameLoop(channel, players) {
        let alivePlayers = [...players];
        let deadPlayers = [];
        let db = loadDB();
        let gameLimits = {}; 

        players.forEach(p => {
            gameLimits[p] = { nuke: false, double: false, revive: false, freeze: false };
        });

        while (alivePlayers.length > 0) {
            if (!activeGames.has(channel.id)) break;

            if (alivePlayers.length === 2) {
                const winnerId = alivePlayers[Math.floor(Math.random() * 2)];
                const ObjectPlayersInfo = alivePlayers.map((id, index) => {
                    const member = channel.guild.members.cache.get(id);
                    return { id, name: member ? member.displayName : 'User', globalIdx: index + 1 };
                });
                
                const gifBuffer = await generateRouletteGIF(ObjectPlayersInfo, winnerId, channel.guild);
                const attachmentGIF = new AttachmentBuilder(gifBuffer, { name: 'win.gif' });
                
                let spinMsg = await channel.send({ content: `🎰 **يتم تدوير العجلة لاختيار الفائز...**`, files: [attachmentGIF] });
                
                await new Promise(r => setTimeout(r, 3800)); // مدة الـ 5 لفات

                const staticBuffer = await generateStaticImage(ObjectPlayersInfo, winnerId, channel.guild);
                const staticAttachment = new AttachmentBuilder(staticBuffer, { name: 'win.png' });

                db = loadDB();
                const winnerDb = db[winnerId] || { points: 0, inventory: {} };
                winnerDb.points += REWARD_POINTS;
                db[winnerId] = winnerDb;
                saveDB(db);

                await spinMsg.edit({
                    content: `👑 | 🥳 **الفائز باللعبة هو <@${winnerId}>!**\nتم إضافة **${REWARD_POINTS}** نقطة لحسابه!`,
                    files: [staticAttachment]
                }).catch(()=>{});

                activeGames.delete(channel.id);
                return; 
            }

            const turnIndex = Math.floor(Math.random() * alivePlayers.length);
            const turnPlayerId = alivePlayers[turnIndex];

            const ObjectPlayersInfo = alivePlayers.map((id, index) => {
                const member = channel.guild.members.cache.get(id);
                return { id, name: member ? member.displayName : 'User', globalIdx: index + 1 };
            });

            try {
                // التحقق من التجميد قبل بداية الدور
                const gameData = activeGames.get(channel.id);
                const isCurrentlyFrozen = gameData.pendingFreezes && gameData.pendingFreezes.has(turnPlayerId);
                if (isCurrentlyFrozen) {
                    gameData.pendingFreezes.delete(turnPlayerId);
                }

                const gifBuffer = await generateRouletteGIF(ObjectPlayersInfo, turnPlayerId, channel.guild);
                const attachmentGIF = new AttachmentBuilder(gifBuffer, { name: 'spin.gif' });

                let turnMsg = await channel.send({ content: `🎰 **يتم تدوير العجلة...**`, files: [attachmentGIF] });
                
                await new Promise(r => setTimeout(r, 3800)); 

                const staticBuffer = await generateStaticImage(ObjectPlayersInfo, turnPlayerId, channel.guild);
                const staticAttachment = new AttachmentBuilder(staticBuffer, { name: 'result.png' });

                let targetPlayers = alivePlayers.filter(id => id !== turnPlayerId);
                let currentPage = 0;
                let currentRows = getTurnComponents(ObjectPlayersInfo, targetPlayers, currentPage, turnPlayerId, gameLimits);

                if (isCurrentlyFrozen) {
                    const disabledRows = currentRows.map(row => {
                        const newRow = new ActionRowBuilder();
                        row.components.forEach(btn => newRow.addComponents(ButtonBuilder.from(btn).setDisabled(true)));
                        return newRow;
                    });
                    await turnMsg.edit({
                        content: `🧊 <@${turnPlayerId}> **أنت مجمد لمدة 15 ثانية! لن يمكنك فعل شيء حتى يفك التجميد.**`,
                        files: [staticAttachment],
                        components: disabledRows
                    }).catch(()=>{});
                    
                    await new Promise(r => setTimeout(r, 15000));
                    
                    if (!activeGames.has(channel.id)) break;
                    await turnMsg.edit({
                        content: `🔥 <@${turnPlayerId}> **فُك التجميد! أمامك 5 ثواني للنجاة!**`,
                        components: currentRows
                    }).catch(()=>{});
                } else {
                    await turnMsg.edit({
                        content: `🔔 <@${turnPlayerId}> **لديك 20 ثانية لاختيار لاعب لطرده.**`,
                        files: [staticAttachment],
                        components: currentRows
                    }).catch(()=>{});
                }

                const filter = i => i.message.id === turnMsg.id;
                const collector = turnMsg.createMessageComponentCollector({ filter, time: isCurrentlyFrozen ? 5000 : TURN_TIME });

                let kickedIds = [];
                let actionTaken = false;
                let isRandomKick = false;
                let nukeUsed = false;
                let doubleKickActive = false;

                await new Promise((resolve) => {
                    collector.on('collect', async interaction => {
                        db = loadDB();

                        if (interaction.user.id !== turnPlayerId) return interaction.reply({ content: '❌ هذا الزر مخصص للاعب المختار فقط.', ephemeral: true });

                        let uDb = db[turnPlayerId] || { inventory: {} };

                        // نظام التجميد الصايع (بيختار مين يتجمد الدور الجاي)
                        if (interaction.customId === 'use_freeze') {
                            uDb.inventory['freeze'] -= 1; gameLimits[turnPlayerId].freeze = true; db[turnPlayerId] = uDb; saveDB(db);
                            
                            const freezeOptions = alivePlayers.filter(id => id !== turnPlayerId).map(id => {
                                const m = channel.guild.members.cache.get(id);
                                const cleanName = m ? m.displayName.replace(/[\u1000-\uFFFF]/g, '').substring(0,25) : id;
                                return { label: cleanName, value: id };
                            });
                            const selectMenu = new ActionRowBuilder().addComponents(
                                new StringSelectMenuBuilder().setCustomId('freeze_select').setPlaceholder('اختر الضحية لتجميدها الدور القادم').addOptions(freezeOptions)
                            );
                            await interaction.reply({ content: 'اختر:', components: [selectMenu], ephemeral: true });
                            return;
                        }
                        if (interaction.customId === 'freeze_select') {
                            const frozenId = interaction.values[0];
                            const gameD = activeGames.get(channel.id);
                            if(gameD) gameD.pendingFreezes.add(frozenId);
                            
                            await interaction.update({ content: `🧊 سيتم تجميد <@${frozenId}> في دوره القادم! أكمل اللعب.`, components: [] });
                            currentRows = getTurnComponents(ObjectPlayersInfo, targetPlayers, currentPage, turnPlayerId, gameLimits);
                            await turnMsg.edit({ components: currentRows }).catch(()=>{});
                            return;
                        }

                        if (interaction.customId === 'use_nuke') {
                            uDb.inventory['nuke'] -= 1; gameLimits[turnPlayerId].nuke = true; db[turnPlayerId] = uDb; saveDB(db);
                            kickedIds = [...targetPlayers]; nukeUsed = true; actionTaken = true;
                            await interaction.reply({ content: '☢️ تم إطلاق النووي.', ephemeral: true });
                            collector.stop(); return;
                        }
                        if (interaction.customId === 'use_double') {
                            uDb.inventory['double_kick'] -= 1; gameLimits[turnPlayerId].double = true; db[turnPlayerId] = uDb; saveDB(db);
                            doubleKickActive = true;
                            await interaction.reply({ content: '🔪 اختر لاعبين.', ephemeral: true });
                            currentRows = getTurnComponents(ObjectPlayersInfo, targetPlayers, currentPage, turnPlayerId, gameLimits);
                            await turnMsg.edit({ components: currentRows }).catch(()=>{});
                            return;
                        }
                        if (interaction.customId === 'use_revive_friend') {
                            if (deadPlayers.length === 0) return interaction.reply({ content: '❌ لا يوجد لاعبون مطرودون لإنعاشهم.', ephemeral: true });
                            const deadOptions = deadPlayers.slice(0, 25).map(id => {
                                const m = channel.guild.members.cache.get(id);
                                const cleanName = m ? m.displayName.replace(/[\u1000-\uFFFF]/g, '').substring(0,25) : id;
                                return { label: cleanName, value: id };
                            });
                            const selectMenu = new ActionRowBuilder().addComponents(
                                new StringSelectMenuBuilder().setCustomId('revive_select').setPlaceholder('اختر لاعباً لإنعاشه').addOptions(deadOptions)
                            );
                            await interaction.reply({ content: 'اختر:', components: [selectMenu], ephemeral: true });
                            return;
                        }
                        if (interaction.customId === 'revive_select') {
                            const revivedId = interaction.values[0];
                            uDb.inventory['revive_friend'] -= 1; gameLimits[turnPlayerId].revive = true; db[turnPlayerId] = uDb; saveDB(db);
                            alivePlayers.push(revivedId); 
                            deadPlayers = deadPlayers.filter(id => id !== revivedId);
                            await interaction.update({ content: `✅ تم إنعاش <@${revivedId}>.`, components: [] });
                            
                            targetPlayers = alivePlayers.filter(id => id !== turnPlayerId); 
                            currentRows = getTurnComponents(ObjectPlayersInfo, targetPlayers, currentPage, turnPlayerId, gameLimits);
                            await turnMsg.edit({ components: currentRows }).catch(()=>{});
                            return;
                        }

                        if (interaction.customId.startsWith('prev_')) {
                            currentPage--;
                            currentRows = getTurnComponents(ObjectPlayersInfo, targetPlayers, currentPage, turnPlayerId, gameLimits);
                            await interaction.update({ components: currentRows });
                        } else if (interaction.customId.startsWith('next_')) {
                            currentPage++;
                            currentRows = getTurnComponents(ObjectPlayersInfo, targetPlayers, currentPage, turnPlayerId, gameLimits);
                            await interaction.update({ components: currentRows });
                        } else if (interaction.customId === 'withdraw') {
                            kickedIds.push(turnPlayerId); actionTaken = true;
                            await interaction.reply({ content: `تم الانسحاب.`, ephemeral: true });
                            collector.stop();
                        } else if (interaction.customId === 'random_kick') {
                            kickedIds.push(targetPlayers[Math.floor(Math.random() * targetPlayers.length)]);
                            actionTaken = true; isRandomKick = true;
                            await interaction.reply({ content: `تم الاختيار العشوائي.`, ephemeral: true });
                            collector.stop();
                        } else if (interaction.customId.startsWith('kick_')) {
                            const kid = interaction.customId.split('_')[1];
                            if (!kickedIds.includes(kid)) kickedIds.push(kid);
                            if (doubleKickActive && kickedIds.length < 2) {
                                await interaction.reply({ content: `✅ اختر اللاعب الثاني.`, ephemeral: true });
                            } else {
                                actionTaken = true;
                                await interaction.reply({ content: `تم الطرد. ✅`, ephemeral: true });
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
                    await channel.send(`☢️ قام <@${turnPlayerId}> باستخدام النووي وطرد الجميع.`);
                } else if (!actionTaken) {
                    kickedIds = [turnPlayerId];
                    await channel.send(`⏳ تم طرد <@${turnPlayerId}> لتأخره في الاختيار.`);
                } else if (kickedIds.includes(turnPlayerId)) {
                    await channel.send(`🏃 لقد انسحب <@${turnPlayerId}> من اللعبة.`);
                } else if (isRandomKick) {
                    const mentions = kickedIds.map(id => `<@${id}>`).join(' و ');
                    await channel.send(`🎲 قام <@${turnPlayerId}> بطرد ${mentions} عشوائياً.`);
                } else {
                    const mentions = kickedIds.map(id => `<@${id}>`).join(' و ');
                    await channel.send(`💣 قام <@${turnPlayerId}> بطرد ${mentions}.`);
                }

                for (const kid of kickedIds) {
                    db = loadDB();
                    const kickedUserDb = db[kid] || { points: 0, inventory: {} };
                    if (kickedUserDb.inventory['self_revive'] > 0 && kid !== turnPlayerId) {
                        const reviveRow = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId(`self_revive_${kid}`).setLabel('استخدم الإنعاش الذاتي! 💉').setStyle(ButtonStyle.Success)
                        );
                        const promptMsg = await channel.send({ content: `⚠️ <@${kid}> لديك إنعاش ذاتي، لديك 10 ثواني لاستخدامه.`, components: [reviveRow] });
                        
                        try {
                            const filter = i => i.customId === `self_revive_${kid}` && i.user.id === kid;
                            await promptMsg.awaitMessageComponent({ filter, time: 10000 });
                            kickedUserDb.inventory['self_revive'] -= 1; db[kid] = kickedUserDb; saveDB(db);
                            await promptMsg.delete().catch(()=>{});
                            await channel.send(`💉 استخدم <@${kid}> الإنعاش الذاتي وعاد إلى اللعبة.`);
                        } catch (err) {
                            await promptMsg.delete().catch(()=>{});
                            alivePlayers = alivePlayers.filter(id => id !== kid);
                            deadPlayers.push(kid);
                            kickedUserDb.points += LOSE_POINTS; db[kid] = kickedUserDb; saveDB(db);
                        }
                    } else {
                        alivePlayers = alivePlayers.filter(id => id !== kid);
                        deadPlayers.push(kid);
                        kickedUserDb.points += LOSE_POINTS; db[kid] = kickedUserDb; saveDB(db);
                    }
                }

                if (alivePlayers.length > 1) {
                    await channel.send(`🔄 ستبدأ الجولة القادمة بعد قليل...`);
                    await new Promise(r => setTimeout(r, DELAY_TIME));
                }
            } catch (err) {}
        }
        
        if (alivePlayers.length === 1 && activeGames.has(channel.id)) {
            const winnerId = alivePlayers[0];
            db = loadDB();
            const winnerDb = db[winnerId] || { points: 0, inventory: {} };
            winnerDb.points += REWARD_POINTS; db[winnerId] = winnerDb; saveDB(db);
            await channel.send(`👑 | 🥳 **الفائز باللعبة هو <@${winnerId}>!**\nتم إضافة **${REWARD_POINTS}** نقطة لحسابه.`);
        }
        activeGames.delete(channel.id);
    }
};
