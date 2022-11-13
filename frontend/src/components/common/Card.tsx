import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";
import * as React from "react";
import { classList } from "../../lib/Utils";
import InputIconButton from "../input/InputIconButton";

interface Props {
    title: React.ReactElement | string
    margin?: number
    className?: string
    style?: React.CSSProperties
    children: React.ReactNode
    isNarrow: boolean
    collapsed?: boolean
    setCollapsed?: React.Dispatch<React.SetStateAction<boolean>>
}

export default function Card (props: Props): React.ReactElement {
    return <div className={"card m-3" + (props.isNarrow ? " container" : "") + (props.className !== undefined ? " " + props.className : "")}
        style={props.style}>
        <header className="card-header" onClick={() => props.setCollapsed?.(collapsed => !collapsed)}
            style={props.collapsed !== undefined ? { cursor: "pointer" } : {}}>
            <p className="card-header-title">
                {props.setCollapsed !== undefined && <InputIconButton
                    icon={props.collapsed === true ? faChevronDown : faChevronUp} />}
                {props.title}
            </p>
        </header>
        <div className={"card-content " + classList({ "is-hidden": props.collapsed === true })}>
            {props.children}
        </div>
    </div>;
}
