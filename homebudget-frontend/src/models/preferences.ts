import { Account } from "./account";

export type Preferences = {
    id: number;
    decimalSeparator: string;
    decimalDigits: number;
    thousandsSeparator: string;
    favoriteAccounts: Account[];
}