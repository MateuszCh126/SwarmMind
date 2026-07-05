# SwarmMind – Visual Multi-Agent Swarm Orchestrator

SwarmMind is a premium, production-grade visual dashboard designed to orchestrate and monitor a collaborative swarm of AI agents (Architect, Coder, Tester, Reviewer) working together to solve software refactoring goals. 

Built in **React + TypeScript + Vite** with a custom **Vanilla CSS** design system, it operates entirely on the client side, interacting directly with real LLM APIs (Gemini, OpenAI, Anthropic) using user-supplied API keys.

---

## 🛠️ Key Technical Features & Architectural Decisions

### 1. High-Frequency State Isolation (Zustand vs. Context API)
*   **The Challenge:** During swarm execution, logs stream in rapidly and agent statuses update multiple times per second. Using React's native Context API would force the entire React virtual DOM (including the large SVG network graph and control panels) to re-render, resulting in severe lagging.
*   **The Solution:** We implemented **Zustand**. Zustand allows components to subscribe to granular slices of state. For instance, the `TerminalFeed` component only re-renders when `state.logs` changes, while the `AgentGraph` remains unaffected unless an agent status or node coordinate actually updates.

### 2. GPU-Accelerated 60 FPS Rendering (CSS & SVG Tuning)
To deliver a premium, fluid desktop application experience inspired by Apple design, we tuned the rendering pipeline:
*   **Reflow Mitigation:** Agent nodes are positioned absolutely using percentages/pixels. We trigger hardware acceleration by using `transform: translate3d(0, 0, 0)` and `will-change: transform` to prevent browser layout repaints.
*   **Intelligent Blur:** Heavy filters like `backdrop-filter: blur(20px)` are applied only to static backdrop overlays or non-scrolling layers. They are excluded from scrolling panels (like the terminal) or moving elements to avoid CPU-bound rendering bottlenecks.
*   **Single-Canvas SVG:** All communication paths are drawn inside a single SVG container positioned beneath the nodes, utilizing `stroke-dasharray` and `stroke-dashoffset` keyframes to animate data packet transmission smoothly.

### 3. Real AI Multi-Agent Loop (No Mocks)
Instead of hardcoding a simulated timeline, the swarm runs real API requests:
*   **Unified Client-Side Connectors:** Directly queries Google Gemini (`gemini-2.5-flash`), OpenAI (`gpt-4o-mini`), or Anthropic Claude (`claude-sonnet-5`, using direct browser access headers). Model IDs live in a single source of truth (`PROVIDER_MODELS` in `llmService.ts`).
*   **Really Executed Tests (No Simulation):** The **TracerTester** does not *pretend* to run tests. The refactored code and the generated test suite are executed for real inside a sandboxed **Web Worker** (`testRunner.ts` + `testHarness.ts`), with a hard 5s timeout that `terminate()`s runaway/infinite-loop code before it can freeze the UI. A minimal Vitest-style harness (`describe`/`it`/`expect`) collects genuine pass/fail results, which the **SpecterReviewer** then judges. Because execution happens in the browser, the refactoring target must be runnable **JavaScript** (JSDoc for typing) — non-JS input reports an honest execution error rather than a fabricated `PASS`.
*   **localStorage Security Trade-offs:** API keys are stored client-side in the browser's `localStorage` for user convenience. While this is acceptable for a frontend CV/portfolio showcase, storing secrets in `localStorage` exposes them to XSS attacks in production. For a commercial project, these credentials should be stored in a secure backend session or a proxy server. Keys are *never* sent to any third-party server besides the official AI provider endpoints.
*   **Recursive Feedback Loop:** The review cycle is fully automated. If the **SpecterReviewer** rejects the code produced by **ValkyrieCoder** due to test failures or design issues, the state machine automatically routes the critique back to the Coder. This cycle loops recursively up to a maximum of 3 times before declaring success or failure.

---

## 📂 Project Structure

```
src/
├── main.tsx                # Application Entry point
├── App.tsx                 # Core layout structure (Grid)
├── App.css                 # Layout styles
├── index.css               # Design system variables, resets, & keyframes (Apple Dark Theme)
├── types/
│   └── index.ts            # Strict TypeScript interfaces
├── store/
│   └── useSwarmStore.ts    # Zustand state store & actions
├── services/
│   ├── llmService.ts       # Unified fetch wrapper + PROVIDER_MODELS (single source of truth)
│   ├── testHarness.ts      # Pure describe/it/expect harness — real assertion execution
│   ├── testRunner.ts       # Web Worker wrapper: isolation + 5s timeout guard
│   └── testWorker.ts       # Worker entrypoint running the harness off the main thread
├── utils/
│   └── scenarioRunner.ts   # Swarm orchestration loop (State Machine)
├── components/
│   ├── StatusHeader.tsx    # KPIs (logs count, AI engine, play status)
│   ├── Sidebar.tsx         # Inputs (refactoring target), controls, task checklist
│   ├── AgentGraph.tsx      # SVG bezier connections & glowing node widgets
│   ├── TerminalFeed.tsx    # Low-overhead log scroller & expandable code logs
│   ├── AgentInspector.tsx  # Tabbed inspector (raw prompt, output files, test reports)
│   └── SettingsModal.tsx   # Secured API credentials drawer
└── __tests__/
    ├── useSwarmStore.test.ts  # Zustand state transition tests
    ├── llmService.test.ts     # JSON Markdown parsing test suites
    └── testHarness.test.ts    # Real test-runner: pass/fail/syntax-error/mixed cases
```

---

## 🧪 Testing Suite

We use **Vitest** for running lightweight and lightning-fast unit tests. Our tests cover:
1.  **Zustand Store Actions:** Verification of `startSwarm`, `addLog`, `updateAgent`, `togglePause`, and `resetSwarm` state mutations.
2.  **LLM Service Parsing:** Validating that markdown code fences (e.g. ```json ... ```) are correctly stripped from AI outputs to prevent JSON parser failures.
3.  **Test Harness:** Proving the runner really executes code — correct code passes, buggy code genuinely fails, syntax errors and infinite loops are caught, and empty suites report an error instead of a false success.

To run the test suite:
```bash
npm run test
```

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18.0.0 or higher recommended)
*   npm (v9.0.0 or higher)

### Setup
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the development server:
    ```bash
    npm run dev
    ```
3.  Open `http://localhost:5173` in your browser.
4.  Click **Ustawienia** in the top right, choose your provider, enter your API key, and click **Zapisz**.
5.  Input a refactoring target (or use the pre-loaded recursive Fibonacci code) and click **Uruchom Swarm**!

### Provider browser compatibility
Because the app calls the LLM APIs directly from the browser (no backend), provider support depends on each vendor's CORS policy:

| Provider | Works directly from the browser? |
|----------|----------------------------------|
| **Google Gemini** (`gemini-2.5-flash`) | ✅ Yes — recommended. The free tier is enough to run the full swarm. |
| **Anthropic Claude** (`claude-sonnet-5`) | ✅ Yes, via the `anthropic-dangerous-direct-browser-access` header (already set). |
| **OpenAI** (`gpt-4o-mini`) | ⚠️ May be blocked by CORS depending on account/region; a proxy/backend can be needed. |

For a zero-setup run, use **Gemini**. Since the refactored code is executed for real in the browser, the refactoring target must be runnable **JavaScript**.

### Production Build
To build the project for production:
```bash
npm run build
```
The compiled, minified bundle will be output to the `/dist` directory.
