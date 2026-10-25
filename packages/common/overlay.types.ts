export type OverlayStatus = 'installed' | 'upgradable' | 'installable';

export interface OverlayAsset {
    type: 'image' | 'video' | string;
    url: string;
}

export interface RawRepositoryOverlay {
    id: string;
    name: string;
    version: string;
    author: string;
    authorlinks?: string[];
    compatiblewith?: string[];
    usecase?: string[];
    resolution?: string[];
    notes?: string;
    _settings?: boolean;
    assets?: OverlayAsset[];
    downloadLink?: string;
}

export interface OverlayAuthor {
    name: string;
    links: string[];
}

export interface OverlayResolution {
    width: number | null;
    height: number | null;
}

export interface Overlay {
    id: string;
    name: string;
    version: string;
    status: OverlayStatus;
    author: OverlayAuthor;
    url: string;
    downloadUrl?: string;
    resolution: OverlayResolution;
    usecase: string[];
    compatible: string[];
    hasSettings: boolean;
    notes: string;
    assets: OverlayAsset[];
}
