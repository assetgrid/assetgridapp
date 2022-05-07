import axios from "axios";
import * as React from "react";
import { Account } from "../../models/account";
import { Transaction } from "../../models/transaction";
import AccountTooltip from "../account/AccountTooltip";
import Table from "../common/Table";
import Tooltip from "../common/Tooltip";
import InputSelect from "../form/InputSelect";
import { AccountIdentifier, AccountReference, capitalize, castFieldValue, CsvCreateTransaction } from "./ImportModels";

type DuplicateHandlingOptions = "none" | "identifier" | "rownumber" | "identifier-rownumber";

interface Props {
    data: any[];
    transactions: CsvCreateTransaction[] | null;
    options: MappingOptions;
    onChange: (transactions: CsvCreateTransaction[], options: MappingOptions) => void;
}

export interface MappingOptions {
    // Mapping options
    duplicateHandling: DuplicateHandlingOptions;
    identifierColumn: string | null;
    amountColumn: string | null;
    sourceAccountColumn: string | null;
    sourceAccountIdentifier: AccountIdentifier;
    destinationAccountColumn: string | null;
    destinationAccountIdentifier: AccountIdentifier;
};

interface State {
    rowOffset: number;
}

function isNullOrWhitespace(input: string) {
    return !input || !input.trim();
}

/*
 * React object class
 */
