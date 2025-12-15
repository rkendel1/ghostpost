# 👻 GhostPost - Hide Secrets in Plain Sight

Hide your secrets within your messages using invisible Unicode characters. Share publicly, reveal selectively.

## 🌟 Features

### 🎯 Unified Compose Experience

Create GhostPosts with our streamlined, intuitive interface:

- **AI or Manual Mode**: Toggle between AI-powered content generation and manual composition
- **Step-by-Step Flow**: Clear, guided process from message creation to encoding
- **Multi-Platform Support**: Optimized content for Twitter, LinkedIn, Facebook, and TikTok
- **Instant Encoding**: Hide text or images within your messages
- **Account Integration**: Automatically save posts when signed in

### 🔐 Authentication & Account Management

GhostPost includes optional account features for power users:

- **Optional Sign-In**: Use basic features without an account, sign in for advanced features
- **My Posts Dashboard**: View all your GhostPosts in one place
- **Analytics Tracking**: See who decodes your messages and when
- **Secure Storage**: Your posts and secrets are securely stored with Supabase
- **Easy Sign-Up**: Quick email/password authentication

### 📊 Analytics Dashboard

Track the reach and impact of your GhostPosts (requires account):

- **Per-Post Analytics**: Track decode events for every secret message you create
- **Real-time Insights**: See total decodes, unique users, and decode timeline
- **Platform Breakdown**: Understand which platforms your audience uses
- **Geographic Data**: View country-level distribution of your audience
- **Referral Tracking**: See where your decoders are coming from
- **Privacy-Focused**: Anonymous tracking with no PII collection

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
- # URL parameter support for mobile share workflows
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
- Redis instance (for analytics in production - optional, uses mock in dev)
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
   # Required: Supabase credentials (already pre-configured in .env.example)
   # Optional: Add your OPENAI_API_KEY for AI features
   # Optional: Add REDIS_URL for analytics in production
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
│   │   │   ├── ai-compose/         # AI content generation endpoint
│   │   │   ├── post/               # Platform posting stub endpoint
│   │   │   └── analytics/          # Analytics API endpoints
│   │   ├── compose/                # Unified GhostPost composer (auth required)
│   │   ├── decode/                 # Secret message decoder (auth required)
│   │   ├── dashboard/              # My Posts & Analytics (auth required)
│   │   ├── analytics/              # Public analytics page
│   │   ├── install/                # Userscript installation page
│   │   ├── share/                  # Mobile share decoder page
│   │   ├── demo/                   # Demo page for overlay button
│   │   └── +page.svelte            # Landing page with interactive demo
│   └── lib/
│       ├── components/             # Reusable UI components
│       │   ├── AuthGuard.svelte   # Authentication guard for protected pages
│       │   └── AuthModal.svelte   # Login/signup modal
│       ├── stores/                 # Svelte stores
│       │   └── auth.ts            # Authentication state management
│       ├── ghostpost.ts           # WASM integration module with analytics
│       ├── supabase.ts            # Supabase client configuration
│       ├── analytics.ts           # Analytics service layer
│       ├── mock-kv.ts             # Mock KV for local dev
│       ├── types/
│       │   └── analytics.ts       # Analytics TypeScript types
│       └── cards/                 # Classic hide/unhide components
├── static/
│   └── ghostpost-reveal.user.js  # Universal overlay button userscript
├── browser-extension/             # Browser extension
│   ├── manifest.json              # Extension configuration
│   ├── scripts/                   # Content & background scripts
│   ├── sidebar/                   # Sidebar UI
│   ├── styles/                    # Extension styles
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

**Desktop (Chrome, Firefox, Edge, Safari):**

1. **Visit `/install`** - Our step-by-step installation wizard
2. **Follow the guided process** - Install Tampermonkey → Install Userscript → Done!

The installation wizard will:

- Guide you through installing Tampermonkey (one-time, 30 seconds)
- Install the Ghostpost Reveal userscript with one click
- Verify installation and show you how to enable incognito mode (optional)
- Test that everything works correctly

**iPhone/iPad (Safari):**

1. **Visit `/install/iphone`** - iPhone-specific installation guide
2. **Install Userscripts App** - Free app from the App Store (~10 seconds)
3. **Enable in Safari Settings** - Settings → Safari → Extensions → Userscripts (~15 seconds)
4. **One-Click Install Script** - Tap the install link to add Ghostpost Reveal

