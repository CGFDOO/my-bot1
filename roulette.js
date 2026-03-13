const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
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

module.exports = (client) => {
    // ================= معالجة أزرار الشراء العالمية =================
    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton()) return;
        
        // لو داس على زرار من زراير الشراء في المتجر
        if (interaction.customId.startsWith('buy_')) {
            const itemMap = {
                'buy_double': { name: 'طرد مرتين', key: 'double_kick', price: 350 },
                'buy_friend': { name: 'إنعاش صديق', key: 'revive_friend', price: 250 },
                'buy_revive': { name: 'إنعاش ذاتي', key: 'self_revive', price: 300 },
                'buy_nuke': { name: 'قنبلة نووية', key: 'nuke', price: 7500 }
            };

            const item = itemMap[interaction.customId];
            if (!item) return;

            const db = loadDB();
            const user = db[interaction.user.id] || { points: 0, inventory: {} };

            // لو معهوش فلوس
            if (user.points < item.price) {
                return interaction.reply({ content: `❌ نقاطك غير كافية! تحتاج **${item.price}** نقطة لشراء ${item.name}.`, ephemeral: true });
            }

            // خصم النقاط وإضافة الأداة
            user.points -= item.price;
            user.inventory[item.key] = (user.inventory[item.key] || 0) + 1;
            db[interaction.user.id] = user;
            saveDB(db);

            // تحديث رسالة المتجر عشان زرار النقاط يتغير بالرقم الجديد
            const updatedShopRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('buy_double').setLabel('طرد مرتين (350)').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_friend').setLabel('إنعاش صديق (250)').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_revive').setLabel('إنعاش ذاتي (300)').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_nuke').setLabel('قنبلة نووية (7500)').setStyle(ButtonStyle.Secondary),
                // زرار النقاط الجديد
                new ButtonBuilder().setCustomId('show_points').setLabel(`💰 نقاطك: ${user.points}`).setStyle(ButtonStyle.Success).setDisabled(true)
            );

            await interaction.update({ components: [updatedShopRow] });
            await interaction.followUp({ content: `✅ مبروك! تم شراء **${item.name}** بنجاح. رصيدك الآن: ${user.points}`, ephemeral: true });
        }
    });

    client.on('messageCreate', async message => {
        if (message.author.bot) return;

        const args = message.content.trim().split(/ +/);
        const command = args[0].toLowerCase();

        // ================= بدء اللعبة =================
        if (command === '!روليت' || command === '!roulette') {
            if (!ALLOWED_CHANNELS.includes(message.channel.id)) return;
            const hasRole = message.member.roles.cache.some(r => ALLOWED_ROLES.includes(r.id));
            if (!hasRole) return message.reply('❌ لا تملك الصلاحية لتشغيل هذه اللعبة.');
            
            let players = [];
            
            const joinRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('join_roulette').setLabel('دخول 🎯').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('leave_roulette').setLabel('خروج 🚪').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('open_shop').setLabel('🛒 المتجر').setStyle(ButtonStyle.Primary) // زرار المتجر الجديد
            );

            const startEmbed = new EmbedBuilder()
                .setTitle('🎰 روليت - تسجيل الدخول')
                .setColor('#ff0000')
                .setDescription('ستبدأ اللعبة قريباً! اضغط دخول للمشاركة أو افتح المتجر لشراء الأدوات.')
                .addFields({ name: 'المشاركين', value: `(0/200)` });

            const gameMessage = await message.channel.send({ embeds: [startEmbed], components: [joinRow] });
            const collector = gameMessage.createMessageComponentCollector({ time: 60000 }); // دقيقة للتجميع

            collector.on('collect', async i => {
                if (i.customId === 'join_roulette') {
                    if (players.includes(i.user.id)) return i.reply({ content: 'إنت مسجل بالفعل!', ephemeral: true });
                    players.push(i.user.id);
                    await i.reply({ content: 'تم تسجيل دخولك.', ephemeral: true });
                } 
                else if (i.customId === 'leave_roulette') {
                    players = players.filter(id => id !== i.user.id);
                    await i.reply({ content: 'تم سحب تسجيلك.', ephemeral: true });
                }
                // ================= فتح المتجر المخفي =================
                else if (i.customId === 'open_shop') {
                    const db = loadDB();
                    const user = db[i.user.id] || { points: 0, inventory: {} };

                    const shopEmbed = new EmbedBuilder()
                        .setTitle('🛒 متجر الروليت')
                        .setColor('#2b2d31')
                        .setDescription('اختر الأداة التي تريد شراءها من الأزرار بالأسفل:')
                        // 🔴 حط لينك الصورة بتاعتك للمتجر هنا
                        .setImage('https://i.imgur.com/YOUR_SHOP_IMAGE_HERE.png'); 

                    const shopRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('buy_double').setLabel('طرد مرتين (350)').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_friend').setLabel('إنعاش صديق (250)').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_revive').setLabel('إنعاش ذاتي (300)').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_nuke').setLabel('قنبلة نووية (7500)').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('show_points').setLabel(`💰 نقاطك: ${user.points}`).setStyle(ButtonStyle.Success).setDisabled(true) // الزرار المقفول
                    );

                    return i.reply({ embeds: [shopEmbed], components: [shopRow], ephemeral: true });
                }

                if (i.customId !== 'open_shop') {
                    startEmbed.setFields({ name: 'المشاركين', value: `(${players.length}/200)` });
                    await gameMessage.edit({ embeds: [startEmbed] });
                }
            });

            collector.on('end', async () => {
                if (players.length < 2) {
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

        ctx.fillStyle = '#1e1f22';
        ctx.fillRect(0, 0, size, size);

        const sliceAngle = (2 * Math.PI) / playersInfo.length;

        for (let i = 0; i < playersInfo.length; i++) {
            const startAngle = i * sliceAngle;
            const endAngle = startAngle + sliceAngle;

            ctx.fillStyle = i % 2 === 0 ? '#8B0000' : '#2b2d31';
            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();

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

            const playersInfo = alivePlayers.map(id => {
                const member = channel.guild.members.cache.get(id);
                return { id, name: member ? member.displayName : 'Unknown' };
            });

            const turnMember = channel.guild.members.cache.get(turnPlayerId);
            const avatarUrl = turnMember ? turnMember.user.displayAvatarURL({ extension: 'png', size: 128 }) : null;

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

        // إعلان الفائز
        const winnerId = alivePlayers[0];
        if (winnerId) {
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
        }
    }
};
