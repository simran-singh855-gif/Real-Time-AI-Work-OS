const db = require('../config/db');

// 1. CREATE Task (Upgraded for Workspaces & WebSockets)
const createTask = async (req, res) => {
    // 🔥 We now expect the frontend to tell us which room (workspace_id) this task belongs to
    const { title, description, due_date, estimated_minutes, importance, workspace_id } = req.body; 
    const userId = req.user.id; 

    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (!workspace_id) return res.status(400).json({ error: 'Workspace ID is required to place this task.' });

    try {
        // 🛡️ SECURITY CHECK: Is the user actually allowed in this room?
        const [membership] = await db.execute(
            'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
            [workspace_id, userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ error: 'Stop right there! You do not have a key to this workspace.' });
        }

        // ⚙️ THE DECISION ENGINE (Same math as before)
        let priority_score = 0;
        let timeScore = 0;
        if (due_date) {
            const today = new Date();
            const dueDateObj = new Date(due_date);
            const daysDiff = Math.ceil((dueDateObj.getTime() - today.getTime()) / (1000 * 3600 * 24));
            if (daysDiff < 0) timeScore = 50;        
            else if (daysDiff <= 2) timeScore = 40;  
            else if (daysDiff <= 7) timeScore = 20;  
            else timeScore = 10;                     
        }

        const taskImportance = importance || 5; 
        let importanceScore = taskImportance * 3; 

        let effortScore = 0;
        const taskEffort = estimated_minutes || 30; 
        if (taskEffort <= 30) effortScore = 20;        
        else if (taskEffort <= 120) effortScore = 10;  
        else effortScore = 5;                          

        priority_score = timeScore + importanceScore + effortScore;

        // 🗄️ Save the task WITH the workspace_id
        const [result] = await db.execute(
            'INSERT INTO tasks (user_id, workspace_id, title, description, due_date, priority_score, estimated_minutes, importance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [userId, workspace_id, title, description, due_date || null, priority_score, taskEffort, taskImportance]
        );

        // 📣 THE MEGAPHONE: Shout that this specific workspace was updated!
        req.app.get('io').emit('workspace_updated', workspace_id);

        res.status(201).json({ message: 'Task added to workspace successfully!', id: result.insertId });
    } catch (error) {
        console.error("Error creating task:", error);
        res.status(500).json({ error: 'Failed to create task' });
    }
};

// 2. GET Tasks (Upgraded for Workspaces)
const getTasks = async (req, res) => {
    const userId = req.user.id;
    // 🔥 We expect the frontend to ask for a specific room: /api/task?workspaceId=1
    const workspaceId = req.query.workspaceId; 

    if (!workspaceId) return res.status(400).json({ error: "Please select a workspace." });

    try {
        // 🛡️ SECURITY CHECK: Check if the user has the key to view this room
        const [membership] = await db.execute(
            'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
            [workspaceId, userId]
        );

        if (membership.length === 0) {
            return res.status(403).json({ error: 'Access denied. You are not in this workspace.' });
        }

        // 🗄️ Fetch tasks ONLY for this specific room
        const [tasks] = await db.execute(
            'SELECT * FROM tasks WHERE workspace_id = ? ORDER BY priority_score DESC',
            [workspaceId]
        );
        res.json(tasks);
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
};

// 3. UPDATE Task Status
const updateTask = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; 

    if( status === undefined) return res.status(400).json({ error: "missing 'status'"});

    try {
        let completedAt = null;
        if (status === 'completed') {
            completedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        }

        const [result] = await db.execute(
            'UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?', 
            [status, completedAt, id]
        );
        
        if (result.affectedRows === 0) return res.status(404).json({ error: "Task not found" });

        // 📣 THE MEGAPHONE: Shout that tasks changed so everyone's screen updates!
        req.app.get('io').emit('workspace_updated', 'refresh_all');

        res.json({ message: "Task updated" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. DELETE Task
const deleteTask = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.execute('DELETE FROM tasks WHERE id = ?', [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: "Task not found" });

        // 📣 THE MEGAPHONE: Shout that a task was deleted so it disappears instantly!
        req.app.get('io').emit('workspace_updated', 'refresh_all');

        res.json({ message: "Task deleted" });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

// 5. GET Analytics (Upgraded to calculate stats per room)
const getTaskStats = async (req, res) => {
    const userId = req.user.id;
    const workspaceId = req.query.workspaceId;

    if (!workspaceId) return res.status(400).json({ error: "Workspace ID required for stats." });

    try {
        // 🛡️ SECURITY CHECK
        const [membership] = await db.execute(
            'SELECT * FROM workspace_members WHERE workspace_id = ? AND user_id = ?',
            [workspaceId, userId]
        );
        if (membership.length === 0) return res.status(403).json({ error: 'Access denied.' });

        const [stats] = await db.execute(`
            SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
                AVG(CASE WHEN status = 'completed' THEN importance ELSE NULL END) as avg_completed_importance,
                SUM(CASE WHEN status = 'pending' AND DATEDIFF(due_date, CURDATE()) < 0 THEN 1 ELSE 0 END) as overdue_tasks
            FROM tasks 
            WHERE workspace_id = ?
        `, [workspaceId]);

        const data = stats[0];
        const total = data.total_tasks || 0;
        const completed = data.completed_tasks || 0;
        
        res.json({
            total_tasks: total,
            completed_tasks: completed,
            completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
            avg_importance: data.avg_completed_importance ? Math.round(data.avg_completed_importance * 10) / 10 : 0,
            overdue_tasks: data.overdue_tasks || 0
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
};

module.exports = { createTask, getTasks, updateTask, deleteTask, getTaskStats };