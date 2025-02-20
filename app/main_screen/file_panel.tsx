"use client";

import {useEffect, useRef, useState} from "react";
import { useGlobalState } from "./GlobalStateContext";
import { listFilesForProject, createFile } from "@/lib/file";
import styled from "styled-components";
import {Nullable} from "@aws-amplify/data-schema";
import {boolean} from "zod";


function compare_file_date(file_1: any, file_2: any){
  let date_1 = new Date(file_1.updatedAt)
  let date_2 = new Date(file_2.updatedAt)
  if(date_1 == date_2){
    return 0
  } else if(date_1 > date_2){
    return 1
  } else {
    return -1
  }
}


export default function FilePanel() {
  function createContextMenuPanel(e){
    if(e.target != e.currentTarget){
      return
    }
    e.preventDefault();
    setContextMenu(true);
    setContextMenuType("file_panel");
    setContextMenuPosition([e.clientX, e.clientY]);
    setContextMenuFileId(undefined);
    setContextMenuFilePath(undefined);
  }

  function createContextMenuFile(e, fileId: string, filepath: string){
    e.preventDefault();
    setContextMenu(true);
    setContextMenuType("file_fileId");
    setContextMenuPosition([e.clientX, e.clientY]);
    setContextMenuFileId(fileId);
    setContextMenuFilePath(filepath);
    return <ContextMenu $x={e.clientX} $y={e.clientY}></ContextMenu>;
  }

  const { fileId, projectId, userId, contextMenu, setContextMenu, contextMenuType, setContextMenuType, setFileId } = useGlobalState();

  const [contextMenuPosition, setContextMenuPosition] = useState([0,0])
  const [mouseCoords, setMouseCoords] = useState([0,0])
  const [contextMenuFileId, setContextMenuFileId] = useState<string | undefined>(undefined);
  const [contextMenuFilePath, setContextMenuFilePath] = useState<string | undefined>(undefined);

  const [contextMenuDepth, setContextMenuDepth] = useState(0);
  const [files, setFiles] = useState<Array<{fileId: string, filename: string, filepath: string, size: number, versionId: string, ownerId: string, projectId: string, parentId: Nullable<string>, createdAt: string, updatedAt: string, visible: boolean, open: boolean}>>([]);
  const [sort, setSort] = useState("date")
  const [hoverFileId, setHoverFileId] = useState<string | undefined>(undefined)
  const [pickedUpFileId, setPickedUpFileId] = useState<string | undefined>(undefined)
  //sorts files to be displayed by the user
  //TODO allow toggle of sort mode through setting 'sort' state
  function sort_files(files: Array<{
    fileId: string,
    filename: string,
    filepath: string,
    size: number,
    versionId: string,
    ownerId: string,
    projectId: string,
    parentId: Nullable<string>,
    createdAt: string,
    updatedAt: string
  }>){

    //put each file into its own 'bucket', which designates which parentId it belongs to, allows for seperate sorting
    //within subdirectories
    let files_by_parentId: {[key: string]: any} = {}

    for(let file of files) {
      if (file.parentId == null) {
        if (files_by_parentId["no_parent"] == null) {
          files_by_parentId["no_parent"] = [file]
        } else {
          files_by_parentId["no_parent"].push(file)
        }
      } else {
        if (files_by_parentId[file.parentId] == null) {
          files_by_parentId[file.parentId] = [file]
        } else {
          files_by_parentId[file.parentId].push(file)
        }
      }
    }
    //sort by date
    for(let key in files_by_parentId){
      let values = files_by_parentId[key]
      files_by_parentId[key] = values.sort(compare_file_date)
    }
    if("no_parent" in files_by_parentId){
      files = concatenateFiles("no_parent", files_by_parentId, []);
    }
    return files
  }
  //concatenates files together in the same order as the parent
  function concatenateFiles(curr_parent: string, files_by_parentId: any, file_list: any){
    for(let i = 0; i < files_by_parentId[curr_parent].length; i++){
      file_list.push(files_by_parentId[curr_parent][i])
      if(files_by_parentId[curr_parent][i].fileId in files_by_parentId){
        file_list = concatenateFiles(files_by_parentId[curr_parent][i].fileId, files_by_parentId, file_list)
      }
    }
    return file_list
  }

  useEffect(() => {
    async function fetchFiles() {
      if (!projectId) return;
      const projectFiles = await listFilesForProject(projectId);
      setFiles([])
      //builds array of files with extra information for display
      //Extra information :
      //'visible' : designates if a file is current visible,
      // 'open' : designates if a file is currently open
      if(projectFiles){
        let temp_files: Array<{
          fileId: string,
          filename: string,
          filepath: string,
          size: number,
          versionId: string,
          ownerId: string,
          projectId: string,
          parentId: Nullable<string>,
          createdAt: string,
          updatedAt: string,
          visible: boolean,
          open: boolean
        }> = []
        for(let file of projectFiles) {
           temp_files = [...temp_files,
            {
              fileId: file.fileId,
              filename: file.filename,
              filepath: file.filepath,
              parentId: file.parentId,
              size: file.size,
              versionId: file.versionId,
              ownerId: file.ownerId,
              projectId: file.projectId,
              createdAt: file.createdAt,
              updatedAt: file.updatedAt,
              visible: (file.filepath.match(/\//g) || []).length == 1,
              open: false
            }]
        }

        setFiles(sort_files(temp_files));
        }
      }
    fetchFiles();
  }, [projectId]);



  const handleCreateFile = async () => {

    const filename = prompt("Enter File Name:");
    const isDirectory = confirm("Is Directory?");
    if (!filename || !projectId || !userId) return;

    try {

      const newFile = await createFile(projectId, filename, isDirectory, contextMenuFileId, `${contextMenuFilePath ? contextMenuFilePath : ""}/${filename}`, userId, 5, "1");

      if (newFile) {
        files.push({fileId: newFile.data.fileId,
          filename: newFile.data.filename,
          filepath: newFile.data.filepath,
          parentId: newFile.data.parentId,
          size: newFile.data.size,
          versionId: newFile.data.versionId,
          ownerId: newFile.data.ownerId,
          projectId: newFile.data.projectId,
          createdAt: newFile.data.createdAt,
          updatedAt: newFile.data.updatedAt,
          visible: true,
          open: false})
        setFiles(sort_files(files))

      }
    } catch (error) {
      console.error("Error creating file:", error);
      alert("Failed to create file. Please check the inputs.");
    }
  };
  // opens / closes a folder that is clicked
  function openCloseFolder(openFileId: string){
    for (let file of files){
      if(file.parentId == openFileId){
        file.visible = !file.visible
        recursiveCloseFolder(file.fileId)
      }
    }
    setFiles([...files]);
  }
  function recursiveCloseFolder(openFileId: string){
    for(let file of files){
      if(file.parentId == openFileId && file.visible){
        file.visible = false
        recursiveCloseFolder(file.fileId)
      }
    }
  }
  function placeFile(){
    setPickedUpFileId(undefined)
    //set file with fileId to the correct position, update everything
  }



  function onFileMouseDown(currFileId : string) {
    console.log(currFileId)
    isLongPress.current = true
    timer.current = setTimeout(() => {
      if(isLongPress.current){
        console.log("You've been holding down for a while");
        setPickedUpFileId(currFileId);
        console.log(pickedUpFileId)
        console.log(currFileId)
      }
    }, 500)

  }
  function onFileMouseUp() {
    isLongPress.current = false;
    clearTimeout(timer.current);
    setPickedUpFileId(undefined);
  }
  const timer = useRef(setTimeout(() => {
  }, 500));


  const isLongPress = useRef(false);


  if(contextMenu && contextMenuType=="file_panel"){
    return (
        <PanelContainer onContextMenu={(e) => createContextMenuPanel(e)} onMouseMove = {(e) => setMouseCoords([e.clientX, e.clientY])}>
          {files.length > 0 ? (
              files.filter(file => file.visible).map((file) => (
                  <File key={file.fileId}
                        $depth={(file.filepath.match(/\//g) || []).length}
                        $pickedUp={pickedUpFileId == file.fileId}
                        $mouseX = {mouseCoords[0]}
                        $mouseY = {mouseCoords[1]}
                        onMouseDown = {() => onFileMouseDown(file.fileId)}
                        onMouseUp = {() => onFileMouseUp()}
                        onClick={() => openCloseFolder(file.fileId)}
                        onContextMenu={(e) => createContextMenuFile(e, file.fileId, file.filepath)}>

                    {file.filepath}
                  </File>
              ))
          ) : (
              <NoFiles>No files available.</NoFiles>
          )}
          <ContextMenu $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
            <ContextMenuItem onClick={(e) => handleCreateFile()}>
              Insert File
            </ContextMenuItem>
            <ContextMenuItem>
              This is a custom context menu!
            </ContextMenuItem>
            <ContextMenuItem>
              And it works exactly how you'd expect it to!
            </ContextMenuItem>
          </ContextMenu>
        </PanelContainer>
    );
  }
  else if(contextMenu && contextMenuType=="file_fileId"){
    return (
        <PanelContainer onContextMenu={(e) => createContextMenuPanel(e)} onMouseMove = {(e) => setMouseCoords([e.clientX, e.clientY])}>
          {files.length > 0 ? (
              files.filter(file => file.visible).map((file) => (
                  <File key={file.fileId}
                        $depth={(file.filepath.match(/\//g) || []).length}
                        $pickedUp={pickedUpFileId == file.fileId}
                        $mouseX = {mouseCoords[0]}
                        $mouseY = {mouseCoords[1]}
                        onMouseDown = {() => onFileMouseDown(file.fileId)}
                        onMouseUp = {() => onFileMouseUp()}
                        onClick={() => openCloseFolder(file.fileId)}
                        onContextMenu={(e) => createContextMenuFile(e, file.fileId, file.filepath)}>

                    {file.filepath}
                  </File>
              ))
          ) : (
              <NoFiles>No files available.</NoFiles>
          )}
          <ContextMenu $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
            <ContextMenuItem onClick={(e) => handleCreateFile()}>
              Insert File
            </ContextMenuItem>
            <ContextMenuItem>
              Delete File
            </ContextMenuItem>
            <ContextMenuItem onClick={() => setFileId(contextMenuFileId)}>
              Open Chat
            </ContextMenuItem>
          </ContextMenu>
        </PanelContainer>
    );
  }
  else {
    return (
        <PanelContainer onContextMenu={(e) => createContextMenuPanel(e)} onMouseUp={() => setPickedUpFileId(undefined)} onMouseMove = {(e) => setMouseCoords([e.clientX, e.clientY])}>
          {files.length > 0 ? (
              files.filter(file => file.visible).map((file) => (
                  <File key={file.fileId}
                        $depth={(file.filepath.match(/\//g) || []).length}
                        $pickedUp={pickedUpFileId == file.fileId}
                        $mouseX = {mouseCoords[0]}
                        $mouseY = {mouseCoords[1]}
                        onMouseDown = {() => onFileMouseDown(file.fileId)}
                        onMouseUp = {() => onFileMouseUp()}
                        onClick={() => openCloseFolder(file.fileId)}
                        onContextMenu={(e) => createContextMenuFile(e, file.fileId, file.filepath)}>

                    {file.filepath}
                  </File>
              ))
          ) : (
              <NoFiles>No files available.</NoFiles>
          )}
          {contextMenu}
        </PanelContainer>
    );
  }

}

const ContextMenuItem = styled.div`
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

const ContextMenu = styled.div<{$x: number, $y: number}>`
    position: absolute;
    left: ${(props) => props.$x}px;
    top: ${(props) => props.$y}px;
    
    background-color: lightgray;
    border-color: dimgray;
    border-style: solid;
    border-radius: 5px;
    border-width: 2px;
`;

const PanelContainer = styled.div`
  width: 100%;
  height: 100%;
  background-color: white;
  padding: 1rem;
  text-align: center;
  overflow-y: auto;
`;

const File = styled.div<{$depth: number, $pickedUp: boolean, $mouseX: number, $mouseY: number}>`
  position: ${(props) => props.$pickedUp ? "absolute" : "auto"};
  left: ${(props) => props.$pickedUp ? props.$mouseX-50 + "px" : "auto"};
  top: ${(props) => props.$pickedUp ? props.$mouseY-50 + "px" : "auto"};

  background-color: white;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  width: 100%;
  text-align: left;
  margin-left: ${(props) => props.$depth * 20}px;
  &:hover {
    background-color: grey;
  }
`;

const NoFiles = styled.div`
  color: gray;
  text-align: center;
`;
