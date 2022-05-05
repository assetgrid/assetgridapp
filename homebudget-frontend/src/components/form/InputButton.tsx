import * as React from "react";

export interface InputTextProps {
    label: string,
    onClick?: React.MouseEventHandler<HTMLButtonElement>
}

export default class InputText extends React.Component<InputTextProps> {
    constructor(props: InputTextProps) {
        super(props);
    }

    public render() {
        return <button className="button" onClick={this.props.onClick}>{this.props.label}</button>;
    }
}