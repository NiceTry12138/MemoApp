import { TaskWidgetManager } from '../TaskWidgetManager';

TaskWidgetManager.register('popup', {
    label: '🔔 系统弹窗',

    template: `
        <div class="form-group"><label>弹窗标题</label><input type="text" id="conf-title" placeholder="提醒"></div>
        <div class="form-group"><label>弹窗内容</label><input type="text" id="conf-message" placeholder="该喝水了！"></div>
    `,

    readConfig() {
        return {
            title: (document.getElementById('conf-title') as HTMLInputElement).value,
            message: (document.getElementById('conf-message') as HTMLInputElement).value,
        };
    },

    fillConfig(config) {
        (document.getElementById('conf-title') as HTMLInputElement).value = config.title ?? '';
        (document.getElementById('conf-message') as HTMLInputElement).value = config.message ?? '';
    },
});
