import axios from "axios";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import * as React from "react";
import { Api } from "../../lib/ApiClient";
import { Account } from "../../models/account";
import { CreateTransaction } from "../../models/transaction";
import AccountLink from "../account/AccountLink";
import { Card } from "../common/Card";
import Table from "../common/Table";
import InputButton from "../form/InputButton";
import { AccountReference, CsvCreateTransaction } from "./ImportModels";

interface Props {
    transactions: CsvCreateTransaction[];
    accountsBy: { [identifier: string]: { [value: string]: Account } };
    batchSize: number;
    goToPrevious: () => void;
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
export default class Import extends React.Component<Props, State> {
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
                return <Card title="Begin import">
                    <InputButton onClick={() => this.import()}>Import Transactions</InputButton>
                    <div className="buttons mt-3">
                        <InputButton onClick={() => this.props.goToPrevious()}>Back</InputButton>
                    </div>
                </Card>;
            case "importing":
                return <Card title="Importing&hellip;">
                    <p>{this.state.progress} of {this.props.transactions.length} transactions have been imported.</p>
                    <p>Please wait while the import is completed</p>
                </Card>;
            case "imported":
                return <>
                    <Card title="Import complete">Your transactions have been imported</Card>
                    <Card title="Succeeded">
                        <p className="mb-3">The following transactions were successfully created:</p>
                        {this.transactionTable(this.state.succeeded)}
                    </Card>
                    <Card title="Duplicate">
                        <p className="mb-3">The following transactions could not be created due to duplicate identifiers:</p>
                        {this.transactionTable(this.state.duplicate)}
                    </Card>
                    <Card title="Failed">
                        <p className="mb-3">The following transactions could not be created due to errors:</p>
                        {this.transactionTable(this.state.failed)}
                    </Card>
                </>;
        }
    }

    private transactionTable(transactions: CreateTransaction[]) {
        return <Table pageSize={20}
            renderItem={(transaction, i) => <tr key={i}>
                <td>{transaction.identifier}</td>
                <td>{transaction.dateTime.toString()}</td>
                <td>{transaction.description}</td>
                <td>{transaction.sourceId && <AccountLink account={this.props.accountsBy["id"][transaction.sourceId]} />}</td>
                <td>{transaction.destinationId && <AccountLink account={this.props.accountsBy["id"][transaction.destinationId]} />}</td>
            </tr>}
            type="sync"
            renderType="table"
            headings={<tr>
                <th>Identifier</th>
                <th>Created</th>
                <th>Description</th>
                <th>Source</th>
                <th>Destination</th>
            </tr>} items={transactions} />;
    }

    private async import() {
        this.setState({
            state: "importing",
            progress: 0
        });

        // Don't send transactions with obvious errors to the server
        let errors = this.props.transactions.map(t =>
            t.amount === "invalid" ||
            !t.dateTime.isValid ||
            (t.source && t.destination && t.source.identifier == t.destination.identifier && t.source.value == t.destination.value)
        );
        let invalidTransactions = this.props.transactions.filter((_, i) => errors[i]).map(transaction => {
            return {
                dateTime: transaction.dateTime.isValid ? transaction.dateTime : DateTime.fromJSDate(new Date(2000, 1, 1)),
                description: transaction.description,
                sourceId: this.getAccount(transaction.source)?.id,
                destinationId: this.getAccount(transaction.destination)?.id,
                identifier: transaction.identifier,
                category: "",
                total: transaction.amount,
                lines: []
            } as CreateTransaction
        });
        await new Promise<void>(resolve => this.setState({
            progress: invalidTransactions.length,
            succeeded: [],
            failed: invalidTransactions,
            duplicate: [],
        }, () => resolve()));
        
        let createModels = this.props.transactions.filter((_, i) => ! errors[i]).map(transaction => {
            return {
                dateTime: transaction.dateTime,
                description: transaction.description,
                sourceId: this.getAccount(transaction.source)?.id,
                destinationId: this.getAccount(transaction.destination)?.id,
                identifier: transaction.identifier,
                category: "",
                total: transaction.amount,
                lines: []
            } as CreateTransaction
        });

        while (this.state.progress - invalidTransactions.length < createModels.length - 1) {
            const progress = this.state.progress - invalidTransactions.length;
            let result = await Api.Transaction.createMany(createModels.slice(progress, progress + this.props.batchSize));
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
