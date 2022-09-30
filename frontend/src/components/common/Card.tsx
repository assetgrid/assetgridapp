import * as React from "react";

interface Props {
    title: React.ReactElement |string;
    margin?: number;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
    isNarrow: boolean;
}

export default function Card(props: Props) {
    return <div className={"card m-3" + (props.isNarrow ? " container" : "") + (props.className ? " " + props.className : "")} style={props.style}>
        <header className="card-header">
            <p className="card-header-title">
                {props.title}
            </p>
        </header>
        <div className="card-content">
            {props.children}
        </div>
    </div>;
}