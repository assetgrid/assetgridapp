import * as React from "react";

interface Props {
    label?: string,
    value: string,
    disabled?: boolean,
    error?: string,
    addOnAfter?: React.ReactElement,
    onChange: React.ChangeEventHandler<HTMLInputElement>,
    isSmall?: boolean;
}

export default function InputText (props: Props) {
    return <div className="field">
        {props.label && <label className="label">{props.label}</label>}
        <div className="field has-addons">
            <div className="control is-expanded">
                <input
                    className={"input" + (props.error ? " is-danger" : "") + (props.isSmall ? " is-small" : "")}
                    type="text"
                    placeholder={props.label}
                    value={props.value}
                    disabled={props.disabled}
                    onChange={event => props.onChange(event)}
                />
                {props.error !== undefined && <p className="help has-text-danger">
                    {props.error}
                </p>}
            </div>
            {props.addOnAfter && props.addOnAfter}
        </div>
    </div>;
}