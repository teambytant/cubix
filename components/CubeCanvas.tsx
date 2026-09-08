"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { CubeState, Face, Move } from "@/lib/cube";

const FACE_LAYOUT: Record<Face, { normal: [number, number, number]; right: [number, number, number]; up: [number, number, number] }> = {
  F: { normal: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0] },
  B: { normal: [0, 0, -1], right: [-1, 0, 0], up: [0, 1, 0] },
  R: { normal: [1, 0, 0], right: [0, 0, -1], up: [0, 1, 0] },
  L: { normal: [-1, 0, 0], right: [0, 0, 1], up: [0, 1, 0] },
  U: { normal: [0, 1, 0], right: [1, 0, 0], up: [0, 0, -1] },
  D: { normal: [0, -1, 0], right: [1, 0, 0], up: [0, 0, 1] },
};

const FACE_ROTATION: Record<Face, [number, number, number]> = {
  F: [0, 0, 0], B: [0, Math.PI, 0], R: [0, Math.PI / 2, 0], L: [0, -Math.PI / 2, 0], U: [-Math.PI / 2, 0, 0], D: [Math.PI / 2, 0, 0],
};

const TURN_AXIS: Record<Face, [number, number, number]> = {
  F: [0, 0, 1], B: [0, 0, 1], R: [1, 0, 0], L: [1, 0, 0], U: [0, 1, 0], D: [0, 1, 0],
};

const TURN_DIRECTION: Record<Face, number> = {
  F: -1, B: 1, R: -1, L: 1, U: -1, D: 1,
};

const CUBIE_COORDINATES = [-1.02, 0, 1.02];

type Sticker = {
  color: string;
  face: Face;
  position: [number, number, number];
  cubiePosition: [number, number, number];
  rotation: [number, number, number];
  key: string;
};

function isInTurnLayer(position: [number, number, number], face?: Face) {
  if (!face) return false;
  const axis = face === "R" || face === "L" ? 0 : face === "U" || face === "D" ? 1 : 2;
  const direction = face === "R" || face === "U" || face === "F" ? 1 : -1;
  return position[axis] * direction > 0.5;
}

