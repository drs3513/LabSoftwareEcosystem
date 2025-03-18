'use client'
import TopBar from "./top_bar"
import styled from 'styled-components'
import PanelManager from "./panel_manager"
import NotificationView from "./notification_view"

const Body = styled.div`
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;

`
export default function Home() {
  return (
      <Body>
        <TopBar/>
        <PanelManager/>
          <NotificationView/>
      </Body>
  );
}

