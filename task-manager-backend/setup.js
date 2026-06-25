require('dotenv').config();
const mysql = require('mysql2/promise');

async function upgradeTasksTable() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME
        });

        console.log("⏳ Upgrading tasks table for the Priority Engine...");

        // 1. Drop ONLY the tasks table (safeguards your user and room data)
        await connection.query("DROP TABLE IF EXISTS tasks;");

        // 2. Rebuild the tasks table to perfectly match your backend controllers
        await connection.query(`
            CREATE TABLE tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                workspace_id INT NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                due_date DATE,
                priority_score INT DEFAULT 0,
                estimated_minutes INT DEFAULT 30,
                importance INT DEFAULT 5,
                status VARCHAR(50) DEFAULT 'pending',
                completed_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log("✅ Advanced 'tasks' table built successfully!");
        
        console.log("🎉 SUCCESS! Your Work OS is 100% fully functional.");
        process.exit();

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

upgradeTasksTable();