function Cubie({ state, move }: { state: CubeState; move?: Move }) {
  const group = useRef<THREE.Group>(null);
  const turnGroup = useRef<THREE.Group>(null);
  const turnProgress = useRef(0);
  const faceToTurn = move?.[0] as Face | undefined;
  const turnDirection = move?.endsWith("'") ? -1 : 1;
  const turnAmount = move?.endsWith("2") ? Math.PI : Math.PI / 2;
  const stickers = useMemo<Sticker[]>(() => Object.entries(FACE_LAYOUT).flatMap(([face, layout]) => {
    const currentFace = face as Face;
    return state[currentFace].map((color, index) => {
      const row = Math.floor(index / 3);
      const column = index % 3;
      const offsetX = (column - 1) * 1.02;
      const offsetY = (1 - row) * 1.02;
      const cubiePosition: [number, number, number] = [
        layout.normal[0] * 1.02 + layout.right[0] * offsetX + layout.up[0] * offsetY,
        layout.normal[1] * 1.02 + layout.right[1] * offsetX + layout.up[1] * offsetY,
        layout.normal[2] * 1.02 + layout.right[2] * offsetX + layout.up[2] * offsetY,
      ];
      const position: [number, number, number] = [
        layout.normal[0] * 1.54 + layout.right[0] * offsetX + layout.up[0] * offsetY,
        layout.normal[1] * 1.54 + layout.right[1] * offsetX + layout.up[1] * offsetY,
        layout.normal[2] * 1.54 + layout.right[2] * offsetX + layout.up[2] * offsetY,
      ];
      return { color, face: currentFace, position, cubiePosition, rotation: FACE_ROTATION[currentFace], key: `${face}-${index}` };
    });
  }), [state]);

  useEffect(() => {
    turnProgress.current = 0;
    if (turnGroup.current) turnGroup.current.rotation.set(0, 0, 0);
  }, [move]);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.08;
    if (turnGroup.current && faceToTurn) {
      turnProgress.current = Math.min(1, turnProgress.current + delta / 0.42);
      const eased = 1 - Math.pow(1 - turnProgress.current, 3);
      const angle = eased * turnAmount * turnDirection * TURN_DIRECTION[faceToTurn];
      turnGroup.current.rotation.set(
        TURN_AXIS[faceToTurn][0] * angle,
        TURN_AXIS[faceToTurn][1] * angle,
        TURN_AXIS[faceToTurn][2] * angle,
      );
    }
  });

  const renderSticker = (sticker: Sticker) => (
    <RoundedBox key={sticker.key} args={[0.56, 0.56, 0.055]} radius={0.055} smoothness={4} position={sticker.position} rotation={sticker.rotation} castShadow>
      <meshPhysicalMaterial color={sticker.color} roughness={0.23} metalness={0.02} clearcoat={0.32} clearcoatRoughness={0.18} />
    </RoundedBox>
  );

  return (
    <group ref={group} rotation={[0.26, -0.62, 0]}>
      <group>
        {CUBIE_COORDINATES.flatMap((x) => CUBIE_COORDINATES.flatMap((y) => CUBIE_COORDINATES.map((z) => [x, y, z] as [number, number, number])))
          .filter((position) => !isInTurnLayer(position, faceToTurn))
          .map((position) => (
            <RoundedBox key={`static-${position.join("-")}`} args={[0.96, 0.96, 0.96]} radius={0.12} smoothness={4} position={position} castShadow receiveShadow>
              <meshStandardMaterial color="#0d0e0e" roughness={0.29} metalness={0.18} />
            </RoundedBox>
          ))}
        {stickers.filter((sticker) => !isInTurnLayer(sticker.cubiePosition, faceToTurn)).map(renderSticker)}
      </group>
      <group ref={turnGroup}>
        {CUBIE_COORDINATES.flatMap((x) => CUBIE_COORDINATES.flatMap((y) => CUBIE_COORDINATES.map((z) => [x, y, z] as [number, number, number])))
          .filter((position) => isInTurnLayer(position, faceToTurn))
          .map((position) => (
            <RoundedBox key={`turning-${position.join("-")}`} args={[0.96, 0.96, 0.96]} radius={0.12} smoothness={4} position={position} castShadow receiveShadow>
              <meshStandardMaterial color="#0d0e0e" roughness={0.29} metalness={0.18} />
            </RoundedBox>
          ))}
        {stickers.filter((sticker) => isInTurnLayer(sticker.cubiePosition, faceToTurn)).map(renderSticker)}
      </group>
    </group>
  );
}

export default function CubeCanvas({ state, move, compact = false }: { state: CubeState; move?: Move; compact?: boolean }) {
  const [displayState, setDisplayState] = useState(state);
  const [isAnimating, setIsAnimating] = useState(false);
  const previousState = useRef(state);

  useEffect(() => {
    if (previousState.current === state) {
      setDisplayState(state);
      setIsAnimating(false);
      return;
    }

    previousState.current = state;
    if (!move) {
      setDisplayState(state);
      setIsAnimating(false);
      return;
    }

    setDisplayState(state);
    setIsAnimating(true);
    const timer = window.setTimeout(() => setIsAnimating(false), 430);
    return () => window.clearTimeout(timer);
  }, [move, state]);

  return (
    <Canvas shadows dpr={[1, 1.7]} camera={{ position: [5.4, 4.2, 6.2], fov: compact ? 34 : 38 }}>
      <ambientLight intensity={1.15} />
      <spotLight position={[4, 7, 5]} intensity={85} angle={0.32} penumbra={0.8} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-4, -1, 4]} intensity={12} color="#d7ef37" />
      <pointLight position={[3, 1, -4]} intensity={8} color="#3986f7" />
      <Cubie state={displayState} move={isAnimating ? move : undefined} />
      <ContactShadows position={[0, -2.8, 0]} opacity={0.44} scale={8} blur={2.6} far={5} />
      <Environment preset="city" />
      <OrbitControls enablePan={false} enableZoom={!compact} minDistance={4.5} maxDistance={9} makeDefault />
    </Canvas>
  );
}
