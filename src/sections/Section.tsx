import * as React from "react";
import Route from "../routing/Route";
import { useRouteUpdater } from "../routing/router";

interface Props {
  page: string;
  title: string;
  closable: boolean;
  exact?: boolean;
  escapeCloses?: boolean;
  children: React.ReactNode | ((props: any) => React.ReactNode);
}

const EXPANDED_HEIGHT_VH = 80; // 80vh
const COLLAPSED_HEIGHT_VH = 20; // 20vh

export default function Section(props: Props) {
  const escapeCloses = props.escapeCloses ?? true;
  const updateRoute = useRouteUpdater();
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);
  const [sheetHeight, setSheetHeight] = React.useState(COLLAPSED_HEIGHT_VH);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Detect touch device
  React.useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouchDevice();
    window.addEventListener('resize', checkTouchDevice);
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, []);

  const isSheet = isTouchDevice;

  const outerContainerStyle = isSheet ? {
    scrollSnapType: 'y mandatory',
    overflowY: 'scroll' as const,
    WebkitOverflowScrolling: 'touch' as const
  } : {};

  const outerContainerClasses = isSheet
    ? "fixed inset-0 z-20 pointer-events-auto flex flex-col"
    : "";

  const containerClasses = isSheet
    ? `bg-white px-4 py-2 shadow rounded-t-lg overflow-y-auto`
    : "bg-gray-100 px-4 py-2 z-20 shadow h-screen max-w-md w-screen absolute left-0 top-0 max-h-screen overflow-y-auto";

  const containerStyle = isSheet ? {
    minHeight: `calc(100vh - 48px)`
  } : {};

  const spacerFixedStyle = isSheet ? {
    minHeight: '48px', // Always present at top
    flexShrink: 0,
    scrollSnapAlign: 'start' as const,
    pointerEvents: 'none' as const
  } : {};

  const spacerScrollableStyle = isSheet ? {
    minHeight: `calc(100vh - 48px - ${COLLAPSED_HEIGHT_VH}vh)`, // Scrolls out of view
    flexShrink: 0,
    scrollSnapAlign: 'start' as const,
    pointerEvents: 'none' as const
  } : {};

  return (
    <Route path={props.page} exact={props.exact}>
      {(routeParams) => {
        const content = (
          <div
            ref={containerRef}
            onKeyDown={(e) => {
              if (!escapeCloses) return;

              if (e.key === "Escape") {
                updateRoute({ page: null });
              }
            }}
            className={containerClasses}
            style={containerStyle}
          >
            {isSheet && (
              <div className="flex justify-center py-2">
                <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
              </div>
            )}
            <h2 className="font-semibold text-lg flex gap-1">
              {props.closable && (
                <button onClick={(e) => updateRoute({ page: null })}>☰</button>
              )}
              {props.title}
            </h2>
            {typeof props.children === "function"
              ? props.children(routeParams)
              : props.children}
          </div>
        );

        if (isSheet) {
          return (
            <div className={outerContainerClasses} style={outerContainerStyle}>
              <div style={spacerScrollableStyle} />
              <div style={spacerFixedStyle} />
              {content}
            </div>
          );
        }

        return content;
      }}
    </Route>
  );
}
