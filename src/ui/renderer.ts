// Define API (no export, pure interface)
interface IElectronAPI {
    getTasks: () => Promise<any[]>;
    createTask: (type: string, config: any) => Promise<any>;
    updateTask: (id: string, type: string, config: any) => Promise<any>;
    toggleMiniMode: (isMini: boolean) => Promise<void>;
    startTask: (id: string) => Promise<boolean>;
    stopTask: (id: string) => Promise<boolean>;
    deleteTask: (id: string) => Promise<boolean>;
    getClipboardHistory: () => Promise<any[]>;
    clipboardCopy: (id: string) => Promise<boolean>;
    clipboardDelete: (id: string) => Promise<boolean>;
    clipboardClear: () => Promise<boolean>;
}

console.log('Renderer script initializing...');

// DOM Elements
const foreverList = document.getElementById('forever-list') as HTMLUListElement;
const dayList = document.getElementById('day-task-list') as HTMLUListElement;
const createModal = document.getElementById('create-modal') as HTMLDivElement;
const configContainer = document.getElementById('config-fields') as HTMLDivElement;

// Inputs
const taskTypeSelect = document.getElementById('task-type') as HTMLSelectElement;
const taskNameInput = document.getElementById('task-name') as HTMLInputElement;
const taskForeverCheck = document.getElementById('task-forever') as HTMLInputElement;
const taskStartInput = document.getElementById('task-start') as HTMLInputElement;
const taskEndInput = document.getElementById('task-end') as HTMLInputElement;
const taskCronInput = document.getElementById('task-cron') as HTMLInputElement;
const intervalValue = document.getElementById('interval-value') as HTMLInputElement;
const intervalUnit = document.getElementById('interval-unit') as HTMLSelectElement;
const cronPreview = document.getElementById('cron-preview') as HTMLSpanElement;

// Calendar Elements
const calendarGrid = document.getElementById('calendar-grid') as HTMLDivElement;
const currentMonthLabel = document.getElementById('current-month-label') as HTMLHeadingElement;
const selectedDateLabel = document.getElementById('selected-date-label') as HTMLHeadingElement;

// State
let currentDate = new Date(); // Month view
let selectedDate = new Date(); // Selected day (default today)

// --- Helper Functions ---

function toDateInputString(date: Date): string {
    return date.toISOString().split('T')[0];
}