export default class MapCsvFields extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            rowOffset: 0,
        };
    }

    public render() {
        return <>
            <h3 className="title is-5">Map CSV columns</h3>
            <InputSelect label="Duplicate handling"
                value={this.props.options.duplicateHandling}
                onChange={result => this.updateDuplicateHandling(result as DuplicateHandlingOptions, this.props.options.identifierColumn)}
                items={[
                    { key: "identifier", value: "Colum" },
                    { key: "identifier-rownumber", value: "Column and count" },
                    { key: "rownumber", value: "Row number" },
                    { key: "none", value: "Allow duplicates" }
                ]} />
            <div className="content">
                <p>Duplicates are handled by calculating an identifier for each transaction and storing this.
                    This value will be compared during import and transactions with the same identifier will be ignored</p>
                <ul>
                    <li><b>Column:</b> Use a column as a unique identifier.</li>
                    <li><b>Column and count:</b> Use a column as a unique identifier, but append a number for each occurence of the same column value in the CSV-file.
                        Useful with dates. If you have 3 transactions with value 2020-01-01, their identifier will be 2020-01-01.1, 2020-01-01.2, 2020-01-01.3
                        based on the order they appear in the file</li>
                    <li><b>Row number:</b> The row number is the unique identifier.</li>
                    <li><b>Allow duplicates:</b> No duplicate checking will occur.</li>
                </ul>
            </div>

            {["identifier", "identifier-rownumber"].indexOf(this.props.options.duplicateHandling) > -1 &&
                <InputSelect label="Identifier column"
                    value={this.props.options.identifierColumn}
                    placeholder={"Select column"}
                    onChange={result => this.updateDuplicateHandling(this.props.options.duplicateHandling, result)}
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
                        value={this.props.options.sourceAccountIdentifier}
                        placeholder={"Select variable"}
                        onChange={result => this.accountReferenceChanged("source", result as AccountIdentifier, this.props.options.sourceAccountColumn)}
                        items={[
                            { key: "name", value: "Name" },
                            { key: "id", value: "Id" },
                            { key: "accountNumber", value: "Account Number" },
                        ]} />
                </div>
                <div className="column is-half">
                    <InputSelect label="Source account column"
                        value={this.props.options.sourceAccountColumn}
                        placeholder={"Select column"}
                        onChange={result => this.accountReferenceChanged("source", this.props.options.sourceAccountIdentifier, result)}
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
                        value={this.props.options.destinationAccountIdentifier}
                        placeholder={"Select variable"}
                        onChange={result => this.accountReferenceChanged("destination", result as AccountIdentifier, this.props.options.destinationAccountColumn)}
                        items={[
                            { key: "name", value: "Name" },
                            { key: "id", value: "Id" },
                            { key: "accountNumber", value: "Account Number" },
                        ]} />
                </div>
                <div className="column is-half">
                    <InputSelect label="Destination account column"
                        value={this.props.options.destinationAccountColumn}
                        placeholder={"Select column"}
                        onChange={result => this.accountReferenceChanged("destination", this.props.options.destinationAccountIdentifier, result)}
                        items={Object.keys(this.props.data[0]).map(item => {
                            return {
                                key: item,
                                value: item,
                            }
                        })} />
                </div>
            </div>

            <InputSelect label="Amount column"
                value={this.props.options.amountColumn}
                placeholder={"Select column"}
                onChange={result => this.setAmountColumn(result)}
                items={Object.keys(this.props.data[0]).map(item => {
                    return {
                        key: item,
                        value: item,
                    }
                })} />

            {this.renderImportTable()}
        </>;
    }

    private renderImportTable()
    {
        if (this.props.transactions === null) {
            return <p>Loading</p>;
        }

        return <Table pageSize={20}
            items={this.props.transactions}
            headings={<tr>
                <th>Identifier</th>
                <th>Date</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Amount</th>
            </tr>}
            renderItem={transaction =>
                <tr key={transaction.rowNumber}>
                    <td>{
                        transaction.identifier.length < 30
                            ? transaction.identifier
                            : <Tooltip content={transaction.identifier}>
                                {transaction.identifier.substring(0, 30) + "…"}
                            </Tooltip>
                    }</td>
                    <td></td>
                    <td>
                        {this.printAccount(transaction.from)}
                    </td>
                    <td>
                        {this.printAccount(transaction.to)}
                    </td>
                    <td style={{textAlign: "right"}}>{transaction.amount}</td>
                </tr>}
        />;
    }

    componentDidMount(): void {
        this.updateTransactions();
    }

    private setAmountColumn(newValue: string) {
        this.props.onChange([
            ...this.props.data.map((row, i) => ({
                ...this.props.transactions[i],
                amount: this.getAmount((row as any)[newValue])
            }))
        ], {
            ...this.props.options,
            amountColumn: newValue,
        });
    }

    private updateDuplicateHandling(duplicateHandling: DuplicateHandlingOptions, identifierColumn: string) {
        if (this.props.transactions === null) {
            return;
        }

        this.props.onChange([
            ...this.props.data.map((row, i) => ({
                ...this.props.transactions[i],
                identifier: this.getIdentifier(duplicateHandling, identifierColumn, i, row)
            }))
        ], {
            ...this.props.options,
            duplicateHandling: duplicateHandling,
            identifierColumn: identifierColumn,
        });
    }

    private getIdentifier(duplicateHandling: DuplicateHandlingOptions, identifierColumn: string, rowNumber: number, row: string[] | { [key: string]: string }): string {
        switch (duplicateHandling)
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
        }
    }

    private getAmount(value: string): number {
        const decimalSeparator = ",";

        function escapeRegExp(string: string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
        }

        if (value === undefined || value === null) {
            value = "";
        }

        // Remove everything except numbers and the decimal separator
        value = value.replace(new RegExp("[^" + escapeRegExp(decimalSeparator) + "\\-\\d]", 'g'), "");
        // Change decimal separator to period
        value = value.replace(new RegExp(escapeRegExp(decimalSeparator), 'g'), ".");
        
        let result = Number(value);
        if (isNaN(result)) {
            return 0;
        } else {
            return result;
        }
    }

    private accountReferenceChanged(type: "source" | "destination", identifier: AccountIdentifier, column: string) {
        let newTransactions: CsvCreateTransaction[];
        if (type == "source") {
            newTransactions = [
                ...this.props.data.map((row, i) => ({
                    ...this.props.transactions[i],
                    from: isNullOrWhitespace(row[column]) ? null : {
                        identifier: identifier,
                        value: row[column],
                        account: "fetching" as "fetching"
                    }
                }))
            ];
        } else {
            newTransactions = [
                ...this.props.data.map((row, i) => ({
                    ...this.props.transactions[i],
                    to: isNullOrWhitespace(row[column]) ? null : {
                        identifier: identifier,
                        value: row[column],
                        account: "fetching" as "fetching"
                    }
                }))
            ];
        }

        let newOptions = { ...this.props.options };
        if (type === "source") {
            newOptions.sourceAccountIdentifier = identifier;
            newOptions.sourceAccountColumn = column
        } else {
            newOptions.destinationAccountIdentifier = identifier;
            newOptions.destinationAccountColumn = column
        }
        this.props.onChange(newTransactions, newOptions);

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
            from: isNullOrWhitespace(row[this.props.options.sourceAccountColumn]) ? null : {
                identifier: this.props.options.sourceAccountIdentifier,
                value: row[this.props.options.sourceAccountColumn],
                account: "fetching" as "fetching"
            },
            to: isNullOrWhitespace(row[this.props.options.destinationAccountColumn]) ? null : {
                identifier: this.props.options.destinationAccountIdentifier,
                value: row[this.props.options.destinationAccountColumn],
                account: "fetching" as "fetching"
            },
            identifier: this.getIdentifier(this.props.options.duplicateHandling, this.props.options.identifierColumn, i, row),
            amount: this.getAmount(row[this.props.options.amountColumn]),
        }));
        this.props.onChange(newTransactions, this.props.options);
        
        this.fetchAccounts(newTransactions, this.props.options.sourceAccountIdentifier, this.props.options.destinationAccountIdentifier);
    }

    private fetchAccounts(transactions: CsvCreateTransaction[], sourceIdentifier: AccountIdentifier | null, destinationIdentifier: AccountIdentifier | null) {
        let uniqueAccounts = [
                ...(sourceIdentifier !== null ? transactions.map(transaction => transaction.from) : []),
                ...(destinationIdentifier !== null ? transactions.map(transaction => transaction.to) : [])
            ]
            .filter(account => account != null)
            .filter((account, index, array) => array
                .filter(accountB => accountB !== null)
                .findIndex(accountB => accountB.identifier == account.identifier && accountB.value == account.value) == index)

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
            let newOptions = { ...this.props.options };
            if (sourceIdentifier !== null) {
                newOptions.sourceAccountIdentifier = sourceIdentifier;
            } else if (destinationIdentifier !== null) {
                newOptions.destinationAccountIdentifier = destinationIdentifier;
            }
            
            this.props.onChange([
                ...this.props.transactions.map((transaction, i) => {
                    let result = { ...this.props.transactions[i] };
                    if (sourceIdentifier !== null && result.from !== null) {
                        result.from = {
                            identifier: transaction.from.identifier,
                            value: transaction.from.value,
                            account: res.data.find(account => account[transaction.from.identifier] === transaction.from.value) ?? null
                        }
                    }
                    if (destinationIdentifier !== null && result.to !== null) {
                        result.to = {
                            identifier: transaction.to.identifier,
                            value: transaction.to.value,
                            account: res.data.find(account => account[transaction.to.identifier] === transaction.to.value) ?? null
                        }
                    }
                    return result;
                })
            ], newOptions);
        });
    }

    private printAccount(account: AccountReference | null): React.ReactNode
    {
        if (account === null) {
            return "";
        }
        if (account.account === "fetching") {
            return <AccountTooltip accountReference={account}>
                &hellip;
            </AccountTooltip>;
        }
        if (account.account === null) {
            return <AccountTooltip accountReference={account}>
                Not found
            </AccountTooltip>;
        };

        return <AccountTooltip accountReference={account}>
            {"#" + account.account.id + " " + account.account.name}
        </AccountTooltip>;
    }
}
