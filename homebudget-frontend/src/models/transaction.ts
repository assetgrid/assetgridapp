import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { Account } from "./account";
import { SearchRequest, SearchResponse } from "./search";

export type Transaction = {
    id: number;
    source: Account;
    destination: Account;
    dateTime: DateTime;
    identifier: string;
    lines: TransactionLine[];
    description: string;

    total: Decimal;
}

export type CreateTransaction = {
    sourceId: number;
    destinationId: number;
    dateTime: DateTime;
    description: string;
    identifier: string | null;
    lines: TransactionLine[];
}

export type UpdateTransaction = {
    id: number;
    sourceId?: number;
    destinationId?: number;
    dateTime?: DateTime;
    description?: string;
}

export type TransactionLine = {
    amount: Decimal;
    description: string;
}

export type TransactionListResponse = {
    total: Decimal;
} & SearchResponse<Transaction>