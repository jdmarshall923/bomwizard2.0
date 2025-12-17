# Phase 9: AI Integration

## Status: 📋 PLANNED (After Phase 8)

## Overview

Build an AI-powered assistant using Google Gemini that understands your BOM context and helps with:
- **Part/Group Suggestions**: "I'm making a 4 speed bike" → suggests relevant groups
- **BOM Questions**: "What's the most expensive assembly?" → analyzes and answers
- **Cost Analysis**: "Why did costs increase?" → explains version changes
- **Smart Recommendations**: "Find alternatives for B103456" → suggests substitutes

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js)                            │
│  ┌─────────────────┐  ┌──────────────────────────────────────────┐ │
│  │  Chat Modal UI  │  │            BOM Pages                     │ │
│  │  (Overlay)      │  │  (Dashboard, BOM, Configure, etc.)       │ │
│  └────────┬────────┘  └──────────────────────────────────────────┘ │
└───────────┼─────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FIREBASE CLOUD FUNCTIONS                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │  Chat Handler   │  │ Context Builder │  │   Action Executor   │ │
│  │  (HTTP/HTTPS)   │  │ (BOM → Prompt)  │  │   (with confirm)    │ │
│  └────────┬────────┘  └────────┬────────┘  └─────────────────────┘ │
└───────────┼────────────────────┼────────────────────────────────────┘
            │                    │
            ▼                    ▼
┌─────────────────────┐  ┌─────────────────────────────────────────────┐
│   GOOGLE GEMINI     │  │              FIRESTORE                      │
│   (Vertex AI)       │  │  ┌─────────────┐  ┌─────────────────────┐  │
│                     │  │  │ BOM Items   │  │ Chat Sessions       │  │
│  - Text generation  │  │  │ Groups      │  │ (history)           │  │
│  - Function calling │  │  │ Prices      │  │                     │  │
│                     │  │  └─────────────┘  └─────────────────────┘  │
└─────────────────────┘  └─────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 9.1: Foundation (3-4 days)

**Setup Google AI / Vertex AI**
- Configure Vertex AI in Google Cloud Console
- Create Cloud Function for AI requests (keeps API key secure)
- Set up environment variables and secrets

**Context Builder Service**
- Build `aiContextService.ts` that extracts relevant BOM data
- Create structured prompts with project context (groups, items, categories)
- Implement token-efficient context summarization for large BOMs

**Files to create:**
```
functions/src/ai/
├── geminiService.ts      # Gemini API wrapper
├── contextBuilder.ts     # BOM context extraction
└── chatHandler.ts        # HTTP endpoint for chat

lib/ai/
└── aiService.ts          # Client-side AI service
```

---

### Phase 9.2: Chat Modal UI (2-3 days)

**Modal Component**
- Floating action button (FAB) to open chat
- Modal dialog with chat interface
- Message list with user/assistant bubbles
- Input field with send button
- Loading states with typing indicator

**Chat History**
- Store chat sessions in Firestore: `projects/{id}/chatSessions/{sessionId}/messages`
- Load previous conversations
- Clear/new chat functionality

**Files to create:**
```
components/ai/
├── AiChatModal.tsx       # Main modal component
├── ChatMessage.tsx       # Message bubble component
├── ChatInput.tsx         # Input with suggestions
└── SuggestedPrompts.tsx  # Quick action buttons

lib/hooks/
└── useAiChat.ts          # Chat state management hook
```

