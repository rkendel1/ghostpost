mod hidenly;
mod utils;

use js_sys::JsString;
use wasm_bindgen::prelude::*;

#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
    #[wasm_bindgen]
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn decode(input: JsString) -> Result<JsString, JsValue> {
    if let Some(i) = input.as_string() {
        match hidenly::decode(i.as_str()) {
            Ok(result) => Ok(JsString::from(result)),
            Err(e) => Err(JsValue::from_str(&e)),
        }
    } else {
        Err(JsValue::from_str("Invalid input: not a string"))
    }
}

#[wasm_bindgen]
pub fn encode(input: JsString, secret: JsString) -> JsString {
    match (input.as_string(), secret.as_string()) {
        (Some(i), Some(s)) => JsString::from(hidenly::encode(i.as_str(), s.as_str())),
        _ => input,
    }
}

#[wasm_bindgen]
pub fn encode_reference(
    input: JsString,
    reference_type: u8,
    reference_id: JsString,
    metadata: JsString,
) -> JsString {
    match (
        input.as_string(),
        reference_id.as_string(),
        metadata.as_string(),
    ) {
        (Some(i), Some(ref_id), Some(meta)) => {
            let meta_opt = if meta.is_empty() { None } else { Some(meta.as_str()) };
            JsString::from(hidenly::encode_reference(
                i.as_str(),
                reference_type,
                ref_id.as_str(),
                meta_opt,
            ))
        }
        _ => input,
    }
}

#[wasm_bindgen]
pub fn decode_reference(input: JsString) -> Result<js_sys::Array, JsValue> {
    if let Some(i) = input.as_string() {
        match hidenly::decode_reference(i.as_str()) {
            Ok((ref_type, ref_id, metadata)) => {
                let result = js_sys::Array::new();
                result.push(&JsString::from(ref_type));
                result.push(&JsString::from(ref_id));
                result.push(&JsString::from(metadata.unwrap_or_default()));
                Ok(result)
            }
            Err(e) => Err(JsValue::from_str(&e)),
        }
    } else {
        Err(JsValue::from_str("Invalid input: not a string"))
    }
}
