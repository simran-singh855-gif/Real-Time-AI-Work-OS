const cron = require('node-cron');
const db = require('../config/db');

// Runs at exactly 00:00 (Midnight) every day.
cron.schedule('0 0 * * *', async () => {
    console.log("⏰ CRON JOB TRIGGERED: Recalculating smart task priorities...");

    try {
        // 🔥 The Advanced SQL Decision Engine
        // This calculates Time + Importance + Effort entirely inside the database!
        const [result] = await db.execute(`
            UPDATE tasks 
            SET priority_score = (
                -- 1. TIME WEIGHT (Max 50 points)
                CASE 
                    WHEN DATEDIFF(due_date, CURDATE()) < 0 THEN 50
                    WHEN DATEDIFF(due_date, CURDATE()) <= 2 THEN 40
                    WHEN DATEDIFF(due_date, CURDATE()) <= 7 THEN 20
                    ELSE 10
                END
                +
                -- 2. IMPORTANCE WEIGHT (Max 30 points)
                (IFNULL(importance, 5) * 3)
                +
                -- 3. EFFORT WEIGHT (Max 20 points)
                CASE
                    WHEN IFNULL(estimated_minutes, 30) <= 30 THEN 20
                    WHEN IFNULL(estimated_minutes, 30) <= 120 THEN 10
                    ELSE 5
                END
            )
            WHERE status != 'completed' 
            AND due_date IS NOT NULL
        `);

        console.log(`✅ Priority Engine Update Complete. Tasks mathematically sorted: ${result.affectedRows}`);
    } catch (error) {
        console.error("❌ Failed to run priority update job:", error);
    }
});

console.log("⚙️ Background worker initialized: Smart Decision Engine Active.");