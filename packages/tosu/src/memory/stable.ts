import { config, sleep, wLogger } from '@tosu/common';
import fs from 'fs';
import path from 'path';

import { AbstractMemory, PatternData } from '@/memory';
import { Gameplay } from '@/states/gameplay';
import { Global } from '@/states/global';

type SCAN_PATTERNS = {
    [k in keyof PatternData]: {
        pattern: string;
        offset?: number;
        isTourneyOnly?: boolean;
    };
};

export class StableMemory extends AbstractMemory {
    SCAN_PATTERNS: SCAN_PATTERNS = {
        baseAddr: {
            pattern: 'F8 01 74 04 83 65'
        },
        playTimeAddr: {
            pattern: '5E 5F 5D C3 A1 ?? ?? ?? ?? 89 ?? 04'
        },
        chatCheckerPtr: {
            pattern: '8B CE 83 3D ?? ?? ?? ?? 00 75 ?? 80',
            offset: 0x4
        },
        skinDataAddr: {
            pattern: '74 2C 85 FF 75 28 A1 ?? ?? ?? ?? 8D 15'
        },
        settingsClassAddr: {
            pattern: '83 E0 20 85 C0 7E 2F'
        },
        configurationAddr: {
            pattern: '7E 07 8D 65 F8 5E 5F 5D C3 E8',
            offset: -0xd
        },
        bindingsAddr: {
            pattern: '8D 7D D0 B9 08 00 00 00 33 C0 F3 AB 8B CE 89 4D DC B9',
            offset: 0x2a
        },
        rulesetsAddr: {
            pattern: '7D 15 A1 ?? ?? ?? ?? 85 C0'
        },
        canRunSlowlyAddr: {
            pattern: '55 8B EC 80 3D ?? ?? ?? ?? 00 75 26 80 3D'
        },
        statusPtr: {
            pattern: '48 83 F8 04 73 1E',
            offset: -0x4
        },
        menuModsPtr: {
            pattern: 'C8 FF ?? ?? ?? ?? ?? 81 0D ?? ?? ?? ?? ?? 08 00 00',
            offset: 0x9
        },
        getAudioLengthPtr: {
            pattern: '55 8B EC 83 EC 08 A1 ?? ?? ?? ?? 85 C0',
            offset: 0x7
        },
        userProfilePtr: {
            pattern: 'FF 15 ?? ?? ?? ?? A1 ?? ?? ?? ?? 8B 48 54 33 D2',
            offset: 0x7
        },
        rawLoginStatusPtr: {
            pattern: 'B8 0B 00 00 8B 35',
            offset: -0xb
        },
        spectatingUserPtr: {
            pattern: '8B 0D ?? ?? ?? ?? 85 C0 74 05 8B 50 30',
            offset: -0x4
        },
        gameTimePtr: {
            pattern: 'A1 ?? ?? ?? ?? 89 46 04 8B D6 E8',
            offset: 0x1
        }
    };

    previousState: string = '';
    previousMP3Length: number = 0;
    previousTime: number = 0;

    resolvePatterns(): boolean {
        try {
            const results = this.process.scanBatch(
                Object.values(this.SCAN_PATTERNS).map((x) => x.pattern)
            );

            const patternsEntries = Object.entries(this.SCAN_PATTERNS);
            for (let i = 0; i < results.length; i++) {
                const item = results[i];
                const pattern = patternsEntries[item.index];

                this.setPattern(
                    pattern[0] as keyof PatternData,
                    item.address + (pattern[1].offset || 0)
                );
            }

            if (!this.checkIsBasesValid()) {
                return false;
            }

            return true;
        } catch (error) {
            wLogger.debug(`MP(resolvePatterns)[${this.pid}]`, error);
            return false;
        }
    }

    initiateDataLoops() {
        const { global, gameplay } = this.game.getServices([
            'global',
            'gameplay'
        ]);

        this.regularDataLoop();
        this.preciseDataLoop(global, gameplay);
    }

