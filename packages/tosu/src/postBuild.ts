import fs from 'fs';
import path from 'path';
import { load } from 'resedit/cjs';
import semverParse from 'semver/functions/parse';

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
            ProductName: 'tosu',
            FileDescription: 'osu! memory reader, built in typescript',
            CompanyName: 'KotRik',
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
    fs.writeFileSync(output, Buffer.from(exe.generate()));
}

if (process.platform === 'win32') {
    windowsPostBuild(path.join(__dirname, '../', './dist/tosu.exe'));
}
