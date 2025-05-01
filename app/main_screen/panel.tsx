import styled from 'styled-components'
import ChatPanel from './chat_panel'
import FilePanel from '@/app/main_screen/[pid]/[id]/file_panel'
import ProjectPanel from './[pid]/[id]/project_panel'


/**
 * Interface for any panel. Used to create projectPanel, filePanel, and chatPanel
 */
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

const Body = styled.div.attrs<{$background:string, $width:string}>(props => ({
    style: {
        width: props.$width,
        backgroundColor: props.$background
    }
}))`
        height: 100%;
    `
