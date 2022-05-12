export type Account = {
    id: number;
    name: string;
    description: string;
    favorite: boolean;
    accountNumber: string;
}

export type CreateAccount = {
    name: string;
    description: string;
    accountNumber: string;
}