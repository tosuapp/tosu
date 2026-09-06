using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Runtime.Loader;
using System.Text.Json;

namespace ToriiOffsets;

/// <summary>
/// Generates tosu-compatible offsets.json files for recompiled osu!lazer forks
/// (torii / torii nova) — or any lazer-family install — by measuring the real
/// runtime field layout of the client's own assemblies.
///
/// Method: allocate each class uninitialized (RuntimeHelpers.GetUninitializedObject,
/// no constructors, no game code), then mutate one field at a time with a unique
/// marker and diff memory snapshots. Reference fields are located by searching
/// for the marker object's address; value-type fields by the bytes that changed.
/// The reported offset is relative to the object base (method table pointer at
/// +0), which is exactly the convention tosu's reader uses.
/// </summary>
internal static class Program
{
    /// <summary>Bytes snapshotted from the object base. Big enough for OsuGame (~2 KiB) with margin.</summary>
    private const int ScanWindow = 16 * 1024;

    private const BindingFlags DeclaredInstanceFields =
        BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly;

    private static readonly Random Rng = new(0x70721);

    private sealed class ClassResult
    {
        public Dictionary<string, int> Offsets = new();
        public List<string> Warnings = new();
    }

    private static int Main(string[] args)
    {
        string toriiPath = ".";
        string outDir = Path.Combine(Directory.GetCurrentDirectory(), "out");
        string? versionOverride = null;
        string? manifestPath = null;
        string? comparePath = null;

        for (int i = 0; i < args.Length; i++)
        {
            switch (args[i])
            {
                case "--torii-path":
                    toriiPath = args[++i];
                    break;
                case "--out":
                    outDir = args[++i];
                    break;
                case "--version":
                    versionOverride = args[++i];
                    break;
                case "--manifest":
                    manifestPath = args[++i];
                    break;
                case "--compare":
                    comparePath = args[++i];
                    break;
                case "--help":
                case "-h":
                    PrintUsage();
                    return 0;
                default:
                    Console.Error.WriteLine($"Unknown argument: {args[i]}");
                    PrintUsage();
                    return 2;
            }
        }

        toriiPath = Path.GetFullPath(toriiPath);
        if (!Directory.Exists(toriiPath))
        {
            Console.Error.WriteLine($"Install folder not found: {toriiPath}");
            return 2;
        }

        if (!File.Exists(Path.Combine(toriiPath, "torii.dll")) &&
            !File.Exists(Path.Combine(toriiPath, "osu!.dll")))
        {
            Console.Error.WriteLine(
                $"Warning: neither torii.dll nor osu!.dll found in {toriiPath} — " +
                "this does not look like a torii/lazer install folder. Continuing anyway.");
        }

        string version = versionOverride ?? DetectVersion(toriiPath);
        if (string.IsNullOrEmpty(version))
        {
            Console.Error.WriteLine(
                "Could not detect a version from torii.deps.json / osu!.deps.json. " +
                "Pass --version <ver> explicitly (e.g. the release tag without the leading v).");
            return 2;
        }

        var manifest = LoadManifest(manifestPath);
        if (manifest.Count == 0)
        {
            Console.Error.WriteLine("Manifest is empty?");
            return 2;
        }

        Console.WriteLine($"Install : {toriiPath}");
        Console.WriteLine($"Version : {version}");
        Console.WriteLine($"Runtime : {Environment.Version} ({RuntimeInformation.RuntimeIdentifier})");
        Console.WriteLine($"Classes : {manifest.Count}");
        Console.WriteLine();

        var typeMap = LoadTypes(toriiPath, out int loadedAssemblies, out int failedAssemblies);
        Console.WriteLine($"Loaded {loadedAssemblies} assemblies ({failedAssemblies} failed/skipped), {typeMap.Count} types");
        Console.WriteLine();

        var results = new Dictionary<string, ClassResult>();
        int fieldsOk = 0, fieldsMissing = 0, classesMissing = 0;

        foreach (var (className, fieldNames) in manifest)
        {
            if (!typeMap.TryGetValue(className, out var type))
            {
                Console.WriteLine($"[skip ] {className} — type not found in this build");
                classesMissing++;
                continue;
            }

            ClassResult result;
            bool gcRetryFailed;
            try
            {
                result = ComputeClassOffsets(type, fieldNames, out gcRetryFailed);
            }
            catch (Exception e)
            {
                // e.g. TypeLoadException resolving a field type — report, keep going
                result = new ClassResult();
                gcRetryFailed = false;
                result.Warnings.Add($"exception while measuring: {e.GetType().Name}: {e.Message}");
            }

            results[className] = result;

            int ok = result.Offsets.Count;
            fieldsOk += ok;
            fieldsMissing += fieldNames.Count - ok;

            string status = gcRetryFailed ? "[FAIL ]" : ok == fieldNames.Count ? "[ ok  ]" : "[part ]";
            Console.WriteLine($"{status} {className} — {ok}/{fieldNames.Count} fields");
            foreach (var w in result.Warnings)
                Console.WriteLine($"         ! {w}");
        }

        Console.WriteLine();
        Console.WriteLine($"Fields resolved: {fieldsOk}, missing: {fieldsMissing}, classes missing: {classesMissing}");

        if (fieldsOk == 0)
        {
            Console.Error.WriteLine("Nothing resolved — wrong folder, wrong runtime (net8 tool on a net10 build?), or load failures above.");
            return 1;
        }

        Directory.CreateDirectory(outDir);
        string outFile = Path.Combine(outDir, $"{version}.json");
        WriteOffsetsJson(outFile, version, manifest, results);
        Console.WriteLine();
        Console.WriteLine($"Wrote {outFile}");
        Console.WriteLine("Place it where tosu looks, e.g.:");
        Console.WriteLine($"  <tosu folder>/torii-offsets/{version}.json");
        Console.WriteLine($"  <tosu cache>/torii/{version}.json");
        Console.WriteLine($"or set TOSU_TORII_OFFSETS to the file (or its folder).");

        PrintInternalsProbe(typeMap);

        if (comparePath != null)
        {
            Console.WriteLine();
            CompareWith(comparePath, results);
        }

        return 0;
    }

