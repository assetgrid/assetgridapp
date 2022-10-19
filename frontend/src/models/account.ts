import Decimal from "decimal.js";
import { DateTime } from "luxon";

export interface Account {
    id: number
    name: string
    description: string
    favorite: boolean
    identifiers: string[]
    balance?: Decimal
    includeInNetWorth: boolean
}

export interface CreateAccount {
    name: string
    description: string
    identifiers: string[]
    includeInNetWorth: boolean
    favorite: boolean
}

export interface MovementItem {
    revenue: Decimal
    transferRevenue: Decimal
    expenses: Decimal
    transferExpenses: Decimal
    dateTime: DateTime
}

export interface CategorySummaryItem {
    revenue: Decimal
    expenses: Decimal
    transfer: boolean
    category: string
}

export interface GetMovementResponse {
    initialBalance: Decimal
    items: MovementItem[]
}

export interface GetMovementAllResponse {
    accounts: Account[]
    items: { [accountId: number]: GetMovementResponse }
}

export enum TimeResolution {
    Daily = 0,
    Weekly = 1,
    Monthly = 2,
    Yearly = 3
}
