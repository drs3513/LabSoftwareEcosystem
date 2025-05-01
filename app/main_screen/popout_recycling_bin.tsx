import styled from "styled-components";
import React, {useRef, useState, useEffect} from "react";
import { useGlobalState } from "../GlobalStateContext";
import {getFilesByProjectIdAndIsDeleted, hardDeleteFile, Restorefile} from "@/lib/file";
import { formatBytes } from "@/app/main_screen/[pid]/[id]/file_panel";
import PopoutPanel from "./popout_panel"
import {Button} from "@aws-amplify/ui-react";

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
    const {setFileId} = useGlobalState()
    const [files, setFiles] = useState<fileInfo[]>([])


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
        <PopoutPanel
            header={`Recycling Bin | ${projectName} `}
            initialPosX ={initialPosX}
            initialPosY = {initialPosY}
            close = {close}>
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
                            <BinButton onClick={() => handleRestore(file.fileId, file.versionId)}>Restore</BinButton>
                            <BinButton onClick={() => handleHardDelete(file.fileId)}>Delete Permanently</BinButton>
                        </FileLite>
                    ))
                ) : (
                    <NoFiles>No files!</NoFiles>
                )}
            </FileContainer>

        </PopoutPanel>

    );
}

// Styled Components

const BinButton = styled(Button)`
    margin-right: .5rem;
`

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