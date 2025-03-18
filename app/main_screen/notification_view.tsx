import styled from "styled-components"
import {useNotificationState} from "@/app/NotificationStateContext";
export default function NotificationView() {
    const { activeNotifications, removeNotification } = useNotificationState();


    return (
        <NotificationWrapper>
            {
                activeNotifications.map(
                    (notification, index) => (
                            <Notification key={index}>
                                {notification.message}
                                <NotificationDeleteButton onClick = {() => removeNotification(index)}>
                                    X
                                </NotificationDeleteButton>
                            </Notification>
                    ))}
        </NotificationWrapper>
    )
}

const NotificationWrapper = styled.div`
    height: auto;
    width: auto;
    position: absolute;
    bottom: 0;
    left: 0;
    display: flex;
    flex-direction: column-reverse;
    padding-bottom: .5rem;
    padding-left: .5rem;
`

const Notification = styled.div`
    height: auto;
    width: fit-content;
    padding: 1rem 2rem 1rem 1rem;
    position: relative;
    max-width: 20rem;
    margin-top: .5rem;
    text-align: left;
    background-color: white;
    border-radius: 10px;
    filter: drop-shadow(0px 0px 1px #000000);

`
const NotificationDeleteButton = styled.button`
    border: none;
    font: inherit;
    outline: inherit;
    height: inherit;
    text-align: center;
    position: absolute;
    top: .3rem;
    right: .3rem;
    background-color: inherit;
    
    
    
    &:hover {
        cursor: pointer;
        color: cornflowerblue;
    }
`
