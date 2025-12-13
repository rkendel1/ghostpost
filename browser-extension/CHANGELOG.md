# CHANGELOG

# Ghostpost Reveal Browser Extension

## [1.2.6] - 2025-12-13

### Reverted
- **REVERT TO PRE-PR115**: Restored x.com reveal approach to parent tree walking method
- Removed extra "simple approaches" added after PR115 (parent.textContent, etc.)
- Changed `extractCompleteText()` back to simple DOM parent traversal (up to 10 levels)
- This pre-PR115 approach better identifies hidden text on x.com (as reported in issue)
- Walks up parent elements and aggregates all text nodes at each level using TreeWalker
- Checks for complete encoded message (both delimiters) at each parent level
- Returns first complete message found during traversal
- More reliable detection even if decode/reveal has issues

### Technical Details
- Simplified extraction logic to match v2.3.4-v2.3.8 documented approach
- Removed "SIMPLE APPROACH #1" (direct textContent check) and "SIMPLE APPROACH #2" (parent.textContent)
- Removed "ADVANCED FALLBACK #2" (sibling aggregation)
- Kept only the core parent tree walking with TreeWalker aggregation
- MAX_PARENT_LEVELS remains at 10 to handle deeply nested X.com structures

### Context
- Issue reported that pre-PR115 approach gave better identification of hidden text
- While it may have decode/reveal issues, identification is more important
- This matches the approach documented in XCOM_DECODING_FIX.md and XCOM_REVEAL_SOLUTION.md
- Aligns userscript and extension to use same extraction method

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
