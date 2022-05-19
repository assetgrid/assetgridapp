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
    dateTime: DateTime;
}

export type GetMovementResponse = {
    initialBalance: Decimal;
    items: MovementItem[];
}

export enum TimeResolution {
    Daily = 0,
    Weekly = 1,
    Monthly = 2,
    Yearly = 3
}