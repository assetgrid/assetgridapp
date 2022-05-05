import axios from "axios";
import * as React from "react";
import { Account } from "../models/account";

interface State 
{
    accounts: Account[] | null
}

export default class AccountList extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = {
            accounts: null
        };
    }

    componentDidMount() {
        axios.post(`https://localhost:7262/Account/Search`, {})
        .then(res => {
            const accounts: Account[] = res.data;
            this.setState({ accounts: accounts });
        })
    }

    public render() {
        return <>
            <table className="table">
                <thead>
                    <tr>
                        <th>Id</th>
                        <th>Name</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tfoot>
                    <tr>
                        <th>Id</th>
                        <th>Name</th>
                        <th>Description</th>
                    </tr>
                </tfoot>
                <tbody>
                    {this.state.accounts == null
                        ? <tr><td colSpan={6}>Loading</td></tr>
                        : this.state.accounts.map(account =>
                            <tr key={account.id}>
                                <td>{account.id}</td>
                                <td>{account.name}</td>
                                <td>{account.description}</td>
                            </tr>)
                    }
                </tbody>
            </table>
        </>;
    }
}