    async regularDataLoop() {
        try {
            wLogger.debug('SM(startDataLoop) starting');

            const {
                global,
                menu,
                bassDensity,
                beatmapPP,
                gameplay,
                resultScreen,
                settings,
                tourneyManager,
                user
            } = this.game.getServices([
                'global',
                'menu',
                'bassDensity',
                'beatmapPP',
                'gameplay',
                'resultScreen',
                'settings',
                'tourneyManager',
                'user'
            ]);

            while (!this.game.isDestroyed) {
                try {
                    global.updateState();
                    const menuUpdate = menu.updateState();
                    if (menuUpdate === 'not-ready') {
                        await sleep(config.pollRate);
                        continue;
                    }

                    // osu! calculates audioTrack length a little bit after updating menu, sooo.. lets this thing run regardless of menu updating
                    if (menu.Folder !== '' && menu.Folder !== null) {
                        menu.updateMP3Length();
                    }

                    if (!global.GameFolder) {
                        global.setGameFolder(this.path);

                        // condition when user have different BeatmapDirectory in osu! config
                        if (fs.existsSync(global.MemorySongsFolder)) {
                            global.setSongsFolder(global.MemorySongsFolder);
                        } else {
                            global.setSongsFolder(
                                path.join(this.path, global.MemorySongsFolder)
                            );
                        }
                    }

                    // update important data before doing rest
                    if (global.Status === 7) {
                        const resultUpdate = resultScreen.updateState();
                        if (resultUpdate === 'not-ready') {
                            await sleep(config.pollRate);
                            continue;
                        }
                    }

                    settings.updateState();

                    const currentMods =
                        global.Status === 2
                            ? gameplay.Mods
                            : global.Status === 7
                              ? resultScreen.Mods
                              : global.MenuMods;

                    const currentMode =
                        global.Status === 2
                            ? gameplay.Mode
                            : global.Status === 7
                              ? resultScreen.Mode
                              : menu.MenuGameMode;

                    const currentState = `${menu.MD5}:${currentMode}:${currentMods}`;
                    const updateGraph =
                        this.previousState !== currentState ||
                        this.previousMP3Length !== menu.MP3Length;
                    if (
                        menu.Path?.endsWith('.osu') &&
                        global.GameFolder &&
                        this.previousState !== currentState
                    ) {
                        const metadataUpdate = beatmapPP.updateMapMetadata(
                            currentMods,
                            currentMode
                        );
                        if (metadataUpdate === 'not-ready') {
                            await sleep(config.pollRate);
                            continue;
                        }
                        beatmapPP.updateGraph(currentMods);
                        this.previousState = currentState;
                    }

                    if (
                        menu.Path?.endsWith('.osu') &&
                        global.GameFolder &&
                        updateGraph
                    ) {
                        beatmapPP.updateGraph(currentMods);
                        this.previousMP3Length = menu.MP3Length;
                    }

                    beatmapPP.updateRealTimeBPM(global.PlayTime, currentMods);

                    switch (global.Status) {
                        case 0:
                            bassDensity.updateState();
                            break;

                        case 1:
                            if (this.previousTime === global.PlayTime) break;

                            this.previousTime = global.PlayTime;
                            beatmapPP.updateEditorPP();
                            break;

                        // EditorSongSElect and SongSelect
                        case 4:
                        case 5:
                            // Reset Gameplay/ResultScreen data on joining to songSelect
                            if (!gameplay.isDefaultState) {
                                gameplay.init(undefined, '4,5');
                                resultScreen.init();
                                beatmapPP.resetAttributes();
                            }

                            // Reset ResultScreen if we in song select
                            if (resultScreen.PlayerName) {
                                resultScreen.init();
                            }
                            break;

                        case 2:
                            // Reset gameplay data on retry
                            if (this.previousTime > global.PlayTime) {
                                gameplay.init(true);
                                beatmapPP.resetAttributes();
                            }

                            // reset before first object
                            if (global.PlayTime < beatmapPP.timings.firstObj) {
                                gameplay.resetQuick();
                            }

                            this.previousTime = global.PlayTime;

                            gameplay.updateState();
                            break;

                        case 7:
                            resultScreen.updatePerformance();
                            break;

                        case 22:
                            if (!this.game.isTourneyManager) {
                                this.game.isTourneyManager = true;
                            }
                            await tourneyManager.updateState();
                            break;

                        // do not spam reset on multiplayer and direct
                        case 11:
                        case 12:
                        case 15:
                            break;

                        default:
                            gameplay.init(
                                undefined,
                                `default-${global.Status}`
                            );
                            resultScreen.init();
                            break;
                    }

                    if (this.game.isTourneySpectator) {
                        tourneyManager.updateUser();
                    }

                    user.updateState();
                } catch (exc) {
                    wLogger.error(
                        `SM(startDataLoop)[${this.pid}]`,
                        'error happend while another loop executed'
                    );
                    wLogger.debug(exc);
                }

                await sleep(config.pollRate);
            }
        } catch (error) {
            wLogger.debug(`SM(startDataLoop)[${this.pid}]`, error);
        }
    }

    preciseDataLoop(global: Global, gameplay: Gameplay) {
        if (this.game.isDestroyed === true) return;
        global.updatePreciseState();

        switch (global.Status) {
            case 2:
                if (global.PlayTime < 150) {
                    break;
                }

                if (config.enableKeyOverlay) {
                    gameplay.updateKeyOverlay();
                }
                gameplay.updateHitErrors();
                break;
            default:
                gameplay.resetKeyOverlay();
                break;
        }

        setTimeout(() => {
            this.preciseDataLoop(global, gameplay);
        }, config.preciseDataPollRate);
    }

    private checkIsBasesValid(): boolean {
        Object.entries(this.patterns).map((entry) =>
            wLogger.debug(
                `SM(checkIsBasesValid)[${this.pid}] ${entry[0]}: ${entry[1]
                    .toString(16)
                    .toUpperCase()}`
            )
        );
        return !Object.values(this.patterns).some((base) => base === 0);
    }

    audioVelocityBase() {
        if (this.process === null) {
            throw new Error('Process not found');
        }

        // Ruleset = [[Rulesets - 0xB] + 0x4]
        const rulesetAddr = this.process.readInt(
            this.process.readInt(this.getPattern('rulesetsAddr') - 0xb) + 0x4
        );
        if (rulesetAddr === 0) {
            wLogger.debug('BDD(updateState) rulesetAddr is zero');
            return null;
        }

        // [Ruleset + 0x44] + 0x10
        const audioVelocityBase = this.process.readInt(
            this.process.readInt(rulesetAddr + 0x44) + 0x10
        );

        const bassDensityLength = this.process.readInt(audioVelocityBase + 0x4);
        if (bassDensityLength < 40) {
            wLogger.debug(
                'BDD(updateState) bassDensity length less than 40 (basically it have 1024 values)'
            );
            return null;
        }

        const result: number[] = [];
        for (let i = 0; i < 40; i++) {
            const current = audioVelocityBase + this.getLeaderStart() + 0x4 * i;
            const value = this.process.readFloat(current);

            result.push(value);
        }

        return result;
    }
}
