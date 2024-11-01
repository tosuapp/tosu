export type Platform = 'windows' | 'linux' | 'macos' | 'unknown';

interface IPlatform {
    type: Platform;
    fileType: string;
    command: string;
}

export function platformResolver(platform: string): IPlatform {
    let type: Platform = 'unknown';
    let fileType = '';
    let command = '';

    switch (platform) {
        case 'win32':
            type = 'windows';
            fileType = '.exe';
            command = 'start ""';
            break;

        case 'linux':
            type = 'linux';
            command = 'xdg-open';
            break;

        case 'darwin':
            type = 'macos';
            command = 'open -R';
            break;
    }

    return { type, fileType, command };
}
