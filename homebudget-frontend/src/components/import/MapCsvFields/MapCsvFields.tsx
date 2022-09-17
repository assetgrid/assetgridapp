import { DateTime } from "luxon";
import * as React from "react";
import { Account, CreateAccount } from "../../../models/account";
import { Card } from "../../common/Card";
import InputSelect from "../../input/InputSelect";
import InputText from "../../input/InputText";
import { AccountIdentifier, AccountReference, CsvCreateTransaction } from "../ImportModels";
import CreateAccountModal from "../../account/input/CreateAccountModal";
import { parseWithOptions, ParseOptions } from "../ParseOptions";
import { InputParseOptionsModal } from "../../input/InputParsingOptions";
import Decimal from "decimal.js";
import { Message } from "../../common/Message";
import InputButton from "../../input/InputButton";
import MapCsvFieldsIssues from "./CsvMappingIssues";
import CsvMappingIssues from "./CsvMappingIssues";
import CsvMappingTransactionTable from "./CsvMappingTransactionTable";

type DuplicateHandlingOptions = "none" | "identifier" | "rownumber" | "identifier-rownumber";
export type CsvMappingTableFilter = "all" | "reference-to-missing-account" | "no-account" | "same-account" | "duplicate" | "error";

interface Props {
    data: any[];
    transactions: CsvCreateTransaction[] | null;
    accountsBy: { [key: string]: { [value: string]: Account | "fetching" | null } };
    duplicateIdentifiers: Set<string> | "fetching";
    options: MappingOptions;
    onChange: (transactions: CsvCreateTransaction[], options: MappingOptions) => void;
    goToNext: () => void;
    goToPrevious: () => void;
    accountCreated: (account: Account) => void;
}

export interface MappingOptions {
    // Mapping options
    duplicateHandling: DuplicateHandlingOptions;
    identifierColumn: string | null;
    identifierParseOptions: ParseOptions;

    amountColumn: string | null;
    amountParseOptions: ParseOptions;

    descriptionColumn: string | null;
    descriptionParseOptions: ParseOptions;

    sourceAccountColumn: string | null;
    sourceAccountIdentifier: AccountIdentifier;
    sourceAccountParseOptions: ParseOptions;

    destinationAccountColumn: string | null;
    destinationAccountIdentifier: AccountIdentifier;
    destinationAccountParseOptions: ParseOptions;

    dateColumn: string | null;
    dateFormat: string;
    dateParseOptions: ParseOptions;
};

function isNullOrWhitespace(input: string) {
    return !input || !input.trim();
}

/*
 * React object class
 */
