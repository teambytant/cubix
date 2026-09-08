export type Face = "U" | "R" | "F" | "D" | "L" | "B";
export type Move = `${Face}${"" | "'" | "2"}`;
export type CubeState = Record<Face, string[]>;

export const FACE_COLORS: Record<Face, string> = {
  U: "#f4f1e8", R: "#ff714b", F: "#49a66b", D: "#f5d548", L: "#ff8a3d", B: "#3986f7",
};

export const SOLVED_STATE: CubeState = {
  U: Array(9).fill(FACE_COLORS.U), R: Array(9).fill(FACE_COLORS.R), F: Array(9).fill(FACE_COLORS.F),
  D: Array(9).fill(FACE_COLORS.D), L: Array(9).fill(FACE_COLORS.L), B: Array(9).fill(FACE_COLORS.B),
};

export function cloneState(state: CubeState): CubeState {
  return Object.fromEntries(Object.entries(state).map(([face, stickers]) => [face, [...stickers]])) as CubeState;
}

function rotateFace(stickers: string[], turns: number): string[] {
  let result = [...stickers];
  for (let turn = 0; turn < turns; turn += 1) result = [result[6], result[3], result[0], result[7], result[4], result[1], result[8], result[5], result[2]];
  return result;
}

const cycles: Record<Face, [Face, number[]][]> = {
  U: [["B", [0, 1, 2]], ["R", [0, 1, 2]], ["F", [0, 1, 2]], ["L", [0, 1, 2]]],
  D: [["F", [6, 7, 8]], ["R", [6, 7, 8]], ["B", [6, 7, 8]], ["L", [6, 7, 8]]],
  F: [["U", [6, 7, 8]], ["R", [0, 3, 6]], ["D", [2, 1, 0]], ["L", [8, 5, 2]]],
  B: [["U", [2, 1, 0]], ["L", [0, 3, 6]], ["D", [6, 7, 8]], ["R", [8, 5, 2]]],
  R: [["U", [8, 5, 2]], ["B", [0, 3, 6]], ["D", [8, 5, 2]], ["F", [8, 5, 2]]],
  L: [["U", [0, 3, 6]], ["F", [0, 3, 6]], ["D", [0, 3, 6]], ["B", [8, 5, 2]]],
};

export function applyMove(state: CubeState, move: Move): CubeState {
  const face = move[0] as Face;
  const turns = move.endsWith("2") ? 2 : move.endsWith("'") ? 3 : 1;
  const next = cloneState(state);
  next[face] = rotateFace(next[face], turns);
  const cycle = cycles[face];
  for (let group = 0; group < turns; group += 1) {
    const snapshot = cloneState(next);
    const carry = cycle[cycle.length - 1];
    for (let index = cycle.length - 1; index > 0; index -= 1) {
      const [targetFace, targetIndexes] = cycle[index];
      const [sourceFace, sourceIndexes] = cycle[index - 1];
      targetIndexes.forEach((targetIndex, stickerIndex) => { next[targetFace][targetIndex] = snapshot[sourceFace][sourceIndexes[stickerIndex]]; });
    }
    carry[1].forEach((sourceIndex, stickerIndex) => { next[cycle[0][0]][cycle[0][1][stickerIndex]] = snapshot[carry[0]][sourceIndex]; });
  }
  return next;
}

export function applyMoves(state: CubeState, moves: Move[]): CubeState { return moves.reduce(applyMove, state); }

export function scramble(length = 18): Move[] {
  const faces: Face[] = ["U", "R", "F", "D", "L", "B"];
  const suffixes = ["", "'", "2"] as const;
  const result: Move[] = [];
  while (result.length < length) {
    const face = faces[Math.floor(Math.random() * faces.length)];
    if (result.at(-1)?.[0] === face) continue;
    result.push(`${face}${suffixes[Math.floor(Math.random() * suffixes.length)]}` as Move);
  }
  return result;
}
