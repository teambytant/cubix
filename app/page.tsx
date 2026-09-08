"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { applyMoves, cloneState, Move, scramble, SOLVED_STATE } from "@/lib/cube";
import { playMoveSound } from "@/lib/cube-sound";

const CubeCanvas = dynamic(() => import("@/components/CubeCanvas"), { ssr: false });

const featureCards = [
  { number: "01", title: "See the move", text: "Every algorithm is translated into a clear, animated action. No notation wall, no guessing.", accent: "#d7ef37" },
  { number: "02", title: "Scan your scramble", text: "Capture six faces. CubeSense rebuilds the exact state so your digital tutor matches your real cube.", accent: "#ff714b" },
  { number: "03", title: "Build the instinct", text: "Learn why each turn matters with visual cues that make the method stick beyond one solve.", accent: "#3986f7" },
];

const moves: Move[] = ["U", "U'", "U2", "D", "D'", "D2", "L", "L'", "L2", "R", "R'", "R2", "F", "F'", "F2", "B", "B'", "B2"];
const moveRows = [
  { label: "TOP / BOTTOM", moves: ["U", "U'", "U2", "D", "D'", "D2"] as Move[] },
  { label: "LEFT / RIGHT", moves: ["L", "L'", "L2", "R", "R'", "R2"] as Move[] },
  { label: "FRONT / BACK", moves: ["F", "F'", "F2", "B", "B'", "B2"] as Move[] },
];

function inverseMove(move: Move): Move {
  if (move.endsWith("2")) return move;
  return move.endsWith("'") ? move.slice(0, 1) as Move : `${move}'` as Move;
}

