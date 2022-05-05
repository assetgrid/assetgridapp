import * as React from "react";

export interface InputNumberProps {
    label: string,
    value: number,
    disabled?: boolean
    onChange: React.ChangeEventHandler<HTMLInputElement>,
}

export default class InputNumber extends React.Component<InputNumberProps> {
    constructor(props: InputNumberProps) {
        super(props);
    }

    public render() {
        return <div className="field">
            <label className="label">{this.props.label}</label>
            <div className="field has-addons">
                <div className="control is-expanded">
                    <input
                        className="input"
                        type="number"
                        placeholder={this.props.label}
                        value={this.props.value}
                        disabled={this.props.disabled}
                        onChange={event => this.props.onChange(event)}
                    />
                </div>
            </div>
        </div>;
    }
}