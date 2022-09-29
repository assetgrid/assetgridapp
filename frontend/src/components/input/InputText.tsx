import * as React from "react";

interface Props {
    label?: string,
    value: string,
    disabled?: boolean,
    error?: string | boolean,
    addOnAfter?: React.ReactElement,
    onChange: React.ChangeEventHandler<HTMLInputElement>,
    isSmall?: boolean;
    password?: boolean;
}

export default function InputText (props: Props) {
    return <div className="field">
        {props.label && <label className="label">{props.label}</label>}
        <div className="field has-addons">
            <div className="control is-expanded">
                <input
                    className={"input" + (props.error ? " is-danger" : "") + (props.isSmall ? " is-small" : "")}
                    type={props.password === true ? "password" : "text"}
                    placeholder={props.label}
                    value={props.value}
                    disabled={props.disabled}
                    onChange={event => props.onChange(event)}
                />
                {typeof props.error === "string" && <p className="help has-text-danger">
                    {props.error}
                </p>}
            </div>
            {props.addOnAfter && props.addOnAfter}
        </div>
    </div>;
}