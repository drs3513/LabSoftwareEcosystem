"use client";

import { useEffect, useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import MainScreen from "./main_screen/page";
import { createUserFromCognito, getCurrentUser } from "@/lib/user";

import "@aws-amplify/ui-react/styles.css";
import { fetchUserAttributes } from "aws-amplify/auth";

const client = generateClient<Schema>();

export default function App() {
  const { user } = useAuthenticator();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.signInDetails?.loginId) {
      console.error("❌ No user ID found in sign-in details.");
      return;
    }

    async function checkAndCreateUser() {
      try {
        const userAttributes = await fetchUserAttributes();
        const userId = userAttributes.sub as string;

        console.log(`🔍 Checking if user ${userId} exists in the database...`);

        // ✅ Fetch user from DynamoDB
        const existingUser = await client.models.User.get({ userId });

        if (existingUser.data) {
          console.log(`✅ User ${userId} already exists.`);
        } else {
          console.log(`❌ User ${userId} not found. Creating new entry...`);
          await createUserFromCognito(); // ✅ Call only if the user does not exist
          console.log("🎉 User created successfully.");
        }

        setLoading(false);
      } catch (error) {
        console.error("❌ Error checking/creating user:", error);
      }
    }

    checkAndCreateUser();
  }, [user]);

  if (loading) return <p>Loading user data...</p>;

  return (
    <main>
      <MainScreen />
    </main>
  );
}
