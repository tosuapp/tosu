export interface NpmPackage {
    'dist-tags': Record<string, string>;
    versions: Record<string, NpmPackageVersion>;
}

export interface NpmPackageVersion {
    name: string;
    version: string;
    dist: NpmPackageDist;
}

export interface NpmPackageDist {
    shasum: string;
    tarball: string;
}