    private static void PrintUsage()
    {
        Console.WriteLine("""
            torii-offsets — generate tosu offsets.json for torii / lazer-family builds

            Usage: dotnet run -f net10.0 -- --torii-path <install dir> [options]

              --torii-path <dir>   client install folder (torii.dll, osu.Game.dll,
                                   torii.deps.json). Default: .
              --out <dir>          output folder. Default: ./out
              --version <ver>      override version detected from deps.json
              --manifest <file>    external manifest.json (default: embedded)
              --compare <file>     diff results against another offsets.json
                                   (calibration: run against an official lazer
                                   install and compare with the tosu.app file)

            Use -f net10.0 for torii nova (.NET 10), -f net8.0 for torii stable.
            A net10 runtime can also process net8 builds, never the reverse.
            """);
    }

    // ------------------------------------------------------------------
    // version / manifest / assemblies
    // ------------------------------------------------------------------

    private static string DetectVersion(string dir)
    {
        foreach (var (file, prefix, stripSuffix) in new[]
                 {
                     ("torii.deps.json", "torii/", false),
                     ("osu!.deps.json", "osu!/", true)
                 })
        {
            string p = Path.Combine(dir, file);
            if (!File.Exists(p)) continue;

            try
            {
                using var doc = JsonDocument.Parse(File.ReadAllText(p));
                if (!doc.RootElement.TryGetProperty("libraries", out var libs)) continue;

                foreach (var prop in libs.EnumerateObject())
                {
                    if (!prop.Name.StartsWith(prefix, StringComparison.Ordinal)) continue;

                    string v = prop.Name[prefix.Length..];
                    if (stripSuffix)
                    {
                        int dash = v.IndexOf('-');
                        if (dash >= 0) v = v[..dash];
                    }

                    if (!string.IsNullOrWhiteSpace(v)) return v;
                }
            }
            catch (Exception e)
            {
                Console.Error.WriteLine($"Could not parse {p}: {e.Message}");
            }
        }

        return "";
    }

    private static Dictionary<string, List<string>> LoadManifest(string? path)
    {
        string json;
        if (path != null)
        {
            json = File.ReadAllText(path);
        }
        else
        {
            var asm = Assembly.GetExecutingAssembly();
            string resName = asm.GetManifestResourceNames()
                .First(n => n.EndsWith("manifest.json", StringComparison.OrdinalIgnoreCase));
            using var stream = asm.GetManifestResourceStream(resName)!;
            using var reader = new StreamReader(stream);
            json = reader.ReadToEnd();
        }

        using var doc = JsonDocument.Parse(json);
        var classes = doc.RootElement.GetProperty("classes");

        var manifest = new Dictionary<string, List<string>>();
        foreach (var cls in classes.EnumerateObject())
        {
            var fields = new List<string>();
            foreach (var f in cls.Value.EnumerateArray())
                fields.Add(f.GetString()!);
            manifest[cls.Name] = fields;
        }

        return manifest;
    }

