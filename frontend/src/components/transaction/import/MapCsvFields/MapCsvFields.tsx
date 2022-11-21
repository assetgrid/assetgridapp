import { DateTime } from "luxon";
import * as React from "react";
import { Account } from "../../../../models/account";
import Card from "../../../common/Card";
import InputSelect from "../../../input/InputSelect";
import InputText from "../../../input/InputText";
import { CsvCreateTransaction } from "../importModels";
import { InputParseOptionsModal } from "../../../input/InputParsingOptions";
import Decimal from "decimal.js";
import Message from "../../../common/Message";
import InputButton from "../../../input/InputButton";
import CsvMappingIssues from "./CsvMappingIssues";
import CsvMappingTransactionTable from "./CsvMappingTransactionTable";
import InputAccount from "../../../account/input/InputAccount";
import { CsvImportProfile, DuplicateHandlingOptions, ParseOptions, parseWithOptions } from "../../../../models/csvImportProfile";
import AccountSelector from "./AccountSelector";
import InputCheckbox from "../../../input/InputCheckbox";
import { Trans, useTranslation } from "react-i18next";

interface Props {
    data: any[]
    transactions: CsvCreateTransaction[] | null
    accounts: Account[]
    setAccounts: (accounts: Account[]) => void
    duplicateIdentifiers: Set<string> | "fetching"
    options: CsvImportProfile
    apiReady: boolean
    addAccount: (account: Account) => void
    onChange: (transactions: CsvCreateTransaction[], options: CsvImportProfile) => void
    goToNext: () => void
    goToPrevious: () => void
}

function isNullOrWhitespace (input: string | null | undefined): boolean {
    return (input ?? "").trim() === "";
}

/*
 * React object class
 */
