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
}

export default function InputCreateAccount (props: Props) {
    return <>
        <InputText label="Name"
            value={props.value.name}
            onChange={e => props.onChange({ ...props.value, name: e.target.value })}
            disabled={props.disabled} />
        <InputText label="Description"
            value={props.value.description}
            onChange={e => props.onChange({ ...props.value, description: e.target.value })}
            disabled={props.disabled} />
        <InputText label="Account number"
            value={props.value.accountNumber}
            onChange={e => props.onChange({ ...props.value, accountNumber: e.target.value })}
            disabled={props.disabled} />
        <InputCheckbox label="Favorite"
            value={props.value.favorite}
            onChange={e => props.onChange({ ...props.value, favorite: e.target.checked })}
            disabled={props.disabled} />  
        <InputCheckbox label="Include in net worth"
            value={props.value.includeInNetWorth}
            onChange={e => props.onChange({ ...props.value, includeInNetWorth: e.target.checked })}
            disabled={props.disabled} />  
    </>;
}