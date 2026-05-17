use anyhow::{Context, Result};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use p256::ecdsa::{Signature, SigningKey};
use p256::pkcs8::{DecodePrivateKey, EncodePrivateKey, EncodePublicKey, LineEnding};
use sha2::{Digest, Sha256};
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::PathBuf;

pub struct IdentityPaths {
    pub state_dir: PathBuf,
    pub identity_file: PathBuf,
}

impl IdentityPaths {
    pub fn from_xdg() -> Self {
        let state_home = std::env::var("XDG_STATE_HOME")
            .ok()
            .map(PathBuf::from)
            .unwrap_or_else(|| {
                let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".into());
                PathBuf::from(home).join(".local/state")
            });
        let state_dir = state_home.join("simurgh");
        let identity_file = state_dir.join("daemon-identity.pem");
        Self {
            state_dir,
            identity_file,
        }
    }
}

pub struct Identity {
    signing_key: SigningKey,
    public_key_spki_der: Vec<u8>,
}

impl Identity {
    pub fn node_id_hash(&self) -> String {
        let mut hasher = Sha256::new();
        hasher.update(&self.public_key_spki_der);
        let digest = hasher.finalize();
        format!("sha256:{}", hex::encode(digest))
    }

    pub fn public_key_b64url(&self) -> String {
        URL_SAFE_NO_PAD.encode(&self.public_key_spki_der)
    }

    pub fn sign(&self, message: &[u8]) -> String {
        use p256::ecdsa::signature::Signer;
        let sig: Signature = self.signing_key.sign(message);
        URL_SAFE_NO_PAD.encode(sig.to_der().as_bytes())
    }
}

pub fn load_or_create_identity(paths: &IdentityPaths) -> Result<Identity> {
    fs::create_dir_all(&paths.state_dir).context("create state dir")?;
    let mut perm = fs::metadata(&paths.state_dir)?.permissions();
    perm.set_mode(0o700);
    fs::set_permissions(&paths.state_dir, perm)?;

    let signing_key = if paths.identity_file.exists() {
        let pem = fs::read_to_string(&paths.identity_file)?;
        SigningKey::from_pkcs8_pem(&pem).context("decode identity PEM")?
    } else {
        let sk = SigningKey::random(&mut rand_core::OsRng);
        let pem = sk.to_pkcs8_pem(LineEnding::LF)?;
        fs::write(&paths.identity_file, pem.as_str())?;
        let mut perm = fs::metadata(&paths.identity_file)?.permissions();
        perm.set_mode(0o600);
        fs::set_permissions(&paths.identity_file, perm)?;
        sk
    };

    let verifying_key = signing_key.verifying_key();
    // p256 0.13: VerifyingKey does not directly implement EncodePublicKey;
    // convert through p256::PublicKey first.
    let pk: p256::PublicKey = (*verifying_key).into();
    let public_key_spki_der = pk.to_public_key_der()?.as_bytes().to_vec();

    Ok(Identity {
        signing_key,
        public_key_spki_der,
    })
}
