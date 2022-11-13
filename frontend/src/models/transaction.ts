import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { Account } from "./account";
import { MetaFieldValue, SetMetaFieldValue } from "./meta";
import { SearchResponse } from "./search";

export interface Transaction {
    id: number
    source: Account | null
    destination: Account | null
    dateTime: DateTime
    identifiers: string[]
    lines: TransactionLine[]
    isSplit: boolean
    description: string

    total: Decimal
    metaData: MetaFieldValue[]
}

export interface ModifyTransaction {
    sourceId: number | null
    destinationId: number | null
    dateTime: DateTime
    description: string
    identifiers: string[]
    total: Decimal
    lines: TransactionLine[]
    isSplit: boolean
    metaData: SetMetaFieldValue[] | null
}

export interface TransactionLine {
    amount: Decimal
    description: string
    category: string
}

export function serializeTransactionLine (line: TransactionLine): TransactionLine {
    const { amount, ...rest } = line;
    return {
        ...rest,
        amountString: amount.times(10000).toString()
    } as any;
}

export type TransactionListResponse = {
    total: Decimal
} & SearchResponse<Transaction>;
