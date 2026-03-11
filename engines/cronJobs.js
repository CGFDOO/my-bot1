const cron = require('node-cron');
const Level = require('../models/Level');

module.exports = () => {
    console.log("⏳ [CRON] تم تشغيل محرك تصفير اللفلات (التوب اليومي/الأسبوعي/الشهري).");

    // 1. تصفير التوب اليومي (كل يوم الساعة 12 منتصف الليل)
    cron.schedule('0 0 * * *', async () => {
        try {
            await Level.updateMany({}, { $set: { dailyXp: 0 } });
            console.log('✅ [CRON] تم تصفير التوب اليومي (Daily XP).');
        } catch (error) { console.error(error); }
    });

    // 2. تصفير التوب الأسبوعي (كل يوم أحد الساعة 12 منتصف الليل)
    cron.schedule('0 0 * * 0', async () => {
        try {
            await Level.updateMany({}, { $set: { weeklyXp: 0 } });
            console.log('✅ [CRON] تم تصفير التوب الأسبوعي (Weekly XP).');
        } catch (error) { console.error(error); }
    });

    // 3. تصفير التوب الشهري (يوم 1 في الشهر الساعة 12 منتصف الليل)
    cron.schedule('0 0 1 * *', async () => {
        try {
            await Level.updateMany({}, { $set: { monthlyXp: 0 } });
            console.log('✅ [CRON] تم تصفير التوب الشهري (Monthly XP).');
        } catch (error) { console.error(error); }
    });
};
