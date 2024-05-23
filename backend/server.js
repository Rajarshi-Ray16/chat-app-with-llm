const express = require('express');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const http = require('http');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');

const Conversation = require('./models/conversationModel');
const Message = require('./models/messageModel');
const User = require('./models/userModel');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000', // Adjust this to match your frontend's URL
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('sendMessage', async (message) => {
    const { senderId, receiverId, content } = message;

    try {
      // Retrieve the sender and receiver documents from the database
      const senderInfo = await User.findOne({ email: senderId });
      const receiverInfo = await User.findOne({ email: receiverId });

      if (!senderInfo || !receiverInfo) {
        socket.emit('errorMessage', { message: 'User not found' });
        return;
      }

      // Create a new message with the sender and receiver information
      const newMessage = new Message({
        sender: senderInfo,
        receiver: receiverInfo,
        content
      });

      await newMessage.save();

      // Find the conversation between the two users or create a new one
      let conversation = await Conversation.findOne({
        $or: [
          { user1: senderInfo, user2: receiverInfo },
          { user1: receiverInfo, user2: senderInfo }
        ]
      });

      if (!conversation) {
        conversation = new Conversation({
          user1: senderInfo,
          user2: receiverInfo,
          messages: [newMessage]
        });
      } else {
        conversation.messages.push(newMessage);
      }

      await conversation.save();

      // Broadcast the message to the intended receiver
      io.to(receiverId).emit('receiveMessage', {
        sender: { email: senderId },
        content: content
      });
    } catch (error) {
      console.error('Error sending message', error);
      socket.emit('errorMessage', { message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT;

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch((error) => console.log(error.message));
