import { IRepository } from './IRepository';
import { JsonFileRepository } from './JsonFileRepository';
import { ITaskDefinition, IAppSettings } from '../core/types';

// ---------------------------------------------------------------------------
// Unified application model
// ---------------------------------------------------------------------------

export interface IAppModel {
    tasks: ITaskDefinition[];
    settings: IAppSettings;
}

const DEFAULT_MODEL: IAppModel = {
    tasks: [],
    settings: {
        taskTypeOrder: ['http', 'exe', 'popup', 'log', 'countdown'],
        closeAction: 'quit',
    },
};

// ---------------------------------------------------------------------------
// AppStore — single source of truth for all persistent application data.
//
// Both TaskManager and SettingsManager depend on this class.
// To switch the storage backend (e.g. from plain JSON → encrypted file →
// SQLite → remote DB), change only the IRepository<IAppModel> implementation
// passed in the constructor — nothing else needs to change.
// ---------------------------------------------------------------------------

export class AppStore {
    private readonly repository: IRepository<IAppModel>;
    private model: IAppModel;

    constructor(repository?: IRepository<IAppModel>) {
        this.repository = repository ?? new JsonFileRepository<IAppModel>('app_data.json');
        const loaded = this.repository.load();
        // Deep-merge so that new fields added to DEFAULT_MODEL always have values
        this.model = {
            tasks:    loaded?.tasks    ?? DEFAULT_MODEL.tasks,
            settings: { ...DEFAULT_MODEL.settings, ...(loaded?.settings ?? {}) },
        };
    }

    // --- Task section ---

    getTasks(): ITaskDefinition[] {
        return this.model.tasks;
    }

    saveTasks(tasks: ITaskDefinition[]): void {
        this.model.tasks = tasks;
        this.repository.save(this.model);
    }

    // --- Settings section ---

    getSettings(): IAppSettings {
        return this.model.settings;
    }

    saveSettings(settings: IAppSettings): void {
        this.model.settings = settings;
        this.repository.save(this.model);
    }
}

/** Singleton used by the entire main process. */
export const appStore = new AppStore();
