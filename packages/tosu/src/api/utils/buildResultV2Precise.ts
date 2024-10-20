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
                        isPressed: gameplay.keyOverlay.K1Pressed,
                        count: gameplay.keyOverlay.K1Count
                    },
                    k2: {
                        isPressed: gameplay.keyOverlay.K2Pressed,
                        count: gameplay.keyOverlay.K2Count
                    },
                    m1: {
                        isPressed: gameplay.keyOverlay.M1Pressed,
                        count: gameplay.keyOverlay.M1Count
                    },
                    m2: {
                        isPressed: gameplay.keyOverlay.M2Pressed,
                        count: gameplay.keyOverlay.M2Count
                    }
                },
                hitErrors: gameplay.hitErrors
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
        currentTime: global.playTime,
        keys: {
            k1: {
                isPressed: gameplay.keyOverlay.K1Pressed,
                count: gameplay.keyOverlay.K1Count
            },
            k2: {
                isPressed: gameplay.keyOverlay.K2Pressed,
                count: gameplay.keyOverlay.K2Count
            },
            m1: {
                isPressed: gameplay.keyOverlay.M1Pressed,
                count: gameplay.keyOverlay.M1Count
            },
            m2: {
                isPressed: gameplay.keyOverlay.M2Pressed,
                count: gameplay.keyOverlay.M2Count
            }
        },
        hitErrors: gameplay.hitErrors,
        tourney: buildTourneyData(instanceManager)
    };
};
