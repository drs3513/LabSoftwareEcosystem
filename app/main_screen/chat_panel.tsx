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
  content: string;
  createdAt: string;
  edited?: boolean;
  deleted?: boolean;
  email?: string;
}

export default function ChatPanel() {
  const { projectId, fileId, userId } = useGlobalState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string, msguserId: string } | null>(null);
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
              if(!msg?.isDeleted){
                  if(msg?.isUpdated){
                    return {
                      ...msg,
                      email: user?.data?.username,
                      edited: msg.isUpdated,
                    };
                  }
                  else{
                    return {
                      ...msg,
                      email: user?.data?.username,
                    };
                  }
                }
              else{
                return{
                  ...msg,
                  content: "",
                  deleted: true,
                }
              }
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
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [contextMenu]);

  const handleSendMessage = async () => {
    if (!input.trim()) {
      console.log("Message input is empty. Aborting send.");
      return;
    }
    
    if (!fileId || !userId || !projectId) {
      console.error("Missing required fields:", { fileId, userId, projectId });
      return;
    }
  
    console.log("Sending message with the following data:");
    console.log("fileId:", fileId);
    console.log("userId:", userId);
    console.log("projectId:", projectId);
    console.log("content:", input.trim());
  
    try {
      const response = await createMessage(fileId, userId, input.trim(), projectId as string);
  
      console.log("Raw response from createMessage:", response);
  
      if (!response) {
        throw new Error("createMessage returned undefined");
      }
  
      const newMessage = response?.data ?? response;
  
      if (!newMessage || !("messageId" in newMessage && "content" in newMessage)) {
        console.error("Invalid message response:", response);
        return;
      }
  
      console.log("Successfully sent message:", newMessage);
  
      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setInput("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  

  const handleContextMenu = (e: React.MouseEvent, messageId: string, msguserId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, messageId, msguserId });
  };

  const handleUpdateMessage = async (messageId: string, messageuserId: string)=> {
    if(messageuserId != userId){
      alert("You do not have acces to this message");
      return;
    }
    const newContent = prompt("Enter new message content:");
    if (newContent) {
      try {
        await updateMessage(messageId, newContent, userId!);
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.messageId === messageId ? { ...msg, content: newContent, edited: true } : msg
          )
        );
      } catch (error) {
        console.error("Error updating message:", error);
      }
    }
    setContextMenu(null);
  };

  const handleDeleteMessage = async (messageId: string, messageuserId: string)=> {
    if(messageuserId != userId){
      alert("You do not have acces to this message");
      return;
    }
    try {
      await deleteMessage(messageId, userId as string);
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
            onContextMenu={msg.deleted ? undefined : (e) => handleContextMenu(e, msg.messageId, msg.userId)}
          >
            {msg.deleted ? (
              <DeletedMessageBox>Message deleted</DeletedMessageBox>
            ) : (
              <Chat_Body $sender={msg.userId === userId}>
                <div>{msg.content}</div>
                <ChatSender>{msg.userId === userId ? "You" : msg.email}</ChatSender>
                <ChatTimeStamp>{new Date(msg.createdAt).toLocaleDateString()}{" "}{new Date(msg.createdAt).toLocaleTimeString()}</ChatTimeStamp>
                {msg.edited && <ChatUpdateStatus>Edited</ChatUpdateStatus>}
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
        <ContextMenu ref={contextMenuRef} $x={contextMenu.x} $y={contextMenu.y}>
          <ContextMenuItem onClick={() => handleUpdateMessage(contextMenu.messageId, contextMenu.msguserId)}>Update</ContextMenuItem>
          <ContextMenuItem onClick={() => handleDeleteMessage(contextMenu.messageId, contextMenu.msguserId)}>Delete</ContextMenuItem>
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