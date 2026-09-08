import type { Move } from "./cube";

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  audioContext ??= new AudioContext();
  if (audioContext.state === "suspended") void audioContext.resume();
  return audioContext;
}

export function playMoveSound(move: Move) {
  const context = getAudioContext();
  if (!context) return;

  const now = context.currentTime;
  const duration = move.endsWith("2") ? 0.28 : 0.2;
  const output = context.createGain();
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(0.16, now + 0.008);
  output.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  output.connect(context.destination);

  const click = context.createOscillator();
  click.type = "square";
  click.frequency.setValueAtTime(180, now);
  click.frequency.exponentialRampToValueAtTime(72, now + 0.06);
  click.connect(output);
  click.start(now);
  click.stop(now + duration);

  const friction = context.createOscillator();
  friction.type = "triangle";
  friction.frequency.setValueAtTime(390, now + 0.025);
  friction.frequency.exponentialRampToValueAtTime(130, now + duration);
  const frictionGain = context.createGain();
  frictionGain.gain.setValueAtTime(0.0001, now);
  frictionGain.gain.exponentialRampToValueAtTime(0.06, now + 0.035);
  frictionGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  friction.connect(frictionGain);
  frictionGain.connect(context.destination);
  friction.start(now);
  friction.stop(now + duration);
}
