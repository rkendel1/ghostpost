# Hidenly Browser Extension - Visual Guide

## Extension Test Page

![Test Page](https://github.com/user-attachments/assets/889296ac-4404-43e2-9f8f-2567d9d84cc0)

The test page demonstrates the extension's ability to detect hidden content embedded in normal-looking text using invisible Unicode characters.

## Key Features Demonstrated

### 1. Test Messages

The page includes three test cases:

- **Test Message 1**: Contains hidden content that should be detected
- **Test Message 2**: Another example with hidden content
- **Test Message 3**: Normal text with no hidden content (control test)

### 2. Expected Behavior

When the extension is installed and the test page is loaded:

- Extension badge shows the count of detected messages (e.g., "2")
- Sidebar Detection tab lists all elements containing hidden content
- Each detected message can be decoded by clicking the "Decode" button
- Manual decoder tab allows pasting any text for decoding

## Installation

See [INSTALL.md](./INSTALL.md) for detailed installation instructions.

## Features

- ✅ Automatic page scanning
- ✅ Real-time detection of invisible Unicode characters
- ✅ Badge notifications
- ✅ Tabbed sidebar interface
- ✅ Manual decoder
- ✅ Support for text and images
- ✅ Privacy-focused (local processing only)

## Browser Compatibility

- Chrome 114+
- Edge 114+
- Brave 1.54+

## How It Works

The extension scans web pages for invisible Unicode characters used in Hidenly encoding:

- Zero Width Space (U+200B)
- Zero Width Non-Joiner (U+200C)
- Zero Width Joiner (U+200D)
- And several others

When detected, the content is decoded using the same WebAssembly module as the main Hidenly web application.
