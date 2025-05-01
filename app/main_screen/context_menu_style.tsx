import styled from 'styled-components'
export const ContextMenuExitButton = styled.button`
  border: none;
  font: inherit;
  outline: inherit;
  height: inherit;
  position: absolute;
  text-align: center;
  
  padding: .2rem .3rem;
  top: 0;
  right: 0;
  visibility: hidden;
  background-color: lightgray;

  &:hover {
    cursor: pointer;
    background-color: gray !important;
  }

`;
export const ContextMenuItem = styled.div`
  position: relative;
  text-align: left;
  border-bottom-style: solid;
  border-bottom-width: 1px;
  border-bottom-color: gray;
  font-size: 14px;
  cursor: pointer;
  &:hover {
    transition: background-color 250ms linear;
    background-color: darkgray;
    
  }
  &:hover > ${ContextMenuExitButton}{
    visibility: visible;
    background-color: darkgray;
    transition: background-color 250ms linear;
  }

  &:last-child {
    border-bottom-style: none;
  }
  padding: 0.2rem 0.5rem 0.2rem 0.2rem;
`


export const ContextMenu = styled.div`
    
    background-color: lightgray;
    border-color: dimgray;
    border-style: solid;
    border-width: 1px;
    display: flex;
    flex-direction: column;
    height: max-content;
    max-height: 300px; /* Add this */
    overflow-y: auto;   /* Add this */
`;


export const ContextMenuWrapper = styled.div<{$x: number, $y: number}>`
    position: fixed;
    z-index: 20;
    left: ${(props) => props.$x}px;
    top: ${(props) => props.$y}px;
    display: flex;
    flex-direction: row;
`;

export const RightContextMenuWrapper = styled.div<{$x: number, $y: number}>`
    position: fixed;
    z-index: 20;
    right: ${(props) => props.$x}px;
    top: ${(props) => props.$y}px;
    display: flex;
    flex-direction: row-reverse;
`;
export const ContextMenuTagInput = styled.input`
  background-color: lightgray;
  border-width: 0;

  margin: 0;
  text-align: left;
  border-bottom-style: solid;
  border-bottom-width: 1px;
  border-bottom-color: gray;
  font-size: 14px;
  width: 100%;
  
  &:hover {
    transition: background-color 250ms linear;
    background-color: darkgray;
  }

  &:last-child {
    border-bottom-style: none;
  }
  &:focus {
    outline: none;
    background-color: darkgray;
    
  }
  padding: 0.2rem 0.5rem 0.2rem 0.2rem;
`

export const ContextMenuPopout = styled.div<{$index: number}>`
    margin-top: ${(props) => "calc(" + props.$index + "* calc(21px + 0.4rem) + 1px)"};
    
    background-color: lightgray;
    border-color: dimgray;
    border-style: solid;
    border-width: 1px;
    height: max-content;
    width: min-content;
    min-width: 150px;
    
`;
