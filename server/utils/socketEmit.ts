import { Socket } from 'socket.io';
import { SoundHint } from '../../shared/types';

/**
 * Emit a message with an optional sound hint
 */
export function emitMessage(socket: Socket, message: string, soundHint?: SoundHint): void {
    if (soundHint) {
        socket.emit('message', { message, soundHint });
    } else {
        socket.emit('message', message);
    }
}

/**
 * Emit a standalone sound event (no message)
 */
export function emitSound(socket: Socket, soundHint: SoundHint): void {
    socket.emit('sound', soundHint);
}

/**
 * Emit an error with an optional sound hint (defaults to 'error')
 */
export function emitError(socket: Socket, message: string, soundHint: SoundHint = 'error'): void {
    socket.emit('error', { message, soundHint });
}
