'use client'
import TopBar from "./top_bar"
import styled from 'styled-components'
import PanelManager from "./panel_manager"
import { useGlobalState } from "./GlobalStateContext";


const Body = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;

`
export default function Home() {
    const { fileId, projectId, userId, contextMenu, setContextMenu, contextMenuType, setContextMenuType, setFileId } = useGlobalState();

    function removeContextMenu(e){
        setContextMenu(false);
        setContextMenuType("None");
    }
  return (
      <Body onClick={(e) => removeContextMenu(e)}>
        <TopBar/>
        <PanelManager/>

      </Body>
  );
}

