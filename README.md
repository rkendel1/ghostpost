# 🎭 Hidenly - AI Ghostpost Application


Hide your secrets within your messages using invisible Unicode characters. Now with AI-powered content generation, browser extension, and universal reveal button!

## 🌟 Features

### 👻 Universal Reveal Button (NEW!)

The **fastest way** to detect and reveal hidden Ghostpost messages on any website!

- **One-Click Installation**: Install a lightweight userscript (5KB) that works everywhere
- **Automatic Detection**: Floating 👻 button appears on every website and scans for hidden messages
- **Visual Counter**: Red badge shows how many hidden messages are on the current page
- **Instant Reveal**: Click to decode all hidden content with one click
- **Works Everywhere**: Twitter, Reddit, Discord, Instagram, Facebook, and any website
- **Zero Setup**: No browser extension needed - just install the userscript
- **Privacy-First**: All processing happens locally in your browser
- **Auto-Updates**: Stays current automatically

[Install Reveal Button →](/install) | [Try Demo →](/demo)

### 📱 Mobile Share Decoder (NEW!)

Quick access to decode hidden messages on mobile devices:

- **One-Tap Decoding**: Paste and reveal with mobile-optimized interface
- **iOS & Android**: Works on all mobile browsers
- **Share Sheet Ready**: Easy copy/paste workflow for mobile messengers
- **Add to Home Screen**: Install as a web app for instant access
- **URL Parameters**: Supports pre-filled text from share intents

[Use Mobile Decoder →](/share)
=======
Hide your secrets within your messages using invisible Unicode characters. Now with AI-powered content generation, analytics tracking, and a browser extension!

## 🌟 Features

### Analytics Dashboard 🆕

- **Per-Post Analytics**: Track decode events for every secret message you create
- **Real-time Insights**: See total decodes, unique users, and decode timeline
- **Platform Breakdown**: Understand which platforms your audience uses (Twitter, Instagram, LinkedIn, etc.)
- **Geographic Data**: View country-level distribution of your audience
- **Referral Tracking**: See where your decoders are coming from
- **Public Analytics**: Allow anyone to check aggregate stats for viral discovery
- **Privacy-Focused**: Anonymous tracking with no PII collection
>>>>>>> main

### Browser Extension

- **Automatic Detection**: Scans web pages for hidden content in real-time
- **Continuous Monitoring**: Enhanced scanning for social media feeds (Twitter/X, Facebook, LinkedIn, etc.)
- **Badge Notifications**: Shows count of hidden messages on the current page
- **Sidebar Interface**: Clean, tabbed UI for viewing and decoding messages
- **Manual Decoder**: Decode any text that may contain hidden content
- **Fast Processing**: Uses WebAssembly for optimal performance
- **Privacy-Focused**: All processing happens locally in your browser

[Get the Extension →](./browser-extension)

### AI Ghostpost Composer

- **AI-Powered Content Generation**: Use OpenAI to generate platform-optimized posts (Twitter, LinkedIn, Facebook, TikTok)
- **Secret Message Encoding**: Hide messages within posts using invisible Unicode characters
- **Analytics Integration**: Automatically embeds tracking IDs for decode analytics
- **Easy Sharing**: Copy/paste workflow for manual posting to social platforms
- **Platform Stubs**: Ready-to-extend API stubs for future direct platform integrations

### Classic Hide/Unhide Tool

- Encode text and images inside any string
- Decode strings to reveal hidden messages or images
- Share encoded messages via any modern messenger
- Uses WASM for optimal performance

### Decode Page


- **Enhanced!** Dedicated page for recipients to decode hidden messages
- Paste any encoded message to reveal its secret
- Supports both hidden text and images
- URL parameter support for mobile share workflows
=======
- Dedicated page for recipients to decode hidden messages
- Paste any encoded message to reveal its secret
- Supports both hidden text and images
- Automatic analytics tracking (privacy-focused)
- User-friendly interface for secret revelation

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- OpenAI API key (for AI features - optional)
- Vercel KV (for analytics in production - optional, uses mock in dev)
- Optional: Rust and wasm-pack (only if you want to rebuild the WASM module)

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

4. **Start development server**

   ```bash
   npm run dev
   ```

   Note: The WASM package is pre-built and included in the repository. If you want to rebuild it:

   ```bash
   npm run build:wasm  # Requires Rust and wasm-pack
   ```

