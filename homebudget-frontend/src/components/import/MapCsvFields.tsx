import axios from "axios";
import { DateTime } from "luxon";
import * as React from "react";
import { Account } from "../../models/account";
import { SearchGroupType, SearchRequest, SearchResponse } from "../../models/search";
import { Transaction } from "../../models/transaction";
import AccountTooltip from "../account/AccountTooltip";
import { Card } from "../common/Card";
import Table from "../common/Table";
import Tooltip from "../common/Tooltip";
import InputButton from "../form/InputButton";
import InputSelect from "../form/InputSelect";
import InputText from "../form/InputText";
import { AccountIdentifier, AccountReference, capitalize, castFieldValue, CsvCreateTransaction } from "./ImportModels";

type DuplicateHandlingOptions = "none" | "identifier" | "rownumber" | "identifier-rownumber";

interface Props {
    data: any[];
    transactions: CsvCreateTransaction[] | null;
    accountsBy: { [key: string]: { [value: string]: Account | "fetching" } };
    duplicateIdentifiers: Set<string> | "fetching";
    options: MappingOptions;
    onChange: (transactions: CsvCreateTransaction[], options: MappingOptions) => void;
    goToNext: () => void;
    goToPrevious: () => void;
}

export interface MappingOptions {
    // Mapping options
    duplicateHandling: DuplicateHandlingOptions;
    identifierColumn: string | null;
    amountColumn: string | null;
    descriptionColumn: string | null;
    sourceAccountColumn: string | null;
    sourceAccountIdentifier: AccountIdentifier;
    destinationAccountColumn: string | null;
    destinationAccountIdentifier: AccountIdentifier;
    dateColumn: string | null;
    dateFormat: string;
};

