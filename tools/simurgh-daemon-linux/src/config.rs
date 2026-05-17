use std::net::{IpAddr, Ipv4Addr};

pub const DAEMON_VERSION: &str = "2.8.0";
pub const SCANNER_VERSION: &str = "2.8.0";
pub const DAEMON_PLATFORM: &str = "linux";
pub const DEFAULT_PORT: u16 = 3031;
pub const DEFAULT_ALLOWED_ORIGIN: &str = "http://localhost:3030";
pub const MAX_BODY_BYTES: usize = 64 * 1024;

pub struct DaemonConfig {
    pub bind: IpAddr,
    pub port: u16,
    pub allowed_origin: String,
}

impl Default for DaemonConfig {
    fn default() -> Self {
        Self {
            bind: IpAddr::V4(Ipv4Addr::LOCALHOST),
            port: DEFAULT_PORT,
            allowed_origin: DEFAULT_ALLOWED_ORIGIN.to_string(),
        }
    }
}
