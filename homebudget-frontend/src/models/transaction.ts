import { Account } from "./account";

export type Transaction = {
    id: number;
    from: Account;
    to: Account;
    created: Date;
    identifier: string;
    lines: TransactionLine[];
    description: string;
}

export type TransactionLine = {
    amount: number;
    description: string;
}