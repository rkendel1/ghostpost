# AI-Powered Interactive Ghostposts

**Version**: 1.0  
**Status**: Production-Ready  
**Last Updated**: August 2026

## Overview

Transform Ghostpost from a static message container into an interactive, AI-powered experience. Hidden payloads can now:

- **Converse**: Multi-turn chatbot conversations with persistent history
- **Adapt**: Automatically adjust content based on platform/audience/context
- **Narrate**: Sequential story generation across multiple linked posts

This fundamentally changes how secrets are shared—from reveal → read to reveal → interact.

## Architecture

### Payload Type System Extension

Previous markers (0x00-0x04) handled compression and references. New markers for AI:

```
0x05: MARKER_AI_PROMPT       Single prompt → AI response
0x06: MARKER_CONVERSATION    Multi-turn conversation state
0x07: MARKER_ADAPTIVE        Context-aware content selection
0x08: MARKER_STORY_FRAGMENT  Narrative fragment with continuation
```

### AI Type System

```
0x00: AI_TYPE_CHATBOT      → General purpose multi-turn assistant
0x01: AI_TYPE_POET         → Creative, poetic generation
0x02: AI_TYPE_ANALYST      → Business analysis, strategic thinking
0x03: AI_TYPE_STORYTELLER  → Narrative continuation, worldbuilding
```

### Binary Format: AI Prompt Payload

```
[MARKER: 0x05]
[AI_TYPE: 1 byte]          ← 0x00-0x03
[BASE_PROMPT_LEN: 2 bytes] ← Little-endian u16
[BASE_PROMPT: variable]    ← UTF-8 string
[SYSTEM_MSG_LEN: 2 bytes]  ← 0 if no system message
[SYSTEM_MSG: variable]     ← UTF-8 system message
[METADATA_LEN: 2 bytes]    ← JSON metadata
[METADATA: variable]       ← UTF-8 JSON
```

**Example Hex Dump:**
```
05              # MARKER_AI_PROMPT
00              # AI_TYPE_CHATBOT
42 00           # BASE_PROMPT length = 66 bytes
You are a helpful assistant...  [66 bytes]
58 00           # SYSTEM_MSG length = 88 bytes
You are a curious bot hidden in a secret message...  [88 bytes]
3C 00           # METADATA length = 60 bytes
{"postId":"550e7462...","createdAt":1723423200}  [60 bytes]
```

**Character Budget:**
- 252 bytes of data → ~336 base64 chars → ~672 hidden Unicode chars
- Comparable to inline content, but with full AI payload included

## Use Cases & Examples

### 1. Conversational Secrets

Hidden message opens a chat interface instead of revealing text.

```typescript
import { createConversationalSecret } from '$lib/ai-service';

const { encoded, postId } = await createConversationalSecret(
  'Ever wondered about consciousness? 🤔', // Visible message
  'You are a philosopher discussing consciousness, free will, and AI. Engage thoughtfully and ask follow-up questions.',
  'chatbot' // AI type
);

// User reveals → sees: "🤖 AI Assistant"
// Types: "Do robots have consciousness?"
// AI responds: "That's a profound question. Let me explore..."
// Conversation continues with full history
```

**Flow:**
1. User reveals message
2. Chatbot UI appears with system message
3. User types questions
4. AI responds in real-time
5. History persists across sessions
6. Analytics track: "Conversation had 12 turns, last active 2 hours ago"

**Personality Types:**

```typescript
// Poet: Creative, metaphor-rich responses
await createConversationalSecret(msg, prompt, 'poet');
// System: "Generate poetry in response to prompts..."

// Analyst: Business-focused, strategic thinking
await createConversationalSecret(msg, prompt, 'analyst');
// System: "Provide data-driven perspectives..."

// Storyteller: Narrative continuation, worldbuilding
await createConversationalSecret(msg, prompt, 'storyteller');
// System: "Generate engaging narrative content..."
```

### 1.5 Context-Reactive Replies