interface State {
    rowOffset: number;
    tableDraw: number;
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
            tableDraw: 0,
        };
    }

    public render() {
        return <>
            <Card title="Mapping options">
                <div className="columns">
                    <div className="column">
                        <InputSelect label="Duplicate handling"
                            value={this.props.options.duplicateHandling}
                            onChange={result => this.updateDuplicateHandling(result as DuplicateHandlingOptions, this.props.options.identifierColumn)}
                            items={[
                                { key: "identifier", value: "Colum" },
                                { key: "identifier-rownumber", value: "Column and count" },
                                { key: "rownumber", value: "Row number" },
                                { key: "none", value: "Allow duplicates" }
                            ]} />
                    </div>
                    <div className="column">
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
                    </div>
                </div>
            
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

                <div className="columns">
                    <div className="column">
                        <InputSelect label="Date column"
                            value={this.props.options.dateColumn}
                            placeholder={"Select column"}
                            onChange={result => this.updateDateHandling(result, this.props.options.dateFormat)}
                            items={Object.keys(this.props.data[0]).map(item => {
                                return {
                                    key: item,
                                    value: item,
                                }
                            })} />
                    </div>
                    {this.props.options.dateColumn !== null && <div className="column">
                        <InputText label="Date format"
                            value={this.props.options.dateFormat}
                            onChange={e => this.updateDateHandling(this.props.options.dateColumn, e.target.value)}
                        />
                        <a href="https://moment.github.io/luxon/#/parsing?id=table-of-tokens" target="_blank">Read more</a>
                    </div>}
                </div>

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

                <InputSelect label="Description column"
                    value={this.props.options.descriptionColumn}
                    placeholder={"Select column"}
                    onChange={result => this.setDescriptionColumn(result)}
                    items={Object.keys(this.props.data[0]).map(item => {
                        return {
                            key: item,
                            value: item,
                        }
                    })} />
            </Card>

            <Card title="Import preview">
                {this.renderImportTable()}

                <div className="buttons">
                    <InputButton onClick={this.props.goToPrevious}>Back</InputButton>
                    <InputButton className="is-primary" onClick={this.props.goToNext}>Continue</InputButton>
                </div>
            </Card>
        </>;
    }

    private renderImportTable() {
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
                <th>Description</th>
                <th>Amount</th>
            </tr>}
            draw={this.state.tableDraw}
            renderItem={transaction =>
                <tr key={transaction.rowNumber}>
                    <td>{this.duplicateIndicator(transaction.identifier)}
                        {transaction.identifier.length < 30
                            ? transaction.identifier
                            : <Tooltip content={transaction.identifier}>
                                {transaction.identifier.substring(0, 30) + "…"}
                            </Tooltip>
                    }</td>
                    <td>
                        <Tooltip content={transaction.dateText}>
                            {transaction.dateTime.toFormat("yyyy-MM-dd")}
                        </Tooltip>
                    </td>
                    <td>
                        {this.printAccount(transaction.source)}
                    </td>
                    <td>
                        {this.printAccount(transaction.destination)}
                    </td>
                    <td>{transaction.description}</td>
                    <td style={{ textAlign: "right" }}>{transaction.amount}</td>
                </tr>}
        />;
    }

    private duplicateIndicator(identifier: string): React.ReactNode {
        if (this.props.duplicateIdentifiers === "fetching") {
            return <Tooltip content="Checking for duplicates">
                <span className="icon">
                    <i className="fas fa-spinner fa-pulse"></i>
                </span>
            </Tooltip>;
        }
        if (this.props.duplicateIdentifiers.has(identifier)) {
            return <Tooltip content="Duplicate identifier">
                <span className="icon has-text-danger">
                    <i className="fas fa-exclamation-triangle"></i>
                </span>
            </Tooltip>;
        }
        return <></>;
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

    private setDescriptionColumn(newValue: string) {
        this.props.onChange([
            ...this.props.data.map((row, i) => ({
                ...this.props.transactions[i],
                description: (row as any)[newValue]
            }))
        ], {
            ...this.props.options,
            descriptionColumn: newValue,
        });
    }

    private updateDateHandling(dateColumn: string, dateFormat: string) {
        this.props.onChange([
            ...this.props.data.map((row, i) => {
                const dateText = (row as any)[dateColumn] ?? "";
                return {
                    ...this.props.transactions[i],
                    date: DateTime.fromFormat(dateText, dateFormat),
                    dateText: dateText
                }
            })
        ], {
            ...this.props.options,
            dateColumn: dateColumn,
            dateFormat: dateFormat
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
                    source: isNullOrWhitespace(row[column]) ? null : {
                        identifier: identifier,
                        value: row[column],
                    } as AccountReference
                } as CsvCreateTransaction))
            ];
        } else {
            newTransactions = [
                ...this.props.data.map((row, i) => ({
                    ...this.props.transactions[i],
                    destination: isNullOrWhitespace(row[column]) ? null : {
                        identifier: identifier,
                        value: row[column],
                    } as AccountReference
                } as CsvCreateTransaction))
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
    }

    componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>): void {
        if (this.props.data != prevProps.data) {
            this.updateTransactions();
        }
        if (this.props.transactions !== prevProps.transactions) {
            this.setState({ tableDraw: this.state.tableDraw + 1 });
        }
    }

    private updateTransactions() {
        let newTransactions = this.props.data.map((row, i) => {
            const dateText = (row as any)[this.props.options.dateColumn] ?? "";
            return {
                rowNumber: i,
                dateText: dateText,
                dateTime: DateTime.fromFormat(dateText, this.props.options.dateFormat),
                description: row[this.props.options.descriptionColumn],
                source: isNullOrWhitespace(row[this.props.options.sourceAccountColumn]) ? null : {
                    identifier: this.props.options.sourceAccountIdentifier,
                    value: row[this.props.options.sourceAccountColumn],
                } as AccountReference,
                destination: isNullOrWhitespace(row[this.props.options.destinationAccountColumn]) ? null : {
                    identifier: this.props.options.destinationAccountIdentifier,
                    value: row[this.props.options.destinationAccountColumn],
                } as AccountReference,
                identifier: this.getIdentifier(this.props.options.duplicateHandling, this.props.options.identifierColumn, i, row),
                amount: this.getAmount(row[this.props.options.amountColumn]),
            } as CsvCreateTransaction
        });
        this.props.onChange(newTransactions, this.props.options);
    }

    private printAccount(reference: AccountReference | null): React.ReactNode
    {
        if (reference === null) {
            return "";
        }

        let account = this.props.accountsBy[reference.identifier] ?
            this.props.accountsBy[reference.identifier][reference.value] ?? null
            : null;
        if (account === "fetching") {
            return <Tooltip content={"Fetching account with " + reference.identifier + ": " + reference.value}>
                &hellip;
            </Tooltip>;
        }
        if (account === null) {
            return <Tooltip content={"No account found with " + reference.identifier + ": " + reference.value}>
                <span className="icon has-text-danger">
                    <i className="fas fa-exclamation-triangle"></i>
                </span>
                Not found
            </Tooltip>;
        };

        return <AccountTooltip account={account}>
            {"#" + account.id + " " + account.name}
        </AccountTooltip>;
    }
}
