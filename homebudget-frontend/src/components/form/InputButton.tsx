import * as React from "react";

interface Props {
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    className?: string;
}

export default class InputButton extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return <button className={"button " + this.props.className} onClick={this.props.onClick}>{this.props.children}</button>;
    }
}