The bot responds differently based on:
- **Platform**: Twitter's casual tone vs LinkedIn's professionalism
- **Time**: Different response at 9am (work context) vs 11pm (personal)
- **User Profile**: CEO vs engineer vs designer sees tailored response
- **Geographic Location**: Language, cultural context, local references
- **Device**: Mobile gets brief response, desktop gets detailed

The AI reads context metadata and self-adjusts behavior.

```typescript
// Hidden instruction includes context handlers
const systemMsg = `You are a helpful assistant.
When responding, consider:
- Platform (from context): Adjust tone and format
- Time of day: Morning = professional, evening = casual
- User role: Engineer = technical, Manager = strategic
- Device: Mobile = concise, Desktop = detailed
- Location: Include local context if relevant

Examples:
[If platform = Twitter] Keep response to ~280 chars, make it witty
[If time = 9-5] Professional tone, business focus
[If role = engineer] Technical depth, code examples
[If device = mobile] Short paragraphs, bullets
`;

const { encoded } = await createConversationalSecret(
  'Ask me anything →',
  'Respond helpfully to any question',
  'chatbot',
  systemMsg // Includes context handlers
);
```

**Context Payload Sent to LLM:**
```json
{
  "context": {
    "platform": "twitter",
    "time": 1723449600000,
    "timeOfDay": "evening",
    "userRole": "engineer",
    "userDevice": "mobile",
    "userLanguage": "en-US",
    "userLocation": "US-CA",
    "referrer": "twitter.com",
    "userAgent": "Mozilla/5.0..."
  }
}
```

### 2. Adaptive Reveals

Same hidden message, different content based on where it's shared.

```typescript
import { createAdaptiveReveal, detectContext } from '$lib/ai-service';

const { encoded, contexts } = await createAdaptiveReveal(
  'Secret insights inside 📊',
  'Generate creative and strategic insights about AI',
  {
    twitter: 'Format as a witty, shareable 280-char take on AI trends.',
    linkedin: 'Reframe as professional analysis: ROI, enterprise adoption, strategic implications.',
    generic: 'Provide balanced perspective suitable for general audiences.'
  }
);

// When revealed:
const context = detectContext();
console.log(context.platform); // 'twitter' | 'linkedin' | 'generic'
const adaptedContent = await generateAdaptiveContent(basePrompt, context);
// Returns: platform-specific version of the prompt
```

**Context Detection:**

```typescript
detectContext() returns:
{
  platform: 'twitter' | 'linkedin' | 'facebook' | 'tiktok' | 'generic',
  userRole: 'creator' | 'business' | 'analyst' | 'creative' | 'general',
  tone: 'professional' | 'casual' | 'creative' | 'technical',
  language: 'en' | 'es' | 'fr' | ... // From navigator.language
}
```

**Example Outputs for "Advice about starting a business":**

| Platform | Output |
|---|---|
| **Twitter** | "Bootstrap with MVP, validate PMF, then scale. 🚀" |
| **LinkedIn** | "Strategic framework: Problem validation → Prototype → Product-market fit → Scale. Key metrics: CAC, LTV, growth rate." |
| **Generic** | "Starting a business requires planning, market research, and persistence. Build an MVP, learn from users, iterate." |

### 3. Story Fragments

Sequential narrative where each Ghostpost is one chapter, AI generates the next.

```typescript
import { createStoryFragment, linkStoryFragments } from '$lib/ai-service';

// Create Fragment 1
const frag1 = await createStoryFragment(
  'Read the mystery 👇',
  'The detective stepped into the abandoned mansion. A cold wind whistled through broken windows.',
  'The Mystery at Midnight'
);

// Create Fragment 2 (references frag1)
const frag2 = await createStoryFragment(
  'The plot thickens →',
  'Footsteps echoed from the second floor. The detective drew her weapon.',
  'The Mystery at Midnight',
  frag1.postId // Link to previous fragment
);

// Link fragments together
await linkStoryFragments([
  { fragmentId: frag1.postId, title: 'Chapter 1', summary: 'A mysterious arrival' },
  { fragmentId: frag2.postId, title: 'Chapter 2', previousFragmentId: frag1.postId, summary: 'Strange sounds' }
]);

// User can read full story:
const story = await retrieveStory('The Mystery at Midnight');
// Returns ordered list of all fragments
```