    private sealed class InstallDirContext : AssemblyLoadContext
    {
        private readonly string _dir;

        public InstallDirContext(string dir) : base("torii-offsets", isCollectible: false)
        {
            _dir = dir;
        }

        protected override Assembly? Load(AssemblyName assemblyName)
        {
            // native-only and framework assemblies fall back to the default context
            string p = Path.Combine(_dir, assemblyName.Name + ".dll");
            if (!File.Exists(p)) return null;

            try
            {
                return LoadFromAssemblyPath(p);
            }
            catch (BadImageFormatException)
            {
                return null; // native dll living in the install folder
            }
        }
    }

    private static Dictionary<string, Type> LoadTypes(string dir, out int loaded, out int failed)
    {
        var alc = new InstallDirContext(dir);
        var typeMap = new Dictionary<string, Type>(StringComparer.Ordinal);
        loaded = failed = 0;

        var assemblies = new List<Assembly>();
        foreach (string dll in Directory.EnumerateFiles(dir, "*.dll"))
        {
            try
            {
                assemblies.Add(alc.LoadFromAssemblyPath(dll));
                loaded++;
            }
            catch (Exception)
            {
                failed++; // native dlls (realm-wrappers, SDL, ...) etc.
            }
        }

        foreach (var asm in assemblies)
        {
            Type[] types;
            try
            {
                types = asm.GetTypes();
            }
            catch (ReflectionTypeLoadException ex)
            {
                types = ex.Types.Where(t => t != null).ToArray()!;
            }
            catch (Exception)
            {
                continue;
            }

            foreach (var t in types)
            {
                if (t.FullName != null)
                    typeMap.TryAdd(t.FullName, t);
            }
        }

        return typeMap;
    }

    // ------------------------------------------------------------------
    // offset measurement
    // ------------------------------------------------------------------

    private static ClassResult ComputeClassOffsets(Type type, List<string> fieldNames, out bool gcRetryFailed)
    {
        gcRetryFailed = false;

        for (int attempt = 1; attempt <= 3; attempt++)
        {
            var result = TryComputeClassOffsets(type, fieldNames, out bool gcMoved);
            if (!gcMoved) return result;

            GC.Collect();
            GC.WaitForPendingFinalizers();
        }

        gcRetryFailed = true;
        var failed = new ClassResult();
        failed.Warnings.Add("object kept moving (GC pressure?) — offsets not computed");
        return failed;
    }

