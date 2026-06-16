// SPDX-License-Identifier: AGPL-3.0-or-later
namespace SimurghDaemon.Windows;

public sealed record WindowInfo(
    bool IsVisible,
    int Width,
    int Height,
    int Layer,
    uint DisplayAffinity,
    bool IsCloaked = false);
