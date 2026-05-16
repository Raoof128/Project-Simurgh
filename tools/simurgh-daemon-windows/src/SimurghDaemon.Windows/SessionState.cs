namespace SimurghDaemon.Windows;

public sealed record SessionState(string? SessionId, string? ExamId, int Sequence);
