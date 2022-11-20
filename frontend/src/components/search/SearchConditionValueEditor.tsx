import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { SearchQuery } from "../../models/search";
import InputAccount from "../account/input/InputAccount";
import InputCategory from "../input/InputCategory";
import InputCheckbox from "../input/InputCheckbox";
import InputDateTime from "../input/InputDateTime";
import InputNumber from "../input/InputNumber";
import InputNumbers from "../input/InputNumbers";
import InputText from "../input/InputText";
import InputTextMultiple from "../input/InputTextMultiple";
import InputTransaction from "../transaction/input/InputTransaction";

interface Props {
    disabled: boolean
    value: SearchQuery["value"]
    onChange: (value: SearchQuery["value"]) => void
}

export function ConditionValueEditorDecimal (props: Props): React.ReactElement {
    const [value, setValue] = React.useState(new Decimal(props.value as string | number));
    React.useEffect(() => {
        if (props.value !== value.times(10000).round().toString()) {
            setValue(new Decimal(props.value as string | number).div(10000));
        }
    }, [props.value]);

    return <InputNumber
        disabled={props.disabled}
        allowNull={false}
        value={value}
        onChange={onChange} />;

    function onChange (newValue: Decimal): void {
        setValue(newValue);
        props.onChange(newValue.times(10000).round().toString());
    }
}

export function ConditionValueEditorDecimalArray (props: Props): React.ReactElement {
    const [value, setValue] = React.useState((props.value as string[]).map(value => new Decimal(value).div(10000)));
    React.useEffect(() => {
        if ((props.value as string[]).some((v, i) => v !== value[i].times(10000).round().toString())) {
            setValue((props.value as string[]).map(value => new Decimal(value)));
        }
    }, [props.value]);

    return <InputNumbers
        disabled={props.disabled}
        value={value}
        allowDecimal={true}
        onChange={onChange} />;

    function onChange (newValue: Decimal[]): void {
        setValue(newValue);
        props.onChange(newValue.map(x => x.times(10000).round().toString()));
    }
}

export function ConditionValueEditorInteger (props: Props): React.ReactElement {
    return <InputNumber
        disabled={props.disabled}
        allowNull={false}
        value={new Decimal(props.value as number | string)}
        onChange={value => props.onChange(value.toNumber())} />;
}

export function ConditionValueEditorIntegerArray (props: Props): React.ReactElement {
    return <InputNumbers
        disabled={props.disabled}
        allowDecimal={false}
        value={(props.value as number[]).map(number => new Decimal(number))}
        onChange={value => props.onChange(value.map(number => number.toNumber()))} />;
}

export function ConditionValueEditorText (props: Props): React.ReactElement {
    return <InputText
        value={props.value as string}
        disabled={props.disabled}
        onChange={e => props.onChange(e.target.value)} />;
}

export function ConditionValueEditorTextArray (props: Props): React.ReactElement {
    return <InputTextMultiple
        value={props.value as string[]}
        disabled={props.disabled}
        onChange={props.onChange} />;
}

export function ConditionValueEditorCategory (props: Props): React.ReactElement {
    return <InputCategory
        value={props.value as string}
        onChange={value => props.onChange(value)}
        disabled={props.disabled} />;
}

export function ConditionValueEditorAccount (props: Props): React.ReactElement {
    const { t } = useTranslation();
    return <InputAccount
        value={props.value as number}
        onChange={account => props.onChange(account?.id ?? null)}
        nullSelectedText={t("common.no_account")!}
        disabled={props.disabled}
        allowCreateNewAccount={false}
        allowNull={true} />;
}

export function ConditionValueEditorDateTime (props: Props): React.ReactElement {
    const [value, setValue] = React.useState(DateTime.fromISO(props.value as string));
    React.useEffect(() => {
        if (props.value !== value.toISO()) {
            setValue(DateTime.fromISO(props.value as string));
        }
    }, [props.value]);

    return <InputDateTime
        value={value}
        onChange={onChange}
        disabled={props.disabled}
        fullwidth={false} />;

    function onChange (newValue: DateTime): void {
        setValue(newValue);
        props.onChange(newValue.toISO());
    }
}

export function ConditionValueEditorTransaction (props: Props): React.ReactElement {
    return <InputTransaction
        value={props.value as number}
        onChange={value => props.onChange(value?.id ?? null)}
        disabled={props.disabled}
        allowNull={true} />;
}

export function ConditionValueEditorBoolean (props: Props): React.ReactElement {
    return <InputCheckbox
        value={props.value as boolean}
        onChange={e => props.onChange(e.target.checked)}
        disabled={props.disabled}
    />;
}
