import styled from 'styled-components'
import ChatPanel from './chat_panel'
import FilePanel from '@/app/main_screen/[pid]/[id]/file_panel'
import ProjectPanel from './[pid]/[id]/project_panel'

const Body = styled.div<{$background?:string; $width:string}>`
        width: ${props => props.$width};
        height: 100%;
        background-color: ${props => props.$background || 'black'}
        
    `
interface Props{
    type: number;
    backgroundColor: string;
    width: string;
}
export default function Panel(props: Props ) {
    switch(props.type){
        case 1:
            return (
                <Body $background={props.backgroundColor} $width={props.width}>
                    <ProjectPanel/>
                </Body>
            );
        case 2:
            return (
                <Body $background={props.backgroundColor} $width={props.width} id = "fileRoot">
                    <FilePanel/>
                </Body>
            )
        case 3:
            return (
                <Body $background={props.backgroundColor} $width={props.width}>
                    <ChatPanel/>
                </Body>
            );
        default:
            return (
                <Body $background={props.backgroundColor} $width={props.width}>
                    no type given!
                </Body>
            )
    }


}