**UI Mockup:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ✨ BOM Assistant                                    [─] [✕]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🤖 Hi! I can help you with your BOM. Try asking:         │  │
│  │    • "I'm building a mountain bike"                      │  │
│  │    • "What's the total cost of frame assembly?"          │  │
│  │    • "Show me items without vendor prices"               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 👤 I'm making a 4 speed bike with disc brakes           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🤖 Based on your description, I recommend these groups:  │  │
│  │                                                          │  │
│  │ ✅ **GRP-FRAME-A01** - Frame Assembly (45 items)         │  │
│  │    Essential base structure for the bike                 │  │
│  │                                                          │  │
│  │ ✅ **GRP-GEAR-4SPD** - 4-Speed Drivetrain (28 items)    │  │
│  │    Matches your 4-speed requirement                      │  │
│  │                                                          │  │
│  │ ✅ **GRP-BRAKE-DISC** - Disc Brake Assembly (18 items)  │  │
│  │    Hydraulic disc brakes as specified                    │  │
│  │                                                          │  │
│  │ 💡 **Also consider:**                                    │  │
│  │ • GRP-WHEEL-A01 - Wheel Set                             │  │
│  │ • GRP-SEAT-A01 - Seat Assembly                          │  │
│  │                                                          │  │
│  │ [Apply These Selections]                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  [Type a message...]                                    [Send]  │
└─────────────────────────────────────────────────────────────────┘
```

---

### Phase 9.3: Group Suggestions (2-3 days)

**Core Feature: "I'm building a 4 speed bike"**

The AI will:
1. Parse the product description
2. Query available BOM groups with their categories
3. Match groups to the described product
4. Return suggestions with confidence scores

**System Prompt Template:**
```typescript
const systemPrompt = `
You are a BOM (Bill of Materials) assistant for ${projectName}.
Help users select the right component groups for their products.

AVAILABLE GROUPS:
${groups.map(g => `- ${g.groupCode} (${g.category}): ${g.description}, ${g.itemCount} items`).join('\n')}

INSTRUCTIONS:
1. When the user describes a product, suggest relevant groups
2. Explain WHY each group is recommended
3. Note any groups that might be optional
4. If uncertain, ask clarifying questions

RESPONSE FORMAT:
- Use markdown formatting
- List recommended groups with checkmarks (✅)
- List optional groups with lightbulb (💡)
- Include item counts and brief explanations
`;
```

**Integration with Configure Page**
- Add "AI Suggest" button on `/project/[projectId]/configure`
- Pre-fill group selections based on AI recommendations
- Show confidence indicators

---

### Phase 9.4: BOM Q&A Assistant (3-4 days)

**Capabilities:**
- "What's the total cost of the frame assembly?"
- "Show me all new parts that need tracking"
- "Which items don't have vendor prices?"
- "Compare costs between v3 and v5"

**Function Calling (Tool Use):**

The AI can call these functions to retrieve data:

```typescript
const tools = [
  {
    name: "get_bom_stats",
    description: "Get statistics for the current BOM including total items, costs, and breakdowns",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "search_items",
    description: "Search for items by code, description, or filters",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term" },
        filters: {
          type: "object",
          properties: {
            groupCode: { type: "string" },
            costSource: { type: "string", enum: ["placeholder", "estimate", "quote", "contract"] },
            isNewPart: { type: "boolean" },
            isPlaceholder: { type: "boolean" }
          }
        }
      }
    }
  },
  {
    name: "get_assembly_cost",
    description: "Get the total cost breakdown for a specific assembly/group",
    parameters: {
      type: "object",
      properties: {
        groupCode: { type: "string", description: "The group code (e.g., GRP-FRAME-A01)" }
      },
      required: ["groupCode"]
    }
  },
  {
    name: "compare_versions",
    description: "Compare costs and changes between two BOM versions",
    parameters: {
      type: "object",
      properties: {
        versionA: { type: "number", description: "First version number" },
        versionB: { type: "number", description: "Second version number" }
      },
      required: ["versionA", "versionB"]
    }
  },
  {
    name: "get_items_missing_prices",
    description: "Get items that don't have vendor contract prices",
    parameters: {
      type: "object",
      properties: {
        groupCode: { type: "string", description: "Optional: filter by group" }
      }
    }
  }
];
```

**Example Flow:**

```
User: "What's the most expensive assembly?"

AI thinks: I need to get costs for all assemblies
AI calls: get_bom_stats()
Returns: { costByAssembly: [...] }

