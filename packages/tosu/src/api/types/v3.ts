import {
    BanchoStatus,
    ChatStatus,
    CountryCodes,
    GameState,
    GroupType,
    LazerBeatmapTabType,
    LazerSortMode,
    LeaderboardType,
    ManiaScrollingDirection,
    ProgressBarType,
    Rulesets,
    ScoreMeterType,
    SortType,
    StableBeatmapStatuses,
    UserLoginStatus
} from '@tosu/common';

import { ModsLazer } from '@/utils/osuMods.types';

export type response = schema | { error?: string };

export interface schema {
    state: {
        id: number;
        name: keyof typeof GameState;
    };

    server: {
        status: keyof typeof UserLoginStatus; // profile.userStatus
        url: string; // client
    };

    game: {
        update_ready: boolean; // settings.client.updateAvailable
        fullscreen: boolean; // settings.resolution.fullscreen
        focused: boolean;

        leaderboard: boolean; // settings.leaderboard.visible
        interface: boolean; // settings.interfaceVisible
        replay_ui: boolean; // settings.replayUIVisible
        paused: boolean;
        chat: keyof typeof ChatStatus; // settings.chatVisibilityStatus.name

        client: 'lazer' | 'stable' | 'macos'; // client
        branch: number; // settings.client.branch
        version: string; // settings.client.version

        // profile.mode & play.mode
        mode: {
            id: number;
            name: keyof typeof Rulesets;
        };

        width: number; // settings.resolution.width
        height: number; // settings.resolution.height

        skin: string; // settings.skin.name  FIXME: naming

        bass_density: number; // settings.bassDensity
        rate: number; // play.mods.rate FIXME: better naming
        time: number; // beatmap.time.live

        play_time: number; // *new
        running_time: number; // session.playTime
    };

    // profile
    user: {
        state: keyof typeof BanchoStatus; // profile.banchoStatus

        id: number;
        name: string;

        global_rank: number; // globalRank
        ranked_score: number; // rankedScore

        level: number;
        pp: number;
        accuracy: number;

        // playCount
        play_count: {
            current: number; // session.playCount
            total: number; // profile.playCount
        };

        country_code: keyof typeof CountryCodes; // profile.countryCode.name
        background_color: string; // backgroundColour - stable only
    };

    beatmap: {
        convert: boolean;
        break: boolean; // beatmap.isBreak
        kiai: boolean;

        status: {
            id: number; // beatmap.status.number
            name: keyof typeof StableBeatmapStatuses;
        };

        time: {
            start: number; // beatmap.time.firstObject
            end: number; // beatmap.time.lastObject

            drain: number;
            total: number; // beatmap.time.mp3Length
        };

        checksum: string;
        id: number;
        set: number;

        mode: {
            id: number;
            name: keyof typeof Rulesets;
        };

        artist: string;
        artist_unicode: string; // artistUnicode

        title: string;
        title_unicode: string; // titleUnicode

        mappers: string[]; // in case if it's a GD
        version: string;

        stats: {
            stars: {
                realtime: number; // beatmap.stats.stars.

                /**   osu!   */
                aim: number | undefined;
                speed: number | undefined;
                flashlight: number | undefined;

                /**   taiko   */
                stamina: number | undefined;
                rhythm: number | undefined;
                color: number | undefined;
                reading: number | undefined;

                total: number;

                //  REMOVE THOSE
                //  REMOVE THOSE
                sliderFactor: number | undefined;
                hitWindow: number | undefined;
            };

            ar: {
                original: number;
                converted: number;
            };
            cs: {
                original: number;
                converted: number;
            };
            od: {
                original: number;
                converted: number;
            };
            hp: {
                original: number;
                converted: number;
            };

            bpm: {
                realtime: number;
                min: number;
                max: number;
                common: number;
            };

            objects: {
                circles: number;
                sliders: number;
                spinners: number;
                holds: number;
                total: number;
            };

            // performance.accuracy
            pp: {
                '90': number;
                '91': number;
                '92': number;
                '93': number;
                '94': number;
                '95': number;
                '96': number;
                '97': number;
                '98': number;
                '99': number;
                '100': number;
            };

            max_combo: number; // maxCombo
        };

        files: {
            background: string; // files.background
            beatmap: string; // files.beatmap
            audio: string; // files.audio
        };
    };

