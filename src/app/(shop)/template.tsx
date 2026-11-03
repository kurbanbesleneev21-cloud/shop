// Page transition via CSS (opacity only): content is visible without waiting for hydration,
// and no transform is left on the wrapper (it would break position:fixed children).
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
