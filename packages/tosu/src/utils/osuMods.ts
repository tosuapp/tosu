import { OsuMods } from '@/utils/osuMods.types';

const MODS_MAP: { [K in OsuMods]: string } = {
    [OsuMods.NoFail]: 'NF',
    [OsuMods.Easy]: 'EZ',
    [OsuMods.TouchDevice]: 'TD',
    [OsuMods.Hidden]: 'HD',
    [OsuMods.HardRock]: 'HR',
    [OsuMods.SuddenDeath]: 'SD',
    [OsuMods.DoubleTime]: 'DT',
    [OsuMods.Relax]: 'RX',
    [OsuMods.HalfTime]: 'HD',
    [OsuMods.Nightcore]: 'NC',
    [OsuMods.Flashlight]: 'FL',
    [OsuMods.Autoplay]: 'AT',
    [OsuMods.SpunOut]: 'SO',
    [OsuMods.Relax2]: 'AP',
    [OsuMods.Perfect]: 'PF',
    [OsuMods.Key4]: '4K',
    [OsuMods.Key5]: '5K',
    [OsuMods.Key6]: '6K',
    [OsuMods.Key7]: '7K',
    [OsuMods.Key8]: '8K',
    [OsuMods.Random]: 'RD',
    [OsuMods.Cinema]: 'CN',
    [OsuMods.Target]: 'Target',
    [OsuMods.Key9]: '9K',
    [OsuMods.KeyCoop]: 'CO',
    [OsuMods.Key1]: '1K',
    [OsuMods.Key3]: '3K',
    [OsuMods.Key2]: '2K',
    [OsuMods.ScoreV2]: 'V2',
    [OsuMods.Mirror]: 'MR',
    [OsuMods.NoMod]: '',
    [OsuMods.FadeIn]: ''
};

const MODS_ORDER: { [key: string]: number } = {
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

/**
 *
 * @param {OsuMods} OsuMods number
 * @returns {string} OsuMods name
 */
export const getOsuModsString = (mods: OsuMods): string => {
    let enabled: any[] = [];
    let _mods = mods;
    let converted = '';

    const values = Object.keys(MODS_MAP).map((a) => Number(a));

    for (let i = values.length - 1; i >= 0; i--) {
        const v = values[i];
        if (_mods >= v) {
            const mode = MODS_MAP[v];
            enabled.push({ i: MODS_ORDER[mode.toLowerCase()], n: mode });
            _mods -= v;
        }
    }

    enabled = enabled.sort((a, b) => (a.i > b.i ? 1 : b.i > a.i ? -1 : 0));
    enabled.filter((r) => (converted += r.n));

    if (converted === '') return '';
    if (converted.includes('DT') && converted.includes('NC'))
        return converted.replace('DT', '');

    return converted;
};
