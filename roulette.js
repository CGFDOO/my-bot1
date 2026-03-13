const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

// ================= إعدادات قاعدة البيانات =================
const dbPath = './roulette_db.json';
if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));
const loadDB = () => JSON.parse(fs.readFileSync(dbPath));
const saveDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));

// ================= إعدادات الرومات والرتب (ركز هنا يا إمبراطور) =================
const ALLOWED_CHANNELS = ['1453939768885903462']; // أيدي الروم المسموح للروليت
const ROLET_ROLES = ['1453946893053726830']; // رتبة تشغيل الروليت في الروم المحدد بس
const ADMIN_ROLES = ['1453946893053726830']; // الرتبة اللي تقدر تشغل الروليت في أي مكان
const POINTS_ROLES = ['1453904793746804766']; // الرتبة اللي تقدر (تعطي/تسحب) نقاط

// ================= إعدادات الأسعار والنقاط =================
const REWARD_POINTS = 10; // نقاط الفائز
const LOSE_POINTS = 3;    // نقاط الخاسر
const TURN_TIME = 20000;  // وقت اختيار اللاعب (20 ثانية)

const STORE_PRICES = {
    double_kick: 350,
    revive_friend: 250,
    self_revive: 300,
    nuke: 7500
};

const activeGames = new Map();