function areDatesEqual(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

// --- Config Templates (Chinese) ---
const CONFIG_TEMPLATES = {
    http: `
        <div class="form-group"><label>请求地址 (URL)</label><input type="text" id="conf-url" placeholder="https://api.example.com"></div>
        <div class="form-group"><label>请求方法</label><select id="conf-method"><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select></div>
        
        <div class="form-group">
            <label>请求头 (Headers) <button type="button" class="btn-add-row" onclick="addKvRow('headers-container')">+ 添加</button></label>
            <div id="headers-container"></div>
        </div>

        <div class="form-group">
            <label>Cookie <button type="button" class="btn-add-row" onclick="addKvRow('cookies-container')">+ 添加</button></label>
            <div id="cookies-container"></div>
        </div>

        <div class="form-group"><label>请求体 (JSON)</label><textarea id="conf-body" rows="3">{}</textarea></div>
    `,
    exe: `
        <div class="form-group"><label>程序路径</label><input type="text" id="conf-path" placeholder="C:\\Windows\\System32\\calc.exe"></div>
        <div class="form-group"><label>启动参数 (空格分隔)</label><input type="text" id="conf-args" placeholder="/c dir"></div>
    `,
    popup: `
        <div class="form-group"><label>弹窗标题</label><input type="text" id="conf-title" placeholder="提醒"></div>
        <div class="form-group"><label>弹窗内容</label><input type="text" id="conf-message" placeholder="该喝水了！"></div>
    `,
    log: `
        <div class="form-group"><label>日志内容</label><textarea id="conf-content" rows="5" placeholder="在此输入备忘录内容..."></textarea></div>
    `,
    countdown: `
        <div class="form-group"><label>倒计时时长</label>
            <div style="display: flex; gap: 8px; align-items: center;">
                <input type="number" id="conf-cd-days" value="0" min="0" style="flex:1;"><span>天</span>
                <input type="number" id="conf-cd-hours" value="0" min="0" max="23" style="flex:1;"><span>时</span>
                <input type="number" id="conf-cd-minutes" value="1" min="0" max="59" style="flex:1;"><span>分</span>
                <input type="number" id="conf-cd-seconds" value="0" min="0" max="59" style="flex:1;"><span>秒</span>
            </div>
        </div>
        <div class="form-group"><label>弹窗标题</label><input type="text" id="conf-cd-title" placeholder="倒计时提醒"></div>
        <div class="form-group"><label>弹窗内容</label><input type="text" id="conf-cd-message" placeholder="时间到！"></div>
    `
};

(window as any).editTask = (id: string) => {
    const tasks = (window as any).allTasksCache || [];
    const task = tasks.find((t: any) => t.id === id);
    if (!task) return;

    // 1. Open Modal
    createModal.style.display = 'flex';

    // 2. Set Mode to Edit
    (window as any).editingTaskId = id;
    document.querySelector('.modal-title')!.textContent = '编辑任务';
    const confirmBtn = document.querySelector('.modal button[onclick="createTask()"]') as HTMLButtonElement;
    if (confirmBtn) {
        confirmBtn.textContent = '保存修改';
        confirmBtn.onclick = updateTask; // Switch handler
    }

    // 3. Fill Fields
    taskTypeSelect.value = task.type;
    taskNameInput.value = task.config.name;
    taskForeverCheck.checked = !!task.config.isForever;

    if (task.config.startDate) taskStartInput.value = toDateInputString(new Date(task.config.startDate));
    if (task.config.endDate) taskEndInput.value = toDateInputString(new Date(task.config.endDate));

    // Cron (Reverse engineer is hard, just show raw value if possible, or try to parse)
    // For now, we just set the hidden input and preview. 
    // If we want to restore interval inputs, we'd need to parse cron "*/5 * * * * *" -> 5 seconds.
    // Let's try a simple parser for the specific format we generate.
    if (task.config.cronExpression) {
        taskCronInput.value = task.config.cronExpression;
        cronPreview.textContent = `Cron: ${task.config.cronExpression}`;

        // Try to restore interval inputs
        const parts = task.config.cronExpression.split(' ');
        if (parts.length >= 6) {
            if (parts[0].startsWith('*/')) {
                intervalUnit.value = 'second';
                intervalValue.value = parts[0].substring(2);
            } else if (parts[1].startsWith('*/')) {
                intervalUnit.value = 'minute';
                intervalValue.value = parts[1].substring(2);
            } else if (parts[2].startsWith('*/')) {
                intervalUnit.value = 'hour';
                intervalValue.value = parts[2].substring(2);
            } else if (parts[3].startsWith('*/')) {
                intervalUnit.value = 'day';
                intervalValue.value = parts[3].substring(2);
            }
        }
    }

    updateUIState(); // Refresh UI for type

    // 4. Fill Type Specific Fields
    // We need to wait for updateUIState to render the fields
    setTimeout(() => {
        if (task.type === 'http') {
            (document.getElementById('conf-url') as HTMLInputElement).value = task.config.url || '';
            (document.getElementById('conf-method') as HTMLSelectElement).value = task.config.method || 'GET';
            (document.getElementById('conf-body') as HTMLTextAreaElement).value = JSON.stringify(task.config.body || {}, null, 2);

            // Restore KV Rows
            const headersContainer = document.getElementById('headers-container');
            if (headersContainer && task.config.headers) {
                headersContainer.innerHTML = ''; // Clear empty rows
                Object.entries(task.config.headers).forEach(([k, v]) => {
                    headersContainer.insertAdjacentHTML('beforeend', createKvRowHTML(k, v as string));
                });
            }
            const cookiesContainer = document.getElementById('cookies-container');
            if (cookiesContainer && task.config.cookies) {
                cookiesContainer.innerHTML = '';
                Object.entries(task.config.cookies).forEach(([k, v]) => {
                    cookiesContainer.insertAdjacentHTML('beforeend', createKvRowHTML(k, v as string));
                });
            }

        } else if (task.type === 'exe') {
            (document.getElementById('conf-path') as HTMLInputElement).value = task.config.filePath || '';
            (document.getElementById('conf-args') as HTMLInputElement).value = (task.config.args || []).join(' ');
        } else if (task.type === 'popup') {
            (document.getElementById('conf-title') as HTMLInputElement).value = task.config.title || '';
            (document.getElementById('conf-message') as HTMLInputElement).value = task.config.message || '';
        } else if (task.type === 'log') {
            (document.getElementById('conf-content') as HTMLTextAreaElement).value = task.config.content || '';
        } else if (task.type === 'countdown') {
            (document.getElementById('conf-cd-days') as HTMLInputElement).value = String(task.config.days || 0);
            (document.getElementById('conf-cd-hours') as HTMLInputElement).value = String(task.config.hours || 0);
            (document.getElementById('conf-cd-minutes') as HTMLInputElement).value = String(task.config.minutes || 0);
            (document.getElementById('conf-cd-seconds') as HTMLInputElement).value = String(task.config.seconds || 0);
            (document.getElementById('conf-cd-title') as HTMLInputElement).value = task.config.title || '';
            (document.getElementById('conf-cd-message') as HTMLInputElement).value = task.config.message || '';
        }
    }, 0);
};

// Helper for KV with values
function createKvRowHTML(key: string = '', value: string = '') {
    return `
        <div class="kv-row">
            <input type="text" class="kv-key" placeholder="键 (Key)" value="${key}">
            <input type="text" class="kv-value" placeholder="值 (Value)" value="${value}">
            <button type="button" class="btn-remove-row" onclick="this.parentElement.remove()">×</button>
        </div>
    `;
}

// Global Handlers
(window as any).addKvRow = (containerId: string) => {
    const container = document.getElementById(containerId);
    if (container) {
        container.insertAdjacentHTML('beforeend', createKvRowHTML());
    }
};

(window as any).closeModal = () => {
    if (createModal) createModal.style.display = 'none';
};
async function updateTask() {
    const id = (window as any).editingTaskId;
    if (!id) return;

    const type = taskTypeSelect.value;
    const name = taskNameInput.value;
    // ... gather other fields same as create ...
    const isForever = taskForeverCheck.checked;
    const start = taskStartInput.value;
    const end = taskEndInput.value;
    const cron = taskCronInput.value;

    if (!name) { alert('请输入任务名称'); return; }

    let config: any = {
        name,
        startDate: start,
        endDate: end,
        isForever: type === 'log' ? false : isForever,
        cronExpression: cron
    };

    // Gather specific config (Duplicate logic, could be refactored)
    if (type === 'http') {
        config.url = (document.getElementById('conf-url') as HTMLInputElement).value;
        config.method = (document.getElementById('conf-method') as HTMLSelectElement).value;
        config.headers = getKvData('headers-container');
        config.cookies = getKvData('cookies-container');
        try {
            config.body = JSON.parse((document.getElementById('conf-body') as HTMLTextAreaElement).value);
        } catch (e) { config.body = {}; }
    } else if (type === 'exe') {
        config.filePath = (document.getElementById('conf-path') as HTMLInputElement).value;
        const argsStr = (document.getElementById('conf-args') as HTMLInputElement).value;
        config.args = argsStr.split(' ').filter(s => s.length > 0);
    } else if (type === 'popup') {
        config.title = (document.getElementById('conf-title') as HTMLInputElement).value;
        config.message = (document.getElementById('conf-message') as HTMLInputElement).value;
    } else if (type === 'log') {
        config.content = (document.getElementById('conf-content') as HTMLTextAreaElement).value;
    } else if (type === 'countdown') {
        config.days = parseInt((document.getElementById('conf-cd-days') as HTMLInputElement).value) || 0;
        config.hours = parseInt((document.getElementById('conf-cd-hours') as HTMLInputElement).value) || 0;
        config.minutes = parseInt((document.getElementById('conf-cd-minutes') as HTMLInputElement).value) || 0;
        config.seconds = parseInt((document.getElementById('conf-cd-seconds') as HTMLInputElement).value) || 0;
        config.title = (document.getElementById('conf-cd-title') as HTMLInputElement).value || '倒计时提醒';
        config.message = (document.getElementById('conf-cd-message') as HTMLInputElement).value || '时间到！';
    }

    try {
        await (window as any).electronAPI.updateTask(id, type, config);
        (window as any).closeModal();
        loadTasks();
    } catch (error) {
        console.error('Failed to update task:', error);
        alert('更新失败: ' + error);
    }
}

// Open Modal
const openCreateBtn = document.getElementById('btn-open-create');
if (openCreateBtn) {
    openCreateBtn.addEventListener('click', () => {
        createModal.style.display = 'flex';

        // Reset Mode
        (window as any).editingTaskId = null;
        const modalTitle = document.querySelector('.modal-title');
        if (modalTitle) modalTitle.textContent = '创建新任务';

        // Find confirm button
        const buttons = document.querySelectorAll('.modal button');
        let confirmBtn: HTMLButtonElement | null = null;
        buttons.forEach(btn => {
            if (btn.textContent?.includes('创建') || btn.textContent?.includes('保存')) {
                confirmBtn = btn as HTMLButtonElement;
            }
        });

        if (confirmBtn) {
            (confirmBtn as HTMLButtonElement).textContent = '确认创建';
            (confirmBtn as HTMLButtonElement).onclick = (window as any).createTask;
        }

        // 1. First, update UI State to reset DOM
        updateUIState();

        // 2. Then reset values (Wait for DOM to be ready)
        // Reset Fields
        taskNameInput.value = '';
        taskTypeSelect.value = 'http'; // Default
        taskForeverCheck.checked = false;

        const todayStr = toDateInputString(new Date());
        taskStartInput.value = todayStr;
        taskEndInput.value = todayStr;

        intervalValue.value = '5';
        intervalUnit.value = 'second';

        // Clear dynamic fields
        configContainer.innerHTML = '';

        updateCron();

        // 3. Force Focus
        setTimeout(() => {
            taskTypeSelect.focus();
        }, 50);
    });
}

// --- Global Handlers ---
let isMiniMode = false;
const btnMiniToggle = document.getElementById('btn-mini-toggle');
if (btnMiniToggle) {
    btnMiniToggle.addEventListener('click', async () => {
        isMiniMode = !isMiniMode;
        if (isMiniMode) {
            document.body.classList.add('mini-mode');
            btnMiniToggle.textContent = '❐'; // Restore icon
            btnMiniToggle.title = "返回普通模式";
        } else {
            document.body.classList.remove('mini-mode');
            btnMiniToggle.textContent = '⛶'; // Mini icon
            btnMiniToggle.title = "进入迷你模式";
        }
        await (window as any).electronAPI.toggleMiniMode(isMiniMode);
    });
}

(window as any).addKvRow = (containerId: string) => {
    const container = document.getElementById(containerId);
    if (container) {
        container.insertAdjacentHTML('beforeend', createKvRowHTML());
    }
};


// Create Task
(window as any).createTask = async () => {
    const type = taskTypeSelect.value;
    const name = taskNameInput.value;
    const isForever = taskForeverCheck.checked;
    const start = taskStartInput.value;
    const end = taskEndInput.value;
    const cron = taskCronInput.value;

    if (!name) {
        alert('请输入任务名称');
        return;
    }

    let config: any = {
        name,
        startDate: start,
        endDate: end,
        isForever: type === 'log' ? false : isForever,
        cronExpression: cron
    };

    // Gather specific config
    if (type === 'http') {
        config.url = (document.getElementById('conf-url') as HTMLInputElement).value;
        config.method = (document.getElementById('conf-method') as HTMLSelectElement).value;
        config.headers = getKvData('headers-container');
        config.cookies = getKvData('cookies-container');
        try {
            config.body = JSON.parse((document.getElementById('conf-body') as HTMLTextAreaElement).value);
        } catch (e) { config.body = {}; }
    } else if (type === 'exe') {
        config.filePath = (document.getElementById('conf-path') as HTMLInputElement).value;
        const argsStr = (document.getElementById('conf-args') as HTMLInputElement).value;
        config.args = argsStr.split(' ').filter(s => s.length > 0);
    } else if (type === 'popup') {
        config.title = (document.getElementById('conf-title') as HTMLInputElement).value;
        config.message = (document.getElementById('conf-message') as HTMLInputElement).value;
    } else if (type === 'log') {
        config.content = (document.getElementById('conf-content') as HTMLTextAreaElement).value;
    } else if (type === 'countdown') {
        config.days = parseInt((document.getElementById('conf-cd-days') as HTMLInputElement).value) || 0;
        config.hours = parseInt((document.getElementById('conf-cd-hours') as HTMLInputElement).value) || 0;
        config.minutes = parseInt((document.getElementById('conf-cd-minutes') as HTMLInputElement).value) || 0;
        config.seconds = parseInt((document.getElementById('conf-cd-seconds') as HTMLInputElement).value) || 0;
        config.title = (document.getElementById('conf-cd-title') as HTMLInputElement).value || '倒计时提醒';
        config.message = (document.getElementById('conf-cd-message') as HTMLInputElement).value || '时间到！';
    }

    try {
        await (window as any).electronAPI.createTask(type, config);
        (window as any).closeModal();
        loadTasks(); // Refresh UI
    } catch (error) {
        console.error('Failed to create task:', error);
        alert('创建失败: ' + error);
    }
};

function getKvData(containerId: string): Record<string, string> {
    const container = document.getElementById(containerId);
    if (!container) return {};
    const data: Record<string, string> = {};
    const rows = container.querySelectorAll('.kv-row');
    rows.forEach(row => {
        const key = (row.querySelector('.kv-key') as HTMLInputElement).value.trim();
        const value = (row.querySelector('.kv-value') as HTMLInputElement).value.trim();
        if (key) data[key] = value;
    });
    return data;
}

// --- UI Logic ---

function updateUIState() {
    const type = taskTypeSelect.value;
    const isForever = taskForeverCheck.checked;
    const scheduleGroup = document.getElementById('schedule-group');
    const dateRangeGroup = document.getElementById('date-range-inputs');

    // 1. Log tasks: No schedule, always date range
    if (type === 'log') {
        if (scheduleGroup) scheduleGroup.style.display = 'none';
        taskForeverCheck.parentElement!.style.display = 'none';
        if (dateRangeGroup) dateRangeGroup.style.display = 'flex';
    } else if (type === 'countdown') {
        // Countdown: no cron schedule, no forever, date range optional
        if (scheduleGroup) scheduleGroup.style.display = 'none';
        taskForeverCheck.parentElement!.style.display = 'none';
        if (dateRangeGroup) dateRangeGroup.style.display = 'none';
    } else {
        if (scheduleGroup) scheduleGroup.style.display = 'block';
        taskForeverCheck.parentElement!.style.display = 'flex';

        // 2. Toggle Date Range based on Forever
        if (isForever) {
            if (dateRangeGroup) dateRangeGroup.style.display = 'none';
        } else {
            if (dateRangeGroup) dateRangeGroup.style.display = 'flex';
        }
    }

    // 3. Update Config Fields
    configContainer.innerHTML = CONFIG_TEMPLATES[type as keyof typeof CONFIG_TEMPLATES] || '';
}

taskTypeSelect.addEventListener('change', updateUIState);
taskForeverCheck.addEventListener('change', updateUIState);

// Cron Generator
function updateCron() {
    if (!intervalValue || !intervalUnit) return;
    const val = intervalValue.value;
    const unit = intervalUnit.value;
    let cron = '';

    if (!val || parseInt(val) <= 0) {
        cron = '* * * * * *';
    } else {
        switch (unit) {
            case 'second': cron = `*/${val} * * * * *`; break;
            case 'minute': cron = `0 */${val} * * * *`; break;
            case 'hour': cron = `0 0 */${val} * * *`; break;
            case 'day': cron = `0 0 0 */${val} * *`; break;
        }
    }

    cronPreview.textContent = `Cron: ${cron}`;
    taskCronInput.value = cron;
}

intervalValue.addEventListener('input', updateCron);
intervalUnit.addEventListener('change', updateCron);

// --- Calendar Logic ---

(window as any).changeMonth = (offset: number) => {
    currentDate.setMonth(currentDate.getMonth() + offset);
    renderCalendar();
};

(window as any).goToToday = () => {
    currentDate = new Date();
    selectedDate = new Date(); // Select today too
    renderCalendar();
    renderDayTasks(); // Update right panel
};

async function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Fetch tasks (Fetch BEFORE clearing grid to avoid race condition with double rendering)
    const tasks = await (window as any).electronAPI.getTasks();

    currentMonthLabel.textContent = currentDate.toLocaleString('zh-CN', { month: 'long', year: 'numeric' });
    calendarGrid.innerHTML = '';

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayIndex = firstDay.getDay(); // 0 (Sun) - 6
    const totalDays = lastDay.getDate();

    // Empty cells
    for (let i = 0; i < startDayIndex; i++) {
        const div = document.createElement('div');
        div.className = 'cal-day empty';
        calendarGrid.appendChild(div);
    }

    // Days
    for (let d = 1; d <= totalDays; d++) {
        const div = document.createElement('div');
        const dayDate = new Date(year, month, d);

        div.className = 'cal-day';
        if (areDatesEqual(dayDate, new Date())) div.classList.add('today');
        if (areDatesEqual(dayDate, selectedDate)) div.classList.add('selected');

        // Click handler
        div.onclick = () => {
            selectedDate = new Date(year, month, d);
            renderCalendar(); // Re-render to update selection style
            renderDayTasks(); // Update right panel
        };

        div.innerHTML = `<span class="cal-date">${d}</span>`;

        // Render first 5 tasks (Prevent rendering dots logic which was removed)
        const tasksForDay = tasks.filter((task: any) => {
            if (task.config.isForever) return false;

            const start = task.config.startDate ? new Date(task.config.startDate) : null;
            const end = task.config.endDate ? new Date(task.config.endDate) : null;

            // Re-create dates to avoid mutation issues if reused
            const s = start ? new Date(start) : null;
            const e = end ? new Date(end) : null;
            const dDate = new Date(dayDate);

            if (s) s.setHours(0, 0, 0, 0);
            if (e) e.setHours(0, 0, 0, 0);
            dDate.setHours(0, 0, 0, 0);

            if (s && e) {
                return dDate >= s && dDate <= e;
            } else if (s) {
                return dDate >= s;
            }
            return false;
        });

        // Render first 5 tasks
        const displayLimit = 5;
        tasksForDay.slice(0, displayLimit).forEach((task: any) => {
            const item = document.createElement('div');
            item.className = `cal-task-item type-${task.type}`;
            const itemContent = document.createElement('div');
            itemContent.className = 'cal-task-item'; // Applying class to inner div if needed, but wait
            // The class is on the container in previous code block. Let's stick to the previous code structure.

            // Actually, my previous StrReplace might have failed if context wasn't perfect.
            // Let's ensure we replace the whole block correctly.
            item.textContent = task.config.name;
            item.title = task.config.name;
            div.appendChild(item);
        });

        if (tasksForDay.length > displayLimit) {
            const more = document.createElement('div');
            more.className = 'cal-more';
            more.textContent = `+${tasksForDay.length - displayLimit} 更多`;
            div.appendChild(more);
        }

        calendarGrid.appendChild(div);
    }
}

