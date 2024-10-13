import { ApiAnswerPrecise as ApiAnswer, PreciseTourney } from '@/api/types/v2';
import { InstanceManager } from '@/instances/manager';

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
            const { gameplay } = instance.getServices(['gameplay']);

            return {
                ipcId: instance.ipcId,
                keys: {
                    k1: {
                        isPressed: gameplay.KeyOverlay.K1Pressed,
                        count: gameplay.KeyOverlay.K1Count
                    },
                    k2: {
                        isPressed: gameplay.KeyOverlay.K2Pressed,
                        count: gameplay.KeyOverlay.K2Count
                    },
                    m1: {
                        isPressed: gameplay.KeyOverlay.M1Pressed,
                        count: gameplay.KeyOverlay.M1Count
                    },
                    m2: {
                        isPressed: gameplay.KeyOverlay.M2Pressed,
                        count: gameplay.KeyOverlay.M2Count
                    }
                },
                hitErrors: gameplay.HitErrors
            };
        });

    return mappedOsuTourneyClients;
};

export const buildResult = (instanceManager: InstanceManager): ApiAnswer => {
    const osuInstance = instanceManager.getInstance();
    if (!osuInstance) {
        return { error: 'not_ready' };
    }

    const { global, gameplay } = osuInstance.getServices([
        'gameplay',
        'global'
    ]);

    return {
        currentTime: global.PlayTime,
        keys: {
            k1: {
                isPressed: gameplay.KeyOverlay.K1Pressed,
                count: gameplay.KeyOverlay.K1Count
            },
            k2: {
                isPressed: gameplay.KeyOverlay.K2Pressed,
                count: gameplay.KeyOverlay.K2Count
            },
            m1: {
                isPressed: gameplay.KeyOverlay.M1Pressed,
                count: gameplay.KeyOverlay.M1Count
            },
            m2: {
                isPressed: gameplay.KeyOverlay.M2Pressed,
                count: gameplay.KeyOverlay.M2Count
            }
        },
        hitErrors: gameplay.HitErrors,
        tourney: buildTourneyData(instanceManager)
    };
};
