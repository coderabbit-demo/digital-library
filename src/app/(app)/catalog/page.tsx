import { redirect } from "next/navigation";

/**
 * Catalog browsing is reorganized into the reference IA (DL-49): discovery now
 * lives in the "Add item" dialog (From catalog tab), and the collection lives at
 * /library. Preserve the destination via a redirect so existing links work
 * (Req 11.4).
 */
export default function CatalogPage(): never {
  redirect("/library");
}
