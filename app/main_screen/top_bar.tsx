"use client";

import styled from 'styled-components';
import { useState, useEffect } from 'react';
import { getUsers } from '@/lib/user'; 
import { createProject } from '@/lib/project';
import { useGlobalState } from "./GlobalStateContext";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";

const Top_Bar = styled.div`
    background-color: tan;
    border-bottom: 2px solid black;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 0 1rem;
    position: relative;
`;

const Top_Bar_Group = styled.div`
    display: flex;
    gap: 1rem;
`;

const Top_Bar_Item = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 1.5rem;
    padding: 0.5rem 1rem;
    border-radius: 5px;
    &:hover {
        cursor: pointer;
        background-color: saddlebrown;
        transition: 0.2s;
    }
`;

const Dropdown = styled.div`
    position: absolute;
    top: 2rem;
    left: 0;
    width: 250px;
    background-color: white;
    border: 1px solid black;
    border-radius: 5px;
    z-index: 10;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
`;

const DropdownItem = styled.div`
    padding: 10px;
    text-align: left;
    border-bottom: 1px solid #ddd;
    &:hover {
        background-color: lightgray;
        cursor: pointer;
    }
`;

const SignOutButton = styled.div`
    margin-left: auto;
    padding: 0.5rem 1rem;
    border-radius: 5px;
    background-color: darkred;
    color: white;
    &:hover {
        cursor: pointer;
        background-color: red;
        transition: 0.2s;
    }
`;

const UserList = styled.div`
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

export default function TopBar() {
    const { userId, setRefreshProjects } = useGlobalState();
    const [showOptions, setShowOptions] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const {signOut} = useAuthenticator();
    const [users, setUsers] = useState<Array<{ userId: string; username: string; email: string }>>([]);

    const handleSignOut = () => {
        return  (<button onClick={signOut}>Sign out</button>);
        console.log("User signed out"); // Replace with actual sign-out logic
    };

    const handleCreateProject = () => {
        const projectName = prompt("Enter Project Name:");
        if (projectName) {
           createProject(userId as string, projectName);
           setRefreshProjects(true); 
        setTimeout(() => setRefreshProjects(false), 500);
        }
    };

    const handleWhitelistUser = () => {
        const userEmail = prompt("Enter User Email:");
        if (userEmail) {
            console.log("User Whitelisted:", userEmail); // Replace with actual whitelist logic
        }
    };

    // Fetch users when Admin dropdown is toggled
    useEffect(() => {
        if (showAdmin) {
            const fetchUsers = async () => {
                try {
                    const response = await getUsers(); 
                    if (response && Array.isArray(response.data)) {
                        setUsers(response.data);
                    }
                } catch (error) {
                    console.error("Error fetching users:", error);
                }
            };
            fetchUsers();
        }
    }, [showAdmin]);

    return (
        <Top_Bar>
            <Top_Bar_Group>
                <Top_Bar_Item onClick={() => setShowOptions(!showOptions)}>
                    Options
                    {showOptions && (
                        <Dropdown>
                            <DropdownItem onClick={handleCreateProject}>Create Project</DropdownItem>
                        </Dropdown>
                    )}
                </Top_Bar_Item>

                <Top_Bar_Item onClick={() => setShowAdmin(!showAdmin)}>
                    Admin
                    {showAdmin && (
                        <Dropdown>
                            <DropdownItem onClick={handleWhitelistUser}>Whitelist User</DropdownItem>
                            <UserList>
                                {users.length > 0 ? (
                                    users.map((user) => (
                                        <UserItem key={user.userId}>
                                            {user.username} - {user.email}
                                        </UserItem>
                                    ))
                                ) : (
                                    <DropdownItem>No users found</DropdownItem>
                                )}
                            </UserList>
                        </Dropdown>
                    )}
                </Top_Bar_Item>
            </Top_Bar_Group>

            <SignOutButton onClick={handleSignOut}>Sign Out</SignOutButton>
        </Top_Bar>
    );
}
