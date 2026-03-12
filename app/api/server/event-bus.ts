type EventListener = (event: any) => void;

const listeners: Set<EventListener> = new Set();

export function emitEvent(event: any) {
  listeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error("Event listener error:", error);
    }
  });
}

export function onEvent(listener: EventListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getListenerCount() {
  return listeners.size;
}
