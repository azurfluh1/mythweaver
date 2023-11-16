import Pusher from 'pusher-js';
import { isProduction } from '@/lib/util.ts';

if (!isProduction) {
  Pusher.logToConsole = true;
}

const pusherAppKey = import.meta.env.VITE_PUSHER_APP_KEY;
export const pusher = new Pusher(pusherAppKey, {
  cluster: 'us3',
});

export enum ServerEvent {
  ConjurationCreated = 'conjuration-created',
  ConjurationError = 'conjuration-error',
}
