import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { Account } from "../../../models/account";
import { SetMetaFieldValue } from "../../../models/meta";

export interface CsvCreateTransaction {
    rowNumber: number
    description: string
    category: string
    identifier: string | null

    sourceText: string
    source: Account | null
    destinationText: string
    destination: Account | null

    dateText: string
    dateTime: DateTime

    amountText: string
    amount: Decimal | "invalid"

    metaFields: CsvCreateTransactionMetaValue[]
}

export type CsvCreateTransactionMetaValue = SetMetaFieldValue & {
    sourceText: string
};
