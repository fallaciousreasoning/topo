import React from "react";
import Section from "./Section";
import { useRouteUpdater } from "../routing/router";

function MenuEntry(props: { text: string, page: string }) {
    const routeUpdater = useRouteUpdater()

    return <li className="text-lg">
        <button className="cursor-pointer w-full text-start hover:text-gray-600" onClick={() => routeUpdater({ page: props.page })}>
            {props.text}
        </button>
    </li>
}

export default function MenuSection() {

    return <Section closable exact title="NZ Topo" page="menu">
        <ul className="mt-1">
            <MenuEntry text="Search" page='search'/>
            <MenuEntry text="Mountains" page='mountains'/>
            <MenuEntry text="Routes" page='routes'/>
            <MenuEntry text="Settings" page='settings'/>
        </ul>
    </Section>
}
