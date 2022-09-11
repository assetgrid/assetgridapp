import * as React from "react";

interface Props {
    label?: string;
    value: string[];
    disabled?: boolean;
    onChange: (value: string[]) => void;
}

export default function InputTextMultiple(props: Props) {
    const [enteringText, setEnteringText] = React.useState<string>("");
    let inputElement: HTMLInputElement | null = null;

    return <div className="field" onClick={() => inputElement?.focus()}>
        {props.label && <label className="label">{props.label}</label>}
        <div className="field input-multiple">
            {props.value.map((value, i) => <span className="tag is-primary" key={i}>
                {value.toString()}
                <button className="delete is-small" onClick={() => props.onChange([...props.value.slice(0, i), ...props.value.slice(i + 1)])}></button>
            </span>) }
            <input
                ref={element => inputElement = element}
                type="text"
                placeholder={props.label}
                value={enteringText}
                disabled={props.disabled}
                onChange={input}
                onKeyDown={keydown}
            />
        </div>
    </div>;

    function input(e: React.ChangeEvent<HTMLInputElement>) {
        setEnteringText(e.target.value);
    }

    function keydown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key == "Enter") {
            // Append the current value to the list of values
            props.onChange([...props.value, enteringText]);
            setEnteringText("");
        }
        if (e.key == "Backspace" && enteringText === "" && props.value.length > 0) {
            props.onChange(props.value.slice(0, props.value.length - 1));
        }
    }
}