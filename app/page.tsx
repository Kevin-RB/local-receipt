import { ImageUploadCard } from "@/components/image-upload-card";

export default function Home() {
  return (
    <main className="h-svh grid grid-rows-[auto_1fr]">
      <h1 className="text-2xl font-bold px-6 pt-6">Possum Receipts</h1>
      <div className="grid place-items-center p-6">
        <ImageUploadCard />
      </div>
    </main>
  );
}
