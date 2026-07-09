import fs from 'fs/promises';
import path from 'path';
import * as ResEdit from 'resedit';
import { parse as semverParse } from 'semver';

const IMAGE_SUBSYSTEM_WINDOWS_GUI = 2;

function setWindowsSubsystem(output: Buffer, subsystem: number) {
    const peHeaderOffset = output.readUInt32LE(0x3c);
    const optionalHeaderOffset = peHeaderOffset + 24;
    const subsystemOffset = optionalHeaderOffset + 0x44;

    output.writeUInt16LE(subsystem, subsystemOffset);
}

async function windowsPostBuild(output: string) {
    const packageVersion = await import(
        new URL('./_version.js', import.meta.url).href
    ).then((mod) => mod.default);

    const exe = ResEdit.NtExecutable.from(await fs.readFile(output));
    const res = ResEdit.NtExecutableResource.from(exe);
    const iconFile = ResEdit.Data.IconFile.from(
        await fs.readFile(path.join(import.meta.dirname, 'assets', 'icon.ico'))
    );

    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
        res.entries,
        1,
        1033,
        iconFile.icons.map((item) => item.data)
    );

    const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
    const semanticTosu = semverParse(packageVersion);

    const tosuVersion = {
        major: semanticTosu?.major || 0,
        minor: semanticTosu?.minor || 0,
        patch: semanticTosu?.patch || 0
    };

    vi.setStringValues(
        { lang: 1033, codepage: 1200 },
        {
            ProductName: 'tosu-kumori',
            FileDescription:
                'Kumori patched osu! memory reader, built in TypeScript',
            CompanyName: 'Kumori / KotRik',
            InternalName: 'tosu-kumori',
            OriginalFilename: 'tosu-kumori.exe',
            LegalCopyright: '© KotRik. All rights reserved.'
        }
    );
    vi.setFileVersion(
        tosuVersion.major,
        tosuVersion.minor,
        tosuVersion.patch,
        0,
        1033
    );
    vi.setProductVersion(
        tosuVersion.major,
        tosuVersion.minor,
        tosuVersion.patch,
        0,
        1033
    );
    vi.outputToResourceEntries(res.entries);
    res.outputResource(exe);

    const generated = Buffer.from(exe.generate());
    setWindowsSubsystem(generated, IMAGE_SUBSYSTEM_WINDOWS_GUI);
    await fs.writeFile(output, generated);
}

if (process.platform === 'win32') {
    await windowsPostBuild(
        path.join(import.meta.dirname, '../', './dist/tosu-kumori.exe')
    );
}
