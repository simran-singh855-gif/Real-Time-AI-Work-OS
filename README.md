# 🚀 Work OS
### Real-Time AI Work Operating System

Work OS is a multi-tenant, real-time AI-powered decision support system designed to help individuals and teams organize, prioritize, and execute work efficiently.

Unlike traditional task managers, Work OS combines autonomous priority calculation, AI-assisted task decomposition, and real-time collaboration to create an intelligent productivity platform.

---

## ✨ Features

### 🔐 Secure Authentication
- JWT-based stateless authentication
- Password hashing using bcrypt
- Protected API routes
- API rate limiting against brute-force attacks

### 🏢 Multi-Tenant Workspaces
- Separate workspaces for teams and projects
- User-task isolation
- Relational database mapping

### ⚡ Real-Time Collaboration
- WebSocket communication using Socket.io
- Instant task synchronization across clients
- No page refresh required

### 🧠 AI Task Breakdown
- Google Gemini 2.5 Flash API integration
- Converts large engineering tasks into actionable subtasks
- Structured JSON output

Example:

Input:

Build ROS Navigation Node

AI Output:

- Design message structure
- Create publisher node
- Create subscriber node
- Test communication
- Integrate with navigation stack

---

### ⏰ Autonomous Priority Engine
A background scheduler automatically recalculates task priorities based on approaching deadlines.

Built using:

- Node-Cron
- SQL CASE statements
- Mathematical priority scoring

---

### ✅ Full CRUD Operations
Users can:

- Create tasks
- Read tasks
- Update task status
- Delete tasks

---

## 🏗 System Architecture

```text
                 React + Vite
                        │
                        ▼
                Express REST API
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
 Socket.io Server                Gemini 2.5 Flash
        │                               │
        ▼                               ▼
 Real-Time Updates             AI Task Breakdown
        │
        ▼
                  MySQL Database
                        │
                        ▼
                Node-Cron Scheduler
                        │
                        ▼
             Autonomous Priority Engine
```

---

## 🛠 Tech Stack

### Frontend
- React.js
- Vite
- Tailwind CSS
- Socket.io-client

### Backend
- Node.js
- Express.js
- Socket.io

### Database
- MySQL

### AI Integration
- Google Gemini 2.5 Flash API

### Authentication & Security
- JWT
- bcrypt
- Express Rate Limit

### Scheduling
- Node-Cron

---

## 📂 Project Structure

```text
Work-OS
│
├── client/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── services/
│
├── server/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── sockets/
│   └── cron/
│
├── database/
│
└── README.md
```

---

## 🔄 Workflow

```text
User
 ↓
Frontend
 ↓
REST API
 ↓
Authentication
 ↓
MySQL
 ↓
WebSocket Broadcast
 ↓
Connected Users

AI Pipeline:

User Task
 ↓
Gemini API
 ↓
JSON Subtasks
 ↓
Database
 ↓
UI Update
```

---

## 🚀 Future Improvements

- Redis Caching
- Docker Containerization
- RabbitMQ Message Queue
- RAG Memory Layer
- Prometheus Monitoring
- Grafana Dashboards
- Cloud Deployment
- CI/CD Pipeline
- Kubernetes Support

---

## 📸 Screenshots



---

## 🌟 Motivation

Work OS was built with the vision of creating an intelligent work operating system rather than a traditional task manager.

The goal is to combine:

- Real-time collaboration
- AI assistance
- Autonomous prioritization
- Secure multi-user architecture

into a single platform that helps engineers and teams execute complex work efficiently.

---

## 👨‍💻 Author

Simran Singh

Computer Science Engineering Student

Interested in:

- Backend Engineering
- Systems Design
- Infrastructure
- AI Integration
- Intelligent Products

---

## ⭐ If you found this project interesting, consider giving it a star!
