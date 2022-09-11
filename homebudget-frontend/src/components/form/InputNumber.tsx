import Decimal from "decimal.js";
import * as React from "react";

interface Props {
    label?: string;
    value: Decimal;
    disabled?: boolean;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}

export default function InputNumber (props: Props) {
    return <div className="field">
        {props.label && <label className="label">{props.label}</label>}
        <div className="field has-addons">
            <div className="control is-expanded">
                <input
                    className="input"
                    type="number"
                    placeholder={props.label}
                    value={props.value.toString()}
                    disabled={props.disabled}
                    onChange={event => props.onChange(event)}
                />
            </div>
        </div>
    </div>;
}