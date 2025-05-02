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

    //Role of the right-clicked user
    const [contextMenuUser, setContextMenuUser] = useState<{ userId: string; username: string; email: string } | undefined>(undefined);
    const [contextMenuPosition, setContextMenuPosition] = useState<number[]>([0,0])
    const [contextMenuUserRole, setContextMenuUserRole] = useState<Role | undefined>(undefined)
    const [loadingDropDownUsers, setLoadingDropdownUsers] = useState<boolean>(false)

    //Role of the current user
    const [role, setRole] = useState<Role | undefined>(undefined)

    /**
     * Sets the currently right-clicked user to have the 'Admin' role
     * *Only usable if the current user is atleast an admin*
     **/
    async function handleMakeAdmin() {
        if(!contextMenuUser) return
        const response = await elevateUserToAdmin(projectId, contextMenuUser.userId);
        if (!response) {
            alert("Error elevating user to admin. Please try again later.");
            return;
        }
        setContextMenuUser(undefined);
    }
    /**
     * Sets the currently right-clicked user to have the 'User' role
     * *Only usable if the current user is atleast an admin*
     **/
    async function handleRevokeAdmin() {
        if(!contextMenuUser) return
        const response = await revokeUserAdmin(projectId, contextMenuUser.userId);
        if (!response) {
            alert("Error revoking admin rights. Please try again later.");
            return;
        }
        setContextMenuUser(undefined);
    }
    /**
     * Removes the currently right-clicked user from the project
     * *Only usable if the current user is atleast an admin*
     **/
    async function handleRemoveUser() {
        if(!contextMenuUser) return
        if(!role) return
        const success = await removeWhitelistedUser(projectId, contextMenuUser.userId, role);
        if (success) {
            alert("User removed from whitelist successfully!");
        } else {
            alert("Error removing user from whitelist. Please try again later.");
        }
    }

    /**
     * Retrieves all users whitelisted for the panel's associated projectId
     * If the current user's role in the project is not already known, retrieves that as well
     **/
    const fetchUsers = async () => {
        if(!userId) return
        try {
            if(!role){
                setRole(await getUserRole(projectId, userId))
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
    /**
     * Subscription to the whitelisted users of the panel's associated projectId
     **/
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

    /**
     * useEffect() which fetches users as soon as the panel is displayed, as well as creating a subscription on the
     * currently whitelisted users
     **/
    useEffect(() => {
        if (displayed && userId) {
            fetchUsers();
            const unsubscribe = observeWhitelistedUsers();

            return () => unsubscribe();
        }
    }, [displayed, userId]);



    /**
     * Whitelists a user to the project to have the role "User"
     * *Only usable if the user is atleast an admin*
     **/
    async function handleWhitelistUser(addingUserId: string, addingUserEmail: string) {
        const success = await whitelistUser(projectId, addingUserId , Role.USER);
        if (success) {
            alert(addingUserEmail + " successfully whitelisted to project");
            setPotentialUsers(potentialUsers.filter((user) => user.userId !== addingUserId))
        } else {
            alert("Issue adding user to whitelist. Please try again later.");
        }

    }

    /**
     * Retrieves all users which are not whitelisted for the project
     **/
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

    /**
     * Creates a context menu with the associated information required
     **/
    async function createContextMenu(e: React.MouseEvent<HTMLDivElement>, user: { userId: string; username: string; email: string }){
        e.preventDefault()
        setContextMenuUser(user)
        setContextMenuPosition([e.clientX, e.clientY])
        setContextMenuUserRole(undefined)
        setContextMenuUserRole(await getUserRole(projectId, user.userId))

        return
    }
    /**
     * Compares whether or not the current user has a greater role than the selected user in a contextMenu
     *
     * Head > Admin > User > None
     **/
    function compareRoles() {
        if(role == Role.USER || role == Role.NONE){
            return false
        }
        if(role == Role.ADMIN){
            return contextMenuUserRole == Role.USER || contextMenuUserRole == Role.NONE
        }
        return role == Role.HEAD;


    }

    /**
     * Converts a "Role" enum to camelCase
     * @param toConvertRole
     **/
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
        return "None"
    }

    /**
     * useEffect() which observes clicks by the mouse, If the contextMenu is open, then closes the contextMenu
     **/
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
                {
                    (role == Role.ADMIN || role == Role.HEAD) && (
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
                    )
                }
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
                                                        role == Role.HEAD && (
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
                                                        role == Role.ADMIN && compareRoles() && (
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