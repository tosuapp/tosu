import fs from 'fs/promises';
import path from 'path';
import * as ResEdit from 'resedit';
import { parse as semverParse } from 'semver';

async function getPackageAuthor(): Promise<string> {
    const packageRaw = await fs.readFile(path.join(import.meta.dirname, '../../../package.json'), 'utf-8');
    const { author } = JSON.parse(packageRaw);

    if (typeof author === 'string') return author;
    if (author && typeof author === 'object' && typeof author.name === 'string') return author.name;

    return '';
}

async function windowsPostBuild(output: string) {
    const packageVersion = await import(new URL('./_version.js', import.meta.url).href).then((mod) => mod.default);
    const author = await getPackageAuthor();

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
            ProductName: 'tosu',
            FileDescription: 'tosu - memory reader for osu!',
            CompanyName: author,
            LegalCopyright: `Copyright (C) ${new Date().getFullYear()} ${author}`
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
    await fs.writeFile(output, Buffer.from(exe.generate()));
}

if (process.platform === 'win32') {
    await windowsPostBuild(path.join(import.meta.dirname, '../', './dist/tosu.exe'));
}
