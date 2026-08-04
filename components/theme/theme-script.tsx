import Script from "next/script";

// Server component that emits a tiny blocking inline script. It runs before the
// browser paints, setting the `.dark` class on <html> from the saved appearance
// (localStorage → server default → OS preference) so the page doesn't flash the
// light theme before ThemeProvider's effect runs. Keep in sync with the
// localStorage key + logic in `theme-provider.tsx`.
//
// Uses next/script (strategy="beforeInteractive") rather than a raw <script>
// tag — Next.js injects beforeInteractive scripts into the initial HTML
// itself, so it actually runs pre-paint; a plain JSX <script> is patched in
// via React's normal DOM diffing, which browsers never execute.
export function ThemeScript({ appearanceMode }: { appearanceMode: string }) {
  const js = `(function(){try{var a=localStorage.getItem('support_tool_appearance')||'${appearanceMode}';var d=a==='dark'||(a==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList[d?'add':'remove']('dark');}catch(e){}})();`;
  return (
    <Script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: static, non-user script run before paint to prevent theme flash
      dangerouslySetInnerHTML={{ __html: js }}
      id="theme-script"
      strategy="beforeInteractive"
    />
  );
}
