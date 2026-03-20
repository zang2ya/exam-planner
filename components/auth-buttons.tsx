"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButton() {
  return (
    <button className="primaryButton" onClick={() => signIn("google")}>
      Continue with Google
    </button>
  );
}

export function SignOutButton() {
  return (
    <button className="ghostButton" onClick={() => signOut()}>
      Sign out
    </button>
  );
}
