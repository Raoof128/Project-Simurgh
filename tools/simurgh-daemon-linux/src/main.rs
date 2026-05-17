use anyhow::Result;
use std::net::SocketAddr;

use simurgh_daemon_linux::{config::DaemonConfig, http};

#[tokio::main]
async fn main() -> Result<()> {
    let cfg = DaemonConfig::default();
    let addr = SocketAddr::new(cfg.bind, cfg.port);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    eprintln!("simurgh-daemon-linux listening on {addr}");
    axum::serve(listener, http::router()).await?;
    Ok(())
}