export default function MapCsvFields (props: Props): React.ReactElement {
    const [tableDraw, setTableDraw] = React.useState(0);
    const [modal, setModal] = React.useState<React.ReactElement | null>(null);
    const { t } = useTranslation();

    const [tableFilterMessage, settableFilterMessage] = React.useState<string>();
    const [tableFilter, setTableFilter] = React.useState<{ filter: (transaction: CsvCreateTransaction) => boolean }>({ filter: () => true });

    // Update transactions whenever the raw data changes
    React.useEffect(() => {
        const newTransactions = parseTransactions(props.data, props.options, props.accounts);
        if (props.apiReady) {
            props.onChange(newTransactions, props.options);
        }
    }, [props.apiReady, props.data]);

    // Redraw the table whenever the parsed transactions change
    React.useEffect(() => {
        setTableDraw(draw => draw + 1);
    }, [props.transactions]);

    return <>
        {modal !== null && modal}

        <Card title={t("import.mapping_options")!} isNarrow={true}>

            <div className="content">
                <p>
                    <Trans i18nKey="import.read_more_about_import_in_documentation">
                        Read more about the CSV import tool in the Assetgrid <a href="https://assetgrid.app/reference/import/csv" target="_blank" rel="noreferrer">reference documentation</a>
                    </Trans>
                </p>
            </div>

            <div className="columns">
                <div className="column">
                    <InputSelect label={t("import.duplicate_handling")!}
                        isFullwidth={true}
                        value={props.options.duplicateHandling}
                        disabled={!props.apiReady}
                        onChange={result => updateDuplicateHandling(result as DuplicateHandlingOptions, props.options.identifierColumn, props.options.identifierParseOptions)}
                        items={[
                            { key: "automatic", value: t("import.duplicate_handling_automatic") },
                            { key: "identifier", value: t("import.unique_id_column") },
                            { key: "none", value: t("import.allow_duplicates") }
                        ]} />
                </div>
                <div className="column">
                    {["identifier", "identifier-rownumber"].includes(props.options.duplicateHandling) &&
                        <InputSelect label={t("import.identifier_column")!}
                            isFullwidth={true}
                            value={props.options.identifierColumn}
                            placeholder={t("import.select_column")!}
                            disabled={!props.apiReady}
                            onChange={result => updateDuplicateHandling(props.options.duplicateHandling, result, props.options.identifierParseOptions)}
                            items={Object.keys(props.data[0]).map(item => {
                                return {
                                    key: item,
                                    value: item
                                };
                            })}
                            addOnAfter={
                                props.options.identifierColumn !== null
                                    ? <div className="control">
                                        <button className="button is-primary"
                                            disabled={!props.apiReady}
                                            onClick={() => setModal(<InputParseOptionsModal
                                                value={props.options.identifierParseOptions}
                                                previewData={props.data.map(row => getValue(row, props.options.identifierColumn))}
                                                onChange={options => updateDuplicateHandling(props.options.duplicateHandling, props.options.identifierColumn, options)}
                                                close={() => setModal(null)}
                                                closeOnChange={true} />
                                            )}>
                                            {t("import.parse_options")}
                                        </button>
                                    </div>
                                    : undefined
                            } />
                    }
                </div>
            </div>

            <div className="content">
                <Trans i18nKey="import.duplicate_handling_info">
                    <p>Duplicates are handled by calculating an identifier for each transaction and storing this.
                        This value will be compared during import and transactions with the same identifier will be ignored</p>
                    <ul>
                        <li><b>Auto:</b> Automatically calculate an identifier based on transaction source, destination, timestamp and amount.</li>
                        <li><b>Unique ID column:</b> Use a column as a unique identifier</li>
                        <li><b>Allow duplicates:</b> No duplicate checking will occur.</li>
                    </ul>
                </Trans>
            </div>

            <div className="columns">
                <div className="column">
                    <InputSelect label={t("import.timestamp_column")!}
                        isFullwidth={true}
                        value={props.options.dateColumn}
                        placeholder={t("import.select_column")!}
                        disabled={!props.apiReady}
                        onChange={result => updateDateMapping(result, props.options.dateFormat, props.options.dateParseOptions)}
                        items={Object.keys(props.data[0]).map(item => {
                            return {
                                key: item,
                                value: item
                            };
                        })}
                        addOnAfter={
                            props.options.dateColumn !== null
                                ? <div className="control">
                                    <button className="button is-primary"
                                        disabled={!props.apiReady}
                                        onClick={() => setModal(<InputParseOptionsModal
                                            value={props.options.dateParseOptions}
                                            previewData={props.data.map(row => getValue(row, props.options.dateColumn))}
                                            onChange={regex => updateDateMapping(props.options.dateColumn, props.options.dateFormat, regex)}
                                            close={() => setModal(null)}
                                            closeOnChange={true} />
                                        )}>
                                        {t("import.parse_options")}
                                    </button>
                                </div>
                                : undefined
                        } />
                </div>
                {props.options.dateColumn !== null && <div className="column">
                    <InputText label={t("import.timestamp_format")!}
                        value={props.options.dateFormat}
                        disabled={!props.apiReady}
                        onChange={e => updateDateMapping(props.options.dateColumn, e.target.value, props.options.dateParseOptions)}
                    />
                    <a href="https://moment.github.io/luxon/#/parsing?id=table-of-tokens" target="_blank" rel="noreferrer">{t("common.read_more")!}</a>
                </div>}
            </div>

            <div className="columns">
                <div className="column">
                    <InputSelect label={t("transaction.source_account")!}
                        isFullwidth={true}
                        value={props.options.sourceAccountType}
                        placeholder={t("transaction.source_account")!}
                        disabled={!props.apiReady}
                        onChange={result => updateAccountMapping("source",
                            result,
                            props.options.sourceAccountColumn,
                            props.accounts.find(x => x.id === props.options.sourceAccountId) ?? null,
                            props.options.sourceAccountParseOptions)}
                        items={[
                            { key: "column", value: t("import.csv_column") },
                            { key: "single", value: t("import.same_account_all_transactions") }
                        ]} />
                </div>
                <div className="column">
                    {props.options.sourceAccountType === "single"
                        ? <InputAccount label={t("common.select_account")!}
                            allowNull={true}
                            allowCreateNewAccount={true}
                            disabled={!props.apiReady}
                            nullSelectedText={t("common.no_account")!}
                            value={props.options.sourceAccountId}
                            onChange={result => updateAccountMapping("source", props.options.sourceAccountType, null, result, props.options.sourceAccountParseOptions)}/>
                        : <InputSelect label={t("import.source_account_column")!}
                            isFullwidth={true}
                            value={props.options.sourceAccountColumn}
                            placeholder={t("import.select_column")!}
                            disabled={!props.apiReady}
                            onChange={result => updateAccountMapping("source", props.options.sourceAccountType, result, null, props.options.sourceAccountParseOptions)}
                            items={[
                                { key: "___NULL___", value: t("import.no_source_account") },
                                ...Object.keys(props.data[0]).map(item => ({
                                    key: item,
                                    value: item
                                }))
                            ]}
                            addOnAfter={
                                props.options.sourceAccountColumn !== null
                                    ? <div className="control">
                                        <button className="button is-primary"
                                            disabled={!props.apiReady}
                                            onClick={() => setModal(<InputParseOptionsModal
                                                value={props.options.sourceAccountParseOptions}
                                                previewData={props.data.map(row => getValue(row, props.options.sourceAccountColumn))}
                                                onChange={options => updateAccountMapping("source", props.options.sourceAccountType, props.options.sourceAccountColumn, null, options)}
                                                close={() => setModal(null)}
                                                closeOnChange={true} />
                                            )}>
                                            {t("import.parse_options")}
                                        </button>
                                    </div>
                                    : undefined
                            } /> }
                </div>
            </div>

            <div className="columns">
                <div className="column">
                    <InputSelect label={t("transaction.destination_account")!}
                        isFullwidth={true}
                        value={props.options.destinationAccountType}
                        placeholder={t("import.destination_account")!}
                        disabled={!props.apiReady}
                        onChange={result => updateAccountMapping("destination",
                            result,
                            props.options.destinationAccountColumn,
                            props.accounts.find(x => x.id === props.options.destinationAccountId) ?? null,
                            props.options.destinationAccountParseOptions)}
                        items={[
                            { key: "column", value: t("import.csv_column") },
                            { key: "single", value: t("import.same_account_all_transactions") }
                        ]} />
                </div>
                <div className="column">
                    {props.options.destinationAccountType === "single"
                        ? <InputAccount label={t("common.select_account")!}
                            allowNull={true}
                            allowCreateNewAccount={true}
                            disabled={!props.apiReady}
                            nullSelectedText={t("common.no_account")!}
                            value={props.options.destinationAccountId}
                            onChange={result => updateAccountMapping("destination", props.options.destinationAccountType, null, result, props.options.destinationAccountParseOptions)} />
                        : <InputSelect label={t("import.destination_account_column")!}
                            isFullwidth={true}
                            value={props.options.destinationAccountColumn}
                            placeholder={t("import.select_column")!}
                            disabled={!props.apiReady}
                            onChange={result => updateAccountMapping("destination", props.options.destinationAccountType, result, null, props.options.destinationAccountParseOptions)}
                            items={[
                                { key: "___NULL___", value: t("import.no_destination_account") },
                                ...Object.keys(props.data[0]).map(item => ({
                                    key: item,
                                    value: item
                                }))
                            ]}
                            addOnAfter={
                                props.options.destinationAccountColumn !== null
                                    ? <div className="control">
                                        <button className="button is-primary"
                                            disabled={!props.apiReady}
                                            onClick={() => setModal(<InputParseOptionsModal
                                                value={props.options.destinationAccountParseOptions}
                                                previewData={props.data.map(row => getValue(row, props.options.destinationAccountColumn))}
                                                onChange={options => updateAccountMapping("destination", props.options.destinationAccountType, props.options.destinationAccountColumn, null, options)}
                                                close={() => setModal(null)}
                                                closeOnChange={true} />
                                            )}>
                                            {t("import.parse_options")}
                                        </button>
                                    </div>
                                    : undefined
                            } />}
                </div>
            </div>

            <div className="columns">
                <div className="column">
                    <InputSelect label={props.options.separateCreditDebitColumns ? t("import.debit_amount_column")! : t("import.amount_column")!}
                        isFullwidth={true}
                        value={props.options.debitAmountColumn}
                        placeholder={t("import.select_column")!}
                        disabled={!props.apiReady}
                        onChange={result => updateAmountMapping(result,
                            props.options.debitAmountParseOptions,
                            props.options.creditAmountColumn,
                            props.options.creditAmountParseOptions,
                            props.options.separateCreditDebitColumns,
                            props.options.decimalSeparator)}
                        items={Object.keys(props.data[0]).map(item => {
                            return {
                                key: item,
                                value: item
                            };
                        })}
                        addOnAfter={
                            props.options.debitAmountColumn !== null
                                ? <div className="control">
                                    <button className="button is-primary"
                                        disabled={!props.apiReady}
                                        onClick={() => setModal(<InputParseOptionsModal
                                            previewData={props.data.map(row => getValue(row, props.options.debitAmountColumn))}
                                            value={props.options.debitAmountParseOptions}
                                            onChange={options => updateAmountMapping(props.options.debitAmountColumn,
                                                options,
                                                props.options.creditAmountColumn,
                                                props.options.creditAmountParseOptions,
                                                props.options.separateCreditDebitColumns,
                                                props.options.decimalSeparator)}
                                            close={() => setModal(null)}
                                            closeOnChange={true} />
                                        )}>
                                        {t("import.parse_options")}
                                    </button>
                                </div>
                                : undefined
                        } />
                </div>
                <div className="column">
                    {props.options.debitAmountColumn !== null &&
                        <InputText label={t("import.decimal_separator")!}
                            value={props.options.decimalSeparator}
                            disabled={!props.apiReady}
                            onChange={e => updateAmountMapping(props.options.debitAmountColumn,
                                props.options.debitAmountParseOptions,
                                props.options.creditAmountColumn,
                                props.options.creditAmountParseOptions,
                                props.options.separateCreditDebitColumns,
                                e.target.value)}
                        />}
                </div>
            </div>

            {props.options.separateCreditDebitColumns && <div className="columns">
                <div className="column">
                    <InputSelect label={t("import.credit_amount_column")!}
                        isFullwidth={true}
                        value={props.options.creditAmountColumn}
                        placeholder={t("import.select_column")!}
                        disabled={!props.apiReady}
                        onChange={result => updateAmountMapping(props.options.debitAmountColumn,
                            props.options.debitAmountParseOptions,
                            result,
                            props.options.creditAmountParseOptions,
                            props.options.separateCreditDebitColumns,
                            props.options.decimalSeparator)}
                        items={Object.keys(props.data[0]).map(item => {
                            return {
                                key: item,
                                value: item
                            };
                        })}
                        addOnAfter={
                            props.options.debitAmountColumn !== null
                                ? <div className="control">
                                    <button className="button is-primary"
                                        disabled={!props.apiReady}
                                        onClick={() => setModal(<InputParseOptionsModal
                                            previewData={props.data.map(row => getValue(row, props.options.debitAmountColumn))}
                                            value={props.options.debitAmountParseOptions}
                                            onChange={options => updateAmountMapping(props.options.debitAmountColumn,
                                                props.options.debitAmountParseOptions,
                                                props.options.creditAmountColumn,
                                                options,
                                                props.options.separateCreditDebitColumns,
                                                props.options.decimalSeparator)}
                                            close={() => setModal(null)}
                                            closeOnChange={true} />
                                        )}>
                                        {t("import.parse_options")!}
                                    </button>
                                </div>
                                : undefined
                        } />
                </div>
                <div className="column"></div>
            </div>}

            <InputCheckbox label={t("import.separate_debit_credit_columns")!}
                disabled={!props.apiReady}
                value={props.options.separateCreditDebitColumns}
                onChange={e => updateAmountMapping(props.options.debitAmountColumn,
                    props.options.debitAmountParseOptions,
                    props.options.creditAmountColumn,
                    props.options.creditAmountParseOptions,
                    e.target.checked,
                    props.options.decimalSeparator)} />

            <div className="columns">
                <div className="column">
                    <InputSelect label={t("import.description_column")!}
                        isFullwidth={true}
                        value={props.options.descriptionColumn}
                        placeholder={t("import.select_column")!}
                        disabled={!props.apiReady}
                        onChange={result => updateDescriptionMapping(result, props.options.descriptionParseOptions)}
                        items={[{ key: "___NULL___", value: t("common.no_description")! },
                            ...Object.keys(props.data[0]).map(item => ({
                                key: item,
                                value: item
                            }))
                        ]}
                        addOnAfter={
                            props.options.descriptionColumn !== null
                                ? <div className="control">
                                    <button className="button is-primary"
                                        disabled={!props.apiReady}
                                        onClick={() => setModal(<InputParseOptionsModal
                                            value={props.options.descriptionParseOptions}
                                            previewData={props.data.map(row => getValue(row, props.options.descriptionColumn))}
                                            onChange={options => updateDescriptionMapping(props.options.descriptionColumn, options)}
                                            close={() => setModal(null)}
                                            closeOnChange={true} />
                                        )}>
                                        {t("import.parse_options")!}
                                    </button>
                                </div>
                                : undefined
                        } />
                </div>
                <div className="column"></div>
            </div>

            <div className="columns">
                <div className="column">
                    <InputSelect label={t("import.category_column")!}
                        isFullwidth={true}
                        value={props.options.categoryColumn}
                        placeholder={t("import.select_column")!}
                        disabled={!props.apiReady}
                        onChange={result => updateCategoryMapping(result, props.options.categoryParseOptions)}
                        items={[
                            { key: "___NULL___", value: t("common.no_category") },
                            ...Object.keys(props.data[0]).map(item => ({
                                key: item,
                                value: item
                            })
                            )]}
                        addOnAfter={
                            props.options.categoryColumn !== null
                                ? <div className="control">
                                    <button className="button is-primary"
                                        disabled={!props.apiReady}
                                        onClick={() => setModal(<InputParseOptionsModal
                                            value={props.options.descriptionParseOptions}
                                            previewData={props.data.map(row => getValue(row, props.options.categoryColumn))}
                                            onChange={options => updateCategoryMapping(props.options.categoryColumn, options)}
                                            close={() => setModal(null)}
                                            closeOnChange={true}
                                        />)}>
                                        {t("import.parse_options")!}
                                    </button>
                                </div>
                                : undefined
                        } />
                </div>
                <div className="column"></div>
            </div>
        </Card>

        {(props.options.sourceAccountType === "column" || props.options.destinationAccountType === "column") &&
            <AccountSelector
                accounts={props.accounts}
                options={props.options}
                setTableFilter={(message, filter) => { settableFilterMessage(message); setTableFilter({ filter }); setTableDraw(draw => draw + 1); }}
                setAccounts={props.setAccounts}
                transactions={props.transactions ?? []} />}

        {(props.transactions != null) && <Card title={t("import.import_preview")!} isNarrow={false}>
            {tableFilterMessage !== undefined && <Message title="Filter is active" type="link">
                {t("import.some_transactions_hidden")} {tableFilterMessage}{" "}
                <a className="has-text-link" onClick={() => {
                    setTableFilter({ filter: () => true });
                    settableFilterMessage(undefined);
                    setTableDraw(draw => draw + 1);
                }}>{t("common.show_all_transactions")}</a>
            </Message>}
            <CsvMappingTransactionTable
                transactions={props.transactions}
                options={props.options}
                duplicateIdentifiers={props.duplicateIdentifiers}
                tableFilter={tableFilter.filter}
                tableDraw={tableDraw} />
        </Card>}

        {(props.transactions != null) && <Card title={t("common.continue")!} isNarrow={true}>
            <CsvMappingIssues
                transactions={props.transactions}
                duplicateIdentifiers={props.duplicateIdentifiers}
                setTableFilter={(message, filter) => { settableFilterMessage(message); setTableFilter({ filter }); setTableDraw(draw => draw + 1); }} />
            <div className="buttons">
                <InputButton onClick={props.goToPrevious}>{t("common.back")}</InputButton>
                <InputButton className="is-primary" onClick={props.goToNext}>{t("common.continue")}</InputButton>
            </div>
        </Card>}
    </>;

    /**
     * Updates how the amount is parsed from the raw CSV data and recalculates it for all transactions
     */
    function updateAmountMapping (
        debitColumn: string | null,
        debitParseOptions: ParseOptions,
        creditColumn: string | null,
        creditParseOptions: ParseOptions,
        separateCreditDebitColumns: boolean,
        decimalSeparator: string): void {
        props.onChange(updateAutoIdentifiers([
            ...props.data.map((row, i) => {
                const amount = getAmount(row, debitColumn, debitParseOptions, creditColumn, creditParseOptions, separateCreditDebitColumns, decimalSeparator);
                return {
                    ...props.transactions![i],
                    amountText: amount.text,
                    amount: amount.value
                };
            })
        ], props.options), {
            ...props.options,
            debitAmountColumn: debitColumn,
            debitAmountParseOptions: debitParseOptions,
            creditAmountColumn: creditColumn,
            creditAmountParseOptions: creditParseOptions,
            separateCreditDebitColumns,
            decimalSeparator
        });
    }

    /**
     * Updates how the description is parsed from the raw CSV data and recalculates it for all transactions
     */
    function updateDescriptionMapping (newValue: string | null, parseOptions: ParseOptions): void {
        if (newValue === "___NULL___") {
            newValue = null;
        }

        props.onChange([
            ...props.data.map((row, i) => ({
                ...props.transactions![i],
                description: parseWithOptions(getValue(row, newValue), parseOptions)
            }))
        ], {
            ...props.options,
            descriptionColumn: newValue,
            descriptionParseOptions: parseOptions
        });
    }

    /**
     * Updates how the category is parsed from the raw CSV data and recalculates it for all transactions
     */
    function updateCategoryMapping (newValue: string | null, parseOptions: ParseOptions): void {
        if (newValue === "___NULL___") {
            newValue = null;
        }

        props.onChange([
            ...props.data.map((row, i) => ({
                ...props.transactions![i],
                category: parseWithOptions(getValue(row, newValue), parseOptions)
            }))
        ], {
            ...props.options,
            categoryColumn: newValue,
            categoryParseOptions: parseOptions
        });
    }

    /**
     * Updates how the description is parsed from the raw CSV data and recalculates it for all transactions
     */
    function updateDateMapping (dateColumn: string | null, dateFormat: string, parseOptions: ParseOptions): void {
        if (props.transactions === null) {
            return;
        }

        props.onChange(updateAutoIdentifiers([
            ...props.data.map((row, i) => {
                const dateText = parseWithOptions(dateColumn !== null ? (row)[dateColumn] ?? "" : "", parseOptions);
                return {
                    ...props.transactions![i],
                    dateTime: DateTime.fromFormat(dateText, dateFormat),
                    dateText
                };
            })
        ], props.options), {
            ...props.options,
            dateColumn,
            dateFormat,
            dateParseOptions: parseOptions
        });
    }

    /**
     * Updates how duplicates are handled from the raw CSV data and recalculates the unique identifiers for all transactions
     */
    function updateDuplicateHandling (duplicateHandling: DuplicateHandlingOptions, identifierColumn: string | null, parseOptions: ParseOptions): void {
        if (props.transactions === null) {
            return;
        }

        const newOptions = {
            ...props.options,
            duplicateHandling,
            identifierColumn,
            identifierParseOptions: parseOptions
        };

        props.onChange(
            updateAutoIdentifiers([
                ...props.data.map((row, i) => ({
                    ...props.transactions![i],
                    identifier: getIdentifier(duplicateHandling, identifierColumn, parseOptions, row)
                }))
            ], newOptions),
            newOptions);
    }

    /**
     * Updates how an account column is parsed from the raw CSV data and recalculates it for all transactions
     */
    function updateAccountMapping (
        type: "source" | "destination",
        accountType: "column" | "single",
        column: string | null,
        value: Account | null,
        parseOptions: ParseOptions): void {
        if (props.transactions === null) return;

        if (accountType === "single") {
            column = null;
            if (value !== null && !props.accounts.some(account => account.id === value!.id)) {
                props.addAccount(value);
            }
        } else {
            value = null;
        }

        if (column === "___NULL___") {
            column = null;
        }

        let newTransactions: CsvCreateTransaction[];
        if (type === "source") {
            newTransactions = [
                ...props.data.map((row, i) => ({
                    ...props.transactions![i],
                    source: getAccount(row),
                    sourceText: accountType === "single" ? "" : parseWithOptions(getValue(row, column), parseOptions)
                }))
            ];
        } else {
            newTransactions = [
                ...props.data.map((row, i) => ({
                    ...props.transactions![i],
                    destination: getAccount(row),
                    destinationText: accountType === "single" ? "" : parseWithOptions(getValue(row, column), parseOptions)
                }))
            ];
        }

        const newOptions = { ...props.options };
        if (type === "source") {
            newOptions.sourceAccountType = accountType;
            newOptions.sourceAccountColumn = column;
            newOptions.sourceAccountId = value?.id ?? null;
            newOptions.sourceAccountParseOptions = parseOptions;
        } else {
            newOptions.destinationAccountType = accountType;
            newOptions.destinationAccountColumn = column;
            newOptions.destinationAccountId = value?.id ?? null;
            newOptions.destinationAccountParseOptions = parseOptions;
        }
        props.onChange(updateAutoIdentifiers(newTransactions, newOptions), newOptions);

        function getAccount (row: { [key: string]: string }): Account | null {
            if (accountType === "single") {
                return value;
            } else {
                if (column === null || isNullOrWhitespace(getValue(row, column))) {
                    return null;
                } else {
                    const identifier = parseWithOptions(getValue(row, column), parseOptions);
                    return props.accounts.find(account => account.identifiers.includes(identifier)) ?? null;
                }
            }
        }
    }
}

