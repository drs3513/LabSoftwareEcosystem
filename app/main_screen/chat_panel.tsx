import { useEffect, useState, useRef } from "react";
import { useGlobalState } from "./GlobalStateContext";
import { createMessage } from "@/lib/message";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import styled from "styled-components";

const client = generateClient<Schema>();

interface Message {
  messageId: string;
  userId: string;
  content: string;
  createdAt: string;
  email?: string; //  Store user email
}

export default function ChatPanel() {
  const { fileId, userId } = useGlobalState();
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  //  Fetch messages using observeQuery
  useEffect(() => {
    if (!fileId) return;

    const subscription = client.models.Message.observeQuery({
      filter: { fileId: { eq: fileId } },
    }).subscribe({
      next: async (data) => {
        if (data.items && Array.isArray(data.items)) {
          const sortedMessages = data.items.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
    
          const messagesWithEmails = await Promise.all(
            sortedMessages.map(async (msg) => {
              const user = await client.models.User.get({ userId: msg.userId });
              return {
                ...msg,
                email: user?.data?.email || "Unknown User",
              };
            })
          );
    
          setMessages(messagesWithEmails);
        }
      },
      error: (error) => {
        console.error("Error observing messages:", error);
      },
    });
});


  //  Scroll to the end when messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Enter key to send message
  const handleSendMessage = async () => {
    if (input.trim() && fileId && userId) {
      try {
        const response = await createMessage(fileId, userId, input.trim());

        const newMessage = response?.data ?? response;

        if (newMessage && "messageId" in newMessage && "content" in newMessage) {
          setInput("");
        } else {
          console.error("Invalid message response:", response);
        }
      } catch (error) {
        console.error("Error sending message:", error);
      }
    }
  };

  //  KeyDown handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <ChatContainer>
      <ChatMessagesWrapper>
        {messages.map((msg) => (
          <ChatMessage key={msg.messageId} $sender={msg.userId === userId}>
            <Chat_Body $sender={msg.userId === userId}>
              <div>{msg.content}</div>
              <ChatSender>{msg.userId === userId ? "You" : msg.email}</ChatSender>
              <ChatTimeStamp>{new Date(msg.createdAt).toLocaleTimeString()}</ChatTimeStamp>
            </Chat_Body>
          </ChatMessage>
        ))}
        <div ref={chatEndRef} />
      </ChatMessagesWrapper>
      <InputContainer>
        <Input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
        />
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
