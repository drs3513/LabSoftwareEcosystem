"use client";

import { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import MainScreen from "./main_screen/page";
import { createUserFromCognito, getCurrentUser } from "@/lib/user";

import "@aws-amplify/ui-react/styles.css";
import { fetchUserAttributes } from "aws-amplify/auth";
import Link from "next/link";
import {useRouter} from "next/navigation";

const client = generateClient<Schema>();

/**
 * Sign in page
 * @constructor
 */
export default function App() {

  const { user } = useAuthenticator();
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user?.signInDetails?.loginId) {
      console.error("No user ID found in sign-in details.");
      return;
    }

    async function checkAndCreateUser() {
      try {
        const userAttributes = await fetchUserAttributes();
        const userId = userAttributes.sub as string;

        // Fetch user from DynamoDB
        const existingUser = await client.models.User.get({ userId });

        if (!existingUser.data){
          await createUserFromCognito(); // Call only if the user does not exist
        }

        setLoading(false);
        router.push('/main_screen')
      } catch (error) {
        console.error("Error checking/creating user:", error);
      }
    }

    checkAndCreateUser();
  }, [user, router]);

  if (loading) return <p>Loading user data...</p>;




}
