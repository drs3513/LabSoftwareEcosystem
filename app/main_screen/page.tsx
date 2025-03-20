'use client'
import TopBar from "./top_bar"
import styled from 'styled-components'
import PanelManager from "./panel_manager"
import NotificationView from "./notification_view"

const Body = styled.div`
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
    overflow-y: hidden;

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
          <NotificationView/>
      </Body>
  );
}

