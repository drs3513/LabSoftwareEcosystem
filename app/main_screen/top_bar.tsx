"use client";

import styled from "styled-components";
import { useState, useEffect, useRef } from "react";
import { whitelistUser, Role } from "@/lib/whitelist";
import { createProject } from "@/lib/project";
import { useGlobalState } from "../GlobalStateContext";
import { useAuthenticator } from "@aws-amplify/ui-react";

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


export default function TopBar() {
  const { userId } = useGlobalState();
  const [showOptions, setShowOptions] = useState(false);
  const { signOut } = useAuthenticator();
  const dropdownRef = useRef<HTMLDivElement>(null);

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



  async function handleCreateProject() {
    const projectName = prompt("Enter Project Name:");
    if (!projectName || !userId) return;
    const project = await createProject(userId as string, projectName);
    if (!project) {
      alert("Error creating project. Please try again later.");
      return;
    }
    const initWhitelist = await whitelistUser(project.data!.projectId, userId, Role.HEAD);
    if (!initWhitelist) {
      alert("Error adding you to the whitelist. Please try again later.");
      return;
    }
    alert("Project created successfully!");
    window.location.reload(); // temporary solution to refresh the page
  }



  // Ensure only one dropdown is open at a time
  const toggleOptions = () => {
    setShowOptions((prev) => !prev);
  };




  return (
    <Top_Bar ref={dropdownRef}>
      <Top_Bar_Group>
        <Top_Bar_Item onClick={toggleOptions}>
          Projects
          {showOptions && (
            <Dropdown>
              <DropdownItem onClick={handleCreateProject}>Create Project</DropdownItem>
            </Dropdown>
          )}
        </Top_Bar_Item>


      </Top_Bar_Group>



      <SignOutButton onClick={signOut}><Image src={icon_signout} alt="" height="36" objectPosition='fill'></Image></SignOutButton>
    </Top_Bar>
  );
}
