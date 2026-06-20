const db = require('../config/db');

// 1. GET ALL WORKSPACES (Find which rooms the user has keys to)
const getUserWorkspaces = async (req, res) => {
    const userId = req.user.id;

    try {
        // 🔥 The JOIN query: Find rooms where this user has a key in the members table
        const [workspaces] = await db.execute(`
            SELECT w.id, w.name, w.created_at 
            FROM workspaces w
            JOIN workspace_members wm ON w.id = wm.workspace_id
            WHERE wm.user_id = ?
        `, [userId]);

        res.json(workspaces);
    } catch (err) {
        console.error("Error fetching workspaces:", err);
        res.status(500).json({ error: "Failed to load workspaces" });
    }
};

// 2. CREATE A WORKSPACE (Build a room AND hand the creator the first key)
const createWorkspace = async (req, res) => {
    const { name } = req.body;
    const userId = req.user.id;

    if (!name) {
        return res.status(400).json({ error: "Workspace name is required" });
    }

    try {
        // Step A: Build the physical room
        const [roomResult] = await db.execute(
            'INSERT INTO workspaces (name, created_by) VALUES (?, ?)',
            [name, userId]
        );
        const newWorkspaceId = roomResult.insertId;

        // Step B: Hand the creator the key to their new room
        await db.execute(
            'INSERT INTO workspace_members (workspace_id, user_id) VALUES (?, ?)',
            [newWorkspaceId, userId]
        );

        res.status(201).json({ 
            message: "Workspace created successfully",
            workspace: { id: newWorkspaceId, name: name }
        });
    } catch (err) {
        console.error("Error creating workspace:", err);
        res.status(500).json({ error: "Failed to create workspace" });
    }
};

module.exports = { getUserWorkspaces, createWorkspace };