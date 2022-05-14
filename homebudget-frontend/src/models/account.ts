import Decimal from "decimal.js";

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