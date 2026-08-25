/**
 * Simple Pub/Sub EventBus Core Singleton
 * Facilitates reactive event messaging across application components.
 */
class EventBus {
    #listeners = new Map();

    on(event, callback) {
        if (!this.#listeners.has(event)) {
            this.#listeners.set(event, new Set());
        }
        this.#listeners.get(event).add(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (this.#listeners.has(event)) {
            this.#listeners.get(event).delete(callback);
        }
    }

    emit(event, data) {
        if (this.#listeners.has(event)) {
            this.#listeners.get(event).forEach((callback) => {
                try {
                    callback(data);
                } catch (err) {
                    console.error(`[EventBus] Error in listener for event "${event}":`, err);
                }
            });
        }
    }
}

export const eventBus = new EventBus();