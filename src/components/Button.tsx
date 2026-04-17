import React from "react";

export default function Button(
  props: React.PropsWithChildren<{
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    title?: string;
  }>,
) {
  return (
    <button
      className="bg-purple-600 hover:bg-purple-700 transition p-1 rounded-md text-white"
      onClick={props.onClick}
      title={props.title}
    >
      {props.children}
    </button>
  );
}
