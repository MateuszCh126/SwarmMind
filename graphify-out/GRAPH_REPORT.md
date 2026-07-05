# Graph Report - Project  (2026-06-12)

## Corpus Check
- 25 files · ~9,731 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 137 nodes · 175 edges · 15 communities (11 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `compilerOptions` - 16 edges
3. `useSwarmStore` - 15 edges
4. `scripts` - 6 edges
5. `callLLM()` - 6 edges
6. `AgentId` - 6 edges
7. `runSwarmOrchestration()` - 5 edges
8. `SwarmMind – Visual Multi-Agent Swarm Orchestrator` - 5 edges
9. `cleanJSONString()` - 4 edges
10. `SwarmSettings` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Sidebar()` --calls--> `useSwarmStore`  [EXTRACTED]
  src/components/Sidebar.tsx → src/store/useSwarmStore.ts
- `AgentGraph()` --calls--> `useSwarmStore`  [EXTRACTED]
  src/components/AgentGraph.tsx → src/store/useSwarmStore.ts
- `AgentInspector()` --calls--> `useSwarmStore`  [EXTRACTED]
  src/components/AgentInspector.tsx → src/store/useSwarmStore.ts
- `SettingsModal()` --calls--> `useSwarmStore`  [EXTRACTED]
  src/components/SettingsModal.tsx → src/store/useSwarmStore.ts
- `StatusHeader()` --calls--> `useSwarmStore`  [EXTRACTED]
  src/components/StatusHeader.tsx → src/store/useSwarmStore.ts

## Import Cycles
- None detected.

## Communities (15 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 1 - "Community 1"
Cohesion: 0.20
Nodes (14): LLMRequestParams, defaultSettings, initialAgents, initialConnections, initialTasks, Agent, AgentId, AgentStatus (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (8): AgentGraph(), AgentInspector(), SettingsModal(), SettingsModalProps, StatusHeader(), StatusHeaderProps, TerminalFeed(), useSwarmStore

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (14): dependencies, react, react-dom, zustand, name, private, scripts, build (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (15): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, jsdom, @types/node (+7 more)

### Community 6 - "Community 6"
Cohesion: 0.29
Nodes (9): Sidebar(), callAnthropic(), callGemini(), callLLM(), callOpenAI(), cleanJSONString(), checkPause(), delay() (+1 more)

### Community 7 - "Community 7"
Cohesion: 0.17
Nodes (11): 1. High-Frequency State Isolation (Zustand vs. Context API), 2. GPU-Accelerated 60 FPS Rendering (CSS & SVG Tuning), 3. Real AI Multi-Agent Loop (No Mocks), 🚀 Getting Started, 🛠️ Key Technical Features & Architectural Decisions, Prerequisites, Production Build, 📂 Project Structure (+3 more)

## Knowledge Gaps
- **79 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+74 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Community 5` to `Community 4`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `useSwarmStore` connect `Community 3` to `Community 1`, `Community 6`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _79 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._