import axios from "axios";
import * as React from "react";
import { Transaction } from "../../models/transaction";
import CreateTransaction from "./CreateTransaction";
import InputButton from "../form/InputButton";

interface State 
{
    transactions: Transaction[] | null;
}

export default class TransactionList extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = {
            transactions: null,
        };
    }

    componentDidMount() {
        axios.get(`https://localhost:7262/transaction`)
          .then(res => {
              const transactions: Transaction[] = res.data;
            this.setState({ transactions: transactions });
          })
    }

    public render() {
        return <>
            <table className="table is-fullwidth is-hoverable">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Description</th>
                        <th>Source</th>
                        <th>Destination</th>
                        <th>Category</th>
                    </tr>
                </thead>
                <tfoot>
                    <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Description</th>
                        <th>Source</th>
                        <th>Destination</th>
                        <th>Category</th>
                    </tr>
                </tfoot>
                <tbody>
                    {this.state.transactions == null
                        ? <tr><td colSpan={6}>Loading</td></tr>
                        : this.state.transactions.map(transaction =>
                            <tr key={transaction.id}>
                                <td>{transaction.created}</td>
                                <td>{transaction.lines.map(line => line.amount).reduce((a, b) => a + b, 0)}</td>
                                <td>{transaction.description}</td>
                                <td>{transaction.from != null
                                    ? <>{transaction.from.id} {transaction.from.name}</>
                                    : <></>
                                }</td>
                                <td>{transaction.to != null
                                    ? <>{transaction.to.id} {transaction.to.name}</>
                                    : <></>
                                }</td>
                                <td></td>
                            </tr>)
                    }
                </tbody>
            </table>
        </>;
    }
}