import axios, { AxiosResponse } from "axios";
import * as React from "react";
import { Api } from "../../../lib/ApiClient";
import { Account, CreateAccount as CreateAccountModel } from "../../../models/account";
import { Transaction } from "../../../models/transaction";
import Modal from "../../common/Modal";
import InputButton from "../InputButton";
import InputText from "../InputText";
import InputCreateAccount from "./InputCreateAccount";

interface Props {
    close: () => void;
    closeOnChange?: boolean;
    created: (account: Account) => void;
    value: CreateAccountModel;
}

interface State {
    account: CreateAccountModel;
    creating: boolean;
}

export class CreateAccountModal extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            account: props.value,
            creating: false,
        }
    }

    public render() {
        return <Modal
            active={true}
            title={"Create account"}
            close={() => this.props.close()}
            footer={<>
                <button className="button is-success" onClick={() => this.create()} disabled={this.state.creating}>Create Account</button>
                <button className="button" onClick={() => this.props.close()}>Cancel</button>
            </>}>
            <InputCreateAccount value={this.state.account} disabled={this.state.creating} onChange={account => this.setState({ account: account })}/>
        </Modal>;
    }

    private create() {
        this.setState({ creating: true });
        Api.Account.create({
            name: this.state.account.name,
            description: this.state.account.description,
            accountNumber: this.state.account.accountNumber
        })
        .then(result => {
            const newAccount = {
                name: "",
                description: "",
                accountNumber: "",
            }
            this.setState({
                account: newAccount,
                creating: false
            });
            if (this.props.created !== undefined) {
                this.props.created(result);
            }
            if (this.props.closeOnChange) {
                this.props.close();
            }
        })
    }
}