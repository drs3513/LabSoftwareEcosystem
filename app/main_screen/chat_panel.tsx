"use client";

import { useEffect, useState, useRef } from "react";
import { useGlobalState } from "./GlobalStateContext";
import { getMessagesForFile, createMessage, updateMessage, deleteMessage } from "@/lib/message";
import styled from "styled-components";

interface Message {
  messageId: string;
  fileId: string;
  userId: string;
  content: string;
  createdAt: string;
  edited?: boolean;
  deleted?: boolean;
}

export default function ChatPanel() {
  const { fileId, userId } = useGlobalState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);

  useEffect(() => {
    async function fetchMessages() {
      if (!fileId) return;
      const fileMessages = await getMessagesForFile(fileId);
      // Sort messages by createdAt timestamp in ascending order
      const sortedMessages = fileMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setMessages(sortedMessages);
    }
    fetchMessages();
  }, [fileId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (input.trim() && fileId && userId) {
      try {
        const response = await createMessage(fileId, userId, input.trim(), false, false);

        // Log the response for debugging
        console.log("createMessage response:", response);

        // ✅ Extract the correct message format
        const newMessage: Message = response?.data ?? response;

        // ✅ Ensure newMessage has required fields before updating state
        if (newMessage && 'messageId' in newMessage && 'content' in newMessage) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              messageId: newMessage.messageId,
              fileId: newMessage.fileId,
              userId: newMessage.userId,
              content: newMessage.content,
              createdAt: newMessage.createdAt,
              edited: newMessage.edited, // Optional property
              deleted: newMessage.deleted, // Optional property
            },
          ]);
          setInput(''); // ✅ Clear input after sending
        } else {
          console.error('Invalid message response:', response);
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, messageId });
  };

  const handleUpdateMessage = async (messageId: string) => {
    const newContent = prompt("Enter new message content:");
    if (newContent) {
      try {
        await updateMessage(messageId, newContent, userId!);
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.messageId === messageId ? { ...msg, content: newContent } : msg
          )
        );
      } catch (error) {
        console.error("Error updating message:", error);
      }
    }
    setContextMenu(null);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId, userId!);
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.messageId === messageId ? { ...msg, content: "", deleted: true } : msg
        )
      );
    } catch (error) {
      console.error("Error deleting message:", error);
    }
    setContextMenu(null);
  };

  return (
    <ChatContainer>
      <ChatMessagesWrapper>
        {messages.map((msg) => (
          <ChatMessage
            key={msg.messageId}
            $sender={msg.userId === userId}
            onContextMenu={msg.deleted ? undefined : (e) => handleContextMenu(e, msg.messageId)}
          >
            {msg.deleted ? (
              <DeletedMessageBox>Message deleted</DeletedMessageBox>
            ) : (
              <Chat_Body $sender={msg.userId === userId}>
                <div>{msg.content}</div>
                <ChatSender>{msg.userId === userId ? "You" : "Other User"}</ChatSender>
                <ChatTimeStamp>{new Date(msg.createdAt).toLocaleTimeString()}</ChatTimeStamp>
                {msg.edited && <ChatUpdateStatus>Edited</ChatUpdateStatus>}
              </Chat_Body>
            )}
          </ChatMessage>
        ))}
        <div ref={chatEndRef} />
      </ChatMessagesWrapper>
      <InputContainer>
        <Input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleSendMessage} placeholder="Type a message..." />
      </InputContainer>
      {contextMenu && (
        <ContextMenu $x={contextMenu.x} $y={contextMenu.y}>
          <ContextMenuItem onClick={() => handleUpdateMessage(contextMenu.messageId)}>Update</ContextMenuItem>
          <ContextMenuItem onClick={() => handleDeleteMessage(contextMenu.messageId)}>Delete</ContextMenuItem>
        </ContextMenu>
      )}
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

const DeletedMessageBox = styled.div`
  background-color: lightgray;
  color: gray;
  padding: 10px;
  border-radius: 10px;
  max-width: 60%;
  font-style: italic;
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

const ChatUpdateStatus = styled.div`
  font-size: 8pt; 
  color: white;
  margin-top: 2px;
  font-style: italic;
  font-weight: bold;
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

const ContextMenuItem = styled.div`
  text-align: left;
  border-bottom-style: solid;
  border-bottom-width: 1px;
  border-bottom-color: gray;
  font-size: 14px;

  &:hover {
    transition: background-color 250ms linear;
    background-color: darkgray;
  }

  &:last-child {
    border-bottom-style: none;
  }

  padding: 0.2rem 0.5rem 0.2rem 0.2rem;
`;

const ContextMenu = styled.div<{$x: number, $y: number}>`
  position: absolute;
  left: ${(props) => props.$x}px;
  top: ${(props) => props.$y}px;
  background-color: lightgray;
  border-color: dimgray;
  border-style: solid;
  border-radius: 5px;
  border-width: 2px;
`;