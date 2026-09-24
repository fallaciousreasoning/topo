import * as React from "react";
import Route from "../routing/Route";
import { useRouteUpdater } from "../routing/router";
import { useSheet } from "./SectionContainer";

export function Chevron({ up }: { up: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-gray-500 transition-transform ${up ? "" : "rotate-180"}`}
    >
      <path d="M5 12l5-5 5 5" />
    </svg>
  );
}

interface Props {
  page: string;
  title?: string;
  closable?: boolean;
  backButton?: boolean;
  exact?: boolean;
  escapeCloses?: boolean;
  children: React.ReactNode | ((props: any) => React.ReactNode);
}

export default function Section(props: Props) {
  const escapeCloses = props.escapeCloses ?? true;
  const updateRoute = useRouteUpdater();
  const sheet = useSheet();
  const [isSmallScreen, setIsSmallScreen] = React.useState(false);

  // Detect small screen (mobile)
  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsSmallScreen(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <Route path={props.page} exact={props.exact}>
      {(routeParams) => (
        <div
          onKeyDown={(e) => {
            if (!escapeCloses) return;

            if (e.key === "Escape") {
              updateRoute({ page: null });
            }
          }}
          className={isSmallScreen
            ? "bg-white px-4 py-2 shadow rounded-t-lg pointer-events-auto"
            : "bg-gray-100 px-4 py-2 z-20 shadow h-screen max-w-md w-screen absolute left-0 top-0 max-h-screen overflow-y-auto pointer-events-auto"
          }
          style={isSmallScreen ? { minHeight: `calc(100vh - 48px)`, scrollSnapAlign: 'none' } : {}}
        >
          {isSmallScreen && (
            <div className="flex justify-center py-2" onClick={sheet?.toggleExpanded}>
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
          )}
          {props.title && (
            <h2 className="font-semibold text-lg flex items-center gap-1">
              {(props.closable || (props.backButton && !isSmallScreen)) && (
                <button onClick={() => updateRoute({ page: null })}>☰</button>
              )}
              {sheet ? (
                <button
                  onClick={sheet.toggleExpanded}
                  aria-label={sheet.isExpanded ? "Collapse" : "Expand"}
                  className="flex items-center gap-1 flex-1 text-left"
                >
                  <Chevron up={!sheet.isExpanded} />
                  {props.title}
                </button>
              ) : (
                props.title
              )}
            </h2>
          )}
          {typeof props.children === "function"
            ? props.children(routeParams)
            : props.children}
        </div>
      )}
    </Route>
  );
}
