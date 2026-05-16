namespace SimurghDaemon.Windows;

public interface IWindowInfoProvider
{
    IReadOnlyList<WindowInfo> ListWindows();
}
