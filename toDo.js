/* ============================================
   TASKFLOW — toDo.js
   Industry-standard, clean ES6+ JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── DOM Refs ──────────────────────────────────────────
  const addBtn       = document.getElementById('taskSubmit');
  const taskInput    = document.getElementById('task');
  const list         = document.getElementById('to-do-list');
  const emptyState   = document.getElementById('emptyState');
  const progressBar  = document.getElementById('progressBar');
  const progressLabel= document.getElementById('progressLabel');
  const pillCount    = document.getElementById('pillCount');
  const remainCount  = document.getElementById('remainCount');
  const clearDoneBtn = document.getElementById('clearDone');
  const filterTabs   = document.querySelectorAll('.filter-tab');

  // ── State ─────────────────────────────────────────────
  let tasks = JSON.parse(localStorage.getItem('taskflow_tasks')) || [];
  let currentFilter = 'all';

  // ── Init ──────────────────────────────────────────────
  renderAll();

  // ── Event Listeners ───────────────────────────────────
  addBtn.addEventListener('click', addTask);
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
  });

  clearDoneBtn.addEventListener('click', clearCompleted);

  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      currentFilter = tab.dataset.filter;
      renderAll();
    });
  });

  // ── Core Functions ────────────────────────────────────
  function addTask() {
    const text = taskInput.value.trim();
    if (!text) {
      taskInput.focus();
      taskInput.style.borderColor = '#ef4444';
      taskInput.style.boxShadow = '0 0 0 2px rgba(239,68,68,0.3), 0 4px 20px rgba(239,68,68,0.15)';
      setTimeout(() => {
        taskInput.style.borderColor = '';
        taskInput.style.boxShadow = '';
      }, 1200);
      return;
    }

    const newTask = {
      id: Date.now(),
      text,
      done: false,
      createdAt: new Date().toISOString(),
    };

    tasks.unshift(newTask);
    taskInput.value = '';
    saveTasks();
    renderAll();

    // Briefly animate the add button for feedback
    addBtn.style.transform = 'scale(0.93)';
    setTimeout(() => { addBtn.style.transform = ''; }, 150);
  }

  function toggleTask(id) {
    tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
    saveTasks();
    updateStats();
    applyFilter();
  }

  function deleteTask(id, liEl) {
    liEl.classList.add('removing');
    liEl.addEventListener('animationend', () => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      liEl.remove();
      updateStats();
      applyFilter(true); // only check empty state
    }, { once: true });
  }

  function clearCompleted() {
    const doneLis = list.querySelectorAll('li.striker');
    if (!doneLis.length) return;

    doneLis.forEach(li => {
      li.classList.add('removing');
      li.addEventListener('animationend', () => li.remove(), { once: true });
    });

    tasks = tasks.filter(t => !t.done);
    saveTasks();

    setTimeout(() => {
      updateStats();
      checkEmpty();
    }, 350);
  }

  // ── Render ────────────────────────────────────────────
  function renderAll() {
    list.innerHTML = '';
    const visible = filteredTasks();

    visible.forEach(task => {
      list.appendChild(createTaskEl(task));
    });

    updateStats();
    checkEmpty();
  }

  function createTaskEl(task) {
    const li = document.createElement('li');
    li.dataset.id = task.id;
    if (task.done) li.classList.add('striker');

    li.innerHTML = `
      <div class="task-check" role="checkbox" aria-checked="${task.done}" aria-label="Mark task as done" tabindex="0"></div>
      <span class="task-text">${escapeHtml(task.text)}</span>
      <button class="delete" aria-label="Delete task" title="Delete">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    const check  = li.querySelector('.task-check');
    const delBtn = li.querySelector('.delete');

    check.addEventListener('click', () => {
      li.classList.toggle('striker');
      const isDone = li.classList.contains('striker');
      check.setAttribute('aria-checked', isDone);
      toggleTask(task.id);
    });

    check.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        check.click();
      }
    });

    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(task.id, li);
    });

    return li;
  }

  // ── Filter & Stats ────────────────────────────────────
  function filteredTasks() {
    switch (currentFilter) {
      case 'active': return tasks.filter(t => !t.done);
      case 'done':   return tasks.filter(t => t.done);
      default:       return tasks;
    }
  }

  function applyFilter(checkOnly = false) {
    if (checkOnly) { checkEmpty(); return; }
    renderAll();
  }

  function updateStats() {
    const total  = tasks.length;
    const done   = tasks.filter(t => t.done).length;
    const remain = total - done;
    const pct    = total > 0 ? Math.round((done / total) * 100) : 0;

    // Progress
    progressBar.style.width = pct + '%';
    progressBar.setAttribute('aria-valuenow', pct);
    progressLabel.textContent = `${done} of ${total} done`;

    // Pill
    pillCount.textContent = `${total} task${total !== 1 ? 's' : ''}`;

    // Footer
    remainCount.textContent = remain;
  }

  function checkEmpty() {
    const visibleItems = list.querySelectorAll('li:not(.removing)');
    if (visibleItems.length === 0) {
      emptyState.classList.add('visible');
      // Update icon based on filter
      const icon = emptyState.querySelector('.empty-icon');
      if (currentFilter === 'done') {
        icon.textContent = '○';
        emptyState.querySelector('p').textContent = 'Nothing completed yet';
        emptyState.querySelector('span').textContent = 'Check off tasks to see them here';
      } else if (currentFilter === 'active') {
        icon.textContent = '✦';
        emptyState.querySelector('p').textContent = 'You\'re all caught up!';
        emptyState.querySelector('span').textContent = 'No active tasks remaining';
      } else {
        icon.textContent = '✦';
        emptyState.querySelector('p').textContent = 'No tasks here';
        emptyState.querySelector('span').textContent = 'Add something above to get started';
      }
    } else {
      emptyState.classList.remove('visible');
    }
  }

  // ── Persistence ───────────────────────────────────────
  function saveTasks() {
    localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
  }

  // ── Helpers ───────────────────────────────────────────
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

});