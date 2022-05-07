import axios from "axios";
import * as React from "react";
import { CreateAccount as CreateAccount } from "../../../models/account";
import { Transaction } from "../../../models/transaction";
import InputButton from "../InputButton";
import InputText from "../InputText";

interface Props
{
    value: CreateAccount,
    disabled: boolean,
    onChange: (account: CreateAccount) => void;
}

export default class InputCreateAccount extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    public render() {
        return <>
            <InputText label="Name"
                value={this.props.value.name}
                onChange={e => this.props.onChange({ ...this.props.value, name: e.target.value })}
                disabled={this.props.disabled} />
            <InputText label="Description"
                value={this.props.value.description}
                onChange={e => this.props.onChange({ ...this.props.value, description: e.target.value })}
                disabled={this.props.disabled} />
            <InputText label="Account Number"
                value={this.props.value.accountNumber}
                onChange={e => this.props.onChange({ ...this.props.value, accountNumber: e.target.value })}
                disabled={this.props.disabled} />            
        </>;
    }
}