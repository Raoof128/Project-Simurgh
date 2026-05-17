use axum::body::Body;
use http_body_util::BodyExt;
use hyper::{Request, StatusCode};
use simurgh_daemon_linux::http::router;
use tower::ServiceExt;

#[tokio::test]
async fn health_endpoint_returns_ok_without_display_env() {
    std::env::remove_var("DISPLAY");
    std::env::remove_var("WAYLAND_DISPLAY");
    let app = router();
    let resp = app
        .oneshot(Request::builder().uri("/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(v["ok"], true);
    assert_eq!(v["platform"], "linux");
    assert_eq!(v["privacy_mode"], "metadata_only");
}

#[tokio::test]
async fn status_endpoint_returns_scanner_unavailable_when_headless() {
    std::env::remove_var("DISPLAY");
    std::env::remove_var("WAYLAND_DISPLAY");
    let app = router();
    let resp = app
        .oneshot(Request::builder().uri("/status").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = resp.into_body().collect().await.unwrap().to_bytes();
    let v: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(v["display_server"], "headless");
    assert_eq!(v["scanner_state"], "scanner_unavailable");
    assert_eq!(v["scanner_reason"], "no_display_server");
    assert_eq!(v["coverage"], "headless_none");
}

#[tokio::test]
async fn post_to_get_only_endpoint_is_rejected() {
    let app = router();
    let resp = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::METHOD_NOT_ALLOWED);
}