AI responds: "The most expensive assembly is GRP-FRAME-A01 (Frame Assembly) 
at £45,230, representing 36% of your total BOM cost. This includes 45 items
with an average unit cost of £1,005."
```

---

### Phase 9.5: Smart Actions (2-3 days)

**AI-Triggered Actions:**
- "Add B103456 to GRP-FRAME-A01" → Confirms and executes
- "Apply vendor prices to all frame items" → Bulk action with preview
- "Create a new group for cooling components" → Creates group
- "Mark all BNEW items as new parts" → Batch update

**Action Functions:**

```typescript
const actionTools = [
  {
    name: "add_item_to_group",
    description: "Add an item to a specific group in the working BOM",
    parameters: {
      type: "object",
      properties: {
        itemCode: { type: "string" },
        groupCode: { type: "string" },
        quantity: { type: "number", default: 1 }
      },
      required: ["itemCode", "groupCode"]
    },
    requiresConfirmation: true
  },
  {
    name: "apply_vendor_prices",
    description: "Apply vendor contract prices to items",
    parameters: {
      type: "object",
      properties: {
        groupCode: { type: "string", description: "Optional: limit to specific group" },
        overwriteExisting: { type: "boolean", default: false }
      }
    },
    requiresConfirmation: true
  },
  {
    name: "create_group",
    description: "Create a new custom group",
    parameters: {
      type: "object",
      properties: {
        groupCode: { type: "string" },
        description: { type: "string" },
        category: { type: "string" }
      },
      required: ["groupCode", "description"]
    },
    requiresConfirmation: true
  }
];
```

**Confirmation Flow:**

```
User: "Add B103456 to the frame assembly"

AI: "I'll add B103456 (Hex Bolt M8x25) to GRP-FRAME-A01.

📋 **Pending Action:**
- Item: B103456 - Hex Bolt M8x25
- Target Group: GRP-FRAME-A01 (Frame Assembly)
- Quantity: 1

[Confirm] [Cancel]"

User clicks [Confirm]

AI: "✅ Done! B103456 has been added to GRP-FRAME-A01."
```

---

### Phase 9.6: Polish and Expansion (2-3 days)

**Suggested Prompts**
Quick action buttons for common queries:
- "Suggest groups for my project"
- "Show cost summary"
- "Find items without prices"
- "Compare to last version"

**Response Caching**
- Cache common queries (stats, group lists)
- TTL-based invalidation
- Clear cache on BOM changes

**Error Handling**
- Graceful fallbacks when AI fails
- Rate limiting with user-friendly messages
- Retry logic for transient failures

**Analytics**
- Track query types and success rates
- Monitor response times
- Identify common user needs

---

## Data Models

### ChatSession

```typescript
// Stored in: projects/{projectId}/chatSessions/{sessionId}
interface ChatSession {
  id: string;
  projectId: string;
  userId: string;
  title?: string;              // Auto-generated from first message
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  messageCount: number;
}

// Stored in: projects/{projectId}/chatSessions/{sessionId}/messages/{messageId}
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Timestamp;
  
  // For assistant messages
  toolCalls?: {
    name: string;
    arguments: Record<string, any>;
    result?: any;
  }[];
  
  // For pending actions
  pendingAction?: {
    tool: string;
    arguments: Record<string, any>;
    status: 'pending' | 'confirmed' | 'cancelled' | 'executed';
  };
}
```

### AI Types

```typescript
// types/ai.ts

export interface AiContext {
  projectId: string;
  projectName: string;
  groups: {
    groupCode: string;
    description: string;
    category: string;
    itemCount: number;
  }[];
  stats: {
    totalItems: number;
    totalCost: number;
    assembliesCount: number;
    newPartsCount: number;
    placeholdersCount: number;
  };
  recentVersions?: {
    versionNumber: number;
    totalCost: number;
    createdAt: Timestamp;
  }[];
}

export interface AiRequest {
  projectId: string;
  sessionId?: string;
  message: string;
  context?: Partial<AiContext>;
}

export interface AiResponse {
  message: string;
  suggestions?: GroupSuggestion[];
  pendingAction?: PendingAction;
  data?: Record<string, any>;
}

