import axios from "axios";
import * as React from "react";
import { Api } from "../../../lib/ApiClient";
import { Account } from "../../../models/account";
import { Preferences } from "../../../models/preferences";
import { SearchGroupType, SearchOperator, SearchRequest, SearchResponse } from "../../../models/search";
import Hero from "../../common/Hero";
import InputButton from "../../input/InputButton";
import { Import } from "../../transaction/import/Import";
import ImportCsv, { CsvImportOptions } from "../../transaction/import/ImportCsv";
import { AccountReference, capitalize, CsvCreateTransaction } from "../../transaction/import/importModels";
import MapCsvFields, { MappingOptions } from "../../transaction/import/MapCsvFields/MapCsvFields";
import { ParseOptions } from "../../transaction/import/ParseOptions";

/*
 * React object class
 */
export default function PageImportTransactionsCsv () {
    const defaultParseOptions = {
        trimWhitespace: true,
        regex: null,
        pattern: "{0}"
    } as ParseOptions;

    const [data, setData] = React.useState<any[] | null>(null);
    const [transactions, setTransactions] = React.useState<CsvCreateTransaction[] | null>(null);
    const [lines, setLines] = React.useState<string[]>([]);
    const [currentTab, setCurrentTab] = React.useState<"parse-csv" | "map-columns" | "process">("parse-csv");
    const [accountsBy, setAccountsBy] = React.useState<{ [key: string]: { [value: string]: Account | "fetching" | null } }>({});
    const [duplicateIdentifiers, setDuplicateIdentifiers] = React.useState<Set<string> | "fetching">(new Set());
    const [csvFile, setCsvFile] = React.useState<File | null>(null);
    const [csvOptions, setCsvOptions] = React.useState<CsvImportOptions>({
        csvDelimiter: "auto",
        csvNewlineCharacter: "auto",
        csvParseHeader: true
    });
    const [mappingOptions, setMappingOptions] = React.useState<MappingOptions>({
        duplicateHandling: "identifier",
        identifierColumn: null,
        identifierParseOptions: defaultParseOptions,
        sourceAccountColumn: null,
        sourceAccountIdentifier: "name",
        sourceAccountParseOptions: defaultParseOptions,
        destinationAccountColumn: null,
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
    });

    /* const [mappingOptions, setMappingOptions] = React.useState<MappingOptions>({
        duplicateHandling: "identifier-rownumber",
        identifierColumn: "Dato",
        identifierParseOptions: defaultParseOptions,
        sourceAccountColumn: null,
        sourceAccountIdentifier: "accountNumber",
        sourceAccountParseOptions: defaultParseOptions,
        destinationAccountColumn: "Exportkonto",
        destinationAccountIdentifier: "accountNumber",
        destinationAccountParseOptions: defaultParseOptions,
        amountColumn: "Beløb",
        amountParseOptions: defaultParseOptions,
        decimalSeparator: ",",
        dateColumn: "Dato",
        dateParseOptions: defaultParseOptions,
        // https://moment.github.io/luxon/#/parsing?id=table-of-tokens
        dateFormat: "dd-MM-yyyy",
        descriptionColumn: "Tekst",
        descriptionParseOptions: defaultParseOptions,
    }); */
    
    return <>
        <Hero title="Import" subtitle="From CSV file" />
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
                        optionsChanged={options => setCsvOptions(options)}
                        fileChanged={file => setCsvFile(file)}
                        options={csvOptions}
                        goToNext={() => setCurrentTab("map-columns")}
                    />
                </>;
            case "map-columns":
                return data != null && <MapCsvFields
                        accountsBy={accountsBy}
                        options={mappingOptions}
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
                        goToPrevious={() => setCurrentTab("map-columns")}/>
                </>;
            default:
                throw "Unknown state";
        }
    }

    function mappingsChanged(newTransactions: CsvCreateTransaction[], options: MappingOptions): void {
        // Update duplicates
        if ((transactions === null && newTransactions !== null)
            || newTransactions.length !== transactions?.length
            || newTransactions.some((transaction, i) => transactions[i].identifier !== transaction.identifier)) {
            // There has been a change in identifiers
            let identifierCounts: { [identifier: string]: number } = {};
            for (let i = 0; i < newTransactions.length; i++) {
                let id = newTransactions[i].identifier;
                if (id !== null) {
                    identifierCounts[id] = identifierCounts[id] === undefined ? 1 : identifierCounts[id] + 1;
                }
            }
            setDuplicateIdentifiers("fetching");

            Api.Transaction.findDuplicates(Object.keys(identifierCounts).filter(identifier => identifierCounts[identifier] === 1))
                .then(result => setDuplicateIdentifiers(new Set([
                    ...Object.keys(identifierCounts).filter(identifier => identifierCounts[identifier] > 1),
                    ...result
                ])));
        }
        
        // Update AccountsBy
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
        setTransactions(newTransactions);
        setMappingOptions(options);
        setAccountsBy(newAccountsBy);

        // Find every unique account reference in the transactions that has not been loaded
        let uniqueAccountReferences = ([
            ...newTransactions.map(transaction => transaction.source),
            ...newTransactions.map(transaction => transaction.destination)
        ].filter(account => account != null) as AccountReference[])
            .filter((account, index, array) => array.findIndex(accountB => accountB.identifier == account.identifier && accountB.value == account.value) == index)
            .filter(account => accountsBy[account.identifier] === undefined
                || accountsBy[account.identifier][account.value] === undefined
                || accountsBy[account.identifier][account.value] === "fetching"
                || accountsBy[account.identifier][account.value] === null);

        let uniqueIdentifiers = uniqueAccountReferences
            .map(account => account.identifier)
            .filter((a, index, array) => array.findIndex(b => a == b) == index);
        
        Api.Account.search({
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
            newAccountsBy = { ...newAccountsBy };
            // Update the accounts found
            for (let i = 0; i < result.data.length; i++) {
                let account = result.data[i];
                Object.keys(account).forEach(identifier => {
                    if (newAccountsBy[identifier] === undefined) {
                        newAccountsBy[identifier] = {};
                    }
                    newAccountsBy[identifier][(account as any)[identifier]] = account;
                });
            }

            // Set missing accounts to be known missing as well (rather than being fetching)
            for (let i = 0; i < newTransactions.length; i++) {
                let transaction = newTransactions[i];
    
                if (transaction.source !== null) {
                    if (newAccountsBy[transaction.source.identifier][transaction.source.value] === "fetching") {
                        newAccountsBy[transaction.source.identifier][transaction.source.value] = null;
                    }
                }
    
                if (transaction.destination !== null) {
                    if (newAccountsBy[transaction.destination.identifier][transaction.destination.value] === "fetching") {
                        newAccountsBy[transaction.destination.identifier][transaction.destination.value] = null;
                    }
                }
            }
            setAccountsBy(newAccountsBy);
        });
    }
}