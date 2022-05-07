import axios from "axios";
import * as React from "react";
import { Account } from "../../models/account";
import { Transaction } from "../../models/transaction";
import InputSelect from "../form/InputSelect";
import { AccountIdentifier, AccountReference, capitalize, castFieldValue, CsvCreateTransaction } from "./ImportModels";

type DuplicateHandlingOptions = "none" | "identifier" | "rownumber" | "identifier-rownumber" | "row";

interface Props {
    data: any[];
    lines: string[];

    transactions: CsvCreateTransaction[] | null;
    onChange: (transactions: CsvCreateTransaction[]) => void;
}

interface State {
    rowOffset: number;

    // Mapping options
    duplicateHandling: DuplicateHandlingOptions;
    identifierColumn: string | null;
    sourceAccountColumn: string | null;
    sourceAccountIdentifier: AccountIdentifier;
    destinationAccountColumn: string | null;
    destinationAccountIdentifier: AccountIdentifier;
}

const pageSize: number = 20;

/*
 * React object class
 */
export default class MapCsvFields extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            rowOffset: 0,

            duplicateHandling: "row",
            identifierColumn: null,
            sourceAccountColumn: null,
            sourceAccountIdentifier: "name",
            destinationAccountColumn: null,
            destinationAccountIdentifier: "name",
        };
    }

    public render() {
        return <>
            <h3 className="title is-5">Map CSV columns</h3>
            <InputSelect label="Duplicate handling"
                value={this.state.duplicateHandling}
                onChange={result => this.updateDuplicateHandling(result as DuplicateHandlingOptions)}
                items={[
                    { key: "row", value: "CSV line" },
                    { key: "identifier", value: "Colum" },
                    { key: "identifier-rownumber", value: "Column and count" },
                    { key: "rownumber", value: "Row number" },
                    { key: "none", value: "Allow duplicates" }
                ]} />
            <div className="content">
                <p>Duplicates are handled by calculating an identifier for each transaction and storing this.
                    This value will be compared during import and transactions with the same identifier will be ignored</p>
                <ul>
                    <li><b>CSV line:</b> The line in the current CSV file will be used as a unique identifier.
                        Later CSV-uploads of the exact same line (same columns, same order, same value) will be treated as a duplicate.</li>
                    <li><b>Column:</b> Use a column as a unique identifier.</li>
                    <li><b>Column and count:</b> Use a column as a unique identifier, but append a number for each occurence of the same column value in the CSV-file.
                        Useful with dates. If you have 3 transactions with value 2020-01-01, their identifier will be 2020-01-01.1, 2020-01-01.2, 2020-01-01.3
                        based on the order they appear in the file</li>
                    <li><b>Row number:</b> The row number is the unique identifier.</li>
                    <li><b>Allow duplicates:</b> No duplicate checking will occur.</li>
                </ul>
            </div>

            {["identifier", "identifier-rownumber"].indexOf(this.state.duplicateHandling) > -1 &&
                <InputSelect label="Identifier column"
                    value={this.state.identifierColumn}
                    placeholder={"Select column"}
                    onChange={result => this.updateIdentifierColumn(result)}
                    items={Object.keys(this.props.data[0]).map(item => {
                        return {
                            key: item,
                            value: item,
                        }
                    })} />
            }

            <div className="columns">
                <div className="column is-half">
                    <InputSelect label="Source account identifier"
                        value={this.state.sourceAccountIdentifier}
                        placeholder={"Select variable"}
                        onChange={result => this.accountReferenceChanged("source", result as AccountIdentifier, this.state.sourceAccountColumn)}
                        items={[
                            { key: "name", value: "Name" },
                            { key: "id", value: "Id" },
                            { key: "accountNumber", value: "Account Number" },
                        ]} />
                </div>
                <div className="column is-half">
                    <InputSelect label="Source account column"
                        value={this.state.sourceAccountColumn}
                        placeholder={"Select column"}
                        onChange={result => this.accountReferenceChanged("source", this.state.sourceAccountIdentifier, result)}
                        items={Object.keys(this.props.data[0]).map(item => {
                            return {
                                key: item,
                                value: item,
                            }
                        })} />
                </div>
            </div>

            <div className="columns">
                <div className="column is-half">
                    <InputSelect label="Destination account identifier"
                        value={this.state.destinationAccountIdentifier}
                        placeholder={"Select variable"}
                        onChange={result => this.accountReferenceChanged("destination", result as AccountIdentifier, this.state.destinationAccountColumn)}
                        items={[
                            { key: "name", value: "Name" },
                            { key: "id", value: "Id" },
                            { key: "accountNumber", value: "Account Number" },
                        ]} />
                </div>
                <div className="column is-half">
                    <InputSelect label="Destination account column"
                        value={this.state.destinationAccountColumn}
                        placeholder={"Select column"}
                        onChange={result => this.accountReferenceChanged("destination", this.state.destinationAccountIdentifier, result)}
                        items={Object.keys(this.props.data[0]).map(item => {
                            return {
                                key: item,
                                value: item,
                            }
                        })} />
                </div>
            </div>

            {this.renderImportTable()}
        </>;
    }

    private renderImportTable()
    {
        if (this.props.transactions === null) {
            return <p>Loading</p>;
        }

        const transactions = this.props.transactions
            .slice(this.state.rowOffset * pageSize, (this.state.rowOffset + 1) * pageSize);
        return <table className="table is-fullwidth is-hoverable">
            <thead>
                <tr>
                    <th>Identifier</th>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tfoot>
                <tr>
                    <th>Identifier</th>
                    <th>Source</th>
                    <th>Destination</th>
                    <th>Amount</th>
                </tr>
            </tfoot>
            <tbody>
                {transactions.map(transaction => 
                    <tr key={transaction.rowNumber}>
                        <td>{transaction.identifier}</td>
                        <td>{this.printAccount(transaction.from)}</td>
                        <td>{this.printAccount(transaction.to)}</td>
                        <td></td>
                    </tr>
                )}
            </tbody>
        </table>;
    }

    componentDidMount(): void {
        this.updateTransactions();
    }

    private updateDuplicateHandling(duplicateHandling: DuplicateHandlingOptions) {
        this.setState({ duplicateHandling: duplicateHandling });
        this.updateIdentifierColumn(this.state.identifierColumn);
    }

    private updateIdentifierColumn(identifierColumn: string) {
        if (this.props.transactions === null) {
            return;
        }

        this.setState({ identifierColumn: identifierColumn });
        this.props.onChange([
            ...this.props.data.map((row, i) => ({
                ...this.props.transactions[i],
                identifier: this.getIdentifier(identifierColumn, i, row)
            }))
        ]);
    }

    private getIdentifier(identifierColumn: string, rowNumber: number, row: string[] | { [key: string]: string }): string
    {
        switch (this.state.duplicateHandling)
        {
            case "none":
                return "";
            case "rownumber":
                return rowNumber.toString();
            case "identifier":
                if (identifierColumn == null) {
                    return "";
                } else {
                    return (row as any)[identifierColumn];
                }
            case "identifier-rownumber":
                if (identifierColumn == null) {
                    return "";
                } else {
                    const value = (row as any)[identifierColumn]
                    let number = this.props.data
                        .map((row, index) => [row, index])
                        .filter(row => row[1] <= rowNumber && row[0][identifierColumn] == value)
                        .length;
                    return value + "." + number;
                }
            case "row":
                return this.props.lines[rowNumber];
        }
    }

    private accountReferenceChanged(type: "source" | "destination", identifier: AccountIdentifier, column: string) {
        let newTransactions: CsvCreateTransaction[];
        if (type == "source") {
            this.setState({ sourceAccountColumn: column, sourceAccountIdentifier: identifier });
            newTransactions = [
                ...this.props.data.map((row, i) => ({
                    ...this.props.transactions[i],
                    from: {
                        identifier: identifier,
                        value: row[column],
                        account: "fetching" as "fetching"
                    }
                }))
            ];
        } else {
            this.setState({ destinationAccountColumn: column, destinationAccountIdentifier: identifier });
            newTransactions = [
                ...this.props.data.map((row, i) => ({
                    ...this.props.transactions[i],
                    to: {
                        identifier: identifier,
                        value: row[column],
                        account: "fetching" as "fetching"
                    }
                }))
            ];
        }
        this.props.onChange(newTransactions);

        if (type === "source") {
            this.fetchAccounts(newTransactions, identifier, null);
        } else {
            this.fetchAccounts(newTransactions, null, identifier);
        }
    }

    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>): void {
        if (this.props.data != prevProps.data) {
            this.updateTransactions();
        }
    }

    private updateTransactions() {
        let newTransactions = this.props.data.map((row, i) => ({
            rowNumber: i,
            created: new Date(),
            description: "",
            from: {
                identifier: this.state.sourceAccountIdentifier,
                value: row[this.state.sourceAccountColumn],
                account: "fetching" as "fetching"
            },
            to: {
                identifier: this.state.destinationAccountIdentifier,
                value: row[this.state.destinationAccountColumn],
                account: "fetching" as "fetching"
            },
            identifier: this.getIdentifier(this.state.identifierColumn, i, row),
            lines: []
        }));
        this.props.onChange(newTransactions);
        
        this.fetchAccounts(newTransactions, this.state.sourceAccountIdentifier, this.state.destinationAccountIdentifier);
    }

    private fetchAccounts(transactions: CsvCreateTransaction[], sourceIdentifier: string | null, destinationIdentifier: string | null) {
        let uniqueAccounts = [
                ...(sourceIdentifier !== null ? transactions.map(transaction => transaction.from) : []),
                ...(destinationIdentifier !== null ? transactions.map(transaction => transaction.to) : [])
            ]
            .filter((account, index, array) => array.findIndex(accountB => accountB.identifier == account.identifier && accountB.value == account.value) == index)
            .filter(account => account.value !== undefined && account.value !== null && account.value !== "");

        let query = [];
        if (sourceIdentifier !== null) {
            query.push({
                type: 2,
                children: [],
                query: {
                    column: capitalize(sourceIdentifier),
                    operator: 1,
                    value: uniqueAccounts.map(account => castFieldValue(account.value, account.identifier)),
                }
            });
        }
        if (destinationIdentifier !== null) {
            query.push({
                type: 2,
                children: [],
                query: {
                    column: capitalize(destinationIdentifier),
                    operator: 1,
                    value: uniqueAccounts.map(account => castFieldValue(account.value, account.identifier)),
                }
            });
        }
        
        axios.post<Account[]>(`https://localhost:7262/Account/Search`, {
            query: {
                type: 0,
                children: query
            }
        }).then(res => {
            this.props.onChange([
                ...this.props.transactions.map((transaction, i) => {
                    let result = { ...this.props.transactions[i] };
                    if (sourceIdentifier !== null) {
                        result.from = {
                            identifier: transaction.from.identifier,
                            value: transaction.from.value,
                            account: res.data.find(account => account[transaction.from.identifier] === transaction.from.value) ?? null
                        }
                    }
                    if (destinationIdentifier !== null) {
                        result.to = {
                            identifier: transaction.to.identifier,
                            value: transaction.to.value,
                            account: res.data.find(account => account[transaction.to.identifier] === transaction.to.value) ?? null
                        }
                    }
                    return result;
                })
            ]);
        });
    }

    private printAccount(account: AccountReference)
    {
        if (account.account === "fetching") {
            return "…";
        }
        if (account.account === null) return "";
        return "#" + account.account.id + " " + account.account.name;
    }
}
