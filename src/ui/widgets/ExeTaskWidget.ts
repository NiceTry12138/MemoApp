import { TaskWidgetManager } from '../TaskWidgetManager';

TaskWidgetManager.register('exe', {
    label: '⚙️ 运行程序',

    template: `
        <div class="form-group"><label>程序路径</label><input type="text" id="conf-path" placeholder="C:\\Windows\\System32\\calc.exe"></div>
        <div class="form-group"><label>启动参数 (空格分隔)</label><input type="text" id="conf-args" placeholder="/c dir"></div>
    `,

    readConfig() {
        const argsStr = (document.getElementById('conf-args') as HTMLInputElement).value;
        return {
            filePath: (document.getElementById('conf-path') as HTMLInputElement).value,
            args: argsStr.split(' ').filter(s => s.length > 0),
        };
    },

    fillConfig(config) {
        (document.getElementById('conf-path') as HTMLInputElement).value = config.filePath ?? '';
        (document.getElementById('conf-args') as HTMLInputElement).value = (config.args ?? []).join(' ');
    },
});
