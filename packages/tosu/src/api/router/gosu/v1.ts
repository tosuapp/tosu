// @ts-nocheck
import send from '@fastify/send';
import { FastifyInstance } from 'fastify';

import { config } from '@/config';
import { wLogger } from '@/logger';
import { sleep } from '@/utils/sleep';

export const buildV1Router = (app: FastifyInstance) => {
    app.register(async (app) => {
        app.get('/ws', { websocket: true }, async (connection, req) => {
            wLogger.debug('>>> ws: CONNECTED');
            let isSocketConnected = true;

            connection.socket.on('close', () => {
                isSocketConnected = false;
                wLogger.debug('>>> ws: CLOSED');
            });

            while (isSocketConnected) {
                if (Object.keys(req.instanceManager.osuInstances).length < 1) {
                    await sleep(500);
                    continue;
                }

                connection.socket.send(
                    JSON.stringify(
                        Object.values(
                            req.instanceManager.osuInstances
                        )[0].getState(req.instanceManager)
                    )
                );
                await sleep(config.wsSendInterval);
            }
        });
    });

    app.get('/json', (req, reply) => {
        if (Object.keys(req.instanceManager.osuInstances).length < 1) {
            reply.code(500);
            reply.send(null);
            return;
        }

        reply.send(
            Object.values(req.instanceManager.osuInstances)[0].getState(
                req.instanceManager
            )
        );
    });

    app.get('/Songs/*', async (req, reply) => {
        if (Object.keys(req.instanceManager.osuInstances).length < 1) {
            reply.code(500);
            reply.send(null);
            return;
        }

        const { settings } = Object.values(
            req.instanceManager.osuInstances
        )[0].entities.getServices(['settings']);

        if (settings.songsFolder === '') {
            reply.code(404);
            reply.send({
                error: 'not_ready'
            });
            return;
        }

        const parsedURL = new URL(
            `${req.protocol}://${req.hostname}${req.url}`
        );
        const mapPath = parsedURL.pathname.replace('/Songs', '');

        reply.hijack();
        send(req, mapPath, { root: settings.songsFolder }).pipe(reply.raw);
    });
};
