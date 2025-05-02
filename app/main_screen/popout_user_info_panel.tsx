import styled from "styled-components";
import React, {useRef, useState, useEffect} from "react";
import PopoutPanel from "./popout_panel"
import {Button} from "@aws-amplify/ui-react";
import { getUsersNotAdmin, getActiveUser } from "@/lib/user"
import {createUser, deleteUser} from "@/lib/auth"
import ConfirmationModal from "./confirmationModal"

interface props {
    initialPosX: number;
    initialPosY: number;
    userId: string;
    close: () => void;
}
interface userInfo{
    userId: string;
    username: string;
    email: string;
    administrator: boolean;
    createdAt: string;
}
export default function UserInfoPanel({ initialPosX, initialPosY, userId, close}: props) {


    const [selectedPanel, setSelectedPanel] = useState<string>("properties")
    const [userInfo, setUserInfo] = useState<userInfo | undefined>(undefined)
    const [deletableUsers, setDeletableUsers] = useState<userInfo[]>([])
    const [emailInput, setEmailInput] = useState<string>("")

    const [sendConfirmation, setSendConfirmation] = useState<string | undefined>(undefined);

    const modalTimer = useRef(setTimeout(() => {}, 500))
    const [confirmationModal, setConfirmationModal] = useState<{user: userInfo, message: string, onResolve: (choice: "Yes" | "No" | null) => void} | undefined>(undefined)
    useEffect(() => {
        if(userId){
            fetchUser()

        }
    }, [userId])
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if(deletableUsers){
                setDeletableUsers([])
            }
        };
        document.addEventListener("click", handleClickOutside);
        document.addEventListener("contextmenu", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
            document.removeEventListener("contextmenu", handleClickOutside);
        };
    }, [deletableUsers]);
    async function fetchUser(){
        const user = await getActiveUser(userId)

        setUserInfo({
            userId: user!!.userId!!,
            username: user!!.username!!,
            email: user!!.email!!,
            administrator: user!!.administrator??false,
            createdAt: user!!.createdAt!!
        })
    }

    async function fetchDeletableUsers(){
        setDeletableUsers([])
        const deletableUsersResponse = await getUsersNotAdmin()
        if(!deletableUsersResponse) return

        setDeletableUsers(deletableUsersResponse.map(user => ({
            userId: user.userId,
            username: user.username,
            email: user.email,
            administrator: user.administrator??false,
            createdAt: user.createdAt
        })))
    }

    async function handleCreateUser(e: React.KeyboardEvent<HTMLInputElement>){
        if(e.key === "Enter"){
            const response = await createUser(emailInput)

            if(!response || response.errors){
                setSendConfirmation(`Failed to invite a new user with the email  \"${emailInput}\". Maybe it was misspelled?`)
            } else {
                setSendConfirmation(`Successfully invited a new user with the email \"${emailInput}\"! They should see an invitation in their inbox soon!`)
            }
        }

    }

    async function handleDeleteUser(user: userInfo){
        let decision = await showConfirmationModal(user, "Are you sure");
        if (decision === "No") return;

        modalTimer.current = setTimeout(async () => {
            decision = await showConfirmationModal(user, "Are you completely sure");
            if (decision === "No") return;

            deleteUser(user.userId, user.email)
            setDeletableUsers(deletableUsers.filter(deletableUser => deletableUser.userId !== user.userId))
        }, 750)


    }
    const showConfirmationModal = (user: userInfo, message: string) => {
        return new Promise<'Yes' | 'No'>(resolve => {
            const cleanup = () => {
                setConfirmationModal(undefined);
            };
            const handleResolve = (choice: "Yes" | "No" | null) => {
                cleanup();
                resolve(choice?? "No");
            };
            setConfirmationModal({user: user, message: message, onResolve: handleResolve})
        });
    };

    function format(date: string) {
        const toFormatDate = new Date(date)
        const dateTimeFormat = new Intl.DateTimeFormat('en', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        return dateTimeFormat.format(toFormatDate)
    }
    return (
        <>
            <PopoutPanel
                header={`User Properties`}
                initialPosX ={initialPosX}
                initialPosY = {initialPosY}
                close = {close}>
                <TopBar>
                    <TopBarItem onClick = {() => setSelectedPanel("properties")}>
                        User Properties
                    </TopBarItem>
                    {
                        userInfo && userInfo.administrator && (
                            <TopBarItem onClick = {() => setSelectedPanel("admin")}>
                                Administration
                            </TopBarItem>
                        )
                    }

                </TopBar>

                <UserInfoWrapper>
                {selectedPanel == "properties" && (
                    <>
                        {
                            userInfo ? (
                                undefined
                            ) : (
                                <p>`loading...`</p>
                            )
                        }
                        {userInfo && (
                            <>
                                <UserInfoRow>
                                    <UserInfo>
                                Current User : {userInfo.username}
                                    </UserInfo>
                                </UserInfoRow>
                                <UserInfoRow>
                                    <UserInfo>
                                        Email : {userInfo.email}
                                    </UserInfo>
                                </UserInfoRow>
                                <UserInfoRow>
                                    <UserInfo>
                                        Joined : {format(userInfo.createdAt)}
                                    </UserInfo>
                                </UserInfoRow>
                                <UserInfoRow>
                                    <UserInfo>
                                        Role : {userInfo.administrator ? "Administrator" : "User"}
                                    </UserInfo>
                                </UserInfoRow>
                            </>
                        )}
                    </>
                )}



                    {
                        selectedPanel == "admin" && userInfo && userInfo.administrator && (
                            <>
                                <UserInfoRow>
                                    <UserButton onClick={fetchDeletableUsers}>
                                        Delete User
                                        {
                                            deletableUsers.length > 0 ? (
                                                <Dropdown>
                                                    {
                                                        deletableUsers.map((user) => ((
                                                            <UserItem
                                                                key={user.userId}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteUser(user)
                                                                }}>
                                                                <strong>{user.username}</strong> ({user.email})
                                                            </UserItem>
                                                        )))
                                                    }
                                                </Dropdown>
                                            ): undefined
                                        }
                                    </UserButton>
                                </UserInfoRow>
                                <UserInfoRow>
                                    <UserInfo style={{marginLeft: "auto", marginRight: "auto"}}>
                                        Invite User
                                    </UserInfo>
                                </UserInfoRow>
                                <UserInfoRow>
                                    <Input placeholder={"Email"} onChange={e => setEmailInput(e.target.value)} onKeyDown={e => handleCreateUser(e)}></Input>
                                </UserInfoRow>
                                {
                                    sendConfirmation && (
                                            <SendConfirmation>
                                                {sendConfirmation}
                                            </SendConfirmation>

                                    )

                                }
                                </>
                            )
                        }
                    </UserInfoWrapper>



            </PopoutPanel>

            {confirmationModal && (
                <ConfirmationModal
                message={`${confirmationModal.message} that you would like to delete the account belonging to ${confirmationModal.user.email}?`}
                onResolve={confirmationModal.onResolve}
                />
            )}
        </>

    );
}

