"use client";

import styled from "styled-components";
import { useState, useEffect, useRef } from "react";
import { isUserAdmin, getUserIdFromEmail, getUsers, getCurrentUser } from "@/lib/user";
import { removeWhitelistedUser, listUsersBelowRole, getUserRole, whitelistUser, Role, isUserWhitelistedForProject, elevateUserToAdmin, revokeUserAdmin } from "@/lib/whitelist";
import { createProject } from "@/lib/project";
import { useGlobalState } from "../GlobalStateContext";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { Button } from "@aws-amplify/ui-react";
import { useRouter } from "next/navigation";

//SVG imports
import Image from "next/image";
import icon_signout from "/assets/icons/exit.svg";

const Top_Bar = styled.div`
  background-color: #AFC1D0;
  border-bottom: 2px solid #D7DADD;
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
  height: 2rem;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  position: relative;
  &:hover {
    cursor: pointer;
    background-color: #365679;
    color: white;
    transition: 0.2s;
  }
`;

const Dropdown = styled.div`
  position: absolute;
  top: 2rem;
  left: 0;
  width: 250px;
  background-color: white;
  color: black;
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
  border-radius: 5px;
  color: white;
  &:hover {
    cursor: pointer;
    background-color: darkred;
    color: white;
    transition: 0.2s;
  }
`;



const PanelContainer = styled.div.attrs<{$posX: number; $posY: number; $width: number; $height: number}>(props => ({
    style: {
        top: props.$posY,
        left: props.$posX,
        width: props.$width,
        height: props.$height,
    },
}))`
    position: absolute;
    height: 80%;
    width: 60%;
    margin: auto;
    background-color: white;
    border-radius: 10px;
    border-style: solid;
    border-width: 2px;
    border-color: gray;
    filter: drop-shadow(0px 0px 2px gray);

    display: flex;
    flex-direction: column;

    z-index: 1000;
`;

const Header = styled.div`
    padding: 0.5rem;
    height: 3rem;
    color: black;
    background-color: #AFC1D0;
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    -webkit-user-select: none;
    -ms-user-select: none;
    user-select: none;
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
`;