    private static ClassResult TryComputeClassOffsets(Type type, List<string> fieldNames, out bool gcMoved)
    {
        gcMoved = false;
        var result = new ClassResult();

        // Guards keep the scan window inside our own committed allocations:
        // the object is bump-allocated between them, so copying ScanWindow bytes
        // from its base cannot run off the end of the heap segment.
        var guardBefore = new byte[64];
        object obj = RuntimeHelpers.GetUninitializedObject(type);
        var guardAfter = new byte[ScanWindow];

        // Reused snapshot buffers: allocating a fresh 16 KiB array per field
        // would create enough gen0 pressure to trigger collections mid-scan.
        var bufA = new byte[ScanWindow];
        var bufB = new byte[ScanWindow];

        IntPtr addr = AddressOf(obj);

        var resolved = new List<(string Name, FieldInfo? Info)>(fieldNames.Count);
        foreach (string name in fieldNames)
            resolved.Add((name, FindField(type, name)));

        Snapshot(addr, bufA);
        byte[] prev = bufA;
        if (AddressOf(obj) != addr)
        {
            gcMoved = true;
            GC.KeepAlive(guardBefore);
            GC.KeepAlive(guardAfter);
            return result;
        }

        foreach (var (name, info) in resolved)
        {
            if (info == null)
            {
                result.Warnings.Add($"{name}: field not found on {type.FullName} (renamed or removed in this build?)");
                continue;
            }

            if (info.IsStatic)
            {
                result.Warnings.Add($"{name}: field is static — tosu expects an instance field");
                continue;
            }

            object marker;
            try
            {
                marker = MakeMarker(info.FieldType);
            }
            catch (Exception e)
            {
                result.Warnings.Add($"{name}: cannot create marker for {info.FieldType.Name}: {e.Message}");
                continue;
            }

            try
            {
                info.SetValue(obj, marker);
            }
            catch (Exception e)
            {
                result.Warnings.Add($"{name}: SetValue failed: {e.Message}");
                continue;
            }

            byte[] snap = ReferenceEquals(prev, bufA) ? bufB : bufA;
            Snapshot(addr, snap);
            if (AddressOf(obj) != addr)
            {
                gcMoved = true;
                GC.KeepAlive(guardBefore);
                GC.KeepAlive(guardAfter);
                GC.KeepAlive(marker);
                return result;
            }

            int offset;
            if (!info.FieldType.IsValueType)
            {
                // Reference field: the snapshot must contain the marker object's
                // address. Take it twice to make sure the marker did not move.
                IntPtr m1 = AddressOf(marker);
                byte[] pattern = BitConverter.GetBytes(m1.ToInt64());
                IntPtr m2 = AddressOf(marker);
                if (m1 != m2)
                {
                    gcMoved = true;
                    GC.KeepAlive(guardBefore);
                    GC.KeepAlive(guardAfter);
                    GC.KeepAlive(marker);
                    return result;
                }

                offset = IndexOfUnique(snap, pattern);
                if (offset < 0)
                {
                    result.Warnings.Add($"{name}: marker address not found in snapshot");
                    GC.KeepAlive(marker);
                    prev = snap;
                    continue;
                }

                GC.KeepAlive(marker);
            }
            else
            {
                // Value field: random non-zero bytes were written; the first byte
                // that differs from the previous snapshot is the field's start.
                offset = FirstDiff(prev, snap);
                if (offset < 0)
                {
                    result.Warnings.Add($"{name}: no bytes changed after write");
                    prev = snap;
                    continue;
                }
            }

            if (offset < 8)
                result.Warnings.Add($"{name}: suspicious offset {offset} (< object header size)");
            else if (IntPtr.Size == 8 && !info.FieldType.IsValueType && offset % 8 != 0)
                result.Warnings.Add($"{name}: reference field at unaligned offset {offset}");

            result.Offsets[name] = offset;
            prev = snap;
        }

        GC.KeepAlive(guardBefore);
        GC.KeepAlive(guardAfter);
        return result;
    }

    private static FieldInfo? FindField(Type type, string name)
    {
        for (var t = type; t != null && t != typeof(object); t = t.BaseType)
        {
            var f = t.GetField(name, DeclaredInstanceFields);
            if (f != null) return f;
        }

        return null;
    }

    private static object MakeMarker(Type ft)
    {
        if (ft.IsValueType)
            return MakeRandomValue(ft, 0);

        if (ft == typeof(string))
            return Guid.NewGuid().ToString("N");

        if (ft.IsArray)
            return Array.CreateInstance(ft.GetElementType() ?? typeof(object), 0);

        // classes incl. abstract — no constructor runs
        return RuntimeHelpers.GetUninitializedObject(ft);
    }

    private static object MakeRandomValue(Type ft, int depth)
    {
        if (depth > 4)
            return RuntimeHelpers.GetUninitializedObject(ft);

        if (ft.IsEnum)
        {
            object e = RuntimeHelpers.GetUninitializedObject(ft);
            var underlying = ft.GetField("value__", DeclaredInstanceFields);
            if (underlying != null)
                underlying.SetValue(e, MakeRandomValue(underlying.FieldType, depth + 1));
            return e;
        }

