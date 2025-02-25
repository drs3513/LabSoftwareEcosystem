"use client";

import React, {useEffect, useRef, useState} from "react";
import { useGlobalState } from "./GlobalStateContext";
import {listFilesForProject, createFile, updateFileLocation} from "@/lib/file";
import styled from "styled-components";
import {Nullable} from "@aws-amplify/data-schema";


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

interface fileInfo{
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
  open: boolean,
  isDirectory: boolean | null
}

interface fileInfoDict extends fileInfo{
  index: number
}

export default function FilePanel() {
  /*
  function createContextMenuPanel(e: React.MouseEvent<HTMLDivElement>){
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
  */

  function createContextMenu(e: React.MouseEvent<HTMLDivElement>, fileId: string | undefined, filepath: string | undefined, location: string){
    if(e.target != e.currentTarget){
      return
    }
    isLongPress.current = false;
    clearTimeout(timer.current);
    e.preventDefault();
    setContextMenu(true);
    setContextMenuType(location);
    setContextMenuPosition([e.clientX, e.clientY]);
    setContextMenuFileId(fileId);
    setContextMenuFilePath(filepath);
  }

  const { projectId, userId, contextMenu, setContextMenu, contextMenuType, setContextMenuType, setFileId } = useGlobalState();

  const [contextMenuPosition, setContextMenuPosition] = useState([0,0])
  const [mouseCoords, setMouseCoords] = useState([0,0])
  const [contextMenuFileId, setContextMenuFileId] = useState<string | undefined>(undefined);
  const [contextMenuFilePath, setContextMenuFilePath] = useState<string | undefined>(undefined);

  const [files, setFiles] = useState<Array<fileInfo>>([]);

  const filesByParentId = useRef<{[key: string]: [number]}>({})
  const filesByFileId = useRef<{[key: string]: number}>({})

  const [sort, setSort] = useState("date")
  const [pickedUpFileId, setPickedUpFileId] = useState<string | undefined>(undefined)
  //sorts files to be displayed by the user
  //TODO allow toggle of sort mode through setting 'sort' state
  function sort_files(files: Array<fileInfo>){

    //put each file into its own 'bucket', which designates which parentId it belongs to, allows for seperate sorting
    //within subdirectories
    let files_by_parentId: {[key: string]: any} = {}
    filesByParentId.current = {}
    let index = 0
    for(let file of files) {
      if(filesByParentId.current[file.parentId != null ? file.parentId : "no_parent"] == null){
        filesByParentId.current[file.parentId != null ? file.parentId : "no_parent"] = [index]
      } else {
        filesByParentId.current[file.parentId != null ? file.parentId : "no_parent"].push(index)
      }
      index += 1
    }
    console.log(filesByParentId.current)
    //sort by date
    for(let key in files_by_parentId.current){
      console.log(key)
      console.log(files_by_parentId.current[key])

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
        let temp_files: Array<fileInfo> = []
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
              open: false,
              isDirectory: file.isDirectory
            }]
        }

        setFiles(sort_files(temp_files));
        }
      }
    fetchFiles();
  }, [projectId]);



  const handleCreateFile = async (isDirectory: boolean) => {

    const filename = prompt("Enter File Name:");
    if (!filename || !projectId || !userId) return;

    try {
      const newFile = await createFile(projectId, filename, isDirectory, `${contextMenuFilePath ? contextMenuFilePath : ""}/${filename}`, userId, 5, "1", contextMenuFileId);


      if (newFile && newFile.data) {
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
          open: false,
          isDirectory: newFile.data.isDirectory
        })
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

  function onFileMouseDown(currFileId : string) {
    isLongPress.current = true
    timer.current = setTimeout(() => {
      if(isLongPress.current){
        recursiveCloseFolder(currFileId);
        setPickedUpFileId(currFileId);

      }
    }, 500)

  }
  //TODO You could probably make this section more efficient, currently runs in 2n time, could be reduced to n?
  //Debate storing a couple of separate dicts which are all files callable by : fileId, parentId
  async function recursiveGeneratePaths(currFileId: Nullable<string>, pathAppend: string){
    let newPathAppend: string = pathAppend
    for(let i in files){
      if(files[i].fileId == currFileId){
        files[i].filepath = pathAppend + files[i].filename
        try {
          await updateFileLocation(currFileId, pathAppend + files[i].filename, files[i].parentId)
        } catch (error) {
          console.error("Error updating file:", error);
          alert("Failed to update file");
        }
        newPathAppend = pathAppend + files[i].filename + "/"
      }
    }

    for(let i in files){
      if(files[i].parentId == currFileId){
        await recursiveGeneratePaths(files[i].fileId, newPathAppend)
      }
    }

  }
  function onFileMouseUp(e: React.MouseEvent<HTMLDivElement>, overFileId: Nullable<string>, overFilePath: Nullable<string>) {
    if(e.target != e.currentTarget){
      return
    }
    isLongPress.current = false;
    clearTimeout(timer.current);

    if(pickedUpFileId !== null){
      for(let i in files){
        if(files[i].fileId == pickedUpFileId){
          files[i].parentId = overFileId
          recursiveGeneratePaths(pickedUpFileId, overFilePath !== null ? overFilePath + "/" : "/").then()



        }
      }
      setFiles(sort_files(files))
    }

    setPickedUpFileId(undefined);
  }
  const timer = useRef(setTimeout(() => {
  }, 500));


  const isLongPress = useRef(false);


  return (
      <PanelContainer
          onContextMenu={(e) => createContextMenu(e, undefined, undefined, 'filePanel')}
          onMouseUp={(e) => onFileMouseUp(e, null, null)}
          onMouseMove = {(e) => setMouseCoords([e.clientX, e.clientY])}>
        {files.length > 0 ? (
            files.filter(file => file.visible).map((file) => (
                <File key={file.fileId}
                      $depth={(file.filepath.match(/\//g) || []).length}
                      $pickedUp={pickedUpFileId == file.fileId}
                      $mouseX = {mouseCoords[0]}
                      $mouseY = {mouseCoords[1]}
                      onMouseDown = {() => onFileMouseDown(file.fileId)}
                      onMouseUp = {(e) => onFileMouseUp(e, file.fileId, file.filepath)}
                      onClick={() => openCloseFolder(file.fileId)}
                      onContextMenu={(e) => createContextMenu(e, file.fileId, file.filepath, file.isDirectory ? 'fileFolder' : 'fileFile')}>
                  {file.isDirectory ? "📁" : "🗎"}  {file.filename}
                </File>
            ))
        ) : (
            <NoFiles>No files available.</NoFiles>
        )}
        {
          contextMenu && contextMenuType=="filePanel" ? (
              <ContextMenu $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                <ContextMenuItem onClick={() => handleCreateFile(false)}>
                  Create File
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCreateFile(true)}>
                  Create Folder
                </ContextMenuItem>
                <ContextMenuItem>
                  Open Chat
                </ContextMenuItem>
              </ContextMenu>
          ) : contextMenu && contextMenuType=="fileFile" ? (
              <ContextMenu $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                <ContextMenuItem>
                  Rename
                </ContextMenuItem>
                <ContextMenuItem>
                  Properties
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setFileId(contextMenuFileId)}>
                  Open Chat
                </ContextMenuItem>
              </ContextMenu>
          ) : contextMenu && contextMenuType=="fileFolder" ? (
              <ContextMenu $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                <ContextMenuItem onClick={() => handleCreateFile(false)}>
                  Create File
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCreateFile(true)}>
                  Create Folder
                </ContextMenuItem>
                <ContextMenuItem>
                  Delete Folder
                </ContextMenuItem>
                <ContextMenuItem>
                  Properties
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setFileId(contextMenuFileId)}>
                  Open Chat
                </ContextMenuItem>
              </ContextMenu>
          ) : (
              <>
              </>
          )
        }
      </PanelContainer>
  );


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

const File = styled.div.attrs<{$depth: number, $pickedUp: boolean, $mouseX: number, $mouseY: number}>(props => ({
  style: {
    position: props.$pickedUp ? "absolute" : undefined,
    top: props.$pickedUp ? props.$mouseY-50 + "px" : "auto",
    left: props.$pickedUp ? props.$mouseX-50 + "px" : "auto",
    marginLeft: props.$pickedUp ? "auto" : props.$depth * 20,
    width: "calc(100% - " + props.$depth * 20 + "px)"
  }
}))`
  background-color: white;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  text-align: left;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  &:hover {
    background-color: grey;
  }
`;

const NoFiles = styled.div`
  color: gray;
  text-align: center;
`;
