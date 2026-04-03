import { SignInButton, SignOutButton } from "@/components/auth-buttons";
import { StudyManager } from "@/components/study-manager";
import { auth } from "@/lib/auth";
import { demoData } from "@/lib/demo-data";
import { getBootstrap } from "@/lib/google-sheets";

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ demo?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const demoMode = params.demo === "1";
  const session = await auth();

  if (demoMode) {
    return (
      <>
        <header className="topBar">
          <div>
            <strong>데모 모드</strong>
            <span>Google 로그인 없이 화면만 둘러보는 상태입니다.</span>
          </div>
        </header>
        <StudyManager initialData={demoData} />
      </>
    );
  }

  if (!session?.user) {
    return (
      <main className="landingPage">
        <section className="landingHero">
          <p className="eyebrow">Study OS for Examinees</p>
          <h1>구글 시트와 함께 계획, 기록, 회고를 한 번에 관리하세요.</h1>
          <p>
            수험생을 위한 개인 학습 관리 앱입니다. Google로 로그인하면 데일리 계획, 공부 기록, 투두,
            시험 일정, 일기 메모를 저장할 전용 스프레드시트를 자동으로 만들어 줍니다.
          </p>
          <div className="landingActions">
            <SignInButton />
            <a className="ghostButton" href="/?demo=1">
              데모로 둘러보기
            </a>
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
          <h1>Google 권한을 다시 연결해 주세요.</h1>
          <p>로그인을 다시 하면 Google 토큰을 새로 받아 스프레드시트 연동을 계속 사용할 수 있습니다.</p>
          <div className="landingActions">
            <SignOutButton />
            <SignInButton />
            <a className="ghostButton" href="/?demo=1">
              데모로 보기
            </a>
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
          <h1>스프레드시트를 준비하는 중 문제가 생겼어요.</h1>
          <p>Google API 설정, OAuth 리디렉션 URI, 환경변수를 확인한 뒤 다시 로그인해 주세요.</p>
          <div className="landingActions">
            <SignOutButton />
            <a className="ghostButton" href="/?demo=1">
              데모로 보기
            </a>
          </div>
        </section>
      </main>
    );
  }
}
