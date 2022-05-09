import { DateTime } from "luxon";
import { Account } from "./account";

export type Transaction = {
    id: number;
    source: Account;
    destination: Account;
    dateTime: Date;
    identifier: string;
    lines: TransactionLine[];
    description: string;
}

export type CreateTransaction = {
    sourceId: number;
    destinationId: number;
    dateTime: DateTime;
    description: string;
    identifier: string | null;
    lines: TransactionLine[];
}

export type TransactionLine = {
    amount: number;
    description: string;
}