"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { applyMove, cloneState, Move, SOLVED_STATE } from "@/lib/cube";
import { playMoveSound } from "@/lib/cube-sound";

const CubeCanvas = dynamic(() => import("@/components/CubeCanvas"), { ssr: false });
const keyboardRows = [
  { label: "TOP / BOTTOM", keys: ["U", "U'", "U2", "D", "D'", "D2"] as Move[] },
  { label: "LEFT / RIGHT", keys: ["L", "L'", "L2", "R", "R'", "R2"] as Move[] },
  { label: "FRONT / BACK", keys: ["F", "F'", "F2", "B", "B'", "B2"] as Move[] },
];
const faceGuides = [
  { face: "U", name: "Up", axis: "top layer", meaning: "Turn the top layer while keeping the front of the cube facing you." },
  { face: "D", name: "Down", axis: "bottom layer", meaning: "Turn the bottom layer. This changes the lower row of the front face." },
  { face: "L", name: "Left", axis: "left layer", meaning: "Turn the left side. Use it to move pieces into or out of the left column." },
  { face: "R", name: "Right", axis: "right layer", meaning: "Turn the right side. This is often used to place a corner or edge without losing your grip." },
  { face: "F", name: "Front", axis: "front layer", meaning: "Turn the face looking at you. It changes the visible front stickers and both side edges." },
  { face: "B", name: "Back", axis: "back layer", meaning: "Turn the hidden back layer while the front of the cube stays your reference." },
];
const LEARN_STORAGE_KEY = "cubix-learn-progress";

type Level = { id: number; title: string; summary: string; task: string; moves?: Move[] };
const levels: Level[] = [
  { id: 0, title: "The briefing", summary: "Meet the cube, its language, and the controls.", task: "Read the essentials, then enter your first practice level." },
  { id: 1, title: "Turn with intention", summary: "Learn to make one deliberate face turn at a time.", task: "Perform R, R', U, U' in order.", moves: ["R", "R'", "U", "U'"] },
  { id: 2, title: "Read the notation", summary: "Connect symbols to clockwise, prime, and double turns.", task: "Perform F, F2, B, B' in order.", moves: ["F", "F2", "B", "B'"] },
  { id: 3, title: "Keep your bearings", summary: "Move around the cube without losing your orientation.", task: "Perform L, U, L', U' in order.", moves: ["L", "U", "L'", "U'"] },
];

