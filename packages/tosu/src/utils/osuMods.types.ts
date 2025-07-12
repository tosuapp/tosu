import { Rulesets } from '@tosu/common';

export type ModsLazer = Mod[] | { acronym: string }[];
export type IMods = ModsLazer | string | number;

export type CalculateMods = {
    checksum: string;
    number: number;
    name: string;
    array: ModsLazer;
    rate: number;
};

export const bitValues = [
    'NF',
    'EZ',
    'TD',
    'HD',
    'HR',
    'SD',
    'DT',
    'RX',
    'HT',
    'NC',
    'FL',
    'AT',
    'SO',
    'AP',
    'PF',
    '4K',
    '5K',
    '6K',
    '7K',
    '8K',
    'FI',
    'RD',
    'CN',
    'TG',
    '9K',
    '10K',
    '1K',
    '3K',
    '2K',
    'v2',
    'MR'
];

export type ModsAcronyms =
    | 'EZ'
    | 'NF'
    | 'HT'
    | 'DC'
    | 'HR'
    | 'SD'
    | 'PF'
    | 'DT'
    | 'NC'
    | 'HD'
    | 'FL'
    | 'BL'
    | 'ST'
    | 'AC'
    | 'TP'
    | 'DA'
    | 'CL'
    | 'RD'
    | '1K'
    | '2K'
    | '3K'
    | '4K'
    | '5K'
    | '6K'
    | '7K'
    | '8K'
    | '9K'
    | '10K'
    | 'MR'
    | 'AL'
    | 'SG'
    | 'AT'
    | 'CN'
    | 'RX'
    | 'AP'
    | 'SO'
    | 'TR'
    | 'WG'
    | 'SI'
    | 'GR'
    | 'DF'
    | 'WU'
    | 'WD'
    | 'TC'
    | 'BR'
    | 'AD'
    | 'MU'
    | 'NS'
    | 'MG'
    | 'RP'
    | 'AS'
    | 'FR'
    | 'BU'
    | 'SY'
    | 'DP'
    | 'TD'
    | 'SV2'
    | 'HO'
    | 'CS'
    | 'IN'
    | 'DS'
    | 'CO'
    | 'FI'
    | 'NR'
    | 'FF'
    | 'SW';

export const ModsOrder: {
    [key: string]: number;
} = {
    nf: 0,
    ez: 1,
    hd: 2,
    dt: 3,
    nc: 3,
    ht: 3,
    hr: 4,
    so: 5,
    sd: 5,
    pf: 5,
    fl: 6,
    td: 7
};

export const ModsCategories = {
    [Rulesets.osu]: {
        diffReductionCategory: ['EZ', 'NF', 'HT', 'DC'],
        diffIncreasingCategory: [
            'HR',
            'SD',
            'PF',
            'DT',
            'NC',
            'HD',
            'FL',
            'BL',
            'ST',
            'AC'
        ],
        automationCategory: ['AT', 'CN', 'RX', 'AP', 'SO'],
        conversionCategory: ['TP', 'DA', 'CL', 'RD', 'MR', 'AL', 'SG'],
        funCategory: [
            'TR',
            'WG',
            'SI',
            'GR',
            'DF',
            'WU',
            'WD',
            'TC',
            'BR',
            'AD',
            'MU',
            'NS',
            'MG',
            'RP',
            'AS',
            'FR',
            'BU',
            'SY',
            'DP'
        ],
        systemCategory: ['TD', 'SV2']
    },
    [Rulesets.taiko]: {
        diffReductionCategory: ['EZ', 'NF', 'HT', 'DC'],
        diffIncreasingCategory: [
            'HR',
            'SD',
            'PF',
            'DT',
            'NC',
            'HD',
            'FL',
            'AC'
        ],
        automationCategory: ['AT', 'CN', 'RX'],
        conversionCategory: ['RD', 'DA', 'CL', 'SW', 'SG', 'CS'],
        funCategory: ['WU', 'WD', 'MU', 'AS'],
        systemCategory: ['TD', 'SV2']
    },
    [Rulesets.fruits]: {
        diffReductionCategory: ['EZ', 'NF', 'HT', 'DC'],
        diffIncreasingCategory: [
            'HR',
            'SD',
            'PF',
            'DT',
            'NC',
            'HD',
            'FL',
            'AC'
        ],
        automationCategory: ['AT', 'CN', 'RX'],
        conversionCategory: ['DA', 'CL', 'MR'],
        funCategory: ['WU', 'WD', 'FF', 'MU', 'NS'],
        systemCategory: ['TD', 'SV2']
    },
    [Rulesets.mania]: {
        diffReductionCategory: ['EZ', 'NF', 'HT', 'DC', 'NR'],
        diffIncreasingCategory: [
            'HR',
            'SD',
            'PF',
            'DT',
            'NC',
            'FI',
            'HD',
            'CO',
            'FL',
            'AC'
        ],
        automationCategory: ['AT', 'CN'],
        conversionCategory: [
            'RD',
            'DS',
            'MR',
            'DA',
            'CL',
            'IN',
            'CS',
            'HO',
            '1K',
            '2K',
            '3K',
            '4K',
            '5K',
            '6K',
            '7K',
            '8K',
            '9K',
            '10K'
        ],
        funCategory: ['WU', 'WD', 'MU', 'AS'],
        systemCategory: ['TD', 'SV2']
    }
};