// --- List Render Logic ---

async function loadTasks() {
    const tasks = await (window as any).electronAPI.getTasks();
    (window as any).allTasksCache = tasks; // Cache for filtering

    renderForeverTasks(tasks);
    renderDayTasks(tasks);
    renderCalendar(); // Refresh calendar dots
}

function renderForeverTasks(tasks: any[]) {
    foreverList.innerHTML = '';
    const foreverTasks = tasks.filter((t: any) => t.config.isForever);

    foreverTasks.forEach((task: any) => {
        const li = createListItem(task);
        foreverList.appendChild(li);
    });
}

function renderDayTasks(tasks?: any[]) {
    // If called without tasks, use cache or fetch (but loadTasks calls this with tasks)
    const allTasks = tasks || (window as any).allTasksCache || [];

    // Update Header
    selectedDateLabel.textContent = `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日 任务`;

    dayList.innerHTML = '';

    // Filter logic
    const dayTasks = allTasks.filter((t: any) => {
        if (t.config.isForever) return false;

        const start = t.config.startDate ? new Date(t.config.startDate) : null;
        const end = t.config.endDate ? new Date(t.config.endDate) : null;
        const target = new Date(selectedDate);
        target.setHours(0, 0, 0, 0);

        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(0, 0, 0, 0);

        if (start && end) {
            return target >= start && target <= end;
        } else if (start) {
            return target >= start;
        }
        return false;
    });

    if (dayTasks.length === 0) {
        dayList.innerHTML = '<p style="color:#999; text-align:center;">今日无任务</p>';
    }

    dayTasks.forEach((task: any) => {
        const li = createListItem(task);
        dayList.appendChild(li);
    });
}

