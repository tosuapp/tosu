import { ApiAnswerPrecise as ApiAnswer } from '@/api/types/v2';
import { InstanceManager } from '@/objects/instanceManager/instanceManager';

export const buildResult = (instanceManager: InstanceManager): ApiAnswer => {
    const osuInstance = instanceManager.getInstance();
    if (!osuInstance) {
        return { error: 'not_ready' };
    }

    const { gamePlayData } = osuInstance.getServices(['gamePlayData']);

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