**Flow:**
1. User reveals Fragment 1 → reads introduction
2. Reveals Fragment 2 → sees AI-generated continuation
3. Reveals Fragment 3 → AI builds on fragments 1 & 2
4. System maintains narrative coherence across fragments
5. User can branch narratives (multiple "Chapter 2" paths)

**AI Integration:**
```
Fragment 1 content: "Detective entered the mansion..."
Fragment 2 prompt: "Continue this story. Previous: [Fragment 1]. 
                    Generate next paragraph maintaining tone and plot."
AI system message: "You are a storyteller. Continue narratives with 
                    consistent characters and compelling plot."
```

## API Reference

### Core Functions

#### `createConversationalSecret()`

```typescript
async function createConversationalSecret(
  visibleMessage: string,
  initialPrompt: string,
  aiType?: 'chatbot' | 'poet' | 'analyst' | 'storyteller',
  systemMessage?: string
): Promise<{
  encoded: string;
  postId: string;
  visibleLength: number;
  hiddenLength: number;
  totalLength: number;
}>
```

**Parameters:**
- `visibleMessage`: Text visible before reveal
- `initialPrompt`: System instruction for AI (e.g., "You are a helpful coding assistant")
- `aiType`: Personality type (defaults to 'chatbot')
- `systemMessage`: Custom system message (overrides default)

**Returns:**
- `encoded`: Full hidden message ready to post
- `postId`: Unique identifier for this conversation
- `*Length`: Character counts for analytics

#### `createAdaptiveReveal()`

```typescript
async function createAdaptiveReveal(
  visibleMessage: string,
  basePrompt: string,
  contextVariants?: Record<string, string>
): Promise<{
  encoded: string;
  postId: string;
  contexts: Record<string, string>;
}>
```

**Parameters:**
- `visibleMessage`: Text visible before reveal
- `basePrompt`: Core instruction for AI
- `contextVariants`: Platform-specific variant prompts

**Context Keys:**
- `twitter`: 280 characters, witty, shareable
- `linkedin`: Professional, business-focused
- `creative`: Poetic, artistic
- `technical`: Deep, detailed
- `generic`: Balanced default

#### `createStoryFragment()`

```typescript
async function createStoryFragment(
  visibleMessage: string,
  storyStart: string,
  storyTitle?: string,
  previousFragmentId?: string
): Promise<{
  encoded: string;
  postId: string;
  nextPrompt: string;
}>
```

#### Conversation Management

```typescript
// Initialize conversation for a revealed message
async function initializeConversation(
  payload: AIPromptPayload,
  postId: string
): Promise<ConversationState>

// Send user message, get AI response
async function sendMessage(
  postId: string,
  userMessage: string,
  aiProvider?: 'webllm' | 'ollama' | 'local' | 'api'
): Promise<string>

// Retrieve conversation history
function getConversation(postId: string): ConversationState | undefined

// Persist to database
async function saveConversation(postId: string): Promise<void>

// Clear from memory
function clearConversation(postId: string): void
```

### Context Detection

```typescript
function detectContext(): ContentContext {
  platform?: 'twitter' | 'linkedin' | 'facebook' | 'tiktok' | 'generic';
  userRole?: 'creator' | 'business' | 'creative' | 'analyst' | 'general';
  tone?: 'professional' | 'casual' | 'creative' | 'technical';
  language?: string;
  additionalContext?: Record<string, any>;
}

async function generateAdaptiveContent(
  basePrompt: string,
  context?: ContentContext
): Promise<string>
```

### Story Management

