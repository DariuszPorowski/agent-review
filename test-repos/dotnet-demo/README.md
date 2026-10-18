# C# / .NET review project

A .NET 10 library and xUnit test project exercise partial classes, an interface,
properties, overloads, caller links, central NuGet versions, and coverage limits.

## Prepare and open

From the Agent Review checkout, with Git and Node.js 20+:

```powershell
node .\test-repos\prepare.mjs dotnet-demo C:\temp\agent-review-dotnet-demo-sample
```

Use a new destination. The checked-in `baseline/` and `current/` trees contain
source and genuine NuGet lockfiles, not SDK caches, binaries, or nested Git
metadata. Setup commits a baseline and leaves the feature changes uncommitted.
It performs no restore, build, or test execution.

In Agent Review, **Change repository** to the printed directory and select
**Worktree** against **HEAD**. Agent Review's prepared Roslyn helper requires
the .NET 10 runtime. Explicit builds/tests additionally require the .NET 10 SDK
and first-restore access to NuGet.

## What to evaluate

- **Changed contract:** `ReviewPolicy` raises its rejection threshold from 90
  to 95. Null labels return no result; negative scores throw. A score of 94 is
  now rejected.
- **Graph and sections:** follow the interface, partial class/receipt member,
  threshold property, overload, and cross-project xUnit callers. Source-backed
  grouping must not claim every statically connected component is broken.
- **Packages:** Newtonsoft.Json changes from **13.0.2 to 13.0.3**. Inspect both
  `Directory.Packages.props` and resolved `packages.lock.json` evidence.
- **Untested controls:** no current test passes a null label or negative score.
  Their distinct return/throw lines remain uncovered in aggregate coverage.
- **Execution limits:** six current xUnit tests pass; the baseline has four.
  TRX proves individual outcomes, not per-test path tracing. Paths stay
  **inferred**, never **Confirmed by test X** merely because the suite passed.
- **UX:** open source, Impact, Section, and discussion. Reopen an exact **Base**
  line-8 local link and verify question metadata retains `side=base`. Check
  toolbar theme consistency, keyboard focus, and desktop/390px layouts.

## Explicit restore, tests and real coverage

From the prepared repository in PowerShell:

```powershell
$env:NUGET_PACKAGES = Join-Path $PWD '.local-nuget'
$env:DOTNET_CLI_HOME = Join-Path $PWD '.local-dotnet'
$env:DOTNET_CLI_TELEMETRY_OPTOUT = '1'
$env:DOTNET_CLI_USE_MSBUILD_SERVER = '0'
$env:MSBUILDDISABLENODEREUSE = '1'
dotnet restore .\AgentReview.DotnetDemo.slnx --locked-mode --nologo
dotnet test .\tests\ReviewPolicy.Tests\ReviewPolicy.Tests.csproj --no-restore --collect:"XPlat Code Coverage" --results-directory .\TestResults --logger trx --nologo -p:UseSharedCompilation=false -nodeReuse:false
$report = Get-ChildItem .\TestResults\*\coverage.cobertura.xml | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Copy-Item -LiteralPath $report.FullName -Destination .\TestResults\coverage.cobertura.xml
```

Reanalyze after generating the canonical report. Expected policy coverage is
**11/16 executable lines** and **4/8 changed executable lines**. Null-return
and negative-score throw remain uncovered. Coverage is initially unknown:
no machine-specific report from the original validation run is included.

To validate through a particular prepared extension, explicitly supply its
directory; the verifier has no machine-specific default:

```powershell
node .\Verify-AgentReview.mjs C:\Source\AgentReview\.github\extensions\agent-review --run-tests
```

That command requires the report and restored test dependencies. Safe static
scanning never restores packages or invokes MSBuild; unresolved external-package
metadata must be disclosed as a limitation, not guessed or silently treated as
complete semantic analysis.
