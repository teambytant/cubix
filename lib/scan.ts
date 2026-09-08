import { Face } from "./cube";

export type ScanFace = { code: Face; name: string; stickers: string[]; samples?: string[]; source?: string };
export const SCAN_STORAGE_KEY = "cubix-scan-state";
export const SCAN_FACES: { code: Face; name: string }[] = [
  { code: "F", name: "Front" }, { code: "R", name: "Right" }, { code: "B", name: "Back" },
  { code: "L", name: "Left" }, { code: "U", name: "Top" }, { code: "D", name: "Bottom" },
];
const rgb = (hex: string) => [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
const hex = (values: number[]) => "#" + values.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("");

// OKLab separates lightness from chroma so shadows have less influence than hue.
function lab(color: string) {
  const [r, g, b] = rgb(color).map((value) => { const s = value / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4; });
  const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b);
  const m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b);
  const s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s];
}
export function colorDistance(a: string, b: string) {
  const x = lab(a), y = lab(b);
  return Math.hypot((x[0] - y[0]) * .5, x[1] - y[1], x[2] - y[2]);
}
export function classifyColor(red: number, green: number, blue: number, palette: string[] = []) {
  const sample = hex([red, green, blue]);
  return palette.length ? palette.reduce((best, color) => colorDistance(sample, color) < colorDistance(sample, best) ? color : best) : sample;
}
export function calibrateScan(faces: ScanFace[]): ScanFace[] {
  if (faces.length !== 6) return faces;
  const palette = faces.map((face) => (face.samples || face.stickers)[4]);
  return faces.map((face) => ({ ...face, stickers: (face.samples || face.stickers).map((sample, index) => index === 4 ? palette[faces.indexOf(face)] : classifyColor(...rgb(sample) as [number, number, number], palette)) }));
}
export type Crop = { x: number; y: number; size: number };
export function sampleImage(source: CanvasImageSource, canvas: HTMLCanvasElement, crop?: Crop) {
  canvas.width = canvas.height = 480;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];
  if (crop) context.drawImage(source, crop.x, crop.y, crop.size, crop.size, 0, 0, 480, 480);
  else context.drawImage(source, 0, 0, 480, 480);
  const stickers: string[] = [];
  for (let row = 0; row < 3; row++) for (let column = 0; column < 3; column++) {
    const pixels = context.getImageData(column * 160 + 48, row * 160 + 48, 64, 64).data;
    const channels: number[][] = [[], [], []];
    for (let i = 0; i < pixels.length; i += 16) channels.forEach((channel, c) => channel.push(pixels[i + c]));
    // Median suppresses small highlights, seams, and center logos.
    stickers.push(hex(channels.map((channel) => channel.sort((a, b) => a - b)[Math.floor(channel.length / 2)])));
  }
  return stickers;
}

type Facelet = [Face, number];
const CORNER_FACELETS: Facelet[][] = [
  [["U", 8], ["R", 0], ["F", 2]], [["U", 6], ["F", 0], ["L", 2]],
  [["U", 0], ["L", 0], ["B", 2]], [["U", 2], ["B", 0], ["R", 2]],
  [["D", 2], ["F", 8], ["R", 6]], [["D", 0], ["L", 8], ["F", 6]],
  [["D", 6], ["B", 8], ["L", 6]], [["D", 8], ["R", 8], ["B", 6]],
];
const CORNER_COLORS: Face[][] = [
  ["U", "R", "F"], ["U", "F", "L"], ["U", "L", "B"], ["U", "B", "R"],
  ["D", "F", "R"], ["D", "L", "F"], ["D", "B", "L"], ["D", "R", "B"],
];
const EDGE_FACELETS: Facelet[][] = [
  [["U", 5], ["R", 1]], [["U", 7], ["F", 1]], [["U", 3], ["L", 1]], [["U", 1], ["B", 1]],
  [["D", 5], ["R", 7]], [["D", 1], ["F", 7]], [["D", 3], ["L", 7]], [["D", 7], ["B", 7]],
  [["F", 5], ["R", 3]], [["F", 3], ["L", 5]], [["B", 5], ["L", 3]], [["B", 3], ["R", 5]],
];
const EDGE_COLORS: Face[][] = [
  ["U", "R"], ["U", "F"], ["U", "L"], ["U", "B"], ["D", "R"], ["D", "F"],
  ["D", "L"], ["D", "B"], ["F", "R"], ["F", "L"], ["B", "L"], ["B", "R"],
];

