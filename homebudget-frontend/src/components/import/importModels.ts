import { Account } from "../../models/account";
import { TransactionLine } from "../../models/transaction";

export type AccountIdentifier = "id" | "name" | "accountNumber";

export type CsvCreateTransaction = {
    rowNumber: number;
    from: AccountReference;
    to: AccountReference;
    created: Date;
    description: string;
    identifier: string | null;
    lines: TransactionLine[];
}

export type AccountReference = {
    identifier: AccountIdentifier;
    value: string;
    account: Account | null | "fetching";
}

export function castFieldValue(value: string, identifier: AccountIdentifier) {
    if (identifier == "id") {
        return value != undefined ? Number(value) : 0;
    }
    return value;
}
export function capitalize(word: string) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}