export enum OsuMods {
    Nomod = 0,
    NoFail = 1 << 0,
    Easy = 1 << 1,
    TouchDevice = 1 << 2,
    Hidden = 1 << 3,
    HardRock = 1 << 4,
    SuddenDeath = 1 << 5,
    DoubleTime = 1 << 6,
    Relax = 1 << 7,
    HalfTime = 1 << 8,
    Nightcore = 1 << 9,
    Flashlight = 1 << 10,
    Autoplay = 1 << 11,
    SpunOut = 1 << 12,
    Relax2 = 1 << 13,
    Perfect = 1 << 14,
    Key4 = 1 << 15,
    Key5 = 1 << 16,
    Key6 = 1 << 17,
    Key7 = 1 << 18,
    Key8 = 1 << 19,
    FadeIn = 1 << 20,
    Random = 1 << 21,
    Cinema = 1 << 22,
    Target = 1 << 23,
    Key9 = 1 << 24,
    Key10 = 1 << 25,
    Key1 = 1 << 26,
    Key3 = 1 << 27,
    Key2 = 1 << 28,
    LastMod = 1 << 29,
    keyMod = Key1 |
        Key2 |
        Key3 |
        Key4 |
        Key5 |
        Key6 |
        Key7 |
        Key8 |
        Key9 |
        Key10,
    KeyModUnranked = Key1 | Key2 | Key3 | Key9 | Key10,
    FreeModAllowed = NoFail |
        Easy |
        Hidden |
        HardRock |
        SuddenDeath |
        Flashlight |
        FadeIn |
        Relax |
        Relax2 |
        SpunOut |
        keyMod,
    ScoreIncreaseMods = Hidden | HardRock | DoubleTime | Flashlight | FadeIn
}

export interface EZ {
    acronym: 'EZ';
    settings?: {
        retries: number;
    };
}

export interface NF {
    acronym: 'NF';
}

export interface HT {
    acronym: 'HT';
    settings?: {
        speed_change?: number;
        adjust_pitch?: boolean;
    };
}

export interface DC {
    acronym: 'DC';
    settings?: {
        speed_change: number;
    };
}

export interface HR {
    acronym: 'HR';
}

export interface SD {
    acronym: 'SD';
    settings?: {
        restart: boolean;
    };
}

export interface PF {
    acronym: 'PF';
    settings?: {
        restart: boolean;
    };
}

export interface DT {
    acronym: 'DT';
    settings?: {
        speed_change?: number;
        adjust_pitch?: boolean;
    };
}

export interface NC {
    acronym: 'NC';
    settings?: {
        speed_change: number;
    };
}

export interface HD {
    acronym: 'HD';
    settings?: {
        only_fade_approach_circles: boolean;
    };
}

export interface FL {
    acronym: 'FL';
    settings?: {
        follow_delay?: number;
        size_multiplier?: number;
        combo_based_size?: boolean;
    };
}

export interface BL {
    acronym: 'BL';
}

export interface ST {
    acronym: 'ST';
}

export interface AC {
    acronym: 'AC';
    settings?: {
        minimum_accuracy?: number;
        accuracy_judge_mode?: string;
        restart?: boolean;
    };
}

export interface TP {
    acronym: 'TP';
    settings?: {
        seed?: number;
        metronome?: boolean;
    };
}

export interface DA {
    acronym: 'DA';
    settings?: {
        circle_size?: number;
        approach_rate?: number;
        drain_rate?: number;
        overall_difficulty?: number;
        extended_limits?: boolean;
        hard_rock_offsets?: boolean; // spicy patterns in catch
    };
}

