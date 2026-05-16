namespace SimurghDaemon.Windows.Tests;

public sealed class AffinityFixtureProjectTests
{
    [Fact]
    public void FixtureProjectExistsAndDocumentsSupportedModes()
    {
        var root = FindRepoRoot();
        var projectPath = Path.Combine(
            root,
            "tools",
            "simurgh-daemon-windows",
            "src",
            "SimurghAffinityFixture",
            "SimurghAffinityFixture.csproj");
        var programPath = Path.Combine(Path.GetDirectoryName(projectPath)!, "Program.cs");

        Assert.True(File.Exists(projectPath), "SimurghAffinityFixture project should be present.");
        var source = File.ReadAllText(programPath);
        Assert.Contains("none", source);
        Assert.Contains("monitor", source);
        Assert.Contains("exclude", source);
        Assert.Contains("WDA_MONITOR", source);
        Assert.Contains("WDA_EXCLUDEFROMCAPTURE", source);
        Assert.Contains("Console.IsInputRedirected", source);
        Assert.DoesNotContain("http://", source, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("https://", source, StringComparison.OrdinalIgnoreCase);
    }

    private static string FindRepoRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "package.json")) &&
                Directory.Exists(Path.Combine(directory.FullName, "tools", "simurgh-daemon-windows")))
            {
                return directory.FullName;
            }
            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException("Could not locate Project Simurgh repository root.");
    }
}
