import axios from "axios";
import * as React from "react";
import { Account } from "../../models/account";
import { SearchGroupType, SearchOperator, SearchRequest, SearchResponse } from "../../models/search";
import InputButton from "../form/InputButton";
import Import from "./Import";
import ImportCsv, { CsvImportOptions } from "./ImportCsv";
import { capitalize, CsvCreateTransaction } from "./ImportModels";
import MapCsvFields, { MappingOptions } from "./MapCsvFields";
import MissingAccounts from "./MissingAccounts";

interface State
{
    data: any[] | null;
    lines: string[];
    transactions: CsvCreateTransaction[] | null;
    csvFile: File | null;
    csvOptions: CsvImportOptions;
    mappingOptions: MappingOptions;
    accountsBy: { [key: string]: { [value: string]: Account | "fetching" } };
    duplicateIdentifiers: Set<string> | "fetching";

    currentTab: "parse-csv" | "map-columns" | "missing-accounts" | "duplicate-transactions" | "invalid-transactions" | "process";
}

/*
 * React object class
 */
export default class PageImportCsv extends React.Component<{}, State> {
    constructor(props: {}) {
        super(props);
        this.state = {
            data: null,
            transactions: null,
            lines: [],
            currentTab: "parse-csv",
            accountsBy: {},
            duplicateIdentifiers: new Set(),

            csvFile: null,
            csvOptions: {
                csvDelimiter: "auto",
                csvNewlineCharacter: "auto",
                csvParseHeader: true
            },
            /* mappingOptions: {
                duplicateHandling: "identifier",
                identifierColumn: null,
                sourceAccountColumn: null,
                sourceAccountIdentifier: "name",
                destinationAccountColumn: null,
                destinationAccountIdentifier: "name",
                amountColumn: null,
                dateColumn: null,
                // https://moment.github.io/luxon/#/parsing?id=table-of-tokens
                dateFormat: "yyyy-MM-dd"
            } */
            mappingOptions: {
                duplicateHandling: "identifier-rownumber",
                identifierColumn: "Dato",
                sourceAccountColumn: "Exportkonto",
                sourceAccountIdentifier: "accountNumber",
                destinationAccountColumn: null,
                destinationAccountIdentifier: "name",
                amountColumn: "Beløb",
                dateColumn: "Dato",
                // https://moment.github.io/luxon/#/parsing?id=table-of-tokens
                dateFormat: "dd-MM-yyyy"
            }
        };
    }

    public render() {
        return <section className="section container">
            <div className="box">
                <h2 className="title is-2">Import from CSV file</h2>
                <div className="tabs">
                    <ul>
                        <li className={this.state.currentTab === "parse-csv" ? "is-active" : ""}><a>Upload CSV</a></li>
                        <li className={this.state.currentTab === "map-columns" ? "is-active" : ""}><a>Map columns</a></li>
                        <li className={this.state.currentTab === "invalid-transactions" ? "is-active" : ""}><a>Invalid transactions</a></li>
                        <li className={this.state.currentTab === "missing-accounts" ? "is-active" : ""}><a>Missing accounts</a></li>
                        <li className={this.state.currentTab === "duplicate-transactions" ? "is-active" : ""}><a>Duplicates</a></li>
                        <li className={this.state.currentTab === "process" ? "is-active" : ""}><a>Import</a></li>
                    </ul>
                </div>
                
                {this.renderSections()}
            </div>
        </section>;
    }

    private renderSections(): React.ReactNode {
        switch (this.state.currentTab) {
            case "parse-csv":
                return <>
                    <ImportCsv
                        csvFile={this.state.csvFile}
                        csvParsed={(data, lines) => this.setState({ data: data, lines: lines })}
                        optionsChanged={options => this.setState({ csvOptions: options })}
                        fileChanged={file => this.setState({ csvFile: file })}
                        options={this.state.csvOptions}
                    />
                    <div className="buttons">
                        <InputButton onClick={() => this.setState({ currentTab: "map-columns" })}>Continue</InputButton>
                    </div>
                </>;
            case "map-columns":
                return <>
                    {this.state.data != null && <MapCsvFields
                        accountsBy={this.state.accountsBy}
                        options={this.state.mappingOptions}
                        transactions={this.state.transactions}
                        duplicateIdentifiers={this.state.duplicateIdentifiers}
                        data={this.state.data}
                        onChange={(transactions, options) => this.mappingsChanged(transactions, options)}
                    />}
                    <div className="buttons">
                        <InputButton onClick={() => this.setState({ currentTab: "parse-csv" })}>Back</InputButton>
                        <InputButton onClick={() => this.setState({ currentTab: "missing-accounts" })}>Continue</InputButton>
                    </div>
                </>;
            case "missing-accounts":
                if (Object.keys(this.state.accountsBy).some(identifier =>
                    Object.keys(this.state.accountsBy[identifier]).some(value =>
                        this.state.accountsBy[identifier][value] === "fetching"))) {
                    return "Please wait while fetching accounts";
                }
                
                return <>
                    {this.state.transactions != null && <MissingAccounts
                        accountsBy={this.state.accountsBy as { [identifier: string]: { [value: string]: Account } }}
                        transactions={this.state.transactions}
                        accountCreated={account => {
                            const newAccountsBy = { ...this.state.accountsBy };
                            Object.keys(account).forEach(identifier => newAccountsBy[identifier][(account as any)[identifier]] = account);
                            this.setState({ accountsBy: newAccountsBy });
                        }}
                    />}
                    <div className="buttons">
                        <InputButton onClick={() => this.setState({ currentTab: "map-columns" })}>Back</InputButton>
                        <InputButton onClick={() => this.setState({ currentTab: "process" })}>Continue</InputButton>
                    </div>
                </>;
            case "process":
                return <>
                    <Import transactions={this.state.transactions} />
                    <div className="buttons">
                        <InputButton onClick={() => this.setState({ currentTab: "missing-accounts" })}>Back</InputButton>
                    </div>
                </>;
            default:
                throw "Unknown state";
        }
    }

