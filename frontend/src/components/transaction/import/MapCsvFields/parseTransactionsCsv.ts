import { DateTime } from "luxon";
import { Account } from "../../../../models/account";
import { CsvImportProfile, DuplicateHandlingOptions, MetaParseOptions, ParseOptions, parseWithOptions } from "../../../../models/csvImportProfile";
import { CsvCreateTransaction } from "../importModels";
import Decimal from "decimal.js";
import { FieldValueType, SetMetaFieldValue } from "../../../../models/meta";

/**
 * Creates transaction from raw CSV data
 * @param data The raw csv data to parse. Each object corresponds to a CSV row
 * @param options The options telling which CSV fields to map to which fields on the transaction
 * @returns An array of parsed transactions
 */
export function parseTransactions (data: any[], options: CsvImportProfile, accounts: Account[]): CsvCreateTransaction[] {
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
            amount: amount.value,
            metaFields: parseMetaFields(row, options.metaParseOptions ?? [])
        };
    });

    return reparseAutoIdentifiers(result, options);
}

/**
 * Gets the value of a field from the raw CSV row by the field name
 * @param row An object representing the CSV row
 * @param columnName The name of the field to get the value of
 * @returns The value of that field
 */
export function getValue (row: { [key: string]: string }, columnName: string | null): string {
    return columnName !== null ? row[columnName] : "";
}

export function getAmount (row: { [key: string]: string },
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
export function getIdentifier (duplicateHandling: DuplicateHandlingOptions,
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

function parseMetaFields (row: any, options: MetaParseOptions[]): SetMetaFieldValue[] {
    return options.map(x => ({
        metaId: x.metaId,
        type: x.type,
        value: parseMetaValue(row, x)
    }));
}

export function parseMetaValue (row: any, options: MetaParseOptions): SetMetaFieldValue["value"] {
    switch (options.type) {
        case FieldValueType.TextLine:
        case FieldValueType.TextLong:
            return parseWithOptions(getValue(row, options.column), options.parseOptions);
        default:
            throw new Error("Cannot parse field");
    }
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
 * Reparses automatic identifiers for all transactions with new options, but only if identifier is set to automatic
 */
export function reparseAutoIdentifiers (transactions: CsvCreateTransaction[], options: CsvImportProfile): CsvCreateTransaction[] {
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
