import { wLogger } from "@/logger";
import { DataRepo } from "@/Services/repo";

export class MenuData {
    services: DataRepo

    Status: number = 0;
    MenuGameMode: number = 0;
    Plays: number = 0;
    Artist: string = "";
    ArtistOriginal: string = "";
    Title: string = "";
    TitleOriginal: string = "";
    AR: number = 0.00;
    CS: number = 0.00;
    HP: number = 0.00;
    OD: number = 0.00;
    AudioFilename: string = ""; 
    BackgroundFilename: string = "";
    Folder: string = "";
    Creator: string = "";
    Name: string = "";
    Path: string = "";
    Difficulty: string = "";
    MapID: number = 0;
    SetID: number = 0;
    RankedStatus: number = 0;
    MD5: string = "";
    ObjectCount: number = 0;
    MP3Length: number = 0;

    previousMD5: string = "";

    constructor(services: DataRepo) {
        this.services = services;
    }

    async updateState() {
        const { process, bases } = this.services.getServices(["process", "bases"]);

        const {
            baseAddr,
        } = bases.bases

        const beatmapAddr = process.readPointer(baseAddr - 0xC)
        //  [[Beatmap] + 0x6C]
        this.MD5 = process.readSharpString(process.readInt(
            beatmapAddr + 0x6C
        ))
        //  [[Beatmap] + 0x94]
        this.Path = process.readSharpString(process.readInt(
            beatmapAddr + 0x94
        ))

        if (this.MD5 === this.previousMD5 || !this.Path.endsWith(".osu")) {
            wLogger.debug("State: MenuData not needed to be updated")
            return;
        }

        // [Base - 0x33]
        this.MenuGameMode = process.readPointer(baseAddr - 0x33)
        // [Base - 0x33] + 0xC
        this.Plays = process.readInt(process.readInt(baseAddr - 0x33) + 0xC)
        // [[Beatmap] + 0x18]
        this.Artist = process.readSharpString(process.readInt(
            beatmapAddr + 0x18
        ))
        // // [[Beatmap] + 0x1C]
        this.ArtistOriginal = process.readSharpString(process.readInt(
            beatmapAddr + 0x1C
        ))
        // // [[Beatmap] + 0x24]
        this.Title = process.readSharpString(process.readInt(
            beatmapAddr + 0x24
        ))
        // // [[Beatmap] + 0x28]
        this.TitleOriginal = process.readSharpString(process.readInt(
            beatmapAddr + 0x28
        ))

        //  [Beatmap] + 0x2C
        this.AR = process.readFloat(beatmapAddr + 0x2C)
        //  [Beatmap] + 0x30
        this.CS = process.readFloat(beatmapAddr + 0x30)
        //  [Beatmap] + 0x34
        this.HP = process.readFloat(beatmapAddr + 0x34)
        //  [Beatmap] + 0x38
        this.OD = process.readFloat(beatmapAddr + 0x38)
        //  [[Beatmap] + 0x64]
        this.AudioFilename = process.readSharpString(process.readInt(
            beatmapAddr + 0x64
        ))
        // //  [[Beatmap] + 0x68]
        this.BackgroundFilename = process.readSharpString(process.readInt(
            beatmapAddr + 0x68
        ))
        //  [[Beatmap] + 0x78]
        this.Folder = process.readSharpString(process.readInt(
            beatmapAddr + 0x78
        ))
        //  [[Beatmap] + 0x7C]
        this.Creator = process.readSharpString(process.readInt(
            beatmapAddr + 0x7C
        ))
        //  [[Beatmap] + 0x80]
        this.Name = process.readSharpString(process.readInt(
            beatmapAddr + 0x80
        ))
        //  [[Beatmap] + 0xB0]
        this.Difficulty = process.readSharpString(process.readInt(
            beatmapAddr + 0xB0
        ))
        //  [Beatmap] + 0xCC
        this.MapID = process.readInt(beatmapAddr + 0xCC)
        //  [Beatmap] + 0xD0
        this.SetID = process.readInt(beatmapAddr + 0xD0)
        // unknown, unsubmitted, pending/wip/graveyard, unused, ranked, approved, qualified
        //  [Beatmap] + 0x130
        this.RankedStatus = process.readInt(beatmapAddr + 0x130)
        //  [Beatmap] + 0xFC
        this.ObjectCount = process.readInt(beatmapAddr + 0xFC)
        

        wLogger.debug("State: MenuData updated")
        this.previousMD5 = this.MD5;
    }

    updateMP3Length() {
        const { process, bases } = this.services.getServices(["process", "bases"]);

        // [[GetAudioLength + 0x7] + 0x4]
        this.MP3Length = Math.round(process.readDouble(process.readPointer(bases.getBase("getAudioLengthAddr") + 0x7) + 0x4));
    }
}