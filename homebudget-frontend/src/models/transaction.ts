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
    category: string;
    description: string;

    total: Decimal;
}

export type CreateTransaction = {
    sourceId: number | null;
    destinationId: number | null;
    dateTime: DateTime;
    description: string;
    identifier: string | null;
    category: string;
    total?: Decimal;
    lines: TransactionLine[];
}

export type UpdateTransaction = {
    id: number;
    sourceId?: number;
    destinationId?: number;
    dateTime?: DateTime;
    description?: string;
    category?: string;
    total: Decimal;
    lines?: TransactionLine[];
}

export type TransactionLine = {
    amount: Decimal;
    description: string;
}

export type TransactionListResponse = {
    total: Decimal;
} & SearchResponse<Transaction>