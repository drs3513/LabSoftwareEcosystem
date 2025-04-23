import styled from "styled-components";
import React, { useRef, useState, DragEvent } from "react";
import { useGlobalState } from "../GlobalStateContext";

interface props {
    initialPosX: number;
    initialPosY: number;
    parentFileId: string | undefined;
    parentFilePath: string | undefined;
    isDirectory: string;
    inputFile: (isDirectory: boolean, projectId: string, ownerId: string, parentId: string) => void;
    dragFile: (event: DragEvent, projectId: string, ownerId: string, parentId: string) => void;
    close: () => void;
}

export default function CreateFilePanel({ initialPosX, initialPosY, parentFileId, parentFilePath, isDirectory, inputFile, dragFile, close }: props) {
    if (initialPosX + 400 > document.documentElement.offsetWidth) {
        initialPosX = document.documentElement.offsetWidth - 400;
    }
    if (initialPosY + 400 > document.documentElement.offsetHeight) {
        initialPosY = document.documentElement.offsetHeight - 400;
    }
    const [tags, setTags] = useState<Array<string>>([])
    const [posX, setPosX] = useState(initialPosX)
    const [posY, setPosY] = useState(initialPosY)
    const [panelWidth, setPanelWidth] = useState(400)
    const [panelHeight, setPanelHeight] = useState(400)
    const initialXDiff = useRef(0);
    const initialYDiff = useRef(0);
    const initialResizeX = useRef(0);
    const initialResizeY = useRef(0);
    const fileName = useRef("");
    const {projectId, userId} = useGlobalState();
    const [dragging, setDragging] = useState(false);
    
    function handleDragOver(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setDragging(true);
    }

    function handleDragLeave() {
        setDragging(false);
    }

    async function handleDrop(e: DragEvent<HTMLDivElement>) {
            dragFile(
                e,
                projectId as string,
                userId as string,
                parentFileId as string
            );
    }

    function handleInsertTag(e: React.KeyboardEvent<HTMLInputElement>){
        const inputBox = e.target as HTMLInputElement
        if(e.key === "Enter" && inputBox.value.length > 0){
            setTags([...tags, inputBox.value])
            inputBox.value = ""

        }
    }




    function handleStartDrag(e: React.DragEvent<HTMLDivElement>){
        console.log("Happening?")
        const panel = e.currentTarget as HTMLDivElement
        const panelBoundingBox = panel.getBoundingClientRect()
        initialXDiff.current = e.pageX - panelBoundingBox.x
        initialYDiff.current = e.pageY - panelBoundingBox.y
    }

    function handleEndDrag(e: React.DragEvent<HTMLDivElement>){

        setPosX(e.pageX - initialXDiff.current)
        setPosY(e.pageY - initialYDiff.current)
    }

    function handleResize(e: React.DragEvent<HTMLDivElement>) {
        const newWidth = panelWidth-((posX + panelWidth) - e.pageX)
        if(newWidth > 24){
            setPanelWidth(newWidth)
        }

        const newHeight = panelHeight - ((posY + panelHeight) - e.pageY)
        if(newHeight > 24){
            setPanelHeight(newHeight)
        }
    }

    return (
        <PanelContainer
        $posX = {posX}
        $posY = {posY}
        $width = {panelWidth}
        $height = {panelHeight}

    >
        <Header draggable={true} onDragStart={(e) => handleStartDrag(e)}
                onDragEnd={(e) => handleEndDrag(e)}>
            {isDirectory === "File" ? "File Upload" : "Folder Upload"}
            <CloseButton onClick={close}>
                X
            </CloseButton>
        </Header>

        <TagInputContainer>
            <InputSmall onKeyDown={e => handleInsertTag(e)} placeholder={"Tag"}></InputSmall>
        </TagInputContainer>

        <TagDisplay>
            {tags.length > 0 ? (
                <>
                    <TagLabel>
                        Tags :
                    </TagLabel>
                    <TagDisplayContainer $height={panelHeight}>
                        {
                            tags.map((tag, key) => (
                                <TagDisplayIndex key={key}>
                                    {tag}
                                </TagDisplayIndex>
                            ))
                        }
                    </TagDisplayContainer>
                </>
            ) : <></>
            }
        </TagDisplay>
            <DropZone onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} $dragging={dragging}>
                <DropText>{dragging ? "Drop files/folders here..." : "Drag and drop files or folders"}</DropText>
                <UploadButton onClick={() => inputFile(false, projectId as string, userId as string, parentFileId as string)}>Browse Files</UploadButton>
                <UploadButton onClick={() => inputFile(true, projectId as string, userId as string, parentFileId as string)}>Browse Folders</UploadButton>
            </DropZone>

            <Resize draggable={true} onDragStart={(e) => {initialResizeX.current = e.pageX; initialResizeY.current = e.pageY}} onDragEnd = {(e) => {handleResize(e)}}>
                <svg viewBox={"0 0 24 24"}>
                    <path d={"M21 15L15 21M21 8L8 21"} stroke="black" strokeWidth="2" strokeLinecap="round"/>
                </svg>
            </Resize>
        </PanelContainer>
    );
}

