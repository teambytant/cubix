import { FACE_COLORS, Face } from "./cube";

export type ScanFace = { code: Face; name: string; stickers: string[]; source?: string };
export const SCAN_STORAGE_KEY = "cubix-scan-state";
export const SCAN_FACES: { code: Face; name: string }[] = [
  { code: "F", name: "Front" }, { code: "R", name: "Right" }, { code: "B", name: "Back" },
  { code: "L", name: "Left" }, { code: "U", name: "Top" }, { code: "D", name: "Bottom" },
];

function hexToRgb(hex: string) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
const palette = Object.values(FACE_COLORS).map((color) => ({ color, rgb: hexToRgb(color) }));

export function classifyColor(red: number, green: number, blue: number) {
  return palette.reduce((closest, candidate) => {
    const distance = Math.hypot(red - candidate.rgb[0], green - candidate.rgb[1], blue - candidate.rgb[2]);
    return distance < closest.distance ? { color: candidate.color, distance } : closest;
  }, { color: palette[0].color, distance: Infinity }).color;
}

export function sampleImage(source: CanvasImageSource, canvas: HTMLCanvasElement) {
  const size = 480;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];
  context.drawImage(source, 0, 0, size, size);
  const stickers: string[] = [];
  for (let row = 0; row < 3; row += 1) for (let column = 0; column < 3; column += 1) {
    const x = column * 160 + 42;
    const y = row * 160 + 42;
    const pixels = context.getImageData(x, y, 76, 76).data;
    let red = 0, green = 0, blue = 0, count = 0;
    for (let index = 0; index < pixels.length; index += 16) { red += pixels[index]; green += pixels[index + 1]; blue += pixels[index + 2]; count += 1; }
    stickers.push(classifyColor(red / count, green / count, blue / count));
  }
  return stickers;
}

export function validateScan(faces: ScanFace[]) {
  const counts = new Map<string, number>();
  faces.flatMap((face) => face.stickers).forEach((color) => counts.set(color, (counts.get(color) || 0) + 1));
  const errors: string[] = [];
  palette.forEach(({ color }) => { if (counts.get(color) !== 9) errors.push(`Expected 9 stickers of ${color}, found ${counts.get(color) || 0}.`); });
  faces.forEach((face) => { if (face.stickers[4] && face.stickers.some((sticker) => sticker !== face.stickers[4])) return; });
  return { valid: faces.length === 6 && errors.length === 0, errors, counts };
}
