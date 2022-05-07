import axios from "axios";
import * as React from "react";
import { CreateTransaction } from "../../models/transaction";
import Table from "../common/Table";
import InputButton from "../form/InputButton";
import { CsvCreateTransaction } from "./ImportModels";
import MissingAccounts from "./MissingAccounts";

interface Props {
    transactions: CsvCreateTransaction[];
}

interface State {
    succeeded: CreateTransaction[],
    failed: CreateTransaction[],
    duplicate: CreateTransaction[],

    state: "waiting" | "importing" | "imported";
}

/*
 * React object class
 */
export default class ImportCsv extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            succeeded: [],
            failed: [],
            duplicate: [],

            state: "waiting"
        };
    }

    public render() {
        switch (this.state.state) {
            case "waiting":
                return <>
                    <InputButton onClick={() => this.import()}>Import Transactions</InputButton>
                </>;
            case "importing":
                return <>
                    <p>Please wait while you transactions are being imported</p>
                </>;
            case "imported":
                return <>
                    Your transactions have been imported

                    <h3 title="title is-5">Succeeded</h3>
                    {this.transactionTable(this.state.succeeded)}

                    <h3 title="title is-5">Duplicate</h3>
                    {this.transactionTable(this.state.duplicate)}

                    <h3 title="title is-5">Failed</h3>
                    {this.transactionTable(this.state.failed)}
                </>;
        }
    }

    private transactionTable(transactions: CreateTransaction[]) {
        return <Table pageSize={20}
            renderItem={(transaction, i) => <tr key={i}>
                <td>{transaction.identifier}</td>
                <td>{transaction.created}</td>
                <td>{transaction.description}</td>
                <td>#{transaction.fromId}</td>
                <td>#{transaction.toId}</td>
            </tr>}
            headings={<tr>
                <td>Identifier</td>
                <td>Created</td>
                <td>Description</td>
                <td>Source (id)</td>
                <td>Destination (id)</td>
            </tr>} items={transactions} />;
    }

    private import() {
        this.setState({ state: "importing" });

        let requestData = this.props.transactions.map(transaction => {
            if (transaction.from?.account === "fetching") throw "Fetching account";
            if (transaction.to?.account === "fetching") throw "Fetching account";

            return {
                created: new Date(),
                description: "",
                fromId: transaction.from?.account?.id,
                toId: transaction.to?.account?.id,
                identifier: transaction.identifier,
                lines: [{
                    amount: transaction.amount,
                    description: "",
                }]
            } as CreateTransaction
        });
        axios.post<{ succeeded: CreateTransaction[], failed: CreateTransaction[], duplicate: CreateTransaction[] }>(`https://localhost:7262/Transaction/CreateMany`, requestData)
            .then(res => {
            this.setState({
                succeeded: res.data.succeeded,
                failed: res.data.failed,
                duplicate: res.data.duplicate,
                state: "imported"
            })
        });
    }
}
