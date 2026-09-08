"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { applyMove, cloneState, Move, SOLVED_STATE } from "@/lib/cube";
import { advanceLesson, lessonStep, keyboardMove, completedLessons, exploredControls } from "@/lib/learn";
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
  const [replaying, setReplaying] = useState(false);
  const doubleHeld = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const currentLevel = levels[level];
  const mastered = completed.includes(level) && !replaying;
  const progressStep = lessonStep(currentLevel.moves, taskStep, mastered);
  const targetMove = currentLevel.moves?.[progressStep];
  const nextLevel = levels[level + 1];
  const isBriefing = level === 0;
  const controlTourComplete = completed.includes(1) || level !== 1 || exploredMoves.length === 18;
  const needsControlTour = level === 1 && !controlTourComplete;

  useEffect(() => {
    const saved = localStorage.getItem(LEARN_STORAGE_KEY);
    if (saved) {
      try {
        const progress = JSON.parse(saved) as { state?: typeof SOLVED_STATE; level?: number; taskStep?: number; completed?: number[]; soundEnabled?: boolean; lastInput?: string; exploredMoves?: Move[]; replaying?: boolean };
        if (progress.state && Object.keys(SOLVED_STATE).every((face) => { const stickers = progress.state![face as keyof typeof SOLVED_STATE]; return Array.isArray(stickers) && stickers.length === 9 && stickers.every((color) => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)); })) setState(progress.state);
        const restoredCompleted = completedLessons(progress.completed);
        const restoredLevel = Number.isInteger(progress.level) && levels[progress.level!] && (progress.level === 0 || restoredCompleted.includes(progress.level! - 1)) ? progress.level! : 0;
        const restoredStep = lessonStep(levels[restoredLevel].moves, progress.taskStep ?? 0, false);
        if (restoredLevel > 0 && restoredStep === levels[restoredLevel].moves?.length && !restoredCompleted.includes(restoredLevel)) restoredCompleted.push(restoredLevel);
        setLevel(restoredLevel);
        setTaskStep(restoredStep);
        setCompleted(restoredCompleted);
        setReplaying(progress.replaying === true && restoredStep < (levels[restoredLevel].moves?.length || 0));
        if (typeof progress.soundEnabled === "boolean") setSoundEnabled(progress.soundEnabled);
        if (typeof progress.lastInput === "string") setLastInput(progress.lastInput);
        setExploredMoves(exploredControls(progress.exploredMoves));
      } catch { localStorage.removeItem(LEARN_STORAGE_KEY); }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(LEARN_STORAGE_KEY, JSON.stringify({ state, level, taskStep, completed, soundEnabled, lastInput, exploredMoves, replaying }));
  }, [replaying, completed, exploredMoves, hydrated, lastInput, level, soundEnabled, state, taskStep]);

  function performMove(move: Move) {
    if (!hydrated) return;
    setState((value) => applyMove(value, move));
    setLastInput(move);
    if (soundEnabled) playMoveSound(move);
    const nextExploredMoves = exploredMoves.includes(move) ? exploredMoves : [...exploredMoves, move];
    setExploredMoves(nextExploredMoves);
    if (isBriefing || mastered || !currentLevel.moves) return;
    if (needsControlTour) {
      setFeedback(nextExploredMoves.length === 18 ? "All controls explored. You are ready for the four-move challenge." : `${move} explored. Try each remaining control to unlock the challenge (${nextExploredMoves.length}/18).`);
      return;
    }
    const nextStep = advanceLesson(currentLevel.moves, progressStep, move);
    setTaskStep(nextStep);
    if (nextStep === 0) {
      setFeedback(`That was ${move}. Start this task again with ${currentLevel.moves[0]}.`);
      return;
    }
    if (nextStep === currentLevel.moves.length) {
      setReplaying(false);
      setCompleted((value) => value.includes(level) ? value : [...value, level]);
      setFeedback(`Level ${level} mastered. You are ready for the next idea.`);
    } else {
      setFeedback("Good. Now make the next intentional turn.");
    }
  }

  function replayLevel() { setReplaying(true); setTaskStep(0); setFeedback(""); }

  function openLevel(id: number) {
    if (id > 0 && !completed.includes(id - 1)) return;
    if (id === level) return;
    setReplaying(false);
    setLevel(id);
    setTaskStep(0);
    setFeedback("");
  }

  function startLevelOne() { setReplaying(false); setCompleted((value) => value.includes(0) ? value : [...value, 0]); setLevel(1); setTaskStep(0); setFeedback(""); }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.code === "Digit2" || event.code === "Numpad2") { doubleHeld.current = true; event.preventDefault(); return; }
      const move = keyboardMove(event.key, event.shiftKey, doubleHeld.current);
      if (!move) return;
      event.preventDefault();
      performMove(move);
    }
    function releaseDouble(event: KeyboardEvent) { if (event.code === "Digit2" || event.code === "Numpad2") doubleHeld.current = false; }
    function resetDouble() { doubleHeld.current = false; }
    window.addEventListener("keydown", handleKey);
    window.addEventListener("keyup", releaseDouble);
    window.addEventListener("blur", resetDouble);
    return () => { window.removeEventListener("keydown", handleKey); window.removeEventListener("keyup", releaseDouble); window.removeEventListener("blur", resetDouble); };
  });

  const remainingControls = keyboardRows.flatMap((row) => row.keys).filter((move) => !exploredMoves.includes(move));
  const suggestedMove = needsControlTour ? remainingControls[0] : targetMove;
  const moveGuide = faceGuides.find((guide) => guide.face === suggestedMove?.[0]);
  const percent = needsControlTour ? Math.round(exploredMoves.length / 18 * 100) : Math.round(progressStep / (currentLevel.moves?.length || 1) * 100);
  const concepts = [
    { eyebrow: "YOUR FIRST LOOK", title: "Meet the pieces", text: "Centers have one color, edges have two, and corners have three. The centers tell you which color belongs on each face.", tip: "Drag the cube to look around. Before a sequence, return to the same front-facing view." },
    { eyebrow: "ONE TURN AT A TIME", title: "A move and its opposite", text: "R turns the right face clockwise. R' turns it back. Try every face and variation, then practice a short sequence with the right and top layers.", tip: "Clockwise is always judged as if you were looking straight at the face you are turning." },
    { eyebrow: "READ THE SYMBOLS", title: "One letter. Three moves.", text: "F is a clockwise quarter turn. F' is a counterclockwise quarter turn. F2 is a half turn: two quarter turns count as one instruction.", tip: "For F2, tap the F2 key once. On your keyboard, hold 2 and press F." },
    { eyebrow: "KEEP YOUR REFERENCE", title: "Move layers, keep your front", text: "Use the left and top layers in sequence. The letters still name the same faces even when you drag the digital cube to inspect it.", tip: "Watch where a corner travels after each turn. This sequence does not need to leave the cube solved." },
  ];
  const concept = concepts[level];

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [level]);

  return (
    <main className="learn-page learning-workspace">
      <nav className="nav-shell"><Link className="brand" href="/">cube<span>sense</span><i /></Link><Link className="text-link" href="/">&larr; Back home</Link></nav>
      <section className="learn-shell">
        <nav className="curriculum-rail" aria-label="Learning path">
          <div className="path-heading"><span className="section-kicker font-mono">THE FOUNDATIONS</span><span>{completed.filter((id) => id > 0).length} of 3 lessons mastered</span></div>
          <div className="level-list">{levels.map((item) => {
            const unlocked = item.id === 0 || completed.includes(item.id - 1);
            const done = completed.includes(item.id);
            return <button className={`level-item ${item.id === level ? "selected" : ""} ${done ? "done" : ""}`} disabled={!hydrated || !unlocked} key={item.id} onClick={() => openLevel(item.id)} aria-current={item.id === level ? "step" : undefined} title={!unlocked ? `Complete level ${item.id - 1} to unlock` : item.title}>
              <span className="level-number font-mono">{done ? "\u2713" : `0${item.id}`}</span><span><small>{!unlocked ? "LOCKED" : done ? "MASTERED" : item.id === level ? "YOU ARE HERE" : "READY"}</small><strong>{item.title}</strong></span>
            </button>;
          })}</div>
        </nav>

        <header className="lesson-overview">
          <div><div className="section-kicker font-mono">LEVEL 0{level} / {isBriefing ? "WELCOME" : `LESSON ${level} OF 3`}</div><h1 ref={headingRef} tabIndex={-1}>{currentLevel.title}<span>.</span></h1><p>{currentLevel.summary}</p></div>
          <span className={`learning-status ${mastered ? "is-complete" : ""}`}>{!hydrated ? "Loading progress..." : replaying ? "Practice mode" : mastered ? "Mastered" : isBriefing ? "Start here" : needsControlTour ? "01 / Explore" : "02 / Practice"}</span>
        </header>

        <div className="lesson-workbench">
          <div className="lesson-guidance">
            <article className="concept-card">
              <span className="section-kicker font-mono">{concept.eyebrow}</span><h2>{concept.title}</h2><p>{concept.text}</p>
              {level === 2 && <div className="notation-legend">{[["F", "Quarter turn"], ["F'", "Reverse turn"], ["F2", "Half turn"]].map(([symbol, label]) => <div key={symbol}><b>{symbol}</b><span>{label}</span></div>)}</div>}
              <aside className="lesson-tip"><strong>Keep in mind</strong><p>{concept.tip}</p></aside>
            </article>

            {isBriefing ? <article className="challenge-card briefing-checklist"><span className="section-kicker font-mono">HOW YOU'LL LEARN</span><h2>Look. Turn. Understand.</h2><ol><li><b>Explore the controls</b><span>See which layer moves and try its variations.</span></li><li><b>Follow four moves</b><span>A clear prompt guides you through each sequence.</span></li><li><b>Build on each lesson</b><span>Finish the sequence to unlock the next idea.</span></li></ol><button className="button button-acid" disabled={!hydrated} onClick={startLevelOne}>{completed.includes(1) ? "Revisit level 1" : "Begin level 1"}<span>&rarr;</span></button><small>Your progress is saved in this browser.</small></article> :
              <article className={`challenge-card ${mastered ? "challenge-complete" : ""}`}>
                <div className="challenge-heading"><span className="section-kicker font-mono">{mastered ? "LESSON COMPLETE" : needsControlTour ? "01 / CONTROL TOUR" : "02 / YOUR CHALLENGE"}</span><span>{percent}%</span></div>
                <progress className="learning-progress" value={percent} max={100} aria-label={needsControlTour ? "Control tour progress" : "Challenge progress"} />
                <h2>{mastered ? (nextLevel ? "Nicely done. Keep going." : "Foundations complete.") : needsControlTour ? "Get to know every turn." : "Four moves. One sequence."}</h2>
                {mastered ? <p>{nextLevel ? `You've mastered ${currentLevel.title.toLowerCase()}. Next: ${nextLevel.summary.charAt(0).toLowerCase() + nextLevel.summary.slice(1)}` : "You can read moves, reverse turns, and keep your bearings. Revisit any lesson to build confidence."}</p> : needsControlTour ? <p>Try all 18 controls in any order. Checked keys are done; the suggested key is highlighted. {remainingControls.length} left to explore.</p> : <ol className="move-sequence" aria-label="Challenge sequence">{currentLevel.moves?.map((move, index) => <li key={index} className={index < progressStep ? "done" : index === progressStep ? "current" : ""} aria-current={index === progressStep ? "step" : undefined}><span>{index < progressStep ? "\u2713" : `0${index + 1}`}</span><b>{move}</b><small>{index < progressStep ? "Done" : index === progressStep ? "Now" : "Next"}</small></li>)}</ol>}
                {!mastered && suggestedMove && <div className="next-turn"><b>{suggestedMove}</b><div><span>{needsControlTour ? "TRY THIS CONTROL" : "YOUR NEXT MOVE"}</span><strong>{moveGuide?.name} face / {suggestedMove.endsWith("2") ? "half turn" : suggestedMove.endsWith("'") ? "counterclockwise" : "clockwise"}</strong></div></div>}
                <p className="lesson-feedback" role="status" aria-live="polite">{mastered ? "Your achievement is saved. Replays keep your unlocked lessons." : feedback || (needsControlTour ? "Tap a key beside the cube and watch its layer move." : "Use the highlighted key or the guided button. A wrong move restarts the four-move sequence.")}</p>
                <div className="challenge-actions"><button className="button button-acid" disabled={!hydrated || (!mastered && !suggestedMove)} onClick={() => mastered ? (nextLevel ? openLevel(nextLevel.id) : replayLevel()) : suggestedMove && performMove(suggestedMove)}>{mastered ? (nextLevel ? `Continue to level ${nextLevel.id}` : "Practice again") : `Try ${suggestedMove}`}<span>&rarr;</span></button>{mastered && nextLevel && <button className="button button-quiet" onClick={replayLevel}>Practice again</button>}</div>
              </article>}
          </div>

          <div className="practice-station">
            <div className="stage-heading"><span className="section-kicker font-mono">{isBriefing ? "MEET YOUR CUBE" : "YOUR PRACTICE SPACE"}</span><button className="stage-sound" onClick={() => setSoundEnabled((enabled) => !enabled)} aria-pressed={soundEnabled} aria-label={soundEnabled ? "Mute move sounds" : "Enable move sounds"}>Sound {soundEnabled ? "on" : "off"}</button></div>
            <div className="lesson-cube"><CubeCanvas state={state} move={isBriefing || mastered ? undefined : suggestedMove} /><div className="lesson-cube-footer font-mono"><span>DRAG TO LOOK AROUND</span><span>LAST TURN / {lastInput || "READY"}</span></div></div>
            {!isBriefing ? <div className="visual-keyboard"><div className="keyboard-heading"><h2>Make your move</h2><span>{needsControlTour ? `${exploredMoves.length} / 18 explored` : mastered ? "Free practice" : `Move ${progressStep + 1} of 4`}</span></div>{keyboardRows.map((row) => <div className="keyboard-row" key={row.label}><span className="keyboard-row-label font-mono">{row.label}</span><div className="keyboard-keys">{row.keys.map((move) => <button disabled={!hydrated} className={`${!mastered && move === suggestedMove ? "active" : ""} ${level === 1 && exploredMoves.includes(move) ? "explored" : ""}`} key={move} onClick={() => performMove(move)} aria-label={`Perform ${move}${needsControlTour && exploredMoves.includes(move) ? ", already explored" : ""}`}>{move}{level === 1 && exploredMoves.includes(move) && <small aria-hidden="true">&#10003;</small>}</button>)}</div></div>)}<p className="keyboard-help">Keyboard: face letter for a turn / Hold <kbd>Shift</kbd> for prime / Hold <kbd>2</kbd> for double</p></div> : <div className="stage-welcome"><strong>A small puzzle. A few useful ideas.</strong><p>You don't need to solve it yet. Start by noticing the centers, edges, and corners.</p></div>}
            <details className="face-reference"><summary>Face names &amp; notation <span>Quick reference</span></summary><div className="face-guide-grid">{faceGuides.map((guide) => <article key={guide.face}><div><b>{guide.face}</b><span><strong>{guide.name} face</strong><small>{guide.axis}</small></span></div><p>{guide.meaning}</p></article>)}</div><p>A letter turns clockwise, a prime (') reverses it, and 2 makes a half turn. View the turning face head-on to judge direction.</p></details>
          </div>
        </div>
      </section>
    </main>
  );
}
