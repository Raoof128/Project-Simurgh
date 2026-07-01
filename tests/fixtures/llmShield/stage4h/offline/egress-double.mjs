// SPDX-License-Identifier: AGPL-3.0-or-later
export async function attemptEgress(surface) {
  if (surface === "fetch") {
    return fetch("https://example.invalid/stage4h-offline-test");
  }
  if (surface === "http") {
    const http = await import("node:http");
    return http.get("http://example.invalid/stage4h-offline-test");
  }
  if (surface === "https") {
    const https = await import("node:https");
    return https.get("https://example.invalid/stage4h-offline-test");
  }
  if (surface === "net") {
    const net = await import("node:net");
    return net.connect({ host: "example.invalid", port: 443 });
  }
  if (surface === "tls") {
    const tls = await import("node:tls");
    return tls.connect({ host: "example.invalid", port: 443 });
  }
  if (surface === "dns") {
    const dns = await import("node:dns");
    return dns.lookup("example.invalid", () => {});
  }
  if (surface === "dns-promises") {
    const dns = await import("node:dns/promises");
    return dns.lookup("example.invalid");
  }
  if (surface === "dgram") {
    const dgram = await import("node:dgram");
    return dgram.createSocket("udp4");
  }
  if (surface === "child_process") {
    const childProcess = await import("node:child_process");
    return childProcess.spawn(process.execPath, ["--version"]);
  }
  throw new Error(`unknown egress surface: ${surface}`);
}
