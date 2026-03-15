/**
 * tasks.js — TaskFlow Dashboard & Task Management
 * Handles: CRUD tasks, filtering, search, stats, sidebar, modals
 * Tasks stored per user: taskflow_tasks_{userId} = [{ id, title, desc, priority, dueDate, completed, createdAt }]
 */

// ── State ─────────────────────────────────────────────────
let currentUser    = null;
let allTasks       = [];
let activeFilter   = 'all';
let searchQuery    = '';
let taskToDelete   = null;

// ── Storage Helpers ───────────────────────────────────────
function getTasksKey(userId) {
  return `taskflow_tasks_${userId}`;
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(getTasksKey(currentUser.userId));
    allTasks = raw ? JSON.parse(raw) : [];
  } catch {
    allTasks = [];
  }
}

function saveTasks() {
  localStorage.setItem(getTasksKey(currentUser.userId), JSON.stringify(allTasks));
}

// ── Dashboard Init ────────────────────────────────────────
function initDashboard() {
  // Auth guard
  currentUser = getSession();
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  loadTasks();
  setupUI();
  renderAll();
}

function setupUI() {
  // Greeting
  document.getElementById('greetingText').textContent = `${getGreeting()} ✦`;
  document.getElementById('greetingDate').textContent = formatDateLong();

  // User info
  const initial = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('sidebarAvatar').textContent = initial;
  document.getElementById('topbarAvatar').textContent  = initial;
  document.getElementById('sidebarName').textContent   = currentUser.name;
  document.getElementById('sidebarEmail').textContent  = currentUser.email;

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  // Dark mode
  document.getElementById('darkToggle').addEventListener('click', toggleDarkMode);

  // Hamburger / sidebar
  document.getElementById('hamburger').addEventListener('click', openSidebar);
  document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
  document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);

  // Add task buttons
  document.getElementById('addTaskBtn').addEventListener('click', openAddModal);
  document.getElementById('emptyAddBtn').addEventListener('click', openAddModal);

  // Modal controls
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('cancelBtn').addEventListener('click', closeModal);
  document.getElementById('taskModalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('taskModalOverlay')) closeModal();
  });

  // Delete modal controls
  document.getElementById('deleteConfirmBtn').addEventListener('click', confirmDelete);
  document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteModalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('deleteModalOverlay')) closeDeleteModal();
  });

  // Task form submit
  document.getElementById('taskForm').addEventListener('submit', handleTaskSubmit);

  // Filter tabs
  document.getElementById('filterTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-filter]');
    if (!tab) return;
    setFilter(tab.dataset.filter);
  });

  // Sidebar nav
  document.querySelectorAll('.nav-link[data-filter]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      setFilter(link.dataset.filter);
      closeSidebar();
    });
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderTasks();
  });

  // Keyboard: close modal on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeDeleteModal();
    }
  });
}

// ── Sidebar ───────────────────────────────────────────────
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebarOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// ── Filter ────────────────────────────────────────────────
function setFilter(filter) {
  activeFilter = filter;
  searchQuery  = '';
  document.getElementById('searchInput').value = '';

  // Update filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === filter);
  });

  // Update sidebar links
  document.querySelectorAll('.nav-link[data-filter]').forEach(link => {
    link.classList.toggle('active', link.dataset.filter === filter);
  });

  // Update title
  const titles = {
    all: 'All Tasks', pending: 'Pending Tasks', completed: 'Completed Tasks',
    high: 'High Priority', medium: 'Medium Priority', low: 'Low Priority',
  };
  document.getElementById('tasksTitle').textContent = titles[filter] || 'Tasks';

  renderTasks();
}

// ── Render All ────────────────────────────────────────────
function renderAll() {
  renderStats();
  renderTasks();
}

// ── Stats ─────────────────────────────────────────────────
function renderStats() {
  const total     = allTasks.length;
  const completed = allTasks.filter(t => t.completed).length;
  const pending   = total - completed;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById('totalCount').textContent     = total;
  document.getElementById('completedCount').textContent  = completed;
  document.getElementById('pendingCount').textContent    = pending;
  document.getElementById('progressBar').style.width    = pct + '%';
  document.getElementById('progressPct').textContent    = pct + '%';
}

