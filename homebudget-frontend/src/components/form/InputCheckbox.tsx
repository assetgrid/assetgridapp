import * as React from "react";

interface Props {
    label?: string;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
    value: boolean;
    disabled?: boolean;
}

export default function InputCheckbox(props: Props) {
    if (!props.label) {
        return <input type="checkbox" onChange={e => props.onChange(e)} checked={props.value} disabled={props.disabled} />;
    }

    return <div className="field">
        <div className="control">
            <label className="checkbox">
                <input type="checkbox" onChange={e => props.onChange(e)} checked={props.value} disabled={props.disabled} /> {props.label}
            </label>
        </div>
    </div>;
}