function createListItem(task: any) {
    const li = document.createElement('li');
    li.className = 'task-item';

    const isRunning = task.status === 'running';
    const statusClass = isRunning ? 'running' : 'stopped';
    const statusText = isRunning ? '运行中' : '已停止';

    const typeLabels: Record<string, string> = {
        http: '🌐 HTTP',
        exe: '⚙️ EXE',
        popup: '🔔 弹窗',
        log: '📝 日志',
        countdown: '⏰ 倒计时'
    };

    let content = `
        <div class="task-header">
            <span class="task-title">${task.config.name}</span>
            <span class="status ${statusClass}">${statusText}</span>
        </div>
        <div class="task-details">
            类型: ${typeLabels[task.type] || task.type}<br>
    `;

    if (task.type === 'countdown') {
        const parts = [];
        if (task.config.days) parts.push(`${task.config.days}天`);
        if (task.config.hours) parts.push(`${task.config.hours}时`);
        if (task.config.minutes) parts.push(`${task.config.minutes}分`);
        if (task.config.seconds) parts.push(`${task.config.seconds}秒`);
        content += `时长: ${parts.join('') || '0秒'}<br>`;
        content += `提醒: ${task.config.title} - ${task.config.message}`;
    } else if (task.type === 'log') {
        content += `内容: ${task.config.content || '无内容'}`;
    } else {
        content += `下次执行: ${task.nextExecution}`;
    }

    const canStartStop = task.type !== 'log';
    content += `</div>
        <div class="task-controls">
            ${canStartStop && !isRunning ? `<button class="btn-start" onclick="startTask('${task.id}')">启动</button>` : ''}
            ${canStartStop && isRunning ? `<button class="btn-stop" onclick="stopTask('${task.id}')">停止</button>` : ''}
            <button class="btn-nav" onclick="editTask('${task.id}')">编辑</button>
            <button class="btn-delete" onclick="deleteTask('${task.id}')">删除</button>
        </div>
    `;

    li.innerHTML = content;
    return li;
}

