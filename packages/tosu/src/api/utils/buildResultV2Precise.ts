import { DataRepo } from '@/entities/DataRepoList';

import { PreciseAnswer } from '../types/v2';

export const buildResult = (service: DataRepo): PreciseAnswer => {
    const { gamePlayData } = service.getServices(['gamePlayData']);

    return {
        keys: {
            k1: {
                isPressed: gamePlayData.KeyOverlay.K1Pressed,
                count: gamePlayData.KeyOverlay.K1Count
            },
            k2: {
                isPressed: gamePlayData.KeyOverlay.K2Pressed,
                count: gamePlayData.KeyOverlay.K2Count
            },
            m1: {
                isPressed: gamePlayData.KeyOverlay.M1Pressed,
                count: gamePlayData.KeyOverlay.M1Count
            },
            m2: {
                isPressed: gamePlayData.KeyOverlay.M2Pressed,
                count: gamePlayData.KeyOverlay.M2Count
            }
        },
        hitErrors: gamePlayData.HitErrors
    };
};