// ── Filter & Search Logic ─────────────────────────────────
function getFilteredTasks() {
  return allTasks.filter(task => {
    // Status / priority filter
    const matchFilter = (() => {
      switch (activeFilter) {
        case 'all':       return true;
        case 'pending':   return !task.completed;
        case 'completed': return task.completed;
        case 'high':      return task.priority === 'high';
        case 'medium':    return task.priority === 'medium';
        case 'low':       return task.priority === 'low';
        default:          return true;
      }
    })();

    // Search
    const matchSearch = !searchQuery ||
      task.title.toLowerCase().includes(searchQuery) ||
      (task.desc || '').toLowerCase().includes(searchQuery);

    return matchFilter && matchSearch;
  });
}

// ── Render Tasks ──────────────────────────────────────────
function renderTasks() {
  const list     = document.getElementById('taskList');
  const empty    = document.getElementById('emptyState');
  const emptyMsg = document.getElementById('emptyMsg');
  const filtered = getFilteredTasks();

  list.innerHTML = '';

  if (filtered.length === 0) {
    list.classList.add('hidden');
    empty.classList.remove('hidden');

    // Contextual empty message
    if (searchQuery) {
      emptyMsg.textContent = `No tasks matching "${searchQuery}".`;
    } else if (activeFilter === 'completed') {
      emptyMsg.textContent = 'No completed tasks yet. Keep going!';
    } else if (activeFilter === 'pending') {
      emptyMsg.textContent = 'No pending tasks. You\'re all caught up! 🎉';
    } else {
      emptyMsg.textContent = 'Your list is clear. Add a task to get started.';
    }
    return;
  }

  list.classList.remove('hidden');
  empty.classList.add('hidden');

  filtered.forEach((task, index) => {
    const card = createTaskCard(task, index);
    list.appendChild(card);
  });
}

// ── Task Card ─────────────────────────────────────────────
function createTaskCard(task, index) {
  const card = document.createElement('div');
  card.className = `task-card priority-${task.priority}${task.completed ? ' completed' : ''}`;
  card.style.animationDelay = `${index * 0.04}s`;
  card.dataset.id = task.id;

  const dueInfo = getDueInfo(task.dueDate);

  card.innerHTML = `
    <button class="task-checkbox ${task.completed ? 'checked' : ''}" data-id="${task.id}" title="${task.completed ? 'Mark pending' : 'Mark complete'}"></button>
    <div class="task-body">
      <div class="task-title">${escapeHtml(task.title)}</div>
      ${task.desc ? `<div class="task-desc">${escapeHtml(task.desc)}</div>` : ''}
      <div class="task-meta">
        <span class="task-badge badge-${task.priority}">${task.priority}</span>
        ${dueInfo ? `<span class="task-due ${dueInfo.overdue ? 'overdue' : ''}">📅 ${dueInfo.text}</span>` : ''}
      </div>
    </div>
    <div class="task-actions">
      <button class="btn-icon edit-btn" data-id="${task.id}" title="Edit task">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="btn-icon delete-btn" data-id="${task.id}" title="Delete task" style="color: var(--danger)">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>
  `;

  // Event delegation on the card
  card.querySelector('.task-checkbox').addEventListener('click', () => toggleTask(task.id));
  card.querySelector('.edit-btn').addEventListener('click', () => openEditModal(task.id));
  card.querySelector('.delete-btn').addEventListener('click', () => openDeleteModal(task.id));

  return card;
}

// ── Due Date Formatter ────────────────────────────────────
function getDueInfo(dueDate) {
  if (!dueDate) return null;
  const due  = new Date(dueDate + 'T00:00:00');
  const now  = new Date();
  now.setHours(0,0,0,0);
  const diff = Math.round((due - now) / (1000 * 60 * 60 * 24));

  let text;
  if (diff < 0)      text = `${Math.abs(diff)}d overdue`;
  else if (diff === 0) text = 'Today';
  else if (diff === 1) text = 'Tomorrow';
  else                 text = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return { text, overdue: diff < 0 };
}

