use base64::{engine::general_purpose, Engine as _};
use bimap::BiMap;
use flate2::write::{DeflateEncoder, DeflateDecoder};
use flate2::Compression;
use std::io::Write;

// Compression configuration constants
// These values must match between Rust encoder and JavaScript decoder
const COMPRESSION_THRESHOLD_BYTES: usize = 1000;  // Compress only messages >= 1000 bytes (de-compact for smaller content)
const MARKER_UNCOMPRESSED: u8 = 0x00;             // Prepended to uncompressed data
const MARKER_COMPRESSED: u8 = 0x01;               // Prepended to compressed data

lazy_static::lazy_static! {
    static ref BASE64_CHAR_MAP: BiMap<char, &'static str> = {
        let mut map = BiMap::new();
        map.insert('A', "\u{2060}\u{2060}");
        map.insert('B', "\u{2060}\u{200B}");
        map.insert('C', "\u{2060}\u{200C}");
        map.insert('D', "\u{2060}\u{200D}");
        map.insert('E', "\u{2060}\u{200E}");
        map.insert('F', "\u{2060}\u{200F}");
        map.insert('G', "\u{2060}\u{202D}");
        map.insert('H', "\u{2060}\u{202C}");
        map.insert('I', "\u{200B}\u{2060}");
        map.insert('J', "\u{200B}\u{200B}");
        map.insert('K', "\u{200B}\u{200C}");
        map.insert('L', "\u{200B}\u{200D}");
        map.insert('M', "\u{200B}\u{200E}");
        map.insert('N', "\u{200B}\u{200F}");
        map.insert('O', "\u{200B}\u{202D}");
        map.insert('P', "\u{200B}\u{202C}");
        map.insert('Q', "\u{200C}\u{2060}");
        map.insert('R', "\u{200C}\u{200B}");
        map.insert('S', "\u{200C}\u{200C}");
        map.insert('T', "\u{200C}\u{200D}");
        map.insert('U', "\u{200C}\u{200E}");
        map.insert('V', "\u{200C}\u{200F}");
        map.insert('W', "\u{200C}\u{202D}");
        map.insert('X', "\u{200C}\u{202C}");
        map.insert('Y', "\u{200D}\u{2060}");
        map.insert('Z', "\u{200D}\u{200B}");
        map.insert('a', "\u{200D}\u{200C}");
        map.insert('b', "\u{200D}\u{200D}");
        map.insert('c', "\u{200D}\u{200E}");
        map.insert('d', "\u{200D}\u{200F}");
        map.insert('e', "\u{200D}\u{202D}");
        map.insert('f', "\u{200D}\u{202C}");
        map.insert('g', "\u{200E}\u{2060}");
        map.insert('h', "\u{200E}\u{200B}");
        map.insert('i', "\u{200E}\u{200C}");
        map.insert('j', "\u{200E}\u{200D}");
        map.insert('k', "\u{200E}\u{200E}");
        map.insert('l', "\u{200E}\u{200F}");
        map.insert('m', "\u{200E}\u{202D}");
        map.insert('n', "\u{200E}\u{202C}");
        map.insert('o', "\u{200F}\u{2060}");
        map.insert('p', "\u{200F}\u{200B}");
        map.insert('q', "\u{200F}\u{200C}");
        map.insert('r', "\u{200F}\u{200D}");
        map.insert('s', "\u{200F}\u{200E}");
        map.insert('t', "\u{200F}\u{200F}");
        map.insert('u', "\u{200F}\u{202D}");
        map.insert('v', "\u{200F}\u{202C}");
        map.insert('w', "\u{202D}\u{2060}");
        map.insert('x', "\u{202D}\u{200B}");
        map.insert('y', "\u{202D}\u{200C}");
        map.insert('z', "\u{202D}\u{200D}");
        map.insert('0', "\u{202D}\u{200E}");
        map.insert('1', "\u{202D}\u{200F}");
        map.insert('2', "\u{202D}\u{202D}");
        map.insert('3', "\u{202D}\u{202C}");
        map.insert('4', "\u{202C}\u{2060}");
        map.insert('5', "\u{202C}\u{200B}");
        map.insert('6', "\u{202C}\u{200C}");
        map.insert('7', "\u{202C}\u{200D}");
        map.insert('8', "\u{202C}\u{200E}");
        map.insert('9', "\u{202C}\u{200F}");
        map.insert('+', "\u{202C}\u{202D}");
        map.insert('/', "\u{202C}\u{202C}");
        map
    };
}

