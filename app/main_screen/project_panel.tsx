import styled from 'styled-components'



export default function ProjectPanel(){
    const projects = ['Project_1', 'Project_2', 'Project_3']
    return (
        <>
            {projects.map((name, key) => (
                <Project name={name} key={key}/>
            ))}

        </>
    )
}

const ProjectPane = styled.div`
    width: 100%;
    background-color: white;
    height: auto;
    padding-top: 1rem;
    padding-bottom: 1rem;
    text-align: center;
    &:hover{
        cursor: pointer;
        background-color: grey;
        transition: 0.2s;
    }
`

interface ProjectProps{
    name: string
}
function Project(props: ProjectProps){
    return(
        <ProjectPane>
            {props.name}
        </ProjectPane>
    )

}