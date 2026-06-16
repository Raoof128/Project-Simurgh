// SPDX-License-Identifier: AGPL-3.0-or-later
namespace SimurghDaemon.Windows;

public sealed record SessionState(string? SessionId, string? ExamId, int Sequence);
