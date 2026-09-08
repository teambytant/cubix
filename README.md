# CubeSense

Created and started by **Builder Kay**, the original creator of CubeSense.

CubeSense is an open-source interactive Rubik's Cube visual tutor. It combines a 3D cube, move-by-move instruction, a progressive beginner curriculum, browser-based scan/review tools, sound feedback, and persistent local progress.

> The project is an active prototype. The cube engine, visual tutor, scan workflow, and UI are working foundations for continued development; a production solver and full physical-state validator are still extension points.

## Contents

- [What is implemented](#what-is-implemented)
- [Technology stack](#technology-stack)
- [Requirements](#requirements)
- [Local setup](#local-setup)
- [Available scripts](#available-scripts)
- [Project structure](#project-structure)
- [Application routes](#application-routes)
- [Architecture](#architecture)
- [Cube engine](#cube-engine)
- [Learn progression](#learn-progression)
- [Scan and review flow](#scan-and-review-flow)
- [Persistence](#persistence)
- [Audio](#audio)
- [Development guidance](#development-guidance)
- [Testing](#testing)
- [Contributing](#contributing)
- [Roadmap](#roadmap)

## What is implemented

- Premium responsive landing page at `/`
- Interactive Three.js Rubik's Cube with orbit controls
- Rounded cubie-based rendering with visible layer gaps
- Animated layer turns for manual moves, scramble, and reset
- All standard face moves in the practice keyboard:
  - `U`, `U'`, `U2`
  - `D`, `D'`, `D2`
  - `L`, `L'`, `L2`
  - `R`, `R'`, `R2`
  - `F`, `F'`, `F2`
  - `B`, `B'`, `B2`
- Fast queued scramble and reset sequences
- Move sound feedback with a real-audio asset hook and generated fallback
- Progressive learn page with:
  - Level 0 foundations briefing
  - Level 1 control tour and mastery task
  - Locked Level 2 and Level 3 tasks
- Keyboard and pointer controls
- Browser-local six-face scan flow with camera and upload support
- 3x3 sticker sampling and nearest-color classification
- Editable cube-net review screen
- Browser-local validation of sticker counts
- Persistent learning, practice, scan, and review state

## Technology stack

### Runtime and framework

- Next.js 15 App Router
- React 19
- TypeScript with strict mode
- Node.js 20 or newer recommended

### 3D and interaction

- Three.js
- React Three Fiber
- `@react-three/drei`
- Framer Motion
- Browser Web Audio API
- Browser `getUserMedia` and Canvas APIs

### Styling and tooling

- Global CSS with custom design tokens
- CSS responsive media queries
- npm and `package-lock.json`
- GitHub Actions for Pages deployment

### State

The current implementation uses React state inside route-level client components and browser `localStorage` for persistence. Zustand is included as a dependency for future shared-state extraction, but the current app does not yet depend on a Zustand store.

## Requirements

Install the following locally:

- Node.js 20+
- npm 10+
- Git

Camera scanning requires a secure browser context. `localhost` is treated as secure by modern browsers; deployed environments must use HTTPS.

## Local setup

```bash
git clone https://github.com/teambytant/cubix.git
cd cubix
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For a production build:

```bash
npm run build
npm start
```

The generated `.next` directory is build output and should not be committed. It is ignored by `.gitignore`.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create and validate a production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run the configured lint command; verify against the installed Next.js version if it changes |

When switching between `npm run dev` and `npm run build`, stop the other process first. Both commands write to `.next`, and overlapping processes can corrupt generated webpack chunks.

## Project structure

```text
.
├── app/
│   ├── globals.css                 # Global design system and responsive styles
│   ├── layout.tsx                  # Root layout and metadata
│   ├── page.tsx                    # Landing page and practice playground
│   ├── learn/
│   │   └── page.tsx                # Progressive beginner curriculum
│   └── solve/
│       ├── page.tsx                # Solve mode selection
│       ├── scan/page.tsx            # Camera/upload scan flow
│       └── review/page.tsx          # Sticker-net review and validation
├── components/
│   └── CubeCanvas.tsx              # React Three Fiber cube scene
├── lib/
│   ├── cube.ts                     # Typed cube state and move engine
│   ├── cube-sound.ts               # Move audio and fallback synthesis
│   └── scan.ts                     # Sticker sampling and scan validation
├── public/
│   └── audio/
│       └── README.md               # Instructions for optional turn audio
├── .github/
│   └── workflows/static.yml        # GitHub Pages workflow
├── next.config.ts                  # Development webpack cache configuration
├── package.json                    # Scripts and dependencies
├── tsconfig.json                   # Strict TypeScript configuration
└── README.md                       # This document
```

Do not edit `node_modules/` or `.next/`. Both are generated locally.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Product landing page and interactive practice playground |
| `/learn` | Progressive beginner curriculum and control training |
| `/solve` | Choose scan or learning entry point |
| `/solve/scan` | Capture six cube faces from camera or uploaded images |
| `/solve/review` | Edit sampled stickers and validate the reconstructed state |

## Architecture

### Cube rendering

`components/CubeCanvas.tsx` owns the visual scene. It uses:

- React Three Fiber's `Canvas`
- Drei `RoundedBox`, `OrbitControls`, `Environment`, and `ContactShadows`
- A 27-cubie visual model
- A separate turn group for the active layer
- A display-state buffer so color changes and layer animation stay synchronized

The logical cube state should never be derived from Three.js transforms. The cube engine is authoritative; the renderer receives a state and an optional move to animate.

### Cube state

`lib/cube.ts` is the source of truth for sticker mutations. A `CubeState` is:

```ts
Record<Face, string[]>
```

Each face contains nine sticker colors in row-major order. The center sticker is index `4`.

Keep cube mutations pure. `applyMove` clones the state, rotates the selected face, and transfers adjacent strips from a snapshot so writes cannot cascade into later reads.

### Scan state

`lib/scan.ts` contains browser-safe helpers for:

- Mapping face metadata
- Sampling a 3x3 grid from an image or video source
- Assigning sampled RGB values to the nearest known sticker color
- Counting colors and reporting basic validation errors

The scan route stores captured faces in `localStorage`; the review route loads and updates the same data.

## Cube engine

Supported move syntax is:

```text
U U' U2
R R' R2
F F' F2
D D' D2
L L' L2
B B' B2
```

Move semantics:

- `R`: clockwise right-face turn from the right-face viewpoint
- `R'`: inverse/counter-clockwise right-face turn
- `R2`: two quarter turns
- The same suffix rules apply to every face letter

When changing `lib/cube.ts`:

1. Keep `applyMove` pure.
2. Preserve the snapshot-based strip transfer.
3. Update both logical and visual move handling if adding notation.
4. Test four-turn identity and move/inverse cancellation.
5. Check that every color still appears exactly nine times.

The visual layer direction is defined separately in `components/CubeCanvas.tsx`. If a move looks visually reversed while the state is correct, inspect `TURN_DIRECTION` and `TURN_AXIS` there rather than changing the logical engine blindly.

## Learn progression

The learn page stores a small curriculum in the `levels` array in `app/learn/page.tsx`.

- Level 0 explains pieces, layers, notation, and control discipline.
- Level 1 requires the user to explore all 18 move controls before the mastery sequence unlocks.
- Level 2 teaches notation combinations.
- Level 3 teaches orientation and bearings.

A level can only be opened when the previous level ID is in `completed`. A mastery task compares each user move to the expected move. A wrong move resets that task's step but leaves the cube state physically changed, which is intentional feedback for future mistake-recovery work.

To add a level:

1. Add a `Level` entry with a unique sequential ID.
2. Add its summary and exact `moves` sequence.
3. Keep the previous-level unlock rule intact.
4. Explain the learning goal before presenting the sequence.
5. Add a task that demonstrates mastery rather than requiring arbitrary clicks.

## Scan and review flow

The scan flow is intentionally client-only:

1. The user selects a face.
2. They start the camera or upload an image.
3. A 3x3 sampling grid reads representative pixels.
4. Each sticker is mapped to the nearest configured face color.
5. The captured face is stored locally.
6. After all six faces are captured, the user opens review.
7. The user can select a color and correct any sticker.
8. The review page validates color counts before enabling the next action.

Current limitations:

- No perspective correction or LAB/HSV classification yet
- Camera framing is guided but not automatically detected
- Validation checks sticker counts, not complete cubie permutation/orientation legality
- The current solve handoff leads into the learning experience; a full solver is still to be integrated

These are good places for focused contributions.

## Persistence

The app uses browser `localStorage` keys:

- `cubix-practice-state`: practice cube state, move history, scramble text, sound preference
- `cubix-learn-progress`: learn cube state, level, task step, completed levels, explored controls, sound preference
- `cubix-scan-state`: captured scan faces and sticker samples
- `cubix-scan-state-active`: currently selected scan face

When adding persisted state:

- Load it inside a client `useEffect`.
- Guard writes until hydration has completed.
- Parse defensively and recover from malformed values.
- Keep reset actions explicit and complete.
- Do not persist active camera streams, timers, or transient animation queues.

## Audio

`lib/cube-sound.ts` first attempts to play `/audio/rubiks-turn.mp3`. If the file is not present or playback fails, it generates a short Web Audio fallback.

To add the provided recording:

```text
public/audio/rubiks-turn.mp3
```

Do not commit copyrighted audio unless you have permission to redistribute it. Keep the fallback working so the app remains functional without the optional asset.

## Development guidance

### Keep changes local

Prefer changes within the owning module:

- Cube math: `lib/cube.ts`
- 3D rendering: `components/CubeCanvas.tsx`
- Scan processing: `lib/scan.ts`
- Learn behavior: `app/learn/page.tsx`
- Practice behavior: `app/page.tsx`
- Cross-route visual language: `app/globals.css`

### Validate before pushing

```bash
npm run build
```

For cube-logic changes, also check:

- Four identical quarter turns restore the original state.
- A move followed by its inverse restores the original state.
- Every color count remains nine.
- Corner and edge color combinations remain legal.

### Avoid generated-cache problems

Stop any running dev server before running a production build. If Next.js reports missing generated chunks such as `Cannot find module './833.js'`:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
if (Test-Path .next) { Remove-Item .next -Recurse -Force }
npm run build
```

Then start one dev server again with `npm run dev`.

## Testing

The repository currently relies on production builds, editor diagnostics, and focused runtime checks. The next testing contribution should add automated unit coverage for `lib/cube.ts`.

Recommended cases:

- `R` four times equals solved
- Every face four times equals solved
- `R` followed by `R'` equals solved
- `R2` followed by `R2` equals solved
- `R U R' U'` followed by its inverse equals solved
- Scramble followed by its reversed inverse equals solved
- Every color appears nine times after arbitrary legal sequences
- Scan validation rejects incomplete or imbalanced color sets

## Contributing

1. Fork the repository.
2. Create a focused branch:

   ```bash
   git checkout -b feat/your-change
   ```

3. Make the smallest coherent change.
4. Run `npm run build`.
5. Test the affected route in a browser.
6. Update this README when architecture or setup changes.
7. Commit with a descriptive message.
8. Open a pull request against `main`.

Please include in pull requests:

- What changed
- Why it changed
- How it was tested
- Any known limitations
- Screenshots or recordings for visual changes

## Roadmap

- Full Kociemba or equivalent client-side solver
- Physically complete cubie permutation/orientation validation
- Perspective correction and robust LAB/HSV sticker classification
- Full camera orientation guidance
- Real scan-to-solver handoff
- Mistake recovery and recalculation during guided solving
- Automated cube-engine test suite
- Shared Zustand stores for cross-route state
- Improved GitHub Pages build artifact workflow
- Optional Supabase progress synchronization

## License

Copyright (c) 2026 Builder Kay. Licensed under the [MIT License](LICENSE).

Builder Kay is the project's originator. Copies or substantial portions of the software must retain the copyright and permission notices in the license.
