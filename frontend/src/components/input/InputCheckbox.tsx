import * as React from "react";

interface Props {
    label?: string
    onChange: React.ChangeEventHandler<HTMLInputElement>
    value: boolean
    errors?: string[] | boolean
    disabled?: boolean
    helpText?: string
}

export default function InputCheckbox (props: Props): React.ReactElement {
    const isError = props.errors === true || (typeof props.errors === "object" && props.errors.length > 0);

    if (props.label === undefined) {
        return <>
            <input type={"checkbox" + (isError ? " is-danger" : "")} onChange={e => props.onChange(e)} checked={props.value} disabled={props.disabled} />
            {typeof props.errors === "object" && props.errors.length > 0 && <p className="help has-text-danger">
                {props.errors[0]}
            </p>}
        </>;
    }

    return <div className="field">
        <div className="control">
            <label className={"checkbox" + (isError ? " is-danger" : "")}>
                <input type="checkbox" onChange={e => props.onChange(e)} checked={props.value} disabled={props.disabled} /> {props.label}
                {typeof props.errors === "object" && props.errors.length > 0 && <p className="help has-text-danger">
                    {props.errors[0]}
                </p>}
                {props.helpText !== undefined && <p className="help">
                    {props.helpText}
                </p>}
            </label>
        </div>
    </div>;
}
