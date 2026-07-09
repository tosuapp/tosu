import fs from 'fs';
import path from 'path';
import { load } from 'resedit/cjs';
import semverParse from 'semver/functions/parse';

const IMAGE_SUBSYSTEM_WINDOWS_GUI = 2;

function setWindowsSubsystem(output: Buffer, subsystem: number) {
    const peHeaderOffset = output.readUInt32LE(0x3c);
    const optionalHeaderOffset = peHeaderOffset + 24;
    const subsystemOffset = optionalHeaderOffset + 0x44;

    output.writeUInt16LE(subsystem, subsystemOffset);
}

async function windowsPostBuild(output: string) {
    const packageVersion = require(path.join(__dirname, '_version.js'));

    const ResEdit = await load();
    const exe = ResEdit.NtExecutable.from(fs.readFileSync(output));
    const res = ResEdit.NtExecutableResource.from(exe);
    const iconFile = ResEdit.Data.IconFile.from(
        fs.readFileSync(path.join(__dirname, 'assets', 'icon.ico'))
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
    fs.writeFileSync(output, generated);
}

if (process.platform === 'win32') {
    windowsPostBuild(path.join(__dirname, '../', './dist/tosu-kumori.exe'));
}
