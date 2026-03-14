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

// أسعار المتجر متضمنة أداة التجميد الجديدة
const STORE_PRICES = { double_kick: 350, revive_friend: 250, self_revive: 300, nuke: 7500, freeze: 200 };
const activeGames = new Map();

module.exports = (client) => {

    // ================= معالجة المتجر =================
    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton()) return;
        if (interaction.customId.startsWith('buy_')) {
            const itemMap = {
                'buy_double': { name: 'طرد مرتين', key: 'double_kick', price: STORE_PRICES.double_kick },
                'buy_friend': { name: 'إنعاش صديق', key: 'revive_friend', price: STORE_PRICES.revive_friend },
                'buy_revive': { name: 'إنعاش ذاتي', key: 'self_revive', price: STORE_PRICES.self_revive },
                'buy_nuke': { name: 'نووي', key: 'nuke', price: STORE_PRICES.nuke },
                'buy_freeze': { name: 'تجميد 🧊', key: 'freeze', price: STORE_PRICES.freeze }
            };
            const item = itemMap[interaction.customId];
            if (!item) return;

            const db = loadDB(); 
            const user = db[interaction.user.id] || { points: 0, inventory: {} };

            if (user.points < item.price) {
                return interaction.reply({ content: `❌ نقاطك غير كافية! سعرها **${item.price}** وأنت تمتلك **${user.points}**`, ephemeral: true });
            }

            user.points -= item.price;
            user.inventory[item.key] = (user.inventory[item.key] || 0) + 1;
            db[interaction.user.id] = user; 
            saveDB(db);

            const updatedShopRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('buy_double').setLabel(`طرد مرتين (${STORE_PRICES.double_kick})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_friend').setLabel(`إنعاش صديق (${STORE_PRICES.revive_friend})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_revive').setLabel(`إنعاش ذاتي (${STORE_PRICES.self_revive})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_freeze').setLabel(`تجميد 🧊 (${STORE_PRICES.freeze})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_nuke').setLabel(`نووي (${STORE_PRICES.nuke})`).setStyle(ButtonStyle.Danger)
            );
            await interaction.update({ components: [updatedShopRow] }).catch(()=>{});
            await interaction.followUp({ content: `✅ تم شراء **${item.name}**! استمتع بها في الجولة القادمة.`, ephemeral: true }).catch(()=>{});
        }
    });

    // ================= الأوامر الأساسية =================
    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild || !message.member) return;
        
        // دعم لعلامة ! وعلامة $
        if (!message.content.startsWith('!') && !message.content.startsWith('$')) return;
        
        const args = message.content.slice(1).trim().split(/ +/);
        const command = args[0].toLowerCase();

        const hasAdminRole = message.member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));
        const hasRoletRole = message.member.roles.cache.some(r => ROLET_ROLES.includes(r.id));
        const hasPointsRole = message.member.roles.cache.some(r => POINTS_ROLES.includes(r.id));

        // 🛑 التوقيف
        if (command === 'توقيف') {
            if (!hasAdminRole && !hasRoletRole) return;
            if (!activeGames.has(message.channel.id)) return message.reply('⚠️ لا توجد لعبة نشطة لإيقافها.');
            const gameData = activeGames.get(message.channel.id);
            if (gameData.collector) gameData.collector.stop('force_stop');
            activeGames.delete(message.channel.id); 
            return message.reply('🛑 **تم إيقاف وحذف اللعبة نهائياً بأمر الإدارة.**');
        }

        // 💳 أمر الرصيد (كل واحد يشوف نفسه، الإدارة تشوف الكل)
        if (command === 'رصيد' || command === 'نقاط') {
            let targetUser = message.mentions.users.first();
            
            if (targetUser && targetUser.id !== message.author.id) {
                if (!hasAdminRole && !hasPointsRole) {
                    return message.reply('❌ **لا تمتلك الصلاحية لرؤية رصيد ومخزن غيرك!**');
                }
            } else {
                targetUser = message.author;
            }

            const db = loadDB();
            const userDb = db[targetUser.id] || { points: 0, inventory: {} };

            const embed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setAuthor({ name: `💳 البطاقة الشخصية لـ: ${targetUser.displayName}`, iconURL: targetUser.displayAvatarURL() })
                .setDescription(`**الرصيد الحالي:** ${userDb.points} 💰\n\n**🎒 المخزن:**\n🔪 طرد مرتين: **${userDb.inventory.double_kick || 0}**\n🤝 إنعاش صديق: **${userDb.inventory.revive_friend || 0}**\n❤️ إنعاش ذاتي: **${userDb.inventory.self_revive || 0}**\n🧊 تجميد: **${userDb.inventory.freeze || 0}**\n☢️ نووي: **${userDb.inventory.nuke || 0}**`);
            return message.reply({ embeds: [embed] });
        }

        // 🛒 المتجر
        if (command === 'متجر' || command === 'shop') {
            const db = loadDB();
            const user = db[message.author.id] || { points: 0, inventory: {} };
            const shopEmbed = new EmbedBuilder().setTitle('🛒 متجر الروليت السري').setColor('#2b2d31').setDescription(`نقاطك الحالية: **${user.points}** 💰`);
            const shopRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('buy_double').setLabel(`طرد مرتين (${STORE_PRICES.double_kick})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_friend').setLabel(`إنعاش صديق (${STORE_PRICES.revive_friend})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_revive').setLabel(`إنعاش ذاتي (${STORE_PRICES.self_revive})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_freeze').setLabel(`تجميد 🧊 (${STORE_PRICES.freeze})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_nuke').setLabel(`نووي (${STORE_PRICES.nuke})`).setStyle(ButtonStyle.Danger)
            );
            return message.reply({ embeds: [shopEmbed], components: [shopRow] });
        }

        // 💰 إضافة النقاط
        if (command === 'point' || command === 'points') {
            if (!hasPointsRole && !hasAdminRole) return;
            const targetUser = message.mentions.users.first();
            const amount = parseInt(args[1]);
            if (!targetUser || isNaN(amount)) return message.reply('❗ الاستخدام الصحيح: `!point @user 100`');
            const db = loadDB();
            const userDb = db[targetUser.id] || { points: 0, inventory: {} };
            userDb.points += amount; db[targetUser.id] = userDb; saveDB(db);
            return message.reply(`✅ تم تحويل **${amount}** نقطة بنجاح إلى <@${targetUser.id}>.`);
        }

        // 📉 سحب النقاط المطور (!rpoint)
        if (command === 'rpoint') {
            if (!hasPointsRole && !hasAdminRole) return;
            const targetUser = message.mentions.users.first();
            const amount = parseInt(args[1]);
            if (!targetUser || isNaN(amount)) return message.reply('❗ الاستخدام الصحيح: `!rpoint @user 100`');
            
            const db = loadDB();
            const userDb = db[targetUser.id] || { points: 0, inventory: {} };
            
            const actualDeducted = Math.min(userDb.points, amount); // بيسحب اللي معاه بس لو أقل
            userDb.points -= actualDeducted;
            db[targetUser.id] = userDb; saveDB(db);

            if (actualDeducted === 0) {
                return message.reply(`⚠️ اللاعب <@${targetUser.id}> لا يمتلك أي نقاط لسحبها.`);
            } else if (actualDeducted < amount) {
                return message.reply(`📉 تم تصفير حساب <@${targetUser.id}> (تم سحب ${actualDeducted} نقطة فقط لأنه لا يمتلك المزيد).`);
            } else {
                return message.reply(`📉 تم سحب **${amount}** نقطة من <@${targetUser.id}> بنجاح.`);
            }
        }

        // 🎰 تشغيل الروليت
        if (command === 'روليت') {
            if (!hasAdminRole && (!ALLOWED_CHANNELS.includes(message.channel.id) || !hasRoletRole)) return;
            if (activeGames.has(message.channel.id)) return message.reply('⚠️ هناك لعبة تعمل حالياً.');

            let players = [];
            const waitTime = 60; 
            const endTime = Math.floor(Date.now() / 1000) + waitTime;

            const startEmbed = new EmbedBuilder()
                .setTitle('## روليت')
                .setColor('#800080')
                .setDescription('**قوانين المعركة**\n1- ادخل اللعبة وانتظر العجلة\n2- عندما يقع عليك الاختيار، لديك 20 ثانية لطرد خصمك\n3- استخدم أدواتك بذكاء\n4- البقاء للأقوى!')
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
            activeGames.set(message.channel.id, { collector, playing: false });

            collector.on('collect', async i => {
                if (i.customId === 'open_shop_main') {
                    const shopEmbed = new EmbedBuilder().setTitle('🛒 متجر الروليت').setDescription('اشترِ أسلحتك:');
                    const shopRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('buy_double').setLabel(`طرد مرتين`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_friend').setLabel(`إنعاش صديق`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_revive').setLabel(`إنعاش ذاتي`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_freeze').setLabel(`تجميد 🧊`).setStyle(ButtonStyle.Secondary)
                    );
                    return i.reply({ embeds: [shopEmbed], components: [shopRow], ephemeral: true });
                }

                if (i.customId === 'join_roulette') {
                    if (players.includes(i.user.id)) return i.reply({ content: 'أنت داخل اللعبة بالفعل!', ephemeral: true });
                    players.push(i.user.id);
                    await i.reply({ content: '✅ تم تسجيل دخولك لساحة المعركة.', ephemeral: true });
                } else if (i.customId === 'leave_roulette') {
                    if (!players.includes(i.user.id)) return i.reply({ content: '❌ أنت لست مسجلاً في اللعبة أصلاً!', ephemeral: true });
                    players = players.filter(id => id !== i.user.id);
                    await i.reply({ content: '🚪 تم سحب تسجيلك من المعركة.', ephemeral: true });
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
                    return message.channel.send('❌ **تم إلغاء الروليت لعدم اكتمال العدد (تحتاج 4 لاعبين كحد أدنى).**');
                }
                
                const endEmbed = EmbedBuilder.from(startEmbed);
                endEmbed.setFields({ name: 'حالة اللعبة:', value: `🚀 **بدأت المعركة بـ ${players.length} لاعبين!**`, inline: false });
                await gameMessage.edit({ embeds: [endEmbed], components: [disabledJoinRow] }).catch(() => {});
                
                startGameLoop(message.channel, players);
            });
        }
    });

    // ================= دالة العجلة المتحركة (شفافة) =================
    async function createSpinningGIF(playersInfo) {
        const size = 500;
        const encoder = new GIFEncoder(size, size);
        encoder.start();
        encoder.setRepeat(0); 
        encoder.setDelay(80); 
        encoder.setQuality(10);
        encoder.setTransparent(0x000000); // جعل الخلفية السوداء شفافة تماماً

        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const radius = size / 2 - 20;
        const sliceAngle = (2 * Math.PI) / playersInfo.length;
        const fontStr = fs.existsSync('./font.ttf') ? 'bold 16px "CustomFont", sans-serif' : 'bold 16px sans-serif';

        for (let frame = 0; frame < 12; frame++) {
            ctx.fillStyle = '#000000'; // اللون اللي هيتشال ويبقى شفاف
            ctx.fillRect(0, 0, size, size);

            ctx.save();
            ctx.translate(center, center);
            ctx.rotate((frame * Math.PI) / 6); 
            ctx.translate(-center, -center);

            for (let i = 0; i < playersInfo.length; i++) {
                const startAngle = i * sliceAngle;
                const endAngle = startAngle + sliceAngle;
                ctx.fillStyle = i % 2 === 0 ? '#8b0000' : '#232428';
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

            ctx.beginPath(); ctx.arc(center, center, 45, 0, Math.PI * 2);
            ctx.fillStyle = '#111214'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
            ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('SPIN', center, center + 6);

            ctx.fillStyle = '#ffffff'; ctx.beginPath();
            ctx.moveTo(size - 15, center - 10); ctx.lineTo(size, center); ctx.lineTo(size - 15, center + 10); ctx.closePath(); ctx.fill();

            encoder.addFrame(ctx);
        }
        encoder.finish();
        return encoder.out.getData();
    }

    // ================= دالة الصورة الثابتة =================
    async function generateStaticImage(playersInfo, targetId, guild) {
        const size = 500;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const radius = size / 2 - 20;
        const sliceAngle = (2 * Math.PI) / playersInfo.length;
        const fontStr = fs.existsSync('./font.ttf') ? 'bold 16px "CustomFont", sans-serif' : 'bold 16px sans-serif';

        const targetIndex = playersInfo.findIndex(p => p.id === targetId);
        const offsetAngle = -(targetIndex * sliceAngle + sliceAngle / 2); 

        // خلفية شفافة
        ctx.clearRect(0, 0, size, size);

        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(offsetAngle); 
        ctx.translate(-center, -center);

        for (let i = 0; i < playersInfo.length; i++) {
            const startAngle = i * sliceAngle;
            const endAngle = startAngle + sliceAngle;
            ctx.fillStyle = i % 2 === 0 ? '#8b0000' : '#232428';
            ctx.beginPath(); ctx.moveTo(center, center);
            ctx.arc(center, center, radius, startAngle, endAngle); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();

            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff'; ctx.font = fontStr; 
            ctx.fillText(`${playersInfo[i].globalIdx}- ${playersInfo[i].name.substring(0, 12)}`, radius - 20, 5);
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
                ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
                avatarDrawn = true;
            } catch(e) {}
        }

        if (!avatarDrawn) {
            ctx.beginPath(); ctx.arc(center, center, 45, 0, Math.PI * 2);
            ctx.fillStyle = '#111214'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        }

        ctx.fillStyle = '#ffffff'; ctx.beginPath();
        ctx.moveTo(size - 15, center - 10); ctx.lineTo(size, center); ctx.lineTo(size - 15, center + 10); ctx.closePath(); ctx.fill();

        return canvas.toBuffer();
    }

    // ================= بناء الأزرار وضبط حد الاستخدام مرة واحدة =================
    function getTurnComponents(playersInfo, targetPlayers, page, turnPlayerId, gameLimits) {
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
            currentRow.addComponents(new ButtonBuilder().setCustomId(`kick_${id}_${page}`).setLabel(`${globalIdx}- ${name}`).setStyle(ButtonStyle.Secondary));
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
        const limits = gameLimits[turnPlayerId] || { nuke: false, double: false, revive: false };

        const canDouble = (userDb.inventory['double_kick'] || 0) > 0 && !limits.double;
        const canNuke = (userDb.inventory['nuke'] || 0) > 0 && !limits.nuke;
        const canReviveFriend = (userDb.inventory['revive_friend'] || 0) > 0 && !limits.revive;

        const itemsRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('use_double').setLabel('طرد مرتين').setStyle(ButtonStyle.Secondary).setDisabled(!canDouble),
            new ButtonBuilder().setCustomId('use_nuke').setLabel('نووي ☢️').setStyle(ButtonStyle.Danger).setDisabled(!canNuke),
            new ButtonBuilder().setCustomId('use_revive_friend').setLabel('إنعاش صديق 🤝').setStyle(ButtonStyle.Success).setDisabled(!canReviveFriend)
        );
        rows.push(itemsRow);
        
        return rows;
    }

    // ================= اللعبة الأساسية =================
    async function startGameLoop(channel, players) {
        let alivePlayers = [...players];
        let deadPlayers = [];
        let db = loadDB();
        let gameLimits = {}; // تتبع استخدام الأدوات في هذا الجيم فقط (مرة واحدة للكل)

        players.forEach(p => {
            gameLimits[p] = { nuke: false, double: false, revive: false, freeze: false };
        });

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
                    .setColor('#FFD700')
                    .setTitle('👑 الفائز بالمعركة!')
                    .setDescription(`🎉 تم تتويج <@${winnerId}> بطلاً للروليت!\nتم إضافة **${REWARD_POINTS}** نقطة لثروته!`)
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

            // 🌟 إرسال الـ GIF الدوار 🌟
            const gifBuffer = await createSpinningGIF(ObjectPlayersInfo);
            const spinMsg = await channel.send({
                content: `🎰 **العجلة تدور لاختيار الضحية...**`,
                files: [new AttachmentBuilder(gifBuffer, { name: 'spin.gif' })]
            });
            
            await new Promise(r => setTimeout(r, 3500));
            await spinMsg.delete().catch(()=>{});

            // 🌟 إرسال الصورة الثابتة بالأفتار 🌟
            const staticBuffer = await generateStaticImage(ObjectPlayersInfo, turnPlayerId, channel.guild);
            const attachment = new AttachmentBuilder(staticBuffer, { name: 'roulette.png' });

            const targetPlayers = alivePlayers.filter(id => id !== turnPlayerId);
            let currentPage = 0;
            let currentRows = getTurnComponents(ObjectPlayersInfo, targetPlayers, currentPage, turnPlayerId, gameLimits);

            // زر التجميد للأشخاص الآخرين
            const freezeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('use_freeze').setLabel('تجميد اللاعب 🧊').setStyle(ButtonStyle.Primary)
            );

            let turnMsg = await channel.send({
                content: `🔔 <@${turnPlayerId}> **لديك 20 ثانية لتدمير خصمك!**`,
                files: [attachment],
                components: [...currentRows, freezeRow]
            });

            const collector = turnMsg.createMessageComponentCollector({ time: TURN_TIME });

            let kickedIds = [];
            let actionTaken = false;
            let isRandomKick = false;
            let nukeUsed = false;
            let doubleKickActive = false;
            let isFrozen = false;

            await new Promise((resolve) => {
                collector.on('collect', async interaction => {
                    db = loadDB();

                    // ================= نظام التجميد للخصوم =================
                    if (interaction.customId === 'use_freeze') {
                        if (interaction.user.id === turnPlayerId) return interaction.reply({ content: '❌ لا يمكنك تجميد نفسك!', ephemeral: true });
                        if (!alivePlayers.includes(interaction.user.id)) return interaction.reply({ content: '❌ يجب أن تكون حياً لاستخدام هذه الأداة!', ephemeral: true });
                        
                        let attackerDb = db[interaction.user.id] || { inventory: {} };
                        if ((attackerDb.inventory['freeze'] || 0) < 1) return interaction.reply({ content: '❌ لا تمتلك أداة التجميد!', ephemeral: true });
                        if (gameLimits[interaction.user.id].freeze) return interaction.reply({ content: '❌ استخدمت التجميد مسبقاً في هذه اللعبة!', ephemeral: true });

                        attackerDb.inventory['freeze'] -= 1;
                        gameLimits[interaction.user.id].freeze = true;
                        db[interaction.user.id] = attackerDb; saveDB(db);

                        isFrozen = true;
                        await interaction.reply({ content: `🧊 تم تجميد <@${turnPlayerId}> لمدة 15 ثانية! أمامه 5 ثواني فقط للنجاة!` });
                        
                        // إخفاء زرايره
                        const disabledAll = currentRows.map(row => {
                            const newRow = new ActionRowBuilder();
                            row.components.forEach(btn => newRow.addComponents(ButtonBuilder.from(btn).setDisabled(true)));
                            return newRow;
                        });
                        await turnMsg.edit({ components: disabledAll }).catch(()=>{});

                        setTimeout(async () => {
                            if (!actionTaken && activeGames.has(channel.id)) {
                                isFrozen = false;
                                await channel.send(`🔥 فُك التجميد عن <@${turnPlayerId}>! أسرع!!`);
                                await turnMsg.edit({ components: currentRows }).catch(()=>{});
                            }
                        }, 15000);
                        return;
                    }

                    // حماية الزراير من اللاعب المجمد
                    if (interaction.user.id === turnPlayerId && isFrozen) {
                        return interaction.reply({ content: '🧊 أنت مجمد! انتظر حتى يفك التجميد.', ephemeral: true });
                    }

                    // التحقق من صاحب الدور
                    if (interaction.user.id !== turnPlayerId) {
                        return interaction.reply({ content: '❌ ليس دورك!', ephemeral: true });
                    }

                    let uDb = db[turnPlayerId] || { inventory: {} };

                    if (interaction.customId === 'use_nuke') {
                        uDb.inventory['nuke'] -= 1; gameLimits[turnPlayerId].nuke = true; db[turnPlayerId] = uDb; saveDB(db);
                        kickedIds = [...targetPlayers]; 
                        nukeUsed = true; actionTaken = true;
                        await interaction.reply({ content: '☢️ تم إطلاق النووي بنجاح!', ephemeral: true });
                        collector.stop(); return;
                    }
                    if (interaction.customId === 'use_double') {
                        uDb.inventory['double_kick'] -= 1; gameLimits[turnPlayerId].double = true; db[turnPlayerId] = uDb; saveDB(db);
                        doubleKickActive = true;
                        await interaction.reply({ content: '🔪 تم تفعيل السكين المزدوج! اختر ضحيتين.', ephemeral: true });
                        currentRows = getTurnComponents(ObjectPlayersInfo, targetPlayers, currentPage, turnPlayerId, gameLimits);
                        await turnMsg.edit({ components: [...currentRows, freezeRow] }).catch(()=>{});
                        return;
                    }
                    if (interaction.customId === 'use_revive_friend') {
                        if (deadPlayers.length === 0) return interaction.reply({ content: '❌ لا يوجد أصدقاء مطرودين.', ephemeral: true });
                        const deadOptions = deadPlayers.slice(0, 25).map(id => {
                            const m = channel.guild.members.cache.get(id);
                            return { label: m ? m.displayName.substring(0,25) : id, value: id };
                        });
                        const selectMenu = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder().setCustomId('revive_select').setPlaceholder('اختر صديق لإنعاشه').addOptions(deadOptions)
                        );
                        await interaction.reply({ content: 'اختر الروح التي تريد إعادتها:', components: [selectMenu], ephemeral: true });
                        return;
                    }
                    if (interaction.customId === 'revive_select') {
                        const revivedId = interaction.values[0];
                        uDb.inventory['revive_friend'] -= 1; gameLimits[turnPlayerId].revive = true; db[turnPlayerId] = uDb; saveDB(db);
                        alivePlayers.push(revivedId); 
                        deadPlayers = deadPlayers.filter(id => id !== revivedId);
                        await interaction.update({ content: `✨ عادت روح <@${revivedId}> لساحة المعركة!`, components: [] });
                        currentRows = getTurnComponents(ObjectPlayersInfo, targetPlayers, currentPage, turnPlayerId, gameLimits);
                        await turnMsg.edit({ components: [...currentRows, freezeRow] }).catch(()=>{});
                        return;
                    }

                    if (interaction.customId.startsWith('prev_')) {
                        currentPage--;
                        currentRows = getTurnComponents(ObjectPlayersInfo, targetPlayers, currentPage, turnPlayerId, gameLimits);
                        await interaction.update({ components: [...currentRows, freezeRow] });
                    } else if (interaction.customId.startsWith('next_')) {
                        currentPage++;
                        currentRows = getTurnComponents(ObjectPlayersInfo, targetPlayers, currentPage, turnPlayerId, gameLimits);
                        await interaction.update({ components: [...currentRows, freezeRow] });
                    } else if (interaction.customId === 'withdraw') {
                        kickedIds.push(turnPlayerId);
                        actionTaken = true;
                        await interaction.reply({ content: `قررت الهروب.`, ephemeral: true });
                        collector.stop();
                    } else if (interaction.customId === 'random_kick') {
                        kickedIds.push(targetPlayers[Math.floor(Math.random() * targetPlayers.length)]);
                        actionTaken = true; isRandomKick = true;
                        await interaction.reply({ content: `تم اختيار ضحية عشوائية.`, ephemeral: true });
                        collector.stop();
                    } else if (interaction.customId.startsWith('kick_')) {
                        const kid = interaction.customId.split('_')[1];
                        if (!kickedIds.includes(kid)) kickedIds.push(kid);
                        
                        if (doubleKickActive && kickedIds.length < 2) {
                            await interaction.reply({ content: `✅ سقط الأول، اختر الضحية الثانية!`, ephemeral: true });
                        } else {
                            actionTaken = true;
                            await interaction.reply({ content: `تم تحديد الهدف. 🎯`, ephemeral: true });
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

            // ================= رسائل الطرد الفخمة =================
            if (nukeUsed) {
                await channel.send(`☢️ **إبادة جماعية!** قام <@${turnPlayerId}> بضغط الزر الأحمر وتدمير الجميع بلا رحمة!`);
            } else if (!actionTaken) {
                kickedIds = [turnPlayerId];
                await channel.send(`⏰ **نفد الوقت!** تم طرد <@${turnPlayerId}> بسبب بطء رد فعله.`);
            } else if (kickedIds.includes(turnPlayerId)) {
                await channel.send(`🏃 **هروب تكتيكي!** رفع <@${turnPlayerId}> الراية البيضاء وانسحب من الساحة.`);
            } else if (isRandomKick) {
                const mentions = kickedIds.map(id => `<@${id}>`).join(' و ');
                await channel.send(`🎲 **حظ عاثر!** اختارت عجلة الحظ طرد ${mentions} **عشوائياً** بأمر من <@${turnPlayerId}>!`);
            } else {
                const mentions = kickedIds.map(id => `<@${id}>`).join(' و ');
                await channel.send(`💀 **طاح الفأس في الرأس!** قام <@${turnPlayerId}> بركل ${mentions} خارج الحلبة!`);
            }

            // ================= نظام الإنعاش الذاتي الجديد (بالزر) =================
            for (const kid of kickedIds) {
                db = loadDB();
                const kickedUserDb = db[kid] || { points: 0, inventory: {} };

                if (kickedUserDb.inventory['self_revive'] > 0 && kid !== turnPlayerId) {
                    const reviveRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId(`self_revive_${kid}`).setLabel('استخدم الإنعاش الذاتي الآن! ❤️').setStyle(ButtonStyle.Success)
                    );
                    const promptMsg = await channel.send({ content: `⚠️ <@${kid}> لقد تم طردك! لديك إنعاش ذاتي، أمامك 10 ثواني لاستخدامه!`, components: [reviveRow] });
                    
                    try {
                        const filter = i => i.customId === `self_revive_${kid}` && i.user.id === kid;
                        await promptMsg.awaitMessageComponent({ filter, time: 10000 });
                        
                        kickedUserDb.inventory['self_revive'] -= 1;
                        db[kid] = kickedUserDb; saveDB(db);
                        await promptMsg.delete().catch(()=>{});
                        await channel.send(`🔥 **عودة من الموت!** <@${kid}> استخدم الإنعاش الذاتي ورجع لساحة المعركة!`);
                    } catch (err) {
                        await promptMsg.delete().catch(()=>{});
                        alivePlayers = alivePlayers.filter(id => id !== kid);
                        deadPlayers.push(kid);
                        kickedUserDb.points += LOSE_POINTS;
                        db[kid] = kickedUserDb; saveDB(db);
                    }
                } else {
                    alivePlayers = alivePlayers.filter(id => id !== kid);
                    deadPlayers.push(kid);
                    kickedUserDb.points += LOSE_POINTS;
                    db[kid] = kickedUserDb; saveDB(db);
                }
            }

            if (alivePlayers.length > 1) {
                await channel.send(`⏳ **سوف تبدأ الجولة القادمة بعد قليل... استعدوا!**`);
                await new Promise(r => setTimeout(r, DELAY_TIME));
            }
        }
        
        if (alivePlayers.length === 1 && activeGames.has(channel.id)) {
            const winnerId = alivePlayers[0];
            db = loadDB();
            const winnerDb = db[winnerId] || { points: 0, inventory: {} };
            winnerDb.points += REWARD_POINTS;
            db[winnerId] = winnerDb;
            saveDB(db);

            const winEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('👑 الفائز بالروليت!')
                .setDescription(`🎉 تم تتويج <@${winnerId}> كبطل وحيد للروليت!\nتم إضافة **${REWARD_POINTS}** نقطة لثروته!`);
            await channel.send({ content: `<@${winnerId}>`, embeds: [winEmbed] });
        }
        activeGames.delete(channel.id);
    }
};