/**
 * Updates automatic identifiers for all transactions, but only if identifier is set to automatic
 */
export function updateAutoIdentifiers (transactions: CsvCreateTransaction[], options: CsvImportProfile): CsvCreateTransaction[] {
    if (options.duplicateHandling !== "automatic") return transactions;

    const counts: { [key: string]: number } = {};
    return transactions.map(t => {
        let identifier = getAutoIdentifier(t);

        if (identifier === null) {
            return { ...t, identifier };
        }

        if (counts[identifier] === undefined) counts[identifier] = 0;
        counts[identifier] += 1;

        identifier = `${identifier}|${counts[identifier]}`;

        return { ...t, identifier };
    });
}

/**
 * Calculates an automatic identifier for the transaction
 * @param transaction The transaction to calculate an identifier for
 * @returns A unique identifier
 */
function getAutoIdentifier (transaction: CsvCreateTransaction): string | null {
    if (transaction.amount === "invalid" || !transaction.dateTime.isValid) {
        return null;
    }

    if (transaction.amount.greaterThanOrEqualTo(0)) {
        return formatAccount(transaction.source) + "→" + formatAccount(transaction.destination) +
            "|" + transaction.dateTime.toISO({ suppressMilliseconds: true, includeOffset: false, includePrefix: false }) +
            "|" + transaction.amount.toDecimalPlaces(4).toString();
    } else {
        return formatAccount(transaction.destination) + "→" + formatAccount(transaction.source) +
            "|" + transaction.dateTime.toISO({ suppressMilliseconds: true, includeOffset: false, includePrefix: false }) +
            "|" + transaction.amount.neg().toDecimalPlaces(4).toString();
    }

    function formatAccount (account: Account | null): string {
        switch (account) {
            case null:
                return ".";
            default:
                return account.id.toString();
        }
    }
}

