import * as React from "react";

interface Props {
    title: string
    children: React.ReactNode
    type: "danger" | "dark" | "primary" | "link" | "info" | "success" | "warning" | "default"
    onClose?: () => void
}

export default function Message (props: Props): React.ReactElement {
    return <article className={"message" + (props.type !== "default" ? " is-" + props.type : "")}>
        <div className="message-header">
            <p>{props.title}</p>
            {(props.onClose != null) && <button className="delete" aria-label="delete" onClick={() => props.onClose!()}></button>}
        </div>
        <div className="message-body">
            {props.children}
        </div>
    </article>;
}
