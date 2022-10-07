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
    const isError = props.errors !== undefined && props.errors.length > 0;

    return <div className="field">
        {props.label !== undefined && <label className="label">{props.label}</label>}
        <div className="field has-addons">
            <div className="control is-expanded">
                <input
                    className={"input" + (isError ? " is-danger" : "") + (props.isSmall === true ? " is-small" : "")}
                    type="number"
                    placeholder={props.label}
                    value={props.value?.toString() ?? ""}
                    disabled={props.disabled}
                    onChange={onChange}
                />
                {isError && <p className="help has-text-danger">
                    {props.errors![0]}
                </p>}
            </div>
        </div>
    </div>;

    function onChange (event: React.ChangeEvent<HTMLInputElement>): void {
        let value: Decimal | null = new Decimal(event.target.valueAsNumber);
        if (value.isNaN()) value = props.allowNull ? null : new Decimal(0);

        props.onChange(value!);
    }
}
