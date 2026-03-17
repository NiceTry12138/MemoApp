import { AppStore } from '../persistence/AppStore';
import { IAppSettings } from './types';

// Re-export for backward compatibility
export { IAppSettings } from './types';

export class SettingsManager {
    private readonly store: AppStore;

    constructor(store: AppStore) {
        this.store = store;
    }

    load(): IAppSettings {
        return this.store.getSettings();
    }

    save(settings: IAppSettings): void {
        this.store.saveSettings(settings);
    }
}
