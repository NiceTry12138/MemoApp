import { TaskWidgetManager } from '../TaskWidgetManager';

// Helper shared across HTTP widget
function createKvRowHTML(key = '', value = '') {
    return `<div class="kv-row">
        <input type="text" class="kv-key" placeholder="键 (Key)" value="${key}">
        <input type="text" class="kv-value" placeholder="值 (Value)" value="${value}">
        <button type="button" class="btn-remove-row" onclick="this.parentElement.remove()">×</button>
    </div>`;
}

function getKvData(containerId: string): Record<string, string> {
    const container = document.getElementById(containerId);
    if (!container) return {};
    const data: Record<string, string> = {};
    container.querySelectorAll('.kv-row').forEach(row => {
        const key = (row.querySelector('.kv-key') as HTMLInputElement).value.trim();
        const val = (row.querySelector('.kv-value') as HTMLInputElement).value.trim();
        if (key) data[key] = val;
    });
    return data;
}

TaskWidgetManager.register('http', {
    label: '🌐 HTTP 请求',

    template: `
        <div class="form-group"><label>请求地址 (URL)</label><input type="text" id="conf-url" placeholder="https://api.example.com"></div>
        <div class="form-group"><label>请求方法</label>
            <select id="conf-method"><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select>
        </div>
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

    readConfig() {
        const config: Record<string, any> = {
            url: (document.getElementById('conf-url') as HTMLInputElement).value,
            method: (document.getElementById('conf-method') as HTMLSelectElement).value,
            headers: getKvData('headers-container'),
            cookies: getKvData('cookies-container'),
        };
        try {
            config.body = JSON.parse((document.getElementById('conf-body') as HTMLTextAreaElement).value);
        } catch { config.body = {}; }
        return config;
    },

    fillConfig(config) {
        (document.getElementById('conf-url') as HTMLInputElement).value = config.url ?? '';
        (document.getElementById('conf-method') as HTMLSelectElement).value = config.method ?? 'GET';
        (document.getElementById('conf-body') as HTMLTextAreaElement).value = JSON.stringify(config.body ?? {}, null, 2);

        const headersContainer = document.getElementById('headers-container');
        if (headersContainer && config.headers) {
            headersContainer.innerHTML = '';
            Object.entries(config.headers).forEach(([k, v]) => {
                headersContainer.insertAdjacentHTML('beforeend', createKvRowHTML(k, v as string));
            });
        }
        const cookiesContainer = document.getElementById('cookies-container');
        if (cookiesContainer && config.cookies) {
            cookiesContainer.innerHTML = '';
            Object.entries(config.cookies).forEach(([k, v]) => {
                cookiesContainer.insertAdjacentHTML('beforeend', createKvRowHTML(k, v as string));
            });
        }
    },
});
