// ConflictModal.tsx
import React, { useState } from 'react';
import styled from 'styled-components';

interface Props {
  filename: string;
  onResolve: (choice: 'rename' | 'overwrite' | 'version' | 'cancel', applyToAll: boolean) => void;
}

/**
 * Simple modal which returns whether a user would like to rename, overwrite, version, or cancel the upload of a file
 * @param filename
 * @param onResolve
 * @constructor
 */
export default function ConflictModal({ filename, onResolve }: Props) {
  const [applyAll, setApplyAll] = useState(false);

  return (
    <ModalBackground>
      <ModalContainer>
        <h3>Conflict: {filename}</h3>
        <p>This file already exists. What would you like to do?</p>
        <label>
          <input type="checkbox" checked={applyAll} onChange={() => setApplyAll(!applyAll)} />
          Apply to all
        </label>
        <Button onClick={() => onResolve("rename", applyAll)}>Rename</Button>
        <Button onClick={() => onResolve("overwrite", applyAll)}>Overwrite</Button>
        <Button onClick={() => onResolve("version", applyAll)}>Create Version</Button>
        <Button onClick={() => onResolve("cancel", applyAll)}>Cancel</Button>
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
