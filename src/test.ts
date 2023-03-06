import { Process } from "./Memory/process";

const processName = "osu!.exe";

const patterns = {
    Base: "F8 01 74 04 83 65",                                        //-0xC
	InMenuMods: "C8 FF 00 00 00 00 00 81 0D 00 00 00 00 00 08 00 00", //+0x9
	PlayTime: "5E 5F 5D C3 A1 ?? ?? ?? ?? 89 ?? 04",                  //+0x5
	PlayContainer: "85 C9 74 1F 8D 55 F0 8B 01",
	LeaderBoard: "A1 ?? ?? ?? ?? 8B 50 04 8B 0D",                     //+0x1
	SongsFolder: "?? ?? 67 ?? 2F 00 28 00",
	ChatChecker: "0A D7 23 3C 00 00 01 01"                            //-0x20 (value)
}

// [Base - 0x33] + 0xC
// [Base - 0x33] + 0xC : string => readSharpString(readInt(Base - 0x33) + 0xC)

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const readMenu = async (process: Process) => {
    const statusAddr = process.scanSync("48 83 F8 04 73 1E")
    const baseAddr = process.scanSync(patterns.Base);
    console.log(baseAddr.toString(16));
    const menuModsAddr = process.scanSync(patterns.InMenuMods);
    // [Base - 0xC]
    const beatmapAddr = process.readInt(baseAddr - 0xC)
    console.log(beatmapAddr.toString(16), "<<< beatmap addr")

    return {
        // [Status - 0x4]
        Status: process.readPointer(statusAddr - 0x4),
        // [Base - 0x33]
        MenuGameMode: process.readPointer(baseAddr - 0x33),
        // [Base - 0x33] + 0xC
        Plays: process.readInt(process.readInt(baseAddr - 0x33) + 0xC),
        // [[Beatmap] + 0x18]
        Artist: process.readSharpString(process.readInt(
            process.readInt(
                beatmapAddr
             ) + 0x18
        )),
        // [[Beatmap] + 0x1C]
        ArtistOriginal: process.readSharpString(process.readInt(
            process.readInt(
                beatmapAddr
             ) + 0x1C
        )),
        // [[Beatmap] + 0x24]
        Title: process.readSharpString(process.readInt(
            process.readInt(
                beatmapAddr
             ) + 0x24
        )),
        // [[Beatmap] + 0x28]
        TitleOriginal: process.readSharpString(process.readInt(
            process.readInt(
                beatmapAddr
            ) + 0x28
        )),

        //  [Beatmap] + 0x2C
        AR: process.readFloat(process.readInt(beatmapAddr) + 0x2C),
        //  [Beatmap] + 0x30
        CS: process.readFloat(process.readInt(beatmapAddr) + 0x30),
        //  [Beatmap] + 0x34
        HP: process.readFloat(process.readInt(beatmapAddr) + 0x34),
        //  [Beatmap] + 0x38
        OD: process.readFloat(process.readInt(beatmapAddr) + 0x38),
        //  [[Beatmap] + 0x64]
        AudioFilename: process.readSharpString(process.readInt(
            process.readInt(
                beatmapAddr
            ) + 0x64
        )),
        //  [[Beatmap] + 0x68]
        BackgroundFilename: process.readSharpString(process.readInt(
            process.readInt(
                beatmapAddr
            ) + 0x68
        )),
        //  [[Beatmap] + 0x78]
        Folder: process.readSharpString(process.readInt(
            process.readInt(
                beatmapAddr
            ) + 0x78
        )),
        //  [[Beatmap] + 0x7C]
        Creator: process.readSharpString(process.readInt(
            process.readInt(
                beatmapAddr
            ) + 0x7C
        )),
        //  [[Beatmap] + 0x80]
        Name: process.readSharpString(process.readInt(
            process.readInt(
                beatmapAddr
            ) + 0x80
        )),
        //  [[Beatmap] + 0x94]
        Path: process.readSharpString(process.readInt(
            process.readInt(
                beatmapAddr
            ) + 0x94
        )),
        //  [[Beatmap] + 0xB0]
        Difficulty: process.readSharpString(process.readInt(
            process.readInt(
                beatmapAddr
            ) + 0xB0
        )),
        //  [Beatmap] + 0xCC
        MapID: process.readInt(process.readInt(beatmapAddr) + 0xCC),
        //  [Beatmap] + 0xD0
        SetID: process.readInt(process.readInt(beatmapAddr) + 0xD0),
        //  // unknown, unsubmitted, pending/wip/graveyard, unused, ranked, approved, qualified
        //  [Beatmap] + 0x130
        RankedStatus: process.readInt(process.readInt(beatmapAddr) + 0x130),
        //  [[Beatmap] + 0x6C]
        MD5: process.readSharpString(process.readInt(
            process.readInt(
                beatmapAddr
            ) + 0x6C
        )),
        //  [Beatmap] + 0xFC
        ObjectCount: process.readInt(process.readInt(beatmapAddr) + 0xFC)
    }
}

