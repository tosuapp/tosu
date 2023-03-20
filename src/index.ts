import Router from '@koa/router';
import findProcess from 'find-process';
import { stat } from 'fs';
import Koa from 'koa';
import mount from 'koa-mount';
import send from 'koa-send';
import serve from 'koa-static';
import Websockify from 'koa-websocket';
import path from 'path';

import { OsuInstance } from './Instances/Osu';
import { sleep } from './Utils/sleep';
import { OSU_REGEX } from './constants';
import { wLogger } from './logger';

(async () => {
	wLogger.info('Starting tsosumemory');

	wLogger.info('Searching for osu!');
	let osuPid = 0;
	while (osuPid === 0) {
		const osuProcesses = await findProcess('name', OSU_REGEX);
		if (osuProcesses.length < 1) {
			wLogger.info('osu! not found, please start it... ');
			continue;
		}

		osuPid = osuProcesses[0].pid;
		wLogger.info('osu! found!');
	}

	wLogger.info('Running memory chimera...');
	const osuInstance = new OsuInstance(osuPid);
	osuInstance.start();

	const app = Websockify(new Koa());
	app.use(async (ctx, next) => {
		ctx.set('Access-Control-Allow-Origin', '*');
		ctx.set(
			'Access-Control-Allow-Headers',
			'Origin, X-Requested-With, Content-Type, Accept'
		);
		ctx.set('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
		await next();
	});

	const router = new Router();

	router.get('/json', (ctx) => {
		ctx.body = osuInstance.getState();
	});

	router.get('/Songs/(.*)', async (ctx) => {
		const { settings } = osuInstance.servicesRepo.getServices(['settings']);
		if (settings.songsFolder === '') {
			ctx.response.status = 404;
			ctx.body = {
				error: 'not_ready'
			};
			return;
		}
		const mapPath = ctx.request.path.replace('/Songs', '');
		await send(ctx, mapPath, { root: settings.songsFolder });
	});

	router.get('/static/(.*)', async (ctx) => {
		const staticPath = ctx.request.path.replace('/static', '');
		console.log(staticPath);
		await send(ctx, staticPath, { root: './static', index: 'index.html' });
	});

	const wsRouter = new Router();

	wsRouter.get('/ws', async (ctx) => {
		wLogger.debug('>>> ws: CONNECTED');
		let isSocketConnected = true;

		ctx.websocket.on('close', () => {
			isSocketConnected = false;
			wLogger.debug('>>> ws: CLOSED');
		});

		while (isSocketConnected) {
			ctx.websocket.send(JSON.stringify(osuInstance.getState()));
			await sleep(500);
		}
	});

	app.ws.use(wsRouter.routes()).use(wsRouter.allowedMethods());

	app.use(router.routes()).use(router.allowedMethods());

	app.listen(24050, '127.0.0.1');
})();
