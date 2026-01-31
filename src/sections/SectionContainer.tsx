import * as React from "react";
import { useParams, useRouteUpdater } from "../routing/router";

const COLLAPSED_HEIGHT_VH = 20;

export default function SectionContainer({ children }: { children: React.ReactNode }) {
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);
  const params = useParams();
  const updateRoute = useRouteUpdater();
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Detect small screen (mobile)
  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const hasActivePage = params.page !== null;
  const isSheet = isSmallScreen && hasActivePage;

  // Pages that should start maximized
  const maximizedPages = ['search', 'menu', 'mountains', 'settings', 'points', 'point'];
  const shouldStartMaximized = params.page && maximizedPages.some(p => params.page === p || params.page?.startsWith(p + '/'));

  // Track previous page to detect when we're opening a new page vs navigating between pages
  const prevPageRef = React.useRef<string | null>(null);

  // Reset prevPageRef when page is closed
  React.useEffect(() => {
    if (!hasActivePage) {
      prevPageRef.current = null;
    }
  }, [hasActivePage]);

  // Scroll to initial position when section opens or when navigating to a maximized page
  React.useEffect(() => {
    if (!isSheet || !containerRef.current) return;

    const isNewPage = prevPageRef.current !== params.page;
    const wasClosedBefore = prevPageRef.current === null;

    // Only reset scroll position if:
    // 1. Opening a page from closed state, OR
    // 2. Navigating to a maximized page (not FROM a maximized page)
    if (wasClosedBefore || (isNewPage && shouldStartMaximized)) {
      if (shouldStartMaximized) {
        // Scroll to expanded position (past off-screen + collapsed spacers + fixed spacer)
        containerRef.current.scrollTop = window.innerHeight + (window.innerHeight * 0.8 - 48);
      } else {
        // Scroll to the collapsed snap point (past the off-screen spacer)
        containerRef.current.scrollTop = window.innerHeight;
      }
    }

    prevPageRef.current = params.page;
  }, [hasActivePage, isSheet, shouldStartMaximized, params.page]);

  // Close when scrolled completely off screen
  React.useEffect(() => {
    if (!isSheet || !containerRef.current) return;

    const handleScroll = () => {
      if (containerRef.current && containerRef.current.scrollTop < 50) {
        updateRoute({ page: null });
      }
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isSheet, updateRoute]);

  const outerContainerStyle = isSheet ? {
    scrollSnapType: 'y proximity',
    overflowY: 'scroll' as const,
    WebkitOverflowScrolling: 'touch' as const
  } : {};

  const outerContainerClasses = isSheet
    ? "fixed inset-0 z-20 pointer-events-none flex flex-col"
    : "";

  // Three snap points: off-screen (0), collapsed (20vh), expanded (100vh - 48px)
  const spacerOffScreenStyle = isSheet ? {
    minHeight: '100vh', // Allows content to scroll completely off screen
    flexShrink: 0,
    scrollSnapAlign: 'start' as const,
    scrollSnapStop: 'always' as const,
    pointerEvents: 'none' as const
  } : {};

  const spacerCollapsedStyle = isSheet ? {
    minHeight: `calc(${100 - COLLAPSED_HEIGHT_VH}vh - 48px)`, // Creates collapsed snap point
    flexShrink: 0,
    scrollSnapAlign: 'start' as const,
    scrollSnapStop: 'always' as const,
    pointerEvents: 'none' as const
  } : {};

  const spacerFixedStyle = isSheet ? {
    minHeight: '48px', // Always present at top
    flexShrink: 0,
    scrollSnapAlign: 'start' as const,
    scrollSnapStop: 'always' as const,
    pointerEvents: 'none' as const
  } : {};

  if (!isSheet) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className={outerContainerClasses} style={outerContainerStyle}>
      <div style={spacerOffScreenStyle} />
      <div style={spacerCollapsedStyle} />
      <div style={spacerFixedStyle} />
      <div className="bg-white shadow rounded-t-lg pointer-events-auto" style={{ minHeight: `calc(100vh - 48px)` }}>
        {children}
      </div>
    </div>
  );
}