function permutationParity(permutation: number[]) {
  let inversions = 0;
  for (let index = 0; index < permutation.length; index += 1) {
    for (let next = index + 1; next < permutation.length; next += 1) {
      if (permutation[index] > permutation[next]) inversions += 1;
    }
  }
  return inversions % 2;
}

function validatePhysicalState(faces: ScanFace[]) {
  const byCode = new Map(faces.map((face) => [face.code, face]));
  const colorAt = ([face, index]: Facelet) => byCode.get(face)?.stickers[index];
  const centers = Object.fromEntries(SCAN_FACES.map(({ code }) => [code, byCode.get(code)?.stickers[4]])) as Record<Face, string | undefined>;
  const colorFace = (color: string | undefined) => (Object.keys(centers) as Face[]).find((face) => centers[face] === color);
  const errors: string[] = [];
  const cornerPermutation: number[] = [];
  const cornerOrientation: number[] = [];
  const edgePermutation: number[] = [];
  const edgeOrientation: number[] = [];

  for (const facelets of CORNER_FACELETS) {
    const colors = facelets.map(colorAt);
    let orientation = colors.findIndex((color) => colorFace(color) === "U" || colorFace(color) === "D");
    if (orientation < 0) { errors.push("A corner is missing its top or bottom color."); continue; }
    const first = colorFace(colors[(orientation + 1) % 3]);
    const second = colorFace(colors[(orientation + 2) % 3]);
    const piece = CORNER_COLORS.findIndex((colorsForPiece) => colorsForPiece[1] === first && colorsForPiece[2] === second);
    if (piece < 0) { errors.push("A corner has a color combination that cannot exist on this cube."); continue; }
    cornerPermutation.push(piece);
    cornerOrientation.push(orientation % 3);
  }

  for (const facelets of EDGE_FACELETS) {
    const first = colorFace(colorAt(facelets[0]));
    const second = colorFace(colorAt(facelets[1]));
    let piece = EDGE_COLORS.findIndex((colorsForPiece) => colorsForPiece[0] === first && colorsForPiece[1] === second);
    let orientation = 0;
    if (piece < 0) {
      piece = EDGE_COLORS.findIndex((colorsForPiece) => colorsForPiece[0] === second && colorsForPiece[1] === first);
      orientation = 1;
    }
    if (piece < 0) { errors.push("An edge has a color combination that cannot exist on this cube."); continue; }
    edgePermutation.push(piece);
    edgeOrientation.push(orientation);
  }

  if (errors.length) return errors;
  if (new Set(cornerPermutation).size !== 8) errors.push("A corner piece appears more than once or another corner is missing.");
  if (new Set(edgePermutation).size !== 12) errors.push("An edge piece appears more than once or another edge is missing.");
  if (cornerOrientation.reduce((total, value) => total + value, 0) % 3 !== 0) errors.push("A single corner is twisted. Check the corner stickers and face orientation.");
  if (edgeOrientation.reduce((total, value) => total + value, 0) % 2 !== 0) errors.push("A single edge is flipped. Check the edge stickers and face orientation.");
  if (cornerPermutation.length === 8 && edgePermutation.length === 12 && permutationParity(cornerPermutation) !== permutationParity(edgePermutation)) errors.push("Two pieces are swapped. This arrangement cannot be reached by legal cube turns.");
  return errors;
}

export function validateScan(faces: ScanFace[]) {
  const counts = new Map<string, number>();
  const errors: string[] = [];
  if (faces.length !== 6 || new Set(faces.map((face) => face.code)).size !== 6 || SCAN_FACES.some(({ code }) => !faces.some((face) => face.code === code))) errors.push("Capture all six faces once.");
  faces.forEach((face) => { if (face.stickers.length !== 9) errors.push(`${face.name} needs nine stickers.`); });
  faces.flatMap((face) => face.stickers).forEach((color) => counts.set(color, (counts.get(color) || 0) + 1));
  const centers = faces.map((face) => face.stickers[4]);
  if (new Set(centers).size !== 6) errors.push("The six center stickers must have different colors.");
  centers.forEach((color, index) => {
    if (counts.get(color) !== 9) errors.push(`Expected 9 stickers matching the ${faces[index].name.toLowerCase()} center (${color}), found ${counts.get(color) || 0}.`);
    if (centers.slice(0, index).some((other) => color && other && colorDistance(color, other) < .025)) errors.push(`${faces[index].name} center is very similar to another center. Check the photo or correct its color.`);
  });
  if ([...counts.keys()].some((color) => !centers.includes(color))) errors.push("Every sticker must match one of your six center colors.");
  if (errors.length === 0) errors.push(...validatePhysicalState(faces));
  return { valid: errors.length === 0, errors, counts };
}
