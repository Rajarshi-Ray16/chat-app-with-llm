const axios = require('axios');
const jwt = require('jsonwebtoken');

const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');

const sendMessage = async (req, res) => {
  const { senderId, receiverId, content } = req.body;
  console.log("Checking if this is the one being used.")

  try {
    // Retrieve the sender and receiver documents from the database
    const senderInfo = await User.findOne({ email: senderId });
    const receiverInfo = await User.findOne({ email: receiverId });

    if (!senderInfo || !receiverInfo) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create a new message with the sender and receiver information
    const message = new Message({
      sender: senderInfo,
      receiver: receiverInfo,
      content
    });

    await message.save();

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
        messages: [message]
      });
    } else {
      conversation.messages.push(message);
    }

    await conversation.save();

    res.status(200).json({ message: 'Message sent', conversation });
  } catch (error) {
    console.error('Error sending message', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

const getMessages = async (req, res) => {
  const { userId1, userId2 } = req.params;
  // console.log(req.params);

  try {

    const userId1Info = await User.findOne({ email: userId1 });
    const userId2Info = await User.findOne({ email: userId2 });

    if (!userId1Info || !userId2Info) {
      return res.status(404).json({ message: 'User not found' });
    }

    // console.log(userId1Info, userId2Info);

    const conversation = await Conversation.findOne({
      $or: [
        { user1: userId1Info, user2: userId2Info },
        { user1: userId2Info, user2: userId1Info }
      ]
    }).populate('messages.sender messages.receiver');

    // console.log(conversation);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    res.status(200).json({ messages: conversation.messages });
  } catch (error) {
    // console.error('Error retrieving messages', error);
    res.status(500).json({ message: 'Failed to retrieve messages' });
  }
};

const getUserStatus = async (req, res) => {
  const { email } = req.params;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ status: user.status });
  } catch (error) {
    console.error('Error getting user status', error);
    res.status(500).json({ message: 'Failed to get user status' });
  }
};

// New controller to get all messages
const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find().populate('sender receiver');
    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error retrieving messages', error);
    res.status(500).json({ message: 'Failed to retrieve messages' });
  }
};

// New controller to get all conversations
const getAllConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find().populate('user1 user2 messages.sender messages.receiver');
    res.status(200).json({ conversations });
  } catch (error) {
    console.error('Error retrieving conversations', error);
    res.status(500).json({ message: 'Failed to retrieve conversations' });
  }
};

const queryLLM = async (req, res) => {
  const { senderId, receiverId, content } = req.body;
  const query = content + "\n" + "I want you to behave like a human and provide an appropriate response to the above in less than 30 words. Use no text edits."

  try {
    // Save the original message
    try {
      const senderInfo = await User.findOne({ email: senderId });
      const receiverInfo = await User.findOne({ email: receiverId });

      if (!senderInfo || !receiverInfo) {
        return res.status(404).json({ message: 'User not found' });
      }

      const message = new Message({
        sender: senderInfo,
        receiver: receiverInfo,
        content
      });

      await message.save();

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
          messages: [message]
        });
      } else {
        conversation.messages.push(message);
      }

      await conversation.save();
    } catch (error) {
      console.error('Error sending message', error);
      return res.status(500).json({ message: 'Failed to send message' });
    }

    // Query the LLM with a timeout of 10 seconds
    const llmRequest = axios.post(process.env.LLM_API_URL, {
      contents: [{ parts: [{ text: query }] }]
    });

    // The timeout below ensures that the reply takes no longer than 10s
    const timeout = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: { candidates: [{ content: { parts: [{ text: "User is unavailable" }] } }] } });
      }, 10000);
    });

    const response = await Promise.race([llmRequest, timeout]);
    const reply = response.data.candidates[0].content.parts[0].text;
    console.log(reply);

    // Save the LLM reply
    try {
      const senderInfo = await User.findOne({ email: receiverId });
      const receiverInfo = await User.findOne({ email: senderId });

      if (!senderInfo || !receiverInfo) {
        return res.status(404).json({ message: 'User not found' });
      }

      const replyMessage = new Message({
        sender: senderInfo,
        receiver: receiverInfo,
        content: reply
      });

      await replyMessage.save();

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
          messages: [replyMessage]
        });
      } else {
        conversation.messages.push(replyMessage);
      }

      await conversation.save();

      res.status(200).json({ message: 'Message sent', conversation, reply });
    } catch (error) {
      console.error('Error sending message', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  } catch (error) {
    console.error('Error querying LLM', error);
    res.status(500).json({ message: 'Failed to query LLM' });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getAllMessages,
  getAllConversations,
  queryLLM,
  getUserStatus
};
