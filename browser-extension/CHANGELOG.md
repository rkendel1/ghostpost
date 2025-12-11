# Browser Extension Changelog

## Version 1.1.0 (2025-12-11)

### Added

- Incognito mode support via `optional_permissions`
- Enhanced manifest with better permissions structure
- Update mechanism configured (via update_url)

### Changed

- Updated extension name from "Hidenly - Hidden Content Detector" to "Ghostpost Reveal - Hidden Message Detector"
- Improved description to be more specific about functionality

### Technical

- Added `optional_permissions: ["incognito"]` to manifest
- Configured for better user privacy options

## Version 1.0.0

### Initial Release

- Basic content detection and sidebar panel
- WASM-based decoding
- Badge notifications for detected content
