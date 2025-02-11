import styled from 'styled-components'
const ChatContainer = styled.div`
    display: flex;
    flex-direction: column;
    gap: 5px;
    width: 100%;
    height: 100%;
    overflow-y: auto;
    container-type: inline-size;
    container-name: chatContainer;
    &::-webkit-scrollbar {
        width: 8px;
    }

    &::-webkit-scrollbar-thumb {
        background: #888;
        border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: #555;
    } 
`
const ChatMessagesWrapper = styled.div`
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end; 
`
const ChatMessage = styled.div<{$sender?:boolean}>`
    display: flex;
    flex-shrink: 0; 
    width: 80%;
    height: fit-content;
    margin-top: 1rem;
    margin-right: ${props => props.$sender? '1rem':'auto'};
    margin-left: ${props => props.$sender? 'auto':'1rem'};
    justify-content: ${props => props.$sender? 'right': 'left'};

    display: flex;
    flex-direction: row;
    @container chatContainer (max-width: 200px){
        margin-right: ${props => props.$sender? '0rem':'auto'};
        margin-left: ${props => props.$sender? 'auto':'0rem'};
    }
    visibility: visible;
    @container chatContainer (max-width: 8rem){
        visibility: hidden;
    }

`
const Chat_Body = styled.div<{$sender?:boolean}>`
    
    background-color: ${props => props.$sender? 'cadetblue':'tan'};
    margin-left: ${props => props.$sender? 0:'.5rem'};
    margin-right: ${props => props.$sender? '.5rem':0};
    padding: 0.5rem;
    padding-right: 1rem;
    border-radius: 20px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    
    max-width: 80%;
    min-width: fit-content;
    
    overflow: hidden;
    word-wrap: break-word;
    -webkit-hyphens: auto;
    -ms-hyphens: auto;
    -moz-hyphens: auto;
    hyphens: auto;
    @container chatContainer (max-width: 8rem){
        visibility: hidden;
    }
    
`
const Chat = styled.span`
    
    visibility: visible;
    @container chatContainer (max-width: 8rem){
        visibility: hidden;
    }
`
const ChatSender = styled.div`
    font-size: 8pt;
    margin-top: 4px; 
    @container chatContainer (max-width: 8rem){
        visibility: hidden;
    }
`

const ChatTimeStamp = styled.div`
    font-size: 8pt;
    color: red;
    margin-top: 2px; 
    @container chatContainer (max-width: 8rem){
        visibility: hidden;
    }
`

const ProfilePicture = styled.img`
    width: 0px;
    height: 50px;
    border-radius: 50%;
    visibility: hidden;
    @container chatContainer (min-width: 200px){
        visibility: visible;
        width: 50px;
    }
`
const InputContainer = styled.div`
    display: flex;
    width: calc(100% - 1rem);
    padding: 0.5rem;
    background: #f0f0f0;
    border-top: 1px solid #ccc;
    position: sticky;
    bottom: 0;
`

const Input = styled.input`
    flex: 1;
    height: 2rem;
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 5px;
`
import { useState, useRef, useEffect } from 'react';

export default function ChatPanel() {

    const initialMessages = [
        { sender: false, message: "Hello!" },
        { sender: true, message: "How are you?" },
        { sender: false, message: "Well." },
        { sender: false, message: "Just have some issues with implementation." }
    ];
    
    const [chats, setChats] = useState(initialMessages);
    const [input, setInput] = useState('');
    const chatEndRef = useRef<HTMLDivElement | null>(null); 

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chats]);

    const handleSendMessage = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && input.trim()) {
            setChats([...chats, { sender: chats.length % 2 === 1, message: input.trim() }]);
            setInput('');
        }
    };

    return (
        <ChatContainer>
            <ChatMessagesWrapper>
                {chats.map((chat, i) => (
                    <ChatMessage key={i} $sender={chat.sender}>
                        {!chat.sender && <ProfilePicture src={'/default_user.svg'} alt="User" />}
                        <Chat_Body $sender={chat.sender}>
                            <div>{chat.message}</div>
                            <ChatSender>{chat.sender ? 'You' : 'Dr. Patitz'}</ChatSender>
                            <ChatTimeStamp>{new Date().toLocaleTimeString()}</ChatTimeStamp>
                        </Chat_Body>
                        {chat.sender && <ProfilePicture src={'/default_user.svg'} alt="User" />}
                    </ChatMessage>
                ))}
                <div ref={chatEndRef} /> {/* Added to ensure auto-scroll works */}
            </ChatMessagesWrapper>
            <InputContainer>
                <Input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleSendMessage}
                    placeholder="Type a message..."
                />
            </InputContainer>
        </ChatContainer>
    );
}
