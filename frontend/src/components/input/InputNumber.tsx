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
    value: Decimal | null
    onChange: (value: Decimal | null) => void
});

export default function InputNumber (props: Props): React.ReactElement {
    const [isInvalidValue, setIsInvalidValue] = React.useState(false);
    const isError = isInvalidValue || (props.errors !== undefined && props.errors.length > 0);
    const [value, setValue] = React.useState(props.value?.toString() ?? "");
    const [numericValue, setNumericValue] = React.useState(props.value);

    React.useEffect(() => {
        if (props.value?.toString() !== numericValue?.toString()) {
            if (typeof props.value === "number" && !isNaN(props.value)) {
                setValue(props.value);
            } else if (typeof props.value === "object" && props.value?.isNaN() !== true) {
                setValue(props.value?.toString() ?? "");
            }
        }
    }, [props.value]);

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
        let value: Decimal | null = new Decimal(event.target.valueAsNumber);
        if (value.isNaN()) {
            if (props.allowNull && event.target.value.trim() === "") {
                value = null;
                setValue("");
                setIsInvalidValue(false);
                setNumericValue(null);
                props.onChange(value);
            } else {
                setValue(event.target.value);
                setIsInvalidValue(true);
            }
            return;
        }

        setIsInvalidValue(false);
        setValue(event.target.value);
        setNumericValue(value);
        props.onChange(value);
    }
}
