import { useCallback, type MouseEvent } from "react";
import { useRouter } from "next/navigation";

export function useEditorLinkClick() {
  const router = useRouter();

  return useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      event.preventDefault();
      router.push(`${url.pathname}${url.search}${url.hash}`);
    },
    [router],
  );
}
