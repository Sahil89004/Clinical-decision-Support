import { io } from 'socket.io-client';

// Connect to backend (default localhost:5000)
const URL = 'http://localhost:5000';

export const socket = io(URL, {
    autoConnect: true
});