export default function MapCsvFields(props: Props) {
    const [rowOffset, setRowOffset] = React.useState(0);
    const [tableDraw, setTableDraw] = React.useState(0);
    const [modal, setModal] = React.useState<React.ReactElement | null>(null);
    const [tableFilter, setTableFilter] = React.useState<CsvMappingTableFilter>("all");

    // Update transactions whenever the raw data changes
    React.useEffect(() => {
        const newTransactions = parseTransactions(props.data, props.options);
        props.onChange(newTransactions, props.options);
    }, [props.data]);

    // Redraw the table whenever the parsed transactions change
    React.useEffect(() => {
        setTableDraw(draw => draw + 1);
    }, [props.transactions]);

    return <>
        {modal !== null && modal}

        <Card title="Mapping options">
            <div className="columns">
                <div className="column">
                    <InputSelect label="Duplicate handling"
                        isFullwidth={true}
                        value={props.options.duplicateHandling}
                        onChange={result => updateDuplicateHandling(result as DuplicateHandlingOptions, props.options.identifierColumn, props.options.identifierParseOptions)}
                        items={[
                            { key: "identifier", value: "Colum" },
                            { key: "identifier-rownumber", value: "Column and count" },
                            { key: "rownumber", value: "Row number" },
                            { key: "none", value: "Allow duplicates" }
                        ]} />
                </div>
                <div className="column">
                    {["identifier", "identifier-rownumber"].indexOf(props.options.duplicateHandling) > -1 &&
                        <InputSelect label="Identifier column"
                            isFullwidth={true}
                            value={props.options.identifierColumn}
                            placeholder={"Select column"}
                            onChange={result => updateDuplicateHandling(props.options.duplicateHandling, result, props.options.identifierParseOptions)}
                            items={Object.keys(props.data[0]).map(item => {
                                return {
                                    key: item,
                                    value: item,
                                }
                            })}
                            addOnAfter={
                                props.options.identifierColumn ? <div className="control">
                                    <a className="button is-primary" onClick={() => setModal(<InputParseOptionsModal
                                            value={props.options.identifierParseOptions}
                                            previewData={props.data.map(row => getValue(row, props.options.identifierColumn))}
                                            onChange={options => updateDuplicateHandling(props.options.duplicateHandling, props.options.identifierColumn, options)}
                                            close={() => setModal(null)}
                                            closeOnChange={true}
                                        />)}>
                                        Parse Options
                                    </a>
                                </div> : undefined
                            } />
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
                        isFullwidth={true}
                        value={props.options.dateColumn}
                        placeholder={"Select column"}
                        onChange={result => updateDateMapping(result, props.options.dateFormat, props.options.dateParseOptions)}
                        items={Object.keys(props.data[0]).map(item => {
                            return {
                                key: item,
                                value: item,
                            }
                        })}
                        addOnAfter={
                            props.options.dateColumn ? <div className="control">
                                <a className="button is-primary" onClick={() => setModal(<InputParseOptionsModal
                                            value={props.options.dateParseOptions}
                                            previewData={props.data.map(row => getValue(row, props.options.dateColumn))}
                                            onChange={regex => updateDateMapping(props.options.dateColumn, props.options.dateFormat, regex)}
                                            close={() => setModal(null)}
                                            closeOnChange={true}
                                        />
                                    )}>
                                    Parse Options
                                </a>
                            </div> : undefined
                        } />
                </div>
                {props.options.dateColumn !== null && <div className="column">
                    <InputText label="Date format"
                        value={props.options.dateFormat}
                        onChange={e => updateDateMapping(props.options.dateColumn, e.target.value, props.options.dateParseOptions)}
                    />
                    <a href="https://moment.github.io/luxon/#/parsing?id=table-of-tokens" target="_blank">Read more</a>
                </div>}
            </div>

            <div className="columns">
                <div className="column">
                    <InputSelect label="Source account identifier"
                        isFullwidth={true}
                        value={props.options.sourceAccountIdentifier}
                        placeholder={"Select variable"}
                        onChange={result => updateAccountMapping("source", result as AccountIdentifier, props.options.sourceAccountColumn, props.options.sourceAccountParseOptions)}
                        items={[
                            { key: "name", value: "Name" },
                            { key: "id", value: "Id" },
                            { key: "accountNumber", value: "Account Number" },
                        ]} />
                </div>
                <div className="column">
                    <InputSelect label="Source account column"
                        isFullwidth={true}
                        value={props.options.sourceAccountColumn}
                        placeholder={"Select column"}
                        onChange={result => updateAccountMapping("source", props.options.sourceAccountIdentifier, result, props.options.sourceAccountParseOptions)}
                        items={Object.keys(props.data[0]).map(item => {
                            return {
                                key: item,
                                value: item,
                            }
                        })}
                        addOnAfter={
                            props.options.sourceAccountColumn ? <div className="control">
                                <a className="button is-primary" onClick={() => setModal(<InputParseOptionsModal
                                    value={props.options.sourceAccountParseOptions}
                                    previewData={props.data.map(row => getValue(row, props.options.sourceAccountColumn))}
                                    onChange={options => updateAccountMapping("source", props.options.sourceAccountIdentifier, props.options.sourceAccountColumn, options)}
                                    close={() => setModal(null)}
                                    closeOnChange={true}
                                />)}>
                                Parse Options
                            </a>
                        </div> : undefined
                        } />
                </div>
            </div>

            <div className="columns">
                <div className="column">
                    <InputSelect label="Destination account identifier"
                        isFullwidth={true}
                        value={props.options.destinationAccountIdentifier}
                        placeholder={"Select variable"}
                        onChange={result => updateAccountMapping("destination", result as AccountIdentifier, props.options.destinationAccountColumn, props.options.destinationAccountParseOptions)}
                        items={[
                            { key: "name", value: "Name" },
                            { key: "id", value: "Id" },
                            { key: "accountNumber", value: "Account Number" },
                        ]} />
                </div>
                <div className="column">
                    <InputSelect label="Destination account column"
                        isFullwidth={true}
                        value={props.options.destinationAccountColumn}
                        placeholder={"Select column"}
                        onChange={result => updateAccountMapping("destination", props.options.destinationAccountIdentifier, result, props.options.destinationAccountParseOptions)}
                        items={Object.keys(props.data[0]).map(item => {
                            return {
                                key: item,
                                value: item,
                            }
                        })}
                        addOnAfter={
                            props.options.destinationAccountColumn ? <div className="control">
                                <a className="button is-primary" onClick={() => setModal(<InputParseOptionsModal
                                        value={props.options.destinationAccountParseOptions}
                                        previewData={props.data.map(row => getValue(row, props.options.destinationAccountColumn))}
                                        onChange={regex => updateAccountMapping("destination", props.options.destinationAccountIdentifier, props.options.destinationAccountColumn, regex)}
                                        close={() => setModal(null)}
                                        closeOnChange={true}
                                    />)}>
                                    Parse Options
                                </a>
                            </div> : undefined
                        } />
                </div>
            </div>

            <div className="columns">
                <div className="column">
                    <InputSelect label="Amount column"
                        isFullwidth={true}
                        value={props.options.amountColumn}
                        placeholder={"Select column"}
                        onChange={result => updateAmountMapping(result, props.options.amountParseOptions)}
                        items={Object.keys(props.data[0]).map(item => {
                            return {
                                key: item,
                                value: item,
                            }
                        })}
                        addOnAfter={
                            props.options.amountColumn ? <div className="control">
                                <a className="button is-primary" onClick={() => setModal(<InputParseOptionsModal
                                    previewData={props.data.map(row => getValue(row, props.options.amountColumn))}
                                    value={props.options.amountParseOptions}
                                    onChange={options => updateAmountMapping(props.options.amountColumn, options)}
                                    close={() => setModal(null)}
                                    closeOnChange={true}
                                />)}>
                                    Parse Options
                                </a>
                            </div> : undefined
                        } />
                </div>
                <div className="column"></div>
            </div>

            <div className="columns">
                <div className="column">
                    <InputSelect label="Description column"
                        isFullwidth={true}
                        value={props.options.descriptionColumn}
                        placeholder={"Select column"}
                        onChange={result => updateDescriptionMapping(result, props.options.descriptionParseOptions)}
                        items={Object.keys(props.data[0]).map(item => {
                            return {
                                key: item,
                                value: item,
                            }
                        })}
                        addOnAfter={
                            props.options.descriptionColumn ? <div className="control">
                                    <a className="button is-primary" onClick={() => setModal(<InputParseOptionsModal
                                            value={props.options.descriptionParseOptions}
                                            previewData={props.data.map(row => getValue(row, props.options.descriptionColumn))}
                                            onChange={options => updateDescriptionMapping(props.options.descriptionColumn, options)}
                                            close={() => setModal(null)}
                                            closeOnChange={true}
                                        /> )}>
                                    Parse Options
                                </a>
                            </div> : undefined
                        } />
                </div>
                <div className="column"></div>
            </div>
        </Card>

        {props.transactions && <Card title="Import preview">
            {tableFilter !== "all" && <Message title="Filter is active" type="link">
                Some transactions are hidden!{" "}
                {tableFilter === "reference-to-missing-account" && <>Currently only transactions that reference a missing source or destination account are shown.{" "}</>}
                {tableFilter === "no-account" && <>Currently only transactions that have no source or destination account are shown.{" "}</>}
                {tableFilter === "same-account" && <>Currently only transactions that have the same source and destination account are shown.{" "}</>}
                {tableFilter === "duplicate" && <>Currently only duplicate transactions are shown.{" "}</>}
                {tableFilter === "error" && <>Currently only transactions with parsing errors are shown.{" "}</>}
                <a className="has-text-link" onClick={() => { setTableFilter("all"); setTableDraw(draw => draw + 1) }}>Show all transactions</a>
            </Message>}
            <CsvMappingTransactionTable
                transactions={props.transactions}
                accountsBy={props.accountsBy}
                duplicateIdentifiers={props.duplicateIdentifiers}
                tableFilter={tableFilter}
                tableDraw={tableDraw}
                beginCreatingAccount={beginCreatingAccount} />
        </Card>}

        {props.transactions && <Card title="Continue">
            <CsvMappingIssues
                transactions={props.transactions}
                accountsBy={props.accountsBy}
                duplicateIdentifiers={props.duplicateIdentifiers}
                setTableFilter={filter => { setTableFilter(filter); setTableDraw(draw => draw + 1) }} />
            <div className="buttons">
                <InputButton onClick={props.goToPrevious}>Back</InputButton>
                <InputButton className="is-primary" onClick={props.goToNext}>Continue</InputButton>
            </div>
        </Card>}
    </>;

    /**
     * Updates how the amount is parsed from the raw CSV data and recalculates it for all transactions
     */
    function updateAmountMapping(newValue: string | null, parseOptions: ParseOptions) {
        props.onChange([
            ...props.data.map((row, i) => ({
                ...props.transactions![i],
                amount: parseAmount(getValue(row, newValue), parseOptions)
            }))
        ], {
            ...props.options,
            amountColumn: newValue,
            amountParseOptions: parseOptions,
        });
    }

    /**
     * Updates how the description is parsed from the raw CSV data and recalculates it for all transactions
     */
    function updateDescriptionMapping(newValue: string | null, parseOptions: ParseOptions) {
        props.onChange([
            ...props.data.map((row, i) => ({
                ...props.transactions![i],
                description: parseWithOptions(getValue(row, newValue), parseOptions)
            }))
        ], {
            ...props.options,
            descriptionColumn: newValue,
            descriptionParseOptions: parseOptions,
        });
    }

    /**
     * Updates how the description is parsed from the raw CSV data and recalculates it for all transactions
     */
    function updateDateMapping(dateColumn: string | null, dateFormat: string, parseOptions: ParseOptions) {
        if (props.transactions === null) {
            return;
        }

        props.onChange([
            ...props.data.map((row, i) => {
                const dateText = parseWithOptions(dateColumn ? (row as any)[dateColumn] ?? "" : "", parseOptions);
                return {
                    ...props.transactions![i],
                    dateTime: DateTime.fromFormat(dateText, dateFormat),
                    dateText: dateText
                }
            })
        ], {
            ...props.options,
            dateColumn: dateColumn,
            dateFormat: dateFormat,
            dateParseOptions: parseOptions,
        });
    }

    /**
     * Updates how duplicates are handled from the raw CSV data and recalculates the unique identifiers for all transactions
     */
    function updateDuplicateHandling(duplicateHandling: DuplicateHandlingOptions, identifierColumn: string | null, parseOptions: ParseOptions) {
        if (props.transactions === null) {
            return;
        }

        props.onChange([
            ...props.data.map((row, i) => ({
                ...props.transactions![i],
                identifier: getIdentifier(duplicateHandling, identifierColumn, parseOptions, i, row, props.data)
            }))
        ], {
            ...props.options,
            duplicateHandling: duplicateHandling,
            identifierColumn: identifierColumn,
            identifierParseOptions: parseOptions,
        });
    }

    /**
     * Updates how an account column is parsed from the raw CSV data and recalculates it for all transactions
     */
    function updateAccountMapping(type: "source" | "destination", identifier: AccountIdentifier, column: string | null, parseOptions: ParseOptions) {
        if (props.transactions === null) return;

        let newTransactions: CsvCreateTransaction[];
        if (type == "source") {
            newTransactions = [
                ...props.data.map((row, i) => ({
                    ...props.transactions![i],
                    source: column === null || isNullOrWhitespace(row[column]) ? null : {
                        identifier: identifier,
                        value: parseWithOptions(row[column], parseOptions),
                    } as AccountReference
                } as CsvCreateTransaction))
            ];
        } else {
            newTransactions = [
                ...props.data.map((row, i) => ({
                    ...props.transactions![i],
                    destination: column === null || isNullOrWhitespace(row[column]) ? null : {
                        identifier: identifier,
                        value: parseWithOptions(row[column], parseOptions),
                    } as AccountReference
                } as CsvCreateTransaction))
            ];
        }

        let newOptions = { ...props.options };
        if (type === "source") {
            newOptions.sourceAccountIdentifier = identifier;
            newOptions.sourceAccountColumn = column
            newOptions.sourceAccountParseOptions = parseOptions;
        } else {
            newOptions.destinationAccountIdentifier = identifier;
            newOptions.destinationAccountColumn = column
            newOptions.destinationAccountParseOptions = parseOptions;
        }
        props.onChange(newTransactions, newOptions);
    }

    function beginCreatingAccount(accountReference: AccountReference): void
    {
        let account: CreateAccount = {
            name: "",
            description: "",
            accountNumber: "",
            includeInNetWorth: true,
            favorite: true,
        };
        (account as any)[accountReference.identifier] = accountReference.value;
        setModal(<CreateAccountModal preset={account}
            close={() => setModal(null)}
            created={account => { props.accountCreated(account); setModal(null); }} />);
    }
}

/**
 * Gets the value of a field from the raw CSV row by the field name
 * @param row An object representing the CSV row
 * @param columnName The name of the field to get the value of
 * @returns The value of that field
 */
function getValue(row: {[key: string]: string}, columnName: string | null): string {
    return columnName ? row[columnName] : "";
}

/**
 * Creates transaction from raw CSV data
 * @param data The raw csv data to parse. Each object corresponds to a CSV row
 * @param options The options telling which CSV fields to map to which fields on the transaction
 * @returns An array of parsed transactions
 */
function parseTransactions(data: any[], options: MappingOptions): CsvCreateTransaction[] {
    return data.map((row, i) => {
        const dateText = parseWithOptions(getValue(row, options.dateColumn), options.dateParseOptions);
        return {
            rowNumber: i,
            dateText: dateText,
            dateTime: DateTime.fromFormat(dateText, options.dateFormat),
            description: parseWithOptions(getValue(row, options.descriptionColumn), options.descriptionParseOptions),
            source: isNullOrWhitespace(getValue(row, options.sourceAccountColumn)) ? null : {
                identifier: options.sourceAccountIdentifier,
                value: parseWithOptions(getValue(row, options.descriptionColumn), options.sourceAccountParseOptions),
            } as AccountReference,
            destination: isNullOrWhitespace(getValue(row, options.destinationAccountColumn)) ? null : {
                identifier: options.destinationAccountIdentifier,
                value: parseWithOptions(getValue(row, options.destinationAccountColumn), options.destinationAccountParseOptions),
            } as AccountReference,
            identifier: getIdentifier(options.duplicateHandling, options.identifierColumn, options.identifierParseOptions, i, row, data),
            amount: parseAmount(getValue(row, options.amountColumn), options.amountParseOptions),
        } as CsvCreateTransaction
    });
}

/**
 * Parses 
 * @param rawValue The raw string to be parsed
 * @param parseOptions The options with which to parse
 * @returns A decimal representation of the number or the string "invalid" if parsing failed
 */
function parseAmount(rawValue: string, parseOptions: ParseOptions): Decimal | "invalid" {
    const decimalSeparator = ",";

    function escapeRegExp(string: string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    if (rawValue === undefined || rawValue === null) {
        rawValue = "";
    }

    rawValue = parseWithOptions(rawValue, parseOptions);

    // Remove everything except numbers and the decimal separator
    rawValue = rawValue.replace(new RegExp("[^" + escapeRegExp(decimalSeparator) + "\\-\\d]", 'g'), "");
    // Change decimal separator to period
    rawValue = rawValue.replace(new RegExp(escapeRegExp(decimalSeparator), 'g'), ".");
    
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
function getIdentifier(duplicateHandling: DuplicateHandlingOptions,
    identifierColumn: string | null,
    parseOptions: ParseOptions,
    rowNumber: number,
    row: { [key: string]: string },
    data: any[]): string | null {
    
    switch (duplicateHandling)
    {
        case "none":
            return null;
        case "rownumber":
            return rowNumber.toString();
        case "identifier":
            if (identifierColumn == null) {
                return "";
            } else {
                return parseWithOptions(getValue(row, identifierColumn), parseOptions);
            }
        case "identifier-rownumber":
            if (identifierColumn == null) {
                return "";
            } else {
                const value = parseWithOptions(getValue(row, identifierColumn), parseOptions);
                let number = data
                    .map((row, index) => [row, index])
                    .filter(row => row[1] <= rowNumber && parseWithOptions(getValue(row[0], identifierColumn), parseOptions) == value)
                    .length;
                return value + "." + number;
            }
    }
}