The iPhone installation:

- Uses the free Userscripts app for iOS
- Takes under 30 seconds total
- Works on all websites in Safari
- Auto-updates automatically
- Privacy-focused - all processing happens locally

**What you get:**

- A floating 👻 button on every website (bottom-right corner)
- Automatic scanning for hidden Ghostpost messages
- Red counter badge when secrets are detected
- One-click reveal of all hidden messages
- Auto-updates (no maintenance needed!)
- Works on all websites (Twitter, Reddit, Discord, etc.)

[Desktop Install →](/install-easy) | [iPhone Install →](/install/iphone) | [Try Demo →](/demo)

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

### Creating Your First GhostPost

1. **Sign in** - Create an account or sign in (required for full features)
2. **Go to `/compose` page** - Access the unified composer
3. **Choose your mode**:
   - **AI Mode**: Enable AI toggle, select platform, describe your post
   - **Manual Mode**: Write your own message
4. **Add your secret** - Enter hidden text or upload an image
5. **Encode** - Your post is automatically encoded and saved to your account
6. **Copy & Share** - Copy the encoded message and post anywhere

### Decoding a GhostPost

1. **Sign in** - Authentication required for decode features
2. **Go to `/decode` page**
3. **Paste the message** - Paste any text that might contain a GhostPost
4. **Click Decode** - Reveal the hidden secret
5. **View result** - See the hidden text or image

### Viewing Your Posts

1. **Go to `/dashboard` page** (requires sign-in)
2. **View your posts** - See all your GhostPosts in one place
3. **Check analytics** - Click "View Analytics" on any post to see:
   - Total decodes and unique users
   - Platform breakdown
   - Geographic distribution
   - Decode timeline

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
2. **Set up Redis storage**:
   - Provision a Redis instance (e.g., Redis Labs, Upstash, or Vercel's Redis)
   - Add the `REDIS_URL` environment variable in Vercel dashboard
3. **Set environment variables** in Vercel dashboard:
   - `OPENAI_API_KEY` - Your OpenAI API key (optional, for AI features)
   - `REDIS_URL` - Your Redis connection URL (optional, for analytics)
4. **Deploy** - Vercel will automatically detect SvelteKit and deploy

The app is configured with `@sveltejs/adapter-vercel` for seamless deployment.

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Optional - for AI features
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional - for analytics in production
# Format: redis://[username]:[password]@[host]:[port]
REDIS_URL=redis://default:password@redis-host.com:6379

# Optional - for future platform integrations
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
FACEBOOK_APP_ID=your-facebook-app-id
TIKTOK_CLIENT_KEY=your-tiktok-client-key
```

**Note**: Local development works without Redis credentials using an in-memory mock store.

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

- **Image size**: Images are automatically compressed to ~25KB to stay under 40,000 character platform limits. Very large or complex images may be significantly reduced in quality.
- **Unicode support**: Some messengers may not support all invisible Unicode characters
- **Manual posting**: Currently requires copy/paste; direct platform posting requires additional API setup and OAuth flows

## 🎓 How It Works

The app uses invisible Unicode characters (zero-width characters, combining marks) to encode secrets within normal-looking text. The WASM module handles the encoding/decoding:

1. **Encoding**: Converts secret → binary → invisible Unicode → inserts into visible text
2. **Decoding**: Extracts invisible Unicode → converts to binary → reveals secret

This allows secrets to be hidden in plain sight - the text looks normal but contains hidden data!

## 🗺️ Strategic Roadmap

Want to see where GhostPost is headed? Check out our strategic planning documents:

- **[📚 Roadmap Index](./ROADMAP_INDEX.md)** - Start here for an overview of all planning documents
- **[🚀 Product Roadmap](./PRODUCT_ROADMAP.md)** - Comprehensive 24-month strategic roadmap with IP analysis
- **[💼 Executive Summary](./EXECUTIVE_SUMMARY.md)** - Investor & acquirer-focused brief
- **[⚡ Execution Playbook](./EXECUTION_PLAYBOOK.md)** - 90-day tactical implementation guide

These documents outline:

- Patent-worthy innovations and competitive moat
- 4-phase feature roadmap (Foundation → Creator Economy → Enterprise → AI/Multimedia)
- Business model and monetization strategy ($20M ARR target by Year 3)
- Acquisition positioning for larger firms ($100M-$500M valuation)
- Immediate next steps and quick wins

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
