import axios from "axios";
import * as React from "react";
import { Account, CreateAccount as CreateAccountModel } from "../../models/account";
import Table from "../common/Table";
import CreateAccount from "../form/account/CreateAccount";
import InputCreateAccount from "../form/account/InputCreateAccount";
import InputButton from "../form/InputButton";
import { AccountReference, capitalize, castFieldValue, CsvCreateTransaction } from "./ImportModels";

interface Props {
    transactions: CsvCreateTransaction[];
    accountsBy: { [identifier: string]: { [value: string]: Account } };
    accountCreated: (account: Account) => void;
}

interface State {
    rowOffset: number;
    creatingAccount: CreateAccountModel | null;
    creating: boolean;
}

/*
 * React object class
 */
export default class MissingAccounts extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            rowOffset: 0,
            creatingAccount: null,
            creating: false,
        };
    }

    public render(): React.ReactNode {
        let uniqueAccountReferences = [
            ...this.props.transactions.map(transaction => transaction.from),
            ...this.props.transactions.map(transaction => transaction.to)
        ].filter(reference => reference !== null)
            .filter((a, index, array) => array.findIndex(b => a.identifier == b.identifier && a.value == b.value) == index)
            .filter(reference => this.props.accountsBy[reference.identifier][reference.value] === null);
        
        return <>
            { this.state.creatingAccount && <div className="modal is-active">
                <div className="modal-background"></div>
                    <div className="modal-card">
                        <header className="modal-card-head">
                        <p className="modal-card-title">Create Account</p>
                        <button className="delete" aria-label="close" onClick={() => this.setState({creatingAccount: null})}></button>
                        </header>
                        <section className="modal-card-body">
                            <CreateAccount value={this.state.creatingAccount}
                                onChange={account => this.setState({ creatingAccount: account })}
                                onCreated={account => this.accountCreated(account)}/>
                        </section>
                        <footer className="modal-card-foot">
                        <button className="button is-success">Create Account</button>
                        <button className="button" onClick={() => this.setState({creatingAccount: null})}>Cancel</button>
                        </footer>
                    </div>
                </div>}
                
                <Table pageSize={20}
                    headings={<tr>
                        <th>Identifier</th>
                        <th>Value</th>
                        <th>Actions</th>
                    </tr>}
                    items={uniqueAccountReferences}
                    renderItem={account => <tr key={account.identifier + "." + account.value}>
                        <td>{account.identifier}</td>
                        <td>{account.value}</td>
                        <td>{account.identifier !== "id" && <InputButton onClick={() => this.beginCreatingAccount(account)}>Create Account</InputButton>}</td>
                    </tr>} />
        </>
    }

    private beginCreatingAccount(accountReference: AccountReference): void
    {
        let account: CreateAccountModel = {
            name: "",
            description: "",
            accountNumber: "",
        };
        (account as any)[accountReference.identifier] = accountReference.value;
        this.setState({ creatingAccount: account });
    }

    private accountCreated(account: Account): void {
        this.props.accountCreated(account);
        this.setState({ creatingAccount: null });
    }
}
