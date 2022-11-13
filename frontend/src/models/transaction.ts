import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { Account } from "./account";
import { deserializeMetaField, MetaFieldValue, SetMetaFieldValue } from "./meta";
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

/**
 * Converts fields from RAW json into complex javascript types
 * like decimal fields or date fields that are sent as string
 */
export function deserializeTransaction (transaction: Transaction | ModifyTransaction): Transaction {
    const { totalString, ...rest } = transaction as Transaction & { totalString: string };
    return {
        ...rest,
        dateTime: DateTime.fromISO(transaction.dateTime as any as string),
        total: new Decimal(totalString).div(new Decimal(10000)),
        lines: (transaction.lines as Array<TransactionLine & { amountString: string }>).map(({ amountString, ...line }) => ({
            ...line,
            description: line.description ?? "",
            amount: new Decimal(amountString).div(new Decimal(10000))
        })),
        metaData: (transaction.metaData?.map(deserializeMetaField) ?? null) as any
    };
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
