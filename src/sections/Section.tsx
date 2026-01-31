import * as React from "react";
import Route from "../routing/Route";
import { useRouteUpdater } from "../routing/router";

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
            <div className="flex justify-center py-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
            </div>
          )}
          {props.title && (
            <h2 className="font-semibold text-lg flex items-center gap-1">
              {props.backButton && (
                <button onClick={(e) => window.history.back()} className="leading-none">←</button>
              )}
              {props.closable && (
                <button onClick={(e) => updateRoute({ page: null })}>☰</button>
              )}
              {props.title}
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
