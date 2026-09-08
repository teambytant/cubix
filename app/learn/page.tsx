"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { applyMove, cloneState, Move, SOLVED_STATE } from "@/lib/cube";
import { playMoveSound } from "@/lib/cube-sound";

const CubeCanvas = dynamic(() => import("@/components/CubeCanvas"), { ssr: false });
const lessonMoves: Move[] = ["R", "U", "R'", "U'"];

export default function LearnPage() {
  const [state, setState] = useState(cloneState(SOLVED_STATE));
  const [step, setStep] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const current = lessonMoves[step];
  function next() { setState((value) => applyMove(value, current)); setStep((value) => (value + 1) % lessonMoves.length); if (soundEnabled) playMoveSound(current); }
  return <main className="learn-page"><nav className="nav-shell"><Link className="brand" href="/">cube<span>sense</span><i /></Link><Link className="text-link" href="/">← Back home</Link></nav><section className="learn-layout"><div className="lesson-cube"><div className="font-mono lesson-tag">LESSON 01 / THE FIRST LOOP</div><CubeCanvas state={state} move={current} /></div><div className="lesson-panel"><div className="section-kicker font-mono">BEGINNER PATH / 01</div><h1>Learn to<br /><em>read</em> the cube.</h1><p className="lesson-intro">Algorithms are just small conversations between pieces. We&apos;ll start with a four-move loop and watch how it protects what you&apos;ve already solved.</p><div className="step-card"><div className="step-count font-mono">STEP {step + 1} OF {lessonMoves.length}</div><h2>Turn the <strong>{current[0] === "R" ? "right" : "top"} face {current.includes("'") ? "counter-clockwise" : "clockwise"}.</strong></h2><div className="notation">{current}</div><p>Keep the front of the cube facing you. The highlighted face is the only part that moves.</p><button className="button button-acid" onClick={next}>Perform {current} <span>→</span></button></div><div className="lesson-footer font-mono"><span>PROGRESS</span><div><i style={{ width: `${((step + 1) / lessonMoves.length) * 100}%` }} /></div><span>{Math.round(((step + 1) / lessonMoves.length) * 100)}%</span><button className="sound-toggle lesson-sound-toggle" onClick={() => setSoundEnabled((enabled) => !enabled)} aria-pressed={soundEnabled} aria-label={soundEnabled ? "Mute move sounds" : "Enable move sounds"}>{soundEnabled ? "◖" : "◌"}</button></div></div></section></main>;
}
