import axios from "axios";
import * as React from "react";
import { CreateAccount as CreateAccountModel } from "../../../models/account";
import { Transaction } from "../../../models/transaction";
import InputButton from "../InputButton";
import InputText from "../InputText";
import InputCreateAccount from "./InputCreateAccount";

interface Props {
    value?: CreateAccountModel;
    onChange?: (account: CreateAccountModel) => void;
    onCreated?: (account: CreateAccountModel) => void;
}

interface State {
    account: CreateAccountModel;
    creating: boolean;
}

export default class CreateAccount extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            account: {
                accountNumber: "",
                description: "",
                name: ""
            },
            creating: false,
        }
    }

    public render() {
        const account = this.props.value !== undefined ? this.props.value : this.state.account;
        return <>
            <InputCreateAccount value={account} disabled={this.state.creating} onChange={account => {
                if (this.props.onChange !== undefined) {
                    this.props.onChange(account)
                }
                this.setState({ account: account });
            }
            }/>
            <InputButton onClick={() => this.create()}>Create Account</InputButton>
        </>;
    }

    private create() {
        const account = this.props.value !== undefined ? this.props.value : this.state.account;
        this.setState({ creating: true });
        axios.post(`https://localhost:7262/account`, {
            name: account.name,
            description: account.description,
            accountNumber: account.accountNumber
        })
        .then(res => {
            const newAccount = {
                name: "",
                description: "",
                accountNumber: "",
            }
            this.setState({
                account: newAccount,
                creating: false
            });
            if (this.props.onCreated !== undefined) {
                this.props.onCreated(newAccount);
            }
        })
    }
}