import { TaskWidgetManager } from '../TaskWidgetManager';

TaskWidgetManager.register('log', {
    label: '📝 日志/备忘录',

    template: `
        <div class="form-group"><label>日志内容</label><textarea id="conf-content" rows="5" placeholder="在此输入备忘录内容..."></textarea></div>
    `,

    readConfig() {
        return {
            content: (document.getElementById('conf-content') as HTMLTextAreaElement).value,
        };
    },

    fillConfig(config) {
        (document.getElementById('conf-content') as HTMLTextAreaElement).value = config.content ?? '';
    },
});
