import { TaskWidgetManager } from '../TaskWidgetManager';

TaskWidgetManager.register('countdown', {
    label: '⏰ 倒计时提醒',

    template: `
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
    `,

    readConfig() {
        return {
            days:    parseInt((document.getElementById('conf-cd-days') as HTMLInputElement).value) || 0,
            hours:   parseInt((document.getElementById('conf-cd-hours') as HTMLInputElement).value) || 0,
            minutes: parseInt((document.getElementById('conf-cd-minutes') as HTMLInputElement).value) || 0,
            seconds: parseInt((document.getElementById('conf-cd-seconds') as HTMLInputElement).value) || 0,
            title:   (document.getElementById('conf-cd-title') as HTMLInputElement).value || '倒计时提醒',
            message: (document.getElementById('conf-cd-message') as HTMLInputElement).value || '时间到！',
        };
    },

    fillConfig(config) {
        (document.getElementById('conf-cd-days') as HTMLInputElement).value    = String(config.days ?? 0);
        (document.getElementById('conf-cd-hours') as HTMLInputElement).value   = String(config.hours ?? 0);
        (document.getElementById('conf-cd-minutes') as HTMLInputElement).value = String(config.minutes ?? 0);
        (document.getElementById('conf-cd-seconds') as HTMLInputElement).value = String(config.seconds ?? 0);
        (document.getElementById('conf-cd-title') as HTMLInputElement).value   = config.title ?? '';
        (document.getElementById('conf-cd-message') as HTMLInputElement).value = config.message ?? '';
    },
});
