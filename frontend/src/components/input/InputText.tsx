import * as React from "react";

interface Props {
    label?: string,
    value: string,
    disabled?: boolean,
    error?: boolean,
    errors?: string[];
    addOnAfter?: React.ReactElement,
    onChange: React.ChangeEventHandler<HTMLInputElement>,
    isSmall?: boolean;
    password?: boolean;
}

export default function InputText(props: Props) {
    const isError = props.error !== undefined ? props.error : props.errors !== undefined && props.errors.length > 0;
    return <div className="field">
        {props.label && <label className="label">{props.label}</label>}
        <div className="field has-addons">
            <div className="control is-expanded">
                <input
                    className={"input" + (isError ? " is-danger" : "") + (props.isSmall ? " is-small" : "")}
                    type={props.password === true ? "password" : "text"}
                    placeholder={props.label}
                    value={props.value}
                    disabled={props.disabled}
                    onChange={event => props.onChange(event)}
                />
                {props.errors !== undefined && props.errors.length > 0 && <p className="help has-text-danger">
                    {props.errors[0]}
                </p>}
            </div>
            {props.addOnAfter && props.addOnAfter}
        </div>
    </div>;
}