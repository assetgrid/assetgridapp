import * as React from "react";

export interface InputButtonProps {
    label: string,
    onClick?: React.MouseEventHandler<HTMLButtonElement>
}

export default class InputButton extends React.Component<InputButtonProps> {
    constructor(props: InputButtonProps) {
        super(props);
    }

    public render() {
        return <button className="button" onClick={this.props.onClick}>{this.props.label}</button>;
    }
}