import * as React from "react";

interface Props {
    title: string;
    children: React.ReactNode;
    type: "danger" | "dark" | "primary" | "link" | "info" | "success" | "warning" | "default";
    onClose?: () => void;
}

export class Message extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return <article className={"message" + (this.props.type !== "default" ? " is-" + this.props.type : "")}>
            <div className="message-header">
                <p>{this.props.title}</p>
                {this.props.onClose && <button className="delete" aria-label="delete" onClick={() => this.props.onClose!()}></button>}
            </div>
            <div className="message-body">
                {this.props.children}
            </div>
        </article>;
    }
}