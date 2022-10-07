import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { Account } from "./account";
import { SearchResponse } from "./search";

export interface Transaction {
    id: number
    source: Account | null
    destination: Account | null
    dateTime: DateTime
    identifiers: string[]
    lines: TransactionLine[]
    category: string
    description: string

    total: Decimal
}

export interface CreateTransaction {
    sourceId: number | null
    destinationId: number | null
    dateTime: DateTime
    description: string
    identifiers: string[]
    category: string
    total: Decimal
    lines: TransactionLine[]
}

export interface UpdateTransaction {
    identifiers?: string[]
    sourceId?: number | null
    destinationId?: number | null
    dateTime?: DateTime
    description?: string
    category?: string
    total?: Decimal
    lines?: TransactionLine[]
}

export interface TransactionLine {
    amount: Decimal
    description: string
}

export type TransactionListResponse = {
    total: Decimal
} & SearchResponse<Transaction>;
