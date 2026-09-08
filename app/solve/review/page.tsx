"use client";

import Link from "next/link";
import { useState } from "react";

const colors = ["#f4f1e8", "#ff714b", "#49a66b", "#f5d548", "#ff8a3d", "#3986f7"];
const labels = ["U", "L", "F", "R", "B", "D"];

export default function ReviewPage() {
  const [selected, setSelected] = useState(0);
  const [stickers, setStickers] = useState(Array.from({ length: 54 }, (_, index) => colors[Math.floor(index / 9)]));
  function changeSticker(index: number) { setStickers((value) => value.map((color, stickerIndex) => stickerIndex === index ? colors[selected] : color)); }
  return <main className="review-page"><nav className="nav-shell"><Link className="brand" href="/">cube<span>sense</span><i /></Link><Link className="text-link" href="/solve/scan">← Back to scan</Link></nav><section className="review-shell"><div className="section-kicker font-mono">REVIEW / 54 STICKERS DETECTED</div><div className="review-header"><div><h1>Does this<br /><em>look right?</em></h1><p>We&apos;ve mapped each face from your photos. Tap any sticker to correct its color before we check whether the cube can exist in the real world.</p></div><div className="valid-state"><i /> STATE LOOKS VALID<br /><span className="font-mono">READY TO SOLVE</span></div></div><div className="net"><div className="net-face net-u">{stickers.slice(0, 9).map((color, index) => <button key={index} style={{ background: color }} onClick={() => changeSticker(index)} aria-label={`Edit U sticker ${index + 1}`} />)}</div><div className="net-row">{[1, 2, 3, 4].map((face) => <div className="net-face" key={face}>{stickers.slice(face * 9, face * 9 + 9).map((color, index) => <button key={index} style={{ background: color }} onClick={() => changeSticker(face * 9 + index)} aria-label={`Edit face sticker ${index + 1}`} />)}</div>)}</div><div className="net-face net-d">{stickers.slice(45).map((color, index) => <button key={index} style={{ background: color }} onClick={() => changeSticker(45 + index)} aria-label={`Edit D sticker ${index + 1}`} />)}</div><div className="net-labels font-mono">{labels.map((label) => <span key={label}>{label}</span>)}</div></div><div className="color-picker"><span className="font-mono">EDIT COLOR</span>{colors.map((color, index) => <button key={color} style={{ background: color }} className={selected === index ? "selected" : ""} onClick={() => setSelected(index)} aria-label={`Choose color ${index + 1}`} />)}</div><Link className="button button-dark review-next" href="/learn">Build my solution <span>→</span></Link></section></main>;
}
