/**
 * Shared domain types used by both TaskManager and SettingsManager.
 * Defined here to avoid circular imports between the managers and AppStore.
 */

export interface ITaskDefinition {
    id: string;
    type: string;   // Open string so new types never require changing this file
    config: any;
    status: 'running' | 'stopped';
}

export interface IAppSettings {
    /** Ordered list of task-type keys shown in the create-task dropdown */
    taskTypeOrder: string[];
    /** What happens when the user clicks the window close button */
    closeAction: 'quit' | 'tray';
}
