declare module '@jellybrick/wql-process-monitor' {
    import Emittery from 'emittery';

    type Options = {
        /**
         * Subscribe to the creation event
         * @default true
         */
        creation?: boolean;
        /**
         * Subscribe to the deletion event
         * @default true
         */
        deletion?: boolean;
        /**
         * Exclude events originating from System32 and SysWOW64 Windows folder as well as integrated OneDrive FileCoAuth.exe.
         * e.g. cmd.exe, powershell.exe, svchost.exe, RuntimeBroker.exe, and others Windows processes.
         *
         * NB: Using this will prevent you to catch any elevated process event.
         * Unless you are also elevated. This is a permission issue (See #2).
         * You can implement your own filter on top of the event emitter result instead.
         * @default false
         */
        filterWindowsNoise?: boolean;
        /**
         * Exclude events originating from Program Files, Program Files (x86), AppData local and AppData Roaming.
         *
         * NB: Using this will prevent you to catch any elevated process event.
         * Unless you are also elevated. This is a permission issue (See #2).
         * You can implement your own filter on top of the event emitter result instead.
         * @default false
         */
        filterUsualProgramLocations?: boolean;
        /**
         * Custom list of process to exclude.
         * eg: ["firefox.exe","chrome.exe",...]
         *
         * NB: There are limits to the number of AND and OR keywords that can be used in WQL queries. Large numbers of WQL keywords used in a complex query can cause WMI to return the WBEM_E_QUOTA_VIOLATION error code as an HRESULT value. The limit of WQL keywords depends on how complex the query is
         * cf: https://docs.microsoft.com/en-us/windows/win32/wmisdk/querying-with-wql
         * If you have a huge list consider implementing your own filter on top of the event emitter result instead.
         * @default []
         */
        filter?: string[];
        /**
         * Use `filter` option as a whitelist.
         * `filterWindowsNoise` / `filterUsualProgramLocations` can still be used.
         * Previously mentioned limitation(s) still apply.
         *
         * @default false
         */
        whitelist?: boolean;
    };

    interface Promises {
        /**
         * Subscribe to process creation and deletion events.
         * @param option
         * @returns {Promise<Emittery<{creation: [string, string, string?], deletion: [string, string]}>>}
         */
        subscribe(option?: Options): Promise<
            Emittery<{
                /**
                 * Process creation event
                 * @param {string} processName process name
                 * @param {string} processId process identifier (Process id should be number...)
                 * @param {string} filepath file location path (if available*)
                 */
                creation: [string, string, string?];
                /**
                 * Process deletion event
                 * @param {string} processName process name
                 * @param {string} processId process identifier
                 */
                deletion: [string, string];
            }>
        >;

        /**
         * @deprecated Since version >= 2.0 this is automatically done for you when you call subscribe(). Method was merely kept for backward compatibility.
         * @returns {Promise<void>}
         */
        createEventSink(): Promise<void>;

        /**
         * Properly close the event sink.
         * There is no 'un-subscribe' thing to do prior to closing the sink. Just close it.
         * It is recommended to properly close the event sink when you are done if you intend to re-open it later on.
         * Most of the time you wouldn't have to bother with this, but it's here in case you need it.
         * @returns {Promise<void>}
         */
        closeEventSink(): Promise<void>;
    }

    interface WQL {
        /**
         * Subscribe to process creation and deletion events.
         * @param option
         * @returns {Emittery<{creation: [string, string, string?], deletion: [string, string]}>}
         */
        subscribe(option?: Options): Emittery<{
            /**
             * Process creation event
             * @param {string} processName process name
             * @param {string} processId process identifier (Process id should be number...)
             * @param {string} filepath file location path (if available*)
             */
            creation: [string, string, string?];
            /**
             * Process deletion event
             * @param {string} processName process name
             * @param {string} processId process identifier
             */
            deletion: [string, string];
        }>;

        /**
         * @deprecated Since version >= 2.0 this is automatically done for you when you call subscribe(). Method was merely kept for backward compatibility.
         * @returns {void}
         */
        createEventSink(): void;

        /**
         * Properly close the event sink.
         * There is no 'un-subscribe' thing to do prior to closing the sink. Just close it.
         * It is recommended to properly close the event sink when you are done if you intend to re-open it later on.
         * Most of the time you wouldn't have to bother with this, but it's here in case you need it.
         * @returns {void}
         */
        closeEventSink(): void;
    }

    /**
     * WQL Process Monitor
     *
     * Usage of promise instead of sync is recommended so that you will not block Node's event loop.
     */
    const wql: WQL;
    /**
     * Promisified version of wql
     */
    export const promises: Promises;

    export default wql;
}
