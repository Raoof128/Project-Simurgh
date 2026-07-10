# Fresh Ubuntu droplet setup

Run this kit as a non-root user where possible. Use SSH keys instead of a reusable root password.

## 1. Copy the ZIP from your machine

```bash
scp simurgh-vda-conformance.zip USER@DROPLET_IP:~/
ssh USER@DROPLET_IP
```

## 2. Install prerequisites on the droplet

```bash
sudo apt-get update -qq
sudo apt-get install -y unzip libatomic1 python3 curl ca-certificates

curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
nvm install 26
nvm use 26

node -v
python3 -V
```

Review downloaded installation scripts before executing them when operating under stricter security
policy. Node 20 or newer is supported; Node 26 is recommended for the byte-stability check.

## 3. Extract and run

```bash
unzip -o simurgh-vda-conformance.zip
cd simurgh-vda-conformance
bash run.sh 2>&1 | tee "vda-conformance-$(hostname)-$(date +%Y%m%d).log"
```

The command must exit `0`. Confirm the log contains `unit OK`, `K7 OK`, and
`== Stage 5E VDA reproduce: ALL PASS ==`. If any command fails, send the full log rather than only its
last line.
