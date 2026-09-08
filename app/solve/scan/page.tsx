"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { SCAN_FACES, SCAN_STORAGE_KEY, ScanFace, sampleImage } from "@/lib/scan";

export default function ScanPage() {
  const [active, setActive] = useState(0);
  const [faces, setFaces] = useState<ScanFace[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [message, setMessage] = useState("Upload a clear photo or use your camera.");
  const [hydrated, setHydrated] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const current = SCAN_FACES[active];
  const captured = faces.some((face) => face.code === current.code);
  const done = faces.length;

  useEffect(() => {
    const saved = localStorage.getItem(SCAN_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ScanFace[];
        if (Array.isArray(parsed)) setFaces(parsed);
      } catch { localStorage.removeItem(SCAN_STORAGE_KEY); }
    }
    const savedActive = Number(localStorage.getItem(`${SCAN_STORAGE_KEY}-active`));
    if (Number.isInteger(savedActive) && savedActive >= 0 && savedActive < SCAN_FACES.length) setActive(savedActive);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(`${SCAN_STORAGE_KEY}-active`, String(active));
  }, [active, hydrated]);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  function save(nextFaces: ScanFace[]) {
    setFaces(nextFaces);
    localStorage.setItem(SCAN_STORAGE_KEY, JSON.stringify(nextFaces));
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraOn(true);
      setMessage("Center the face inside the guide, then capture.");
    } catch { setMessage("Camera access was unavailable. Upload a photo instead."); }
  }

  function acceptSource(source: CanvasImageSource, preview?: string) {
    if (!canvasRef.current) return;
    const stickers = sampleImage(source, canvasRef.current);
    const nextFace: ScanFace = { code: current.code, name: current.name, stickers, source: preview };
    save([...faces.filter((face) => face.code !== current.code), nextFace]);
    setMessage(`${current.name} face mapped. Review it or continue to the next face.`);
    if (active < SCAN_FACES.length - 1) setActive((value) => value + 1);
  }

  function captureCamera() { if (videoRef.current) acceptSource(videoRef.current); }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const image = new Image();
    image.onload = () => acceptSource(image, URL.createObjectURL(file));
    image.src = URL.createObjectURL(file);
  }

  function resetScan() { save([]); setActive(0); localStorage.removeItem(`${SCAN_STORAGE_KEY}-active`); setMessage("Upload a clear photo or use your camera."); }

  return <main className="scan-page"><nav className="nav-shell"><Link className="brand" href="/">cube<span>sense</span><i /></Link><Link className="text-link" href="/solve">← Change starting point</Link></nav><section className="scan-shell"><div className="section-kicker font-mono">SCAN MY CUBE / {done} OF 6 FACES</div><div className="scan-header"><div><h1>Let&apos;s map<br /><em>your cube.</em></h1><p>Capture each face in order. Keep the <strong>{current.name.toLowerCase()}</strong> face flat inside the 3×3 guide so every sticker can be sampled.</p><p className="scan-message">{message}</p></div><div className={`capture-frame ${cameraOn ? "camera-live" : ""}`}><video ref={videoRef} muted playsInline /><div className="frame-grid">{Array.from({ length: 9 }).map((_, index) => <i key={index} />)}</div><b>{cameraOn ? `ALIGN THE ${current.name.toUpperCase()} FACE` : "READY FOR A PHOTO"}</b></div></div><canvas ref={canvasRef} className="scan-canvas" /><div className="scan-actions"><button className="button button-acid" onClick={cameraOn ? captureCamera : startCamera}>{cameraOn ? `Capture ${current.name} face` : "Use camera"} <span>↗</span></button><label className="button button-quiet upload-button">Upload photo<input type="file" accept="image/*" onChange={handleUpload} /></label><button className="button button-quiet" onClick={resetScan}>Start over</button></div><div className="face-progress">{SCAN_FACES.map((face, index) => { const faceCaptured = faces.some((item) => item.code === face.code); return <button key={face.code} className={index === active ? "active" : ""} onClick={() => setActive(index)}><span className="face-index font-mono">0{index + 1}</span><span>{face.name}</span><i className={faceCaptured ? "done" : ""}>{faceCaptured ? "✓" : ""}</i></button>; })}</div><div className="scan-next-row"><p className="font-mono scan-footnote">PROCESSING STAYS IN YOUR BROWSER / PHOTOS ARE NOT UPLOADED</p><Link href={done === 6 ? "/solve/review" : "/solve/scan"} className={`button button-dark ${done < 6 ? "disabled" : ""}`} onClick={(event) => { if (done < 6) event.preventDefault(); }}>{done === 6 ? "Review detected cube →" : `${6 - done} faces remaining`}</Link></div></section></main>;
}
