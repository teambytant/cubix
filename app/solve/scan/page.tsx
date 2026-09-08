"use client";

import Link from "next/link";
import { useState } from "react";

const faces = ["Front", "Right", "Back", "Left", "Top", "Bottom"];

export default function ScanPage() {
  const [active, setActive] = useState(0);
  const [captured, setCaptured] = useState<boolean[]>(Array(6).fill(false));
  const done = captured.filter(Boolean).length;
  function capture() { setCaptured((value) => value.map((item, index) => index === active ? true : item)); setActive((value) => Math.min(value + 1, 5)); }
  return <main className="scan-page"><nav className="nav-shell"><Link className="brand" href="/">cube<span>sense</span><i /></Link><Link className="text-link" href="/solve">← Change starting point</Link></nav><section className="scan-shell"><div className="section-kicker font-mono">SCAN MY CUBE / {done} OF 6 FACES</div><div className="scan-header"><div><h1>Let&apos;s map<br /><em>your cube.</em></h1><p>Keep the <strong>{faces[active].toLowerCase()}</strong> face inside the frame. Make sure the stickers are bright and the center piece is visible.</p></div><div className="capture-frame"><div className="frame-grid">{Array.from({ length: 9 }).map((_, index) => <i key={index} />)}</div><b>ALIGN THE {faces[active].toUpperCase()} FACE</b></div></div><div className="face-progress">{faces.map((face, index) => <button key={face} className={index === active ? "active" : ""} onClick={() => setActive(index)}><span className="face-index font-mono">0{index + 1}</span><span>{face}</span><i className={captured[index] ? "done" : ""}>{captured[index] ? "✓" : ""}</i></button>)}</div><div className="scan-actions"><button className="button button-acid" onClick={capture}>{captured[active] ? "Retake face" : `Capture ${faces[active]} face`} <span>↗</span></button><Link href={done === 6 ? "/solve/review" : "/solve/scan"} className={`button button-quiet ${done < 6 ? "disabled" : ""}`} onClick={(event) => { if (done < 6) event.preventDefault(); }}>{done === 6 ? "Review cube →" : `${6 - done} faces remaining`}</Link></div><p className="font-mono scan-footnote">CAMERA ACCESS STAYS IN YOUR BROWSER / NOTHING UPLOADED</p></section></main>;
}
