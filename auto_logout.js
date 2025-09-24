const axios = require('axios');
const users = {}; // Store multiple socket IDs per user

module.exports = (io, app) => {
    const supportNamespace = io.of('/auto_logout');

    // Socket.IO connection handling
    supportNamespace.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        socket.on('connect_user', async (data) => {
            const { user_id, device_id } = data;

            try {
                const response = await axios.get(`https://new.midescrow.com.ng/api/mobile/udateuser/bflcoudbfdseut.php?id=${user_id}`);

                if (response.data && response.data.status === 'success') {
                    const storedDeviceId = response.data.device; // Get device ID from PHP API

                    // Device mismatch logic
                    if (storedDeviceId !== device_id) {
                        // Emit device mismatch to all devices connected with the same user
                        const userSockets = users[user_id] || [];
                        userSockets.forEach((userSocket) => {
                            supportNamespace.to(userSocket.socketId).emit('device_mismatch', {

                                message: 'Device mismatch detected',
                                user_id,
                                expected_device_id: storedDeviceId, // Add expected device_id
                                received_device_id: device_id, // Current device_id
                            });

                        });

                        console.log(`Device mismatch for user ${user_id}, expected: ${storedDeviceId}, received: ${device_id}`);
                    } else {
                        // Add the current device to the user's list of connected devices
                        if (!users[user_id]) {
                            users[user_id] = [];
                        }
                        users[user_id].push({ socketId: socket.id, deviceId: device_id });
                        console.log(`User ${user_id} connected with device ${device_id}`);
                    }
                } else {
                    socket.emit('error', { message: 'User not found in database or API error' });
                }
            } catch (error) {
                console.error('Error fetching user device_id from PHP API:', error);
                socket.emit('error', { message: 'Failed to verify device ID' });
            }
        });

        // Handle disconnection event
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);

        });

        // Handle device mismatch event from the client
        socket.on('device_mismatch', (data) => {
            console.log('Device mismatch detected:', data);
            // Optionally handle further actions on device mismatch, like logging out the user
        });

        // Error handling
        socket.on('error', (error) => {
            console.error('Socket error:', error);
            socket.emit('error', { message: 'An error occurred on the server' });
        });
    });

    // POST endpoint to handle device login notifications from PHP server
    app.post('/device-login', (req, res) => {
        const { user_id, message } = req.body;

        if (!user_id || !message) {
            return res.status(400).json({ error: 'user_id and message are required' });
        }

        // Check if the user is connected
        if (users[user_id] && users[user_id].length > 0) {
            // Emit device login event to all connected devices of the user
            users[user_id].forEach((userSocket) => {
                supportNamespace.to(userSocket.socketId).emit('device_login', {
                    message: message,
                    user_id: user_id,
                });
                console.log(`Device login notification sent to user ${user_id}: ${message}`);
            });
            return res.status(200).json({ status: 'success', message: 'Device login notification sent' });
        } else {
            console.log(`User ${user_id} is not connected`);
            return res.status(404).json({ error: 'User not connected' });
        }
    });
};
