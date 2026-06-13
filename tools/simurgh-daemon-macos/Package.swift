// SPDX-License-Identifier: AGPL-3.0-or-later
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SimurghDaemon",
    platforms: [.macOS(.v13)],
    products: [
        .executable(name: "SimurghDaemon", targets: ["SimurghDaemon"]),
    ],
    targets: [
        .executableTarget(
            name: "SimurghDaemon",
            path: "Sources/SimurghDaemon"
        ),
        .testTarget(
            name: "SimurghDaemonTests",
            dependencies: ["SimurghDaemon"],
            path: "Tests/SimurghDaemonTests"
        ),
    ]
)