        if (ft.IsPrimitive || ft.IsValueType)
        {
            if (ft == typeof(bool)) return true; // non-zero byte
            if (ft == typeof(byte)) return (byte)Rng.Next(1, 256);
            if (ft == typeof(sbyte)) return (sbyte)Rng.Next(1, 128);
            if (ft == typeof(char)) return (char)Rng.Next(1, 0xD7FF);
            if (ft == typeof(short)) return EnsureLowByte((short)Rng.Next(short.MinValue, short.MaxValue));
            if (ft == typeof(ushort)) return EnsureLowByte((ushort)Rng.Next(1, ushort.MaxValue));
            if (ft == typeof(int)) return EnsureLowByte(Rng.Next());
            if (ft == typeof(uint)) return EnsureLowByte((uint)Rng.Next(1, int.MaxValue));
            if (ft == typeof(long)) return EnsureLowByte((long)Rng.Next(int.MinValue, int.MaxValue) << 8 | Rng.Next(1, 256));
            if (ft == typeof(ulong)) return EnsureLowByte((ulong)(Rng.Next(1, int.MaxValue) << 8 | Rng.Next(1, 256)));
            if (ft == typeof(float)) return BitConverter.UInt32BitsToSingle(EnsureLowByte((uint)Rng.Next()));
            if (ft == typeof(double)) return BitConverter.UInt64BitsToDouble(EnsureLowByte((uint)Rng.Next()) | ((ulong)EnsureLowByte((uint)Rng.Next()) << 32));
            if (ft == typeof(nint)) return new nint(EnsureLowByte(Rng.Next()));
            if (ft == typeof(nuint)) return new nuint(EnsureLowByte((uint)Rng.Next()));

            // composite struct (Vector2, DateTime, decimal, Nullable<T>, ...):
            // fill every declared field with non-zero random data
            object boxed = RuntimeHelpers.GetUninitializedObject(ft);
            foreach (var sub in ft.GetFields(DeclaredInstanceFields))
            {
                if (sub.IsLiteral || sub.IsStatic) continue;
                try
                {
                    sub.SetValue(boxed, MakeMarker(sub.FieldType));
                }
                catch
                {
                    // best effort — one unfillable sub-field doesn't break the rest
                }
            }

            return boxed;
        }

        return MakeMarker(ft);
    }

    /// <summary>Ensures the low byte is non-zero so a diff against zeroed memory starts at byte 0.</summary>
    private static T EnsureLowByte<T>(T value) where T : unmanaged
    {
        unsafe
        {
            byte* p = (byte*)&value;
            if (p[0] == 0) p[0] = (byte)Rng.Next(1, 256);
            return value;
        }
    }

    private static unsafe IntPtr AddressOf(object o)
    {
        // On CoreCLR an object reference IS the address (thin pointer).
        // AsPointer gives us the stack slot holding the reference.
        void** slot = (void**)Unsafe.AsPointer(ref o);
        return new IntPtr(*slot);
    }

    private static void Snapshot(IntPtr addr, byte[] buf)
    {
        Marshal.Copy(addr, buf, 0, ScanWindow);
    }

    private static int IndexOfUnique(byte[] haystack, byte[] needle)
    {
        int found = -1;
        for (int i = 0; i + needle.Length <= haystack.Length; i++)
        {
            bool match = true;
            for (int j = 0; j < needle.Length; j++)
            {
                if (haystack[i + j] != needle[j])
                {
                    match = false;
                    break;
                }
            }

            if (match)
            {
                if (found >= 0) return -1; // ambiguous
                found = i;
            }
        }

        return found;
    }

    private static int FirstDiff(byte[] a, byte[] b)
    {
        for (int i = 0; i < a.Length && i < b.Length; i++)
            if (a[i] != b[i]) return i;
        return -1;
    }

    // ------------------------------------------------------------------
    // output
    // ------------------------------------------------------------------

    private static void WriteOffsetsJson(
        string outFile,
        string version,
        Dictionary<string, List<string>> manifest,
        Dictionary<string, ClassResult> results)
    {
        using var fs = File.Create(outFile);
        using var w = new Utf8JsonWriter(fs, new JsonWriterOptions { Indented = false });

        w.WriteStartObject();
        w.WriteString("OsuVersion", version);

        foreach (var (className, fieldNames) in manifest)
        {
            if (!results.TryGetValue(className, out var result) || result.Offsets.Count == 0)
                continue;

            w.WritePropertyName(className);
            w.WriteStartObject();
            foreach (string field in fieldNames)
            {
                if (result.Offsets.TryGetValue(field, out int offset))
                    w.WriteNumber(field, offset);
            }

            w.WriteEndObject();
        }

        w.WriteEndObject();
        w.Flush();
    }

