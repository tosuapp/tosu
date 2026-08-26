export type Filter = string | { field: string; keys: Filter[] };

/**
 * Copies the requested keys from `data` into `value` (used by the `applyFilters` websocket command).
 */
export function applyFilter(filters: Filter[], data: any, value: any) {
    if (data === null || data === undefined) return;

    for (let i = 0; i < filters.length; i++) {
        const filter = filters[i];
        switch (typeof filter) {
            case 'string':
                value[filter] = data[filter];
                break;

            case 'object': {
                if (!(filter.field && Array.isArray(filter.keys))) break;
                if (
                    data[filter.field] === null ||
                    data[filter.field] === undefined
                )
                    break;

                value[filter.field] = {};
                applyFilter(
                    filter.keys,
                    data[filter.field],
                    value[filter.field]
                );
            }
        }
    }
}
