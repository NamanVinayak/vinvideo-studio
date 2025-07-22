# ⚠️ PLAN RETRACTED - DO NOT IMPLEMENT ⚠️

**Status: CANCELLED after expert technical review**

**Original Plan**: Implementing an Event-Driven "Bulletin Board" Architecture

**Why this plan was retracted**: After comprehensive technical analysis by Claude Code, this approach was found to have critical architectural flaws that would introduce security vulnerabilities and break Next.js compatibility.

## Critical Issues Identified

1. **Next.js Incompatibility**: The proposed EventEmitter singleton pattern conflicts with Next.js serverless architecture
2. **Security Vulnerabilities**: Shared state between users could lead to data leakage 
3. **Session Isolation**: Multi-user concurrent access would break request isolation
4. **Memory Leaks**: Singleton EventBus with growing dataStore would cause memory issues
5. **Deployment Issues**: Incompatible with serverless deployment patterns

## Replacement Strategy

This plan has been **superseded by the approved 3-phase approach**:
- **Phase 1**: Prompt Refactoring (safe, immediate benefits)
- **Phase 2**: Promise.all() Parallel Execution (controlled scope)
- **Phase 3**: Risk aversion (no major architectural changes)

See `APPROVED_IMPLEMENTATION_PLAN.md` for the current strategic direction.

---

**⚠️ DO NOT PROCEED WITH THE ORIGINAL PLAN BELOW ⚠️**

### **Core Concept**

Instead of a central function calling each agent in a rigid sequence, agents will react to events. When an agent finishes its work, it will post its results to a shared "bulletin board" and announce that it's done. Other agents that depend on that result will be "listening" for that announcement and will trigger themselves automatically when their required data is available.

This approach, known as a publish-subscribe (or pub/sub) pattern, will make our system more flexible, easier to maintain, and better prepared for parallel execution.

### **Technology Choice**

We will use Node.js's built-in `EventEmitter` module. It's lightweight, already part of the environment (no new dependencies), and perfectly suited for our needs. We don't need a heavy-duty message queue like RabbitMQ or Kafka at this stage.

### **Implementation Steps**

#### **Step 1: Create the "Bulletin Board" Service (Event Bus)**

We'll create a new singleton service that manages both the events and the shared data.

**File:** `src/services/PipelineEventBus.ts`

```typescript
import { EventEmitter } from 'events';

// This class will be a singleton to ensure one instance across the request
class PipelineEventBus extends EventEmitter {
  private static instance: PipelineEventBus;
  private dataStore: Map<string, any>;

  private constructor() {
    super();
    this.dataStore = new Map();
  }

  public static getInstance(): PipelineEventBus {
    if (!PipelineEventBus.instance) {
      PipelineEventBus.instance = new PipelineEventBus();
    }
    return PipelineEventBus.instance;
  }

  // Method to post data to the "bulletin board"
  public postData(key: string, value: any): void {
    this.dataStore.set(key, value);
    // Announce that new data is available
    this.emit(key, value);
  }

  // Method to retrieve data from the "bulletin board"
  public getData(key: string): any {
    return this.dataStore.get(key);
  }

  // Method to wait for a specific piece of data to be posted
  public waitForData(key: string): Promise<any> {
    return new Promise((resolve) => {
      if (this.dataStore.has(key)) {
        resolve(this.dataStore.get(key));
      } else {
        this.once(key, (data) => resolve(data));
      }
    });
  }
}

export default PipelineEventBus.getInstance();
```

#### **Step 2: Refactor Agents to be Event-Driven**

Each agent's API route will be modified. Instead of being called with a large payload of all previous results, it will be triggered and will fetch the data it needs from the `PipelineEventBus`.

**Example: Refactoring the Director Agent (`/api/director-agent/route.ts`)**

**Before (Current Way):**
```typescript
// Receives everything in the request body
export async function POST(request: NextRequest) {
  const { producer_output, script, visionDocument, ... } = await request.json();
  // ... agent logic using the body ...
}
```

**After (New Way):**
```typescript
import PipelineEventBus from '@/services/PipelineEventBus';

export async function executeDirectorAgent(sessionId: string) {
  // 1. Wait for the data it needs to be posted on the board
  const producerOutput = await PipelineEventBus.waitForData(`producerOutput:${sessionId}`);
  const visionDocument = await PipelineEventBus.waitForData(`visionDocument:${sessionId}`);
  
  // 2. Run the agent's core logic
  const directorResult = await runDirectorLogic(producerOutput, visionDocument);

  // 3. Post its own results back to the board and announce it's done
  PipelineEventBus.postData(`directorOutput:${sessionId}`, directorResult);
}
```
*(Note: We would wrap the agent logic in functions like `executeDirectorAgent` that can be called internally, rather than exposing them all as public API routes).*

