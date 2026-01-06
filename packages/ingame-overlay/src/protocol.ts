import { net, protocol, session } from 'electron';

// Declare internal protocol for requesting to tosu endpoint
protocol.registerSchemesAsPrivileged([
    {
        scheme: 'tosu',
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            bypassCSP: true,
            stream: true
        }
    }
]);

export function registerTosuProtocol() {
    // Fix ws tosu referer filtering
    session.defaultSession.webRequest.onBeforeSendHeaders(
        {
            urls: ['ws://localhost:24050/*']
        },
        (details, callback) => {
            details.requestHeaders.Referer = 'http://localhost:24050';
            callback({ requestHeaders: details.requestHeaders });
        }
    );

    // Register tosu protocol handler
    protocol.handle('tosu', (req) => {
        return net.fetch(
            req.url.replace('tosu://', 'http://localhost:24050/'),
            {
                method: req.method,
                headers: {
                    ...req.headers,
                    // Fix tosu referer filtering
                    Referer: 'http://localhost:24050'
                },
                body: req.body,
                duplex: 'half',
                bypassCustomProtocolHandlers: true
            }
        );
    });
}
