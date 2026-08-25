export type WsEndpoint = 'v1' | 'sc' | 'v2' | 'v2precise' | 'commands';

export interface WsData {
    endpoint: WsEndpoint;
    id: string;
    /** Path + query string of the upgrade request, e.g. `/tokens?l=name`. */
    pathname: string;
    query: Record<string, string>;

    hostAddress: string;
    localAddress: string;
    originAddress: string;
    remoteAddress: string;
}
