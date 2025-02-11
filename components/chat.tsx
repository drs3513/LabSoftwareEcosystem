"use client";

import { useState, useEffect, useRef } from "react";
import {
  getLatestMessages,
  createMessage,
  getOlderMessages,
  deleteMessage,
} from "@/lib/chat";

export default function Chat({ fileId, userId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  // ✅ Load initial messages
  useEffect(() => {
    async function fetchMessages() {
      const latestMessages = await getLatestMessages(fileId);
      setMessages(latestMessages.reverse()); // Reverse for chronological order
    }
    fetchMessages();
  }, [fileId]);

  // ✅ Load older messages when scrolling up
  const handleScroll = async () => {
    if (chatRef.current.scrollTop === 0 && !loading) {
      setLoading(true);
      const oldestMessage = messages[0]?.createdAt; // Oldest message timestamp
      const olderMessages = await getOlderMessages(fileId, oldestMessage);

      setMessages((prevMessages) => [
        ...olderMessages.reverse(),
        ...prevMessages,
      ]);
      setLoading(false);
    }
  };

  // ✅ Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const now = new Date(); // Current timestamp
    const message = await createMessage(fileId, userId, newMessage);

    if (message) {
      const newMessageWithTime = {
        ...message,
        createdAt: now.toISOString(), // Temporary timestamp for instant display
      };

      setMessages((prevMessages) => [...prevMessages, newMessageWithTime]);
      setNewMessage(""); // Clear input
      scrollToBottom(); // Scroll to the latest message
    }
  };

  // ✅ Delete a message
  const handleDeleteMessage = async (messageId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this message?"
    );
    if (!confirmDelete) return;

    await deleteMessage(messageId);
    setMessages((prevMessages) =>
      prevMessages.filter((msg) => msg.messageId !== messageId)
    );
  };

  // ✅ Scroll to the bottom of the chat
  const scrollToBottom = () => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  };

  // ✅ Auto-scroll to the latest message on messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div style={{ border: "1px solid #ccc", padding: "10px", marginTop: "10px" }}>
      <h2>
        Chat Room for File <strong>{fileId}</strong>
      </h2>
      <div
  ref={chatRef}
  onScroll={handleScroll}
  style={{
    height: "300px",
    overflowY: "scroll",
    border: "1px solid gray",
    padding: "10px",
  }}
>
  {messages.length > 0 ? (
    messages.map((msg) => (
      <div key={msg.messageId} style={{ marginBottom: "10px" }}>
        <strong>{msg.userId}:</strong> {msg.content}
        <small style={{ marginLeft: "10px", color: "gray" }}>
          (
          {msg.createdAt
            ? new Date(msg.createdAt).toLocaleString()
            : "Invalid Date"}
          )
        </small>
        {msg.userId === userId && (
          <button
            onClick={() => handleDeleteMessage(msg.messageId)}
            style={{
              marginLeft: "10px",
              background: "red",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            ❌
          </button>
        )}
      </div>
    ))
  ) : (
    <p>No messages yet. Start the conversation!</p>
  )}
</div>


      <div style={{ marginTop: "10px" }}>
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ width: "80%", padding: "5px" }}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()} // Send message on Enter
        />
        <button
          onClick={sendMessage}
          style={{
            marginLeft: "5px",
            padding: "5px 10px",
            background: "blue",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
