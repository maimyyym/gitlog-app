import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";
import {graphql} from "@octokit/graphql";
import {useEffect, useState} from "react";


export default function Home() {
  const { data: session } = useSession();

  if (session) {
    return (
      <>
        Signed in as {session.user?.name} <br />
        <button onClick={() => signOut()}>Sign out</button>
      </>
    );
  }

  return (
    <>
      Not signed in <br />
      <button onClick={() => signIn("github")}>Sign in</button>
    </>
  );
}
