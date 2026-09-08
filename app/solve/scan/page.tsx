"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { SCAN_FACES, SCAN_STORAGE_KEY, ScanFace, sampleImage, calibrateScan } from "@/lib/scan";

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
  const [photo, setPhoto] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [positionX, setPositionX] = useState(50);
  const [positionY, setPositionY] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
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
      setPhoto(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setCameraOn(true);
      setMessage("Center the face inside the guide, then capture.");
    } catch { setMessage("Camera access was unavailable. Upload a photo instead."); }
  }

  function acceptSource(source: HTMLImageElement | HTMLVideoElement) {
    if (!canvasRef.current) return;
    const frame = frameRef.current?.getBoundingClientRect();
    const guide = guideRef.current?.getBoundingClientRect();
    if (!frame || !guide) return;
    const width = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth;
    const height = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight;
    if (!width || !height) { setMessage("Wait for the image to load."); return; }
    const scale = Math.max(frame.width / width, frame.height / height) * (photo ? zoom : 1);
    const offsetX = (frame.width - width * scale) * (photo ? positionX / 100 : .5);
    const offsetY = (frame.height - height * scale) * (photo ? positionY / 100 : .5);
    const stickers = sampleImage(source, canvasRef.current, { x: (guide.left - frame.left - offsetX) / scale, y: (guide.top - frame.top - offsetY) / scale, size: guide.width / scale });
    if (stickers.length !== 9) { setMessage("Could not read the photo. Try again."); return; }
    const nextFace: ScanFace = { code: current.code, name: current.name, stickers, samples: stickers };
    save(calibrateScan([...faces.filter((face) => face.code !== current.code), nextFace]));
    setPhoto(null);
    setMessage(`${current.name} face mapped. Review it or continue to the next face.`);
    if (active < SCAN_FACES.length - 1) setActive((value) => value + 1);
  }

  function captureCamera() { if (videoRef.current) acceptSource(videoRef.current); }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { setPhoto(image); setZoom(1); setPositionX(50); setPositionY(50); streamRef.current?.getTracks().forEach((track) => track.stop()); setCameraOn(false); setMessage("Adjust the photo until the face fills the guide, then capture. Keep the face square to the camera."); };
    image.onerror = () => { URL.revokeObjectURL(url); setMessage("Could not open this photo. Try JPEG or PNG."); };
    image.src = url;
    event.target.value = "";
  }

  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.src); }, [photo]);

  function resetScan() { setPhoto(null); save([]); setActive(0); localStorage.removeItem(`${SCAN_STORAGE_KEY}-active`); setMessage("Upload a clear photo or use your camera."); }

  return <main className="scan-page"><nav className="nav-shell"><Link className="brand" href="/">cube<span>sense</span><i /></Link><Link className="text-link" href="/solve">← Change starting point</Link></nav><section className="scan-shell"><div className="section-kicker font-mono">SCAN MY CUBE / {done} OF 6 FACES</div><div className="scan-header"><div><h1>Let&apos;s map<br /><em>your cube.</em></h1><p>Capture each face in order. Keep the <strong>{current.name.toLowerCase()}</strong> face flat inside the 3×3 guide so every sticker can be sampled.</p><p className="scan-message">{message}</p></div><div ref={frameRef} className={`capture-frame ${cameraOn ? "camera-live" : ""}`}><video ref={videoRef} muted playsInline />{photo && <img alt="Photo to align with the sticker guide" src={photo.src} style={{ position: "absolute", width: Math.max(1, photo.naturalWidth / photo.naturalHeight) * zoom * 100 + "%", height: Math.max(1, photo.naturalHeight / photo.naturalWidth) * zoom * 100 + "%", maxWidth: "none", left: positionX + "%", top: positionY + "%", transform: "translate(-" + positionX + "%, -" + positionY + "%)" }} />}<div ref={guideRef} className="frame-grid">{Array.from({ length: 9 }).map((_, index) => <i key={index} />)}</div><b>{(cameraOn || photo) ? `ALIGN THE ${current.name.toUpperCase()} FACE` : "READY FOR A PHOTO"}</b></div></div><canvas ref={canvasRef} className="scan-canvas" />{photo && <div className="photo-adjustments">{[{ label: "Zoom", value: zoom, min: 1, max: 4, step: .01, change: setZoom }, { label: "Horizontal position", value: positionX, min: 0, max: 100, step: 1, change: setPositionX }, { label: "Vertical position", value: positionY, min: 0, max: 100, step: 1, change: setPositionY }].map((control) => <label key={control.label}>{control.label}<input type="range" min={control.min} max={control.max} step={control.step} value={control.value} onChange={(event) => control.change(Number(event.target.value))} /></label>)}</div>}<div className="scan-actions"><button className="button button-acid" onClick={photo ? () => acceptSource(photo) : cameraOn ? captureCamera : startCamera}>{(cameraOn || photo) ? `Capture ${current.name} face` : "Use camera"} <span>↗</span></button><label className="button button-quiet upload-button">Upload photo<input type="file" accept="image/*" onChange={handleUpload} /></label><button className="button button-quiet" onClick={resetScan}>Start over</button></div><div className="face-progress">{SCAN_FACES.map((face, index) => { const faceCaptured = faces.some((item) => item.code === face.code); return <button key={face.code} className={index === active ? "active" : ""} onClick={() => setActive(index)}><span className="face-index font-mono">0{index + 1}</span><span>{face.name}</span><i className={faceCaptured ? "done" : ""}>{faceCaptured ? "✓" : ""}</i></button>; })}</div><div className="scan-next-row"><p className="font-mono scan-footnote">PROCESSING STAYS IN YOUR BROWSER / PHOTOS ARE NOT UPLOADED</p><Link href={done === 6 ? "/solve/review" : "/solve/scan"} className={`button button-dark ${done < 6 ? "disabled" : ""}`} onClick={(event) => { if (done < 6) event.preventDefault(); }}>{done === 6 ? "Review detected cube →" : `${6 - done} faces remaining`}</Link></div></section></main>;
}