const readAllTimesData = async (process: Process) => {
    return {
        // // [PlayTime + 0x5]
        // PlayTime: process.readInt(process.readInt(playTimeBase + 0x5)),
        // // [MenuMods + 0x9]
        // MenuMods: process.readInt(process.readInt(menuModsBase + 0x9)),
        // // ChatChecker - 0x20
        // ChatStatus: process.readByte(chatCheckerBase - 0x20),
        // // [[[SkinData + 4] + 0] + 68]
        // SkinFolder: process.readSharpString(
        //     process.readInt(
        //         process.readPointer(
        //             skinDataBase + 4
        //         ) + 68
        //     )
        // ),
        // // [[SettingsClass + 0x8] + 0x4] + 0xC
        // ShowInterface: process.readByte(process.readInt(process.readInt(settingsClass + 0x8) + 0x4) + 0xC)
    }
}

(async () => {
    const cherryProcess = new Process(Process.findProcess("osu!.exe"));

    const settingsClass = cherryProcess.scanSync("83 E0 20 85 C0 7E 2F")

    // const osuStatus = readPointer(processObject.handle, osuStatusFunc - 0x4, memoryjs.UINT32, memoryjs.UINT32);

    while (true) {
        const menuData = await readMenu(cherryProcess)
        console.log(menuData)
        const songsFolder = cherryProcess.readSharpString(
            cherryProcess.readInt(
                cherryProcess.readInt(
                    cherryProcess.readInt(settingsClass + 0x8) + 0xB8
                ) + 0x4
            )
        )

        const allTimesData = await readAllTimesData(cherryProcess)
        console.log(allTimesData)

        // switch (menuData.Status) {
        //     case 0:
        //         await readBeatmapData()
        //         break;
        //     case 1:
        //         await readBeatmapData()
        //         break;
        //     case 2:
        //         break;
        //     case 7:
        //         await readBeatmapData()
        //         break;
        //     default:
        //         await readBeatmapData();
        //         // TODO: reset gameplayData
        //         break;
        // }
        await sleep(300);
    }
    // const osuStatus = readPointer(processObject.handle, osuStatusFunc - 0x4, memoryjs.UINT32);

/*
func (staticAddresses) Beatmap() string {
	return "[Base - 0xC]"
}

func (PreSongSelectAddresses) Settings() string {
	return "[SettingsClass + 0x8]"
}

func (staticAddresses) PlayContainer() string {
	return "[[[[PlayContainerBase + 0x7] + 0x4] + 0xC4] + 0x4]"
}

func (staticAddresses) Leaderboard() string {
	return "[[[LeaderboardBase+0x1] + 0x4] + 0x74] + 0x24"
}

type menuD struct {
	PreSongSelectData
	//SearchText         string  `mem:"[Ruleset + 0xCC]"`
	//GroupingType       int32   `mem:"Ruleset + 0x104"`
	MenuGameMode       int32   `mem:"[Base - 0x33]"`
	Plays              int32   `mem:"[Base - 0x33] + 0xC"`
	Artist             string  `mem:"[[Beatmap] + 0x18]"`
	ArtistOriginal     string  `mem:"[[Beatmap] + 0x1C]"`
	Title              string  `mem:"[[Beatmap] + 0x24]"`
	TitleOriginal      string  `mem:"[[Beatmap] + 0x28]"`
	AR                 float32 `mem:"[Beatmap] + 0x2C"`
	CS                 float32 `mem:"[Beatmap] + 0x30"`
	HP                 float32 `mem:"[Beatmap] + 0x34"`
	OD                 float32 `mem:"[Beatmap] + 0x38"`
	StarRatingStruct   uint32  `mem:"[Beatmap] + 0x8C"`
	AudioFilename      string  `mem:"[[Beatmap] + 0x64]"`
	BackgroundFilename string  `mem:"[[Beatmap] + 0x68]"`
	Folder             string  `mem:"[[Beatmap] + 0x78]"`
	Creator            string  `mem:"[[Beatmap] + 0x7C]"`
	Name               string  `mem:"[[Beatmap] + 0x80]"`
	Path               string  `mem:"[[Beatmap] + 0x94]"`
	Difficulty         string  `mem:"[[Beatmap] + 0xB0]"`
	MapID              int32   `mem:"[Beatmap] + 0xCC"`
	SetID              int32   `mem:"[Beatmap] + 0xD0"`
	RankedStatus       int32   `mem:"[Beatmap] + 0x130"` // unknown, unsubmitted, pending/wip/graveyard, unused, ranked, approved, qualified
	MD5                string  `mem:"[[Beatmap] + 0x6C]"`
	ObjectCount        int32   `mem:"[Beatmap] + 0xFC"`
*/


    // const osuStatus = memoryjs.readBuffer(processObject.handle, osuStatusAddr2, 4);
    // const osuSettingsClassAddr = memoryjs.readMemory(processObject.handle, "83 E0 20 85 C0 7E 2F", memoryjs.INT64);

    // const preSongSelectShit = memoryjs.readMemory(processObject.handle, osuStatus - 0x4, memoryjs.UINT32);

    // const osuStatusAddr = memoryjs.findPattern(processObject.handle, "48 83 F8 04 73 1E", memoryjs.NORMAL, 0x0);
    // console.log(osuStatusAddr);
    // const osuStatus = memoryjs.readMemory(processObject.handle, osuStatusAddr - 0x4, memoryjs.)
    // osuStatus, err := proc.ReadUint32Ptr(uintptr(osuStaticAddresses.Status-0x4), 0x0)    
})()
