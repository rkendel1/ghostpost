#!/usr/bin/env node

/**
 * Test script to validate the enhanced delimiter validation logic
 * Tests the hasCompleteEncodedMessage() function improvements
 */

// Invisible characters used by Hidenly encoding
const HIDENLY_CHARS = [
    '\u200B', // Zero Width Space
    '\u200C', // Zero Width Non-Joiner
    '\u200D', // Zero Width Joiner
    '\u200E', // Left-to-Right Mark
    '\u200F', // Right-to-Left Mark
    '\u202C', // Pop Directional Formatting
    '\u202D', // Left-to-Right Override
    '\u2060', // Word Joiner
    '\uFEFF'  // Zero Width No-Break Space (delimiter)
];

const DELIMITER = '\uFEFF';

/**
 * OLD implementation - just counts delimiters
 */
function hasCompleteEncodedMessage_v1(text) {
    if (!text) return false;
    
    const delimiterChar = '\uFEFF';
    let count = 0;
    let index = text.indexOf(delimiterChar);
    
    while (index !== -1) {
        count++;
        if (count >= 2) return true;
        index = text.indexOf(delimiterChar, index + 1);
    }
    
    return false;
}

/**
 * NEW implementation - validates content between delimiters
 */
function hasCompleteEncodedMessage_v2(text) {
    if (!text) return false;
    
    const delimiterChar = '\uFEFF';
    
    // Find first delimiter
    const firstDelimIndex = text.indexOf(delimiterChar);
    if (firstDelimIndex === -1) return false;
    
    // Find second delimiter after the first
    const secondDelimIndex = text.indexOf(delimiterChar, firstDelimIndex + 1);
    if (secondDelimIndex === -1) return false;
    
    // Extract content between delimiters
    const betweenDelimiters = text.substring(firstDelimIndex + 1, secondDelimIndex);
    
    // Must have content between delimiters
    if (betweenDelimiters.length === 0) return false;
    
    // Validate that content between delimiters contains only invisible characters
    const invisibleCharsOnly = HIDENLY_CHARS.filter(char => char !== '\uFEFF');
    const hasOnlyInvisible = [...betweenDelimiters].every(char => 
        invisibleCharsOnly.includes(char)
    );
    
    return hasOnlyInvisible;
}

// Test cases
const tests = [
    {
        name: 'Valid message - invisible chars only between delimiters',
        text: `Visible text${DELIMITER}\u200B\u200C\u200D${DELIMITER}More visible`,
        expectedV1: true,
        expectedV2: true,
        description: 'Both should accept'
    },
    {
        name: 'Invalid message - visible text between delimiters',
        text: `Visible${DELIMITER}Some visible text here${DELIMITER}More`,
        expectedV1: true,  // Old version incorrectly accepts
        expectedV2: false, // New version correctly rejects
        description: 'v2 should reject, v1 incorrectly accepts (FALSE POSITIVE)'
    },
    {
        name: 'Invalid message - empty content between delimiters',
        text: `Text${DELIMITER}${DELIMITER}Text`,
        expectedV1: true,  // Old version accepts
        expectedV2: false, // New version rejects
        description: 'v2 should reject empty content'
    },
    {
        name: 'Invalid message - only one delimiter',
        text: `Text${DELIMITER}\u200B\u200C\u200DText`,
        expectedV1: false,
        expectedV2: false,
        description: 'Both should reject'
    },
    {
        name: 'Invalid message - no delimiters',
        text: 'Just regular text',
        expectedV1: false,
        expectedV2: false,
        description: 'Both should reject'
    },
    {
        name: 'Valid message - long invisible sequence',
        text: `Start${DELIMITER}\u200B\u200C\u200D\u200E\u200F\u202C\u202D\u2060\u200B\u200C${DELIMITER}End`,
        expectedV1: true,
        expectedV2: true,
        description: 'Both should accept long valid message'
    },
    {
        name: 'Invalid message - mixed content',
        text: `Start${DELIMITER}\u200B\u200Cvisible\u200D\u200E${DELIMITER}End`,
        expectedV1: true,  // Old version accepts
        expectedV2: false, // New version rejects
        description: 'v2 should reject mixed visible and invisible'
    }
];

// Run tests
console.log('='.repeat(80));
console.log('DELIMITER VALIDATION TEST SUITE');
console.log('='.repeat(80));
console.log();

let passedV1 = 0;
let passedV2 = 0;
let totalTests = tests.length;

tests.forEach((test, index) => {
    console.log(`Test ${index + 1}: ${test.name}`);
    console.log(`Description: ${test.description}`);
    
    const resultV1 = hasCompleteEncodedMessage_v1(test.text);
    const resultV2 = hasCompleteEncodedMessage_v2(test.text);
    
    const passV1 = resultV1 === test.expectedV1;
    const passV2 = resultV2 === test.expectedV2;
    
    if (passV1) passedV1++;
    if (passV2) passedV2++;
    
    console.log(`  v1 result: ${resultV1} (expected: ${test.expectedV1}) - ${passV1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  v2 result: ${resultV2} (expected: ${test.expectedV2}) - ${passV2 ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!passV1 && passV2) {
        console.log('  🎯 v2 IMPROVEMENT: Fixed false positive!');
    } else if (passV1 && !passV2) {
        console.log('  ⚠️  v2 REGRESSION: New issue introduced!');
    }
    
    console.log();
});

console.log('='.repeat(80));
console.log('RESULTS');
console.log('='.repeat(80));
console.log(`v1 (old): ${passedV1}/${totalTests} tests passed (${Math.round(passedV1/totalTests*100)}%)`);
console.log(`v2 (new): ${passedV2}/${totalTests} tests passed (${Math.round(passedV2/totalTests*100)}%)`);
console.log();

if (passedV2 > passedV1) {
    console.log('✅ v2 IMPROVEMENT: Fixed false positives!');
} else if (passedV2 < passedV1) {
    console.log('⚠️  v2 REGRESSION: Some tests failing!');
} else if (passedV2 === totalTests) {
    console.log('✅ v2 PERFECT: All tests passing!');
} else {
    console.log('⚠️  Both versions have issues');
}

// Exit with appropriate code
process.exit(passedV2 === totalTests ? 0 : 1);
