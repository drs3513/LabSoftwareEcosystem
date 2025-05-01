import styled from "styled-components";
import React, {useRef, useState, ReactNode} from "react";
import { useGlobalState } from "../GlobalStateContext";

interface props {
    header: string;
    initialPosX: number;
    initialPosY: number;
    close: () => void;
    children?: React.ReactNode;
}


export default function PopoutPanel({ header, initialPosX, initialPosY, close, children}: props) {
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



    return (
        <PanelContainer
            $posX = {posX}
            $posY = {posY}
            $width = {panelWidth}
            $height = {panelHeight}
        >
            <Header draggable={true} onDragStart={(e) => handleStartDrag(e)}
                    onDragEnd={(e) => handleEndDrag(e)}>
                {header}
                <CloseButton onClick={close}>
                    ✖
                </CloseButton>
            </Header>
            <>
                {children}
            </>

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
        zIndex: 150
    }
}))`

    position: fixed;
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
    min-width: fit-content;
`
const Header = styled.div`
    width: 100%;
    min-width: fit-content;
    padding: 10px;
    padding-right: 36px;
    background-color: #AFC1D0;
    text-align: center;
    font-weight: bold;
    border-bottom: 2px solid #D7DADD;
    cursor: grab;
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