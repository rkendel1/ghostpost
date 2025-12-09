# Quick Installation Guide

## Chrome / Edge / Brave Installation

### Method 1: Load Unpacked (Development)

1. **Download or Clone** this repository
2. **Navigate** to the `browser-extension` folder
3. **Open your browser's extensions page**:
   - **Chrome**: Navigate to `chrome://extensions`
   - **Edge**: Navigate to `edge://extensions`
   - **Brave**: Navigate to `brave://extensions`

4. **Enable Developer Mode**:
   - Look for a toggle switch in the top right corner
   - Turn it ON

5. **Load the Extension**:
   - Click the "Load unpacked" button
   - Browse to and select the `browser-extension` folder
   - Click "Select Folder"

6. **Verify Installation**:
   - You should see "Hidenly - Hidden Content Detector" in your extensions list
   - The extension icon (🎭) should appear in your browser toolbar

### Method 2: Install from ZIP

1. **Build** the extension:
   ```bash
   cd ghostpost
   npm run build:extension
   ```

2. **Extract** the `dist/hidenly-extension.zip` file

3. **Follow steps 3-6** from Method 1, selecting the extracted folder

## Testing the Extension

1. **Open** the included `test-page.html` in your browser
2. **Check** for the badge notification on the extension icon
3. **Click** the extension icon to open the sidebar
4. **View** detected messages in the Detection tab
5. **Click** "Decode" to reveal hidden content

## Troubleshooting

### Extension Not Loading
- Make sure Developer Mode is enabled
- Check that all files are present in the folder
- Look for error messages in the extensions page

### Badge Not Showing
- Refresh the page after installing the extension
- Click "Rescan Page" in the sidebar
- Check browser console (F12) for errors

### Sidebar Not Opening
- Make sure your browser supports Manifest V3 and Side Panel API
- Chrome 114+, Edge 114+, Brave (recent version)
- Try reloading the extension

### Decoding Errors
- Ensure the WASM files are present in the `wasm` folder
- Check browser console for WASM loading errors
- Try reloading the extension

## Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome  | 114+    | ✅ Supported |
| Edge    | 114+    | ✅ Supported |
| Brave   | 1.54+   | ✅ Supported |
| Firefox | -       | ⏳ Coming Soon |
| Safari  | -       | ❌ Not Supported |

## Next Steps

- Visit the [main README](./README.md) for detailed features
- Check out the [test page](./test-page.html) for examples
- Read about [how Hidenly works](../README.md)

## Need Help?

- Check the browser console (F12) for error messages
- Open an issue on [GitHub](https://github.com/rkendel1/ghostpost/issues)
- Read the full documentation in the README
