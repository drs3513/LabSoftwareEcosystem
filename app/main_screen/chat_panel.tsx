import { useEffect, useState, useRef } from "react";
import { useGlobalState } from "./GlobalStateContext";
import { getMessagesForFile, createMessage, updateMessage, deleteMessage } from "@/lib/message";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import styled from "styled-components";

const client = generateClient<Schema>();

interface Message {
  messageId: string;
  fileId: string;
  userId: string;
  projectId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isUpdated?: boolean;
  isDeleted?: boolean;
  email?: string;
}

export default function ChatPanel() {
  const { projectId, fileId, userId } = useGlobalState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
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
                email: user?.data?.username,
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

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fileId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [contextMenu]);

  const handleSendMessage = async () => {
    
    if (input.trim() && fileId && userId) {
      try {
        const response = await createMessage(fileId, userId, input.trim(), projectId!);
        console.log("createMessage response:", response); // Log the full response for debugging

        const newMessage: Message = response?.data ?? response;

        if (newMessage && "messageId" in newMessage && "content" in newMessage) {
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              messageId: newMessage.messageId,
              fileId: newMessage.fileId,
              userId: newMessage.userId,
              projectId: newMessage.projectId,
              content: newMessage.content,
              createdAt: newMessage.createdAt,
              updatedAt: newMessage.updatedAt,
              isUpdated: newMessage.isUpdated,
            },
          ]);
          setInput("");
        } else {
          console.error("Invalid message response:", response);
        }
      } catch (error) {
        console.error("Error sending message:", error);
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
            msg.messageId === messageId ? { ...msg, content: newContent, updatedAt: new Date().toISOString(), isUpdated: true } : msg
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
          msg.messageId === messageId ? { ...msg, content: "", isDeleted: true } : msg
        )
      );
    } catch (error) {
      console.error("Error deleting message:", error);
    }
    setContextMenu(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <ChatContainer>
      <ChatMessagesWrapper>
        {messages.map((msg) => (
          <ChatMessage
            key={msg.messageId}
            $sender={msg.userId === userId}
            onContextMenu={msg.isDeleted ? undefined : (e) => handleContextMenu(e, msg.messageId)}
          >
            {msg.isDeleted ? (
              <DeletedMessageBox>Message deleted</DeletedMessageBox>
            ) : (
              <Chat_Body $sender={msg.userId === userId}>
                <div>{msg.content}</div>
                <ChatSender>{msg.userId === userId ? "You" : msg.email}</ChatSender>
                <ChatTimeStamp>
                  {msg.isUpdated
                    ? `${new Date(msg.updatedAt!).toLocaleDateString()} ${new Date(msg.updatedAt!).toLocaleTimeString()}`
                    : `${new Date(msg.createdAt).toLocaleDateString()} ${new Date(msg.createdAt).toLocaleTimeString()}`}
                </ChatTimeStamp>
                {msg.isUpdated && <ChatUpdateStatus>Edited</ChatUpdateStatus>}
              </Chat_Body>
            )}
          </ChatMessage>
        ))}
        <div ref={chatEndRef} />
      </ChatMessagesWrapper>
      <InputContainer>
        <Input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." />
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