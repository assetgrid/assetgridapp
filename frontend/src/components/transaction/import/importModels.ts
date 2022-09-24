import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { Account } from "../../../models/account";
import { TransactionLine } from "../../../models/transaction";

export type AccountIdentifier = "select" | "id" | "name" | "accountNumber";

export type CsvCreateTransaction = {
    rowNumber: number;

    sourceText: string;
    source: AccountReference | null;

    destinationText: string;
    destination: AccountReference | null;

    dateText: string;
    dateTime: DateTime;

    descriptionText: string;
    description: string;

    categoryText: string;
    category: string;

    identifierText: string;
    identifier: string | null;

    amountText: string;
    amount: Decimal | "invalid";
}

export type AccountReference = ({
    identifier: "id";
    value: number;
} | {
    identifier: "name" | "accountNumber";
    value: string;
});

export function castFieldValue(value: string, identifier: AccountIdentifier) {
    if (identifier == "id") {
        return value != undefined ? Number(value) : 0;
    }
    return value;
}
export function capitalize(word: string) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}