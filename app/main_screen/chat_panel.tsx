"use client";

import { useEffect, useState, useRef } from "react";
import { useGlobalState } from "./GlobalStateContext";
import { getMessagesForFile, createMessage } from "@/lib/message";
import styled from "styled-components";

export default function ChatPanel() {
  const { fileId, userId } = useGlobalState();
  const [messages, setMessages] = useState<Array<{ messageId: string; userId: string; content: string; createdAt: string }>>([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function fetchMessages() {
      if (!fileId) return;
      const fileMessages = await getMessagesForFile(fileId);
      setMessages(fileMessages);
    }
    fetchMessages();
  }, [fileId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  
  const handleSendMessage = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim() && fileId && userId) {
      try {
        const response = await createMessage(fileId, userId, input.trim());
  
        // Extract the correct message format
        const newMessage = response?.data ?? response; 
  
        // Ensure newMessage has required fields before updating state
        if (newMessage && "messageId" in newMessage && "content" in newMessage) {
          setMessages((prevMessages) => [...prevMessages, {
            messageId: newMessage.messageId,
            userId: newMessage.userId,
            content: newMessage.content,
            createdAt: newMessage.createdAt
          }]);
          setInput(""); // Clear input after sending
        } else {
          console.error("Invalid message response:", response);
        }
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };
  
  

  return (
    <ChatContainer>
      <ChatMessagesWrapper>
        {messages.map((msg) => (
          <ChatMessage key={msg.messageId} $sender={msg.userId === userId}>
            <Chat_Body $sender={msg.userId === userId}>
              <div>{msg.content}</div>
              <ChatSender>{msg.userId === userId ? "You" : "Other User"}</ChatSender>
              <ChatTimeStamp>{new Date(msg.createdAt).toLocaleTimeString()}</ChatTimeStamp>
            </Chat_Body>
          </ChatMessage>
        ))}
        <div ref={chatEndRef} />
      </ChatMessagesWrapper>
      <InputContainer>
        <Input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleSendMessage} placeholder="Type a message..." />
      </InputContainer>
    </ChatContainer>
  );
}

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
`;

const ChatMessagesWrapper = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
`;

const ChatMessage = styled.div<{$sender?: boolean}>`
  display: flex;
  justify-content: ${(props) => (props.$sender ? "flex-end" : "flex-start")};
  margin-bottom: 10px;
`;

const Chat_Body = styled.div<{$sender?: boolean}>`
  background-color: ${(props) => (props.$sender ? "cadetblue" : "tan")};
  padding: 10px;
  border-radius: 10px;
  max-width: 60%;
`;

const ChatSender = styled.div`
  font-size: 8pt;
  margin-top: 4px;
`;

const ChatTimeStamp = styled.div`
  font-size: 8pt;
  color: red;
  margin-top: 2px;
`;

const InputContainer = styled.div`
  display: flex;
  padding: 0.5rem;
  background: #f0f0f0;
  border-top: 1px solid #ccc;
`;

const Input = styled.input`
  flex: 1;
  height: 2rem;
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 5px;
`;