    play: {
        failed: boolean;

        name: string; // play.playerName
        score: number;

        // play.healthBar
        hp: {
            current: number; // play.healthBar.normal
            smooth: number;
        };

        combo: {
            current: number;
            max: number;
        };

        statistics: {
            /** geki */
            perfect: number;
            /** h300 */
            great: number;
            /** katu */
            good: number;
            /** h100 */
            ok: number;
            /** h50 */
            meh: number;
            /** h0 */
            miss: number;

            /** scaled miss count based on total hits. */
            effective_miss_count: number;

            small_tick_miss?: number;
            small_tick_hit: number;

            large_tick_miss?: number;
            large_tick_hit: number;

            small_bonus?: number;
            large_bonus?: number;

            ignore_miss?: number;
            ignore_hit?: number;

            combo_break?: number;
            /** sliderEndHits */
            slider_tail_hit: number;
            legacy_combo_increase?: number;
        };

        grade: {
            current: string;
            max: string;
        };

        mods: {
            checksum: string; // play.mods.checksum  -  unique md5

            id: number;
            name: string;

            array: ModsLazer;
        };

        pp: {
            current: number;
            max_achieved: number; // maxAchieved
            max_achievable: number; // maxAchievable

            aim: number;
            speed: number;
            accuracy: number;

            /**   taiko   */
            difficulty: number;
        };

        fc: {
            current: number;
            aim: number;
            speed: number;
            accuracy: number;

            /**   taiko   */
            difficulty: number;
        };

        accuracy: number;
        unstable_rate: {
            current: number; // play.unstableRate
            estimated: number; // *new
        };
    };

    result: {
        online_id: number; // resultsScreen.scoreId

        name: string; // resultsScreen.playerName
        score: number;

        mode: {
            id: number;
            name: keyof typeof Rulesets;
        };

        combo: number;

        statistics: {
            /** geki */
            perfect: number;
            /** h300 */
            great: number;
            /** katu */
            good: number;
            /** h100 */
            ok: number;
            /** h50 */
            meh: number;
            /** h0 */
            miss: number;

            /** scaled miss count based on total hits. */
            effective_miss_count: number;

            small_tick_miss?: number;
            small_tick_hit: number;

            large_tick_miss?: number;
            large_tick_hit: number;

            small_bonus?: number;
            large_bonus?: number;

            ignore_miss?: number;
            ignore_hit?: number;

            combo_break?: number;
            /** sliderEndHits */
            slider_tail_hit: number;
            legacy_combo_increase?: number;
        };

        grade: string;

        mods: {
            checksum: string; // play.mods.checksum  -  unique md5

            id: number;
            name: string;

            array: ModsLazer;
        };

        pp: {
            current: number;

            aim: number;
            speed: number;
            accuracy: number;

            /**   taiko   */
            difficulty: number;
        };

        fc: {
            current: number;
            aim: number;
            speed: number;
            accuracy: number;

            /**   taiko   */
            difficulty: number;
        };

        accuracy: number;
        max_combo: number; // maxCombo

        created_at: string; // createdAt
    };

    lobby: {
        freestyle: boolean;
        type:
            | 'multiplayer'
            | 'playlist'
            | 'daily-challenge'
            | 'quick-play'
            | 'tournament';

        id: number;
        name: string;

        // FIXME: naming
        hosted_by: {
            id: number;
            name: string;
        };

        mods: {
            freemods: boolean;
            checksum: string; // play.mods.checksum  -  unique md5

            id: number;
            name: string;

            array: ModsLazer;
        };

        queue: {
            id: number;
        }[];

        users: {
            host: boolean;
            team: string;

            id: number;
            name: string;
        }[];

        messages: {
            team: string;
            name: string;
            message: string;
            timestamp: string;
        }[];
    };

    // performance.graph
    graphs: {
        labels: number[]; // performance.graph.xaxis
        series: {
            name:
                | 'aim'
                | 'aim_no_sliders'
                | 'flashlight'
                | 'speed'
                | 'color'
                | 'rhythm'
                | 'stamina'
                | 'movement'
                | 'strains';
            data: number[];
        }[];
    };