export default function TopBar() {
  const router = useRouter();
  const { userId } = useGlobalState();
  //const [role, setRole] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showWhitelist, setShowWhitelist] = useState(false);
  const [users, setUsers] = useState<Array<{ userId: string; username: string; email: string }>>([]);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; username: string; email: string } | null>(null);
  const [userRoleForProject, setUserRoleForProject] = useState<string | null>(null);
  const { user, signOut } = useAuthenticator();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [whitelistPanelPos, setWhitelistPanelPos] = useState({ posX: 100, posY: 100 }); // Track position of whitelist panel

  // Extract projectId (pid) from the URL and update state
  useEffect(() => {
    const urlParams = new URLSearchParams(new URL(window.location.href).search);
    const pid = urlParams.get("pid");
    if (!pid) return;
    const userWhitelisted = async () => {
      if (!userId) return false;
      return await isUserWhitelistedForProject(userId, pid);
    }
    if (pid) {
      if (!userWhitelisted()) return;
      setProjectId(pid);
      // const setUserRole = async () => {
      //   const role = await getUserRole(pid, userId!);
      //   setRole(role);
      // }
      //setUserRole();
    }
  }, []);

  // // Fetch and update role when projectId changes
  // useEffect(() => {
  //   if (projectId && userId) {
  //     const fetchRole = async () => {
  //       try {
  //         //const userRole = await getUserRole(projectId, userId);
  //         //setRole(userRole || "No role assigned");
  //       } catch (error) {
  //         console.error("Error fetching role:", error);
  //         setRole("Error fetching role");
  //       }
  //     };
  //     fetchRole();
  //   }
  // }, [projectId, userId]);

  // Fetch users when Whitelist dropdown is toggled
  useEffect(() => {
    if (showWhitelist) {
      const fetchUsers = async () => {
        try {
          if (!projectId || !userId) {
            console.log("projectid or userid null");
            return;
          }
          const role = await getUserRole(projectId, userId);
          if (!role) {
            console.log("User " + userId + " does not have a role for project " + projectId);
            return;
          }
          const response = await listUsersBelowRole(projectId, role);
          if (response) {
            console.log("Fetched users:", response);
            setUsers(response);
          }
        } catch (error) {
          console.error("Error fetching users:", error);
        }
      };
      fetchUsers();
    }
  }, [showWhitelist]);

  // Handle clicks outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch the user's role for the selected project when the selected user changes
  useEffect(() => {
    if (selectedUser && projectId) {
      const fetchUserRoleForProject = async () => {
        try {
          const role = await getUserRole(projectId, selectedUser.userId);
          setUserRoleForProject(role || "No role assigned");
        } catch (error) {
          console.error("Error fetching user role for project:", error);
          setUserRoleForProject("Error fetching role");
        }
      };
      fetchUserRoleForProject();
    } else {
      setUserRoleForProject(null);
    }
  }, [selectedUser, projectId]);
  const handleSignOut = () => {
    signOut();
  };

  async function handleCreateProject() {
    const projectName = prompt("Enter Project Name:");
    if (!projectName || !userId) return;
    const project = await createProject(userId as string, projectName);
    if (!project) {
      alert("Error creating project. Please try again later.");
      return;
    };
    const initWhitelist = await whitelistUser(project.data!.projectId, userId, Role.HEAD);
    if (!initWhitelist) {
      alert("Error adding you to the whitelist. Please try again later.");
      return;
    }
    alert("Project created successfully!");
    window.location.reload(); // temporary solution to refresh the page
  };

  async function handleWhitelistUser() {
    if (!projectId) {
      alert("No project selected.");
      return;
    }
    const role = await getUserRole(projectId!, userId!);
    console.log("Role for current user:" + role);
    if (role !== Role.HEAD && role !== Role.ADMIN) {
      alert("Only the project head or admins can whitelist users.");
      return;
    }
    const userEmail = prompt("Enter User Email:");
    if (!userEmail) return;
    const addingUserId = await getUserIdFromEmail(userEmail);
    if (!addingUserId) {
      alert("User not found. Please check the email and try again.");
      return;
    }
    if (addingUserId && projectId) {
      if (await isUserWhitelistedForProject(addingUserId, projectId)) {
        alert(userEmail + " is already whitelisted for this project!");
        return;
      }
      let confirm = window.confirm("Are you sure you want to whitelist " + userEmail + " for this project?");
      if (!confirm) return;
      const success = await whitelistUser(projectId, addingUserId, Role.USER);
      if (success) {
        alert(userEmail + " successfully whitelisted to project");
      } else {
        alert("Issue adding user to whitelist. Please try again later.");
      }
    }
  };

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
    if (!selectedUser || !projectId) {
      alert("No user selected or project ID is missing.");
      return;
    }
    if (!role) {
      alert("Error with current user's role.");
      return;
    }
    if (userRoleForProject === Role.ADMIN) {
      alert("User is already an admin.");
      return;
    }
    const response = await elevateUserToAdmin(projectId, selectedUser.userId);
    if (!response) {
      alert("Error elevating user to admin. Please try again later.");
      return;
    }
    alert("User elevated to admin successfully!");
    setSelectedUser(null);
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
    if (!selectedUser || !projectId) {
      alert("No user selected or project ID is missing.");
      return;
    }
    if (!role) {
      alert("Error with current user's role.");
      return;
    }
    if (userRoleForProject !== Role.ADMIN) {
      alert("User is not an admin.");
      return;
    }
    const response = await revokeUserAdmin(projectId, selectedUser.userId);
    if (!response) {
      alert("Error revoking admin rights. Please try again later.");
      return;
    }
    alert("Admin rights revoked successfully!");
    setSelectedUser(null);
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
    if (!selectedUser || !projectId) {
      alert("No user selected or project ID is missing.");
      return;
    }
    if (!role) {
      alert("Error with current user's role.");
      return;
    }
    const success = await removeWhitelistedUser(projectId, selectedUser.userId, role);
    if (success) {
      alert("User removed from whitelist successfully!");
    } else {
      alert("Error removing user from whitelist. Please try again later.");
    }
  }

  // Ensure only one dropdown is open at a time
  const toggleOptions = () => {
    setShowOptions((prev) => !prev);
    setShowWhitelist(false);
  };

  const toggleWhitelist = () => {
    setShowWhitelist((prev) => !prev);
    setShowOptions(false);
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

        <Top_Bar_Item onClick={toggleWhitelist}>
          Whitelist

        </Top_Bar_Item>

      </Top_Bar_Group>



      <SignOutButton onClick={handleSignOut}><Image src={icon_signout} alt="" height="36" objectPosition='fill'></Image></SignOutButton>
    </Top_Bar>
  );
}