module.exports = (client) => {
    // ================= معالجة أزرار التفاعل (المتجر والصفحات) =================
    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton()) return;
        
        // 🛒 نظام المتجر (محمي 100%)
        if (interaction.customId.startsWith('buy_')) {
            const itemMap = {
                'buy_double': { name: 'طرد مرتين', key: 'double_kick', price: STORE_PRICES.double_kick },
                'buy_friend': { name: 'إنعاش صديق', key: 'revive_friend', price: STORE_PRICES.revive_friend },
                'buy_revive': { name: 'إنعاش ذاتي', key: 'self_revive', price: STORE_PRICES.self_revive },
                'buy_nuke': { name: 'قنبلة نووية', key: 'nuke', price: STORE_PRICES.nuke }
            };

            const item = itemMap[interaction.customId];
            if (!item) return;

            const db = loadDB(); // بنسحب رصيده لايف من الداتا بيز
            const user = db[interaction.user.id] || { points: 0, inventory: {} };

            // ⚠️ مستحيل يشتري لو فلوسه أقل من السعر
            if (user.points < item.price) {
                return interaction.reply({ content: `❌ نقاطك غير كافية! تحتاج **${item.price}** نقطة، وأنت تمتلك **${user.points}** فقط.`, ephemeral: true });
            }

            // لو معاه فلوس، بنخصم ونديله الأداة
            user.points -= item.price;
            user.inventory[item.key] = (user.inventory[item.key] || 0) + 1;
            db[interaction.user.id] = user;
            saveDB(db); // بنحفظ الداتا بيز فوراً

            const updatedShopRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('buy_double').setLabel(`طرد مرتين (${STORE_PRICES.double_kick})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_friend').setLabel(`إنعاش صديق (${STORE_PRICES.revive_friend})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_revive').setLabel(`إنعاش ذاتي (${STORE_PRICES.self_revive})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('buy_nuke').setLabel(`قنبلة نووية (${STORE_PRICES.nuke})`).setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('show_points').setLabel(`💰 نقاطك: ${user.points}`).setStyle(ButtonStyle.Success).setDisabled(true)
            );

            await interaction.update({ components: [updatedShopRow] });
            await interaction.followUp({ content: `✅ مبروك! تم شراء **${item.name}** بنجاح. رصيدك المتبقي: ${user.points}`, ephemeral: true });
        }
    });

    // ================= الأوامر الأساسية =================
    client.on('messageCreate', async message => {
        if (message.author.bot) return;

        const args = message.content.trim().split(/ +/);
        const command = args[0].toLowerCase();

        const hasAdminRole = message.member.roles.cache.some(r => ADMIN_ROLES.includes(r.id));
        const hasRoletRole = message.member.roles.cache.some(r => ROLET_ROLES.includes(r.id));
        const hasPointsRole = message.member.roles.cache.some(r => POINTS_ROLES.includes(r.id));

        // 🛑 أمر توقيف الروليت
        if (command === '!توقيف') {
            if (!hasAdminRole && !hasRoletRole) return message.reply('❌ لا تملك صلاحية إيقاف اللعبة.');
            if (!activeGames.has(message.channel.id)) return message.reply('⚠️ لا توجد لعبة نشطة لإيقافها.');
            
            const gameData = activeGames.get(message.channel.id);
            if (gameData.collector) gameData.collector.stop('force_stop');
            activeGames.delete(message.channel.id);
            return message.reply('🛑 تم إيقاف لعبة الروليت بقوة.');
        }

        // 💰 أمر إعطاء النقاط
        if (command === '!point' || command === '!points') {
            if (!hasPointsRole) return message.reply('❌ هذا الأمر لمسؤولين النقاط فقط.');
            const targetUser = message.mentions.users.first();
            const amount = parseInt(args[2]);

            if (!targetUser || isNaN(amount)) return message.reply('❗ الاستخدام الصحيح: `!point @user 100`');

            const db = loadDB();
            const userDb = db[targetUser.id] || { points: 0, inventory: {} };
            userDb.points += amount;
            db[targetUser.id] = userDb;
            saveDB(db);

            return message.reply(`✅ تم إضافة **${amount}** نقطة إلى حساب <@${targetUser.id}>. رصيده الآن: **${userDb.points}** نقطة.`);
        }

        // 💸 أمر سحب النقاط
        if (command === '!removepoint' || command === '!removepoints') {
            if (!hasPointsRole) return message.reply('❌ هذا الأمر لمسؤولين النقاط فقط.');
            const targetUser = message.mentions.users.first();
            const amount = parseInt(args[2]);

            if (!targetUser || isNaN(amount)) return message.reply('❗ الاستخدام الصحيح: `!removepoint @user 100`');

            const db = loadDB();
            const userDb = db[targetUser.id] || { points: 0, inventory: {} };
            
            userDb.points -= amount;
            if (userDb.points < 0) userDb.points = 0; // عشان الرصيد ميبقاش بالسالب
            
            db[targetUser.id] = userDb;
            saveDB(db);

            return message.reply(`📉 تم سحب **${amount}** نقطة من حساب <@${targetUser.id}>. رصيده الآن: **${userDb.points}** نقطة.`);
        }

        // 🎰 أمر تشغيل الروليت
        if (command === '!روليت' || command === '$روليت') {
            const isAllowedChannel = ALLOWED_CHANNELS.includes(message.channel.id);
            
            if (!hasAdminRole) {
                if (!isAllowedChannel) return;
                if (!hasRoletRole) return message.reply('❌ لا تملك الصلاحية لتشغيل اللعبة.');
            }

            if (activeGames.has(message.channel.id)) return message.reply('⚠️ هناك لعبة روليت تعمل حالياً.');

            let players = [];
            const waitTime = 60; // 60 ثانية للتجميع
            const endTime = Math.floor(Date.now() / 1000) + waitTime;
            const embedColor = null; 

            const startEmbed = new EmbedBuilder()
                .setTitle('## روليت')
                .setDescription('**طريقة اللعب**\n1- اختر الرقم الذي سيمثلك في اللعبة\n2- ستبدأ الجولة الأولى وسيتم تدوير العجلة واختيار لاعب عشوائي\n3- إذا كنت اللاعب المختار، فستختار لاعبًا ليتم طرده\n4- يستمر اللعب حتى يتبقى لاعبان فقط')
                .addFields(
                    { name: 'الوقت المتبقي للبدء:', value: `⏳ <t:${endTime}:R>`, inline: false },
                    { name: 'المشاركين:', value: `(0/200)\nلا يوجد مشاركين حتى الآن.`, inline: false }
                )
                .setImage('https://cdn.discordapp.com/attachments/1454420195539025941/1482162249001865328/1773445405834.jpg');

            if (embedColor) startEmbed.setColor(embedColor);

            const joinRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('join_roulette').setLabel('دخول 🎯').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('leave_roulette').setLabel('خروج 🚪').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('open_shop').setLabel('🛒 المتجر').setStyle(ButtonStyle.Primary)
            );

            const gameMessage = await message.channel.send({ embeds: [startEmbed], components: [joinRow] });
            
            const collector = gameMessage.createMessageComponentCollector({ time: waitTime * 1000 });
            activeGames.set(message.channel.id, { collector });

            collector.on('collect', async i => {
                if (i.customId === 'open_shop') {
                    const db = loadDB();
                    const user = db[i.user.id] || { points: 0, inventory: {} };
                    
                    const shopEmbed = new EmbedBuilder()
                        .setTitle('🛒 متجر الروليت')
                        .setDescription('اختر الأداة التي تريد شراءها:')
                        .setImage('https://i.imgur.com/8Qe9dG0.gif'); 

                    const shopRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('buy_double').setLabel(`طرد مرتين (${STORE_PRICES.double_kick})`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_friend').setLabel(`إنعاش صديق (${STORE_PRICES.revive_friend})`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_revive').setLabel(`إنعاش ذاتي (${STORE_PRICES.self_revive})`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('buy_nuke').setLabel(`قنبلة نووية (${STORE_PRICES.nuke})`).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('show_points').setLabel(`💰 نقاطك: ${user.points}`).setStyle(ButtonStyle.Success).setDisabled(true)
                    );
                    return i.reply({ embeds: [shopEmbed], components: [shopRow], ephemeral: true });
                }

                if (i.customId === 'join_roulette') {
                    if (players.includes(i.user.id)) return i.reply({ content: 'أنت مسجل بالفعل!', ephemeral: true });
                    players.push(i.user.id);
                    await i.reply({ content: 'تم تسجيل دخولك.', ephemeral: true });
                } else if (i.customId === 'leave_roulette') {
                    players = players.filter(id => id !== i.user.id);
                    await i.reply({ content: 'تم سحب تسجيلك.', ephemeral: true });
                }

                let mentionsList = players.slice(0, 30).map((p, idx) => `**${idx + 1}-** <@${p}>`).join('\n');
                if (players.length > 30) mentionsList += `\n... و ${players.length - 30} آخرين`;
                if (players.length === 0) mentionsList = 'لا يوجد مشاركين حتى الآن.';

                startEmbed.setFields(
                    { name: 'الوقت المتبقي للبدء:', value: `⏳ <t:${endTime}:R>`, inline: false },
                    { name: `المشاركين (${players.length}/200):`, value: mentionsList, inline: false }
                );
                await gameMessage.edit({ embeds: [startEmbed] });
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'force_stop') return;

                if (players.length < 4) {
                    activeGames.delete(message.channel.id);
                    return message.channel.send('❌ تم إلغاء الروليت لعدم اكتمال العدد (أقل عدد 4 لاعبين).');
                }
                
                const endEmbed = EmbedBuilder.from(startEmbed);
                endEmbed.setFields({ name: 'حالة اللعبة:', value: `🚀 بدأت اللعبة بـ **${players.length}** لاعبين!`, inline: false });
                await gameMessage.edit({ embeds: [endEmbed], components: [] });

                startGameLoop(message.channel, players);
            });
        }
    });

    async function generateRouletteImage(playersInfo, centerAvatarUrl) {
        const size = 500;
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
            ctx.font = 'bold 14px Arial';
            const name = playersInfo[i].name.substring(0, 10);
            ctx.fillText(name, radius - 20, 5);
            ctx.restore();
        }

        if (centerAvatarUrl) {
            try {
                const img = await loadImage(centerAvatarUrl);
                ctx.save();
                ctx.beginPath();
                ctx.arc(center, center, 50, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(img, center - 50, center - 50, 100, 100);
                ctx.restore();
                ctx.beginPath();
                ctx.arc(center, center, 50, 0, Math.PI * 2);
                ctx.lineWidth = 3;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
            } catch(e) {}
        }
        return canvas.toBuffer();
    }

    function getPaginationComponents(targetPlayers, page, channel) {
        let rows = [];
        let currentRow = new ActionRowBuilder();
        const start = page * 20;
        const end = start + 20;
        const currentTargets = targetPlayers.slice(start, end);
        const totalPages = Math.ceil(targetPlayers.length / 20);

        currentTargets.forEach((id, idx) => {
            if (currentRow.components.length === 5) {
                rows.push(currentRow);
                currentRow = new ActionRowBuilder();
            }
            const globalIdx = start + idx + 1;
            const member = channel.guild.members.cache.get(id);
            const name = member ? member.displayName.substring(0, 10) : 'User';
            currentRow.addComponents(new ButtonBuilder().setCustomId(`kick_${id}`).setLabel(`${globalIdx}- ${name}`).setStyle(ButtonStyle.Secondary));
        });
        if (currentRow.components.length > 0) rows.push(currentRow);

        const controlRow = new ActionRowBuilder();
        if (totalPages > 1) {
            controlRow.addComponents(new ButtonBuilder().setCustomId(`prev_${page}`).setLabel('⬅️ السابق').setStyle(ButtonStyle.Primary).setDisabled(page === 0));
        }
        controlRow.addComponents(new ButtonBuilder().setCustomId('withdraw').setLabel('🚪 انسحاب').setStyle(ButtonStyle.Danger));
        if (totalPages > 1) {
            controlRow.addComponents(new ButtonBuilder().setCustomId('page_info').setLabel(`${page + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true));
            controlRow.addComponents(new ButtonBuilder().setCustomId(`next_${page}`).setLabel('التالي ➡️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1));
        }
        rows.push(controlRow);
        
        return rows;
    }

    async function startGameLoop(channel, players) {
        let alivePlayers = [...players];
        let db = loadDB();

        while (alivePlayers.length > 1) {
            const turnIndex = Math.floor(Math.random() * alivePlayers.length);
            const turnPlayerId = alivePlayers[turnIndex];

            const spinMsg = await channel.send({ content: `🎰 يتم اختيار اللاعب...`, files: ['https://i.imgur.com/8Qe9dG0.gif'] });
            await new Promise(r => setTimeout(r, 3000));
            await spinMsg.delete().catch(() => {});

            const playersInfo = alivePlayers.map(id => {
                const member = channel.guild.members.cache.get(id);
                return { id, name: member ? member.displayName : 'User' };
            });
            const turnMember = channel.guild.members.cache.get(turnPlayerId);
            const avatarUrl = turnMember ? turnMember.user.displayAvatarURL({ extension: 'png', size: 128 }) : null;
            
            const buffer = await generateRouletteImage(playersInfo, avatarUrl);
            const attachment = new AttachmentBuilder(buffer, { name: 'roulette.png' });

            const targetPlayers = alivePlayers.filter(id => id !== turnPlayerId);
            let currentPage = 0;

            const turnMsg = await channel.send({
                content: `🔔 دورك يا <@${turnPlayerId}>! أمامك **20 ثانية** لاختيار لاعب لطرده.`,
                files: [attachment],
                components: getPaginationComponents(targetPlayers, currentPage, channel)
            });

            const filter = i => i.user.id === turnPlayerId;
            const collector = turnMsg.createMessageComponentCollector({ filter, time: TURN_TIME });

            let kickedId = null;
            let actionTaken = false;

            await new Promise((resolve) => {
                collector.on('collect', async interaction => {
                    if (interaction.customId.startsWith('prev_')) {
                        currentPage--;
                        await interaction.update({ components: getPaginationComponents(targetPlayers, currentPage, channel) });
                    } else if (interaction.customId.startsWith('next_')) {
                        currentPage++;
                        await interaction.update({ components: getPaginationComponents(targetPlayers, currentPage, channel) });
                    } else if (interaction.customId === 'withdraw') {
                        kickedId = turnPlayerId;
                        actionTaken = true;
                        await interaction.reply({ content: '🚪 لقد انسحبت من اللعبة.' });
                        collector.stop();
                    } else if (interaction.customId.startsWith('kick_')) {
                        kickedId = interaction.customId.split('_')[1];
                        actionTaken = true;
                        await interaction.reply({ content: `✅ تم تأكيد الطرد.` });
                        collector.stop();
                    }
                });

                collector.on('end', () => resolve());
            });

            await turnMsg.delete().catch(() => {});

            if (!actionTaken) {
                kickedId = turnPlayerId;
                await channel.send(`⏱️ انتهى الوقت! تم طرد <@${turnPlayerId}> لعدم الاختيار.`);
            }

            db = loadDB();
            const kickedUserDb = db[kickedId] || { points: 0, inventory: {} };
            
            if (kickedUserDb.inventory['self_revive'] > 0 && actionTaken && kickedId !== turnPlayerId) {
                kickedUserDb.inventory['self_revive'] -= 1;
                db[kickedId] = kickedUserDb;
                saveDB(db);
                await channel.send(`❤️ **إنعاش!** اللاعب <@${kickedId}> انطرد لكن استخدم الإنعاش الذاتي ورجع للعبة!`);
            } else {
                alivePlayers = alivePlayers.filter(id => id !== kickedId);
                if (actionTaken && kickedId !== turnPlayerId) {
                    await channel.send(`💀 اللاعب <@${turnPlayerId}> قام بطرد <@${kickedId}>! المتبقي: ${alivePlayers.length}`);
                }
                kickedUserDb.points += LOSE_POINTS;
                db[kickedId] = kickedUserDb;
                saveDB(db);
            }
        }

        const winnerId = alivePlayers[0];
        if (winnerId) {
            db = loadDB();
            const winnerDb = db[winnerId] || { points: 0, inventory: {} };
            winnerDb.points += REWARD_POINTS;
            db[winnerId] = winnerDb;
            saveDB(db);

            const winnerMember = channel.guild.members.cache.get(winnerId);
            const embedColor = null;

            const winEmbed = new EmbedBuilder()
                .setTitle('🏆 الفائز في الروليت!')
                .setDescription(`🎉 تهانينا <@${winnerId}> لفوزك بالروليت!\n💰 تم إضافة **${REWARD_POINTS}** نقطة لحسابك.`)
                .setThumbnail(winnerMember ? winnerMember.user.displayAvatarURL({ dynamic: true }) : null);
            
            if (embedColor) winEmbed.setColor(embedColor);

            await channel.send({ content: `<@${winnerId}>`, embeds: [winEmbed] });
        }
        activeGames.delete(channel.id);
    }
};
