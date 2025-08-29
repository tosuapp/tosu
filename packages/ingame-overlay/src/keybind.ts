import type { Key } from '@asdf-overlay/core';
import type { InputState } from '@asdf-overlay/core/input';
import { mapKeycode } from '@asdf-overlay/electron/input/conv';

export class Keybind {
    private state = 0xffffffff;

    /**
     * @param keys array of dom keys up to 32 keys
     */
    constructor(private readonly keys: string[]) {
        if (keys.length > 32) {
            throw new Error('Keybind keys cannot be more than 32 keys');
        }
    }

    update(key: Key, state: InputState): boolean {
        const index = this.keys.findIndex((keybindKey) => {
            return mapKeycode(key.code) === keybindKey;
        });
        if (index === -1) {
            return false;
        }

        if (state === 'Pressed') {
            // unset index bit
            this.state &= ~(1 << index);

            // check if all settable bits are 0 (all keybind keys are pressed)
            return !(this.state << (32 - this.keys.length));
        } else {
            // set index bit
            this.state |= 1 << index;
            return false;
        }
    }
}
