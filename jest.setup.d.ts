import { SoundHint } from './shared/types';

declare global {
    namespace jest {
        interface Matchers<R> {
            toHaveEmittedMessage(expectedMessage: string | RegExp, expectedSoundHint?: SoundHint): R;
        }
    }

    function extractMessageText(msg: any): string;
}

export {};
