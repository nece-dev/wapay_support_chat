const axios = require('axios');
const FormData = require('form-data');

module.exports = (io) => {
    const escrowNamespace = io.of('/escrow');

    escrowNamespace.on('connection', (socket) => {
        console.log('🔌 [ESCROW] New client connected');

        socket.on('register', (user_id) => {
            socket.join(user_id.toString());
            console.log(`[ESCROW] ✅ User ${user_id} joined their room`);
        });

        socket.on('sendMessage', async (data) => {
            const { issueId, replyContent, replyby, receiver_id, image } = data;

            try {
                const form = new FormData();
                form.append('issueId', issueId);
                form.append('replyContent', replyContent);
                form.append('replyby', replyby);

                let endpoint = 'storeReplyText';
                if (image) {
                    form.append('image', image);
                    endpoint = 'storeReply';
                }

                await axios.post(
                    `https://new.midescrow.com.ng/api/mobile/escrow/index.php?action=${endpoint}`,
                    form,
                    { headers: form.getHeaders() }
                );

                escrowNamespace.to(receiver_id.toString()).emit('receiveMessage', {
                    ...data,
                    timestamp: new Date().toISOString(),
                });

                console.log(`[ESCROW] 📨 Message sent to user ${receiver_id}`);
            } catch (err) {
                console.error('[ESCROW] ❌ Error:', err.message);
                socket.emit('errorMessage', err.message);
            }
        });

        socket.on('disconnect', () => {
            console.log('🔌 [ESCROW] Client disconnected');
        });
    });
};
