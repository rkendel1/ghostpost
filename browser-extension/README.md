# Hidenly Browser Extension

A browser extension that automatically detects and reveals hidden messages encoded with invisible Unicode characters.

## Features

- 🔍 **Automatic Detection**: Scans web pages for hidden content in real-time
- 🔔 **Badge Notifications**: Shows count of hidden messages found on current page
- 📱 **Sidebar Interface**: Clean, tabbed interface for viewing and decoding messages
- 🔓 **Manual Decoder**: Decode any text that may contain hidden content
- ⚡ **Fast Processing**: Uses WebAssembly for optimal performance
- 🔒 **Privacy-Focused**: All processing happens locally in your browser
- 🔄 **Continuous Monitoring**: Actively monitors for new content, especially optimized for social media feeds
- 🎯 **Feed-Optimized**: Enhanced scanning for Twitter/X, Facebook, LinkedIn, Instagram, Reddit, and TikTok

## Installation

### Chrome / Edge / Brave

1. Clone this repository or download the source code
2. Navigate to the `browser-extension` directory
3. Open your browser and go to:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the `browser-extension` folder

### Firefox

Firefox support coming soon! The extension uses Manifest V3 which is still being finalized for Firefox.

## Usage

### Automatic Detection

1. Browse any website as normal
2. If hidden content is detected, you'll see:
   - A green badge on the extension icon with the count
   - The extension icon will be highlighted

3. Click the extension icon to open the sidebar
4. View detected messages in the "Detection" tab
5. **Important**: The extension only detects hidden content - it does not automatically decode or reveal it

### Decoding Hidden Content

⚠️ **Privacy & Control**: Hidden content may contain sensitive information not intended for you. The extension requires your explicit confirmation before decoding.

1. In the Detection tab, click the "🔓 Decode" button next to any detected message
2. Review the privacy warning that appears
3. Click "OK" to proceed with decoding (or "Cancel" to skip)
4. The decoded content will appear in the Decoder tab

**Why the confirmation?** Hidden messages may contain:

- Private or sensitive information
- Images or text you may not want to see
- Content not intended for you

### Manual Decoding

1. Click the extension icon to open the sidebar
2. Switch to the "Decoder" tab
3. Paste any text that may contain hidden content
4. Click "Decode Message" to reveal the secret

### Sidebar Tabs

- **Detection**: View all hidden messages found on the current page (detection only - not decoded)
- **Decoder**: Manually decode any text
- **About**: Learn about Hidenly and how it works

## How It Works

Hidenly uses invisible Unicode characters (zero-width characters and combining marks) to encode secrets within normal text. The extension:

1. **Scans** web pages for these invisible characters
2. **Detects** patterns that indicate encoded content
3. **Decodes** the content using the same WASM module as the web app
4. **Displays** the decoded message or image

### Continuous Scanning for Social Media Feeds

The extension includes enhanced monitoring specifically optimized for social media platforms:

- **Real-time Detection**: Uses MutationObserver to detect new content as it loads
- **Adaptive Scanning**: Faster response times (500ms) for social media sites vs regular sites (1000ms)
- **Feed-Specific Selectors**: Recognizes common feed structures on Twitter/X, Facebook, LinkedIn, Instagram, Reddit, and TikTok
- **Incremental Updates**: Scans new nodes individually for better performance
- **Background Monitoring**: Periodic rescans (every 10 seconds) on social media to catch any missed updates
- **Smart Prioritization**: Feed content gets priority scanning with reduced debounce delays

This means the extension continuously monitors social media feeds as you scroll, automatically detecting hidden messages in new posts without requiring manual rescans.

### False Positive Reduction

The extension uses advanced heuristics to minimize false positives:

- **Clustering Analysis**: Checks if invisible characters are clustered together (indicating encoding) vs scattered (indicating legitimate formatting)
- **Ratio Thresholds**: Analyzes the ratio of invisible characters to total text length
- **Minimum Counts**: Requires a minimum number of invisible characters before flagging content
- **RTL Text Support**: Distinguishes between legitimate right-to-left text markers and encoded content

This ensures the extension accurately detects Hidenly-encoded messages while avoiding false alarms from legitimate uses of invisible Unicode characters.

## Technical Details

- **Manifest Version**: V3 (latest standard)
- **Architecture**: Content Script + Background Service Worker + Sidebar
- **Decoding**: WebAssembly (Rust) for performance
- **Permissions**:
  - `activeTab`: Access current page content
  - `sidePanel`: Display sidebar interface
  - `storage`: Remember user preferences
  - `<all_urls>`: Scan any webpage for hidden content

## Development

The extension shares the core WASM decoding module with the main Hidenly web application, ensuring consistent behavior across platforms.

### File Structure

```
browser-extension/
├── manifest.json          # Extension configuration
├── icons/                 # Extension icons
├── scripts/
│   ├── background.js     # Service worker
│   └── content.js        # Page content scanner
├── sidebar/
│   ├── panel.html        # Sidebar UI
│   └── panel.js          # Sidebar logic
├── styles/
│   └── panel.css         # Sidebar styles
└── wasm/                 # WebAssembly decoder
    ├── wasm.js
    └── wasm_bg.wasm
```

## Privacy & Security

- **No Data Collection**: The extension does not collect or transmit any data
- **Local Processing**: All decoding happens locally in your browser
- **No External Requests**: The extension works completely offline
- **Open Source**: Full source code is available for review
- **User Control**: Requires explicit user confirmation before decoding any hidden content
- **Detection Only**: The extension detects hidden content but does not automatically decode or reveal it
- **Privacy Warnings**: Clear warnings before decoding content that may be sensitive or not intended for you

## Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave 1.20+
- ⏳ Firefox (coming soon)
- ❌ Safari (not supported - uses different extension format)

## Troubleshooting

### Extension not detecting content

1. Try clicking the "Rescan Page" button in the Detection tab
2. Reload the page and wait a few seconds
3. Make sure the page has actually loaded completely

### Decode errors

1. Ensure you're pasting the complete encoded message
2. Some text may appear to have hidden content but not be valid Hidenly encoding
3. Check the browser console for error details

### Sidebar not opening

1. Make sure you've granted the extension permissions
2. Try reloading the extension from the extensions page
3. Restart your browser if issues persist

## Known Limitations

- Some messaging platforms may strip invisible Unicode characters
- Very large images encoded in text may cause performance issues
- Dynamic content that loads after initial page scan may require manual rescan

## License

MIT License - See main repository LICENSE file

## Related

- [Hidenly Web App](https://github.com/rkendel1/ghostpost) - Create and share hidden messages
- [Decode Page](https://hidenly.app/decode) - Web-based decoder

## Support

For issues, questions, or contributions, please visit the [main repository](https://github.com/rkendel1/ghostpost).
