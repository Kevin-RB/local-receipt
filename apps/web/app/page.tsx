export default function Home() {
  return (
    <main className="h-svh flex flex-col">
      <h1 className="text-2xl font-bold p-4">possum receipts</h1>
      <div className="flex-1 grid place-items-center">
        <input type="file" accept="image/*" />
      </div>
    </main>
  );
}
