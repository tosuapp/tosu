import { config } from '@tosu/common';
import http from 'http';

export function sendJson(response: http.ServerResponse, json: object | any[]) {
    response.setHeader('Content-Type', 'application/json');

    try {
        return response.end(JSON.stringify(json));
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return response.end(JSON.stringify({ error: 'Json parsing error' }));
    }
}

export function isRequestAllowed(req: http.IncomingMessage) {
    const remoteAddress = req.socket.remoteAddress;

    const origin = req.headers.origin;
    const referer = req.headers.referer;

    const isOriginOrRefererAllowed =
        isAllowedIP(origin) || isAllowedIP(referer);

    // NOT SURE
    if (origin === undefined && referer === undefined) {
        return true;
    }

    if (isOriginOrRefererAllowed) {
        return true;
    }

    if (isOriginOrRefererAllowed && isAllowedIP(remoteAddress)) {
        return false;
    }

    return false;
}

function isAllowedIP(url: string | undefined) {
    if (!url) return false;

    const allowedIPs = config.allowedIPs.split(',');
    allowedIPs.push(config.serverIP);

    try {
        const hostname = new URL(url).hostname.toLowerCase().trim();
        return allowedIPs.some((pattern) => {
            // compare IP's length and match wildcard like comparision
            if (pattern.includes('*') && pattern.includes('.')) {
                const patternLength = pattern.match(/\./g)?.length || 0;
                const hostnameLength = hostname.match(/\./g)?.length || 0;

                if (patternLength !== 3 || hostnameLength !== 3) return false;

                const patternParts = pattern.split('.');
                const hostnameParts = hostname.split('.');

                const matches = hostnameParts.filter((r, index) => {
                    if (patternParts[index] === '*') return true;

                    return patternParts[index] === r;
                });

                return matches.length === 4;
            }

            return pattern.toLowerCase().trim() === hostname;
        });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
        return allowedIPs.some(
            (r) => r.toLowerCase().trim() === url.toLowerCase().trim()
        );
    }
}