5. **Open in browser**
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
│   │   ├── decode/            # Secret message decoder page (enhanced with URL params)
│   │   ├── install/           # Userscript installation page 🆕
│   │   ├── share/             # Mobile share decoder page 🆕
│   │   ├── demo/              # Demo page for overlay button 🆕
│   │   └── +page.svelte       # Home page with classic tool
│   └── lib/
│       ├── ghostpost.ts       # WASM integration module
│       └── cards/             # Classic hide/unhide components
├── static/
│   └── ghostpost-reveal.user.js  # Universal overlay button userscript 🆕
├── browser-extension/         # Browser extension
│   ├── manifest.json         # Extension configuration
│   ├── scripts/              # Content & background scripts
│   ├── sidebar/              # Sidebar UI
│   ├── styles/               # Extension styles
=======
│   │   │   ├── ai-compose/         # AI content generation endpoint
│   │   │   ├── post/               # Platform posting stub endpoint
│   │   │   └── analytics/          # Analytics API endpoints 🆕
│   │   │       ├── track/          # Track decode events
│   │   │       ├── post/           # Get post analytics
│   │   │       └── public/         # Public aggregate stats
│   │   ├── compose/                # AI Ghostpost composer page
│   │   ├── decode/                 # Secret message decoder page
│   │   ├── dashboard/              # Analytics dashboard 🆕
│   │   ├── analytics/              # Public analytics page 🆕
│   │   └── +page.svelte            # Home page with classic tool
│   └── lib/
│       ├── ghostpost.ts            # WASM integration module with analytics
│       ├── analytics.ts            # Analytics service layer 🆕
│       ├── mock-kv.ts              # Mock KV for local dev 🆕
│       ├── types/
│       │   └── analytics.ts        # Analytics TypeScript types 🆕
│       └── cards/                  # Classic hide/unhide components
├── browser-extension/              # Browser extension
│   ├── manifest.json               # Extension configuration
│   ├── scripts/                    # Content & background scripts
│   ├── sidebar/                    # Sidebar UI
│   ├── styles/                     # Extension styles
>>>>>>> main
│   └── wasm/                 # WASM decoder module
├── wasm/                      # Rust WASM source code
│   ├── src/
│   │   ├── lib.rs            # WASM entry point
│   │   └── hidenly.rs        # Encoding/decoding algorithm
│   └── pkg/                   # Generated WASM build output
├── .env.example              # Environment variables template
└── package.json
```

## 🎯 Usage

### Using the Universal Reveal Button (Recommended!)

This is the **fastest and easiest** way to use Ghostpost:

1. **Visit the install page** at `/install`
2. **Install a userscript manager** (Tampermonkey, Violentmonkey, or Greasemonkey)
3. **Click "Install Reveal Button"** to add the userscript
4. **Visit any webpage** - The 👻 button appears automatically!
5. **Click the button** when it shows a counter to reveal hidden messages

The floating 👻 button will:
- Automatically scan every page for hidden Ghostpost messages
- Show a red counter badge when secrets are detected
- Pulse red to draw your attention
- Open the decoder with one click to reveal all secrets

[Installation Guide →](/install) | [Try Demo →](/demo)

### Using Mobile Share (For Mobile Users)

Quick decoding on mobile devices:

1. **Copy text** from any app (Messages, Twitter, WhatsApp, etc.)
2. **Open** the share page at `/share` (bookmark it!)
3. **Paste the text** in the text box
4. **Tap "Reveal Secret"** to decode

**Pro Tip**: Add the share page to your home screen for instant access!

### Using the Browser Extension

1. **Install the extension** from the `browser-extension` directory
2. **Browse normally** - The extension monitors pages automatically
3. **Check the badge** - If hidden content is found, the icon shows a count
4. **Click the icon** - Open the sidebar to view and decode messages
5. **Use the decoder** - Manually decode any text in the Decoder tab

[Installation Instructions →](./browser-extension/README.md)

### Creating a Secret Post

1. **Go to `/compose` page**
2. **Select platform** (Twitter, LinkedIn, Facebook, or TikTok)
3. **Enter your prompt** - Describe what you want to post
4. **Generate content** - AI creates platform-optimized content (requires OpenAI API key)
5. **Add secret message** - Enter the message you want to hide
6. **Encode** - Create the encoded message with embedded analytics ID
7. **Copy post ID** - Note the UUID shown for tracking your post's analytics
8. **Copy & paste** - Copy the encoded message and manually post it on your chosen platform

### Decoding a Secret Message

1. **Go to `/decode` page**
2. **Paste encoded message** - Paste any message that may contain a secret
3. **Click Decode** - Reveal the hidden content
4. **View the secret** - See the decoded message or image
5. **Analytics tracked** - Decode events are automatically tracked (if analytics enabled)

### Viewing Analytics

1. **Go to `/dashboard` page**
2. **Enter post ID** - Paste the UUID from when you created the post
3. **View insights** - See:
   - Total decodes and unique users
   - Platform breakdown (where people decoded from)
   - Geographic distribution (country-level data)
   - Referral sources
   - Time series of decodes over time

### Public Analytics

1. **Go to `/analytics` page**
2. **View global stats** - See aggregate Ghostpost statistics worldwide
3. **Check any message** - Paste any encoded message to see its public stats
4. **Share insights** - Use for viral discovery and proving engagement

## 🔧 Development

### Building WASM (Optional)

The WASM package is pre-built and committed to the repository. You only need to rebuild it if you modify the Rust code in `/wasm/src/`.

```bash
# One-time build (requires Rust and wasm-pack)
npm run build:wasm

# Watch mode (requires cargo-watch)
npm run watch:wasm

# Development with auto-rebuild
npm run dev:wasm
```

### Building the Browser Extension

```bash
# Build extension with latest WASM
npm run build:extension

# This will:
# - Build the WASM module
# - Copy files to browser-extension/
# - Create a zip file in dist/
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
2. **Add Vercel KV storage**:
   - Go to your Vercel project dashboard
   - Navigate to Storage tab
   - Create a new KV store
   - Connect it to your project (environment variables set automatically)
3. **Set environment variables** in Vercel dashboard:
   - `OPENAI_API_KEY` - Your OpenAI API key (optional, for AI features)
3. **Deploy** - Vercel will automatically detect SvelteKit and deploy

The app is configured with `@sveltejs/adapter-vercel` for seamless deployment.

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Optional - for AI features
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional - for analytics in production (auto-set by Vercel when using KV)
# KV_URL=your-kv-url
# KV_REST_API_URL=your-kv-rest-api-url
# KV_REST_API_TOKEN=your-kv-rest-api-token
# KV_REST_API_READ_ONLY_TOKEN=your-kv-rest-api-read-only-token

# Optional - for future platform integrations
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
FACEBOOK_APP_ID=your-facebook-app-id
TIKTOK_CLIENT_KEY=your-tiktok-client-key
```

**Note**: Local development works without KV credentials using an in-memory mock store.

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
