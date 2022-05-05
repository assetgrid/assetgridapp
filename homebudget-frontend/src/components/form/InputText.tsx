import * as React from "react";

export interface InputTextProps {
    label?: string,
    value: string,
    disabled?: boolean,
    onChange: React.ChangeEventHandler<HTMLInputElement>,
}

export default class InputText extends React.Component<InputTextProps> {
    constructor(props: InputTextProps) {
        super(props);
    }

    public render() {
        return <div className="field">
            {this.props.label && <label className="label">{this.props.label}</label>}
            <div className="field has-addons">
                <div className="control is-expanded">
                    <input
                        className="input"
                        type="text"
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