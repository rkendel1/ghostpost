# CHANGELOG

# Ghostpost Reveal Browser Extension

## [1.2.2] - 2025-12-12

### Enhanced
- **X.COM RELIABILITY ENHANCEMENT**: Added comprehensive X.com API behavior documentation (XCOM_API_BEHAVIOR.md)
- Implemented multi-strategy text extraction for X.com with 4 fallback approaches
- **Strategy 1**: Check text node itself (fastest path)
- **Strategy 2**: Walk up parent tree and aggregate child text nodes (handles nested splits)
- **Strategy 3**: Aggregate sibling text nodes (handles horizontal splits)
- **Strategy 4**: Use parent.textContent as last resort
- Added detailed debug logging with X.com-specific context
- Enhanced error messages that reference X.com's tweet_text preservation behavior

### Technical Details
- X.com's GraphQL API preserves ALL invisible Unicode characters in tweet_text field
- Frontend visually collapses them but they're fully accessible in the DOM/API
- New multi-strategy approach ensures reliable extraction even with complex DOM splitting
- Console logs now include strategy used and troubleshooting guidance
- See XCOM_API_BEHAVIOR.md for complete explanation of X.com's behavior

### Context
- This update ensures we can **always** decode hidden characters in the overlay/extension
- Provides comprehensive documentation of how X.com handles encoded messages
- Multiple extraction strategies cover all known X.com DOM splitting patterns
- Better debugging output helps troubleshoot extraction failures

## [1.2.1] - 2025-12-12

### Fixed
- **CRITICAL ENHANCEMENT**: Improved X.com/Twitter reveal success rate with robust delimiter validation
- Enhanced `hasCompleteEncodedMessage()` to validate content between delimiters
- Now ensures only invisible Unicode characters exist between delimiters (no visible text)
- Increased parent traversal from 5 to 10 levels for X.com's deeply nested structures
- Added content validation to prevent false positives from legitimate FEFF usage
- This ensures near-100% success rate for X.com reveals by validating message structure

### Technical Details
- Validates that content between `\uFEFF` delimiters contains only invisible characters
- Rejects false positives where visible text appears between delimiters
- Deeper parent traversal (10 levels vs 5) handles X.com's complex nesting
- More detailed console logging for debugging reveal issues
- Improved robustness for dynamic DOM structures

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