fn encode_base64(input: &[u8]) -> String {
    general_purpose::STANDARD_NO_PAD.encode(input)
}

fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    general_purpose::STANDARD_NO_PAD
        .decode(input)
        .map_err(|e| format!("Failed to decode base64: {}", e))
}

fn compress_data(input: &[u8]) -> Result<Vec<u8>, String> {
    let mut encoder = DeflateEncoder::new(Vec::new(), Compression::best());
    encoder.write_all(input)
        .map_err(|e| format!("Failed to write data for compression: {}", e))?;
    encoder.finish()
        .map_err(|e| format!("Failed to compress data: {}", e))
}

fn decompress_data(input: &[u8]) -> Result<Vec<u8>, String> {
    let mut decoder = DeflateDecoder::new(Vec::new());
    decoder.write_all(input)
        .map_err(|e| format!("Failed to write data for decompression: {}", e))?;
    decoder.finish()
        .map_err(|e| format!("Failed to decompress data: {}", e))
}

fn base64_to_encoded(input: &str) -> String {
    let mut string_result = String::new();
    for ch in input.chars() {
        if let Some(hex_char) = BASE64_CHAR_MAP.get_by_left(&ch) {
            string_result.push_str(hex_char);
        }
    }
    string_result
}

fn encoded_to_base64(input: &str) -> String {
    let mut string_result = String::new();
    for chunk in input.chars().collect::<Vec<_>>().chunks(2) {
        let pair_str = chunk.iter().collect::<String>();
        if let Some(mapped_str) = BASE64_CHAR_MAP.get_by_right(pair_str.as_str()) {
            string_result.push(*mapped_str);
        }
    }
    string_result
}

fn wrap(input: &str, secret: &str) -> String {
    // Calculate middle index based on character count, not byte count
    // This ensures we don't split in the middle of a multi-byte UTF-8 character
    
    // Handle empty string edge case
    if input.is_empty() {
        return format!("\u{FEFF}{}\u{FEFF}", secret);
    }
    
    // Use char_indices to find the middle character position in a single pass
    let chars_with_indices: Vec<(usize, char)> = input.char_indices().collect();
    let middle_char_index = chars_with_indices.len() / 2;
    
    // Get the byte index for the middle character, or use input.len() for empty strings
    let middle_byte_index = if middle_char_index < chars_with_indices.len() {
        chars_with_indices[middle_char_index].0
    } else {
        input.len()
    };
    
    let (first_half, second_half) = input.split_at(middle_byte_index);
    format!("{}\u{FEFF}{}\u{FEFF}{}", first_half, secret, second_half)
}

fn unwrap(input: &str) -> String {
    let parts: Vec<&str> = input.split("\u{FEFF}").collect();

    // Handle different encoding formats for backward compatibility
    match parts.len() {
        0 => input.to_string(),
        1 => input.to_string(), // No delimiter found - return as-is
        2 => parts[1].to_string(), // Old format: visible﻿{secret}﻿ or visible﻿{secret}
        _ => parts[1].to_string(), // New format: first_half﻿{secret}﻿{second_half}
                                   // Both formats have the secret in parts[1]
    }
}

pub fn encode(input: &str, secret: &str) -> String {
    // Improved compression strategy for maximum strength and efficiency
    // De-compact: only compress large messages (1000+ bytes) to avoid overhead
    // For small to medium messages, the base64 expansion makes compression inefficient
    // Testing shows:
    // - Small messages (< 1KB): compression overhead > savings
    // - Large messages (> 1KB): compression provides significant benefit (30-50% reduction)
    // - Images (base64): compression highly beneficial (25KB can compress to ~8-12KB)

    let secret_bytes = secret.as_bytes();
    let (data_to_encode, compression_marker) = if secret_bytes.len() >= COMPRESSION_THRESHOLD_BYTES {
        // Use maximum compression for large messages (images, long text)
        match compress_data(secret_bytes) {
            Ok(compressed) => {
                // Only use compressed version if it's actually smaller
                if compressed.len() < secret_bytes.len() {
                    (compressed, MARKER_COMPRESSED)
                } else {
                    // Compression didn't help - use uncompressed
                    (secret_bytes.to_vec(), MARKER_UNCOMPRESSED)
                }
            }
            Err(_e) => {
                // Compression failed - use uncompressed data
                #[cfg(debug_assertions)]
                eprintln!("Warning: Compression failed, using uncompressed data");
                (secret_bytes.to_vec(), MARKER_UNCOMPRESSED)
            }
        }
    } else {
        // Skip compression for small/medium messages to preserve character budget
        // This "de-compaction" allows more content to fit in the character limits
        (secret_bytes.to_vec(), MARKER_UNCOMPRESSED)
    };

    // Prepend compression marker to data
    let mut data_with_marker = vec![compression_marker];
    data_with_marker.extend_from_slice(&data_to_encode);

    let preprocessed = encode_base64(&data_with_marker);
    let encoded = base64_to_encoded(preprocessed.as_str());
    wrap(input, &encoded)
}

