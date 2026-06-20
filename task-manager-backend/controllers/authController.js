const db = require('../config/db');
const bcrypt = require('bcrypt');

const register = async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Hash the password (10 rounds of salt)
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Save to database
        const [result] = await db.execute(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );

        res.status(201).json({ message: "User registered successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Find user by username
        const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(401).json({ error: "User not found" });

        const user = users[0];

        // 2. Compare password with the hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ error: "Invalid password" });

        // 3. Create a JWT Token (The "Entry Ticket")
        const token = jwt.sign({ id: user.id }, 'YOUR_SECRET_KEY', { expiresIn: '1h' });

        res.json({ message: "Login successful!", token });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

module.exports = { register, login };
