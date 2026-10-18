"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

interface ActiveSectionContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const ActiveSectionContext = createContext<ActiveSectionContextValue>({
  activeTab: "courses",
  setActiveTab: () => {},
});

// Map route path -> tab identifier
const PATH_TO_TAB: Record<string, string> = {
  "/": "landing",
  "/home": "home",
  "/landing": "landing",
  "/academy": "academy",
  "/marketplace": "marketplace",
  "/vendor": "vendor",
  "/vendorstore": "vendorstore",
  "/enterprises": "enterprises",
  "/services": "services",
  "/blog": "blog",
  "/about": "about",
  "/verifier": "verifier",
  "/ai-assistant": "ai-assistant",
  "/member": "member",
  "/library": "library",
  "/cart": "cart",
  "/settings": "settings",
  "/notifications": "notifications",
  "/admin": "admin",
  "/showcase": "showcase",
  "/store-view": "store-view",
  "/instructor": "instructor",
};

// Map tab identifier -> route path
const TAB_TO_PATH: Record<string, string> = {
  landing: "/",
  home: "/home",
  academy: "/academy",
  marketplace: "/marketplace",
  vendor: "/vendor",
  vendorstore: "/vendorstore",
  enterprises: "/enterprises",
  services: "/services",
  blog: "/blog",
  about: "/about",
  verifier: "/verifier",
  "ai-assistant": "/ai-assistant",
  member: "/member",
  library: "/library",
  cart: "/cart",
  settings: "/settings",
  notifications: "/notifications",
  admin: "/admin",
  showcase: "/showcase",
  "store-view": "/store-view",
  instructor: "/instructor",
};

export function ActiveSectionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [activeTab, setActiveTabState] = useState<string>(() => {
    return PATH_TO_TAB[pathname || ""] || "landing";
  });

  React.useEffect(() => {
    if (pathname) {
      // Les routes dynamiques comme /vendorstore/{slug} doivent rester sur marketplace
      const tab = PATH_TO_TAB[pathname] || (pathname.startsWith("/vendorstore/") ? "marketplace" : "landing");
      setActiveTabState(tab);
    }
  }, [pathname]);

  const setActiveTab = useCallback(
    (tab: string) => {
      setActiveTabState(tab);
      const path = TAB_TO_PATH[tab];
      if (path && pathname !== path) {
        router.push(path);
      }
    },
    [pathname, router]
  );

  return (
    <ActiveSectionContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </ActiveSectionContext.Provider>
  );
}

export function useActiveSection() {
  return useContext(ActiveSectionContext);
}