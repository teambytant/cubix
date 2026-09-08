import type { Move } from "./cube";

export function advanceLesson(moves: Move[], step: number, move: Move) {
  if (step >= moves.length) return moves.length;
  return move === moves[step] ? step + 1 : 0;
}

export function lessonStep(moves: Move[] | undefined, savedStep: number, mastered: boolean) {
  const length = moves?.length || 0;
  if (mastered) return length;
  return Number.isInteger(savedStep) ? Math.max(0, Math.min(savedStep, length)) : 0;
}

export function keyboardMove(key: string, prime: boolean, double: boolean): Move | undefined {
  const face = key.toUpperCase();
  if (!["U", "D", "L", "R", "F", "B"].includes(face)) return;
  return `${face}${double ? "2" : prime ? "'" : ""}` as Move;
}

export function completedLessons(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const result: number[] = [];
  for (let id = 0; id <= 3 && value.includes(id); id++) result.push(id);
  return result;
}

export function exploredControls(value: unknown): Move[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((move): move is Move => typeof move === "string" && /^[UDLRFB]('|2)?$/.test(move)))];
}
