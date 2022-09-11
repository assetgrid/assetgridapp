import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import * as solid from "@fortawesome/free-solid-svg-icons"
import Decimal from "decimal.js";
import * as React from "react";


interface Props {
    label?: string;
    value: Decimal[];
    disabled?: boolean;
    onChange: (value: Decimal[]) => void;
    allowDecimal: boolean;
}

export default function InputNumbers(props: Props) {
    const [enteringNumber, setEnteringNumber] = React.useState<number | " ">(" ");
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
                type="number"
                placeholder={props.label}
                value={enteringNumber}
                disabled={props.disabled}
                onChange={input}
                onKeyDown={keydown}
            />
            <button className="is-small button-add" onClick={() => keydown(null)}>
                <FontAwesomeIcon icon={solid.faPlusCircle} />
            </button>
        </div>
    </div>;

    function input(e: React.ChangeEvent<HTMLInputElement>) {
        let valueAsNumber = e.target.valueAsNumber;
        if (!props.allowDecimal) {
            valueAsNumber = Math.round(valueAsNumber);
        }

        setEnteringNumber(isNaN(valueAsNumber) ? " " : valueAsNumber);
    }

    function keydown(e: React.KeyboardEvent<HTMLInputElement> | null) {
        if ((e == null || e.key == " " || e.key == "Enter") && enteringNumber !== " ") {
            // Append the current value to the list of values
            props.onChange([...props.value, new Decimal(enteringNumber)]);
            setEnteringNumber(" ");
            return;
        }
        if (e && e.key == "Backspace" && enteringNumber === " " && props.value.length > 0) {
            props.onChange(props.value.slice(0, props.value.length - 1));
        }
    }
}