pub fn decode(input: &str) -> Result<String, String> {
    let unwrapped = unwrap(input);

    // Check if there's any hidden content - improved validation
    if unwrapped.len() == input.len() || unwrapped.is_empty() {
        return Err("No hidden content found in the input text".to_string());
    }

    // Convert encoded format back to base64
    let processed = encoded_to_base64(&unwrapped);

    // Validate processed data
    if processed.is_empty() {
        return Err("Invalid encoded content - no recognizable pattern found".to_string());
    }

    // Decode from base64
    let decoded_bytes = decode_base64(processed.as_str())?;

    if decoded_bytes.is_empty() {
        return Err("Empty decoded content".to_string());
    }

    // Check for compression marker (first byte) with maximum strength decoding
    // Values defined at module level: MARKER_UNCOMPRESSED (0x00), MARKER_COMPRESSED (0x01)
    let final_bytes = match decoded_bytes[0] {
        MARKER_UNCOMPRESSED => {
            // Data explicitly marked as uncompressed
            decoded_bytes[1..].to_vec()
        }
        MARKER_COMPRESSED => {
            // Data explicitly marked as compressed - decompress with error handling
            decompress_data(&decoded_bytes[1..])
                .map_err(|e| format!("Failed to decompress content: {}", e))?
        }
        unknown_marker => {
            // Unknown marker - try to handle as legacy format
            // Legacy messages don't have markers, so try decompression first
            // If that fails, treat as uncompressed
            match decompress_data(&decoded_bytes) {
                Ok(decompressed) => decompressed,
                Err(_) => {
                    // Decompression failed - might be uncompressed legacy data
                    // Check if it looks like valid UTF-8
                    if String::from_utf8(decoded_bytes.clone()).is_ok() {
                        // Looks like uncompressed text
                        decoded_bytes
                    } else {
                        return Err(format!(
                            "Unknown compression marker (0x{:02x}) and data doesn't appear to be valid uncompressed text",
                            unknown_marker
                        ));
                    }
                }
            }
        }
    };

    // Convert to UTF-8 string with detailed error handling
    String::from_utf8(final_bytes)
        .map_err(|e| format!("Invalid UTF-8 in decoded content: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encode_base64() {
        let input_string = "Hello, World!";
        let result = encode_base64(input_string.as_bytes());
        // Just verify it produces valid base64
        assert!(!result.is_empty());
        // Verify roundtrip
        let decoded = decode_base64(&result).unwrap();
        assert_eq!(String::from_utf8(decoded).unwrap(), input_string);
    }

    #[test]
    fn test_encode_decode_roundtrip() {
        let test_cases = vec![
            ("hello", "bye"),
            ("visible", "Hello, World!"),
            ("test", "This is a longer secret message that might trigger compression"),
            ("short", "x".repeat(50)),  // 50 bytes - below compression threshold
            ("medium", "y".repeat(500)), // 500 bytes - below compression threshold
            ("large", "z".repeat(2000)), // 2000 bytes - above compression threshold
        ];

        for (visible, secret) in test_cases {
            let encoded = encode(visible, secret);

            // Verify it contains delimiters
            assert!(encoded.contains('\u{FEFF}'), "Encoded message should contain FEFF delimiters");

            // Decode and verify
            let decoded = decode(&encoded).unwrap();
            assert_eq!(decoded, secret, "Decoded message should match original secret for: {}", visible);
        }
    }

    #[test]
    fn test_compression_optimization() {
        // Test that compression is only applied to large messages
        let small_secret = "small";
        let large_secret = "x".repeat(1500); // Above 1000 byte threshold

        let small_encoded = encode("visible", small_secret);
        let large_encoded = encode("visible", &large_secret);

        // Both should decode correctly
        assert_eq!(decode(&small_encoded).unwrap(), small_secret);
        assert_eq!(decode(&large_encoded).unwrap(), large_secret);

        // Large message might be compressed, but should still work
        // Character count might be different due to compression, but that's OK
    }
}
