import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Decimal from "decimal.js";
import * as React from "react";

type Props = {
    label?: string
    disabled?: boolean
    isSmall?: boolean
    errors?: string[]
} & ({
    allowNull: false
    value: Decimal
    onChange: (value: Decimal) => void

} | {
    allowNull: true
    noValueText: string
    value: Decimal | null
    onChange: (value: Decimal | null) => void
});

export default function InputNumber (props: Props): React.ReactElement {
    const [isInvalidValue, setIsInvalidValue] = React.useState(false);
    const isError = isInvalidValue || (props.errors !== undefined && props.errors.length > 0);
    const [value, setValue] = React.useState(props.value?.toString() ?? "");
    const [numericValue, setNumericValue] = React.useState(props.value);
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (props.value?.toString() !== numericValue?.toString()) {
            if (typeof props.value === "number" && !isNaN(props.value)) {
                setValue(props.value);
            } else if (typeof props.value === "object" && props.value?.isNaN() !== true) {
                setValue(props.value?.toString() ?? "");
            } else if (props.value === null) {
                setNumericValue(null);
            }
        }
    }, [props.value]);

    React.useEffect(() => {
        if ((inputRef.current != null) && numericValue === null) {
            inputRef.current.focus();
            setValue("");
        }
    }, [props.value]);

    if (props.allowNull && props.value === null) {
        const disabled = props.disabled === true;
        return <div className="field">
            {props.label !== undefined && <label className="label">{props.label}</label>}
            <div className="field has-addons">
                <div className="control is-expanded">
                    <span style={disabled ? { color: "#999" } : { cursor: "pointer" }}
                        className="input"
                        onClick={() => {
                            if (!disabled) {
                                props.onChange(new Decimal(0));
                            }
                        }}>
                        {props.noValueText}
                    </span>
                </div>
            </div>
        </div>;
    }
    if (props.allowNull && props.value !== null) {
        return <div className="field">
            {props.label !== undefined && <label className="label">{props.label}</label>}
            <div className="field has-addons">
                <div className="control is-expanded">
                    <input
                        className={"input" + (isError ? " is-danger" : "") + (props.isSmall === true ? " is-small" : "")}
                        ref={inputRef}
                        type="number"
                        placeholder={props.label}
                        value={value}
                        disabled={props.disabled}
                        onChange={onChange}
                        onBeforeInput={onBeforeInput}
                    />
                    {isError && props.errors !== undefined && <p className="help has-text-danger">
                        {props.errors[0]}
                    </p>}
                </div>
                <div className="control">
                    <button className="button" disabled={props.disabled} onClick={() => props.onChange(null)}>
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                </div>
            </div>
        </div>;
    }

    return <div className="field">
        {props.label !== undefined && <label className="label">{props.label}</label>}
        <div className="field has-addons">
            <div className="control is-expanded">
                <input
                    className={"input" + (isError ? " is-danger" : "") + (props.isSmall === true ? " is-small" : "")}
                    type="number"
                    placeholder={props.label}
                    value={value}
                    disabled={props.disabled}
                    onChange={onChange}
                    onBeforeInput={onBeforeInput}
                />
                {isError && typeof props.errors === "object" && <p className="help has-text-danger">
                    {props.errors[0]}
                </p>}
            </div>
        </div>
    </div>;

    function onBeforeInput (event: React.FormEvent<HTMLInputElement>): boolean {
        const change = (event as any).data;
        if (!/^[-\d,.]*$/.test(change)) {
            event.preventDefault();
            return false;
        }
        return true;
    }

    function onChange (event: React.ChangeEvent<HTMLInputElement>): void {
        const value: Decimal | null = new Decimal(event.target.valueAsNumber);
        if (value.isNaN()) {
            setValue(event.target.value);
            setIsInvalidValue(true);
            return;
        }

        setIsInvalidValue(false);
        setValue(event.target.value);
        setNumericValue(value);
        props.onChange(value);
    }
}
