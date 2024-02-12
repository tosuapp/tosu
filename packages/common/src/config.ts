import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import { wLogger } from './';

const configPath = path.join(process.cwd(), 'tsosu.env');
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
        configPath,
        `# Конфиг подразумевает под собой набор ключей-значений для включения/выключения функциональность tosu
# Ниже ты можешь видеть, что есть КАКАЯ_ТО_ФУНКЦИЯ=true/false,
# true = включён
# false = выключен

# Включает/выключает подсчёт ПП. Очень удобно использовать для турнирного клиента, когда тебе важно только подсчёт очков, и статистика карты например
CALCULATE_PP=true
# Включает/выключает чтение клавиш K1/K2/M1/M2 на клавиатуре
ENABLE_KEY_OVERLAY=true

# Справка: 1 секунда = 1000 милисекунд
# Раз в какое значение, программа должна считывать значения игры (в милисекундах)
POLL_RATE=150
# Раз в какое значение, программа должна считывать значения клавиш K1/K2/M1/M2 (в милисекундах)
KEYOVERLAY_POLL_RATE=150
# Раз в какое значение, программа должна отправлять информацию о значениях в вебсокет (оверлей) (в милисекундах)
WS_SEND_INTERVAL=150

# Включает/выключает внутриигровой оверлей gosumemory (!!ОТВЕТСТВЕННОСТЬ ЗА ЕГО ИСПОЛЬЗОВАНИЕ Я НЕ НЕСУ!!)
ENABLE_GOSU_OVERLAY=false

# WARNING: ВСЁ ЧТО НИЖЕ - БЕЗ НАДОБНОСТИ НЕ ТРОГАТЬ

# Включает логи для разработчиков tosu, не очень интуитивная вещь, для тебя - конечного пользователя
# лучше не включать, без просьбы разработчика
DEBUG_LOG=false

# IP адрес, на котором будет запщуен сервер websocket api
# 127.0.0.1 = localhost
# 0.0.0.0 = все адреса
SERVER_IP=127.0.0.1
# Порт, на котором будет запущен сервер websocket api
SERVER_PORT=24050
# Папка из которой будут браться оверлеи
STATIC_FOLDER_PATH=./static`
    );
}

dotenv.config({ path: configPath });

export const config = {
    debugLogging: (process.env.DEBUG_LOG || '') === 'true',
    calculatePP: (process.env.CALCULATE_PP || '') === 'true',
    enableKeyOverlay: (process.env.ENABLE_KEY_OVERLAY || '') === 'true',
    wsSendInterval: Number(process.env.WS_SEND_INTERVAL || '500'),
    pollRate: Number(process.env.POLL_RATE || '500'),
    keyOverlayPollRate: Number(process.env.KEYOVERLAY_POLL_RATE || '100'),
    serverIP: process.env.SERVER_IP || '127.0.0.1',
    serverPort: Number(process.env.SERVER_PORT || '24050'),
    staticFolderPath: process.env.STATIC_FOLDER_PATH || './static',
    enableGosuOverlay: (process.env.ENABLE_GOSU_OVERLAY || '') === 'true'
};

export const updateConfig = () => {
    let newOptions = '';

    if (!process.env.DEBUG_LOG) {
        newOptions += 'DEBUG_LOG, ';
        fs.appendFileSync(configPath, '\nDEBUG_LOG=false', 'utf8');
    }

    if (!process.env.CALCULATE_PP) {
        newOptions += 'CALCULATE_PP, ';
        fs.appendFileSync(configPath, '\nCALCULATE_PP=true', 'utf8');
    }

    if (!process.env.ENABLE_KEY_OVERLAY) {
        newOptions += 'ENABLE_KEY_OVERLAY, ';
        fs.appendFileSync(configPath, '\nENABLE_KEY_OVERLAY=true', 'utf8');
    }

    if (!process.env.WS_SEND_INTERVAL) {
        newOptions += 'WS_SEND_INTERVAL, ';
        fs.appendFileSync(configPath, '\nWS_SEND_INTERVAL=150', 'utf8');
    }

    if (!process.env.POLL_RATE) {
        newOptions += 'POLL_RATE, ';
        fs.appendFileSync(configPath, '\nPOLL_RATE=150', 'utf8');
    }

    if (!process.env.KEYOVERLAY_POLL_RATE) {
        newOptions += 'KEYOVERLAY_POLL_RATE, ';
        fs.appendFileSync(configPath, '\nKEYOVERLAY_POLL_RATE=150', 'utf8');
    }

    if (!process.env.SERVER_IP) {
        newOptions += 'SERVER_IP, ';
        fs.appendFileSync(configPath, '\nSERVER_IP=127.0.0.1', 'utf8');
    }

    if (!process.env.SERVER_PORT) {
        newOptions += 'SERVER_PORT, ';
        fs.appendFileSync(configPath, '\nSERVER_PORT=24050', 'utf8');
    }

    if (!process.env.STATIC_FOLDER_PATH) {
        newOptions += 'STATIC_FOLDER_PATH, ';
        fs.appendFileSync(configPath, '\nSTATIC_FOLDER_PATH=./static', 'utf8');
    }

    if (!process.env.ENABLE_GOSU_OVERLAY) {
        newOptions += 'nENABLE_GOSU_OVERLAY, ';
        fs.appendFileSync(configPath, '\nENABLE_GOSU_OVERLAY=false', 'utf8');
    }

    if (newOptions !== '')
        wLogger.warn(`New options available in config: ${newOptions}\n`);
};
