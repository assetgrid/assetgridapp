import { DateTime } from "luxon";
import { Account } from "../../models/account";
import { TransactionLine } from "../../models/transaction";

export type AccountIdentifier = "id" | "name" | "accountNumber";

export type CsvCreateTransaction = {
    rowNumber: number;
    source: AccountReference | null;
    destination: AccountReference | null;
    dateText: string;
    dateTime: DateTime;
    description: string;
    identifier: string | null;
    amount: number;
}

export type AccountReference = {
    identifier: AccountIdentifier;
    value: string;
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