    // for beatmap and lobbies
    leaderboard: {
        failed: boolean; // leaderboard.isFailed

        position: number;
        team: number; // FIXME: re:do

        id: number;
        name: string;
        score: number;

        combo: {
            current: number;
            max: number;
        };

        statistics: {
            /** geki */
            perfect: number;
            /** h300 */
            great: number;
            /** katu */
            good: number;
            /** h100 */
            ok: number;
            /** h50 */
            meh: number;
            /** h0 */
            miss: number;

            /** scaled miss count based on total hits. */
            effective_miss_count: number;

            small_tick_miss?: number;
            small_tick_hit: number;

            large_tick_miss?: number;
            large_tick_hit: number;

            small_bonus?: number;
            large_bonus?: number;

            ignore_miss?: number;
            ignore_hit?: number;

            combo_break?: number;
            /** sliderEndHits */
            slider_tail_hit: number;
            legacy_combo_increase?: number;
        };

        grade: string;

        mods: {
            checksum: string; // play.mods.checksum  -  unique md5

            id: number;
            name: string;

            array: ModsLazer;
        };

        pp: {
            current: number;

            aim: number;
            speed: number;
            accuracy: number;

            /**   taiko   */
            difficulty: number;
        };

        fc: {
            current: number;
            aim: number;
            speed: number;
            accuracy: number;

            /**   taiko   */
            difficulty: number;
        };

        accuracy: number;
    }[];

    settings: {
        storyboard: boolean; // settings.background.storyboard
        converts: boolean; // *new
        video: boolean; // settings.background.video

        // progressBar
        progress_bar: {
            id: number; // settings.progressBar.number
            name: keyof typeof ProgressBarType;
        };
        leaderboard: {
            id: number; // settings.leaderboard.number
            name:
                | keyof typeof LazerBeatmapTabType
                | keyof typeof LeaderboardType;
        };
        // scoreMeter
        score_meter: {
            id: number; // settings.scoreMeter.type.number
            name: keyof typeof ScoreMeterType; // settings.scoreMeter.type
            size: number;
        };

        // settings.sort
        grouping: {
            id: number; // settings.sort.number
            name: keyof typeof LazerSortMode | keyof typeof SortType;
        };
        // settings.group
        sorting: {
            id: number; // settings.group.number
            name: keyof typeof GroupType;
        };

        cursor: {
            skin_cursor: boolean; // settings.cursor.useSkinCursor
            resize: boolean; // settings.cursor.autoSize  FIXME: naming

            size: number;
            menu_size: number; // menuSize
        };

        tablet: {
            enabled: boolean;
            x: number;
            y: number;
            width: number;
            height: number;
            rotation: number;
            pressure_threshold: number; // pressureThreshold
        };

        mouse: {
            disable_clicks: boolean; // settings.mouse.disableButtons
            disable_wheel: boolean; // disableWheel

            raw_input: boolean; // rawInput
            sensitivity: number;
        };

        background: {
            blur: number;
            dim: number;
        };

        audio: {
            ignore_beatmap_sounds: boolean; // ignoreBeatmapSounds
            use_skin_samples: boolean; // useSkinSamples

            volume: {
                master_inactive: number; // masterInactive

                master: number;
                music: number;
                effect: number;
            };

            offset: {
                universal: number;
            };
        };

        skin: {
            default_skin_in_editor: boolean; // useDefaultSkinInEditor
            ignore_beatmap_skins: boolean; // ignoreBeatmapSkins
            tint_slider_ball: boolean; // tintSliderBall
            taiko_skin: boolean; // useTaikoSkin
        };

        mania: {
            per_beatmap_bpm_scale: boolean; // usePerBeatmapSpeedScale  FIXME: naming
            bpm_scale: boolean; // settings.mania.speedBPMScale

            scroll_speed: number; // scrollSpeed
            scroll_direction: keyof typeof ManiaScrollingDirection; // settings.mania.scrollDirection.name
        };

        keybinds: {
            osu: {
                k1: string;
                k2: string;
                smoke: string;
            };
            catch: {
                k1: string;
                k2: string;
                dash: string;
            };
            taiko: {
                inner_left: string; // innerLeft
                inner_right: string; // innerRight
                outer_left: string; // outerLeft
                outer_right: string; // outerRight
            };

            retry: string; // settings.keybinds.quickRetry
        };
    };
}

/*     PRECISE     */

export interface preciseSchema extends precise {
    time: number; // currentTime
    tourney: tourneyPreciseClient[];
}

export interface tourneyPreciseClient extends precise {
    id: number;
}

export interface precise {
    hit_errors: number[]; // hitErrors
    keys: Record<string, { value: boolean; count: number }>;
}
