import { io } from 'socket.io-client';

export const socket = io(typeof window !== "undefined" ? window.location.origin : undefined, {
    autoConnect: false
});
