import Decimal from "decimal.js";
import { DateTime } from "luxon";

export type Account = {
    id: number;
    name: string;
    description: string;
    favorite: boolean;
    identifiers: string[];
    balance?: Decimal;
    includeInNetWorth: boolean;
}

export type CreateAccount = {
    name: string;
    description: string;
    identifiers: string[];
    includeInNetWorth: boolean;
    favorite: boolean;
}

export type MovementItem = {
    revenue: Decimal;
    expenses: Decimal;
    dateTime: DateTime;
}

export type GetMovementResponse = {
    initialBalance: Decimal;
    items: MovementItem[];
}

export type GetMovementAllResponse = {
    accounts: Account[];
    items: { [accountId: number]: GetMovementResponse };
}

export enum TimeResolution {
    Daily = 0,
    Weekly = 1,
    Monthly = 2,
    Yearly = 3
}