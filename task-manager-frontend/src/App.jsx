import { useState, useEffect } from 'react';
import { io } from 'socket.io-client'; // 🔌 NEW: Import WebSocket client

// 🔌 NEW: Connect to the backend server (we put this outside the component so it doesn't reconnect every time you type)
const socket = io('http://localhost:5000');

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [authMessage, setAuthMessage] = useState('');
  
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState(''); 
  const [newTaskImportance, setNewTaskImportance] = useState(5); 
  const [newTaskEffort, setNewTaskEffort] = useState(30); 

  const [stats, setStats] = useState({
    total_tasks: 0, completed_tasks: 0, completion_rate: 0, avg_importance: 0, overdue_tasks: 0
  });

  const [loadingAiId, setLoadingAiId] = useState(null);
  const [expandedTasks, setExpandedTasks] = useState({});

  // --- AUTHENTICATION ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLoginMode ? '/login' : '/register';
    try {
      const response = await fetch(`http://localhost:5000/api/auth${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok) {
        if (isLoginMode) {
          setToken(data.token);
          localStorage.setItem('token', data.token);
          setAuthMessage('');
        } else {
          setAuthMessage('🎉 Registration Successful! You can now log in.');
          setIsLoginMode(true);
        }
      } else {
        setAuthMessage('❌ Error: ' + data.error);
      }
    } catch (error) {
      setAuthMessage('⚠️ Server not responding.');
    }
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    setTasks([]); 
    setWorkspaces([]);
    setActiveWorkspaceId('');
  };

  // --- WORKSPACE LOGIC ---
  useEffect(() => {
    if (token) fetchWorkspaces();
  }, [token]);

  useEffect(() => {
    if (token && activeWorkspaceId) {
      fetchTasks();
      fetchStats();
    }
  }, [activeWorkspaceId]);

  // 🔌 NEW: THE WEBSOCKET LISTENER
  useEffect(() => {
    // Listen for the backend's megaphone shout
    socket.on('workspace_updated', (targetWorkspaceId) => {
      console.log("⚡ Real-time signal received! Updating UI...");
      
      // If the shout was for everyone, OR for the specific room we are currently sitting in...
      if (targetWorkspaceId === 'refresh_all' || String(targetWorkspaceId) === String(activeWorkspaceId)) {
        // Refresh the tasks and stats instantly!
        if (token && activeWorkspaceId) {
          fetchTasks();
          fetchStats();
        }
      }
    });

    // Cleanup the listener when we change rooms
    return () => {
      socket.off('workspace_updated');
    };
  }, [activeWorkspaceId, token]); // Re-bind if we switch rooms

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/workspaces', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setWorkspaces(data);
        if (data.length > 0 && !activeWorkspaceId) {
          setActiveWorkspaceId(data[0].id.toString());
        }
      }
    } catch (error) { console.error("Failed to fetch workspaces"); }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName) return;
    try {
      const response = await fetch('http://localhost:5000/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newWorkspaceName })
      });
      if (response.ok) {
        setNewWorkspaceName('');
        fetchWorkspaces(); 
      }
    } catch (error) { console.error("Failed to create workspace"); }
  };

  // --- TASK & STATS LOGIC ---
  const fetchTasks = async () => {
    if (!activeWorkspaceId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/task?workspaceId=${activeWorkspaceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setTasks(data);
    } catch (error) { console.error("Failed to fetch tasks"); }
  };

  const fetchStats = async () => {
    if (!activeWorkspaceId) return;
    try {
      const response = await fetch(`http://localhost:5000/api/task/stats?workspaceId=${activeWorkspaceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setStats(data);
    } catch (error) { console.error("Failed to fetch stats"); }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle || !activeWorkspaceId) return;
    try {
      const response = await fetch('http://localhost:5000/api/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          title: newTaskTitle, description: "Smart Task",
          due_date: newTaskDueDate || null,
          importance: parseInt(newTaskImportance),
          estimated_minutes: parseInt(newTaskEffort),
          workspace_id: activeWorkspaceId 
        })
      });
      if (response.ok) {
        setNewTaskTitle(''); setNewTaskDueDate(''); setNewTaskImportance(5); setNewTaskEffort(30);
        // Note: We don't technically need to call fetchTasks() here anymore because the WebSocket will tell us to!
        // But leaving it in won't hurt anything.
      }
    } catch (error) { console.error("Failed to create task"); }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    try {
      await fetch(`http://localhost:5000/api/task/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (error) { console.error("Failed to update task"); }
  };

  const handleDeleteTask = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/task/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) { console.error("Failed to delete task"); }
  };

  const handleAiBreakdown = async (taskId) => {
    setLoadingAiId(taskId);
    try {
      const response = await fetch('http://localhost:5000/api/ai/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ taskId })
      });
      
      if (response.ok) {
        setExpandedTasks(prev => ({ ...prev, [taskId]: true }));
      } else {
        alert("The AI encountered an error. Check server logs.");
      }
    } catch (error) {
      console.error("Failed to communicate with AI");
    }
    setLoadingAiId(null);
  };

  const toggleExpand = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const getPriorityDisplay = (score) => {
    if (score >= 80) return { color: 'bg-red-500/20 text-red-400 border-red-500/50', label: '🔥 URGENT' };
    if (score >= 50) return { color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', label: '⭐ HIGH' };
    if (score >= 30) return { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', label: '📅 UPCOMING' };
    return { color: 'bg-slate-500/20 text-slate-400 border-slate-500/50', label: 'NO RUSH' };
  };

  // --- UI: DASHBOARD ---
  if (token) {
    const parentTasks = tasks.filter(t => !t.title.startsWith("↳"));
    const subTasks = tasks.filter(t => t.title.startsWith("↳"));

    return (
      <div className="min-h-screen p-8 font-sans">
        <div className="max-w-4xl mx-auto">
          
          <div className="flex justify-between items-center mb-6 bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
            <div>
              <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                Work OS
              </h2>
              <p className="text-slate-400 text-sm mt-1">Multi-Tenant Architecture Active 🏢</p>
            </div>
            <button onClick={handleLogout} className="bg-slate-700 hover:bg-red-500 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300 shadow-md">
              Logout
            </button>
          </div>

          {/* WORKSPACE CONTROL BAR */}
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-md mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">Current Room:</span>
              <select 
                value={activeWorkspaceId} 
                onChange={(e) => setActiveWorkspaceId(e.target.value)}
                className="bg-slate-900 text-white border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-full sm:w-auto font-semibold"
              >
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            </div>

            <form onSubmit={handleCreateWorkspace} className="flex items-center gap-2 w-full sm:w-auto">
              <input 
                type="text" placeholder="New room name..." 
                value={newWorkspaceName} onChange={(e) => setNewWorkspaceName(e.target.value)}
                className="bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-48"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2 px-4 rounded-lg transition-colors whitespace-nowrap">
                + Create
              </button>
            </form>
          </div>

          {/* Analytics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-md flex flex-col items-center justify-center text-center">
              <span className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Win Rate</span>
              <span className={`text-3xl font-extrabold ${stats.completion_rate >= 70 ? 'text-emerald-400' : stats.completion_rate >= 40 ? 'text-orange-400' : 'text-red-400'}`}>{stats.completion_rate}%</span>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-md flex flex-col items-center justify-center text-center">
              <span className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Completed</span>
              <span className="text-3xl font-extrabold text-blue-400">{stats.completed_tasks} <span className="text-lg text-slate-500">/ {stats.total_tasks}</span></span>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-md flex flex-col items-center justify-center text-center">
              <span className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Avg Impact</span>
              <span className="text-3xl font-extrabold text-purple-400">{stats.avg_importance} <span className="text-lg text-slate-500">/ 10</span></span>
            </div>
            <div className={`p-4 rounded-2xl border shadow-md flex flex-col items-center justify-center text-center transition-colors ${stats.overdue_tasks > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-800 border-slate-700'}`}>
              <span className={`text-sm font-bold uppercase tracking-wider mb-1 ${stats.overdue_tasks > 0 ? 'text-red-400' : 'text-slate-400'}`}>Overdue</span>
              <span className={`text-3xl font-extrabold ${stats.overdue_tasks > 0 ? 'text-red-500' : 'text-slate-500'}`}>{stats.overdue_tasks}</span>
            </div>
          </div>

          {/* Task Entry Form */}
          <form onSubmit={handleCreateTask} className="mb-8 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <input type="text" placeholder="What needs to be done?" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} className="flex-2 bg-slate-900 text-white border border-slate-700 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full" />
              <input type="date" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)} className="bg-slate-900 text-slate-300 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div className="flex flex-col sm:flex-row gap-6 items-center bg-slate-900 p-4 rounded-xl border border-slate-700">
              <div className="flex-1 w-full">
                <label className="text-xs text-slate-400 font-bold mb-2 block uppercase tracking-wider">Importance (1-10): <span className="text-emerald-400 text-sm">{newTaskImportance}</span></label>
                <input type="range" min="1" max="10" value={newTaskImportance} onChange={(e) => setNewTaskImportance(e.target.value)} className="w-full accent-emerald-500" />
              </div>
              <div className="flex-1 w-full">
                <label className="text-xs text-slate-400 font-bold mb-2 block uppercase tracking-wider">Est. Effort</label>
                <select value={newTaskEffort} onChange={(e) => setNewTaskEffort(e.target.value)} className="w-full bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="15">15 Minutes (Quick Win)</option>
                  <option value="30">30 Minutes</option>
                  <option value="60">1 Hour</option>
                  <option value="120">2 Hours (Deep Work)</option>
                  <option value="240">4+ Hours (Major Project)</option>
                </select>
              </div>
              <button type="submit" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all transform hover:-translate-y-1 h-full mt-6 sm:mt-0">Analyze & Add</button>
            </div>
          </form>

          {/* Task List */}
          <div className="space-y-4">
            {!activeWorkspaceId ? (
               <div className="text-center p-10 bg-slate-800 rounded-2xl border border-slate-700">
                 <p className="text-slate-400 text-lg">Please select or create a room to view tasks.</p>
               </div>
            ) : parentTasks.length === 0 ? (
              <div className="text-center p-10 bg-slate-800 rounded-2xl border border-slate-700">
                <p className="text-slate-400 text-lg">This room is empty. Add a task above.</p>
              </div>
            ) : (
              parentTasks.map((task) => {
                const priorityInfo = getPriorityDisplay(task.priority_score);
                const isExpanded = !!expandedTasks[task.id];
                const currentSubTasks = subTasks;

                return (
                  <div key={task.id} className="bg-slate-800 rounded-2xl border border-slate-700 shadow-md overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 gap-4 hover:bg-slate-700/30 transition-colors duration-200">
                      <div className="flex items-start gap-3 flex-1">
                        <button 
                          onClick={() => toggleExpand(task.id)}
                          className="mt-1 text-slate-400 hover:text-white transition-transform duration-200 focus:outline-none"
                          style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                        >
                          ▶
                        </button>
                        
                        <div className="flex-1">
                          <h3 className={`text-xl font-bold transition-all duration-300 ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-100'}`}>{task.title}</h3>
                          <div className="flex flex-wrap gap-2 mt-3 items-center">
                            <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>{task.status.toUpperCase()}</span>
                            {task.priority_score > 0 && <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${priorityInfo.color}`}>{priorityInfo.label}</span>}
                            <div className="flex gap-3 ml-2 text-xs font-medium text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-700">
                               <span>⭐ Imp: {task.importance || '-'}</span>
                               <span>⏳ {task.estimated_minutes || '-'}m</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 flex-wrap sm:flex-nowrap items-center">
                        {task.status !== 'completed' && (
                          <button 
                            onClick={() => handleAiBreakdown(task.id)}
                            disabled={loadingAiId === task.id}
                            className="bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 border border-purple-500/30 disabled:opacity-50"
                          >
                            {loadingAiId === task.id ? '⏳ Thinking...' : '✨ Breakdown'}
                          </button>
                        )}
                        <button onClick={() => handleToggleStatus(task.id, task.status)} className={`font-semibold py-2 px-5 rounded-lg transition-all duration-300 shadow-md ${task.status === 'completed' ? 'bg-slate-600 hover:bg-slate-500 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-slate-900'}`}>{task.status === 'completed' ? 'Undo' : 'Done'}</button>
                        <button onClick={() => handleDeleteTask(task.id)} className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white font-semibold py-2 px-3 rounded-lg transition-all duration-300">✕</button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-slate-900/60 border-t border-slate-700/50 px-8 py-4 space-y-3">
                        {currentSubTasks.length === 0 ? (
                          <p className="text-xs text-slate-500 italic pl-5">No sub-tasks yet. Click ✨ Breakdown to generate some!</p>
                        ) : (
                          currentSubTasks.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 pl-6">
                              <span className={`text-sm font-medium ${sub.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                                {sub.title}
                              </span>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => handleToggleStatus(sub.id, sub.status)}
                                  className={`text-xs font-bold px-3 py-1 rounded-md transition-all ${sub.status === 'completed' ? 'bg-slate-700 text-slate-400' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-900'}`}
                                >
                                  {sub.status === 'completed' ? 'Undo' : 'Done'}
                                </button>
                                <button 
                                  onClick={() => handleDeleteTask(sub.id)}
                                  className="text-slate-500 hover:text-red-400 text-xs px-2"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- UI: LOGIN/REGISTER ---
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 p-10 rounded-3xl shadow-2xl border border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">Work OS</h1>
          <p className="text-slate-400 font-medium">{isLoginMode ? 'Welcome back.' : 'Initialize system.'}</p>
        </div>
        <form onSubmit={handleAuthSubmit} className="space-y-5">
          <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-5 py-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-900 text-white border border-slate-700 rounded-xl px-5 py-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
          <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-1">{isLoginMode ? 'Access System' : 'Create Account'}</button>
        </form>
        <div className="mt-8 text-center border-t border-slate-700 pt-6">
          <button onClick={() => { setIsLoginMode(!isLoginMode); setAuthMessage(''); }} className="text-slate-400 hover:text-white font-medium transition-colors">{isLoginMode ? "Need an account? Sign up" : "Already have an account? Sign in"}</button>
        </div>
      </div>
    </div>
  );
}

export default App;