// --- Global Task Actions ---

(window as any).startTask = async (id: string) => {
    try { await (window as any).electronAPI.startTask(id); loadTasks(); } catch (e) { console.error(e); }
};

(window as any).stopTask = async (id: string) => {
    try { await (window as any).electronAPI.stopTask(id); loadTasks(); } catch (e) { console.error(e); }
};

(window as any).deleteTask = async (id: string) => {
    if (!confirm('确定要删除这个任务吗？')) { window.focus(); return; }
    window.focus(); // Restore keyboard focus after native confirm() dialog
    try { await (window as any).electronAPI.deleteTask(id); loadTasks(); } catch (e) { console.error(e); }
};

// Initial Load
updateUIState();
updateCron();
loadTasks();
setInterval(loadTasks, 5000); // Auto refresh

// --- Clipboard Panel Logic ---

const clipboardPanel = document.getElementById('clipboard-panel') as HTMLDivElement;
const clipboardList = document.getElementById('clipboard-list') as HTMLUListElement;
const btnClipboardToggle = document.getElementById('btn-clipboard-toggle') as HTMLButtonElement;
const btnCbClear = document.getElementById('btn-cb-clear') as HTMLButtonElement;
const sidebarTasks = document.getElementById('sidebar-tasks') as HTMLDivElement;

