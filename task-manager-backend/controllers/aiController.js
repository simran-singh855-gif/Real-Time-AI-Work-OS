const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../config/db');

// Initialize the Google Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const breakDownTask = async (req, res) => {
    const { taskId } = req.body;
    const userId = req.user.id;

    if (!taskId) return res.status(400).json({ error: "Task ID is required." });

    try {
        // 1. Fetch the parent task to see what we are breaking down
        const [tasks] = await db.execute(
            'SELECT * FROM tasks WHERE id = ? AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ?)',
            [taskId, userId]
        );

        if (tasks.length === 0) return res.status(404).json({ error: "Task not found or access denied." });
        const parentTask = tasks[0];

        // 2. Instruct Gemini (Prompt Engineering)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `
            You are an expert engineering project manager. 
            The user needs to complete this task: "${parentTask.title}".
            Break this task down into 3 actionable, bite-sized sub-tasks.
            
            CRITICAL: You must respond ONLY with a valid JSON array of strings. 
            Do not use markdown formatting, do not use the word "json" in your response.
            Example: ["Research tools", "Write boilerplate code", "Test implementation"]
        `;

        // 3. Call the API
        const result = await model.generateContent(prompt);
        let rawResponse = result.response.text().trim();
        
        // Clean up markdown if the AI accidentally included it
        if (rawResponse.startsWith('```')) {
            rawResponse = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const subTasks = JSON.parse(rawResponse);

        // 4. Inject the new sub-tasks into the database
        for (const subTitle of subTasks) {
            await db.execute(
                'INSERT INTO tasks (user_id, workspace_id, title, description, importance, estimated_minutes, priority_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, parentTask.workspace_id, `↳ Sub-task: ${subTitle}`, 'AI Generated', parentTask.importance, 30, parentTask.priority_score]
            );
        }

        res.json({ message: "AI Breakdown Complete!", subTasks });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Failed to process AI breakdown." });
    }
};

module.exports = { breakDownTask };