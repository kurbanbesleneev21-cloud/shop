// No page-transition animation: content appears as soon as it arrives (fastest perceived navigation).
export default function Template({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
