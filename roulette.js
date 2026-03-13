const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

// داتا بيز النقاط
const dbPath = './roulette_db.json';
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));

const loadDB = () => JSON.parse(fs.readFileSync(dbPath));
const saveDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));

// ================= الإعدادات =================
const ALLOWED_CHANNELS = ['1453939768885903462']; // حط أيديهات الرومات
const ALLOWED_ROLES = ['1453946893053726830']; // الرتب اللي تقدر تشغل الأمر

const STORE_PRICES = {
    double_kick: 350,
    revive_friend: 250,
    self_revive: 300,
    nuke: 7500
};

const activeGames = new Set();

module.exports = (client) => {
    client.on('messageCreate', async message => {
        if (message.author.bot) return;

        const args = message.content.trim().split(/ +/);
        const command = args[0].toLowerCase();

        // 🛒 نظام المتجر والنقاط
        if (command === '!نقاطي' || command === '!متجر') {
            const db = loadDB();
            const user = db[message.author.id] || { points: 0, inventory: {} };
            
            if (command === '!نقاطي') return message.reply(`💰 نقاط الروليت الخاصة بك: **${user.points}** نقطة.`);

            if (command === '!متجر') {
                const shopEmbed = new EmbedBuilder()
                    .setTitle('🛒 متجر الروليت')
                    .setColor('#2b2d31')
                    .setDescription('لشراء أداة اكتب: `!شراء <اسم_الأداة>`\nمثال: `!شراء انعاش`')
                    .addFields(
                        { name: '🔪 طرد مرتين (double)', value: `السعر: ${STORE_PRICES.double_kick} نقطة`, inline: false },
                        { name: '🤝 إنعاش صديق (friend)', value: `السعر: ${STORE_PRICES.revive_friend} نقطة`, inline: false },
                        { name: '❤️ إنعاش ذاتي (revive)', value: `السعر: ${STORE_PRICES.self_revive} نقطة`, inline: false },
                        { name: '☢️ قنبلة نووية (nuke)', value: `السعر: ${STORE_PRICES.nuke} نقطة`, inline: false }
                    );
                return message.reply({ embeds: [shopEmbed] });
            }
        }

        // أوامر الشراء
        if (command === '!شراء') {
            const item = args[1]?.toLowerCase();
            const itemMap = { 'double': 'double_kick', 'friend': 'revive_friend', 'revive': 'self_revive', 'nuke': 'nuke' };
            const db = loadDB();
            const user = db[message.author.id] || { points: 0, inventory: {} };

            if (!item || !itemMap[item]) return message.reply('❗ يرجى كتابة اسم الأداة بشكل صحيح (double, friend, revive, nuke).');
            
            const realItem = itemMap[item];
            const price = STORE_PRICES[realItem];

            if (user.points < price) return message.reply(`❌ نقاطك غير كافية! تحتاج **${price}** نقطة.`);
            
            user.points -= price;
            user.inventory[realItem] = (user.inventory[realItem] || 0) + 1;
            db[message.author.id] = user;
            saveDB(db);

            return message.reply(`✅ تم شراء **${item}** بنجاح!`);
        }

        // ================= بدء اللعبة =================
        if (command === '!روليت' || command === '!roulette') {
            if (!ALLOWED_CHANNELS.includes(message.channel.id)) return;
            const hasRole = message.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
            if (!hasRole) return message.reply('❌ لا تملك الصلاحية لتشغيل هذه اللعبة.');
            if (activeGames.has(message.channel.id)) return message.reply('⚠️ هناك لعبة روليت تعمل حالياً.');
            
            activeGames.add(message.channel.id);
            let players = [];
            
            const joinRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('join_roulette').setLabel('دخول 🎯').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('leave_roulette').setLabel('خروج 🚪').setStyle(ButtonStyle.Danger)
            );

            const startEmbed = new EmbedBuilder()
                .setTitle('🎰 روليت - تسجيل الدخول')
                .setColor('#ff0000')
                .setDescription('ستبدأ اللعبة قريباً! اضغط دخول للمشاركة.')
                .addFields({ name: 'المشاركين', value: `(0/200)` });

            const gameMessage = await message.channel.send({ embeds: [startEmbed], components: [joinRow] });
            const collector = gameMessage.createMessageComponentCollector({ time: 60000 }); // دقيقة للتجميع

            collector.on('collect', async i => {
                if (i.customId === 'join_roulette') {
                    if (players.includes(i.user.id)) return i.reply({ content: 'إنت مسجل بالفعل!', ephemeral: true });
                    players.push(i.user.id);
                    await i.reply({ content: 'تم تسجيل دخولك.', ephemeral: true });
                } else if (i.customId === 'leave_roulette') {
                    players = players.filter(id => id !== i.user.id);
                    await i.reply({ content: 'تم سحب تسجيلك.', ephemeral: true });
                }
                startEmbed.setFields({ name: 'المشاركين', value: `(${players.length}/200)` });
                await gameMessage.edit({ embeds: [startEmbed] });
            });

            collector.on('end', async () => {
                if (players.length < 2) {
                    activeGames.delete(message.channel.id);
                    return message.channel.send('❌ تم إلغاء الروليت لعدم اكتمال العدد.');
                }
                await gameMessage.delete().catch(() => {});
                startGameLoop(message.channel, players);
            });
        }
    });

    // ================= دالة رسم العجلة (الصورة الحقيقية) =================
    async function generateRouletteImage(playersInfo, centerAvatarUrl) {
        const size = 600;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        const center = size / 2;
        const radius = size / 2 - 20;

        // رسم الخلفية
        ctx.fillStyle = '#1e1f22';
        ctx.fillRect(0, 0, size, size);

        const sliceAngle = (2 * Math.PI) / playersInfo.length;

        for (let i = 0; i < playersInfo.length; i++) {
            const startAngle = i * sliceAngle;
            const endAngle = startAngle + sliceAngle;

            // ألوان العجلة (أحمر غامق وأسود)
            ctx.fillStyle = i % 2 === 0 ? '#8B0000' : '#2b2d31';
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();

            // رسم أسماء اللاعبين
            ctx.save();
            ctx.translate(center, center);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            const name = playersInfo[i].name.substring(0, 12);
            ctx.fillText(name, radius - 20, 6);
            ctx.restore();
        }

        // صورة اللاعب اللي عليه الدور في النص
        if (centerAvatarUrl) {
            try {
                const img = await loadImage(centerAvatarUrl);
                ctx.save();
                ctx.beginPath();
                ctx.arc(center, center, 60, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(img, center - 60, center - 60, 120, 120);
                ctx.restore();
                ctx.beginPath();
                ctx.arc(center, center, 60, 0, Math.PI * 2);
                ctx.lineWidth = 4;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
            } catch(e) {}
        }

        // سهم الاختيار
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(size - 20, center - 15);
        ctx.lineTo(size, center);
        ctx.lineTo(size - 20, center + 15);
        ctx.closePath();
        ctx.fill();

        return canvas.toBuffer();
    }

    // ================= دورة اللعب الأساسية =================
    async function startGameLoop(channel, players) {
        let alivePlayers = [...players];
        let db = loadDB();

        while (alivePlayers.length > 1) {
            const turnIndex = Math.floor(Math.random() * alivePlayers.length);
            const turnPlayerId = alivePlayers[turnIndex];

            // جلب أسماء اللاعبين للرسم
            const playersInfo = alivePlayers.map(id => {
                const member = channel.guild.members.cache.get(id);
                return { id, name: member ? member.displayName : 'Unknown' };
            });

            const turnMember = channel.guild.members.cache.get(turnPlayerId);
            const avatarUrl = turnMember ? turnMember.user.displayAvatarURL({ extension: 'png', size: 128 }) : null;

            // رسم الصورة
            const buffer = await generateRouletteImage(playersInfo, avatarUrl);
            const attachment = new AttachmentBuilder(buffer, { name: 'roulette.png' });

            const turnEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setImage('attachment://roulette.png')
                .setDescription(`🎯 دورك يا <@${turnPlayerId}>! لديك 15 ثانية لاختيار لاعب لطرده.`);
            
            const targetPlayers = alivePlayers.filter(id => id !== turnPlayerId).slice(0, 20);
            let rows = [];
            let currentRow = new ActionRowBuilder();

            targetPlayers.forEach(id => {
                if (currentRow.components.length === 5) {
                    rows.push(currentRow);
                    currentRow = new ActionRowBuilder();
                }
                const member = channel.guild.members.cache.get(id);
                const name = member ? member.displayName.substring(0, 10) : 'User';
                currentRow.addComponents(new ButtonBuilder().setCustomId(`kick_${id}`).setLabel(name).setStyle(ButtonStyle.Secondary));
            });
            if (currentRow.components.length > 0) rows.push(currentRow);

            const controlRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('random_kick').setLabel('🎲 طرد عشوائي').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('withdraw').setLabel('🚪 انسحاب').setStyle(ButtonStyle.Danger)
            );
            rows.push(controlRow);

            const turnMsg = await channel.send({ content: `<@${turnPlayerId}>`, embeds: [turnEmbed], files: [attachment], components: rows });

            try {
                const filter = i => i.user.id === turnPlayerId;
                const interaction = await turnMsg.awaitMessageComponent({ filter, time: 15000 });
                
                let kickedId = null;
                if (interaction.customId === 'withdraw') {
                    kickedId = turnPlayerId;
                    await interaction.reply({ content: 'لقد انسحبت من اللعبة.' });
                } else if (interaction.customId === 'random_kick') {
                    kickedId = targetPlayers[Math.floor(Math.random() * targetPlayers.length)];
                    await interaction.reply({ content: `تم اختيار طرد عشوائي!` });
                } else if (interaction.customId.startsWith('kick_')) {
                    kickedId = interaction.customId.split('_')[1];
                    await interaction.reply({ content: `تم الطرد!` });
                }

                await turnMsg.delete().catch(() => {});

                // التحقق من "الإنعاش الذاتي"
                db = loadDB();
                const kickedUserDb = db[kickedId] || { points: 0, inventory: {} };
                
                if (kickedUserDb.inventory['self_revive'] > 0) {
                    kickedUserDb.inventory['self_revive'] -= 1;
                    db[kickedId] = kickedUserDb;
                    saveDB(db);
                    await channel.send(`❤️ **إنعاش!** اللاعب <@${kickedId}> استخدم أداة الإنعاش الذاتي ورجع للعبة!`);
                } else {
                    alivePlayers = alivePlayers.filter(id => id !== kickedId);
                    await channel.send(`💀 تم طرد <@${kickedId}>! المتبقي: ${alivePlayers.length}`);
                    kickedUserDb.points += 3; // خسارة
                    db[kickedId] = kickedUserDb;
                    saveDB(db);
                }
            } catch (error) {
                await turnMsg.delete().catch(() => {});
                alivePlayers = alivePlayers.filter(id => id !== turnPlayerId);
                await channel.send(`⏱️ انتهى الوقت! تم طرد <@${turnPlayerId}>.`);
                db = loadDB();
                const loserDb = db[turnPlayerId] || { points: 0, inventory: {} };
                loserDb.points += 3;
                db[turnPlayerId] = loserDb;
                saveDB(db);
            }
        }

        const winnerId = alivePlayers[0];
        db = loadDB();
        const winnerDb = db[winnerId] || { points: 0, inventory: {} };
        winnerDb.points += 10;
        db[winnerId] = winnerDb;
        saveDB(db);

        const winEmbed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🏆 بطل الروليت!')
            .setDescription(`الفائز هو: <@${winnerId}>\nحصل على **10** نقاط روليت!`);
        
        await channel.send({ embeds: [winEmbed] });
        activeGames.delete(channel.id);
    }
};
