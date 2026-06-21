require('dotenv').config();

// 1. IMPORT PACKAGES
const express = require("express");
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io'); 
const rateLimit = require('express-rate-limit'); // 🛡️ NEW: Import the security package

// 2. INITIALIZE APP
const app = express();
const server = http.createServer(app); 

const io = new Server(server, {
    cors: {
        // 🌐 UPDATE: Added Vercel URL to the Socket.io Guest List
        origin: ["http://localhost:5173", "https://real-time-ai-work-os.vercel.app"], 
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log(`⚡ A user connected in real-time (Socket ID: ${socket.id})`);
    socket.on('disconnect', () => {
        console.log('User disconnected from real-time stream.');
    });
});

// 3. IMPORT LOCAL FILES & ROUTES
const db = require('./config/db');
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const aiRoutes = require('./routes/aiRoutes');
require('./utils/cronJobs'); 

// 4. MIDDLEWARE (General)
// 🌐 UPDATE: Added Vercel URL to the Express Guest List
app.use(cors({
    origin: ["http://localhost:5173", "https://real-time-ai-work-os.vercel.app"]
})); 
app.use(express.json()); 

// 🛡️ 5. SECURITY MIDDLEWARE (The Bouncer)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // The Stopwatch: 15 minutes
    max: 100, // The Clicker: Limit each IP to 100 requests per 15 minutes
    message: { error: "Too many requests from this IP, please try again after 15 minutes." },
    standardHeaders: true, // Sends rate limit info to the browser headers
    legacyHeaders: false, // Disables old deprecated headers
});

// Apply the bouncer to ALL routes that start with /api/
app.use('/api/', apiLimiter);

// 6. DATABASE CONNECTION VERIFICATION
db.execute('SELECT 1 + 1 AS result')
  .then(() => console.log('✅ Database connected successfully!'))
  .catch((err) => console.error('❌ Database connection failed:', err.message));

// 7. ROUTES
app.get("/api/test/", (req, res) => res.json({ message: "backend is working successfully" }));
app.use('/api/task', taskRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/ai', aiRoutes);

// 8. START SERVER
server.listen(5000, () => {
    console.log("🚀 Server running on port 5000");
    console.log("📡 WebSocket real-time engine is active.");
    console.log("🛡️ API Rate Limiter is armed.");
});