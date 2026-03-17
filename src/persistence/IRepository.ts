/**
 * Generic persistence interface.
 *
 * T — the in-memory data model to be persisted (e.g. ITaskDefinition[], ClipboardEntry[]).
 *
 * Swap implementations to change the storage backend without touching business logic:
 *   - JsonFileRepository<T>      plain-text JSON file (current default)
 *   - EncryptedFileRepository<T> AES-encrypted local file
 *   - SqliteRepository<T>        embedded SQLite database
 *   - RemoteRepository<T>        REST / cloud database
 */
export interface IRepository<T> {
    /**
     * Load data from the backing store.
     * Returns null when no data exists yet (first run) or when the store is
     * unreachable / the data cannot be parsed — callers should treat null as
     * "start with an empty state".
     */
    load(): T | null;

    /**
     * Persist data to the backing store.
     * Implementations should be synchronous where possible so that data is
     * never lost on an unexpected process exit.
     */
    save(data: T): void;
}
