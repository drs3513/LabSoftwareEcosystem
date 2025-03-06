import styled from "styled-components";
import React, {useRef, useState} from "react";

interface props{
    initialPosX: number;
    initialPosY: number;
    parentFileId: string | undefined;
    parentFilePath: string | undefined;
    isDirectory: string;
    createFile: (filename: string, filepath: string | undefined, parentId: string | undefined, isDirectory: boolean, tags: Array<string>) => void;
    close: ()=>void;
}


export default function CreateFilePanel({initialPosX, initialPosY, parentFileId, parentFilePath, isDirectory, createFile, close}: props){
    if(initialPosX + 400 > document.documentElement.offsetWidth){
        initialPosX = document.documentElement.offsetWidth - 400
    }
    if(initialPosY + 400 > document.documentElement.offsetHeight){
        initialPosY = document.documentElement.offsetHeight - 400
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

    function handleInsertTag(e: React.KeyboardEvent<HTMLInputElement>){
        const inputBox = e.target as HTMLInputElement
        if(e.key === "Enter" && inputBox.value.length > 0){
            setTags([...tags, inputBox.value])
            inputBox.value = ""

        }
    }




    function handleStartDrag(e: React.DragEvent<HTMLDivElement>){
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
        if(newWidth > 400){
            setPanelWidth(newWidth)
        }

        const newHeight = panelHeight - ((posY + panelHeight) - e.pageY)
        if(newHeight > 400){
            setPanelHeight(newHeight)
        }
    }

    return(
        <PanelContainer
            $posX = {posX}
            $posY = {posY}
            $width = {panelWidth}
            $height = {panelHeight}

        >
            <Header draggable={true} onDragStart={(e) => handleStartDrag(e)}
                    onDragEnd={(e) => handleEndDrag(e)}>
                {isDirectory === "File" ? "Create File" : "Create Folder"}
                <CloseButton onClick={close}>
                    X
                </CloseButton>
            </Header>
            <Input placeholder={"File Name"} onChange={(e) => fileName.current = e.target.value}></Input>
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
            <Button onClick= {() => createFile(fileName.current, parentFilePath, parentFileId, isDirectory==="Folder", tags)}>
                {isDirectory === "File" ? "Create File" : "Create Folder"}
            </Button>
            <Resize draggable={true} onDragStart={(e) => {initialResizeX.current = e.pageX; initialResizeY.current = e.pageY}} onDragEnd = {(e) => {handleResize(e)}}>
                <svg viewBox={"0 0 24px 24px"}>
                    <path d={"M21 15L15 21M21 8L8 21"} stroke="black" strokeWidth="2" strokeLinecap="round"/>
                </svg>
            </Resize>

        </PanelContainer>
    )
}
const Resize = styled.div`
    width: 24px;
    height: 24px;
    right: 0;
    margin-left: auto;
    stroke: black;
    stroke-width: 3;
    cursor: nwse-resize;
    overflow: hidden;
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
    
    display: flex;
    flex-direction: column;
`


const TagInputContainer = styled.div`
    display: flex;
    flex-direction: row;
`


const TagDisplay = styled.div`
    flex: 2;
    display: flex;
    flex-direction: row;
    margin-left: 10%;
    margin-top: 1rem;
    height: auto;
`
const TagLabel = styled.h3`
    margin: 0;
`

const TagDisplayContainer = styled.div.attrs<{$height: number}>(props => ({
    style : {
        height: "calc("+props.$height+ "px - 5rem - 5rem - 4rem - 5rem - 24px)"
    }
}))`
    display: flex;
    flex-direction: column;
    width: auto;
    
    overflow: scroll;
`
const TagDisplayIndex = styled.div`
    margin: .5rem;
    text-align: left;
    border-bottom: 2px solid #ccc;
`


const Button = styled.button`
    height: 3rem;
    width: auto;
    margin-top: 1rem;
    padding: 0.5rem;
    background-color: lightgray;
    border: 2px solid #ccc;
    cursor: pointer;
    &:hover{
        background-color: darkgray;
    }
`
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
const Header = styled.div`
    
    padding: 0.5rem;
    height: 3rem;
    background-color: lightgray;
    text-align: left;
    -webkit-user-select: none;
    -ms-user-select: none;
    user-select: none;
`
const CloseButton = styled.button`
    margin-left: auto;
    width: 30px;
    height: 30px;
    float: right;
    border-radius: 15px;
    border-style: solid;
    border-color: gray;
    cursor: pointer;
`