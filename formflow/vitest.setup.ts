import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement ResizeObserver; provide a no-op so hooks don't crash
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
