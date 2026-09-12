const { Server } = require('socket.io');
const UserAuthService = require('../services/user/user.service');

const userAuthService = new UserAuthService();

let io = null;

// Matches production domain + any Vercel preview deploy for this project
const allowedOrigins = [
    'https://nihonzing.com',
    'https://nihon-zing.vercel.app',
    'http://localhost:5173'
];
const previewPattern = /^https:\/\/nihon-zing-[a-z0-9]+-janhvis-projects-[a-z0-9]+\.vercel\.app$/;

function isAllowedOrigin(origin) {
    if (!origin) return true; // non-browser requests (no Origin header)
    return allowedOrigins.includes(origin) || previewPattern.test(origin);
}

function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                if (isAllowedOrigin(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true
        }
    });

    io.on('connection', async (socket) => {
        try {
            const leaderboard = await userAuthService.fetchLeaderboard();
            socket.emit('leaderboardUpdated', leaderboard);
        } catch (error) {
            console.error("Socket initial leaderboard fetch error:", error);
        }
    });

    return io;
}

async function broadcastLeaderboard() {
    if (!io) return;
    try {
        const leaderboard = await userAuthService.fetchLeaderboard();
        io.emit('leaderboardUpdated', leaderboard);
    } catch (error) {
        console.error("Broadcast leaderboard error:", error);
    }
}

module.exports = { initSocket, broadcastLeaderboard };