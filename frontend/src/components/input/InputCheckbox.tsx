import * as React from "react";

interface Props {
    label?: string;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    value: boolean;
    errors?: string[] | boolean;
    disabled?: boolean;
}

export default function InputCheckbox(props: Props) {
    const isError = props.errors === true || (typeof props.errors === "object" && props.errors.length > 0);

    if (!props.label) {
        return <>
            <input type="checkbox" onChange={e => props.onChange(e)} checked={props.value} disabled={props.disabled} />
            {typeof props.errors === "object"  && props.errors.length > 0 && <p className="help has-text-danger">
                {props.errors[0]}
            </p>}
        </>;
    }
    
    return <div className="field">
        <div className="control">
            <label className="checkbox">
                <input type="checkbox" onChange={e => props.onChange(e)} checked={props.value} disabled={props.disabled} /> {props.label}
            </label>
            {typeof props.errors === "object"  && props.errors.length > 0 && <p className="help has-text-danger">
                {props.errors[0]}
            </p>}
        </div>
    </div>;
}