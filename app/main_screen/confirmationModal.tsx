// ConflictModal.tsx
import React, { useState } from 'react';
import styled from 'styled-components';

interface Props {
    message: string;
    onResolve: (choice: 'Yes' | 'No') => void;
}

/**
 * Simple modal which returns whether the user accepts, or rejects a given option
 * @constructor
 */
export default function ConflictModal({ message, onResolve }: Props) {

    return (
        <ModalBackground>
            <ModalContainer>
                <p>{message}</p>
                <Button onClick={() => onResolve("Yes")}>Accept</Button>
                <Button onClick={() => onResolve("No")}>Reject</Button>
            </ModalContainer>
        </ModalBackground>
    );
}

const ModalBackground = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
`;

const ModalContainer = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  text-align: center;
`;

const Button = styled.button`
  margin: 0.5rem;
  padding: 0.5rem 1rem;
`;
