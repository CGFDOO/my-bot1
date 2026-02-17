/**
 * █▀▄▀█ █▄ █ ▄▀▄  [ MNC CONTROL CENTER - STANDALONE ]
 * █ ▀ █ █ ▀█ █ ▄  [ FULL VOICE & CHAT MANAGEMENT ]
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * @features    Lock, Unlock, Mute(One/All), Move, Anti-Crash
 * @fix         Solved "Not in voice channel" error
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, ChannelType } = require('discord.js');
require('dotenv').config();

// 1. إعداد العميل مع الصلاحيات الضرورية (خاصة GuildVoiceStates)
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates, // 👈 ده الحل السحري لمشكلة الميوت!
    ]
});

// =================================================================
// 🛡️ نظام منع الكراش (Anti-Crash System)
// =================================================================
// الأكواد دي بتمنع البوت إنه يفصل لو حصل أي خطأ بسيط
process.on('unhandledRejection', (reason, p) => {
    console.log(' [antiCrash] :: Unhandled Rejection/Catch');
    // console.log(reason, p); // شيلنا اللوج عشان ميزعجكش
});
process.on("uncaughtException", (err, origin) => {
    console.log(' [antiCrash] :: Uncaught Exception/Catch');
    // console.log(err, origin);
});
process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.log(' [antiCrash] :: Uncaught Exception/Catch (MONITOR)');
});

// =================================================================
// 🎮 بداية الأوامر
// =================================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    const command = args[0].toLowerCase();

    // =================================================================
    // 🔒 1. قفل وفتح الشات (TEXT CHANNELS)
    // =================================================================
    if (command === '!قفل' || command === '!lock') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return;
        
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
        
        const embed = new EmbedBuilder().setColor('#FF0000').setTitle('🔒 تم إغلاق الشات أمنياً')
            .setDescription(`بواسطة: ${message.author}`).setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    if (command === '!فتح' || command === '!unlock') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return;
        
        await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
        
        const embed = new EmbedBuilder().setColor('#00FF00').setTitle('🔓 تم فتح الشات')
            .setDescription(`بواسطة: ${message.author}`).setTimestamp();
        return message.channel.send({ embeds: [embed] });
    }

    // =================================================================
    // 🔇 2. التحكم الصوتي (VOICE CONTROL)
    // =================================================================
    
    // --- كتم عضو محدد (!كتم @user) ---
    if (command === '!كتم' || command === '!mute') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MuteMembers)) return message.reply('❌ صلاحياتك غير كافية.');
        
        const target = message.mentions.members.first();
        if (!target) return message.reply('⚠️ **منشن العضو!** مثال: `!mute @User`');
        if (!target.voice.channel) return message.reply('⚠️ العضو ليس في روم صوتي.');

        await target.voice.setMute(true);
        return message.reply(`✅ **تم كتم ${target.user.username} بنجاح.**`);
    }

    // --- فك كتم عضو محدد (!فك-كتم @user) ---
    if (command === '!فك-كتم' || command === '!unmute') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.MuteMembers)) return;
        
        const target = message.mentions.members.first();
        if (!target) return message.reply('⚠️ **منشن العضو!**');
        if (!target.voice.channel) return message.reply('⚠️ العضو ليس في روم صوتي.');

        await target.voice.setMute(false);
        return message.reply(`✅ **تم فك الكتم عن ${target.user.username}.**`);
    }

    // --- كتم الكل (!mute-all) ---
    if (command === '!كتم-الكل' || command === '!mute-all') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        if (!message.member.voice.channel) return message.reply('⚠️ **ادخل روم صوتي الأول!**');

        const channel = message.member.voice.channel;
        let count = 0;
        
        for (const [id, member] of channel.members) {
            // استثناء الإدارة من الميوت
            if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                await member.voice.setMute(true);
                count++;
            }
        }
        return message.reply(`🔇 **تم إسكات الروم بالكامل (${count} عضو).**`);
    }

    // --- فك كتم الكل (!unmute-all) ---
    if (command === '!فك-كتم-الكل' || command === '!unmute-all') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
        if (!message.member.voice.channel) return message.reply('⚠️ **ادخل روم صوتي الأول!**');

        const channel = message.member.voice.channel;
        for (const [id, member] of channel.members) {
            await member.voice.setMute(false);
        }
        return message.reply(`🔊 **تم فك الكتم عن الجميع.**`);
    }

    // =================================================================
    // 🚀 3. نقل الأعضاء (!نقل @user @channel)
    // =================================================================
    if (command === '!نقل' || command === '!move') {
        // التحقق من الصلاحية
        if (!message.member.permissions.has(PermissionsBitField.Flags.MoveMembers)) {
            return message.reply('❌ **ليس لديك صلاحية نقل الأعضاء!**');
        }

        // 1. تحديد العضو
        const targetMember = message.mentions.members.first();
        // 2. تحديد الروم (يا إما منشن للروم أو أخذ الـ ID)
        const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);

        if (!targetMember) return message.reply('⚠️ **الاستخدام:** `!move @User @Channel`');
        if (!targetChannel) return message.reply('⚠️ **تأكد من منشن الروم الصوتي بشكل صحيح.**');
        if (!targetMember.voice.channel) return message.reply('⚠️ **هذا العضو ليس في روم صوتي أصلاً!**');
        
        // التحقق إن الروم الهدف هو روم صوتي
        if (targetChannel.type !== ChannelType.GuildVoice && targetChannel.type !== ChannelType.GuildStageVoice) {
            return message.reply('🛑 **لا يمكن النقل لروم كتابي! اختر روم صوتي.**');
        }

        try {
            await targetMember.voice.setChannel(targetChannel);
            
            const moveEmbed = new EmbedBuilder()
                .setColor('#5865F2')
                .setDescription(`🚚 **تم نقل ${targetMember} إلى ${targetChannel} بنجاح!**`);
            
            return message.channel.send({ embeds: [moveEmbed] });

        } catch (error) {
            console.error(error);
            return message.reply('⚠️ **حدث خطأ!** تأكد أن البوت يمتلك صلاحية `Move Members` وأن الروم متاح.');
        }
    }
});

client.once('ready', () => {
    console.log(`🛡️ MNC CONTROL CENTER ACTIVE AS ${client.user.tag}`);
});

// تسجيل الدخول (في نفس الملف كما طلبت)
client.login(process.env.TOKEN);
      
