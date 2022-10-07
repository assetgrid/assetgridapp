import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as React from "react";

interface Props {
    label?: string
    value: string | null
    disabled?: boolean
    errors?: string[]
    addOnAfter?: React.ReactElement
    onChange: (value: string | null) => void
    isSmall?: boolean
    noValueText: string
}

export default function InputTextOrNull (props: Props): React.ReactElement {
    const isError = props.errors !== undefined && props.errors.length > 0;
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => {
        if ((inputRef.current != null) && props.value === "") {
            inputRef.current.focus();
        }
    }, [props.value]);

    if (props.value !== null) {
        return <div className="field">
            {props.label !== undefined && <label className="label">{props.label}</label>}
            <div className="field has-addons">
                <div className="control is-expanded">
                    <input
                        ref={inputRef}
                        className={"input" + (isError ? " is-danger" : "") + (props.isSmall === true ? " is-small" : "")}
                        type="text"
                        placeholder={props.label}
                        value={props.value}
                        disabled={props.disabled}
                        onChange={event => props.onChange(event.target.value)}
                    />
                    {isError && <p className="help has-text-danger">
                        {props.errors![0]}
                    </p>}
                </div>
                <div className="control">
                    <button className="button" disabled={props.disabled} onClick={() => props.onChange(null)}>
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
            </div>
        </div>;
    } else {
        const disabled = props.disabled === true;
        return <div className="field">
            {props.label !== undefined && <label className="label">{props.label}</label>}
            <div className="field has-addons">
                <div className="control is-expanded">
                    <span style={disabled ? { color: "#999" } : { cursor: "pointer" }}
                        className="input"
                        onClick={() => !disabled && props.onChange("")}>
                        {props.noValueText}
                    </span>
                </div>
            </div>
        </div>;
    }
}
