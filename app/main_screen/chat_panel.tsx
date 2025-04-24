import React, { useEffect, useState, useRef } from "react";
import { useGlobalState } from "../GlobalStateContext";
import {
  createMessage,
  updateMessage,
  deleteMessage,
  searchMessages,
  getTagsForMessage,
  updateMessageTags,
  getMessagesByFileIdAndPagination
} from "@/lib/message";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import {Nullable} from "@aws-amplify/data-schema";
import styled from "styled-components";

import {useSearchParams} from 'next/navigation'

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
  const { projectId, fileId, userId} = useGlobalState();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string, msguserId: string } | null>(null);
  const [tags, setTags] = useState<Array<Nullable<string>>>([]);
  const [contextMenuTagPopout, setContextMenuTagPopout] = useState(false);
  const [contextMenuMessageId, setContextMenuMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  //for searching messages
  const [searchInput, setSearchInput] = useState(""); // State for search input
  const [searchTerm, setSearchTerm] = useState<Array<string>>([])
  //const [loading, setLoading] = useState(false)
  const [tagSearchTerm, setTagSearchTerm] = useState<Array<string>>([])
  const [authorSearchTerm, setAuthorSearchTerm] = useState<Array<string>>([])

  //for getting the messages
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const routerSearchParams = useSearchParams()

  useEffect(() => {
      //setLoading(true);
      const proj_id = routerSearchParams.get("pid");
      if (!proj_id || !userId) {
        setMessages([]);
        setSearchInput("");
        setTagSearchTerm([]);
        setAuthorSearchTerm([]);
        setInput("");
        //setLoading(false);
        return;
      }
    }, [routerSearchParams, userId]);

  
  
  async function fetchMessages() {
    if (!fileId ) return;

    //console.log("1Fetching next messages for fileId:", fileId, "nextToken:", nextToken || "null");


  const response = await getMessagesByFileIdAndPagination(fileId, nextToken);

  if(nextToken !== null){
    setNextToken(null); // Reset nextToken 
    setHasNextPage(false); // assume No more pages to fetch
  }

  if (!response || !response.data) {
    ////console.log("No response or data found.");
    setNextToken(null); // Reset nextToken
    setHasNextPage(false); // No more pages to fetch
    setLoading(false); // Stop loading
    return;
  }

  // Ensure nextToken is a string or null
  const newNextToken = response.nextToken || null;

  // setNextToken(newNextToken);
  // setHasNextPage(!!newNextToken);

  // Process messages
  const messages = response.data;
  ////console.log("Fetched messages:", messages);

  // Sort messages by createdAt timestamp
  if (messages && messages.length > 0) {
    const sortedMessages = messages.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let temp_messages: Array<Message> = [];
      for (let msg of sortedMessages) {
        if (msg) {
          temp_messages = [
            ...temp_messages,
            {
              messageId: msg.messageId,
              fileId: msg.fileId,
              userId: msg.userId,
              content: msg.content,
              createdAt: msg.createdAt,
              edited: msg.edited ?? false,
              deleted: msg.deleted ?? false,
              email: (await client.models.User.get({ userId: msg.userId }))?.data?.username ?? "Unknown",
            },
          ];
        }
      }
      // Append new messages to state
      setMessages((prevMessages) => [...temp_messages, ...prevMessages ]);
      //setMessages(temp_messages);
      setLoading(false); // Stop loading
  
  }
    
    //If there's a nextToken, update it and fetch more
    if (response.nextToken) {
      setNextToken(response.nextToken);
      setHasNextPage(true);
    } else {
      ////console.log("No nextToken available, end of messages.");
      setNextToken(null); // End of pagination
    }
  }

  //fetching next messages when the user scrolls to the top of the chat
  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && hasNextPage ) {
      ////console.log("Fetching more messages...");
      await fetchMessages();
    }
  };

  useEffect(() => {

    if (fileId) {
      console.log("2Fetching messages for fileId:", fileId);
      setNextToken(null); // Reset nextToken when fileId changes
      setMessages([]); // Clear messages when fileId changes
      fetchMessages();
     }
  }, [fileId]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

//fetching messages when found the search term
  async function fetchMessagesWithSearch() {
    //setLoading(true)
    if (!fileId ) return;
    //console.log("Fetching messages with search term:", searchTerm, "tagSearchTerm:", tagSearchTerm, "authorSearchTerm:", authorSearchTerm);
    const searchedMessages = await searchMessages(fileId, searchTerm, tagSearchTerm);
    //console.log("Fetched messages:", searchedMessages);
    if(searchedMessages && searchedMessages.length > 0){
      let temp_messages: Array<Message> = []
      for(let msg of searchedMessages){
        if(msg){
          temp_messages = [...temp_messages,
            {
              messageId: msg.messageId,
              fileId: msg.fileId,
              userId: msg.userId,
              content: msg.content,
              createdAt: msg.createdAt,
              edited: msg.isUpdated ?? false,
              deleted: msg.isDeleted ?? false,
              email: (await client.models.User.get({ userId: msg.userId }))?.data?.username ?? "Unknown"
            }] }}
      setMessages(temp_messages);
      //setLoading(false);
      return temp_messages
    }
  }

  useEffect(() => {
    const hasSearchTerms =
        searchTerm.length > 0 ||
        tagSearchTerm.length > 0 ||
        authorSearchTerm.length > 0;

    if (hasSearchTerms) {
      //console.log("Searching...");
      fetchMessagesWithSearch();
    } else {
      //console.log("Fetching old messages when input is empty");
      fetchMessages(); // restore full messages when no filters
    }
  }, [searchTerm, tagSearchTerm, authorSearchTerm]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
        setContextMenuTagPopout(false); // Close the tag popout if clicking outside
      }
    };

    const handleTagPopoutMouseLeave = (event: MouseEvent) => {
      if (contextMenuTagPopout && contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenuTagPopout(false); // Close the tag popout if mouse leaves
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("mouseleave", handleTagPopoutMouseLeave); // Close tag popout on mouse leave
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("mouseleave", handleTagPopoutMouseLeave); // Clean up event listener
    };
  }, [contextMenu]);

  const handleSendMessage = async () => {
    if (!input.trim()) {
      //console.log("Message input is empty. Aborting send.");
      return;
    }
    if (!fileId || !userId || !projectId) {
      console.error("Missing required fields:", { fileId, userId, projectId });
      return;
    }
    //console.log("Sending message with the following data:");
    //console.log("fileId:", fileId);
    //console.log("userId:", userId);
    //console.log("projectId:", projectId);
    //console.log("content:", input.trim());
  
    try {
      const response = await createMessage(fileId, userId, input.trim(), projectId as string);
  
  
      if (!response) {
        new Error("createMessage returned undefined");
      }
  
      const newMessage = response?.data ?? response;
  
      if (!newMessage || !("messageId" in newMessage && "content" in newMessage)) {
        console.error("Invalid message response:", response);
        return;
      }
  
      //console.log("Successfully sent message:", newMessage);
  
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
    setContextMenuTagPopout(false); // Close the tag popout if it's open
    if(messageuserId != userId){
      alert("You do not have acces to this message");
      return;
    }
    const newContent = prompt("Enter new message content:");
    if (newContent) {
      try {
        await updateMessage(messageId, newContent);
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
      alert("You do not have access to this message");
      return;
    }
    try {
      await deleteMessage(messageId);
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

  //create a function called handleTagInput to handle the tag input and create a new tag for the message
  async function handleTagInput(e: React.KeyboardEvent<HTMLInputElement>) {
    if(e.key == "Enter" ) {
      if(contextMenuMessageId && projectId && (e.target as HTMLInputElement).value.length > 0){
        const tag_name = (e.target as HTMLInputElement).value as string
        (e.target as HTMLInputElement).value = ""
        updateMessageTags(contextMenuMessageId, [...tags, tag_name])

        setTags([...tags, tag_name])


      }
    }

  }

  // Function to handle clearing the search input
  const handleClearSearch = () => {
    setSearchInput(""); // Clear the input value
    setTagSearchTerm([]);
    setAuthorSearchTerm([]);
    setSearchTerm([]);
    //console.log("Search input cleared. Fetching original messages...");
    fetchMessages(); // Fetch the original messages
    
  };

  // Function to handle search input changes
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  //Step 3: create a function to handleSearch for searching messages

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (searchInput.trim() === "") {
        handleClearSearch(); // Clear search if input is empty
        return;
      }

      const search_set = searchInput.split("/");
      const temp_tag_set: string[] = [];
      const temp_author_set: string[] = [];
      const temp_name_set: string[] = [];

      setTagSearchTerm([]);
      setSearchTerm([]);
      setAuthorSearchTerm([]);

      for (let search of search_set) {
        if (search.length > 0) {
          switch (search.charAt(0)) {
            case "#":
              temp_tag_set.push(search.substring(1).trim());
              break;
            case "&":
              temp_author_set.push(search.substring(1).trim());
              break;
            default:
              temp_name_set.push(search.trim());
              break;
          }
        }
      }

      setTagSearchTerm(temp_tag_set);
      setAuthorSearchTerm(temp_author_set);
      setSearchTerm(temp_name_set);
      //console.log("Search terms:", temp_name_set);
    }
  };

  //fetching the tags for the message
  async function fetchTagsForMessage() {
    if( !contextMenuMessageId) {
      //console.log("No context menu message ID available. Aborting fetch.");
      setTags([]);
      return [];
    }
    //console.log("Fetching tags for message ID:", contextMenuMessageId);
    // Fetch tags for the current message
    const messageTags = await getTagsForMessage(contextMenuMessageId);
    setTags(messageTags)
    //console.log(tags)
  }

  const observeTags = () => {
    const subscription = client.models.Message.observeQuery({
      filter: {messageId: {eq: contextMenuMessageId ? contextMenuMessageId : undefined}},
      selectionSet: ["tags"]
    }).subscribe({
      next: async({items}) => {
        //console.log("Called!", items.length, "tags fetched for message ID:", contextMenuMessageId);
        if(items.length === 0 || !items[0].tags){
          setTags([])
          return []
        }
        setTags(items[0].tags)

      }
    })
    return () => {
      subscription.unsubscribe();
    };

  }

  useEffect(() => {
    if(contextMenuMessageId) {
      //console.log("Context menu message ID changed, fetching tags...");
      fetchTagsForMessage()
      const unsubscribe = observeTags()
      return () => unsubscribe();
    }
  }, [contextMenuMessageId]);




  // Function to handle deleting a tag
  const handleDeleteTag = async ( e: React.MouseEvent<HTMLButtonElement>, tagIndex: number) => {
    e.stopPropagation(); // Prevent the context menu from closing
    //console.log("Deleting tag with ID:", tagId);
    if(!contextMenuMessageId) return
    updateMessageTags(contextMenuMessageId, tags.filter((tag, i) => i !== tagIndex))
    setTags(tags.filter((tag, i) => i !== tagIndex));
    //fetchTagsForMessage(); // Fetch tags again after deletion
    console.log("Tag deleted successfully.");
  };



  return (
      //step 2: display the searching input to the top bar container and call the handleSearch function
      <ChatContainer onScroll={handleScroll}>
        <TopBarContainer>
          <SearchInputWrapper>
            <Input
                type="text"
                value={searchInput}
                onChange={handleSearchInputChange}
                onKeyDown={handleSearch}
                placeholder="Search messages..."
            />
            {searchInput && (
                <ClearButton onClick={handleClearSearch}>X</ClearButton>
            )}
          </SearchInputWrapper>
        </TopBarContainer>

        <ChatMessagesWrapper >
          {messages.map((msg) => (
              <ChatMessage
                  key={msg.messageId}
                  $sender={msg.userId === userId}
                  onContextMenu={msg.deleted ? undefined : (e) => {handleContextMenu(e, msg.messageId, msg.userId); setContextMenuMessageId(msg.messageId); setContextMenuTagPopout(false);}
                  }
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
            <ContextMenuWrapper $x={window.innerWidth - contextMenu.x} $y={contextMenu.y}>
            <ContextMenu
                ref={contextMenuRef}>
              <ContextMenuItem onMouseOver={() => setContextMenuTagPopout(false)} onClick={() => handleUpdateMessage(contextMenu.messageId, contextMenu.msguserId)}>
                Update
              </ContextMenuItem>
              <ContextMenuItem onMouseOver={() => setContextMenuTagPopout(false)} onClick={() => handleDeleteMessage(contextMenu.messageId, contextMenu.msguserId)}>
                Delete
              </ContextMenuItem>
              <ContextMenuItem onMouseOver={() => setContextMenuTagPopout(true)}>
                Tags
              </ContextMenuItem>
            </ContextMenu>
              {contextMenuTagPopout ?
                  <ContextMenuPopout $index={2}>
                    {tags || tags === null ?
                        <>
                          <ContextMenuTagInput placeholder="Insert Tag Name" id={"tag_input"} onKeyDown = {(e) => handleTagInput(e)}/>
                          { tags ?
                              tags.filter(tag => tag !== null).map(
                                  (tag, i) => (
                                      <ContextMenuItem key={i}>
                                        {tag == "" ? " " : tag}
                                        <ContextMenuExitButton id = {"tag_button"} onClick = {(e) => handleDeleteTag(e, i)}>
                                          X
                                        </ContextMenuExitButton>
                                      </ContextMenuItem>
                                  )) : <></>}
                        </>
                        : <ContextMenuItem>Loading...</ContextMenuItem>
                    }
                  </ContextMenuPopout>
                  : <></>
              }

            </ContextMenuWrapper>
        )}
      </ChatContainer>
  );
}

const SearchInputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
`;

const ClearButton = styled.button`
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  font-size: 16px;
  color: gray;
  cursor: pointer;

  &:hover {
    color: black;
  }
`;

const ContextMenuExitButton = styled.button`
  border: none;
  font: inherit;
  outline: inherit;
  height: inherit;
  position: absolute;
  text-align: center;

  padding: .2rem .3rem;
  top: 0;
  right: 0;
  visibility: hidden;
  background-color: lightgray;

  &:hover {
    cursor: pointer;
    background-color: gray !important;
  }

`;
const ContextMenuItem = styled.div`
  position: relative;
  text-align: left;
  border-bottom-style: solid;
  border-bottom-width: 1px;
  border-bottom-color: gray;
  font-size: 14px;

  &:hover {
    transition: background-color 250ms linear;
    background-color: darkgray;

  }
  &:hover > ${ContextMenuExitButton}{
    visibility: visible;
    background-color: darkgray;
    transition: background-color 250ms linear;
  }

  &:last-child {
    border-bottom-style: none;
  }

  padding: 0.2rem 0.5rem 0.2rem 0.2rem;
`

const ContextMenuTagInput = styled.input`
  background-color: lightgray;
  border-width: 0;

  margin: 0;
  text-align: left;
  border-bottom-style: solid;
  border-bottom-width: 1px;
  border-bottom-color: gray;
  font-size: 14px;
  width: 100%;

  &:hover {
    transition: background-color 250ms linear;
    background-color: darkgray;
  }

  &:last-child {
    border-bottom-style: none;
  }
  &:focus {
    outline: none;
    background-color: darkgray;

  }
  padding: 0.2rem 0.5rem 0.2rem 0.2rem;
`

const ContextMenu = styled.div`

  background-color: lightgray;
  border-color: dimgray;
  border-style: solid;
  border-width: 1px;
  display: flex;
  flex-direction: column;
  height: max-content;
`;
const ContextMenuPopout = styled.div<{$index: number}>`
    margin-top: ${(props) => "calc(" + props.$index + "* calc(21px + 0.4rem) + 1px)"};
    background-color: lightgray;
    border-color: dimgray;
    border-style: solid;
    border-width: 1px;
    height: max-content;
    width: min-content;
    min-width: 150px;
    
`;

const ContextMenuWrapper = styled.div<{$x: number, $y: number}>`
    position: fixed;
    z-index: 2;
    right: ${(props) => props.$x}px;
    top: ${(props) => props.$y}px;
    display: flex;
    flex-direction: row-reverse;
`;

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow-y: auto;

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
  margin: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
`;

//step1: added the styled component for the top bar container
const TopBarContainer = styled.div`
  display: flex;
  padding: 0.5rem;
  position: sticky;
  top: 0;
  background-color: white;

`;

