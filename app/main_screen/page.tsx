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
    margin: 0;
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

//Home.getLayout = function getLayout(page: ReactElement) {
//    return (
//        <Body>
//            <TopBar/>
//            <PanelManager/>
//            <NotificationView/>
//        </Body>
//    )
//}
