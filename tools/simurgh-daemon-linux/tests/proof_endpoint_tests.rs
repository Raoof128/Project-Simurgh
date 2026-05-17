use axum::body::Body;
use http_body_util::BodyExt;
use hyper::{Request, StatusCode};
use simurgh_daemon_linux::http::router;
use tower::ServiceExt;

#[tokio::test]
async fn post_proof_returns_signed_payload_with_required_linux_fields() {
    let tmp = tempfile::tempdir().unwrap();
    std::env::set_var("XDG_STATE_HOME", tmp.path());

    let app = router();
    let body = serde_json::json!({
        "session_id": "sess_proof_test",
        "exam_id": "exam_proof_test",
        "sequence": 1,
        "challenge": "Y2hhbGxlbmdl"
    });
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/proof")
                .header("content-type", "application/json")
                .body(Body::from(serde_json::to_vec(&body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let bytes = resp.into_body().collect().await.unwrap().to_bytes();
    let proof: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(proof["type"], "simurgh.daemon.proof");
    assert_eq!(proof["platform"], "linux");
    assert_eq!(proof["scanner_version"], "2.8.0");
    assert!(proof["signature"].is_string());
    assert!(proof["node_id_hash"].is_string());
    for key in [
        "display_server",
        "scanner_state",
        "scanner_reason",
        "coverage",
        "x11_managed_window_count",
        "x11_override_redirect_window_count",
        "x11_above_window_count",
        "x11_fullscreen_window_count",
        "x11_skip_taskbar_window_count",
        "xwayland_window_count",
    ] {
        assert!(proof.get(key).is_some(), "missing {key} in proof");
    }
}
