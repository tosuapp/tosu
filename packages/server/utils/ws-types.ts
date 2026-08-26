import type { Filter } from './filters';

export type WsEndpoint = 'v1' | 'sc' | 'v2' | 'v2precise' | 'commands';

export interface WsData {
    endpoint: WsEndpoint;
    id: string;
    /** Path of the upgrade request without the query string, e.g. `/tokens`. */
    pathname: string;
    query: Record<string, string>;
    filters: Filter[];

    hostAddress: string;
    localAddress: string;
    originAddress: string;
    remoteAddress: string;
}
