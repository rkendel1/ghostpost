# CHANGELOG

# Ghostpost Reveal Browser Extension

## [1.2.0] - 2025-12-12

### Fixed
- **CRITICAL FIX**: Fixed X.com/Twitter decoding "No hidden content found" error
- Enhanced text extraction to ensure BOTH delimiters are present before extraction
- Added `hasCompleteEncodedMessage()` helper to validate complete message format
- Added `extractCompleteText()` function to aggregate text from parent elements (up to 5 levels)
- Previous version only extracted text from single nodes, causing incomplete message extraction on X.com
- Now properly aggregates split text nodes on X.com to get full encoded message
- Format requires: \uFEFF + invisible_chars + \uFEFF (need both delimiters)
- Updated both initial scan and incremental scan functions
- Uses Set to track processed elements and avoid duplicates

### Technical Details
- X.com's dynamic DOM splits text across multiple nested text nodes
- Single text nodes may only contain partial encoded messages (one delimiter instead of two)
- New logic walks up DOM tree to parent elements and aggregates all text nodes
- Checks for complete message (2+ delimiters) before returning
- Ensures successful decoding in the sidebar panel

## [1.1.0] - Previous Release
- Enhanced feed monitoring for social media sites
- Improved detection accuracy
- Performance optimizations