    private mappingsChanged(transactions: CsvCreateTransaction[], options: MappingOptions): void {
        // Update duplicates
        if ((this.state.transactions === null && transactions !== null)
            || transactions.length !== this.state.transactions.length
            || transactions.some((transaction, i) => this.state.transactions[i].identifier !== transaction.identifier)) {
            // There has been a change in identifiers
            let identifierCounts: { [identifier: string]: number } = {};
            for (let i = 0; i < transactions.length; i++) {
                let id = transactions[i].identifier;
                identifierCounts[id] = identifierCounts[id] === undefined ? 1 : identifierCounts[id] + 1;
            }
            this.setState({ duplicateIdentifiers: "fetching" });

            axios.post<string[]>(`https://localhost:7262/Transaction/FindDuplicates`, 
                Object.keys(identifierCounts).filter(identifier => identifierCounts[identifier] === 1)
            ).then(res => {
                this.setState({
                    duplicateIdentifiers: new Set([
                        ...Object.keys(identifierCounts).filter(identifier => identifierCounts[identifier] > 1),
                        ...res.data
                    ])
                });
            });
        }
        
        // Update AccountsBy
        let newAccountsBy = { ...this.state.accountsBy };
        for (let i = 0; i < transactions.length; i++) {
            let transaction = transactions[i];

            if (transaction.from !== null) {
                if (newAccountsBy[transaction.from.identifier] === undefined) {
                    newAccountsBy[transaction.from.identifier] = {};
                }
                if (newAccountsBy[transaction.from.identifier][transaction.from.value] === undefined) {
                    newAccountsBy[transaction.from.identifier][transaction.from.value] = "fetching";
                }
            }

            if (transaction.to !== null) {
                if (newAccountsBy[transaction.to.identifier] === undefined) {
                    newAccountsBy[transaction.to.identifier] = {};
                }
                if (newAccountsBy[transaction.to.identifier][transaction.to.value] === undefined) {
                    newAccountsBy[transaction.to.identifier][transaction.to.value] = "fetching";
                }
            }
        }
        this.setState({
            transactions: transactions,
            mappingOptions: options,
            accountsBy: newAccountsBy,
        });

        // Find every unique account reference in the transactions that has not been loaded
        let uniqueAccountReferences = [
            ...transactions.map(transaction => transaction.from),
            ...transactions.map(transaction => transaction.to)
        ].filter(account => account != null)
            .filter((account, index, array) => array.findIndex(accountB => accountB.identifier == account.identifier && accountB.value == account.value) == index)
            .filter(account => this.state.accountsBy[account.identifier] === undefined
                || this.state.accountsBy[account.identifier][account.value] === undefined
                || this.state.accountsBy[account.identifier][account.value] === "fetching"
                || this.state.accountsBy[account.identifier][account.value] === null);

        let uniqueIdentifiers = uniqueAccountReferences
            .map(account => account.identifier)
            .filter((a, index, array) => array.findIndex(b => a == b) == index);
        
        axios.post<SearchResponse<Account>>(`https://localhost:7262/Account/Search`, 
            ({
                from: 0,
                to: uniqueAccountReferences.length,
                query: {
                    type: SearchGroupType.Or,
                    children: uniqueIdentifiers.map(identifier => ({
                        type: SearchGroupType.Query,
                        query: {
                            column: capitalize(identifier),
                            operator: SearchOperator.Contains,
                            value: uniqueAccountReferences
                                .filter(reference => reference.identifier === identifier)
                                .map(reference => reference.value)
                                .filter((a, index, array) => array.findIndex(b => a == b) == index)
                        }
                    })),
                }
            }) as SearchRequest
        ).then(res => {
            let newAccountsBy = { ...this.state.accountsBy };
            // Update the accounts found
            for (let i = 0; i < res.data.data.length; i++) {
                let account = res.data.data[i];
                Object.keys(account).forEach(identifier => {
                    if (newAccountsBy[identifier] === undefined) {
                        newAccountsBy[identifier] = {};
                    }
                    newAccountsBy[identifier][(account as any)[identifier]] = account;
                });
            }

            // Set missing accounts as unknown as well
            for (let i = 0; i < transactions.length; i++) {
                let transaction = transactions[i];
    
                if (transaction.from !== null) {
                    if (newAccountsBy[transaction.from.identifier][transaction.from.value] === "fetching") {
                        newAccountsBy[transaction.from.identifier][transaction.from.value] = null;
                    }
                }
    
                if (transaction.to !== null) {
                    if (newAccountsBy[transaction.to.identifier][transaction.to.value] === "fetching") {
                        newAccountsBy[transaction.to.identifier][transaction.to.value] = null;
                    }
                }
            }
            this.setState({ accountsBy: newAccountsBy });
        });
    }
}