let isClipboardOpen = false;
let cbRefreshTimer: ReturnType<typeof setInterval> | null = null;

function toggleClipboardPanel(): void {
    isClipboardOpen = !isClipboardOpen;
    if (isClipboardOpen) {
        sidebarTasks.classList.add('hidden');
        clipboardPanel.classList.add('visible');
        btnClipboardToggle.classList.add('active');
        renderClipboardHistory();
        cbRefreshTimer = setInterval(renderClipboardHistory, 1000);
    } else {
        clipboardPanel.classList.remove('visible');
        sidebarTasks.classList.remove('hidden');
        btnClipboardToggle.classList.remove('active');
        if (cbRefreshTimer) {
            clearInterval(cbRefreshTimer);
            cbRefreshTimer = null;
        }
    }
}

btnClipboardToggle.addEventListener('click', toggleClipboardPanel);

btnCbClear.addEventListener('click', async () => {
    await (window as any).electronAPI.clipboardClear();
    renderClipboardHistory();
});

async function renderClipboardHistory(): Promise<void> {
    const history: any[] = await (window as any).electronAPI.getClipboardHistory();
    clipboardList.innerHTML = '';

    if (history.length === 0) {
        clipboardList.innerHTML = '<div class="cb-empty">暂无剪贴板记录<br><small>复制文字或图片后会自动记录</small></div>';
        return;
    }

    history.forEach((entry: any) => {
        const li = document.createElement('li');
        li.className = 'cb-item';

        const time = new Date(entry.timestamp);
        const timeStr = `${time.getMonth() + 1}/${time.getDate()} ${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;

        let contentHtml = '';
        if (entry.type === 'image' && entry.imageDataUrl) {
            contentHtml = `<img src="${entry.imageDataUrl}" alt="[图片]">`;
        } else {
            // Escape HTML to prevent XSS
            const escaped = (entry.preview || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            contentHtml = escaped;
        }

        li.innerHTML = `
            <div class="cb-item-time">${timeStr}</div>
            <div class="cb-item-content">${contentHtml}</div>
            <div class="cb-item-actions">
                <button class="btn-cb-copy" data-id="${entry.id}">复制</button>
                <button class="btn-cb-delete" data-id="${entry.id}">删除</button>
            </div>
        `;

        // Copy button
        li.querySelector('.btn-cb-copy')!.addEventListener('click', async () => {
            await (window as any).electronAPI.clipboardCopy(entry.id);
            // Brief visual feedback
            const btn = li.querySelector('.btn-cb-copy') as HTMLButtonElement;
            btn.textContent = '✓ 已复制';
            setTimeout(() => { btn.textContent = '复制'; }, 1000);
        });

        // Delete button
        li.querySelector('.btn-cb-delete')!.addEventListener('click', async () => {
            await (window as any).electronAPI.clipboardDelete(entry.id);
            renderClipboardHistory();
        });

        clipboardList.appendChild(li);
    });
}
