import { DataRepo } from "@/Services/repo";

export class BeatmapData {
    services: DataRepo

    constructor(services: DataRepo) {
        this.services = services;
    }
}