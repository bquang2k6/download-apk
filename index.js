const app = require('./server');
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop');
});

server.on('error', (error) => {
    console.error('SERVER ERROR:', error);
});

// // Giữ cho process luôn chạy và không tự thoát
// setInterval(() => {
//     // Keep alive
// }, 1000 * 60 * 60);

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION:', reason);
});