    private static void CompareWith(string path, Dictionary<string, ClassResult> results)
    {
        try
        {
            using var doc = JsonDocument.Parse(File.ReadAllText(path));
            int same = 0, diff = 0;

            foreach (var cls in doc.RootElement.EnumerateObject())
            {
                if (cls.Name is "OsuVersion" or "GameBaseVtable") continue;
                if (cls.Value.ValueKind != JsonValueKind.Object) continue;
                if (!results.TryGetValue(cls.Name, out var result)) continue;

                foreach (var field in cls.Value.EnumerateObject())
                {
                    if (field.Value.ValueKind != JsonValueKind.Number) continue;
                    if (!result.Offsets.TryGetValue(field.Name, out int mine)) continue;

                    int theirs = field.Value.GetInt32();
                    if (mine == theirs) same++;
                    else
                    {
                        diff++;
                        Console.WriteLine($"  [diff] {cls.Name}.{field.Name}: computed {mine} vs file {theirs}");
                    }
                }
            }

            Console.WriteLine($"Compare: {same} identical, {diff} different.");
            if (diff == 0 && same > 0)
                Console.WriteLine("Calibration OK — computed offsets match the reference file exactly.");
        }
        catch (Exception e)
        {
            Console.Error.WriteLine($"Compare failed: {e.Message}");
        }
    }

    // ------------------------------------------------------------------
    // runtime internals probe
    // ------------------------------------------------------------------

    /// <summary>
    /// tosu also hardcodes framework/BCL object internals directly in
    /// packages/tosu/src/memory/lazer.ts (bindable value at +0x40, disabled at
    /// +0x50, dictionary entries at +0x10 / count at +0x38, list items at +0x8 /
    /// size at +0x10, ...). Those are NOT part of offsets.json. This probe
    /// measures them for the runtime + framework build being processed so you
    /// can see at a glance whether torii/.NET 10 shifted anything the reader
    /// assumes. Run with -f net10.0 for nova, -f net8.0 for torii stable or
    /// official lazer.
    /// </summary>
    private static void PrintInternalsProbe(Dictionary<string, Type> typeMap)
    {
        Console.WriteLine();
        Console.WriteLine("=== runtime internals probe (hardcoded assumptions in memory/lazer.ts) ===");

        ProbeType(typeof(Dictionary<int, object>),
            ["_buckets", "_entries", "_count", "_freeList", "_freeCount", "_version", "_comparer"],
            "tosu: config-store dict entries ptr at +0x10, count at +0x38, entry stride 0x18 (enum key + ref value)");

        ProbeType(typeof(List<object>),
            ["_items", "_size", "_version"],
            "tosu: list items ptr at +0x8, size at +0x10");

        foreach (string name in new[] { "BindableBool", "BindableInt", "BindableFloat", "BindableDouble" })
        {
            if (typeMap.TryGetValue($"osu.Framework.Bindables.{name}", out var t))
                ProbeType(t, ["value", "defaultValue", "disabled"],
                    "tosu: bindable value at +0x40, disabled flag at +0x50");
        }

        // framework ConfigManager store field (tosu reads configAddress + 0x20 as the store dictionary)
        if (typeMap.TryGetValue("osu.Framework.Configuration.FrameworkConfigManager", out var fcm))
            ProbeAllFields(fcm, "tosu: ConfigManager store dictionary read at +0x20");

        Console.WriteLine("note: C# string layout (length at +0x8, utf-16 data at +0xC on x64) is a CoreCLR constant, not probed.");
    }

    private static void ProbeType(Type type, string[] fieldNames, string note)
    {
        Console.WriteLine();
        Console.WriteLine($"-- {type.FullName}");
        Console.WriteLine($"   {note}");

        ClassResult result;
        bool failed;
        try
        {
            result = ComputeClassOffsets(type, [.. fieldNames], out failed);
        }
        catch (Exception e)
        {
            Console.WriteLine($"   ! probe exception: {e.GetType().Name}: {e.Message}");
            return;
        }

        foreach (string name in fieldNames)
        {
            if (result.Offsets.TryGetValue(name, out int off))
                Console.WriteLine($"   {name,-16} = 0x{off:x} ({off})");
        }

        foreach (var w in result.Warnings)
            Console.WriteLine($"   ! {w}");
        if (failed)
            Console.WriteLine("   ! probe failed (gc retries exhausted)");
    }

    private static void ProbeAllFields(Type type, string note)
    {
        var names = new List<string>();
        for (var t = type; t != null && t != typeof(object); t = t.BaseType)
            foreach (var f in t.GetFields(DeclaredInstanceFields))
                if (!f.IsLiteral) names.Add(f.Name);

        ProbeType(type, [.. names], note);
    }
}
