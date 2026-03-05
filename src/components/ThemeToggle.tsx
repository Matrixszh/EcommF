"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import "theme-toggles/css/classic.css";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const transitionTimeoutIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    return () => {
      if (transitionTimeoutIdRef.current !== null) {
        window.clearTimeout(transitionTimeoutIdRef.current);
      }
    };
  }, []);

  if (!mounted) {
    return (
      <button
        className="theme-toggle"
        type="button"
        title="Toggle theme"
        aria-label="Toggle theme"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          width="1.5em"
          height="1.5em"
          fill="currentColor"
          strokeLinecap="round"
          className="theme-toggle__classic"
          viewBox="0 0 32 32"
        >
          <clipPath id="theme-toggle__classic__cutout">
            <path d="M0-5h30a1 1 0 0 0 9 13v24H0Z" />
          </clipPath>
          <g clipPath="url(#theme-toggle__classic__cutout)">
            <circle cx="16" cy="16" r="9.34" />
            <g stroke="currentColor" strokeWidth="1.5">
              <path d="M16 5.5v-4" />
              <path d="M16 30.5v-4" />
              <path d="M1.5 16h4" />
              <path d="M26.5 16h4" />
              <path d="m23.4 8.6 2.8-2.8" />
              <path d="m5.7 26.3 2.9-2.9" />
              <path d="m5.8 5.8 2.8 2.8" />
              <path d="m23.4 23.4 2.9 2.9" />
            </g>
          </g>
        </svg>
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";
  const toggleTheme = () => {
    const root = document.documentElement;
    root.classList.add("theme-transition");

    if (transitionTimeoutIdRef.current !== null) {
      window.clearTimeout(transitionTimeoutIdRef.current);
    }

    transitionTimeoutIdRef.current = window.setTimeout(() => {
      root.classList.remove("theme-transition");
      transitionTimeoutIdRef.current = null;
    }, 350);

    setTheme(isDark ? "light" : "dark");
  };

  return (
    <button
      className={`theme-toggle ${isDark ? "theme-toggle--toggled" : ""}`}
      type="button"
      title="Toggle theme"
      aria-label="Toggle theme"
      onClick={toggleTheme}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        width="1.5em"
        height="1.5em"
        fill="currentColor"
        strokeLinecap="round"
        className="theme-toggle__classic"
        viewBox="0 0 32 32"
      >
        <clipPath id="theme-toggle__classic__cutout">
          <path d="M0-5h30a1 1 0 0 0 9 13v24H0Z" />
        </clipPath>
        <g clipPath="url(#theme-toggle__classic__cutout)">
          <circle cx="16" cy="16" r="9.34" />
          <g stroke="currentColor" strokeWidth="1.5">
            <path d="M16 5.5v-4" />
            <path d="M16 30.5v-4" />
            <path d="M1.5 16h4" />
            <path d="M26.5 16h4" />
            <path d="m23.4 8.6 2.8-2.8" />
            <path d="m5.7 26.3 2.9-2.9" />
            <path d="m5.8 5.8 2.8 2.8" />
            <path d="m23.4 23.4 2.9 2.9" />
          </g>
        </g>
      </svg>
    </button>
  );
}
