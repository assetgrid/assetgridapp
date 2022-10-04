import axios from "axios";
import * as React from "react";
import { Api, useApi } from "../../../lib/ApiClient";
import { debounce } from "../../../lib/Utils";
import { Account } from "../../../models/account";
import { CsvImportProfile, ParseOptions } from "../../../models/csvImportProfile";
import { Preferences } from "../../../models/preferences";
import { SearchGroupType, SearchOperator, SearchRequest, SearchResponse } from "../../../models/search";
import { Transaction } from "../../../models/transaction";
import Hero from "../../common/Hero";
import InputButton from "../../input/InputButton";
import { Import } from "../../transaction/import/Import";
import ImportCsv from "../../transaction/import/ImportCsv";
import { AccountReference, capitalize, CsvCreateTransaction } from "../../transaction/import/importModels";
import MapCsvFields from "../../transaction/import/MapCsvFields/MapCsvFields";

const defaultParseOptions = {
    trimWhitespace: true,
    regex: null,
    pattern: "{0}"
} as ParseOptions;

/*
 * React object class
 */
export default function PageImportTransactionsCsv () {
    const [data, setData] = React.useState<any[] | null>(null);
    const [transactions, setTransactions] = React.useState<CsvCreateTransaction[] | null>(null);
    const [lines, setLines] = React.useState<string[]>([]);
    const [currentTab, setCurrentTab] = React.useState<"parse-csv" | "map-columns" | "process">("parse-csv");
    const [accountsBy, setAccountsBy] = React.useState<{ [key: string]: { [value: string]: Account | "fetching" | null } }>({});
    const [duplicateIdentifiers, setDuplicateIdentifiers] = React.useState<Set<string> | "fetching">(new Set());
    const [csvFile, setCsvFile] = React.useState<File | null>(null);
    const [profile, setProfile] = React.useState<CsvImportProfile>({
        csvDelimiter: "auto",
        csvNewlineCharacter: "auto",
        csvParseHeader: true,

        duplicateHandling: "automatic",
        identifierColumn: null,
        identifierParseOptions: defaultParseOptions,
        sourceAccountColumn: null,
        sourceAccount: null,
        sourceAccountIdentifier: "name",
        sourceAccountParseOptions: defaultParseOptions,
        destinationAccountColumn: null,
        destinationAccount: null,
        destinationAccountIdentifier: "name",
        destinationAccountParseOptions: defaultParseOptions,
        amountColumn: null,
        amountParseOptions: defaultParseOptions,
        decimalSeparator: ".",
        dateColumn: null,
        dateParseOptions: defaultParseOptions,
        // https://moment.github.io/luxon/#/parsing?id=table-of-tokens
        dateFormat: "yyyy-MM-dd",
        descriptionColumn: null,
        descriptionParseOptions: defaultParseOptions,
        categoryColumn: null,
        categoryParseOptions: defaultParseOptions,
    });

    const updateDuplicateAccountsDebounced = React.useCallback(debounce(updateDuplicateAccounts, 500), []);
    const fetchAccountsDebounced = React.useCallback(debounce(fetchAccounts, 500), []);
    const api = useApi();
    
    return <>
        <Hero title="Import" subtitle={"From CSV file" + (csvFile !== null ? " (" + csvFile.name + ")" : "")} />
        <div className="tabs has-background-white px-5">
            <ul>
                <li className={currentTab === "parse-csv" ? "is-active" : ""}><a>Upload CSV</a></li>
                <li className={currentTab === "map-columns" ? "is-active" : ""}><a>Map columns</a></li>
                <li className={currentTab === "process" ? "is-active" : ""}><a>Import</a></li>
            </ul>
        </div>
        <div className="p-3">
            {renderSections()}
        </div>
    </>;

    function renderSections(): React.ReactNode {
        switch (currentTab) {
            case "parse-csv":
                return <>
                    <ImportCsv
                        csvFile={csvFile}
                        csvParsed={(data, lines) => { setData(data); setLines(lines); }}
                        optionsChanged={options => setProfile(options)}
                        fileChanged={file => setCsvFile(file)}
                        options={profile}
                        goToNext={() => setCurrentTab("map-columns")}
                    />
                </>;
            case "map-columns":
                return data != null && <MapCsvFields
                        accountsBy={accountsBy}
                        options={profile}
                        transactions={transactions}
                        duplicateIdentifiers={duplicateIdentifiers}
                        accountCreated={account => {
                            const newAccountsBy = { ...accountsBy };
                            Object.keys(account).forEach(identifier => {
                                if (newAccountsBy[identifier] === undefined) newAccountsBy[identifier] = {};
                                newAccountsBy[identifier][(account as any)[identifier]] = account;
                            });
                            setAccountsBy(newAccountsBy);
                        }}
                        data={data}
                        onChange={(transactions, options) => mappingsChanged(transactions, options)}
                        goToPrevious={() => setCurrentTab("parse-csv")}
                        goToNext={() => setCurrentTab("process")}
                        apiReady={api !== null}
                    />;
            case "process":
                if (Object.keys(accountsBy).some(identifier =>
                    Object.keys(accountsBy[identifier]).some(value =>
                        accountsBy[identifier][value] === "fetching"))) {
                    return "Please wait while fetching accounts";
                }
                
                return transactions != null && <>
                    <Import
                        transactions={transactions}
                        accountsBy={accountsBy as { [identifier: string]: { [value: string]: Account; }; }}
                        batchSize={10}
                        goToPrevious={() => setCurrentTab("map-columns")}
                        profile={profile} />
                </>;
            default:
                throw "Unknown state";
        }
    }

    function mappingsChanged(newTransactions: CsvCreateTransaction[], options: CsvImportProfile): void {
        // The CSV mapping window is disabled until the API is loaded to prevent the mappings from changing and triggering an API call
        if (api === null) return;

        // Update duplicates
        if ((transactions === null && newTransactions !== null)
            || newTransactions.length !== transactions?.length
            || newTransactions.some((transaction, i) => transactions[i].identifier !== transaction.identifier)) {
            setDuplicateIdentifiers("fetching");
            updateDuplicateAccountsDebounced(api, newTransactions);
        }
        
        // Update AccountsBy. Go through all transactions and set their accounts to fetching
        let newAccountsBy = { ...accountsBy };
        for (let i = 0; i < newTransactions.length; i++) {
            let transaction = newTransactions[i];

            if (transaction.source !== null) {
                if (newAccountsBy[transaction.source.identifier] === undefined) {
                    newAccountsBy[transaction.source.identifier] = {};
                }
                if (newAccountsBy[transaction.source.identifier][transaction.source.value] === undefined) {
                    newAccountsBy[transaction.source.identifier][transaction.source.value] = "fetching";
                }
            }

            if (transaction.destination !== null) {
                if (newAccountsBy[transaction.destination.identifier] === undefined) {
                    newAccountsBy[transaction.destination.identifier] = {};
                }
                if (newAccountsBy[transaction.destination.identifier][transaction.destination.value] === undefined) {
                    newAccountsBy[transaction.destination.identifier][transaction.destination.value] = "fetching";
                }
            }
        }

        // If explicit accounts have been selected, these need to be added to the AccountsBy object as well
        if (options.sourceAccount !== null) {
            for (const identifier of Object.keys(options.sourceAccount)) {
                if (newAccountsBy[identifier] === undefined) {
                    newAccountsBy[identifier] = {};
                }
                newAccountsBy[identifier][(options.sourceAccount as any)[identifier]] = options.sourceAccount;
            };
        }
        if (options.destinationAccount !== null) {
            for (const identifier of Object.keys(options.destinationAccount)) {
                if (newAccountsBy[identifier] === undefined) {
                    newAccountsBy[identifier] = {};
                }
                newAccountsBy[identifier][(options.destinationAccount as any)[identifier]] = options.destinationAccount;
            };
        }

        setAccountsBy(newAccountsBy);
        setTransactions(newTransactions);
        setProfile(options);

        fetchAccountsDebounced(api, newTransactions, newAccountsBy);
    }

    function updateDuplicateAccounts(api: Api, newTransactions: CsvCreateTransaction[]) {
        let identifierCounts: { [identifier: string]: number } = {};
        for (let i = 0; i < newTransactions.length; i++) {
            let id = newTransactions[i].identifier;
            if (id !== null) {
                identifierCounts[id] = identifierCounts[id] === undefined ? 1 : identifierCounts[id] + 1;
            }
        }
        api.Transaction.findDuplicates(Object.keys(identifierCounts).filter(identifier => identifierCounts[identifier] === 1))
            .then(result => setDuplicateIdentifiers(new Set([
                ...Object.keys(identifierCounts).filter(identifier => identifierCounts[identifier] > 1),
                ...result
            ])));
    }

    function fetchAccounts(api: Api, transactions: CsvCreateTransaction[], accountsBy: { [key: string]: { [value: string]: Account | "fetching" | null } }) {
        // Find every unique account reference in the transactions that has not been loaded
        let uniqueAccountReferences = ([
            ...transactions.map(transaction => transaction.source),
            ...transactions.map(transaction => transaction.destination)
        ].filter(account => account != null) as AccountReference[])
            .filter((account, index, array) => array.findIndex(accountB => accountB.identifier == account.identifier && accountB.value == account.value) == index)
            .filter(account => {
                return accountsBy[account.identifier][account.value] === "fetching"
            });

        let uniqueIdentifiers = uniqueAccountReferences
            .map(account => account.identifier)
            .filter((a, index, array) => array.findIndex(b => a == b) == index);
        
        api.Account.search({
            from: 0,
            to: uniqueAccountReferences.length,
            query: {
                type: SearchGroupType.Or,
                children: uniqueIdentifiers.map(identifier => ({
                    type: SearchGroupType.Query,
                    query: {
                        column: capitalize(identifier),
                        operator: SearchOperator.In,
                        value: uniqueAccountReferences
                            .filter(reference => reference.identifier === identifier)
                            .map(reference => reference.value)
                            .filter((a, index, array) => array.findIndex(b => a == b) == index)
                    }
                })),
            }
        } as SearchRequest).then(result => {
            accountsBy = { ...accountsBy };
            // Update the accounts found
            for (let i = 0; i < result.data.data.length; i++) {
                let account = result.data.data[i];
                Object.keys(account).forEach(identifier => {
                    if (accountsBy[identifier] === undefined) {
                        accountsBy[identifier] = {};
                    }
                    accountsBy[identifier][(account as any)[identifier]] = account;
                });
            }

            // Set missing accounts to be known missing as well (rather than being fetching)
            for (let i = 0; i < transactions.length; i++) {
                let transaction = transactions[i];
    
                if (transaction.source !== null) {
                    if (accountsBy[transaction.source.identifier][transaction.source.value] === "fetching") {
                        accountsBy[transaction.source.identifier][transaction.source.value] = null;
                    }
                }
    
                if (transaction.destination !== null) {
                    if (accountsBy[transaction.destination.identifier][transaction.destination.value] === "fetching") {
                        accountsBy[transaction.destination.identifier][transaction.destination.value] = null;
                    }
                }
            }

            setAccountsBy(accountsBy);
        });
    }
}