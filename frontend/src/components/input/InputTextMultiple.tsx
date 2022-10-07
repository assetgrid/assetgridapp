import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as solid from "@fortawesome/free-solid-svg-icons";

interface Props {
    label?: string
    value: string[]
    disabled?: boolean
    errors?: string[] | boolean
    onChange: (value: string[]) => void
}

export default function InputTextMultiple (props: Props): React.ReactElement {
    const [enteringText, setEnteringText] = React.useState<string>("");
    const inputElement = React.useRef<HTMLInputElement>(null);
    const isError = props.errors === true || (typeof props.errors === "object" && props.errors.length > 0);

    return <div className="field" onClick={() => inputElement?.current?.focus()}>
        {props.label !== undefined && <label className="label">{props.label}</label>}
        <div className="field input-multiple">
            {props.value.map((value, i) => <span className="tag is-primary" key={i}>
                {value.toString()}
                <button className="delete is-small" onClick={() => props.onChange([...props.value.slice(0, i), ...props.value.slice(i + 1)])}></button>
            </span>) }
            <input
                ref={inputElement}
                type="text"
                placeholder={props.label}
                value={enteringText}
                disabled={props.disabled}
                onChange={input}
                onKeyDown={keydown}
                className={isError ? " is-danger" : ""}
            />
            <button className="is-small button-add" onClick={() => keydown(null)}>
                <FontAwesomeIcon icon={solid.faPlusCircle} />
            </button>
        </div>
        {typeof props.errors === "object" && props.errors.length > 0 && <p className="help has-text-danger">
            {props.errors[0]}
        </p>}
    </div>;

    function input (e: React.ChangeEvent<HTMLInputElement>): void {
        setEnteringText(e.target.value);
    }

    function keydown (e: React.KeyboardEvent<HTMLInputElement> | null): void {
        if ((e == null || e.key === "Enter") && enteringText.trim() !== "") {
            // Append the current value to the list of values
            props.onChange([...props.value, enteringText]);
            setEnteringText("");
            return;
        }
        if ((e != null) && e.key === "Backspace" && enteringText === "" && props.value.length > 0) {
            props.onChange(props.value.slice(0, props.value.length - 1));
        }
    }
}