export interface CL {
    acronym: 'CL';
    settings?: {
        no_slider_head_accuracy?: boolean;
        classic_note_lock?: boolean;
        always_play_tail_sample?: boolean;
        fade_hit_circle_early?: boolean;
        classic_health?: boolean;
    };
}

export interface RD {
    acronym: 'RD';
    settings?: {
        angle_sharpness?: number;
        seed?: number;
    };
}

export interface ManiaKeys {
    acronym:
        | '1K'
        | '2K'
        | '3K'
        | '4K'
        | '5K'
        | '6K'
        | '7K'
        | '8K'
        | '9K'
        | '10K';
}

export interface MR {
    acronym: 'MR';
    settings?: {
        reflection: string;
    };
}

export interface AL {
    acronym: 'AL';
}

export interface SG {
    acronym: 'SG';
}

export interface AT {
    acronym: 'AT';
}

export interface CN {
    acronym: 'CN';
}

export interface RX {
    acronym: 'RX';
}

export interface AP {
    acronym: 'AP';
}

export interface SO {
    acronym: 'SO';
}

export interface TR {
    acronym: 'TR';
}

export interface WG {
    acronym: 'WG';
    settings?: {
        strength: number;
    };
}

export interface SI {
    acronym: 'SI';
}

export interface GR {
    acronym: 'GR';
    settings?: {
        start_scale: number;
    };
}

export interface DF {
    acronym: 'DF';
    settings?: {
        start_scale: number;
    };
}

export interface WU {
    acronym: 'WU';
    settings?: {
        initial_rate?: number;
        final_rate?: number;
        adjust_pitch?: boolean;
    };
}

export interface WD {
    acronym: 'WD';
    settings?: {
        initial_rate?: number;
        final_rate?: number;
        adjust_pitch?: boolean;
    };
}

export interface TC {
    acronym: 'TC';
}

export interface BR {
    acronym: 'BR';
    settings?: {
        spin_speed?: number;
        direction?: number;
    };
}

export interface AD {
    acronym: 'AD';
    settings?: {
        scale?: number;
        style?: number;
    };
}

export interface MU {
    acronym: 'MU';
    settings?: {
        inverse_muting?: boolean;
        enable_metronome?: boolean;
        mute_combo_count?: number;
        affects_hit_sounds?: boolean;
    };
}

export interface NS {
    acronym: 'NS';
    settings?: {
        hidden_combo_count: number;
    };
}

export interface MG {
    acronym: 'MG';
    settings?: {
        attraction_strength: number;
    };
}

export interface RP {
    acronym: 'RP';
    settings?: {
        repulsion_strength: number;
    };
}

export interface AS {
    acronym: 'AS';
    settings?: {
        initial_rate?: number;
        adjust_pitch?: boolean;
    };
}

export interface FR {
    acronym: 'FR';
}

export interface BU {
    acronym: 'BU';
}

export interface SY {
    acronym: 'SY';
}

export interface DP {
    acronym: 'DP';
    settings?: {
        max_depth?: number;
        show_approach_circles?: boolean;
    };
}

export interface TD {
    acronym: 'TD';
}

export interface SV2 {
    acronym: 'SV2';
}

export interface HO {
    acronym: 'HO';
}

export interface CS {
    acronym: 'CS';
}

export interface IN {
    acronym: 'IN';
}

export interface DS {
    acronym: 'DS';
}

export interface CO {
    acronym: 'CO';
    settings?: {
        coverage?: number;
        direction?: number;
    };
}

export interface FI {
    acronym: 'FI';
}

export interface NR {
    acronym: 'NR';
}

export interface FF {
    acronym: 'FF';
}

export interface SW {
    acronym: 'SW';
}

export type Mod =
    | EZ
    | NF
    | HT
    | DC
    | HR
    | SD
    | PF
    | DT
    | NC
    | HD
    | FL
    | BL
    | ST
    | AC
    | TP
    | DA
    | CL
    | RD
    | MR
    | AL
    | SG
    | AT
    | CN
    | RX
    | AP
    | SO
    | TR
    | WG
    | SI
    | GR
    | DF
    | WU
    | WD
    | TC
    | BR
    | AD
    | MU
    | NS
    | MG
    | RP
    | AS
    | FR
    | BU
    | SY
    | DP
    | TD
    | SV2
    | ManiaKeys
    | HO
    | CS
    | IN
    | DS
    | CO
    | FI
    | NR
    | FF
    | SW;
