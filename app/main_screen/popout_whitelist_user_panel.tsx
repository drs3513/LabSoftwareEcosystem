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
enum Role {
    NONE = "NONE",
    USER = "USER",
    ADMIN = "ADMIN",
    HEAD = "HEAD",
}
//function UserFloatingPanel({ user, roleForProject, close }: { user: { userId: string; username: string; email: string }; roleForProject: string | null; close: () => void }) {
//    const [posX, setPosX] = useState(200);
//    const [posY, setPosY] = useState(200);
//    const [panelWidth, setPanelWidth] = useState(300);
//    const [panelHeight, setPanelHeight] = useState(400);
//    const initialXDiff = useRef(0);
//    const initialYDiff = useRef(0);
//
//    function handleStartDrag(e: React.DragEvent<HTMLDivElement>) {
//        const panel = e.currentTarget as HTMLDivElement;
//        const panelBoundingBox = panel.getBoundingClientRect();
//        initialXDiff.current = e.pageX - panelBoundingBox.x;
//        initialYDiff.current = e.pageY - panelBoundingBox.y;
//    }
//
//    function handleEndDrag(e: React.DragEvent<HTMLDivElement>) {
//        setPosX(e.pageX - initialXDiff.current);
//        setPosY(e.pageY - initialYDiff.current);
//    }
//
//    return (
//        <PanelContainer $posX={posX} $posY={posY} $width={panelWidth} $height={panelHeight}>
//            <Header draggable={true} onDragStart={(e) => handleStartDrag(e)} onDragEnd={(e) => handleEndDrag(e)}>
//                User Details
//                <CloseButton onClick={close}>X</CloseButton>
//            </Header>
//            <div style={{ padding: "1rem" }}>
//                <p><strong>Username:</strong> {user.username}</p>
//                <p><strong>Email:</strong> {user.email}</p>
//                <p><strong>ID:</strong> {user.userId}</p>
//                <p><strong>Role for Project:</strong> {roleForProject || "Loading..."}</p>
//                <button onClick={handleMakeAdmin}>Make Admin</button>
//                <button onClick={handleRevokeAdmin}>Revoke Admin</button>
//                <button onClick={handleRemoveUser}>Remove User</button>
//            </div>
//        </PanelContainer>
//    );
//}
//
//async function handleWhitelistUser() {
//    if (!props.projectId) {
//        alert("No project selected.");
//        return;
//    }
//    const role = await getUserRole(props.projectId!, userId!);
//    console.log("Role for current user:" + role);
//    if (role !== Role.HEAD && role !== Role.ADMIN) {
//        alert("Only the project head or admins can whitelist users.");
//        return;
//    }
//    const userEmail = prompt("Enter User Email:");
//    if (!userEmail) return;
//    const addingUserId = await getUserIdFromEmail(userEmail);
//    if (!addingUserId) {
//        alert("User not found. Please check the email and try again.");
//        return;
//    }
//    if (addingUserId && props.projectId) {
//        if (await isUserWhitelistedForProject(addingUserId, props.projectId)) {
//            alert(userEmail + " is already whitelisted for this project!");
//            return;
//        }
//        let confirm = window.confirm("Are you sure you want to whitelist " + userEmail + " for this project?");
//        if (!confirm) return;
//        const success = await whitelistUser(props.projectId, addingUserId, Role.USER);
//        if (success) {
//            alert(userEmail + " successfully whitelisted to project");
//        } else {
//            alert("Issue adding user to whitelist. Please try again later.");
//        }
//    }
//};
//
interface props {
    projectId: string,
    displayed: boolean,
    close: () => void,
    initialPosX: number,
    initialPosY: number


}

