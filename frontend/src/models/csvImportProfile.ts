export type DuplicateHandlingOptions = "none" | "identifier" | "automatic";
export type AccountIdentifier = "select" | "id" | "name" | "accountNumber";

export interface CsvImportProfile {
    // CSV options
    csvDelimiter: string
    csvNewlineCharacter: "auto" | "\n" | "\r\n" | "\r"
    csvParseHeader: boolean
    csvTextEncoding: string | null
    csvSkipLines: number

    // Mapping options
    duplicateHandling: DuplicateHandlingOptions
    identifierColumn: string | null
    identifierParseOptions: ParseOptions

    debitAmountColumn: string | null
    debitAmountParseOptions: ParseOptions
    separateCreditDebitColumns: boolean
    creditAmountColumn: string | null
    creditAmountParseOptions: ParseOptions
    decimalSeparator: string

    descriptionColumn: string | null
    descriptionParseOptions: ParseOptions

    categoryColumn: string | null
    categoryParseOptions: ParseOptions

    sourceAccountColumn: string | null
    sourceAccountId: number | null
    sourceAccountType: "column" | "single"
    sourceAccountParseOptions: ParseOptions

    destinationAccountColumn: string | null
    destinationAccountType: "column" | "single"
    destinationAccountId: number | null
    destinationAccountParseOptions: ParseOptions

    dateColumn: string | null
    dateFormat: string
    dateParseOptions: ParseOptions
};

export interface ParseOptions {
    trimWhitespace: boolean

    regex: RegExp | null
    pattern: string
}

export function parseWithOptions (input: string, options: ParseOptions): string {
    let result = input ?? "";

    if (options.regex !== null) {
        const matches = options.regex.exec(input);
        if (matches !== null) {
            result = options.pattern;
            for (let i = 0; i < matches.length; i++) {
                result = result.replace(new RegExp(`\\{${i}\\}`, "g"), matches[i]);
            }
        } else {
            result = "";
        }
    }

    if (options.trimWhitespace) {
        result = result.trim();
    }

    return result;
}
