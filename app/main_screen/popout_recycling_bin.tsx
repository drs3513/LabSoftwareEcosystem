import styled from "styled-components";
import React, {useRef, useState, useEffect} from "react";
import { useGlobalState } from "../GlobalStateContext";
import {getFilesByProjectIdAndIsDeleted, hardDeleteFile, Restorefile} from "@/lib/file";
import { formatBytes } from "@/app/main_screen/[pid]/[id]/file_panel";

interface props {
    initialPosX: number;
    initialPosY: number;
    projectId: string | undefined;
    projectName: string | undefined;
    close: () => void;
}
interface fileInfo{
    fileId: string,
    filename: string,
    filepath: string,
    size: number,
    ownerId: string,
    projectId: string,
    createdAt: string,
    updatedAt: string,
    isDirectory: boolean | null,
    versionId: string
}

export default function RecycleBinPanel({ initialPosX, initialPosY, projectId, projectName, close}: props) {
    if (initialPosX + 400 > document.documentElement.offsetWidth) {
        initialPosX = document.documentElement.offsetWidth - 400;
    }
    if (initialPosY + 400 > document.documentElement.offsetHeight) {
        initialPosY = document.documentElement.offsetHeight - 400;
    }

    const {draggingFloatingWindow, setFileId} = useGlobalState()

    const [posX, setPosX] = useState(initialPosX)
    const [posY, setPosY] = useState(initialPosY)
    const [panelWidth, setPanelWidth] = useState(400)
    const [panelHeight, setPanelHeight] = useState(400)
    const initialXDiff = useRef(0);
    const initialYDiff = useRef(0);
    const initialResizeX = useRef(0);
    const initialResizeY = useRef(0);
    const [files, setFiles] = useState<fileInfo[]>([])



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

    async function fetchFiles(){
        if(!projectId) return
        const temp_files = await getFilesByProjectIdAndIsDeleted(projectId)
        if(!temp_files) return

        setFiles(temp_files.map((file) => ({
                fileId: file.fileId,
                filename: file.filename,
                filepath: file.filepath,
                size: file.size,
                ownerId: file.ownerId,
                projectId: file.projectId,
                createdAt: file.createdAt,
                updatedAt: file.updatedAt,
                isDirectory: file.isDirectory,
                versionId: file.versionId
        })))

    }


    useEffect(() => {
        if(projectId){
            fetchFiles();
        }
    }, [projectId]);

    async function handleRestore(fileId: string, versionId: string) {
        await Restorefile(fileId, versionId, projectId as string);
    }

    async function handleHardDelete(fileId: string) {
        /*const confirmed = window.confirm("This will permanently delete this file and all versions. Continue?");
        if (!confirmed || !projectId) return;*/
        if(!projectId) return
        try {
            await hardDeleteFile(fileId, projectId as string);
            fetchFiles();
            setFileId(undefined);
            
        } catch (err) {
            console.error("Hard delete failed:", err);
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
                {`Recycling Bin | Project : ${projectName} `}
                <CloseButton onClick={close}>
                    ✖
                </CloseButton>
            </Header>
            <FileContainer>
            {files.length > 0 ? (
                        files.map((file, i) => (
                            <FileLite key={i} onClick={() => {/* optional click handler */}}>
                            {file.filename}
                            <br />
                            <FileContext
                                fileId={file.fileId}
                                filename={file.filename}
                                filepath={file.filepath}
                                size={file.size}
                                versionId={file.versionId}
                                ownerId={file.ownerId}
                                projectId={file.projectId}
                                createdAt={file.createdAt}
                                updatedAt={file.updatedAt}
                                isDirectory={file.isDirectory}
                            />
                            <button onClick={() => handleRestore(file.fileId, file.versionId)}>Restore</button>
                            <button onClick={() => handleHardDelete(file.fileId)}>Delete Permanently</button>
                            </FileLite>
                        ))
                        ) : (
                        <NoFiles>No files!</NoFiles>
                        )}
            </FileContainer>
            <Resize draggable={true} onDragStart={(e) => {initialResizeX.current = e.pageX; initialResizeY.current = e.pageY; draggingFloatingWindow.current = true}} onDragEnd = {(e) => {handleResize(e)}}>
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
    position: fixed;
    right: 0;
    bottom: 0;
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
    z-index: 150;
    
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

const NoFiles = styled.div`
  color: gray;
  text-align: center;
`;

const FileLite = styled.div`
    color: inherit;
    border: none;
    font: inherit;
    outline: inherit;
    background-color: white;
    padding: 1rem;
    border-bottom: 1px solid #ddd;
    text-align: left;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    border-radius: 0;
    width: 100%;
    &:hover {

        filter: drop-shadow(0px 0px 5px #5C9ECC);

        padding-top: calc(1rem - 2px);
        padding-bottom: calc(1rem - 2px);
        }
`
const FileContainer = styled.div`
    width: 100%;
    height: 100%;
    overflow: scroll;
    
`

const FileContextItem = styled.div`

  height: 100%;
  font-size: 12px;
  background-color: inherit;
  color: gray;
  text-align: left;
  overflow-y: auto;
  pointer-events: none;
`;

export function FileContext(file: fileInfo ) {
    const now = new Date()
    const updated = new Date(file.updatedAt)

    return (
        <FileContextItem>
             {file.filepath} - Deleted: {updated.toDateString() == now.toDateString() ? updated.toLocaleTimeString("en-US") : updated.toLocaleDateString("en-US")} {file.isDirectory? "" : "Size: "+formatBytes(file.size)}
        </FileContextItem>
    );
}