import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import PageHeader from "@/components/PageHeader";
import InterviewList from "@/components/InterviewList";

// 动态渲染 + 登录守卫（未登录跳转 /login）
export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getSession();
  if (!session.userId) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10">
      <PageHeader userEmail={session.email} />
      <InterviewList />
    </main>
  );
}
