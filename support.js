const axios = require('axios');

module.exports = (io) => {
    const supportNamespace = io.of('/support');

    supportNamespace.on('connection', (socket) => {
        console.log(`🛠️ [SUPPORT] User connected: ${socket.id}`);

        // Join room for specific support query
        socket.on('join_chat', (data) => {
            const queryId = data.queryId;
            socket.join(`query_${queryId}`);
            console.log(`[SUPPORT] User ${socket.id} joined room: query_${queryId}`);
        });

        // Handle incoming message
        socket.on('send_message', async (messageData) => {
            const queryId = messageData.queryId;
            const hasImage = messageData.imageBase64 && messageData.imageBase64.length > 100;

            console.log(`📩 [SUPPORT] Message received for query ${queryId}:`);
            console.log(`- Text: ${messageData.reply}`);
            if (hasImage) {
                console.log(`- Image received (base64 length: ${messageData.imageBase64.length})`);
            }

            // Determine API endpoint
            const endpoint = hasImage
                ? 'https://app.midescrow.com.ng/api/mobile/escrow/issues.php?action=storeReply'
                : 'https://app.midescrow.com.ng/api/mobile/escrow/issues.php?action=storeReplyText';

            // Prepare request body
            const body = {
                issueId: queryId.toString(),
                replyContent: messageData.reply,
                replyby: messageData.replyBy,
                image: hasImage ? messageData.imageBase64 : '',
            };

            // Send to API
            try {
                const res = await axios.post(endpoint, body);
                console.log(`✅ [SUPPORT] Data sent to API successfully:`, res.data);
            } catch (err) {
                console.error(`❌ [SUPPORT] Failed to post to API:`, err.message);
            }

            // Broadcast message to all users in the room
            supportNamespace.to(`query_${queryId}`).emit(`new_reply_to_query_${queryId}`, messageData);
        });

        // On disconnect
        socket.on('disconnect', () => {
            console.log(`[SUPPORT] User disconnected: ${socket.id}`);
        });
    });
};
