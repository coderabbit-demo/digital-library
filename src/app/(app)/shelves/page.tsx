import { redirect } from "next/navigation";

/**
 * The Shelves route is reorganized into the reference IA (DL-46): the user's
 * collection now lives at /library. Preserve the destination via a redirect so
 * existing links keep working (Req 10.4).
 */
export default function ShelvesPage(): never {
  redirect("/library");
}
