# 🎭 Hidenly - AI Ghostpost Application

Hide your secrets within your messages using invisible Unicode characters. Now with AI-powered content generation for social media!

## 🌟 Features

### AI Ghostpost Composer
- **AI-Powered Content Generation**: Use OpenAI to generate platform-optimized posts (Twitter, LinkedIn, Facebook, TikTok)
- **Secret Message Encoding**: Hide messages within posts using invisible Unicode characters
- **Easy Sharing**: Copy/paste workflow for manual posting to social platforms
- **Platform Stubs**: Ready-to-extend API stubs for future direct platform integrations

### Classic Hide/Unhide Tool
- Encode text and images inside any string
- Decode strings to reveal hidden messages or images
- Share encoded messages via any modern messenger
- Uses WASM for optimal performance

### Decode Page
- **NEW!** Dedicated page for recipients to decode hidden messages
- Paste any encoded message to reveal its secret
- Supports both hidden text and images
- User-friendly interface for secret revelation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Rust and wasm-pack (for WASM building)
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rkendel1/ghostpost.git
   cd ghostpost
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   ```

4. **Build WASM package**
   ```bash
   npm run build:wasm
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:5173
   ```

## 📁 Project Structure

```
ghostpost/
├── src/
│   ├── routes/
│   │   ├── api/
│   │   │   ├── ai-compose/    # AI content generation endpoint
│   │   │   └── post/          # Platform posting stub endpoint
│   │   ├── compose/           # AI Ghostpost composer page
│   │   ├── decode/            # Secret message decoder page
│   │   └── +page.svelte       # Home page with classic tool
│   └── lib/
│       ├── ghostpost.ts       # WASM integration module
│       └── cards/             # Classic hide/unhide components
├── wasm/                      # Rust WASM source code
│   ├── src/
│   │   ├── lib.rs            # WASM entry point
│   │   └── hidenly.rs        # Encoding/decoding algorithm
│   └── pkg/                   # Generated WASM build output
├── .env.example              # Environment variables template
└── package.json
```

## 🎯 Usage

### Creating a Secret Post

1. **Go to `/compose` page**
2. **Select platform** (Twitter, LinkedIn, Facebook, or TikTok)
3. **Enter your prompt** - Describe what you want to post
4. **Generate content** - AI creates platform-optimized content
5. **Add secret message** - Enter the message you want to hide
6. **Encode** - Create the encoded message
7. **Copy & paste** - Copy the encoded message and manually post it on your chosen platform

### Decoding a Secret Message

1. **Go to `/decode` page**
2. **Paste encoded message** - Paste any message that may contain a secret
3. **Click Decode** - Reveal the hidden content
4. **View the secret** - See the decoded message or image

## 🔧 Development

### Building WASM

```bash
# One-time build
npm run build:wasm

# Watch mode (requires cargo-watch)
npm run watch:wasm
```

### Running Dev Server

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

### Code Quality

```bash
# Check code
npm run check

# Lint
npm run lint

# Format
npm run format
```

## 🌐 Deployment

### Deploy to Vercel

1. **Connect your GitHub repository** to Vercel
2. **Set environment variables** in Vercel dashboard:
   - `OPENAI_API_KEY` - Your OpenAI API key
3. **Deploy** - Vercel will automatically detect SvelteKit and deploy

The app is configured with `@sveltejs/adapter-vercel` for seamless deployment.

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Required for AI features
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional - for future platform integrations
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
FACEBOOK_APP_ID=your-facebook-app-id
TIKTOK_CLIENT_KEY=your-tiktok-client-key
```

## 🔌 Extending Platform Integrations

The `/api/post` endpoint currently provides stub implementations for social media platforms. To add real integrations:

1. **Get API credentials** for your chosen platform
2. **Add credentials** to `.env` file
3. **Install platform SDK**:
   ```bash
   npm install twitter-api-v2  # for Twitter
   npm install linkedin-api-client  # for LinkedIn
   # etc.
   ```
4. **Update `/src/routes/api/post/+server.ts`** with real API calls
5. **Implement OAuth flows** as needed for user authentication

Example stub locations in code are marked with `// TODO: Implement...` comments.

## 📝 API Endpoints

### POST `/api/ai-compose`

Generate AI content for social media posts.

**Request:**
```json
{
  "prompt": "Share excitement about AI",
  "platform": "twitter"
}
```

**Response:**
```json
{
  "success": true,
  "content": "Generated post content...",
  "platform": "twitter"
}
```

### POST `/api/post`

Prepare message for posting (currently returns copy/paste instructions).

**Request:**
```json
{
  "content": "Encoded message...",
  "platform": "twitter"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ready to post to Twitter/X",
  "postUrl": "https://twitter.com/compose/tweet",
  "instructions": "Copy and paste instructions..."
}
```

## ⚠️ Current Limitations

- **Image size**: Images under 10-20KB work best. Larger images create very long strings
- **Unicode support**: Some messengers may not support all invisible Unicode characters
- **Manual posting**: Currently requires copy/paste; direct platform posting requires additional API setup and OAuth flows

## 🎓 How It Works

The app uses invisible Unicode characters (zero-width characters, combining marks) to encode secrets within normal-looking text. The WASM module handles the encoding/decoding:

1. **Encoding**: Converts secret → binary → invisible Unicode → inserts into visible text
2. **Decoding**: Extracts invisible Unicode → converts to binary → reveals secret

This allows secrets to be hidden in plain sight - the text looks normal but contains hidden data!

## 🙏 Credits

- Thanks to [Steganographr](https://github.com/neatnik/steganographr) for inspiration
- Built with [SvelteKit](https://kit.svelte.dev/), [Rust](https://www.rust-lang.org/), and [WebAssembly](https://webassembly.org/)
- UI components from [Skeleton UI](https://www.skeleton.dev/)

## 📄 License

Licensed under [MIT License](LICENSE)

## 🤝 Contributing

Contributions welcome! Feel free to:
- Add more platform integrations
- Improve the encoding algorithm
- Enhance the UI/UX
- Fix bugs or add features

Open an issue or submit a PR!
