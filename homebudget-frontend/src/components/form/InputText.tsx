import * as React from "react";

export interface InputTextProps {
    label?: string,
    value: string,
    disabled?: boolean,
    error?: string,
    addOnAfter?: React.ReactElement,
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
                        className={"input" + (this.props.error ? " is-danger" : "")}
                        type="text"
                        placeholder={this.props.label}
                        value={this.props.value}
                        disabled={this.props.disabled}
                        onChange={event => this.props.onChange(event)}
                    />
                    {this.props.error !== undefined && <p className="help has-text-danger">
                        {this.props.error}
                    </p>}
                </div>
                {this.props.addOnAfter && this.props.addOnAfter}
            </div>
        </div>;
    }
}