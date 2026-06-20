import { useEffect } from "react";

/** Set document.title for the current page. Each route sets its own on mount;
 *  no restore-on-unmount needed since the next route sets its own. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
