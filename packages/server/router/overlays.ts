import { wLogger } from '@tosu/common';
import type { ServerResponse } from 'http';

import type { OverlayStatusFilter } from '../services/overlays';
import { OverlaysService, overlaysService } from '../services/overlays';
import { sendJson } from '../utils';
import type { ExtendedIncomingMessage, HttpServer } from '../utils/http';

function safeDecodeURIComponent(str: string): string {
    try {
        return decodeURIComponent(str || '');
    } catch {
        return str || '';
    }
}

export default function buildOverlaysApi(
    app: HttpServer,
    service: OverlaysService = overlaysService
) {
    service.initialize().catch((err) => {
        wLogger.error(
            'Failed to initialize overlays service:',
            (err as Error).message
        );
    });

    app.get('/api/overlays/status', (_req, res) => {
        return sendJson(res, service.getStatus());
    });

    app.get(
        '/api/overlays',
        (req: ExtendedIncomingMessage, res: ServerResponse) => {
            const rawFilter = (req.query.status || req.query.state) as
                | OverlayStatusFilter
                | undefined;
            return sendJson(res, service.getOverlays(rawFilter));
        }
    );

    app.post(
        '/api/overlays/download',
        async (req: ExtendedIncomingMessage, res: ServerResponse) => {
            let body: { id?: string; downloadUrl?: string } = {};
            try {
                body = JSON.parse(req.body || '{}');
            } catch {
                return sendJson(res, { error: 'Invalid JSON body' }, 400);
            }

            const { id, downloadUrl } = body;
            if (!id) {
                return sendJson(
                    res,
                    { error: 'Missing required field: id' },
                    400
                );
            }

            try {
                const result = await service.downloadOverlay(id, downloadUrl);
                return sendJson(res, {
                    status: 'success',
                    path: result.path
                });
            } catch (err) {
                wLogger.error('Overlay download endpoint error:', err);
                return sendJson(res, { error: (err as Error).message }, 500);
            }
        }
    );

    app.post(
        '/api/overlays/:id/download',
        async (req: ExtendedIncomingMessage, res: ServerResponse) => {
            const id = safeDecodeURIComponent(req.params.id);
            let body: { downloadUrl?: string } = {};
            try {
                if (req.body) {
                    body = JSON.parse(req.body);
                }
            } catch {}

            try {
                const result = await service.downloadOverlay(
                    id,
                    body.downloadUrl
                );
                return sendJson(res, {
                    status: 'success',
                    path: result.path
                });
            } catch (err) {
                wLogger.error('Overlay download endpoint error:', err);
                return sendJson(res, { error: (err as Error).message }, 500);
            }
        }
    );

    app.post(
        '/api/overlays/:id/open',
        async (req: ExtendedIncomingMessage, res: ServerResponse) => {
            const id = safeDecodeURIComponent(req.params.id);
            try {
                await service.openOverlay(id);
                return sendJson(res, { status: 'opened' });
            } catch (err) {
                return sendJson(res, { error: (err as Error).message }, 500);
            }
        }
    );

    app.delete(
        '/api/overlays/:id',
        async (req: ExtendedIncomingMessage, res: ServerResponse) => {
            const id = safeDecodeURIComponent(req.params.id);
            try {
                await service.deleteOverlay(id);
                return sendJson(res, { status: 'deleted' });
            } catch (err) {
                return sendJson(res, { error: (err as Error).message }, 500);
            }
        }
    );

    app.get(
        '/api/overlays/:id',
        (req: ExtendedIncomingMessage, res: ServerResponse) => {
            const id = safeDecodeURIComponent(req.params.id);
            const overlay = service.getOverlayById(id);
            if (!overlay) {
                return sendJson(res, { error: 'Overlay not found' }, 404);
            }
            return sendJson(res, overlay);
        }
    );
}
