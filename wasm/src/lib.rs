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
