import { SignInButton, SignOutButton } from "@/components/auth-buttons";
import { StudyManager } from "@/components/study-manager";
import { auth } from "@/lib/auth";
import { getBootstrap } from "@/lib/google-sheets";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    return (
      <main className="landingPage">
        <section className="landingHero">
          <p className="eyebrow">Study OS for Examinees</p>
          <h1>Plan, track, review, and memo your study day with Google Sheets.</h1>
          <p>
            This is a personal study planner for exam preparation. Sign in with Google and the app will create
            a dedicated spreadsheet for your daily plans, study logs, todos, exam dates, and diary notes.
          </p>
          <div className="landingActions">
            <SignInButton />
          </div>
        </section>
      </main>
    );
  }

  if (session.authError) {
    return (
      <main className="landingPage">
        <section className="landingHero">
          <p className="eyebrow">Session Error</p>
          <h1>Please reconnect your Google access.</h1>
          <p>Sign in again to refresh the Google token and continue using the spreadsheet integration.</p>
          <div className="landingActions">
            <SignOutButton />
            <SignInButton />
          </div>
        </section>
      </main>
    );
  }

  try {
    const data = await getBootstrap();

    return (
      <>
        <header className="topBar">
          <div>
            <strong>{session.user.name || session.user.email}</strong>
            <span>{session.user.email}</span>
          </div>
          <SignOutButton />
        </header>
        <StudyManager initialData={data} />
      </>
    );
  } catch {
    return (
      <main className="landingPage">
        <section className="landingHero">
          <p className="eyebrow">Google Sheets Error</p>
          <h1>There was a problem preparing your spreadsheet.</h1>
          <p>Check the Google API setup, OAuth redirect URI, and environment variables, then sign in again.</p>
          <div className="landingActions">
            <SignOutButton />
          </div>
        </section>
      </main>
    );
  }
}
