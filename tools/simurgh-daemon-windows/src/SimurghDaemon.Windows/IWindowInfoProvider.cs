// SPDX-License-Identifier: AGPL-3.0-or-later
namespace SimurghDaemon.Windows;

public interface IWindowInfoProvider
{
    IReadOnlyList<WindowInfo> ListWindows();
}
