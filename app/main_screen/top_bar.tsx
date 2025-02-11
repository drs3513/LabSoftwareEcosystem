import styled from 'styled-components'


const Top_Bar = styled.div`
    background-color: tan;
    border-bottom: 2px solid black;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
`
const Top_Bar_Item = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 1.5rem;
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    &:hover {
        cursor: pointer;
        background-color: saddlebrown;
        transition: 0.2s;
    }
`

export default function TopBar(){

    const options = ["Options", "Admin", "Test", "Test2"]
    
    return (
        <Top_Bar>
            {options.map((option) => (
                <Top_Bar_Item key={option}>{option}</Top_Bar_Item>
            ))}


        </Top_Bar>
    );
}

