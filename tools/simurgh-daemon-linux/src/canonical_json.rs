// SPDX-License-Identifier: AGPL-3.0-or-later
use serde_json::{Map, Value};

pub fn canonicalise(value: &Value) -> String {
    // Match Node's canonicaliseDaemonPayload: sort TOP-LEVEL keys only,
    // strip "signature" key, preserve nested object insertion order.
    match value {
        Value::Object(map) => {
            let mut sorted: Map<String, Value> = Map::new();
            let mut keys: Vec<&String> = map.keys().filter(|k| k.as_str() != "signature").collect();
            keys.sort();
            for k in keys {
                sorted.insert(k.clone(), map[k].clone());
            }
            serde_json::to_string(&Value::Object(sorted)).expect("serialisable")
        }
        _ => serde_json::to_string(value).expect("serialisable"),
    }
}
