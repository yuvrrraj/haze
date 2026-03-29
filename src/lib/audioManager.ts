// Global audio manager — only one sound plays at a time

type StopFn = () => void;

let currentStop: StopFn | null = null;

export function registerAudio(stopFn: StopFn): void {
  if (currentStop) currentStop();
  currentStop = stopFn;
}

export function unregisterAudio(stopFn: StopFn): void {
  if (currentStop === stopFn) currentStop = null;
}

export function stopAllAudio(): void {
  if (currentStop) { currentStop(); currentStop = null; }
}
