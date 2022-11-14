import * as React from "react";
import { useTranslation } from "react-i18next";
import { Api, useApi } from "../../../lib/ApiClient";
import { debounce } from "../../../lib/Utils";
import { Account } from "../../../models/account";
import { CsvImportProfile, ParseOptions } from "../../../models/csvImportProfile";
import Hero from "../../common/Hero";
import { Import } from "../../transaction/import/Import";
import ImportCsv from "../../transaction/import/ImportCsv";
import { CsvCreateTransaction } from "../../transaction/import/importModels";
import MapCsvFields, { updateAutoIdentifiers } from "../../transaction/import/MapCsvFields/MapCsvFields";

const defaultParseOptions: ParseOptions = {
    trimWhitespace: true,
    regex: null,
    pattern: "{0}"
};

/*
 * React object class
 */
export default function PageImportTransactionsCsv (): React.ReactElement {
    const [data, setData] = React.useState<any[] | null>(null);
    const [accounts, setAccounts] = React.useState<Account[] | "fetching">("fetching");
    const [transactions, setTransactions] = React.useState<CsvCreateTransaction[] | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [lines, setLines] = React.useState<string[]>([]);
    const [currentTab, setCurrentTab] = React.useState<"parse-csv" | "map-columns" | "process">("parse-csv");
    const [duplicateIdentifiers, setDuplicateIdentifiers] = React.useState<Set<string> | "fetching">(new Set());
    const [csvFile, setCsvFile] = React.useState<File | null>(null);
    const { t } = useTranslation();
    const [profile, setProfile] = React.useState<CsvImportProfile>({
        csvDelimiter: "auto",
        csvNewlineCharacter: "auto",
        csvParseHeader: true,
        csvTextEncoding: null,
        csvSkipLines: 0,

        duplicateHandling: "automatic",
        identifierColumn: null,
        identifierParseOptions: defaultParseOptions,
        sourceAccountColumn: null,
        sourceAccountId: null,
        sourceAccountType: "column",
        sourceAccountParseOptions: defaultParseOptions,
        destinationAccountColumn: null,
        destinationAccountId: null,
        destinationAccountType: "column",
        destinationAccountParseOptions: defaultParseOptions,
        debitAmountColumn: null,
        debitAmountParseOptions: defaultParseOptions,
        separateCreditDebitColumns: false,
        creditAmountColumn: null,
        creditAmountParseOptions: defaultParseOptions,

        decimalSeparator: ".",
        dateColumn: null,
        dateParseOptions: defaultParseOptions,
        // https://moment.github.io/luxon/#/parsing?id=table-of-tokens
        dateFormat: "yyyy-MM-dd",
        descriptionColumn: null,
        descriptionParseOptions: defaultParseOptions,
        categoryColumn: null,
        categoryParseOptions: defaultParseOptions
    });

    const updateDuplicateAccountsDebounced = React.useCallback(debounce(updateDuplicateAccounts, 500), []);
    const api = useApi();

    React.useEffect(() => {
        if (api !== null) {
            api.Account.search({ from: 0, to: 1000, descending: false, orderByColumn: "Id" }).then(result => {
                if (result.status === 200) {
                    setAccounts(result.data.data);
                }
            }).catch(null);
        }
    }, [api]);

    return <>
        <Hero title={t("common.import")}
            subtitle={csvFile === null ? t("import.from_csv_file") : t("import.from_csv_file_with_filename", { filename: csvFile.name })} />
        <div className="tabs has-background-white px-5">
            <ul>
                <li className={currentTab === "parse-csv" ? "is-active" : ""}><a>{t("import.upload_csv")}</a></li>
                <li className={currentTab === "map-columns" ? "is-active" : ""}><a>{t("import.map_columns")}</a></li>
                <li className={currentTab === "process" ? "is-active" : ""}><a>{t("common.import")}</a></li>
            </ul>
        </div>
        <div className="p-3">
            {renderSections()}
        </div>
    </>;

    function renderSections (): React.ReactNode {
        switch (currentTab) {
            case "parse-csv":
                return <>
                    <ImportCsv
                        csvFile={csvFile}
                        csvParsed={(data, lines) => { setData(data); setLines(lines); }}
                        optionsChanged={options => setProfile(options)}
                        fileChanged={file => setCsvFile(file)}
                        options={profile}
                        goToNext={() => accounts !== "fetching" && setCurrentTab("map-columns")}
                    />
                </>;
            case "map-columns":
                return data != null && <MapCsvFields
                    options={profile}
                    accounts={accounts === "fetching" ? [] : accounts}
                    setAccounts={accountsChanged}
                    transactions={transactions}
                    duplicateIdentifiers={duplicateIdentifiers}
                    data={data}
                    addAccount={account => accounts !== "fetching" && setAccounts([...accounts, account])}
                    onChange={(transactions, options) => mappingsChanged(transactions, options)}
                    goToPrevious={() => setCurrentTab("parse-csv")}
                    goToNext={() => setCurrentTab("process")}
                    apiReady={api !== null} />;
            case "process":
                return transactions != null && <>
                    <Import
                        transactions={transactions}
                        batchSize={100}
                        goToPrevious={() => setCurrentTab("map-columns")}
                        profile={profile}
                        accounts={accounts === "fetching" ? [] : accounts} />
                </>;
        }
    }

    function mappingsChanged (newTransactions: CsvCreateTransaction[], options: CsvImportProfile): void {
        // The CSV mapping window is disabled until the API is loaded to prevent the mappings from changing and triggering an API call
        if (api === null) return;

        // If any account identifier changed, update duplicates
        if ((transactions === null && newTransactions !== null) ||
            newTransactions.length !== transactions?.length ||
            newTransactions.some((transaction, i) => transactions[i].identifier !== transaction.identifier)) {
            setDuplicateIdentifiers("fetching");
            updateDuplicateAccountsDebounced(api, newTransactions);
        }

        setTransactions(newTransactions);
        setProfile(options);
    }

    function accountsChanged (newAccounts: Account[]): void {
        if (transactions !== null) {
            // Create object from identifiers to speed up lookups
            const identifierDictionary: { [identifier: string]: Account } = {};
            newAccounts.forEach(account => account.identifiers.forEach(identifier => {
                if (identifierDictionary[identifier] === undefined) {
                    identifierDictionary[identifier] = account;
                }
            }));

            setTransactions(
                updateAutoIdentifiers([...transactions.map(transaction => ({
                    ...transaction,
                    source: identifierDictionary[transaction.sourceText] ?? null,
                    destination: identifierDictionary[transaction.destinationText] ?? null
                }))], profile)
            );
        }
        setAccounts(newAccounts);
    }

    async function updateDuplicateAccounts (api: Api, newTransactions: CsvCreateTransaction[]): Promise<void> {
        const identifierCounts: { [identifier: string]: number } = {};
        for (let i = 0; i < newTransactions.length; i++) {
            const id = newTransactions[i].identifier;
            if (id !== null) {
                identifierCounts[id] = identifierCounts[id] === undefined ? 1 : identifierCounts[id] + 1;
            }
        }
        const result = await api.Transaction.findDuplicates(Object.keys(identifierCounts).filter(identifier => identifierCounts[identifier] === 1));
        setDuplicateIdentifiers(new Set([
            ...Object.keys(identifierCounts).filter(identifier => identifierCounts[identifier] > 1),
            ...result
        ]));
    }
}
