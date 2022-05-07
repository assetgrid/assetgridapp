export type Account = {
    id: number;
    name: string;
    description: string;
    accountNumber: string;
}

export type CreateAccount = {
    name: string;
    description: string;
    accountNumber: string;
}