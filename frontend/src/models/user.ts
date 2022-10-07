import { Account } from "./account";
import { Preferences } from "./preferences";

export interface User {
    email: string
    preferences: Preferences
    favoriteAccounts: Account[]
    token: string
}
