import styled from "styled-components";
import React, {useRef, useState, useEffect} from "react";
import {getFilesByProjectIdAndIsDeleted, hardDeleteFile, Restorefile} from "@/lib/file";
import { getCurrentUser } from "@/lib/user"
import PopoutPanel from "./popout_panel"
import {Button} from "@aws-amplify/ui-react";

interface props {
    initialPosX: number;
    initialPosY: number;
    userId: string;
    close: () => void;
}
interface userInfo{
    userId: string;
    username: string;
    email: string;
    administrator: string;
}
export default function UserInfoPanel({ initialPosX, initialPosY, userId, close}: props) {
    const [userInfo, setUserInfo] = useState<userInfo | undefined>(undefined)
    useEffect(() => {
        if(userId){
            fetchUser()

        }
    }, [userId])

    async function fetchUser(){
        const retrievedUser = await getCurrentUser()
        if(!retrievedUser){
            alert("Failed to fetch user info, refer to console for more information")
            close()
            return
        }
        setUserInfo({
            userId: userId!!,
            username: retrievedUser.username!!,
            email: retrievedUser.email!!,
            administrator: retrievedUser.administrator!!
        })
        console.log(retrievedUser.administrator)
    }

    return (
        <PopoutPanel
            header={`User | ${userInfo ? userInfo.username : ""}`}
            initialPosX ={initialPosX}
            initialPosY = {initialPosY}
            close = {close}>
            {
                userInfo ? (
                    undefined
                ) : (
                    <p>`loading...`</p>

                )
            }
            {userInfo && (
                <UserInfoWrapper>
                    <UserInfoRow>
                        <UserInfo>
                            Current User : {userInfo.username}

                        </UserInfo>

                    </UserInfoRow>

                    <UserInfoRow>
                        <UserInfo></UserInfo>
                        <UserButton>Test</UserButton>
                    </UserInfoRow>


                </UserInfoWrapper>

            )}


        </PopoutPanel>

    );
}

const UserInfoWrapper = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: left;
    align-items: center;
`

const UserInfoRow = styled.div`
    display: flex;
    flex-direction: row;
    
    width: 100%;
    height: fit-content;
    
`
const UserInfo = styled.div`
    padding-top: 1rem;
    padding-bottom: 1rem;
    padding-left: 1rem;
    padding-right: 1rem;
`
const UserButton = styled(Button)`
    margin-left: 1rem;
    height: fit-content;
    align-self: center;
`