import React, { useState, useEffect } from 'react';
import socketIOClient from 'socket.io-client';
import axios from 'axios';

const ENDPOINT = "http://localhost:4000";

function Chat({ user }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [receiverId, setReceiverId] = useState('');
  const [users, setUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:4000/api/auth/users', {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        });
        setUsers(response.data.filter(u => u.email !== user.email)); // Exclude the logged-in user by email
      } catch (error) {
        console.error('Error fetching users', error);
      }
    };

    fetchUsers();
  }, [user.token, user.email]);

  useEffect(() => {
    const newSocket = socketIOClient(ENDPOINT, {
      auth: { token: user.token }
    });

    newSocket.on('receiveMessage', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user.token]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (receiverId) {
        try {
          const response = await axios.get(`http://localhost:4000/api/chat/messages/${user.email}/${receiverId}`, {
            headers: {
              Authorization: `Bearer ${user.token}`
            }
          });
          setMessages(response.data.messages);
        } catch (error) {
          console.error('Error fetching messages', error);
          setMessages([]); // Set messages to an empty array if an error occurs
        }
      } else {
        setMessages([]); // Clear messages if no receiver is selected
      }
    };

    fetchMessages();
  }, [receiverId, user.email, user.token]);

  const handleSend = async () => {
    if (!socket || !receiverId || !message.trim()) return;

    const payload = {
      senderId: user.email,
      receiverId,
      content: message
    };

    try {
      const statusResponse = await axios.get(`http://localhost:4000/api/chat/status/${receiverId}`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });
      console.log("Status of user: ", statusResponse.data.status);

      if (statusResponse.data.status === 'BUSY') {
        // const messagesToSend = messages.slice(-5).map(msg => `${msg.sender?.email === user.email ? 'You' : 'Them'}: ${msg.content}`);
        // messagesToSend.push(`You: ${message}`);

        const llmResponse = await axios.post('http://localhost:4000/api/chat/query-llm', payload, {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        });

        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: { email: user.email }, content: message },
          { sender: { email: receiverId }, content: llmResponse.data.reply }
        ]);
      } else {
        socket.emit('sendMessage', payload);
        console.log(payload);

        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: { email: user.email }, content: message }
        ]);
      }

      setMessage('');
    } catch (error) {
      console.error('Error sending message', error);
    }
  };

  return (
    <div>
      <h2>Chat Room</h2>
      <div>
        {messages.length > 0 ? (
          messages.map((msg, index) => (
            <p key={index}>
              <strong>{msg.sender?.email === user.email ? 'You' : 'Them'}:</strong> {msg.content}
            </p>
          ))
        ) : (
          <p>No messages yet</p>
        )}
      </div>
      <select
        value={receiverId}
        onChange={(e) => setReceiverId(e.target.value)}
        placeholder="Select receiver"
      >
        <option value="" disabled>Select receiver</option>
        {users.map((u) => (
          <option key={u._id} value={u.email}>{u.email}</option>
        ))}
      </select>
      {receiverId && (
        <>
          <input
            type="text"
            placeholder="Enter message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button onClick={handleSend}>Send</button>
        </>
      )}
    </div>
  );
}

export default Chat;