import { Cursor } from 'asdf-overlay-node';
import { CursorInput, KeyboardInput } from 'asdf-overlay-node/input';
import {
    KeyboardInputEvent,
    MouseInputEvent,
    MouseWheelInputEvent
} from 'electron';

export function toMouseEvent(
    input: CursorInput
): MouseInputEvent | MouseWheelInputEvent | null {
    switch (input.kind) {
        case 'Enter':
            return {
                type: 'mouseEnter',
                x: input.x,
                y: input.y
            };

        case 'Leave':
            return {
                type: 'mouseLeave',
                x: input.x,
                y: input.y
            };

        case 'Move':
            return {
                type: 'mouseMove',
                x: input.x,
                y: input.y
            };

        case 'Scroll':
            if (input.axis === 'Y') {
                return {
                    type: 'mouseWheel',
                    deltaY: input.delta,
                    x: input.x,
                    y: input.y
                };
            } else {
                return {
                    type: 'mouseWheel',
                    deltaX: input.delta,
                    x: input.x,
                    y: input.y
                };
            }

        case 'Action': {
            let button: MouseInputEvent['button'];
            switch (input.action) {
                case 'Left': {
                    button = 'left';
                    break;
                }
                case 'Middle': {
                    button = 'middle';
                    break;
                }
                case 'Right': {
                    button = 'right';
                    break;
                }
                default:
                    return null;
            }

            return {
                type: input.state === 'Pressed' ? 'mouseDown' : 'mouseUp',
                button,
                clickCount: 1,
                x: input.x,
                y: input.y
            };
        }
    }
}

export function toKeyboardEvent(
    input: KeyboardInput
): KeyboardInputEvent | null {
    switch (input.kind) {
        case 'Key': {
            const keyCode = KEYS[input.key.code];
            if (!keyCode) {
                return null;
            }

            return {
                type: input.state === 'Pressed' ? 'keyDown' : 'keyUp',
                keyCode
            };
        }

        case 'Char':
            return {
                type: 'char',
                keyCode: input.ch
            };
    }
}

// https://www.electronjs.org/docs/latest/api/web-contents
// https://developer.mozilla.org/ko/docs/Web/CSS/cursor
export function toCursor(cursor: string): Cursor | undefined {
    switch (cursor) {
        case 'pointer':
            return Cursor.Default;
        case 'crosshair':
            return Cursor.Crosshair;
        case 'hand':
            return Cursor.Pointer;
        case 'text':
            return Cursor.Text;
        case 'wait':
            return Cursor.Wait;
        case 'help':
            return Cursor.Help;
        case 'e-resize':
        case 'w-resize':
        case 'ew-resize':
            return Cursor.EastWestResize;
        case 'n-resize':
        case 's-resize':
        case 'ns-resize':
            return Cursor.NorthSouthResize;
        case 'ne-resize':
        case 'sw-resize':
        case 'nesw-resize':
            return Cursor.NorthEastSouthWestResize;
        case 'nw-resize':
        case 'se-resize':
        case 'nwse-resize':
            return Cursor.NorthWestSouthEastResize;
        case 'col-resize':
            return Cursor.ColResize;
        case 'row-resize':
            return Cursor.RowResize;
        case 'm-panning':
            return Cursor.PanMiddle;
        case 'm-panning-vertical':
            return Cursor.PanMiddleVertical;
        case 'm-panning-horizontal':
            return Cursor.PanMiddleHorizontal;
        case 'e-panning':
            return Cursor.PanEast;
        case 'n-panning':
            return Cursor.PanNorth;
        case 'ne-panning':
            return Cursor.PanNorthEast;
        case 'nw-panning':
            return Cursor.PanNorthWest;
        case 's-panning':
            return Cursor.PanSouth;
        case 'se-panning':
            return Cursor.PanSouthEast;
        case 'sw-panning':
            return Cursor.PanSouthWest;
        case 'w-panning':
            return Cursor.PanWest;
        case 'move':
            return Cursor.Move;
        case 'vertical-text':
            return Cursor.VerticalText;
        case 'cell':
            return Cursor.Cell;
        case 'alias':
            return Cursor.Alias;
        case 'progress':
            return Cursor.Progress;
        case 'nodrop':
        case 'not-allowed':
            return Cursor.NotAllowed;
        case 'copy':
            return Cursor.Copy;
        case 'none':
            return;
        case 'zoom-in':
            return Cursor.ZoomIn;
        case 'zoom-out':
            return Cursor.ZoomOut;
        case 'grab':
            return Cursor.Grab;
        case 'grabbing':
            return Cursor.Grabbing;

        default:
            return Cursor.Default;
    }
}

// As per https://www.electronjs.org/docs/latest/api/accelerator
// and https://learn.microsoft.com/en-us/windows/win32/inputdev/virtual-key-codes
const KEYS: Record<number, string | undefined> = {
    8: 'Backspace',
    9: 'Tab',
    13: 'Enter',
    16: 'Shift',
    17: 'Control',
    18: 'Alt',
    20: 'Capslock',
    27: 'Escape',
    32: 'Space',
    33: 'PageUp',
    34: 'PageDown',
    35: 'End',
    36: 'Home',
    37: 'Left',
    38: 'Up',
    39: 'Right',
    44: 'PrintScreen',
    45: 'Insert',
    46: 'Delete',
    48: '0',
    49: '1',
    50: '2',
    51: '3',
    52: '4',
    53: '5',
    54: '6',
    55: '7',
    56: '8',
    57: '9',
    65: 'A',
    66: 'B',
    67: 'C',
    68: 'D',
    69: 'E',
    70: 'F',
    71: 'G',
    72: 'H',
    73: 'I',
    74: 'J',
    75: 'K',
    76: 'L',
    77: 'M',
    78: 'N',
    79: 'O',
    80: 'P',
    81: 'Q',
    82: 'R',
    83: 'S',
    84: 'T',
    85: 'U',
    86: 'V',
    87: 'W',
    88: 'X',
    89: 'Y',
    90: 'Z',
    91: 'Super',
    92: 'Super',
    93: 'Meta',
    112: 'F1',
    113: 'F2',
    114: 'F3',
    115: 'F4',
    116: 'F5',
    117: 'F6',
    118: 'F7',
    119: 'F8',
    120: 'F9',
    121: 'F10',
    122: 'F11',
    123: 'F12',
    124: 'F13',
    125: 'F14',
    126: 'F15',
    127: 'F16',
    128: 'F17',
    129: 'F18',
    130: 'F19',
    131: 'F20',
    132: 'F21',
    133: 'F22',
    134: 'F23',
    135: 'F24',
    144: 'Numlock',
    145: 'Scrolllock',
    176: 'MediaNextTrack',
    177: 'MediaPreviousTrack',
    178: 'MediaStop',
    179: 'MediaPlayPause',
    181: 'VolumeMute',
    182: 'VolumeDown',
    183: 'VolumeUp',
    186: ';',
    187: '=',
    188: ',',
    189: '-',
    190: '.',
    191: '/',
    192: '`',
    219: '[',
    220: '\\',
    221: ']',
    222: "'",
    225: 'AltGr'
};