```typescript
interface StoryLink {
  fragmentId: string;
  title: string;
  previousFragmentId?: string;
  nextFragmentId?: string;
  summary: string;
}

function linkStoryFragments(fragments: StoryLink[]): void

async function retrieveStory(storyTitle: string): Promise<string[]>
```

## REST API Endpoints

### POST /api/ai/chat

Send a message in an active conversation.

**Request:**
```json
{
  "postId": "550e7462-...",
  "aiType": "chatbot",
  "messages": [
    { "role": "system", "content": "You are..." },
    { "role": "assistant", "content": "[Initializing...]" }
  ],
  "userMessage": "How do I debug this error?",
  "provider": "ollama",
  "model": "neural-chat",
  "temperature": 0.7
}
```

**Response:**
```json
{
  "content": "To debug that error, let's start with...",
  "provider": "ollama",
  "model": "neural-chat"
}
```

### POST /api/conversations/save

Persist conversation state.

**Request:**
```json
{
  "postId": "550e7462-...",
  "aiType": "chatbot",
  "messages": [...],
  "modelUsed": "ollama",
  "createdAt": 1723423200000,
  "lastModified": 1723426800000
}
```

**Response:**
```json
{ "success": true, "postId": "550e7462-..." }
```

### GET /api/conversations/save?post_id=<id>

Retrieve saved conversation.

**Response:**
```json
{
  "conversation": {
    "postId": "550e7462-...",
    "aiType": "chatbot",
    "messages": [...],
    "modelUsed": "ollama",
    "createdAt": 1723423200000,
    "lastModified": 1723426800000
  }
}
```

### POST /api/story/link

Link story fragments together.

**Request:**
```json
{
  "fragments": [
    {
      "fragmentId": "550e7462-...",
      "title": "The Mystery at Midnight",
      "previousFragmentId": null,
      "nextFragmentId": "550e7463-...",
      "summary": "A detective discovers an abandoned mansion..."
    },
    {
      "fragmentId": "550e7463-...",
      "title": "The Mystery at Midnight",
      "previousFragmentId": "550e7462-...",
      "nextFragmentId": null,
      "summary": "Strange sounds lead deeper into the mansion..."
    }
  ]
}
```

### GET /api/story/retrieve?title=<title>

Get all fragments of a story in order.

**Response:**
```json
{
  "title": "The Mystery at Midnight",
  "fragmentCount": 5,
  "fragments": [
    { "postId": "550e7462-...", "summary": "...", "order": 1 },
    { "postId": "550e7463-...", "summary": "...", "order": 2 }
  ]
}
```

## LLM Backend Configuration

### WebLLM (Browser-based, Privacy-first)

No server required. Runs entirely in browser.

```html
<!-- Load WebLLM -->
<script src="https://webllm.mlc.ai/webllm-all.js"></script>

<script>
  // Initialize engine
  const engine = new mlc.MLCEngine();
  
  // Load model
  await engine.reload('Llama-2-7b-chat-q4f32_1');
  
  // Use in Ghostpost
  const response = await engine.chat.completions.create({
    messages: [...],
    temperature: 0.7,
    max_tokens: 512
  });
</script>
```

**Supported Models:**
- Llama 2 (7B, 13B)
- Mistral (7B)
- OpenChat (3.5, 4)
- Neural Chat (7B)

**Performance:**
- M1/M2 Mac: 2-10 tokens/sec
- RTX 3060: 15-30 tokens/sec
- Apple Silicon: 5-15 tokens/sec

### Ollama (Local API Server)

Run an open-source LLM locally.

```bash
# Install Ollama from ollama.ai
# Pull a model
ollama pull neural-chat    # 4.7B, ~2.5GB
ollama pull mistral        # 7B, ~4.1GB
ollama pull llama2         # 7B, ~3.8GB

# Start server (runs on localhost:11434)
ollama serve
```