export interface GroupSuggestion {
  groupCode: string;
  description: string;
  category: string;
  itemCount: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface PendingAction {
  id: string;
  tool: string;
  description: string;
  arguments: Record<string, any>;
  preview?: string;
}
```

---

## API Endpoints

### Cloud Functions

```typescript
// functions/src/ai/index.ts

// Main chat endpoint
export const aiChat = onCall(async (request) => {
  const { projectId, sessionId, message } = request.data;
  const userId = request.auth?.uid;
  
  // 1. Build context from BOM data
  const context = await buildContext(projectId);
  
  // 2. Get chat history
  const history = sessionId 
    ? await getChatHistory(projectId, sessionId) 
    : [];
  
  // 3. Call Gemini
  const response = await callGemini(context, history, message);
  
  // 4. Save messages
  await saveMessages(projectId, sessionId, message, response);
  
  // 5. Return response
  return response;
});

// Execute confirmed action
export const aiExecuteAction = onCall(async (request) => {
  const { projectId, actionId, confirmed } = request.data;
  
  if (!confirmed) {
    return { success: false, message: 'Action cancelled' };
  }
  
  // Execute the pending action
  const result = await executeAction(projectId, actionId);
  return result;
});
```

---

## Example Prompts

| Category | Example Prompt | AI Action |
|----------|---------------|-----------|
| **Group Selection** | "I'm making a 4 speed bike with hydraulic brakes" | Analyzes description, suggests matching groups |
| **Cost Analysis** | "Why is the frame assembly so expensive?" | Gets assembly cost breakdown, identifies high-cost items |
| **Item Search** | "Find all items from vendor MotorCo" | Searches items by vendor, returns list |
| **Comparison** | "What changed between version 2 and 4?" | Calls compare_versions, summarizes changes |
| **Missing Data** | "Which items need prices?" | Finds items with placeholder costs |
| **Recommendations** | "What parts am I missing for a complete drivetrain?" | Compares to typical drivetrain, suggests additions |
| **Actions** | "Mark B103456 as a new part" | Shows confirmation, executes on confirm |

---

## Prerequisites

### Google Cloud Setup

1. **Enable Vertex AI API**
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```

2. **Create Service Account**
   - Go to IAM & Admin → Service Accounts
   - Create account with "Vertex AI User" role
   - Download JSON key

3. **Configure Firebase Functions**
   ```bash
   firebase functions:secrets:set GOOGLE_AI_KEY
   ```

### Firebase Configuration

1. **Upgrade to Blaze Plan** (required for external API calls)

2. **Update functions/package.json**
   ```json
   {
     "dependencies": {
       "@google-cloud/aiplatform": "^3.0.0",
       // or
       "@google/generative-ai": "^0.1.0"
     }
   }
   ```

3. **Add Firestore Indexes**
   ```json
   {
     "collectionGroup": "messages",
     "queryScope": "COLLECTION",
     "fields": [
       { "fieldPath": "timestamp", "order": "ASCENDING" }
     ]
   }
   ```

---

## Success Criteria

Phase 9 is complete when:

1. ✅ Users can open AI chat modal from any project page
2. ✅ AI accurately suggests groups based on product descriptions
3. ✅ AI can answer questions about BOM data (costs, items, stats)
4. ✅ AI can explain version changes and cost drivers
5. ✅ Chat history is persisted and can be resumed
6. ✅ Actions suggested by AI require user confirmation before executing
7. ✅ Error handling provides graceful fallbacks
8. ✅ Response times are acceptable (<5 seconds for most queries)

---

## Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| 9.1 Foundation | 3-4 days | 3-4 days |
| 9.2 Chat Modal UI | 2-3 days | 5-7 days |
| 9.3 Group Suggestions | 2-3 days | 7-10 days |
| 9.4 BOM Q&A | 3-4 days | 10-14 days |
| 9.5 Smart Actions | 2-3 days | 12-17 days |
| 9.6 Polish | 2-3 days | 14-20 days |
| **Total** | **~3-4 weeks** | |

---

## Future Enhancements (Post Phase 9)

- **Voice Input**: "Hey BOM, what's my total cost?"
- **Image Analysis**: Upload product image, AI suggests parts
- **Predictive Costing**: AI estimates costs for new products
- **Supplier Recommendations**: AI suggests best vendors
- **Anomaly Detection**: AI flags unusual cost changes
- **Natural Language Reports**: "Generate a cost report for Q1"

---

**Status**: 📋 Planned (After Phase 8)  
**Created**: December 2024  
**Dependencies**: Phase 6, 7, 8 complete

