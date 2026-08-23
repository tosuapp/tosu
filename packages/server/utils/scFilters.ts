export function normalizeSocketCommand(
    data: string,
    pathname: string | undefined
): string {
    if (data.includes(':')) return data;

    const pathOnly = (pathname ?? '').split('?')[0];
    if (pathOnly === '/tokens' && data.trimStart().startsWith('[')) {
        return `applyFilters:${data}`;
    }

    return data;
}
