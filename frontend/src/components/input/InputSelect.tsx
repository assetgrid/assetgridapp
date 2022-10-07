import * as React from "react";

interface Props<T> {
    label?: string
    items: Array<{ key: T, value: string }>
    value: T | null
    placeholder?: string
    onChange: (selectedKey: T) => void
    addOnAfter?: React.ReactElement
    isFullwidth?: boolean
    disabled?: boolean
}

export default function InputSelect<T extends string> (props: Props<T>): React.ReactElement {
    return <div className="field">
        {props.label !== undefined && <label className="label">{props.label}</label>}
        <div className="field has-addons">
            <div className="control is-expanded">
                <div className={"select" + (props.isFullwidth === true ? " is-fullwidth" : "")}>
                    <select value={props.value ?? "___placeholder___"}
                        disabled={props.disabled}
                        onChange={e => props.onChange(e.target.value as T)}>
                        {props.placeholder !== undefined && <option disabled value="___placeholder___">{props.placeholder}</option>}
                        {props.items.map(item => <option key={item.key}
                            value={item.key}>
                            {item.value}
                        </option>)}
                    </select>
                </div>
            </div>
            {(props.addOnAfter != null) && props.addOnAfter}
        </div>
    </div>;
}
