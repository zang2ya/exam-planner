"use client";

import { signIn, signOut } from "next-auth/react";

export function SignInButton() {
  return (
    <button className="primaryButton" onClick={() => signIn("google")}>
      Google로 시작하기
    </button>
  );
}

export function SignOutButton() {
  return (
    <button className="ghostButton" onClick={() => signOut()}>
      로그아웃
    </button>
  );
}
