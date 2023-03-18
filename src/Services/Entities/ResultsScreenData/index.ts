// PlayerName string  `mem:"[[Ruleset + 0x38] + 0x28]"`
// ModsXor1   int32   `mem:"[[Ruleset + 0x38] + 0x1C] + 0xC"`
// ModsXor2   int32   `mem:"[[Ruleset + 0x38] + 0x1C] + 0x8"`
// Mode       int32   `mem:"[Ruleset + 0x38] + 0x64"`
// MaxCombo   int16   `mem:"[Ruleset + 0x38] + 0x68"`
// Score      int32   `mem:"[Ruleset + 0x38] + 0x78"`
// Hit100     int16   `mem:"[Ruleset + 0x38] + 0x88"`
// Hit300     int16   `mem:"[Ruleset + 0x38] + 0x8A"`
// Hit50      int16   `mem:"[Ruleset + 0x38] + 0x8C"`
// HitGeki    int16   `mem:"[Ruleset + 0x38] + 0x8E"`
// HitKatu    int16   `mem:"[Ruleset + 0x38] + 0x90"`
// HitMiss    int16   `mem:"[Ruleset + 0x38] + 0x92"`
// Accuracy   float64 `mem:"[Ruleset + 0x48] + 0xC"`

import { DataRepo } from "@/Services/repo";
import { OsuMods } from "@/Utils/osuMods.types";

export class ResultsScreenData {
    services: DataRepo

    PlayerName: string;
    Mods: OsuMods;
    Mode: number;
    MaxCombo: number;
    Score: number;
    Hit100: number;
    Hit300: number;
    Hit50: number;
    HitGeki: number;
    HitKatu: number;
    HitMiss: number;

    constructor(services: DataRepo) {
        this.services = services;
    }

    async updateState() {
        const { process, bases, allTimesData } = this.services.getServices(["process", "bases", "allTimesData"]);
        if (process === null) {
            throw new Error("Process not found")
        }
        if (bases === null) {
            throw new Error("Bases repo not found")
        }
        if (allTimesData === null) {
            throw new Error("AllTimesData not found")
        }

        const {
            rulesetsAddr
        } = bases.bases

        const rulesetAddr = process.readInt(process.readInt(rulesetsAddr - 0xB) + 0x4)

        const resultScreenBase = process.readInt(rulesetAddr + 0x38)

        // PlayerName string  `mem:"[[Ruleset + 0x38] + 0x28]"`
        this.PlayerName = process.readSharpString(process.readInt(resultScreenBase + 0x28))
        // ModsXor1   int32   `mem:"[[Ruleset + 0x38] + 0x1C] + 0xC"` ^ ModsXor2   int32   `mem:"[[Ruleset + 0x38] + 0x1C] + 0x8"`
        this.Mods = process.readInt(process.readInt(resultScreenBase + 0x1C) + 0xC) ^ process.readInt(process.readInt(resultScreenBase + 0x1C) + 0x8)
        // Mode       int32   `mem:"[Ruleset + 0x38] + 0x64"`
        this.Mode = process.readInt(resultScreenBase + 0x64)
        // MaxCombo   int16   `mem:"[Ruleset + 0x38] + 0x68"`
        this.MaxCombo = process.readShort(resultScreenBase + 0x68)
        // Score      int32   `mem:"[Ruleset + 0x38] + 0x78"`
        this.Score = process.readInt(resultScreenBase + 0x78)
        // Hit100     int16   `mem:"[Ruleset + 0x38] + 0x88"`
        this.Hit100 = process.readShort(resultScreenBase + 0x88)
        // Hit300     int16   `mem:"[Ruleset + 0x38] + 0x8A"`
        this.Hit300 = process.readShort(resultScreenBase + 0x8A)
        // Hit50      int16   `mem:"[Ruleset + 0x38] + 0x8C"`
        this.Hit50 = process.readShort(resultScreenBase + 0x8C)
        // HitGeki    int16   `mem:"[Ruleset + 0x38] + 0x8E"`
        this.HitGeki = process.readShort(resultScreenBase + 0x8E)
        // HitKatu    int16   `mem:"[Ruleset + 0x38] + 0x90"`
        this.HitKatu = process.readShort(resultScreenBase + 0x90)
        // HitMiss    int16   `mem:"[Ruleset + 0x38] + 0x92"`
        this.HitMiss = process.readShort(resultScreenBase + 0x92)
    }
}