const SendConfirmation = styled.div`
    font-size: small;
    font-weight: normal;
    font-color: gray;
    width: 60%;
    text-align: center;
    height: fit-content;

`
const TopBar = styled.div`
    width: 100%;
    height: fit-content;

    border-bottom: lightgray;
    border-bottom-style: solid;
    border-bottom-width: 2px;
    display: flex;
    flex-direction: row;
    justify-content: space-around;
`

const TopBarItem = styled.div`
    width: fit-content;
    padding-left: .5rem;
    padding-right: .5rem;
    border-right-style: solid;
    border-right-width: 1px;
    border-right-color: lightgray;
    border-left-style: solid;
    border-left-width: 1px;
    border-left-color: lightgray;
    
    &:hover{
        cursor: pointer;
        background-color: lightgrey;
        transition: .5s;
    }
`

const UserInfoWrapper = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: left;
    align-items: center;
`

const UserInfoRow = styled.div`
    display: flex;
    flex-direction: row;
    
    width: 100%;
    height: fit-content;
    
`
const UserInfo = styled.div`
    padding-top: .5rem;
    padding-bottom: .5rem;
    padding-left: 1rem;
    padding-right: 1rem;
`
const InfoButton = styled(Button)`
    margin-left: 1rem;
    height: fit-content;
    align-self: center;
`
const Input = styled.input`
  height: 2rem;
  padding: 0.5rem;
  margin-right: auto;
  margin-left: auto;
  border: 2px solid #ccc;
  border-radius: 5px;
  width: 60%;
`;
const UserButton = styled(Button)`
    margin-left: auto;
    margin-right: auto;
    margin-top: .5rem;
    margin-bottom: 1rem;
    display: flex;
    justify-content: center;
    position: relative;
`

const UserList = styled.div`
    display: flex;
    justify-content: center;
    flex-direction: column;
  max-height: 300px;
  overflow-y: auto;
  border-top: 1px solid black;
`;

const UserItem = styled.div`
  padding: 8px 10px;
  border-bottom: 1px solid #eee;
  &:hover {
    background-color: lightgray;
    cursor: pointer;
  }
`;
const Dropdown = styled.div`
  position: absolute;
  top: 2.5rem;
  width: fit-content;
  background-color: white;
  color: black;
  border: 1px solid black;
  border-radius: 5px;
  z-index: 10;
    font-weight: normal;
`;