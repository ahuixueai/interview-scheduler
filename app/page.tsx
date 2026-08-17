import PageHeader from "@/components/PageHeader";
import InterviewList from "@/components/InterviewList";

// 动态渲染：mock 数据（如「25 分钟后开始」）按请求时刻生成，
// 若保持静态预渲染会在 build 时冻结时间，next start 后展示过期日程。
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-10">
      <PageHeader />
      <InterviewList />
    </main>
  );
}
