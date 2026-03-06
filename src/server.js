require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocketIO } = require('./sockets/socketManager');

const PORT = process.env.PORT || 3000;

// Create the HTTP server from Express so Socket.IO can share the same port
const server = http.createServer(app);

// Initialize Socket.IO on the HTTP server (must happen before server.listen)
initSocketIO(server);

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! 💥 Shutting down...');
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1);
    });
});
