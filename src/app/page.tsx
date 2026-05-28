import { appConfig } from "@/lib/app-config";

export default function HomePage(): React.JSX.Element {
  return (
    <main>
      <h1>{appConfig.name}</h1>
      <p>{appConfig.tagline}</p>
    </main>
  );
}
