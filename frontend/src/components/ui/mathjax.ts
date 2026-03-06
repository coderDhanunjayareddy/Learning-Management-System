declare global {
  interface Window {
    MathJax?: any;
    __mathjaxLoadingPromise?: Promise<void>;
  }
}

const MATHJAX_SRC =
  "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js";

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });

export const ensureMathJax = async () => {
  if (window.MathJax) return;
  if (!window.__mathjaxLoadingPromise) {
    window.MathJax = {
      tex: {
        inlineMath: [
          ["\\(", "\\)"],
          ["$", "$"],
        ],
        displayMath: [
          ["\\[", "\\]"],
          ["$$", "$$"],
        ],
      },
      options: {
        renderActions: {
          addMenu: [],
        },
      },
    };
    window.__mathjaxLoadingPromise = loadScript(MATHJAX_SRC);
  }
  await window.__mathjaxLoadingPromise;
};
