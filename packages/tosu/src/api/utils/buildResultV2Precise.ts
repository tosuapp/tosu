import { ApiAnswerPrecise as ApiAnswer, PreciseTourney } from '@/api/types/v2';
import { InstanceManager } from '@/objects/instanceManager/instanceManager';

const buildTourneyData = (
    instanceManager: InstanceManager
): PreciseTourney[] => {
    const osuTourneyManager = Object.values(
        instanceManager.osuInstances
    ).filter((instance) => instance.isTourneyManager);
    if (osuTourneyManager.length < 1) {
        return [];
    }

    const osuTourneyClients = Object.values(
        instanceManager.osuInstances
    ).filter((instance) => instance.isTourneySpectator);

    const mappedOsuTourneyClients = osuTourneyClients
        .sort((a, b) => a.ipcId - b.ipcId)
        .map((instance): PreciseTourney => {
            const { gamePlayData } = instance.getServices(['gamePlayData']);

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
        });

    return mappedOsuTourneyClients;
};

export const buildResult = (instanceManager: InstanceManager): ApiAnswer => {
    const osuInstance = instanceManager.getInstance();
    if (!osuInstance) {
        return { error: 'not_ready' };
    }

    const { allTimesData, gamePlayData } = osuInstance.getServices([
        'gamePlayData',
        'allTimesData'
    ]);

    return {
        currentTime: allTimesData.PlayTime,
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
        hitErrors: gamePlayData.HitErrors,
        tourney: buildTourneyData(instanceManager)
    };
};
