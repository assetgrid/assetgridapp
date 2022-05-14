import axios from "axios";
import * as React from "react";
import { Api } from "../../lib/ApiClient";
import { Account } from "../../models/account";
import { CreateTransaction } from "../../models/transaction";
import Table from "../common/Table";
import InputButton from "../form/InputButton";
import { AccountReference, CsvCreateTransaction } from "./ImportModels";

interface Props {
    transactions: CsvCreateTransaction[];
    accountsBy: { [identifier: string]: { [value: string]: Account } };
    batchSize: number;
}

interface State {
    succeeded: CreateTransaction[],
    failed: CreateTransaction[],
    duplicate: CreateTransaction[],

    state: "waiting" | "importing" | "imported";
    progress: number;
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

            state: "waiting",
            progress: 0,
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
                    <p>{this.state.progress} of {this.props.transactions.length} transactions have been imported.</p>
                    <p>Please wait while the import is completed</p>
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
                <td>{transaction.dateTime}</td>
                <td>{transaction.description}</td>
                <td>#{transaction.sourceId}</td>
                <td>#{transaction.destinationId}</td>
            </tr>}
            headings={<tr>
                <td>Identifier</td>
                <td>Created</td>
                <td>Description</td>
                <td>Source (id)</td>
                <td>Destination (id)</td>
            </tr>} items={transactions} />;
    }

    private async import() {
        this.setState({
            state: "importing",
            progress: 0
        });

        let createModels = this.props.transactions.map(transaction => {
            return {
                dateTime: transaction.dateTime,
                description: transaction.description,
                sourceId: this.getAccount(transaction.source)?.id,
                destinationId: this.getAccount(transaction.destination)?.id,
                identifier: transaction.identifier,
                lines: [{
                    amount: transaction.amount,
                    description: "",
                }]
            } as CreateTransaction
        });

        while (this.state.progress < createModels.length - 1) {
            let result = await Api.Transaction.createMany(createModels.slice(this.state.progress, this.state.progress + this.props.batchSize));
            await new Promise<void>(resolve => this.setState({
                progress: this.state.progress + this.props.batchSize,
                succeeded: [...this.state.succeeded, ...result.succeeded],
                failed: [...this.state.failed, ...result.failed],
                duplicate: [...this.state.duplicate, ...result.duplicate],
            }, () => resolve()));
        }

        this.setState({ state: "imported" });
    }

    private getAccount(reference: AccountReference | null): Account | null {
        if (reference === null || reference === undefined) return null;
        if (this.props.accountsBy[reference.identifier] === undefined) return null;
        if (this.props.accountsBy[reference.identifier][reference.value] === undefined) return null;

        return this.props.accountsBy[reference.identifier][reference.value];
    }
}