/**
 * Gets the value of a field from the raw CSV row by the field name
 * @param row An object representing the CSV row
 * @param columnName The name of the field to get the value of
 * @returns The value of that field
 */
function getValue (row: { [key: string]: string }, columnName: string | null): string {
    return columnName !== null ? row[columnName] : "";
}

/**
 * Creates transaction from raw CSV data
 * @param data The raw csv data to parse. Each object corresponds to a CSV row
 * @param options The options telling which CSV fields to map to which fields on the transaction
 * @returns An array of parsed transactions
 */
function parseTransactions (data: any[], options: CsvImportProfile, accounts: Account[]): CsvCreateTransaction[] {
    const result = data.map((row, i): CsvCreateTransaction => {
        const dateText = parseWithOptions(getValue(row, options.dateColumn), options.dateParseOptions);
        const sourceText = options.sourceAccountType === "column"
            ? parseWithOptions(getValue(row, options.sourceAccountColumn), options.sourceAccountParseOptions)
            : "";
        const destinationText = options.destinationAccountType === "column"
            ? parseWithOptions(getValue(row, options.destinationAccountColumn), options.destinationAccountParseOptions)
            : "";
        const amount = getAmount(row,
            options.debitAmountColumn,
            options.debitAmountParseOptions,
            options.creditAmountColumn,
            options.creditAmountParseOptions,
            options.separateCreditDebitColumns,
            options.decimalSeparator);

        return {
            rowNumber: i,
            dateText,
            dateTime: DateTime.fromFormat(dateText, options.dateFormat),
            description: parseWithOptions(getValue(row, options.descriptionColumn), options.descriptionParseOptions),
            category: parseWithOptions(getValue(row, options.categoryColumn), options.categoryParseOptions),
            sourceText,
            source: accounts.find(account => options.sourceAccountType === "single"
                ? account.id === options.sourceAccountId
                : account.identifiers.some(x => x === sourceText)
            ) ?? null,
            destinationText,
            destination: accounts.find(account => options.destinationAccountType === "single"
                ? account.id === options.destinationAccountId
                : account.identifiers.some(x => x === destinationText)
            ) ?? null,
            identifier: getIdentifier(options.duplicateHandling, options.identifierColumn, options.identifierParseOptions, row),
            amountText: amount.text,
            amount: amount.value
        };
    });

    return updateAutoIdentifiers(result, options);
}

