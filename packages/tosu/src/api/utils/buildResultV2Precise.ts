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
                        isPressed:
                            gameplay.keyOverlay.at(0)?.isPressed ?? false,
                        count: gameplay.keyOverlay.at(0)?.count ?? 0
                    },
                    k2: {
                        isPressed:
                            gameplay.keyOverlay.at(1)?.isPressed ?? false,
                        count: gameplay.keyOverlay.at(1)?.count ?? 0
                    },
                    m1: {
                        isPressed:
                            gameplay.keyOverlay.at(2)?.isPressed ?? false,
                        count: gameplay.keyOverlay.at(2)?.count ?? 0
                    },
                    m2: {
                        isPressed:
                            gameplay.keyOverlay.at(3)?.isPressed ?? false,
                        count: gameplay.keyOverlay.at(3)?.count ?? 0
                    }
                },
                hitErrors: gameplay.hitErrors
            };
        });

    return mappedOsuTourneyClients;
};

export const buildResult = (instanceManager: InstanceManager): ApiAnswer => {
    const osuInstance = instanceManager.getInstance(
        instanceManager.focusedClient
    );
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
                isPressed: gameplay.keyOverlay.at(0)?.isPressed ?? false,
                count: gameplay.keyOverlay.at(0)?.count ?? 0
            },
            k2: {
                isPressed: gameplay.keyOverlay.at(1)?.isPressed ?? false,
                count: gameplay.keyOverlay.at(1)?.count ?? 0
            },
            m1: {
                isPressed: gameplay.keyOverlay.at(2)?.isPressed ?? false,
                count: gameplay.keyOverlay.at(2)?.count ?? 0
            },
            m2: {
                isPressed: gameplay.keyOverlay.at(3)?.isPressed ?? false,
                count: gameplay.keyOverlay.at(3)?.count ?? 0
            }
        },
        hitErrors: gameplay.hitErrors,
        tourney: buildTourneyData(instanceManager)
    };
};
