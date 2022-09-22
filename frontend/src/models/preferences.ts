import { Account } from "./account";

export type Preferences = {
    id: number;
    decimalSeparator: string;
    decimalDigits: number;
    thousandsSeparator: string;
    dateFormat: string | null;
    dateTimeFormat: string | null;
    favoriteAccounts: Account[];
}