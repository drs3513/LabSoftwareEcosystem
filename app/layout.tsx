"use client"

import React from "react";
import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import outputs from "@/amplify_outputs.json";
import styled from "styled-components"
import { GlobalStateProvider } from "./GlobalStateContext";
import {NotificationStateProvider} from "./NotificationStateContext"
Amplify.configure(outputs);

const Body = styled.body`
    margin: 0;
    padding: 0;
`

/**
 * Default page layout
 * @param children
 * @constructor
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{margin: 0}}>
      <Body style={{margin: 0}} id={"root"}>
        <Authenticator hideSignUp>
          <GlobalStateProvider>
            <NotificationStateProvider>
              {children}
            </NotificationStateProvider>
          </GlobalStateProvider>
        </Authenticator>
      </Body>
    </html>
  );
}