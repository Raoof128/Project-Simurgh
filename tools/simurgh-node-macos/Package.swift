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
                .copy("../../../../tests/unit/integrity/__fixtures__/golden-proof.json"),
                .copy("../../../../tests/unit/integrity/__fixtures__/golden-proof.sha256"),
            ]
        ),
    ]
)
