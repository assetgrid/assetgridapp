import * as React from "react";
import { CreateAccount } from "../../../models/account";
import InputCheckbox from "../../input/InputCheckbox";
import InputText from "../../input/InputText";
import InputTextMultiple from "../../input/InputTextMultiple";

interface Props {
    value: CreateAccount
    disabled: boolean
    onChange: (account: CreateAccount) => void
    errors: { [key: string]: string[] }
}

export default function InputCreateAccount (props: Props): React.ReactElement {
    return <>
        <InputText label="Name"
            value={props.value.name}
            onChange={e => props.onChange({ ...props.value, name: e.target.value })}
            errors={props.errors.Name}
            disabled={props.disabled} />
        <InputText label="Description"
            value={props.value.description}
            onChange={e => props.onChange({ ...props.value, description: e.target.value })}
            errors={props.errors.Description}
            disabled={props.disabled} />
        <InputTextMultiple label="Identifiers"
            value={props.value.identifiers}
            onChange={value => props.onChange({ ...props.value, identifiers: value })}
            errors={props.errors.Identifiers}
            disabled={props.disabled} />
        <InputCheckbox label="Favorite"
            value={props.value.favorite}
            onChange={e => props.onChange({ ...props.value, favorite: e.target.checked })}
            errors={props.errors.Favorite}
            disabled={props.disabled} />
        <InputCheckbox label="Include in net worth"
            value={props.value.includeInNetWorth}
            onChange={e => props.onChange({ ...props.value, includeInNetWorth: e.target.checked })}
            errors={props.errors.IncludeInNetWorth}
            disabled={props.disabled} />
    </>;
}