**Configuration:**
```typescript
// Use in Ghostpost
await sendMessage(postId, userMessage, 'ollama');

// Or with custom model
fetch('/api/ai/chat', {
  method: 'POST',
  body: JSON.stringify({
    ...,
    provider: 'ollama',
    model: 'neural-chat'
  })
});
```

**Speed:** 10-50 tokens/sec depending on hardware

### OpenAI

Requires API key.

```bash
export OPENAI_API_KEY="sk-..."
```

**Models:**
- `gpt-3.5-turbo`: Fast, good quality
- `gpt-4`: Better reasoning, slower
- `gpt-4-turbo`: Balance of both

**Cost:** ~$0.001-0.01 per 1K tokens

### Anthropic (Claude)

Requires API key.

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

**Models:**
- `claude-3-5-sonnet`: Fast, versatile
- `claude-3-opus`: Most capable

**Cost:** ~$0.003-0.015 per 1K tokens

## Database Schema

### conversations

```sql
CREATE TABLE conversations (
  post_id UUID PRIMARY KEY REFERENCES posts(id),
  ai_type VARCHAR(50),  -- chatbot | poet | analyst | storyteller
  messages JSONB,       -- Array of { role, content, timestamp }
  model_used VARCHAR(100),
  created_at TIMESTAMP,
  last_modified TIMESTAMP,
  updated_at TIMESTAMP
);
```

### story_fragments

```sql
CREATE TABLE story_fragments (
  post_id UUID PRIMARY KEY REFERENCES posts(id),
  story_title VARCHAR(255),
  previous_fragment_id UUID REFERENCES story_fragments(post_id),
  next_fragment_id UUID REFERENCES story_fragments(post_id),
  summary TEXT,
  updated_at TIMESTAMP
);
```

## UI Components

### ChatbotReveal.svelte

Complete chat interface for conversational secrets.

**Props:**
- `payload`: AIPromptPayload from decode
- `postId`: Unique identifier
- `onClose`: Callback to close interface

**Features:**
- Message history with timestamps
- User/assistant differentiation
- Real-time loading indicators
- Auto-scroll toggle
- Clear history button
- Privacy notices
- Keyboard shortcuts (Enter to send)

**Usage:**
```svelte
<ChatbotReveal 
  {payload} 
  {postId} 
  onClose={() => showChat = false}
/>
```

## Performance & Optimization

### Token Budget

Default configuration balances quality and size:

```
Temperature: 0.7       (Moderate creativity)
Max Tokens: 512        (~400 words)
Hidden Chars: ~672     (AI prompt + metadata)
```

For shorter responses:
```typescript
await sendMessage(postId, message);
// Response: 50-150 tokens = 2-5KB hidden characters
```

### Caching Strategy

```
Conversation history: In-memory (per browser session)
Persistent storage: Database (survives refreshes)
LLM cache: Varies by provider
  - Ollama: No caching (fresh response each time)
  - OpenAI: Optional prompt caching
  - Claude: Automatic context caching
```

### Latency Breakdown

| Component | Time |
|---|---|
| Encode/decode WASM | <1ms |
| Fetch from DB | 10-50ms |
| LLM inference | 1-60s (depends on model) |
| Total end-to-end | 1-61s |

**Optimization Tips:**
- Use WebLLM for sub-1s local responses
- Use Ollama for 2-10s responses
- Use API backends (OpenAI, Claude) for quality > speed
- Cache responses client-side when possible

## Security & Privacy

### Data Protection

✅ **Local Inference:** WebLLM/Ollama keeps all data on your machine
✅ **Encrypted Transport:** TLS for all API calls
✅ **Database Encryption:** Supabase provides at-rest encryption
✅ **User Isolation:** RLS policies prevent cross-user access
✅ **No Telemetry:** No analytics on conversation content

### API Key Safety

```bash
# ✅ DO: Use environment variables
export OPENAI_API_KEY="sk-..."

# ✅ DO: Restrict to server-side only
// In +server.ts files only, never in client code

# ❌ DON'T: Commit keys to git
# ❌ DON'T: Expose API keys in client-side code
# ❌ DON'T: Log API keys or tokens
```