function getAmount (row: { [key: string]: string },
    debitAmountColumn: string | null,
    debitAmountParseOptions: ParseOptions,
    creditAmountColumn: string | null,
    creditAmountParseOptions: ParseOptions,
    separateCreditDebitColumns: boolean,
    decimalSeparator: string): { text: string, value: Decimal | "invalid" } {
    const debitValue = parseWithOptions(getValue(row, debitAmountColumn), debitAmountParseOptions);
    const debitAmount = parseAmount(debitValue, decimalSeparator, debitAmountParseOptions);
    const creditValue = parseWithOptions(getValue(row, creditAmountColumn), creditAmountParseOptions);
    const creditAmount = parseAmount(creditValue, decimalSeparator, creditAmountParseOptions);

    if (separateCreditDebitColumns) {
        if (debitValue.trim() === "" || debitAmount === "invalid") {
            return {
                text: creditValue,
                value: creditAmount === "invalid" ? "invalid" : creditAmount.times(-1)
            };
        }
        return {
            text: debitValue,
            value: debitAmount
        };
    } else {
        return {
            text: debitValue,
            value: debitAmount
        };
    }
}

/**
 * Parses
 * @param rawValue The raw string to be parsed
 * @param parseOptions The options with which to parse
 * @returns A decimal representation of the number or the string "invalid" if parsing failed
 */
