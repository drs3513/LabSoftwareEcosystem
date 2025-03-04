"use client";

import styled from "styled-components";
import { useState, useEffect, useRef } from "react";
import { getUsers } from "@/lib/user";
import { createProject } from "@/lib/project";
import { useGlobalState } from "./GlobalStateContext";
import { useAuthenticator } from "@aws-amplify/ui-react";

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
  position: relative;
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

const UserDetailsPanel = styled.div`
  position: absolute;
  top: 2rem;
  left: 250px;
  width: 250px;
  background-color: white;
  border: 1px solid black;
  border-radius: 5px;
  z-index: 10;
  padding: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
`;

export default function TopBar() {
  const { userId } = useGlobalState();
  const [showOptions, setShowOptions] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [users, setUsers] = useState<Array<{ userId: string; username: string; email: string }>>([]);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; username: string; email: string } | null>(null);
  const { signOut } = useAuthenticator();
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Handle clicks outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOptions(false);
        setShowAdmin(false);
        setSelectedUser(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    console.log("User signed out");
    signOut();
  };

  const handleCreateProject = () => {
    const projectName = prompt("Enter Project Name:");
    if (projectName) {
      createProject(userId as string, projectName);
    }
  };

  const handleWhitelistUser = () => {
    const userEmail = prompt("Enter User Email:");
    if (userEmail) {
      console.log("User Whitelisted:", userEmail);
    }
  };

  // Ensure only one dropdown is open at a time
  const toggleOptions = () => {
    setShowOptions((prev) => !prev);
    setShowAdmin(false); // Close Admin dropdown if it's open
  };

  const toggleAdmin = () => {
    setShowAdmin((prev) => !prev);
    setShowOptions(false); // Close Options dropdown if it's open
  };

  return (
    <Top_Bar ref={dropdownRef}>
      <Top_Bar_Group>
        <Top_Bar_Item onClick={toggleOptions}>
          Options
          {showOptions && (
            <Dropdown>
              <DropdownItem onClick={handleCreateProject}>Create Project</DropdownItem>
            </Dropdown>
          )}
        </Top_Bar_Item>

        <Top_Bar_Item onClick={toggleAdmin}>
          Admin
          {showAdmin && (
            <Dropdown>
              <DropdownItem onClick={handleWhitelistUser}>Whitelist User</DropdownItem>
              <UserList>
                {users.length > 0 ? (
                  users.map((user) => (
                    <UserItem key={user.userId} onClick={() => setSelectedUser(user)}>
                      {user.username}
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

      {selectedUser && (
        <UserDetailsPanel>
          <h4>User Details</h4>
          <p><strong>Username:</strong> {selectedUser.username}</p>
          <p><strong>Email:</strong> {selectedUser.email}</p>
          <button onClick={() => setSelectedUser(null)}>Close</button>
        </UserDetailsPanel>
      )}

      <SignOutButton onClick={handleSignOut}>Sign Out</SignOutButton>
    </Top_Bar>
  );
}