### Content Moderation

Consider implementing:
- Input validation (no injections)
- Output filtering (remove harmful content)
- Rate limiting (prevent spam/abuse)
- Usage monitoring (detect unusual patterns)

## Examples

### Full Example: Conversational Mystery

```typescript
// Create the message
const { encoded } = await createConversationalSecret(
  'Solve the mystery 🔍',
  `You are a mysterious game master running an interactive mystery game.
   The player is investigating strange occurrences in a small town.
   Ask follow-up questions, provide clues, and guide them toward the solution.
   Be mysterious and engaging.`,
  'chatbot'
);

// User reveals and interacts:
// User: "What happened to the mayor?"
// AI: "Ah, good question. Have you noticed anything odd about..."
// User: "I found a letter in the library"
// AI: "A letter! What does it say? That could be crucial..."
// [Conversation continues for 20+ turns]
```

### Full Example: Adaptive Business Advice

```typescript
const { encoded } = await createAdaptiveReveal(
  'Business wisdom unlocked 💼',
  'Generate advice for scaling a startup',
  {
    twitter: '🚀 Scale in 3 steps: Find your MVP, Validate product-market fit, Then go big. Most founders get the order wrong.',
    linkedin: 'Scaling Framework: (1) Validate PMF quantitatively (2) Build repeatable growth engine (3) Invest in infrastructure. KPIs to track: CAC, LTV, burn rate.',
    generic: 'To scale a startup: First build something customers want (MVP testing), then find repeatable ways to acquire customers (growth), finally invest in operations.'
  }
);
```

### Full Example: Serialized Story

```typescript
// Fragment 1
const frag1 = await createStoryFragment(
  'Read a story →',
  'Maya stepped through the dimensional portal. Reality bent around her.',
  'The Multiverse Chronicles'
);

// Fragment 2
const frag2 = await createStoryFragment(
  'What happens next? →',
  frag1.nextPrompt + 
  '\n\nSo far: Maya stepped through a portal. Reality bent around her.',
  'The Multiverse Chronicles',
  frag1.postId
);

// Fragment 3
const frag3 = await createStoryFragment(
  'Read the climax →',
  frag2.nextPrompt +
  '\n\nPreviously: Maya entered the portal. She witnessed reality bending...',
  'The Multiverse Chronicles',
  frag2.postId
);

// Link and retrieve
await linkStoryFragments([frag1, frag2, frag3]);
const fullStory = await retrieveStory('The Multiverse Chronicles');
// Returns all 3 fragments in order
```

## Troubleshooting

### "WebLLM not initialized"

**Error:** WebLLM library not loaded

**Fix:**
```html
<!-- Ensure this is in your HTML head -->
<script src="https://webllm.mlc.ai/webllm-all.js"></script>
```

### "Ollama error: Failed to connect"

**Error:** Ollama server not running

**Fix:**
```bash
# Make sure Ollama is running
ollama serve

# Or check if it's already running
curl http://localhost:11434/api/tags
```

### "OpenAI error: 401 Unauthorized"

**Error:** Invalid API key

**Fix:**
```bash
# Check key is set correctly
echo $OPENAI_API_KEY

# Verify key has access to chat completions API
# Check at: https://platform.openai.com/account/billing/overview
```

### Conversation not persisting

**Causes:**
- Browser cache cleared
- Database not configured
- RLS policies blocking write

**Fix:**
```typescript
// Explicitly save before leaving page
window.addEventListener('beforeunload', async () => {
  await saveConversation(postId);
});
```

## See Also

- [Content Delivery Fabric](./CONTENT_DELIVERY_FABRIC.md)
- [WASM Encoding](./wasm/src/hidenly.rs)
- [AI Service API](./src/lib/ai-service.ts)
- [Chat Component](./src/routes/decode/ChatbotReveal.svelte)