export default function LearnPage() {
  const [state, setState] = useState(cloneState(SOLVED_STATE));
  const [level, setLevel] = useState(0);
  const [taskStep, setTaskStep] = useState(0);
  const [completed, setCompleted] = useState<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastInput, setLastInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [exploredMoves, setExploredMoves] = useState<Move[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const currentLevel = levels[level];
  const targetMove = currentLevel.moves?.[taskStep];
  const isBriefing = level === 0;
  const controlTourComplete = level !== 1 || exploredMoves.length === 18;
  const needsControlTour = level === 1 && !controlTourComplete;

  useEffect(() => {
    const saved = localStorage.getItem(LEARN_STORAGE_KEY);
    if (saved) {
      try {
        const progress = JSON.parse(saved) as { state?: typeof SOLVED_STATE; level?: number; taskStep?: number; completed?: number[]; soundEnabled?: boolean; lastInput?: string; exploredMoves?: Move[] };
        if (progress.state) setState(progress.state);
        if (typeof progress.level === "number" && levels[progress.level]) setLevel(progress.level);
        if (typeof progress.taskStep === "number") setTaskStep(progress.taskStep);
        if (progress.completed) setCompleted(progress.completed);
        if (typeof progress.soundEnabled === "boolean") setSoundEnabled(progress.soundEnabled);
        if (progress.lastInput) setLastInput(progress.lastInput);
        if (progress.exploredMoves) setExploredMoves(progress.exploredMoves);
      } catch { localStorage.removeItem(LEARN_STORAGE_KEY); }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LEARN_STORAGE_KEY, JSON.stringify({ state, level, taskStep, completed, soundEnabled, lastInput, exploredMoves }));
  }, [completed, exploredMoves, hydrated, lastInput, level, soundEnabled, state, taskStep]);

  function performMove(move: Move) {
    setState((value) => applyMove(value, move));
    setLastInput(move);
    if (soundEnabled) playMoveSound(move);
    const nextExploredMoves = exploredMoves.includes(move) ? exploredMoves : [...exploredMoves, move];
    setExploredMoves(nextExploredMoves);
    if (isBriefing || !currentLevel.moves) return;
    if (needsControlTour) {
      setFeedback(nextExploredMoves.length === 18 ? "All controls explored. The mastery task is unlocked below." : `${move} explored. Try every control above before the mastery task unlocks (${nextExploredMoves.length}/18).`);
      return;
    }
    if (move !== targetMove) {
      setTaskStep(0);
      setFeedback(`That was ${move}. Start this task again with ${currentLevel.moves[0]}.`);
      return;
    }
    const nextStep = taskStep + 1;
    if (nextStep === currentLevel.moves.length) {
      setCompleted((value) => value.includes(level) ? value : [...value, level]);
      setFeedback(`Level ${level} mastered. You are ready for the next idea.`);
    } else {
      setTaskStep(nextStep);
      setFeedback("Good. Now make the next intentional turn.");
    }
  }

  function openLevel(id: number) {
    if (id > 0 && !completed.includes(id - 1)) return;
    setLevel(id);
    setTaskStep(0);
    setFeedback("");
  }

  function startLevelOne() { setCompleted((value) => value.includes(0) ? value : [...value, 0]); setLevel(1); setTaskStep(0); setFeedback(""); }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const face = event.key.toUpperCase();
      if (!["U", "D", "L", "R", "F", "B"].includes(face)) return;
      event.preventDefault();
      performMove(`${face}${event.shiftKey ? "'" : ""}` as Move);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return (
    <main className="learn-page">
      <nav className="nav-shell"><Link className="brand" href="/">cube<span>sense</span><i /></Link><Link className="text-link" href="/">← Back home</Link></nav>
      <section className="learn-shell">
        <div className="curriculum-rail"><div className="section-kicker font-mono">YOUR LEARNING PATH</div><div className="level-list">{levels.map((item) => { const unlocked = item.id === 0 || completed.includes(item.id - 1); const done = completed.includes(item.id); return <button className={`level-item ${item.id === level ? "selected" : ""} ${done ? "done" : ""}`} disabled={!unlocked} key={item.id} onClick={() => openLevel(item.id)}><span className="level-number font-mono">0{item.id}</span><span><strong>{item.title}</strong><small>{item.summary}</small></span><i>{done ? "✓" : unlocked ? "→" : "×"}</i></button>; })}</div></div>

        <div className="lesson-content">
          <div className="lesson-content-heading"><div><div className="section-kicker font-mono">LEVEL 0{level} / {isBriefing ? "FOUNDATIONS" : "MASTERY TASK"}</div><h1>{isBriefing ? <>Start with<br /><em>the basics.</em></> : <>Learn to<br /><em>read</em> the cube.</>}</h1></div><span className="lesson-status font-mono">{completed.includes(level) ? "MASTERED" : "IN PROGRESS"}</span></div>
          {isBriefing ? <div className="briefing-copy"><p className="lesson-intro">A Rubik&apos;s Cube is a puzzle of moving layers. Your goal is to return every face to one color. You do that by moving one face at a time while protecting the pieces you already understand.</p><div className="basics-grid"><article><span className="font-mono">01 / PIECES</span><h2>Centers set the color.</h2><p>Center pieces stay in the middle of each face. They tell you where that face belongs.</p></article><article><span className="font-mono">02 / LAYERS</span><h2>Edges have two colors.</h2><p>Corner pieces have three. Each piece has one correct home based on its colors.</p></article><article><span className="font-mono">03 / NOTATION</span><h2>Letters name faces.</h2><p>R means Right. A prime mark means counter-clockwise. 2 means turn twice.</p></article><article><span className="font-mono">04 / CONTROL</span><h2>Keep one front face.</h2><p>Hold the cube steady, choose a face, then make the exact turn the instruction asks for.</p></article></div><button className="button button-acid" onClick={startLevelOne}>Begin level 1 <span>→</span></button></div> : <><p className="lesson-intro">{currentLevel.summary} {level === 1 ? "First learn what every control means, then prove you can use a short sequence." : "Follow the task exactly. Accuracy matters more than speed."}</p>{level === 1 && <div className="control-tour"><div className="control-tour-head"><strong>Control tour</strong><span className="font-mono">{exploredMoves.length} / 18 explored</span></div><p>Tap each key once. The cube will show the physical layer that moves.</p><div className="face-guide-grid">{faceGuides.map((guide) => <article key={guide.face}><div><b>{guide.face}</b><span><strong>{guide.name} face</strong><small>{guide.axis}</small></span></div><p>{guide.meaning}</p><em>Prime <b>{guide.face}&apos;</b> reverses it. Double <b>{guide.face}2</b> turns twice.</em></article>)}</div></div>}<div className={`step-card ${needsControlTour ? "locked-task" : ""}`}><div className="step-count font-mono">TASK {taskStep + 1} OF {currentLevel.moves?.length}<span>{needsControlTour ? "CONTROL TOUR REQUIRED" : `${Math.round((taskStep / (currentLevel.moves?.length || 1)) * 100)}% COMPLETE`}</span></div><h2>{needsControlTour ? "Explore every control first." : currentLevel.task}</h2><div className="notation">{needsControlTour ? "?" : targetMove}</div><p>{feedback || (needsControlTour ? "The mastery task unlocks after you try U, D, L, R, F, B and each prime and double variation." : "Tap the matching key below or use your keyboard. A wrong move resets this task so you learn the sequence, not just the motion.")}</p><button className="button button-acid" disabled={needsControlTour} onClick={() => targetMove && performMove(targetMove)}>{needsControlTour ? "Explore controls" : `Perform ${targetMove}`} <span>→</span></button></div><div className="lesson-footer font-mono"><span>MASTERY</span><div><i style={{ width: `${(taskStep / (currentLevel.moves?.length || 1)) * 100}%` }} /></div><span>{taskStep}/{currentLevel.moves?.length}</span><button className="sound-toggle lesson-sound-toggle" onClick={() => setSoundEnabled((enabled) => !enabled)} aria-pressed={soundEnabled} aria-label={soundEnabled ? "Mute move sounds" : "Enable move sounds"}>{soundEnabled ? "◖" : "◌"}</button></div></>}
        </div>

        <div className="lesson-cube"><div className="font-mono lesson-tag">LEVEL 0{level} / PRACTICE STAGE</div><CubeCanvas state={state} move={targetMove} /><div className="lesson-cube-footer font-mono"><span>DRAG TO ROTATE</span><span>LAST MOVE / {lastInput || "READY"}</span></div></div>

        {!isBriefing && <div className="visual-keyboard"><div className="keyboard-heading"><div><div className="section-kicker font-mono">MOVE INPUT</div><h2>Use your <em>hands.</em></h2></div><span className="font-mono">SHIFT = PRIME MOVE / 2 = DOUBLE</span></div>{keyboardRows.map((row) => <div className="keyboard-row" key={row.label}><span className="keyboard-row-label font-mono">{row.label}</span><div className="keyboard-keys">{row.keys.map((move) => <button className={`${move === targetMove ? "active" : ""} ${exploredMoves.includes(move) ? "explored" : ""}`} key={move} onClick={() => performMove(move)} aria-label={`Perform ${move} move`}>{move}{level === 1 && exploredMoves.includes(move) && <small>✓</small>}</button>)}</div></div>)}</div>}
      </section>
    </main>
  );
}
