"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FACE_COLORS, Face } from "@/lib/cube";
import { SCAN_FACES, SCAN_STORAGE_KEY, ScanFace, validateScan } from "@/lib/scan";
import Wordmark from "@/components/Wordmark";

const defaults = Object.values(FACE_COLORS);
const labels: Face[] = ["U", "L", "F", "R", "B", "D"];

export default function ReviewPage() {
  const [faces, setFaces] = useState<ScanFace[]>([]);
  const [selected, setSelected] = useState(defaults[0]);
  const [selectedSticker, setSelectedSticker] = useState<number | null>(null);

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

  function changeSticker(index: number) {
    const faceIndex = Math.floor(index / 9);
    const stickerIndex = index % 9;
    const code = labels[faceIndex];
    const nextFaces = faces.map((face) => face.code === code
      ? { ...face, stickers: face.stickers.map((color, sticker) => sticker === stickerIndex ? selected : color) }
      : face);
    setFaces(nextFaces);
    localStorage.setItem(SCAN_STORAGE_KEY, JSON.stringify(nextFaces));
    setSelectedSticker(index);
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
        <div className="net">
          <div className="net-face net-u">{stickers.slice(0, 9).map((color, index) => <button key={index} style={{ background: color }} className={selectedSticker === index ? "sticker-selected" : ""} onClick={() => changeSticker(index)} aria-label={`Edit U sticker ${index + 1}`} />)}</div>
          <div className="net-row">{[1, 2, 3, 4].map((face) => <div className="net-face" key={face}>{stickers.slice(face * 9, face * 9 + 9).map((color, index) => <button key={index} style={{ background: color }} className={selectedSticker === face * 9 + index ? "sticker-selected" : ""} onClick={() => changeSticker(face * 9 + index)} aria-label={`Edit face sticker ${index + 1}`} />)}</div>)}</div>
          <div className="net-face net-d">{stickers.slice(45).map((color, index) => <button key={index} style={{ background: color }} className={selectedSticker === 45 + index ? "sticker-selected" : ""} onClick={() => changeSticker(45 + index)} aria-label={`Edit D sticker ${index + 1}`} />)}</div>
          <div className="net-labels font-mono">{labels.map((label) => <span key={label}>{label}</span>)}</div>
        </div>
        <div className="review-face-actions"><span className="font-mono">RESCAN A FACE</span>{labels.map((code) => <Link key={code} className="button button-quiet" href="/solve/scan" onClick={() => rescanFace(code)}>{code}</Link>)}<Link className="button button-quiet review-start-over" href="/solve/scan" onClick={startOver}>Start over</Link></div>
        <div className="color-picker"><span className="font-mono">EDIT COLOR</span>{colors.map((color) => <button key={color} style={{ background: color }} className={selected === color ? "selected" : ""} onClick={() => setSelected(color)} aria-label={`Choose color ${color}`} />)}<label>Add color <input type="color" value={selected} onChange={(event) => setSelected(event.target.value)} aria-label="Add a custom cube color" /></label></div>
        {!validation.valid && <div className="validation-errors"><strong>What needs attention</strong>{validation.errors.slice(0, 3).map((error) => <p key={error}>{error}</p>)}</div>}
        <Link className={`button button-dark review-next ${validation.valid ? "" : "disabled"}`} href={validation.valid ? "/learn" : "/solve/review"} onClick={(event) => { if (!validation.valid) event.preventDefault(); }}>{validation.valid ? "Build my solution" : "Correct the highlighted state"} <span>&rarr;</span></Link>
      </section>
    </main>
  );
}
