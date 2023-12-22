export const platformResolver = (platform: string) => {
    let platformType = '',
        platformFileType = '';

    switch (platform) {
        case 'win32':
            platformType = 'windows';
            platformFileType = 'exe';
            break;

        case 'linux':
            platformType = 'linux';
            break;

        case 'darwin':
            platformType = 'macos';
            platformFileType = 'macos';
            break;
    }

    return { platformType, platformFileType };
};
