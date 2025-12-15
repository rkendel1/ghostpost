use base64::{engine::general_purpose, Engine as _};
use bimap::BiMap;
use flate2::write::{DeflateEncoder, DeflateDecoder};
use flate2::Compression;
use std::io::Write;

// Compression configuration constants
// These values must match between Rust encoder and JavaScript decoder
const COMPRESSION_THRESHOLD_BYTES: usize = 100;  // Compress only messages >= 100 bytes
const MARKER_UNCOMPRESSED: u8 = 0x00;            // Prepended to uncompressed data
const MARKER_COMPRESSED: u8 = 0x01;              // Prepended to compressed data

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
    // Append the secret after the visible text to hide it in plain sight
    // This makes the encoded message look more natural compared to splitting in the middle
    // Format: visible_text + DELIMITER + secret + DELIMITER
    // 
    // IMPORTANT: This change improves stealth on platforms like Facebook where
    // splitting text in the middle creates visible breaks/highlighting.
    // Now "Test" remains "Test" with invisible characters appended at the end.
    
    // Handle empty string edge case
    if input.is_empty() {
        return format!("\u{FEFF}{}\u{FEFF}", secret);
    }
    
    // Append secret at the end for better stealth
    format!("{}\u{FEFF}{}\u{FEFF}", input, secret)
}

fn unwrap(input: &str) -> String {
    let parts: Vec<&str> = input.split("\u{FEFF}").collect();
    if parts.len() < 2 {
        input.to_string()
    } else {
        parts[1].to_string()
    }
}

pub fn encode(input: &str, secret: &str) -> String {
    // Compression threshold: only compress messages above COMPRESSION_THRESHOLD_BYTES
    // For small messages, DEFLATE compression overhead (headers/metadata)
    // results in larger output than uncompressed data
    // Testing shows:
    // - "bye" (3 bytes): 75% overhead with compression
    // - "bye" + UUID (51 bytes): 10% overhead with compression (152 vs 138 chars)
    // - 100+ bytes: compression provides clear benefits
    
    let secret_bytes = secret.as_bytes();
    let (data_to_encode, compression_marker) = if secret_bytes.len() >= COMPRESSION_THRESHOLD_BYTES {
        // Compress for larger messages
        match compress_data(secret_bytes) {
            Ok(compressed) => (compressed, MARKER_COMPRESSED),
            Err(_e) => {
                // Log compression failure in debug builds
                #[cfg(debug_assertions)]
                eprintln!("Warning: Compression failed ({}), using uncompressed data", _e);
                (secret_bytes.to_vec(), MARKER_UNCOMPRESSED)
            }
        }
    } else {
        // Skip compression for small messages to avoid overhead
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
    
    // Check if there's any hidden content - compare lengths first for efficiency
    if unwrapped.len() == input.len() || unwrapped.is_empty() {
        return Err("No hidden content found in the input text".to_string());
    }
    
    let processed = encoded_to_base64(&unwrapped);
    
    // Check if the processed string is valid base64
    if processed.is_empty() {
        return Err("Invalid encoded content - no recognizable pattern found".to_string());
    }
    
    let decoded_bytes = decode_base64(processed.as_str())?;
    
    // Check for compression marker (first byte)
    // Values defined at module level: MARKER_UNCOMPRESSED, MARKER_COMPRESSED
    let final_bytes = if decoded_bytes.is_empty() {
        return Err("Empty decoded content".to_string());
    } else if decoded_bytes[0] == MARKER_UNCOMPRESSED {
        // Data is explicitly marked as uncompressed - skip decompression
        decoded_bytes[1..].to_vec()
    } else if decoded_bytes[0] == MARKER_COMPRESSED {
        // Data is explicitly marked as compressed - decompress it
        decompress_data(&decoded_bytes[1..])?
    } else {
        // Legacy message without marker - try decompression, fallback to uncompressed
        // This maintains backward compatibility with old messages
        decompress_data(&decoded_bytes).unwrap_or_else(|_| {
            // Decompression failed - treat as uncompressed legacy message
            decoded_bytes
        })
    };
    
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
        ];
        
        for (visible, secret) in test_cases {
            let encoded = encode(visible, secret);
            
            // Verify it contains delimiters
            assert!(encoded.contains('\u{FEFF}'), "Encoded message should contain FEFF delimiters");
            
            // Decode and verify
            let decoded = decode(&encoded).unwrap();
            assert_eq!(decoded, secret, "Decoded message should match original secret");
        }
    }
}