function parseAmount (rawValue: string, decimalSeparator: string, parseOptions: ParseOptions): Decimal | "invalid" {
    function escapeRegExp (string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
    }

    if (rawValue === undefined || rawValue === null) {
        rawValue = "";
    }

    rawValue = parseWithOptions(rawValue, parseOptions);

    // Remove everything except numbers and the decimal separator
    rawValue = rawValue.replace(new RegExp("[^" + escapeRegExp(decimalSeparator) + "\\-\\d]", "g"), "");
    // Change decimal separator to period
    rawValue = rawValue.replace(new RegExp(escapeRegExp(decimalSeparator), "g"), ".");

    let result: Decimal | "invalid" = "invalid";
    try {
        result = new Decimal(rawValue);
    } catch (error) {
        result = "invalid";
    }
    return result;
}

/**
 * Gets the unique identifier value for a transaction
 * @param duplicateHandling The options for duplicate handling
 * @param identifierColumn The name of the column in the raw CSV
 * @param parseOptions The options by which to parse the name column
 * @param rowNumber The number of the row to calculate the identifier for
 * @param row Raw CSV row
 * @param data Raw CSV data set
 * @returns The unique identifier for the transaction described by the function parameters
 */
function getIdentifier (duplicateHandling: DuplicateHandlingOptions,
    identifierColumn: string | null,
    parseOptions: ParseOptions,
    row: { [key: string]: string }): string | null {
    switch (duplicateHandling) {
        case "none":
            return null;
        case "identifier":
            if (identifierColumn == null) {
                return "";
            } else {
                return parseWithOptions(getValue(row, identifierColumn), parseOptions);
            }
        case "automatic":
            return "";
    }
}
