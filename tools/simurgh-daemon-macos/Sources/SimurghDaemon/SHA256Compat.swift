// SPDX-License-Identifier: AGPL-3.0-or-later
import CryptoKit
import Foundation

enum SHA256Compat {
    static func hash(_ data: Data) -> [UInt8] {
        Array(SHA256.hash(data: data))
    }
}
