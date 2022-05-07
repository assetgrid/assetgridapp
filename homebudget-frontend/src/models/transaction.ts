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

export type CreateTransaction = {
    fromId: number;
    toId: number;
    created: Date;
    description: string;
    identifier: string | null;
    lines: TransactionLine[];
}

export type TransactionLine = {
    amount: number;
    description: string;
}