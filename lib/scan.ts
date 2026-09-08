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
  return { valid: errors.length === 0, errors, counts };
}