#### **Step 3: Create the "Master Chef" (Dependency Manager)**

This is the new, smarter component that understands the "recipe" for each pipeline. It listens to all the "ready" announcements from the `PipelineEventBus` and checks if an agent has all the ingredients it needs to start working.

**File:** `src/services/PipelineDependencyManager.ts`

```typescript
import PipelineEventBus from './PipelineEventBus';
import {
  executeDirectorAgent,
  executeDoPAgent,
  // ... import all agent execution functions
} from '@/agents';

// Define the "recipes" for each pipeline
const pipelineRecipes = {
  MUSIC_VIDEO: {
    director: {
      dependencies: ['producerOutput', 'visionDocument'],
      execute: executeDirectorAgent,
    },
    dop: {
      dependencies: ['directorOutput', 'producerOutput'],
      execute: executeDoPAgent,
    },
    // ... other agents in this pipeline
  },
  VISION_ENHANCED: {
    // ... recipe for this pipeline
  },
  // ... other pipelines
};

class PipelineDependencyManager {
  private activePipelines: Map<string, any>;

  constructor() {
    this.activePipelines = new Map();
    // Listen to ALL events on the bus
    PipelineEventBus.on('*', this.handleEvent.bind(this));
  }

  public startPipeline(sessionId: string, pipeline: string) {
    this.activePipelines.set(sessionId, {
      pipeline,
      completedSteps: new Set(),
    });
  }

  private handleEvent(event: string, data: any) {
    const [eventName, sessionId] = event.split(':');
    if (!sessionId || !this.activePipelines.has(sessionId)) {
      return;
    }

    const pipelineState = this.activePipelines.get(sessionId);
    pipelineState.completedSteps.add(eventName);

    this.checkForRunnableAgents(sessionId, pipelineState);
  }

  private checkForRunnableAgents(sessionId: string, pipelineState: any) {
    const recipe = pipelineRecipes[pipelineState.pipeline];
    if (!recipe) return;

    for (const agentName in recipe) {
      const agentRecipe = recipe[agentName];
      
      // Check if this agent's dependencies are met
      const canRun = agentRecipe.dependencies.every(dep => 
        pipelineState.completedSteps.has(dep)
      );

      if (canRun && !pipelineState.completedSteps.has(agentName)) {
        // Mark as completed immediately to prevent re-triggering
        pipelineState.completedSteps.add(agentName); 
        
        console.log(`[${sessionId}] Dependencies met for '${agentName}'. Executing now.`);
        // Execute the agent
        agentRecipe.execute(sessionId);
      }
    }
  }
}

export default new PipelineDependencyManager();
```

#### **Step 4: Update the Main Pipeline Orchestrator**

The main `execute-pipeline` endpoint becomes even simpler. It just tells the Dependency Manager to start and then kicks off the first agents.

**File:** `/src/app/api/execute-pipeline/route.ts` (New Logic)

```typescript
import PipelineDependencyManager from '@/services/PipelineDependencyManager';
import { executeVisionAgent, executeMusicAnalysisAgent } from '@/agents';

export async function POST(request: NextRequest) {
  const { pipeline, parameters, sessionId } = await request.json();

  // Tell the Dependency Manager to start watching this session
  PipelineDependencyManager.startPipeline(sessionId, pipeline);

  // Kick off the initial, independent agents
  if (pipeline === 'MUSIC_VIDEO') {
    executeVisionAgent(sessionId, parameters);
    executeMusicAnalysisAgent(sessionId, parameters);
  } else {
    executeVisionAgent(sessionId, parameters);
  }

  return NextResponse.json({ success: true, sessionId });
}
```

### **Benefits of This Enhanced Approach**

1.  **Handles Complex Dependencies:** This system can manage agents that need multiple inputs (like our DoP agent) without any extra complexity in the agent code itself.
2.  **Centralized Recipes:** The "recipes" for each pipeline are defined in one place (`PipelineDependencyManager.ts`), making them easy to understand and modify.
3.  **Extremely Scalable:** Adding a new agent is as simple as adding its recipe to the list. The system will automatically handle its execution when its dependencies are met.
4.  **Increased Parallelism:** This model naturally allows for maximum parallelism. Any agents that have their dependencies met will run immediately, without waiting for other, unrelated agents.
5.  **Decoupling:** Agents remain completely decoupled. They just post their results and don't need to know who is listening or what happens next.
