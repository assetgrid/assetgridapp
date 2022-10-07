import * as React from "react";

interface Props {
    label?: string
    value: string
    disabled?: boolean
    errors?: string[] | boolean
    addOnAfter?: React.ReactElement
    onChange: React.ChangeEventHandler<HTMLInputElement>
    isSmall?: boolean
    password?: boolean
}

export default function InputText (props: Props): React.ReactElement {
    const isError = props.errors === true || (typeof props.errors === "object" && props.errors.length > 0);
    return <div className="field">
        {props.label !== undefined && <label className="label">{props.label}</label>}
        <div className="field has-addons">
            <div className="control is-expanded">
                <input
                    className={"input" + (isError ? " is-danger" : "") + (props.isSmall === true ? " is-small" : "")}
                    type={props.password === true ? "password" : "text"}
                    placeholder={props.label}
                    value={props.value}
                    disabled={props.disabled}
                    onChange={event => props.onChange(event)}
                />
                {typeof props.errors === "object" && props.errors.length > 0 && <p className="help has-text-danger">
                    {props.errors[0]}
                </p>}
            </div>
            {(props.addOnAfter != null) && props.addOnAfter}
        </div>
    </div>;
}
