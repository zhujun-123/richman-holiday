let context: AudioContext | null = null;

export function playChime(kind: 'roll' | 'good' = 'good') {
  try {
    context ??= new AudioContext();
    void context.resume();
    const notes = kind === 'roll' ? [330, 440, 554] : [523, 659, 784];
    notes.forEach((frequency, i) => {
      const oscillator = context!.createOscillator();
      const volume = context!.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      const start = context!.currentTime + i * .075;
      volume.gain.setValueAtTime(0, start);
      volume.gain.linearRampToValueAtTime(.045, start + .015);
      volume.gain.exponentialRampToValueAtTime(.001, start + .24);
      oscillator.connect(volume);
      volume.connect(context!.destination);
      oscillator.start(start);
      oscillator.stop(start + .26);
    });
  } catch { /* Audio is optional; unavailable audio must never block a turn. */ }
}
