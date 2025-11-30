import { ApiAnswerPrecise as ApiAnswer, PreciseTourney } from '@/api/types/v2';
import { InstanceManager } from '@/instances/manager';
import { KeyOverlayButton } from '@/states/types';

const buildTourneyData = (
    instanceManager: InstanceManager,
    apiVersion: number
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
                keys: buildKeyOverlay(gameplay.keyOverlay, apiVersion),
                hitErrors: gameplay.hitErrors
            };
        });

    return mappedOsuTourneyClients;
};

export const buildResult = (
    instanceManager: InstanceManager,
    apiVersion: number
): ApiAnswer => {
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
        keys: buildKeyOverlay(gameplay.keyOverlay, apiVersion),
        hitErrors: gameplay.hitErrors,
        tourney: buildTourneyData(instanceManager, apiVersion)
    };
};

function buildKeyOverlay(
    keyOverlayData: KeyOverlayButton[],
    apiVersion: number
) {
    if (apiVersion > 1) return keyOverlayData;

    return {
        k1: {
            isPressed: keyOverlayData.at(0)?.isPressed ?? false,
            count: keyOverlayData.at(0)?.count ?? 0
        },
        k2: {
            isPressed: keyOverlayData.at(1)?.isPressed ?? false,
            count: keyOverlayData.at(1)?.count ?? 0
        },
        m1: {
            isPressed: keyOverlayData.at(2)?.isPressed ?? false,
            count: keyOverlayData.at(2)?.count ?? 0
        },
        m2: {
            isPressed: keyOverlayData.at(3)?.isPressed ?? false,
            count: keyOverlayData.at(3)?.count ?? 0
        }
    };
}
