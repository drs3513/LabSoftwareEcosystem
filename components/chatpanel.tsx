"use client";

import { useEffect, useState, useRef } from "react";
import { createMessage, getLatestMessages, getOlderMessages } from "@/lib/message";
import type { Schema } from "@/amplify/data/resource";

type ChatPanelProps = {
  fileId: string;
  userId: string;
};

export default function ChatPanel({ fileId, userId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Array<Schema["Message"]["type"]>>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const allMessagesLoaded = useRef(false);

  // ✅ Fetch Latest Messages on Component Mount or fileId Change
  useEffect(() => {
    async function fetchMessages() {
      const latestMessages = await getLatestMessages(fileId, 20);
      setMessages(latestMessages.reverse()); // Show messages in chronological order
      allMessagesLoaded.current = latestMessages.length < 20; // If fewer than 20 messages are returned, we've loaded all
    }
    fetchMessages();
  }, [fileId]);

  // ✅ Scroll to Bottom when Messages Update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ✅ Scroll to the Bottom of the Chat Container
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // ✅ Fetch Older Messages when Scrolling Up
  const handleScroll = async () => {
    if (
      chatContainerRef.current &&
      chatContainerRef.current.scrollTop === 0 &&
      !loadingOlderMessages &&
      !allMessagesLoaded.current
    ) {
      setLoadingOlderMessages(true);

      const oldestMessageTimestamp = messages[0]?.createdAt;
      const olderMessages = await getOlderMessages(fileId, oldestMessageTimestamp, 20);

      if (olderMessages.length > 0) {
        // Filter out duplicates before updating the state
        const uniqueMessages = olderMessages.filter(
          (newMsg) => !messages.some((msg) => msg.messageId === newMsg.messageId)
        );
        setMessages((prevMessages) => [...uniqueMessages.reverse(), ...prevMessages]);
      }

      allMessagesLoaded.current = olderMessages.length < 20;
      setLoadingOlderMessages(false);
    }
  };

  // ✅ Handle Message Send
  const handleSend = async () => {
    if (!newMessage.trim()) return;

    try {
      const createdMessage = await createMessage(fileId, userId, newMessage.trim());
      setMessages((prevMessages) => [
        ...prevMessages,
        createdMessage, // Append the new message
      ]);
      setNewMessage("");
      scrollToBottom();
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // ✅ Handle "Enter" Key for Sending Messages
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <h2>Chat for File: {fileId}</h2>
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          border: "1px solid #ccc",
          padding: "10px",
          marginBottom: "10px",
        }}
      >
        {loadingOlderMessages && <p>Loading older messages...</p>}
        {messages.length > 0 ? (
          messages.map((message) => (
            <div key={message.messageId} style={{ marginBottom: "10px" }}>
              <strong>{message.userId}:</strong> {message.content} <br />
              <span style={{ fontSize: "0.8em", color: "gray" }}>
                ({new Date(message.createdAt).toLocaleString()})
              </span>
            </div>
          ))
        ) : (
          <p>No messages yet.</p>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          style={{
            flex: 1,
            padding: "10px",
            marginRight: "10px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
        <button onClick={handleSend} style={{ padding: "10px 20px", cursor: "pointer" }}>
          Send
        </button>
      </div>
    </div>
  );
}