// ── Toggle Complete ───────────────────────────────────────
function toggleTask(id) {
  const task = allTasks.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  task.updatedAt = new Date().toISOString();
  saveTasks();
  renderAll();
  showToast(task.completed ? '✓ Task completed!' : 'Task marked as pending.', 'success', 2000);
}

// ── Delete Task ───────────────────────────────────────────
function openDeleteModal(id) {
  taskToDelete = id;
  document.getElementById('deleteModalOverlay').classList.remove('hidden');
}
function closeDeleteModal() {
  taskToDelete = null;
  document.getElementById('deleteModalOverlay').classList.add('hidden');
}
function confirmDelete() {
  if (!taskToDelete) return;
  allTasks = allTasks.filter(t => t.id !== taskToDelete);
  saveTasks();
  closeDeleteModal();
  renderAll();
  showToast('Task deleted.', 'error', 2000);
}

// ── Add / Edit Modal ──────────────────────────────────────
function openAddModal() {
  document.getElementById('modalTitle').textContent    = 'Add Task';
  document.getElementById('saveTaskBtn').textContent   = 'Save Task';
  document.getElementById('taskId').value              = '';
  document.getElementById('taskTitle').value           = '';
  document.getElementById('taskDesc').value            = '';
  document.getElementById('taskPriority').value        = 'medium';
  document.getElementById('taskDue').value             = '';
  hideNotification('modalNotification');
  clearAllErrors([{ inputId: 'taskTitle', errorId: 'taskTitleError' }]);
  document.getElementById('taskModalOverlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('taskTitle').focus(), 100);
}

function openEditModal(id) {
  const task = allTasks.find(t => t.id === id);
  if (!task) return;

  document.getElementById('modalTitle').textContent    = 'Edit Task';
  document.getElementById('saveTaskBtn').textContent   = 'Update Task';
  document.getElementById('taskId').value              = task.id;
  document.getElementById('taskTitle').value           = task.title;
  document.getElementById('taskDesc').value            = task.desc || '';
  document.getElementById('taskPriority').value        = task.priority || 'medium';
  document.getElementById('taskDue').value             = task.dueDate || '';
  hideNotification('modalNotification');
  clearAllErrors([{ inputId: 'taskTitle', errorId: 'taskTitleError' }]);
  document.getElementById('taskModalOverlay').classList.remove('hidden');
  setTimeout(() => document.getElementById('taskTitle').focus(), 100);
}

function closeModal() {
  document.getElementById('taskModalOverlay').classList.add('hidden');
}

// ── Task Form Submit ──────────────────────────────────────
function handleTaskSubmit(e) {
  e.preventDefault();
  clearAllErrors([{ inputId: 'taskTitle', errorId: 'taskTitleError' }]);
  hideNotification('modalNotification');

  const id       = document.getElementById('taskId').value;
  const title    = document.getElementById('taskTitle').value.trim();
  const desc     = document.getElementById('taskDesc').value.trim();
  const priority = document.getElementById('taskPriority').value;
  const dueDate  = document.getElementById('taskDue').value;

  // Validate
  if (!title) {
    setFieldError('taskTitle', 'taskTitleError', 'Task title is required.');
    return;
  }
  if (title.length < 2) {
    setFieldError('taskTitle', 'taskTitleError', 'Title must be at least 2 characters.');
    return;
  }

  if (id) {
    // Edit existing
    const task = allTasks.find(t => t.id === id);
    if (task) {
      task.title     = title;
      task.desc      = desc;
      task.priority  = priority;
      task.dueDate   = dueDate || null;
      task.updatedAt = new Date().toISOString();
    }
    showToast('Task updated!', 'success');
  } else {
    // Create new
    const newTask = {
      id:        generateId(),
      title,
      desc,
      priority,
      dueDate:   dueDate || null,
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    allTasks.unshift(newTask); // Add to top
    showToast('Task added!', 'success');
  }

  saveTasks();
  closeModal();
  renderAll();
}

// ── Escape HTML ───────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}