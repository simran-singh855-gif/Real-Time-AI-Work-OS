const breakDownTask = async (req, res) => {
    const { taskId } = req.body;
    const userId = req.user.id;

    if (!taskId) return res.status(400).json({ error: "Task ID is required." });

    try {
        // 1. Fetch the parent task
        const [tasks] = await db.execute(
            'SELECT * FROM tasks WHERE id = ? AND workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = ?)',
            [taskId, userId]
        );

        if (tasks.length === 0) return res.status(404).json({ error: "Task not found or access denied." });
        const parentTask = tasks[0];

        // 2. UPGRADE: Configure Gemini for strict JSON and higher creativity
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            generationConfig: {
                temperature: 0.7, // 0.0 is robotic, 1.0 is chaotic. 0.7 is perfect for tasks!
                responseMimeType: "application/json" // GUARANTEES a crash-free JSON response
            }
        });

        // 3. UPGRADE: Feed the AI the description too, not just the title!
        const prompt = `
            You are an expert engineering project manager. 
            The user needs to complete this task: "${parentTask.title}".
            Context/Description: "${parentTask.description || 'No additional details provided.'}"
            
            Break this task down into 3 actionable, highly-specific, technical sub-tasks.
            Return a JSON array of 3 strings. Example: ["Initialize variables", "Write memory management logic", "Run unit tests"]
        `;

        // 4. Call the API
        const result = await model.generateContent(prompt);
        
        // Because of responseMimeType, we can skip the markdown regex hacks completely!
        const subTasks = JSON.parse(result.response.text());

        // 5. Inject the new sub-tasks into the database
        for (const subTitle of subTasks) {
            await db.execute(
                'INSERT INTO tasks (user_id, workspace_id, title, description, importance, estimated_minutes, priority_score) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [userId, parentTask.workspace_id, `↳ Sub-task: ${subTitle}`, 'AI Generated Breakdown', parentTask.importance, 30, parentTask.priority_score]
            );
        }

        // 📣 THE MEGAPHONE: Tell the frontend to update instantly!
        req.app.get('io').emit('workspace_updated', parentTask.workspace_id);

        res.json({ message: "AI Breakdown Complete!", subTasks });

    } catch (error) {
        console.error("AI Error:", error);
        res.status(500).json({ error: "Failed to process AI breakdown." });
    }
};