export default function Home() {
  const [state, setState] = useState(cloneState(SOLVED_STATE));
  const [lastMove, setLastMove] = useState("READY");
  const [scrambleText, setScrambleText] = useState("No scramble yet");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [queuedMoves, setQueuedMoves] = useState<Move[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sequenceSpeed, setSequenceSpeed] = useState<"normal" | "scramble" | "reset">("normal");
  const activeMove = /^[URFDLB](?:2|')?$/.test(lastMove) ? lastMove as Move : undefined;
  const processingRef = useRef(false);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (processingRef.current || queuedMoves.length === 0) return;
    const nextMove = queuedMoves[0];
    processingRef.current = true;
    setIsProcessing(true);
    setState((current) => applyMoves(current, [nextMove]));
    setMoveHistory((current) => sequenceSpeed === "reset" ? current.slice(0, -1) : [...current, nextMove]);
    setLastMove(nextMove);
    if (soundEnabledRef.current) playMoveSound(nextMove);
    const duration = sequenceSpeed === "reset" ? 90 : sequenceSpeed === "scramble" ? 125 : 430;
    const timer = window.setTimeout(() => {
      setQueuedMoves((current) => current.slice(1));
      processingRef.current = false;
      setIsProcessing(false);
      if (queuedMoves.length === 1) {
        if (sequenceSpeed === "reset") {
          setState(cloneState(SOLVED_STATE));
          setMoveHistory([]);
          setLastMove("RESET");
        }
        setSequenceSpeed("normal");
      }
    }, duration);
    return () => window.clearTimeout(timer);
  }, [queuedMoves, sequenceSpeed]);

  function doMove(move: Move) {
    if (isProcessing || queuedMoves.length > 0) return;
    setSequenceSpeed("normal");
    setQueuedMoves([move]);
  }

  function doScramble() {
    const sequence = scramble();
    if (isProcessing || queuedMoves.length > 0) return;
    setSequenceSpeed("scramble");
    setQueuedMoves(sequence);
    setScrambleText(sequence.join(" "));
  }

  function reset() {
    if (isProcessing || queuedMoves.length > 0) return;
    const resetMoves = [...moveHistory].reverse().map(inverseMove);
    setSequenceSpeed("reset");
    setQueuedMoves(resetMoves);
    if (resetMoves.length === 0) setSequenceSpeed("normal");
    if (resetMoves.length === 0) setState(cloneState(SOLVED_STATE));
    setScrambleText("No scramble yet");
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const face = event.key.toUpperCase();
      if (!["U", "D", "L", "R", "F", "B"].includes(face)) return;
      event.preventDefault();
      const suffix = event.key === "2" ? "2" : event.shiftKey ? "'" : "";
      doMove(`${face}${suffix}` as Move);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return (
    <main>
      <nav className="nav-shell">
        <Link className="brand" href="/">cube<span>sense</span><i /></Link>
        <div className="nav-links"><a href="#method">Method</a><a href="#practice">Practice</a><Link href="/learn">Learn mode <span>↗</span></Link></div>
        <Link className="nav-cta" href="/solve">Scan your cube <span>↗</span></Link>
      </nav>

      <section className="hero grid-paper">
        <div className="hero-copy">
          <p className="eyebrow"><span className="pulse-dot" /> A visual tutor for the real world</p>
          <h1>See every<br /><em>move.</em></h1>
          <p className="hero-lede">Learn the Rubik&apos;s Cube by seeing what happens next. Or scan your scramble and let CubeSense turn the impossible into a sequence you can feel.</p>
          <div className="hero-actions"><Link className="button button-dark" href="/learn">Start learning <span>↗</span></Link><Link className="text-link" href="/solve">I have a scrambled cube <span>→</span></Link></div>
          <div className="hero-note font-mono">01 / 03 &nbsp;&nbsp; TURNING CONFUSION INTO CLARITY</div>
        </div>
        <div className="hero-cube-wrap">
          <div className="orbit-label label-top font-mono">LIVE / 3D ENGINE</div>
          <div className="hero-cube"><CubeCanvas state={state} move={activeMove} fast={sequenceSpeed !== "normal"} /></div>
          <div className="cube-caption"><span>Drag to explore</span><span className="font-mono">{lastMove}</span></div>
        </div>
        <div className="hero-side-note font-mono">EST.<br />2026</div>
      </section>

      <section className="ticker"><div>LEARN BY DOING <span>✳</span> YOUR CUBE, YOUR PACE <span>✳</span> NO MYSTERY MOVES <span>✳</span> LEARN BY DOING <span>✳</span></div></section>

      <section className="intro" id="method">
        <div className="section-kicker font-mono">THE CUBESENSE METHOD</div>
        <div className="intro-grid"><h2>The cube is<br />not the <span>problem.</span></h2><p>Most tutorials teach you to memorize a language. We teach you to read a shape. CubeSense makes the relationship between a piece, a turn, and your goal impossible to miss.</p></div>
        <div className="feature-grid">{featureCards.map((card) => <motion.article className="feature" key={card.number} whileHover={{ y: -8 }}><div className="feature-top"><span className="font-mono">{card.number}</span><i style={{ background: card.accent }} /></div><h3>{card.title}</h3><p>{card.text}</p><span className="feature-arrow">↗</span></motion.article>)}</div>
      </section>

      <section className="practice" id="practice">
        <div className="practice-copy"><div className="section-kicker font-mono">TRY IT / NO ACCOUNT NEEDED</div><h2>Get your hands<br />on the <em>logic.</em></h2><p>Make a move, scramble the cube, and watch the state respond. This is the same engine that powers your guided solve.</p><div className="control-row"><button className="button button-acid" onClick={doScramble} disabled={isProcessing || queuedMoves.length > 0}>Scramble <span>↗</span></button><button className="button button-quiet" onClick={reset} disabled={isProcessing || queuedMoves.length > 0}>Reset</button><button className="sound-toggle" onClick={() => setSoundEnabled((enabled) => !enabled)} aria-pressed={soundEnabled} aria-label={soundEnabled ? "Mute move sounds" : "Enable move sounds"}>{soundEnabled ? "◖" : "◌"}<span>{soundEnabled ? "Sound on" : "Sound off"}</span></button></div><div className="scramble-display"><span className="font-mono">CURRENT SCRAMBLE</span><strong>{scrambleText}</strong></div></div>
        <div className="practice-stage"><div className="stage-tag font-mono">INTERACTIVE PLAYGROUND</div><div className="practice-cube"><CubeCanvas state={state} move={activeMove} fast={sequenceSpeed !== "normal"} compact /></div><div className="practice-keyboard"><div className="practice-keyboard-head"><div className="font-mono">VIRTUAL MOVE KEYBOARD</div><span className="font-mono">SHIFT = PRIME / 2 = DOUBLE</span></div>{moveRows.map((row) => <div className="practice-key-row" key={row.label}><span className="font-mono">{row.label}</span><div>{row.moves.map((move) => <button className={move === activeMove ? "active" : ""} key={move} onClick={() => doMove(move)} disabled={isProcessing || queuedMoves.length > 0} aria-label={`Perform ${move} move`}>{move}</button>)}</div></div>)}</div></div>
      </section>

      <section className="scan-band"><div className="scan-copy"><div className="section-kicker font-mono">WHEN YOU&apos;RE READY</div><h2>Your scramble.<br /><span>Mapped.</span></h2><p>Use your camera to recreate a physical cube in seconds. We&apos;ll check the state, flag anything suspicious, then guide every turn from there.</p><Link className="button button-dark" href="/solve">Scan my cube <span>↗</span></Link></div><div className="scan-visual"><div className="scan-ring"><div className="scan-square"><span /><span /><span /><span /><b>ALIGN FACE</b></div></div><div className="font-mono scan-meta">6 FACES / 54 STICKERS / 1 SOLUTION</div></div></section>

      <footer><Link className="brand" href="/">cube<span>sense</span><i /></Link><p>See every move.</p><div className="font-mono footer-meta">BUILT FOR CURIOUS HUMANS<br />© 2026 CUBESENSE</div></footer>
    </main>
  );
}
