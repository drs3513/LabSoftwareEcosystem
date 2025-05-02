"use client";

import styled from "styled-components";
import { useState, useEffect, useRef } from "react";
import { whitelistUser, Role } from "@/lib/whitelist";
import { createProject } from "@/lib/project";
import { getActiveUser } from "@/lib/user"
import { useGlobalState } from "../GlobalStateContext";
import { useAuthenticator } from "@aws-amplify/ui-react";
import UserInfoPanel from "./popout_user_info_panel"

//SVG imports
import Image from "next/image";
import icon_signout from "/assets/icons/exit.svg";

interface userInfoPopoutPanelType{
  x: number;
  y: number;
  userId: string;
}


export default function TopBar() {
  const { userId } = useGlobalState();
  const [openDropdown, setOpenDropdown] = useState<string | undefined>(undefined);
  const [userInfoPopoutPanel, setUserInfoPopoutPanel] = useState<userInfoPopoutPanelType | undefined>(undefined)
  const { signOut } = useAuthenticator();
  const dropdownRef = useRef<HTMLDivElement>(null);

  /**
   * useEffect() which removes dropdown menus whenever the mouse is clicked
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openDropdown) {
        setOpenDropdown(undefined);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("contextmenu", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.addEventListener("contextmenu", handleClickOutside)
    };
  }, [openDropdown]);


  /**
   * Creates a project with the provided name
   */
  async function handleCreateProject() {
    const projectName = prompt("Enter Project Name:");
    if (!projectName || !userId) return;
    const project = await createProject(userId as string, projectName);
    const initWhitelist = await whitelistUser(project.data!.projectId, userId, Role.HEAD);
    if (!initWhitelist) {
      alert("Error creating project, please try again later.");
      return;
    }
  }



  return (
      <>
        <Top_Bar ref={dropdownRef}>
          <Top_Bar_Group>
            <Top_Bar_Item onClick={() => setOpenDropdown("Projects")}>
              Projects
              {openDropdown == "Projects" && (
                <Dropdown>
                  <DropdownItem onClick={handleCreateProject}>Create Project</DropdownItem>
                </Dropdown>
              )}
            </Top_Bar_Item>
            {
              userId && (
                    <Top_Bar_Item onClick={(e) => {setUserInfoPopoutPanel({x: e.clientX, y: e.clientY, userId: userId});}}>
                      User
                    </Top_Bar_Item>
                )
            }

          </Top_Bar_Group>

          <SignOutButton onClick={signOut}><Image src={icon_signout} alt="" height="36" objectPosition='fill'></Image></SignOutButton>
        </Top_Bar>
        {userInfoPopoutPanel && (
            <UserInfoPanel initialPosX = {userInfoPopoutPanel.x}
                           initialPosY = {userInfoPopoutPanel.y}
                           userId = {userInfoPopoutPanel.userId}
                           close = {() => setUserInfoPopoutPanel(undefined)}/>
        )}
      </>
  );
}
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