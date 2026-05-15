// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SimurghNode",
    platforms: [.macOS(.v13)],
    products: [
        .executable(name: "SimurghNode", targets: ["SimurghNode"]),
    ],
    targets: [
        .executableTarget(
            name: "SimurghNode",
            path: "Sources/SimurghNode"
        ),
        .testTarget(
            name: "SimurghNodeTests",
            dependencies: ["SimurghNode"],
            path: "Tests/SimurghNodeTests",
            resources: [
                .copy("Fixtures/golden-proof.json"),
                .copy("Fixtures/golden-proof.sha256"),
                .copy("Fixtures/golden-pairing-payload.json"),
                .copy("Fixtures/golden-pairing-payload.sha256"),
            ]
        ),
    ]
)
