# Phase 12: AI Integration

**Status**: 📋 Future Enhancement  
**Estimated Duration**: 3-4 weeks  
**Dependencies**: Phases 9-11 complete

---

## Overview

AI-powered assistant using Google Gemini that helps users build BOMs through natural language.

---

## Features

### Group Suggestions
"I'm making a 4 speed bike" → suggests relevant groups from template

### BOM Questions
"What's the most expensive assembly?" → analyzes and answers

### Cost Analysis
"Why did costs increase?" → explains version changes

### Smart Actions
"Add B103456 to frame assembly" → executes with confirmation

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js)                            │
│  ┌─────────────────┐  ┌──────────────────────────────────────────┐ │
│  │  Chat Modal UI  │  │            BOM Pages                     │ │
│  └────────┬────────┘  └──────────────────────────────────────────┘ │
└───────────┼─────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FIREBASE CLOUD FUNCTIONS                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐ │
│  │  Chat Handler   │  │ Context Builder │  │   Action Executor   │ │
└───────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────┐
│   GOOGLE GEMINI     │
│   (Vertex AI)       │
└─────────────────────┘
```

---

## Sub-Phases

| Phase | Duration | Description |
|-------|----------|-------------|
| 12.1 Foundation | 3-4 days | Gemini setup, context builder, Cloud Function |
| 12.2 Chat Modal | 2-3 days | Chat UI, message bubbles, history |
| 12.3 Group Suggestions | 2-3 days | "I'm building a bike" → groups |
| 12.4 BOM Q&A | 3-4 days | Function calling for data queries |
| 12.5 Smart Actions | 2-3 days | AI-triggered actions with confirmation |
| 12.6 Polish | 2-3 days | Caching, error handling, analytics |

---

## Phase 12.1: Foundation

### Google AI Setup
- Configure Vertex AI in Google Cloud Console
- Create Cloud Function for AI requests
- Set up environment variables and secrets

### Context Builder Service
- Extract relevant BOM data for prompts
- Create structured prompts with project context
- Implement token-efficient summarization

### Files to Create
```
functions/src/ai/
├── geminiService.ts     # Gemini API wrapper
├── contextBuilder.ts    # BOM context extraction
└── chatHandler.ts       # Chat endpoint

lib/ai/
└── aiService.ts         # Client-side service
```

---

## Phase 12.2: Chat Modal UI

### Components
- Floating action button (FAB) to open chat
- Modal dialog with chat interface
- Message list with user/assistant bubbles
- Input field with send button
- Loading states with typing indicator

### Chat History
- Store in Firestore: `projects/{id}/chatSessions/{sessionId}/messages`
- Load previous conversations
- Clear/new chat functionality

### Files to Create
```
components/ai/
├── AiChatModal.tsx      # Main modal
├── ChatMessage.tsx      # Message bubbles
├── ChatInput.tsx        # Input with suggestions
└── SuggestedPrompts.tsx # Quick actions

lib/hooks/
└── useAiChat.ts         # Chat state hook
```

---

## Phase 12.3: Group Suggestions

### System Prompt Example
```
You are a BOM (Bill of Materials) assistant. The user is building products 
and needs help selecting the right component groups.

Available groups in this project:
- GRP-FRAME-A01 (Frame): Frame Assembly, 45 items
- GRP-SEAT-A01 (Seating): Seat Post Assembly, 12 items  
- GRP-GEAR-A01 (Drivetrain): 4-Speed Gear Assembly, 28 items
- GRP-BRAKE-A01 (Brakes): Hydraulic Brake Set, 18 items
...

When the user describes what they're building, suggest relevant groups 
and explain why each is recommended.
```

### Integration
- "AI Suggest" button on configure page
- Pre-fill group selections
- Confidence indicators

---

## Phase 12.4: BOM Q&A

### Capabilities
- "What's the total cost of the frame assembly?"
- "Show me all new parts that need tracking"
- "Which items don't have vendor prices?"
- "Compare costs between v3 and v5"

### Function Calling (Tool Use)
```typescript
const tools = [
  {
    name: "get_bom_stats",
    description: "Get statistics for the current BOM",
    parameters: { /* schema */ }
  },
  {
    name: "search_items", 
    description: "Search for items by code or description",
    parameters: { query: string, filters: object }
  },
  {
    name: "compare_versions",
    description: "Compare costs between two versions",
    parameters: { versionA: number, versionB: number }
  }
]
```

---

## Phase 12.5: Smart Actions

### AI-Triggered Actions
- "Add B103456 to GRP-FRAME-A01" → Confirms and executes
- "Apply vendor prices to all frame items" → Bulk action with preview
- "Create a new group for cooling components" → Creates group

### Safety
- All actions require user confirmation
- Preview changes before applying
- Undo capability for AI-initiated changes

---

## Phase 12.6: Polish

- Suggested prompts/quick actions
- Response caching for common queries
- Error handling and fallbacks
- Usage analytics
- Rate limiting

---

## Example Prompts

| Category | Prompt |
|----------|--------|
| Group Selection | "I'm making a 4 speed bike with hydraulic brakes" |
| Cost Analysis | "Why is the frame assembly so expensive?" |
| Item Search | "Find all items from vendor MotorCo" |
| Comparison | "What changed between version 2 and 4?" |
| Recommendations | "What parts am I missing for a complete drivetrain?" |
| Actions | "Mark B103456 as a new part that needs tracking" |

---

## Prerequisites

1. **Google Cloud Setup**
   - Enable Vertex AI API
   - Set up service account with AI permissions
   - Configure secrets in Firebase Functions

2. **Firebase Functions Upgrade**
   - May need Blaze plan for external API calls
   - Update dependencies with AI packages

---

## Files Summary

| File | Purpose |
|------|---------|
| `functions/src/ai/geminiService.ts` | Gemini API integration |
| `functions/src/ai/contextBuilder.ts` | BOM context extraction |
| `functions/src/ai/chatHandler.ts` | Chat endpoint handler |
| `components/ai/AiChatModal.tsx` | Main chat modal UI |
| `components/ai/ChatMessage.tsx` | Message bubbles |
| `components/ai/SuggestedPrompts.tsx` | Quick action buttons |
| `lib/ai/aiService.ts` | Client-side service |
| `lib/hooks/useAiChat.ts` | Chat state hook |
| `types/ai.ts` | AI-related types |

---

## Success Criteria

Phase 12 is complete when:
- [ ] Chat modal opens from any project page
- [ ] AI accurately suggests groups based on descriptions
- [ ] AI answers questions about BOM data
- [ ] AI explains version changes and cost drivers
- [ ] Chat history persists and can be resumed
- [ ] Actions require user confirmation