export default function WhitelistPanel(props: props) {
    const [posX, setPosX] = useState(props.initialPosX)
    const [posY, setPosY] = useState(props.initialPosY)
    const [panelWidth, setPanelWidth] = useState(400);
    const [panelHeight, setPanelHeight] = useState(400);
    const initialXDiff = useRef(0);
    const initialYDiff = useRef(0);
    const initialResizeX = useRef(0);
    const initialResizeY = useRef(0);
    const {draggingFloatingWindow, userId} = useGlobalState()
    const [users, setUsers] = useState<Array<{ userId: string; username: string; email: string }>>([]);
    const [potentialUsers, setPotentialUsers] = useState<Array<{ userId: string; username: string; email: string }>>([]);
    const client = generateClient<Schema>();
    const [contextMenuUser, setContextMenuUser] = useState<{ userId: string; username: string; email: string } | undefined>(undefined);
    const [contextMenuPosition, setContextMenuPosition] = useState<number[]>([0,0])
    const [contextMenuUserRole, setContextMenuUserRole] = useState<Role | undefined>(undefined)
    const role = useRef<Role | undefined>(undefined)

    async function handleMakeAdmin() {
        if (!props.projectId) {
            alert("No project selected.");
            return;
        }
        const role = await getUserRole(props.projectId!, userId!);
        if (role !== Role.HEAD) {
            alert("Only the project head can elevate users to admin.");
            return;
        }
        if (!contextMenuUser || !props.projectId) {
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
        const response = await elevateUserToAdmin(props.projectId, contextMenuUser.userId);
        if (!response) {
            alert("Error elevating user to admin. Please try again later.");
            return;
        }
        alert("User elevated to admin successfully!");
        setContextMenuUser(undefined);
    }

    async function handleRevokeAdmin() {
        if (!props.projectId) {
            alert("No project selected.");
            return;
        }
        const role = await getUserRole(props.projectId!, userId!);
        if (role !== Role.HEAD) {
            alert("Only the project head can revoke admin rights.");
            return;
        }
        if (!contextMenuUser || !props.projectId) {
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
        const response = await revokeUserAdmin(props.projectId, contextMenuUser.userId);
        if (!response) {
            alert("Error revoking admin rights. Please try again later.");
            return;
        }
        alert("Admin rights revoked successfully!");
        setContextMenuUser(undefined);
    }

    async function handleRemoveUser() {
        if (!props.projectId) {
            alert("No project selected.");
            return;
        }
        const role = await getUserRole(props.projectId!, userId!);
        if (role !== Role.HEAD && role !== Role.ADMIN) {
            alert("Only the project head or admins can remove users.");
            return;
        }
        if (!contextMenuUser || !props.projectId) {
            alert("No user selected or project ID is missing.");
            return;
        }
        if (!role) {
            alert("Error with current user's role.");
            return;
        }
        const success = await removeWhitelistedUser(props.projectId, contextMenuUser.userId, role);
        if (success) {
            alert("User removed from whitelist successfully!");
        } else {
            alert("Error removing user from whitelist. Please try again later.");
        }
    }

    function handleStartDrag(e: React.DragEvent<HTMLDivElement>){
        const panel = e.currentTarget as HTMLDivElement
        const panelBoundingBox = panel.getBoundingClientRect()
        initialXDiff.current = e.pageX - panelBoundingBox.x
        initialYDiff.current = e.pageY - panelBoundingBox.y
        draggingFloatingWindow.current = true

    }

    function handleEndDrag(e: React.DragEvent<HTMLDivElement>){
        setPosX(e.pageX - initialXDiff.current)
        setPosY(e.pageY - initialYDiff.current)
        draggingFloatingWindow.current = false
    }

    function handleResize(e: React.DragEvent<HTMLDivElement>) {
        draggingFloatingWindow.current = false;
        const newWidth = panelWidth-((posX + panelWidth) - e.pageX)
        if(newWidth > 400){
            setPanelWidth(newWidth)
        }

        const newHeight = panelHeight - ((posY + panelHeight) - e.pageY)
        if(newHeight > 400){
            setPanelHeight(newHeight)
        }
    }

    const fetchUsers = async () => {
        if(!userId) return
        try {
            if(!role.current){
                role.current = await getUserRole(props.projectId, userId);
            }
            if (!role.current) {
                //console.log("User " + userId + " does not have a role for project " + props.projectId);
                return;
            }
            const response = await listUsersInProject(props.projectId, true);
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
                projectId: {eq: props.projectId}
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
        if (props.displayed && userId) {
            fetchUsers();
            const unsubscribe = observeWhitelistedUsers();

            return () => unsubscribe();
        }
    }, [props.displayed, userId]);




    async function handleWhitelistUser(addingUserId: string, addingUserEmail: string) {
        const role = await getUserRole(props.projectId, userId!)
        if (role !== Role.HEAD && role !== Role.ADMIN) {
            alert("Only the project head or admins can whitelist users.");
            return;
        }
        const success = await whitelistUser(props.projectId, addingUserId , Role.USER);
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

        //console.log("Here")
        const usersFound = await listUsersInProject(props.projectId, false)
        //console.log(usersFound)
        if(!usersFound) return
        setPotentialUsers(usersFound.map(user => ({userId: user.userId, username: user.username, email: user.email})))
    }

    async function createContextMenu(e: React.MouseEvent<HTMLDivElement>, user: { userId: string; username: string; email: string }){
        e.preventDefault()
        setContextMenuUser(user)
        setContextMenuPosition([e.clientX, e.clientY])
        setContextMenuUserRole(undefined)
        setContextMenuUserRole(await getUserRole(props.projectId, user.userId))

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
            <PanelContainer
                $posX={posX}
                $posY={posY}
                $width={panelWidth}
                $height={panelHeight}
            >
                <Header
                    draggable={true}
                    onDragStart={(e) => handleStartDrag(e)}
                    onDragEnd={(e) => handleEndDrag(e)}
                    onClick={(e) => e.stopPropagation()} // Prevent header clicks from propagating
                >
                    Whitelist Users
                    <CloseButton
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent click from propagating to the header
                            props.close();
                        }}
                    >
                        ✖
                    </CloseButton>
                </Header>
                <PopoutWrapper>
                <Button onClick={handleGetWhitelistableUsers}>Add User
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
                            ):
                            undefined
                    }

                </Button>
                <UserList>

                    {users.map((user) => (
                        <UserItem
                            key={user.userId}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent the click from closing the panel

                            }}
                            onContextMenu={(e) => createContextMenu(e, user)}
                        >
                            <strong>{user.username}</strong> ({user.email})
                        </UserItem>
                    ))}
                </UserList>
                </PopoutWrapper>

                <Resize
                    draggable={true}
                    onDragStart={(e) => {
                        initialResizeX.current = e.pageX;
                        initialResizeY.current = e.pageY;
                        draggingFloatingWindow.current = true;
                    }}
                    onDragEnd={(e) => {
                        handleResize(e);
                    }}
                >
                    <svg viewBox={"0 0 24 24"}>
                        <path d={"M21 15L15 21M21 8L8 21"} stroke="black" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </Resize>
            </PanelContainer>
        {contextMenuUser ?
            <ContextMenuWrapper $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                <ContextMenu>
                    <ContextMenuItem>
                        {`Username: ${contextMenuUser.username}`}
                    </ContextMenuItem>
                    <ContextMenuItem>
                        {`Email: ${contextMenuUser.username}`}
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
//<div style={{ padding: "1rem" }}>
//    <p><strong>Username:</strong> {user.username}</p>
//    <p><strong>Email:</strong> {user.email}</p>
//    <p><strong>ID:</strong> {user.userId}</p>
//    <p><strong>Role for Project:</strong> {roleForProject || "Loading..."}</p>
//
//</div>
// Styled Components
const Resize = styled.div`
    width: 24px;
    height: 24px;
    position: fixed;
    right: 0;
    bottom: 0;
    stroke: black;
    stroke-width: 3;
    cursor: nwse-resize;
    overflow: hidden;
    
`

const PopoutWrapper = styled.div`
    width: 100%;
    height: fit-content;
    display: flex;
    flex-direction: column;
    justify-content: center;
`
const PanelContainer = styled.div.attrs<{$posX: number, $posY: number, $width: number, $height: number}>(props => ({
    style : {
        top: props.$posY,
        left: props.$posX,
        width: props.$width,
        height: props.$height,
        zIndex: 2
    }
}))`

    position: absolute;
    height: 80%;
    width: 60%;
    margin: auto;
    background-color: white;
    border-radius: 10px;
    overflow: hidden;
    border-style: solid;
    border-width: 2px;
    border-color: gray;
    filter: drop-shadow(0px 0px 2px gray);
    
`
const Header = styled.div`
    width: 100%;
    padding: 10px;
    background-color: #AFC1D0;
    text-align: center;
    font-weight: bold;
    border-bottom: 2px solid #D7DADD;
`;

const CloseButton = styled.button`
    position: absolute;
    right: 10px;
    top: 10px;
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    &:hover {
        color: white;
        transition: 0.2s;
    }
`;
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
    z-index: 2;
    left: ${(props) => props.$x}px;
    top: ${(props) => props.$y}px;
    display: flex;
    flex-direction: row;
`;