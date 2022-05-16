import Decimal from "decimal.js";
import { DateTime } from "luxon";

export type Account = {
    id: number;
    name: string;
    description: string;
    favorite: boolean;
    accountNumber: string;
    balance?: Decimal;
}

export type CreateAccount = {
    name: string;
    description: string;
    accountNumber: string;
}

export type MovementItem = {
    revenue: Decimal;
    expenses: Decimal;
    datetime: DateTime;
}

export type GetMovementResponse = {
    initialBalance: Decimal;
    items: MovementItem[];
}

export enum TimeResolution {
    Daily = 1,
    Weekly = 2,
    Monthly = 3,
    Yearly = 4
}