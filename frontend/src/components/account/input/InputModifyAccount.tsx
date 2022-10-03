import axios from "axios";
import * as React from "react";
import { CreateAccount as CreateAccount } from "../../../models/account";
import { Transaction } from "../../../models/transaction";
import InputButton from "../../input/InputButton";
import InputCheckbox from "../../input/InputCheckbox";
import InputText from "../../input/InputText";

interface Props
{
    value: CreateAccount,
    disabled: boolean,
    onChange: (account: CreateAccount) => void;
    errors: { [key: string]: string[] };
}

export default function InputCreateAccount (props: Props) {
    return <>
        <InputText label="Name"
            value={props.value.name}
            onChange={e => props.onChange({ ...props.value, name: e.target.value })}
            errors={props.errors["Name"]}
            disabled={props.disabled} />
        <InputText label="Description"
            value={props.value.description}
            onChange={e => props.onChange({ ...props.value, description: e.target.value })}
            errors={props.errors["Description"]}
            disabled={props.disabled} />
        <InputText label="Account number"
            value={props.value.accountNumber}
            onChange={e => props.onChange({ ...props.value, accountNumber: e.target.value })}
            errors={props.errors["AccountNumber"]}
            disabled={props.disabled} />
        <InputCheckbox label="Favorite"
            value={props.value.favorite}
            onChange={e => props.onChange({ ...props.value, favorite: e.target.checked })}
            errors={props.errors["Favorite"]}
            disabled={props.disabled} />  
        <InputCheckbox label="Include in net worth"
            value={props.value.includeInNetWorth}
            onChange={e => props.onChange({ ...props.value, includeInNetWorth: e.target.checked })}
            errors={props.errors["IncludeInNetWorth"]}
            disabled={props.disabled} />  
    </>;
}