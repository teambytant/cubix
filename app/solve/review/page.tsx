"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FACE_COLORS, Face } from "@/lib/cube";
import { orientScanFaces, rotateStickers, SCAN_FACES, SCAN_STORAGE_KEY, ScanFace, validateScan } from "@/lib/scan";
import Wordmark from "@/components/Wordmark";

const defaults = Object.values(FACE_COLORS);
const labels: Face[] = ["U", "L", "F", "R", "B", "D"];

export default function ReviewPage() {
  const [faces, setFaces] = useState<ScanFace[]>([]);
  const [selected, setSelected] = useState(defaults[0]);
  const [selectedSticker, setSelectedSticker] = useState<number | null>(null);
  const [activeIssue, setActiveIssue] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(SCAN_STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as ScanFace[];
      if (Array.isArray(parsed)) {
        setFaces(parsed);
        setSelected(parsed[0]?.stickers[4] || defaults[0]);
      }
    } catch {
      localStorage.removeItem(SCAN_STORAGE_KEY);
    }
  }, []);

  const colors = Array.from(new Set([...faces.map((face) => face.stickers[4]), selected])).filter(Boolean);
  const stickers = labels.flatMap((code) => faces.find((item) => item.code === code)?.stickers || Array(9).fill("#d9d7d1"));
  const validation = validateScan(faces);
  const highlighted = new Set((validation.issues[activeIssue]?.stickers || []).map((sticker) => `${sticker.face}:${sticker.index}`));

  useEffect(() => {
    if (activeIssue >= validation.issues.length) setActiveIssue(0);
  }, [activeIssue, validation.issues.length]);

  function changeSticker(index: number) {
    const faceIndex = Math.floor(index / 9);
    const stickerIndex = index % 9;
    const code = labels[faceIndex];
    const editedFaces = faces.map((face) => face.code === code
      ? { ...face, stickers: face.stickers.map((color, sticker) => sticker === stickerIndex ? selected : color) }
      : face);
    const nextFaces = orientScanFaces(editedFaces);
    setFaces(nextFaces);
    localStorage.setItem(SCAN_STORAGE_KEY, JSON.stringify(nextFaces));
    setSelectedSticker(index);
    setActiveIssue(0);
  }

  function rotateFace(code: Face) {
    const nextFaces = orientScanFaces(faces.map((face) => face.code === code ? { ...face, stickers: rotateStickers(face.stickers), orientation: ((face.orientation || 0) + 1) % 4 } : face));
    setFaces(nextFaces);
    localStorage.setItem(SCAN_STORAGE_KEY, JSON.stringify(nextFaces));
    setActiveIssue(0);
  }

  function stickerClass(face: Face, index: number, flatIndex: number) {
    return `${selectedSticker === flatIndex ? "sticker-selected " : ""}${highlighted.has(`${face}:${index}`) ? "sticker-attention" : ""}`;
  }

  function rescanFace(code: Face) {
    localStorage.setItem(`${SCAN_STORAGE_KEY}-active`, String(SCAN_FACES.findIndex((face) => face.code === code)));
  }

  function startOver() {
    localStorage.removeItem(SCAN_STORAGE_KEY);
    localStorage.removeItem(`${SCAN_STORAGE_KEY}-active`);
  }

  return (
    <main className="review-page">
      <nav className="nav-shell">
        <Link className="brand" href="/"><Wordmark /></Link>
        <Link className="text-link" href="/solve/scan">&larr; Back to scan</Link>
      </nav>
      <section className="review-shell">
        <div className="section-kicker font-mono">REVIEW / {faces.length} OF 6 FACES / 54 STICKERS</div>
        <div className="review-header">
          <div><h1>Does this<br /><em>look right?</em></h1><p>Each sticker was sampled in your browser. Select a color, then tap any sticker that looks wrong. Your six center stickers define the palette, including nonstandard colors. Add a missing shade with the color control.</p></div>
          <div className={`valid-state ${validation.valid ? "valid" : "invalid"}`}><i /> {validation.valid ? "STATE LOOKS VALID" : "REVIEW NEEDED"}<br /><span className="font-mono">{validation.valid ? "COLOR COUNTS MATCH" : `${validation.errors.length} CHECKS FAILED`}</span></div>
        </div>
        {faces.some((face) => face.orientation) && <p className="orientation-notice">Cubix aligned the captured face rotations automatically. You can still rotate or rescan a face if it does not match your cube.</p>}
        <div className="net">
          <div className="net-face net-u">{stickers.slice(0, 9).map((color, index) => <button key={index} style={{ background: color }} className={stickerClass("U", index, index)} onClick={() => changeSticker(index)} aria-label={`Edit U sticker ${index + 1}`} />)}</div>
          <div className="net-row">{[1, 2, 3, 4].map((face) => { const code = labels[face]; return <div className="net-face" key={code}>{stickers.slice(face * 9, face * 9 + 9).map((color, index) => <button key={index} style={{ background: color }} className={stickerClass(code, index, face * 9 + index)} onClick={() => changeSticker(face * 9 + index)} aria-label={`Edit ${code} sticker ${index + 1}`} />)}</div>; })}</div>
          <div className="net-face net-d">{stickers.slice(45).map((color, index) => <button key={index} style={{ background: color }} className={stickerClass("D", index, 45 + index)} onClick={() => changeSticker(45 + index)} aria-label={`Edit D sticker ${index + 1}`} />)}</div>
          <div className="net-labels font-mono">{labels.map((label) => <span key={label}>{label}</span>)}</div>
        </div>
        <div className="review-face-actions"><span className="font-mono">RESCAN A FACE</span>{labels.map((code) => <Link key={code} className="button button-quiet" href="/solve/scan" onClick={() => rescanFace(code)}>{code}</Link>)}<Link className="button button-quiet review-start-over" href="/solve/scan" onClick={startOver}>Start over</Link></div>
        <div className="review-face-actions rotate-face-actions"><span className="font-mono">ROTATE A FACE</span>{labels.map((code) => <button key={code} className="button button-quiet" onClick={() => rotateFace(code)} aria-label={`Rotate ${code} face clockwise`}>{code} ↻</button>)}</div>
        <div className="color-picker"><span className="font-mono">EDIT COLOR</span>{colors.map((color) => <button key={color} style={{ background: color }} className={selected === color ? "selected" : ""} onClick={() => setSelected(color)} aria-label={`Choose color ${color}`} />)}<label>Add color <input type="color" value={selected} onChange={(event) => setSelected(event.target.value)} aria-label="Add a custom cube color" /></label></div>
        {!validation.valid && <div className="validation-errors"><strong>What needs attention</strong><p className="issue-instruction">The matching stickers are outlined in orange. Choose an item to focus its highlights.</p>{validation.issues.map((issue, index) => <button key={`${issue.message}-${index}`} className={index === activeIssue ? "issue-active" : ""} onClick={() => setActiveIssue(index)}><span>{index + 1}</span>{issue.message}</button>)}</div>}
        <Link className={`button button-dark review-next ${validation.valid ? "" : "disabled"}`} href={validation.valid ? "/learn" : "/solve/review"} onClick={(event) => { if (!validation.valid) event.preventDefault(); }}>{validation.valid ? "Build my solution" : "Correct the highlighted state"} <span>&rarr;</span></Link>
      </section>
    </main>
  );
}
