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
import {ContextMenu, RightContextMenuWrapper, ContextMenuItem, ContextMenuPopout, ContextMenuTagInput, ContextMenuExitButton} from '@/app/main_screen/context_menu_style'

const client = generateClient<Schema>();

interface messageInfo {
  messageId: string;
  userId: string;
  content: string;
  createdAt: string;
  edited: Nullable<boolean> | undefined;
  deleted: Nullable<boolean> | undefined;
  email?: string;
}

export default function ChatPanel() {
  const { projectId, userId, messageThread} = useGlobalState();
  const [messages, setMessages] = useState<messageInfo[]>([]);
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
  const [search, setSearch] = useState<boolean>(false)
  //for getting the messages
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [refreshSearch, setRefreshSearch] = useState(false);
  const routerSearchParams = useSearchParams()
  //for updating messages
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");


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

  /**
 * Fetches messages for the current message thread (file or project).
 * Sorts messages by creation time, enriches with user email, handles pagination,
 * and updates the messages state.
 */
  async function fetchMessages() {
    console.log("Fetching")
    if (!messageThread ) return;
    let response
    if(messageThread.type == 0) {
      response = await getMessagesByFileIdAndPagination(messageThread.id, undefined, nextToken);
    } else {
      response = await getMessagesByFileIdAndPagination(undefined, messageThread.id, nextToken)
    }

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
    console.log("Fetched")
    ////console.log("Fetched messages:", messages);
    // Sort messages by createdAt timestamp
    if (messages && messages.length > 0) {
      const sortedMessages = messages.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      let temp_messages: Array<messageInfo> = [];
      for (let msg of sortedMessages) {
        console.log(msg)
        console.log("Message of Sorted")
        if (msg) {
          temp_messages = [...temp_messages,
            {
              messageId: msg.messageId,
              userId: msg.userId,
              content: msg.content,
              createdAt: msg.createdAt,
              edited: msg.isUpdated,
              deleted: msg.isDeleted,
              email: (await client.models.User.get({ userId: msg.userId }))?.data?.username ?? "Unknown",
            },
          ];
        }
      }

      // Append new messages to state
      setMessages([...temp_messages]);
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

/**
 * Handles scroll events in the chat window.
 * If the user scrolls to the top and more messages are available, fetches older messages.
 *
 * @param {React.UIEvent<HTMLDivElement>} e - Scroll event triggered in the chat panel.
 */  const handleScroll = async (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && hasNextPage ) {
      ////console.log("Fetching more messages...");
      //await fetchMessages();
    }
  };

  /**
 * Subscribes to changes in messages linked to a specific file ID.
 * Triggers a message refresh on updates. Useful for real-time syncing.
 *
 * @returns {() => void} Cleanup function to unsubscribe from updates.
 */
  const observeMessagesOnFileId = () => {
    const subscription = client.models.Message.observeQuery({
      filter: {
        fileId: {eq: messageThread!!.id},
      },
    }).subscribe({

      next: async ({items}) => {
        await fetchMessages()
      },
      error: (error) => {
        console.error("[ERROR] Error observing files:", error);
      },
    });

    return () => subscription.unsubscribe();
  };

  /**
 * Subscribes to changes in messages linked to a specific project ID.
 * Triggers a message refresh on updates. Useful for real-time syncing.
 *
 * @returns {() => void} Cleanup function to unsubscribe from updates.
 */
  const observeMessagesOnProjectId = () => {
    const subscription = client.models.Message.observeQuery({
      filter: {
        projectId: {eq: messageThread!!.id},
      },
    }).subscribe({

      next: async ({items}) => {
        await fetchMessages()
      },
      error: (error) => {
        console.error("[ERROR] Error observing files:", error);
      },
    });

    return () => subscription.unsubscribe();
  };

/**
 * Effect that runs whenever the messageThread changes.
 * - Resets pagination token and clears messages.
 * - Fetches initial messages for the new thread.
 * - Subscribes to real-time message updates based on thread type.
 * - Cleans up the subscription on component unmount or when the thread changes.
 */
  useEffect(() => {
    if (messageThread) {
      console.log("Fetching messages for fileId:", messageThread.id);
      setNextToken(null); // Reset nextToken when fileId changes
      setMessages([]); // Clear messages when fileId changes
      fetchMessages();
      if(messageThread.type == 0){
        const unsubscribe = observeMessagesOnFileId();
        return () => unsubscribe();
      } else {
        const unsubscribe = observeMessagesOnProjectId();
        return () => unsubscribe();
      }
    }
  }, [messageThread]);

  /**
 * Effect that runs whenever messages are updated.
 * Scrolls to the bottom of the chat panel to ensure the latest message is visible.
 */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);



/**
 * Asynchronously fetches messages based on the current search terms and thread type.
 * - Performs keyword and tag-based searches on either file or project threads.
 * - Resolves usernames for each message author.
 * - Updates the state with the search result or clears it if no matches.
 *
 * @returns {Promise<messageInfo[]>} An array of messageInfo objects or an empty array.
 */
  async function fetchMessagesWithSearch() {
    //setLoading(true)
    if (!messageThread ) return;
    //console.log("Fetching messages with search term:", searchTerm, "tagSearchTerm:", tagSearchTerm, "authorSearchTerm:", authorSearchTerm);
    let searchedMessages

    if(messageThread.type == 0) {
      searchedMessages = await searchMessages(messageThread.id, undefined, searchTerm, tagSearchTerm);
    } else {
      searchedMessages = await searchMessages(undefined, messageThread.id, searchTerm, tagSearchTerm);
    }
    //console.log("Fetched messages:", searchedMessages);
    if(searchedMessages && searchedMessages.length > 0){
      let temp_messages: Array<messageInfo> = []
      for(let msg of searchedMessages){
        if(msg){
          temp_messages = [...temp_messages,
            {
              messageId: msg.messageId,
              userId: msg.userId,
              content: msg.content,
              createdAt: msg.createdAt,
              edited: msg.isUpdated,
              deleted: msg.isDeleted,
              email: (await client.models.User.get({ userId: msg.userId }))?.data?.username ?? "Unknown"
            }] }}
      setMessages(temp_messages);
      //setLoading(false);
      return temp_messages
    } else {
      setMessages([])
      return []
    }
  }
  /**
   * Effect triggered when the `search` flag changes.
   * If active, fetches filtered messages. Otherwise, fetch messages of the current file or project.
   */
  useEffect(() => {
    console.log("ACK SEARCH")
    if (search) {
      //console.log("Searching...");
      fetchMessagesWithSearch();
    } else {
      //console.log("Fetching old messages when input is empty");
      fetchMessages(); // restore full messages when no filters
    }
  }, [search]);

  /**
   * Effect triggered when `refreshSearch` flag is true.
   * Re-fetches filtered messages and resets the flag.
   */
  useEffect(() => {
    if(search && refreshSearch) {
      fetchMessagesWithSearch()
      setRefreshSearch(false)
    }
  }, [refreshSearch])

  /**
   * Effect that scrolls the chat to the bottom whenever new messages are added.
   */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
 * Effect that adds event listeners to close the context menu and tag popout
 * when clicking outside or moving the mouse away from them.
 */
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

  /**
   * Sends a new message to the server and updates the local message list.
   * - Validates input and message thread presence.
   * - Calls API to create message.
   * - Fetches and attaches the author's username.
   * - Appends new message to local state.
   */
  const handleSendMessage = async () => {
    if (!input.trim()) {
      //console.log("Message input is empty. Aborting send.");
      return;
    }
    if (!messageThread || !userId) {
      console.error("No MessageThread selected?");
      return;
    }
    //console.log("Sending message with the following data:");
    //console.log("fileId:", fileId);
    //console.log("userId:", userId);
    //console.log("projectId:", projectId);
    //console.log("content:", input.trim());
  
    try {
      const response = await createMessage(messageThread.id, userId, input.trim(), messageThread.type);
      console.log(response)
  
      if (!response || !response.data) {
        new Error("createMessage returned undefined");
        return
      }

      const newMessage = {
        messageId: response.data.messageId,
        userId: response.data.userId,
        content: response.data.content,
        createdAt: response.data.createdAt,
        edited: response.data.isUpdated,
        deleted: response.data.isDeleted,
        email: (await client.models.User.get({ userId: response.data.userId }))?.data?.username ?? "Unknown"
      }

      console.log(newMessage)
      if (!newMessage || !("messageId" in newMessage && "content" in newMessage)) {
        console.error("Invalid message response:", response);
        return;
      }

      //console.log("Successfully sent message:", newMessage);
  
      setMessages([...messages, newMessage]);
      setInput("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  
  /**
   * Handles the right-click context menu for a message.
   * @param {React.MouseEvent} e - The mouse event.
   * @param {string} messageId - The ID of the clicked message.
   * @param {string} msguserId - The user ID of the message owner.
   */
  const handleContextMenu = (e: React.MouseEvent, messageId: string, msguserId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, messageId, msguserId });
  };

  /**
   * Updates a message's content if the user is authorized.
   * @param {string} messageId - The ID of the message to update.
   * @param {string} newContent - The new content to set.
   * @param {string} messageuserId - The ID of the message's owner.
   */
  const handleUpdateMessage = async (messageId: string, newContent: string, messageuserId: string)=> {
    setContextMenuTagPopout(false); // Close the tag popout if it's open
    if(messageuserId != userId){
      alert("You do not have acces to this message");
      return;
    }
    //const newContent = prompt("Enter new message content:");
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

  /**
   * Deletes a message by setting its content to an empty string and marking it as deleted.
   * @param {string} messageId - The ID of the message to delete.
   * @param {string} messageuserId - The ID of the message's owner.
   */
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

  /**
   * Handles the Enter key press when sending a message.
   * @param {React.KeyboardEvent<HTMLInputElement>} e - The keyboard event.
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };
 
  /**
   * Handles tagging a message when Enter is pressed in the tag input.
   * @param {React.KeyboardEvent<HTMLInputElement>} e - The keyboard event.
   */
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

  /**
   * Clears all search input and resets search-related state.
   */
  const handleClearSearch = () => {
    setSearchInput(""); // Clear the input value
    setTagSearchTerm([]);
    setAuthorSearchTerm([]);
    setSearchTerm([]);
    setSearch(false);
  };

  /**
   * Updates the search input value.
   * @param {React.ChangeEvent<HTMLInputElement>} e - The input change event.
   */
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.value.length == 0){
      setSearch(false)
    }
    setSearchInput(e.target.value);

  };

  /**
   * Executes a search on Enter key based on input terms.
   * Supports tag (#), author (&), and content search.
   * @param {React.KeyboardEvent<HTMLInputElement>} e - The keyboard event.
   */
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log(e.key)
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
      setSearch(true)
      setRefreshSearch(true)
      //console.log("Search terms:", temp_name_set);
    }
  };

  /**
   * Fetches tags associated with the currently selected message.
   */
  async function fetchTagsForMessage() {
    if( !contextMenuMessageId) {
      setTags([]);
      return [];
    }
    // Fetch tags for the current message
    const messageTags = await getTagsForMessage(contextMenuMessageId);
    setTags(messageTags)
  }

  /**
   * Subscribes to tag updates for the current message using Amplify's observeQuery.
   * @returns {() => void} - A function to unsubscribe from the observer.
   */
  const observeTags = () => {
    const subscription = client.models.Message.observeQuery({
      filter: {messageId: {eq: contextMenuMessageId ? contextMenuMessageId : undefined}},
      selectionSet: ["tags"]
    }).subscribe({
      next: async({items}) => {
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

  /**
   * Handles the submit action after editing a message's content.
   * @param {string} id - The ID of the message.
   * @param {string} newContent - The updated message content.
   * @param {string} messageuserId - The ID of the message's author.
   */
  useEffect(() => {
    if(contextMenuMessageId) {
      fetchTagsForMessage()
      const unsubscribe = observeTags()
      return () => unsubscribe();
    }
  }, [contextMenuMessageId]);

/**
 * Handles the submission of an edited message.
 * Closes the context menu and tag popout, checks if the user has permission to edit the message,
 * and then calls the update function for the message if the user is authorized.
 *
 * @param {string} id - The ID of the message to be updated.
 * @param {string} newContent - The new content of the message.
 * @param {string} messageuserId - The ID of the user who owns the message.
 * 
 * @returns {void} This function doesn't return anything. It performs side effects like closing menus and updating the message.
 */
  const handleEditSubmit = (id: string, newContent: string, messageuserId: string) => {
    setContextMenuTagPopout(false); // Close the tag popout if it's open
    if(messageuserId != userId){
      alert("You do not have acces to this message");
      return;
    }
    setContextMenu(null); // Close the context menu
    handleUpdateMessage(id, newContent, messageuserId); 
  };

  /**
   * Deletes a tag from the tag list for the current message.
   * @param {React.MouseEvent<HTMLButtonElement>} e - The button click event.
   * @param {number} tagIndex - The index of the tag to delete.
   */
  const handleDeleteTag = async ( e: React.MouseEvent<HTMLButtonElement>, tagIndex: number) => {
    e.stopPropagation(); // Prevent the context menu from closing
    if(!contextMenuMessageId) return
    updateMessageTags(contextMenuMessageId, tags.filter((tag, i) => i !== tagIndex))
    setTags(tags.filter((tag, i) => i !== tagIndex));
    //fetchTagsForMessage(); // Fetch tags again after deletion
    console.log("Tag deleted successfully.");
  };


  if(messageThread) {
    return (
        <ChatContainer onScroll={handleScroll}>
          <TopBarContainer>
            <MessagePanelHeader>
              {messageThread.label}
            </MessagePanelHeader>
            <MessagePanelPath>
              {messageThread.path}
            </MessagePanelPath>
            <SearchInputWrapper>
              <Input
                  type="text"
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  onKeyDown={handleSearch}
                  placeholder="Search messages..."
              />
              {search && (
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
                  {!msg.deleted ? (
              <Chat_Body $sender={msg.userId === userId}>
                {editingMessageId === msg.messageId ? (
                  <ChatEditInput
                    value={editContent}
                    autoFocus
                    onChange={(e) => {setEditContent(e.target.value); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleEditSubmit(msg.messageId, editContent, msg.userId); // You implement this
                        setEditingMessageId(null);
                      } else if (e.key === "Escape") {
                        setEditingMessageId(null);
                      }
                    }}
                    onBlur={() => setEditingMessageId(null)}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "0.375rem",
                      width: "100%",
                      border: "1px solid #ccc",
                    }}
                  />
                ) : (
                  <>
                    <div>{msg.content}</div>
                    <ChatSender>{msg.userId === userId ? "You" : msg.email}</ChatSender>
                    <ChatTimeStamp>
                      {new Date(msg.createdAt).toLocaleDateString()}{" "}
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </ChatTimeStamp>
                    {msg.edited && <ChatUpdateStatus>Edited</ChatUpdateStatus>}
                  </>
                )}
              </Chat_Body>
            ) : (
              <DeletedMessageBox>Message deleted</DeletedMessageBox>
            )}

                </ChatMessage>
            ))}
            <div ref={chatEndRef} />
          </ChatMessagesWrapper>
          <InputContainer>
            <Input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type a message..." />
          </InputContainer>
          {contextMenu && (
              <RightContextMenuWrapper $x={window.innerWidth - contextMenu.x} $y={contextMenu.y}>
                <ContextMenu
                    ref={contextMenuRef}>
                  <ContextMenuItem onClick={() => {
                    setEditingMessageId(contextMenu.messageId); 
                    const targetMsg = messages.find((m) => m.messageId === contextMenu.messageId);
                    setContextMenu(null); // Close the context menu
                    setEditContent(targetMsg?.content || "")}}>
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

              </RightContextMenuWrapper>
          )}
        </ChatContainer>
    );
  } else {
    return (
        <FullPanelHeader>

          Right click a project, or file to open a message thread!
        </FullPanelHeader>

    )
  }

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
  position: sticky;
  bottom: 0;
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
  flex-direction: column;
  padding: 0.5rem;
  position: sticky;
  top: 0;
  background-color: white;

`;

const FullPanelHeader = styled.h3`
  font-weight: normal;
  width: 100%;
  height: 100%;
  text-align: center;
  pointer-events: none;
  user-select: none;
`;

const MessagePanelHeader = styled.div`
  font-size: large;
  width: 100%;
  text-align: center;
  font-weight: normal;
  padding-bottom: 0.2rem;
`;

const MessagePanelPath = styled.div`
  font-size: small;
  width: 100%;
  text-align: center;
  font-weight: normal;
  color: gray;
  
`;

const ChatEditInput = styled.input`
  padding: 0.5rem;
  border-radius: 0.375rem;
  width: 100%;
  border: 1px solid #ccc;
  font-size: 1rem;
  outline: none;

  &:focus {
    border-color: #888;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
  }
`;
