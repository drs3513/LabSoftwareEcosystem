import React, {useEffect, useRef, useState} from "react";
import {Button} from "@aws-amplify/ui-react";
import styled from "styled-components";
import {useGlobalState} from "@/app/GlobalStateContext";
import {
    elevateUserToAdmin,
    getUserRole,
    listUsersInProject, removeWhitelistedUser, revokeUserAdmin,

    whitelistUser
} from "@/lib/whitelist";
import {generateClient} from "aws-amplify/api";
import type {Schema} from "@/amplify/data/resource";
import PopoutPanel from "./popout_panel"

enum Role {
    NONE = "NONE",
    USER = "USER",
    ADMIN = "ADMIN",
    HEAD = "HEAD",
}
interface props {
    projectId: string,
    projectName: string,
    displayed: boolean,
    close: () => void,
    initialPosX: number,
    initialPosY: number


}

export default function WhitelistPanel({projectId, projectName, displayed, close, initialPosX, initialPosY}: props) {
    const {userId} = useGlobalState()
    const [users, setUsers] = useState<Array<{ userId: string; username: string; email: string }>>([]);
    const [potentialUsers, setPotentialUsers] = useState<Array<{ userId: string; username: string; email: string }>>([]);
    const client = generateClient<Schema>();
    const [contextMenuUser, setContextMenuUser] = useState<{ userId: string; username: string; email: string } | undefined>(undefined);
    const [contextMenuPosition, setContextMenuPosition] = useState<number[]>([0,0])
    const [contextMenuUserRole, setContextMenuUserRole] = useState<Role | undefined>(undefined)
    const [loadingDropDownUsers, setLoadingDropdownUsers] = useState<boolean>(false)
    const role = useRef<Role | undefined>(undefined)

    async function handleMakeAdmin() {
        if (!projectId) {
            alert("No project selected.");
            return;
        }
        const role = await getUserRole(projectId!, userId!);
        if (role !== Role.HEAD) {
            alert("Only the project head can elevate users to admin.");
            return;
        }
        if (!contextMenuUser || !projectId) {
            alert("No user selected or project ID is missing.");
            return;
        }
        if (!role) {
            alert("Error with current user's role.");
            return;
        }
        if (contextMenuUserRole === Role.ADMIN) {
            alert("User is already an admin.");
            return;
        }
        const response = await elevateUserToAdmin(projectId, contextMenuUser.userId);
        if (!response) {
            alert("Error elevating user to admin. Please try again later.");
            return;
        }
        setContextMenuUser(undefined);
    }

    async function handleRevokeAdmin() {
        if (!projectId) {
            alert("No project selected.");
            return;
        }
        const role = await getUserRole(projectId!, userId!);
        if (role !== Role.HEAD) {
            alert("Only the project head can revoke admin rights.");
            return;
        }
        if (!contextMenuUser || !projectId) {
            alert("No user selected or project ID is missing.");
            return;
        }
        if (!role) {
            alert("Error with current user's role.");
            return;
        }
        if (contextMenuUserRole !== Role.ADMIN) {
            alert("User is not an admin.");
            return;
        }
        const response = await revokeUserAdmin(projectId, contextMenuUser.userId);
        if (!response) {
            alert("Error revoking admin rights. Please try again later.");
            return;
        }
        setContextMenuUser(undefined);
    }

    async function handleRemoveUser() {
        if (!projectId) {
            alert("No project selected.");
            return;
        }
        const role = await getUserRole(projectId!, userId!);
        if (role !== Role.HEAD && role !== Role.ADMIN) {
            alert("Only the project head or admins can remove users.");
            return;
        }
        if (!contextMenuUser || !projectId) {
            alert("No user selected or project ID is missing.");
            return;
        }
        if (!role) {
            alert("Error with current user's role.");
            return;
        }
        const success = await removeWhitelistedUser(projectId, contextMenuUser.userId, role);
        if (success) {
            alert("User removed from whitelist successfully!");
        } else {
            alert("Error removing user from whitelist. Please try again later.");
        }
    }


    const fetchUsers = async () => {
        if(!userId) return
        try {
            if(!role.current){
                role.current = await getUserRole(projectId, userId);
            }
            if (!role.current) {
                //console.log("User " + userId + " does not have a role for project " + props.projectId);
                return;
            }
            const response = await listUsersInProject(projectId, true);
            if (response) {
                //console.log("Fetched users:", response);
                setUsers(response.map(obj => ({userId: obj.userId, email: obj.email, username: obj.username})));
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const observeWhitelistedUsers = () => {
        const subscription = client.models.Whitelist.observeQuery({
            filter: {
                projectId: {eq: projectId}
            },
        }).subscribe({

            next: async () => {
                await fetchUsers()
            },
            error: (error) => {
                console.error("[ERROR] Error observing users:", error);
            },
        });

        return () => subscription.unsubscribe();
    };
    useEffect(() => {
        if (displayed && userId) {
            fetchUsers();
            const unsubscribe = observeWhitelistedUsers();

            return () => unsubscribe();
        }
    }, [displayed, userId]);




    async function handleWhitelistUser(addingUserId: string, addingUserEmail: string) {
        const role = await getUserRole(projectId, userId!)
        if (role !== Role.HEAD && role !== Role.ADMIN) {
            alert("Only the project head or admins can whitelist users.");
            return;
        }
        const success = await whitelistUser(projectId, addingUserId , Role.USER);
        if (success) {
            alert(addingUserEmail + " successfully whitelisted to project");
            setPotentialUsers(potentialUsers.filter((user) => user.userId !== addingUserId))
        } else {
            alert("Issue adding user to whitelist. Please try again later.");
        }

    }

    async function handleGetWhitelistableUsers() {
        if(potentialUsers.length > 0){
            setPotentialUsers([])
            return
        }
        setLoadingDropdownUsers(true)
        //console.log("Here")
        const usersFound = await listUsersInProject(projectId, false)
        setLoadingDropdownUsers(false)
        //console.log(usersFound)
        if(!usersFound) return
        setPotentialUsers(usersFound.map(user => ({userId: user.userId, username: user.username, email: user.email})))
    }

    async function createContextMenu(e: React.MouseEvent<HTMLDivElement>, user: { userId: string; username: string; email: string }){
        e.preventDefault()
        setContextMenuUser(user)
        setContextMenuPosition([e.clientX, e.clientY])
        setContextMenuUserRole(undefined)
        setContextMenuUserRole(await getUserRole(projectId, user.userId))

        return
    }

    function compareRoles() {
        if(role.current == Role.USER || role.current == Role.NONE){
            return false
        }
        if(role.current == Role.ADMIN){
            return contextMenuUserRole == Role.USER || contextMenuUserRole == Role.NONE
        }
        return role.current == Role.HEAD;


    }

    function roleToCamelCase(toConvertRole: Role) {
        if(toConvertRole == Role.HEAD){
            return "Head"
        }
        if(toConvertRole == Role.ADMIN) {
            return "Admin"
        }
        if(toConvertRole == Role.USER) {
            return "User"
        }
        return "None?"
    }
    useEffect(() => {
        const handleClickOutside = () => {
            setContextMenuUser(undefined);
            setContextMenuUserRole(undefined)
            setContextMenuPosition([0,0])
        };
        document.addEventListener("click", handleClickOutside);
        document.addEventListener("contextmenu", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
            document.removeEventListener("contextmenu", handleClickOutside);
        };
    }, [contextMenuUser]);
    return (
        <>
        <PopoutPanel
            initialPosX={initialPosX}
            initialPosY={initialPosY}
            close={close}
            header={`Whitelist | ${projectName}`}
        >
            <ViewContainer>
                <UserButton onClick={handleGetWhitelistableUsers}>Add User
                    {
                        potentialUsers.length > 0 ? (
                                <Dropdown>
                                    {
                                        potentialUsers.map((user) => ((
                                            <UserItem
                                                key={user.userId}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent the click from closing the panel
                                                    handleWhitelistUser(user.userId, user.email)
                                                }}

                                            >
                                                <strong>{user.username}</strong> ({user.email})
                                            </UserItem>
                                        )))
                                    }
                                </Dropdown>
                            ): loadingDropDownUsers && (
                            <Dropdown>
                                <UserItem>
                                    Loading...
                                </UserItem>
                            </Dropdown>
                            )

                    }

                </UserButton>
                <UserList>

                     {users.length > 0 ? users.map((user) => (
                        <UserItem
                            key={user.userId}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent the click from closing the panel

                            }}
                            onContextMenu={(e) => createContextMenu(e, user)}
                        >
                            <strong>{user.username}</strong> ({user.email})
                        </UserItem>
                    )) : (
                        <UserItem>
                            Loading...
                        </UserItem>
                     )}
                </UserList>
            </ViewContainer>

        </PopoutPanel>

        {contextMenuUser ?
            <ContextMenuWrapper $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                <ContextMenu>
                    <ContextMenuItem>
                        {`Username: ${contextMenuUser.username}`}
                    </ContextMenuItem>
                    <ContextMenuItem>
                        {`Email: ${contextMenuUser.email}`}
                    </ContextMenuItem>
                    {
                        contextMenuUserRole ? (
                                <>
                                    <ContextMenuItem>
                                        {`Role: ${roleToCamelCase(contextMenuUserRole)}`}
                                    </ContextMenuItem>
                                    {
                                        contextMenuUser.userId == userId ? (
                                            <ContextMenuItem>
                                                This is You!
                                            </ContextMenuItem>
                                        ) :
                                            (
                                                <>
                                                    {
                                                        role.current == Role.HEAD && (
                                                            <>
                                                                <ContextMenuItem onClick={handleMakeAdmin}>
                                                                    Make Admin
                                                                </ContextMenuItem>
                                                                <ContextMenuItem onClick={handleRevokeAdmin}>
                                                                    Revoke Admin
                                                                </ContextMenuItem>
                                                                <ContextMenuItem onClick={handleRemoveUser}>
                                                                    Remove User
                                                                </ContextMenuItem>
                                                            </>
                                                        )
                                                    }
                                                    {
                                                        role.current == Role.ADMIN && compareRoles() && (
                                                            <>
                                                                <ContextMenuItem onClick={handleMakeAdmin}>
                                                                    Make Admin
                                                                </ContextMenuItem>
                                                                <ContextMenuItem onClick={handleRevokeAdmin}>
                                                                    Revoke Admin
                                                                </ContextMenuItem>
                                                                <ContextMenuItem onClick={handleRemoveUser}>
                                                                    Remove User
                                                                </ContextMenuItem>
                                                            </>
                                                        )


                                                    }
                                                </>
                                            )

                                    }

                                </>


                            ) :
                            (
                                <ContextMenuItem>
                                    {`Loading...`}
                                </ContextMenuItem>
                            )
                    }

                </ContextMenu>
            </ContextMenuWrapper>
            :
            undefined
        }
        </>
    );
}
const ViewContainer = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: center;
`

const UserButton = styled(Button)`
    
    margin-left: auto;
    margin-right: auto;
    margin-top: .5rem;
    margin-bottom: .5rem;
    display: flex;
    justify-content: center;
    

    
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
  position: fixed;
  top: 5.5rem;
  width: fit-content;
  background-color: white;
  color: black;
  border: 1px solid black;
  border-radius: 5px;
  z-index: 10;
    font-weight: normal;
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

  &:last-child {
    border-bottom-style: none;
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
    max-height: 300px; /* Add this */
    overflow-y: auto;   /* Add this */
`;

const ContextMenuWrapper = styled.div<{$x: number, $y: number}>`
    position: fixed;
    z-index: 152;
    left: ${(props) => props.$x}px;
    top: ${(props) => props.$y}px;
    display: flex;
    flex-direction: row;
`;