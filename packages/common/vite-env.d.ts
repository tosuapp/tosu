/// <reference types="vite/client" />

interface ViteTypeOptions {
    strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
    /**
     * Current tosu version
     */
    readonly TOSU_VERSION: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
