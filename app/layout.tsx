"use client"

import React from "react";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import outputs from "@/amplify_outputs.json";
import styled from "styled-components"
import { GlobalStateProvider } from "./main_screen/GlobalStateContext";
Amplify.configure(outputs);

const Body = styled.body`
    margin: 0;
    padding: 0;
`


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <Body>
        <Authenticator>
          <GlobalStateProvider>
            {children}
          </GlobalStateProvider>
        </Authenticator>
      </Body>
    </html>
  );
}