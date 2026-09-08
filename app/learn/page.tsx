"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { applyMove, cloneState, Move, SOLVED_STATE } from "@/lib/cube";
import { playMoveSound } from "@/lib/cube-sound";

const CubeCanvas = dynamic(() => import("@/components/CubeCanvas"), { ssr: false });
const lessonMoves: Move[] = ["R", "U", "R'", "U'"];
const keyboardRows = [
  { label: "TOP / BOTTOM", keys: ["U", "U'", "D", "D'"] as Move[] },
  { label: "SIDES", keys: ["L", "L'", "R", "R'"] as Move[] },
  { label: "FRONT / BACK", keys: ["F", "F'", "B", "B'"] as Move[] },
];

export default function LearnPage() {
  const [state, setState] = useState(cloneState(SOLVED_STATE));
  const [step, setStep] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastInput, setLastInput] = useState("");
  const current = lessonMoves[step];

  function next(move = current) {
    setState((value) => applyMove(value, move));
    setStep((value) => (value + 1) % lessonMoves.length);
    setLastInput(move);
    if (soundEnabled) playMoveSound(move);
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const face = event.key.toUpperCase();
      if (!["U", "D", "L", "R", "F", "B"].includes(face)) return;
      event.preventDefault();
      next(`${face}${event.shiftKey ? "'" : ""}` as Move);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return (
    <main className="learn-page">
      <nav className="nav-shell"><Link className="brand" href="/">cube<span>sense</span><i /></Link><Link className="text-link" href="/">← Back home</Link></nav>
      <section className="learn-shell">
        <div className="lesson-content">
          <div className="lesson-content-heading"><div><div className="section-kicker font-mono">BEGINNER PATH / 01</div><h1>Learn to <em>read</em><br />the cube.</h1></div><span className="lesson-status font-mono">IN PROGRESS</span></div>
          <p className="lesson-intro">Algorithms are just small conversations between pieces. Start with a four-move loop and watch how it protects what you&apos;ve already solved.</p>
          <div className="step-card"><div className="step-count font-mono">STEP {step + 1} OF {lessonMoves.length}<span>{Math.round(((step + 1) / lessonMoves.length) * 100)}% COMPLETE</span></div><h2>Turn the <strong>{current[0] === "R" ? "right" : "top"} face {current.includes("'") ? "counter-clockwise" : "clockwise"}.</strong></h2><div className="notation">{current}</div><p>Tap the matching key below or use your keyboard. The highlighted face is the only part that moves.</p><button className="button button-acid" onClick={() => next()}>Perform {current} <span>→</span></button></div>
          <div className="lesson-footer font-mono"><span>PROGRESS</span><div><i style={{ width: `${((step + 1) / lessonMoves.length) * 100}%` }} /></div><span>{Math.round(((step + 1) / lessonMoves.length) * 100)}%</span><button className="sound-toggle lesson-sound-toggle" onClick={() => setSoundEnabled((enabled) => !enabled)} aria-pressed={soundEnabled} aria-label={soundEnabled ? "Mute move sounds" : "Enable move sounds"}>{soundEnabled ? "◖" : "◌"}</button></div>
        </div>

        <div className="lesson-cube">
          <div className="font-mono lesson-tag">LESSON 01 / THE FIRST LOOP</div>
          <CubeCanvas state={state} move={current} />
          <div className="lesson-cube-footer font-mono"><span>DRAG TO ROTATE</span><span>LIVE CUBE / {lastInput || "READY"}</span></div>
        </div>

        <div className="visual-keyboard">
          <div className="keyboard-heading"><div><div className="section-kicker font-mono">MOVE INPUT</div><h2>Use your <em>hands.</em></h2></div><span className="font-mono">SHIFT = PRIME MOVE</span></div>
          {keyboardRows.map((row) => <div className="keyboard-row" key={row.label}><span className="keyboard-row-label font-mono">{row.label}</span><div className="keyboard-keys">{row.keys.map((move) => <button className={move === current ? "active" : ""} key={move} onClick={() => next(move)} aria-label={`Perform ${move} move`}>{move}</button>)}</div></div>)}
        </div>
      </section>
    </main>
  );
}
