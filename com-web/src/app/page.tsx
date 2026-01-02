import BubbleBoard from "@/app/components/BubbleBoard";

export default function Home() {
  return (
    <main className="min-h-screen bg-white/25 backdrop-blur-[2px] text-gray-900">
      <header className="px-5 pt-7 pb-4">
        <h1 className="text-center text-xl font-semibold tracking-tight">
          O que está explodindo agora
        </h1>
        <p className="text-center text-xs text-gray-500 mt-1">
          Atualizado continuamente
        </p>
      </header>

      <BubbleBoard />
    </main>
  );
}