// Styled Components
const Resize = styled.div`
    width: 24px;
    height: 24px;
    right: 0;
    margin-left: auto;
    stroke: black;
    stroke-width: 3;
    cursor: nwse-resize;
`

const PanelContainer = styled.div.attrs<{$posX: number, $posY: number, $width: number, $height: number}>(props => ({
    style : {
        top: props.$posY,
        left: props.$posX,
        width: props.$width,
        height: props.$height
    }
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
    overflow: hidden;
    
    display: flex;
    flex-direction: column;
`


const TagInputContainer = styled.div`
    display: flex;
    flex-direction: row;
    overflow: hidden;
`


const TagDisplay = styled.div`
    flex: 2;
    display: flex;
    flex-direction: row;
    margin-left: 10%;
    margin-top: 1rem;
    height: auto;
    overflow: hidden;
`
const TagLabel = styled.h3`
    margin: 0;
`

const TagDisplayContainer = styled.div.attrs<{$height: number}>(props => ({
    style : {
        height: "calc("+props.$height+ "px - 5rem - 4rem - 5rem - 24px)"
    }
}))`
    display: flex;
    flex-direction: row;
    width: 80%;
    height: auto;
    flex-wrap: wrap;

    overflow: auto;
`
const TagDisplayIndex = styled.div`
    margin: .3rem;
    text-align: left;
    height: min-content;
    padding: .5rem;
    padding-top: .2rem;
    background-color: #ccc;;
    border-radius: 18px;
`
const Header = styled.div`
    width: 100%;
    padding: 10px;
    background-color: lightgray;
    text-align: center;
    font-weight: bold;
`;

const CloseButton = styled.button`
    position: absolute;
    right: 10px;
    top: 10px;
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
`;

const DropZone = styled.div.attrs<{$dragging: boolean}>(props => ({
    style: {
        backgroundColor: props.$dragging ? "#e0f7fa" : "white",
        border: props.$dragging ? "2px dashed #007bff" : "2px dashed #ccc"
    }
}))`
    width: 90%;
    height: 150px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 20px;
    transition: background-color 0.3s;
`;

const DropText = styled.p`
    font-size: 16px;
    color: #555;
`;

const UploadButton = styled.button`
    margin-top: 10px;
    padding: 8px 16px;
    border: none;
    background-color: #007bff;
    color: white;
    font-size: 14px;
    border-radius: 5px;
    cursor: pointer;
    &:hover {
        background-color: #0056b3;
    }
`;
const InputSmall = styled.input`
    width: 60%;
    margin: 1rem 1rem 1rem 10%;
    height: 3rem;
    padding: 0.5rem;
    border: 2px solid #ccc;
    border-radius: 5px;
`
const Input = styled.input`
    
  width: 80%;
  margin: 1rem auto;
  height: 3rem;
  padding: 0.5rem;
  border: 2px solid #ccc;
  border-radius: 5px;
`;