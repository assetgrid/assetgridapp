import axios, { AxiosError } from "axios";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { Account as AccountModel, CategorySummaryItem, CreateAccount, GetMovementAllResponse, GetMovementResponse, MovementItem, TimeResolution } from "../models/account";
import { Preferences as PreferencesModel } from "../models/preferences";
import { User as UserModel } from "../models/user";
import { SearchGroup, SearchRequest, SearchResponse, serializeTransactionQuery } from "../models/search";
import { Transaction as TransactionModel, ModifyTransaction, TransactionListResponse, TransactionLine } from "../models/transaction";
import { useContext } from "react";
import { userContext } from "../components/App";
import * as React from "react";
import { BadRequest, Forbid, ForbidResult, NotFound, NotFoundResult, Ok, Unauthorized, UnauthorizedResult } from "../models/api";
import { CsvImportProfile } from "../models/csvImportProfile";
import { serializeTransactionAutomation, TransactionAutomation, TransactionAutomationSummary } from "../models/automation/transactionAutomation";

let rootUrl = "https://localhost:7262";
if (process.env.NODE_ENV === "production") {
    rootUrl = "";
}

/**
 * Get the currently signed in user
 */
export async function getUser (): Promise<Ok<UserModel> | Unauthorized> {
    const token = localStorage.getItem("token");
    return await new Promise<Ok<UserModel> | Unauthorized>((resolve, reject) => {
        if (token === null) {
            resolve(UnauthorizedResult);
        } else {
            axios.get<UserModel>(rootUrl + "/api/v1/user", {
                headers: { authorization: "Bearer: " + token }
            })
                .then(result => {
                    resolve({ status: 200, data: { ...result.data, token } });
                }).catch((e: AxiosError) => {
                    if (e.response?.status === 401) {
                        resolve(UnauthorizedResult);
                        return;
                    }
                    console.log(e);
                    reject(e);
                });
        }
    });
}

/**
 * Sign in to new user
 */
export async function authenticate (email: string, password: string): Promise<Ok<UserModel> | BadRequest> {
    return await new Promise<Ok<UserModel> | BadRequest>((resolve, reject) => {
        axios.post<UserModel>(rootUrl + "/api/v1/user/authenticate", {
            email,
            password
        }).then(result => {
            localStorage.setItem("token", result.data.token);
            resolve({ status: 200, data: result.data });
        }).catch(e => {
            if (e.response?.status === 400) {
                resolve(e.response.data as BadRequest);
                return;
            }
            console.log(e);
            reject(e);
        });
    });
}

/**
 * Sign up new user
 */
export async function signup (email: string, password: string): Promise<Ok<UserModel> | BadRequest> {
    return await new Promise<Ok<UserModel> | BadRequest>((resolve, reject) => {
        axios.post<UserModel>(rootUrl + "/api/v1/user/createinitial", {
            email,
            password
        }).then(result => {
            localStorage.setItem("token", result.data.token);
            resolve({ status: 200, data: result.data });
        }).catch(e => {
            if (e.response?.status === 400) {
                resolve(e.response.data as BadRequest);
                return;
            }
            console.log(e);
            reject(e);
        });
    });
}

/**
 * Returns whether any users exist in this installation
 */
export async function anyUsers (): Promise<Ok<boolean>> {
    return await new Promise<Ok<boolean>>((resolve, reject) => {
        axios.get<boolean>(rootUrl + "/api/v1/user/any").then(result => resolve({ status: 200, data: result.data }))
            .catch(e => {
                console.log(e);
                reject(e);
            });
    });
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const User = (token: string) => ({
    /**
     * Update preferences for the current user
     * @param preferences New preferences
     * @returns Updated preferences
     */
    updatePreferences: async function (preferences: PreferencesModel): Promise<Ok<PreferencesModel> | BadRequest> {
        return await new Promise<Ok<PreferencesModel> | BadRequest>((resolve, reject) => {
            axios.put<PreferencesModel>(rootUrl + "/api/v1/user/preferences", preferences, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve({ status: 200, data: result.data });
            }).catch((e: AxiosError) => {
                if (e.response?.status === 400) {
                    resolve(e.response.data as BadRequest);
                    return;
                }
                console.log(e);
                reject(e);
            });
        });
    },

    /**
     * Change the password for the current user
     * @param oldPassword The password currently used to sign in
     * @param newPassword The desired new password
     */
    changePassword: async function (oldPassword: string, newPassword: string): Promise<Ok<null> | BadRequest> {
        return await new Promise<Ok<null> | BadRequest>((resolve, reject) => {
            axios.put(rootUrl + "/api/v1/user/password", {
                oldPassword,
                newPassword
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve({ status: 200, data: null });
            }).catch(e => {
                if (e.response?.status === 400) {
                    resolve(e.response.data as BadRequest);
                    return;
                }
                console.log(e);
                reject(e);
            });
        });
    },

    /**
     * Delete the current user
     */
    delete: async function (): Promise<Ok<null>> {
        return await new Promise<Ok<null>>((resolve, reject) => {
            axios.delete(rootUrl + "/api/v1/user/delete", {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve({ status: 200, data: null });
            }).catch(e => {
                console.log(e);
                reject(e);
            });
        });
    },

    /**
     * Gets the names of the available CSV import profiles for the current user
     */
    getCsvImportProfiles: async function (): Promise<Ok<string[]>> {
        return await new Promise<Ok<string[]>>((resolve, reject) => {
            axios.get<string[]>(rootUrl + "/api/v1/import/csv/profiles", {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve({ status: 200, data: result.data });
            }).catch(e => {
                console.log(e);
                reject(e);
            });
        });
    },

    /**
     * Gets a csv import profile by name
     */
    getCsvImportProfile: async function (name: string): Promise<Ok<CsvImportProfile>> {
        return await new Promise<Ok<CsvImportProfile>>((resolve, reject) => {
            axios.get<CsvImportProfile>(rootUrl + "/api/v1/import/csv/profile/" + encodeURIComponent(name), {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve({
                    status: 200,
                    data: {
                        ...result.data,
                        debitAmountParseOptions: { ...result.data.debitAmountParseOptions, regex: fixRegex(result.data.debitAmountParseOptions.regex) },
                        creditAmountParseOptions: { ...result.data.creditAmountParseOptions, regex: fixRegex(result.data.creditAmountParseOptions.regex) },
                        categoryParseOptions: { ...result.data.categoryParseOptions, regex: fixRegex(result.data.categoryParseOptions.regex) },
                        dateParseOptions: { ...result.data.dateParseOptions, regex: fixRegex(result.data.dateParseOptions.regex) },
                        descriptionParseOptions: { ...result.data.descriptionParseOptions, regex: fixRegex(result.data.descriptionParseOptions.regex) },
                        destinationAccountParseOptions: { ...result.data.destinationAccountParseOptions, regex: fixRegex(result.data.destinationAccountParseOptions.regex) },
                        sourceAccountParseOptions: { ...result.data.sourceAccountParseOptions, regex: fixRegex(result.data.sourceAccountParseOptions.regex) },
                        identifierParseOptions: { ...result.data.identifierParseOptions, regex: fixRegex(result.data.identifierParseOptions.regex) }
                    }
                });

                function fixRegex (regex: RegExp | null): RegExp | null {
                    if (regex === null) return null;
                    return new RegExp(regex);
                }
            }).catch(e => {
                console.log(e);
                reject(e);
            });
        });
    },

    /**
     * Gets a csv import profile by name
     */
    updateCsvImportProfile: async function (name: string, profile: CsvImportProfile): Promise<Ok<string[]>> {
        return await new Promise<Ok<string[]>>((resolve, reject) => {
            axios.put<string[]>(rootUrl + "/api/v1/import/csv/profile/" + encodeURIComponent(name), {
                ...profile,
                sourceAccount: profile.sourceAccountId ?? null,
                destinationAccount: profile.destinationAccountId ?? null,

                debitAmountParseOptions: { ...profile.debitAmountParseOptions, regex: profile.debitAmountParseOptions.regex?.source },
                creditAmountParseOptions: { ...profile.creditAmountParseOptions, regex: profile.creditAmountParseOptions.regex?.source },
                categoryParseOptions: { ...profile.categoryParseOptions, regex: profile.categoryParseOptions.regex?.source },
                dateParseOptions: { ...profile.dateParseOptions, regex: profile.dateParseOptions.regex?.source },
                descriptionParseOptions: { ...profile.descriptionParseOptions, regex: profile.descriptionParseOptions.regex?.source },
                destinationAccountParseOptions: { ...profile.destinationAccountParseOptions, regex: profile.destinationAccountParseOptions.regex?.source },
                sourceAccountParseOptions: { ...profile.sourceAccountParseOptions, regex: profile.sourceAccountParseOptions.regex?.source },
                identifierParseOptions: { ...profile.identifierParseOptions, regex: profile.identifierParseOptions.regex?.source }
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve({ status: 200, data: result.data });
            }).catch(e => {
                console.log(e);
                reject(e);
            });
        });
    }
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const Account = (token: string) => ({
    /**
     * Search for accounts
     * @param request Search request specifying which accounts to return
     * @returns A response object with the accounts matching the query
     */
    search: async function (request: SearchRequest): Promise<Ok<SearchResponse<AccountModel>>> {
        return await new Promise<Ok<SearchResponse<AccountModel>>>((resolve, reject) => {
            axios.post<SearchResponse<AccountModel>>(rootUrl + "/api/v1/account/search", request, {
                headers: { authorization: "Bearer: " + token }
            })
                .then(result => {
                    resolve({ status: 200, data: result.data });
                })
                .catch(e => {
                    console.log(e);
                    reject(e);
                });
        });
    },

    /**
     * Get a single account
     * @param id Account id
     * @returns The account with the specified id
     */
    get: async function (id: number): Promise<Ok<AccountModel> | NotFound | BadRequest> {
        return await new Promise<Ok<AccountModel> | NotFound | BadRequest>((resolve, reject) => {
            axios.get<AccountModel>(`${rootUrl}/api/v1/account/${Number(id)}`, {
                headers: { authorization: "Bearer: " + token }
            })
                .then(result => {
                    const data = result.data as AccountModel & { balanceString?: string };
                    data.balance = new Decimal(data.balanceString!).div(new Decimal(10000));
                    delete data.balanceString;
                    resolve({ status: 200, data: result.data });
                })
                .catch((e: AxiosError) => {
                    switch (e.response?.status) {
                        case 400:
                            resolve(e.response.data as BadRequest);
                            break;
                        case 404:
                            resolve(NotFoundResult);
                            break;
                    }
                    console.log(e);
                    reject(e);
                });
        });
    },

    /**
     * Update an existing account
     * @param id The id of the account
     * @param account The new account
     * @returns The updated account
     */
    update: async function (id: number, updatedAccount: CreateAccount): Promise<Ok<AccountModel> | NotFound | Forbid | BadRequest> {
        return await new Promise<Ok<AccountModel> | NotFound | Forbid | BadRequest>((resolve, reject) => {
            axios.put<AccountModel>(`${rootUrl}/api/v1/account/${Number(id)}`, updatedAccount, {
                headers: { authorization: "Bearer: " + token }
            })
                .then(result => {
                    resolve({ status: 200, data: result.data });
                })
                .catch((e: AxiosError) => {
                    switch (e.response?.status) {
                        case 400:
                            resolve(e.response.data as BadRequest);
                            break;
                        case 403:
                            resolve(ForbidResult);
                            break;
                        case 404:
                            resolve(NotFoundResult);
                            break;
                    }
                    console.log(e);
                    reject(e);
                });
        });
    },

    /**
     * Create a new account
     * @param account The account to be created
     * @returns The newly created account
     */
    create: async function (account: CreateAccount): Promise<Ok<AccountModel> | BadRequest> {
        return await new Promise<Ok<AccountModel> | BadRequest>((resolve, reject) => {
            axios.post<AccountModel>(rootUrl + "/api/v1/account", account, {
                headers: { authorization: "Bearer: " + token }
            })
                .then(result => {
                    resolve({ status: 200, data: result.data });
                })
                .catch((e: AxiosError) => {
                    if (e.response?.status === 400) {
                        resolve(e.response.data as BadRequest);
                        return;
                    }
                    console.log(e);
                    reject(e);
                });
        });
    },

    /**
     * Deletes an Account
     * @param id The id of the account to delete
     */
    delete: async function (id: number): Promise<Ok<null> | Forbid | NotFound> {
        return await new Promise<Ok<null> | Forbid | NotFound>((resolve, reject) => {
            axios.delete(`${rootUrl}/api/v1/account/${id}`, {
                headers: { authorization: "Bearer: " + token }
            })
                .then(() => resolve({ status: 200, data: null }))
                .catch((e: AxiosError) => {
                    if (e.response?.status === 403) {
                        resolve(ForbidResult);
                        return;
                    } else if (e.response?.status === 404) {
                        resolve(NotFoundResult);
                        return;
                    }
                    console.log(e);
                    reject(e);
                });
        });
    },

    /**
     * List transactions for the specified account
     * @param id Account id
     * @param from Return transactions numbered from...to
     * @param to Return transactions numbered from...to
     * @param descending Whether to return newest transactions first
     * @returns An object with information about the transaction for this account
     */
    listTransactions: async function (id: number, from: number, to: number, descending: boolean, query?: SearchGroup): Promise<Ok<TransactionListResponse> | NotFound> {
        return await new Promise<Ok<TransactionListResponse> | NotFound>((resolve, reject) => {
            axios.post<TransactionListResponse>(`${rootUrl}/api/v1/account/${id}/transactions`, {
                from,
                to,
                descending,
                query
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({
                status: 200,
                data: {
                    ...result.data,
                    total: new Decimal((result.data as any).totalString).div(new Decimal(10000)),
                    data: (result.data.data as Array<TransactionModel & { totalString: string }>).map(({ totalString, ...transaction }) => ({
                        ...transaction,
                        total: new Decimal(totalString).div(new Decimal(10000)),
                        dateTime: DateTime.fromISO(transaction.dateTime as any as string),
                        lines: (transaction.lines as Array<TransactionLine & { amountString: string }>).map(({ amountString, ...line }) => ({
                            ...line,
                            amount: new Decimal(amountString).div(new Decimal(10000))
                        }))
                    }))
                }
            })).catch((e: AxiosError) => {
                switch (e.response?.status) {
                    case 404:
                        resolve(NotFoundResult);
                        break;
                    default:
                        console.log(e);
                        reject(e);
                }
            });
        });
    },

    /**
     * Counts transactions matching a query for the specified account
     * @param id Account id
     * @param query Query to filter transactions
     * @returns The transaction count
     */
    countTransactions: async function (id: number, query?: SearchGroup): Promise<Ok<number> | NotFound> {
        return await new Promise<Ok<number> | NotFound>((resolve, reject) => {
            axios.post<number>(`${rootUrl}/api/v1/account/${id}/counttransactions`, query, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({ status: 200, data: result.data }))
                .catch((error: AxiosError) => {
                    if (error.response?.status === 404) {
                        resolve(NotFoundResult);
                        return;
                    }
                    console.log(error);
                    reject(error);
                });
        });
    },

    /**
     * Get summary of expenses and revenues stratified on categories
     * @param accountId The account
     * @param query A query to subset the transactions to include in the summary
     * @returns A dictionary with the category as the key and the revenue and expenses the value in a tuple in that order
     */
    getCategorySummary: async function (accountId: number, query: SearchGroup): Promise<Ok<CategorySummaryItem[]> | NotFound> {
        return await new Promise<Ok<CategorySummaryItem[]> | NotFound>((resolve, reject) => {
            axios.post<CategorySummaryItem[]>(`${rootUrl}/api/v1/account/${accountId}/categorysummary`, query, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({
                status: 200,
                data: result.data.map(obj => ({
                    category: obj.category,
                    transfer: obj.transfer,
                    revenue: new Decimal(obj.revenue).div(new Decimal(10000)),
                    expenses: new Decimal(obj.expenses).div(new Decimal(10000))
                }))
            })).catch((error: AxiosError) => {
                if (error.response?.status === 404) {
                    resolve(NotFoundResult);
                    return;
                }
                console.log(error);
                reject(error);
            });
        });
    },

    /**
     * Calculate development in account balance, revenue and expenses over time
     * @param accountId The account
     * @param from Start of period
     * @param to End of period
     * @param resolution The time resolution at which to aggregate the results
     * @returns An object containing information about account movements
     */
    getMovements: async function (accountId: number, from: DateTime, to: DateTime, resolution: TimeResolution): Promise<Ok<GetMovementResponse> | NotFound> {
        return await new Promise<Ok<GetMovementResponse> | NotFound>((resolve, reject) => {
            axios.post<GetMovementResponse>(`${rootUrl}/api/v1/account/${accountId}/movements`, {
                from,
                to,
                resolution
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({
                status: 200,
                data: {
                    ...result.data,
                    initialBalance: new Decimal((result.data as any).initialBalanceString).div(new Decimal(10000)),
                    items: (result.data.items as Array<MovementItem & { revenueString: string, expensesString: string, transferRevenueString: string, transferExpensesString: string }>)
                        .map(({ revenueString, expensesString, transferExpensesString, transferRevenueString, ...item }) => ({
                            ...item,
                            dateTime: DateTime.fromISO(item.dateTime as any as string),
                            revenue: new Decimal(revenueString).div(new Decimal(10000)),
                            transferRevenue: new Decimal(transferRevenueString).div(new Decimal(10000)),
                            expenses: new Decimal(expensesString).div(new Decimal(10000)),
                            transferExpenses: new Decimal(transferExpensesString).div(new Decimal(10000))
                        }))
                }
            })).catch((error: AxiosError) => {
                if (error.response?.status === 404) {
                    resolve(NotFoundResult);
                    return;
                }
                console.log(error);
                reject(error);
            });
        });
    },

    /**
     * Calculate development in account balance, revenue and expenses over time
     * @param from Start of period
     * @param to End of period
     * @param resolution The time resolution at which to aggregate the results
     * @returns An object containing information about account movements
     */
    getMovementsAll: async function (from: DateTime, to: DateTime, resolution: TimeResolution): Promise<Ok<GetMovementAllResponse> | NotFound> {
        return await new Promise<Ok<GetMovementAllResponse> | NotFound>((resolve, reject) => {
            axios.post<GetMovementAllResponse>(`${rootUrl}/api/v1/account/movements`, {
                from,
                to,
                resolution
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                Object.keys(result.data.items).forEach(key => {
                    const accountId = Number(key);
                    const item = result.data.items[accountId];
                    item.initialBalance = new Decimal((item as any).initialBalanceString).div(new Decimal(10000));
                    item.items = (item.items as Array<MovementItem & { revenueString: string, expensesString: string, transferRevenueString: string, transferExpensesString: string }>)
                        .map(({ revenueString, expensesString, transferExpensesString, transferRevenueString, ...item }) => ({
                            ...item,
                            dateTime: DateTime.fromISO(item.dateTime as any as string),
                            revenue: new Decimal(revenueString).div(new Decimal(10000)),
                            transferRevenue: new Decimal(transferRevenueString).div(new Decimal(10000)),
                            expenses: new Decimal(expensesString).div(new Decimal(10000)),
                            transferExpenses: new Decimal(transferExpensesString).div(new Decimal(10000))
                        }));
                });
                resolve({ status: 200, data: result.data });
            }).catch((error: AxiosError) => {
                if (error.response?.status === 404) {
                    resolve(NotFoundResult);
                    return;
                }
                console.log(error);
                reject(error);
            });
        });
    }
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const Transaction = (token: string) => ({
    /**
     * Get a single transaction
     * @param id Transaction id
     * @returns The transaction with the specified id
     */
    get: async function (id: number): Promise<Ok<TransactionModel> | NotFound> {
        return await new Promise<Ok<TransactionModel> | NotFound>((resolve, reject) => {
            axios.get<TransactionModel>(`${rootUrl}/api/v1/transaction/${Number(id)}`, {
                headers: { authorization: "Bearer: " + token }
            })
                .then(result => {
                    resolve({ status: 200, data: fixTransaction(result.data) });
                })
                .catch((e: AxiosError) => {
                    if (e.response?.status === 404) {
                        resolve(NotFoundResult);
                    } else {
                        console.log(e);
                        reject(e);
                    }
                });
        });
    },

    /**
     * Create a new transaction
     * @param transaction The transaction to be created
     * @returns The newly created transaction
     */
    create: async function (transaction: ModifyTransaction): Promise<Ok<TransactionModel> | BadRequest | Forbid> {
        return await new Promise<Ok<TransactionModel> | BadRequest | Forbid>((resolve, reject) => {
            const { total, ...model } = transaction;
            axios.post<TransactionModel>(`${rootUrl}/api/v1/transaction`, {
                ...model,
                totalString: total.mul(new Decimal(10000)).round().toString(),
                dateTime: DateTime.fromISO(transaction.dateTime as any as string),
                lines: transaction.lines.map(line => ({ ...line, amount: undefined, amountString: line.amount.mul(new Decimal(10000)).round().toString() }))
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve({ status: 200, data: fixTransaction(result.data) });
            }).catch((e: AxiosError) => {
                if (e.response?.status === 400) {
                    resolve(e.response.data as BadRequest);
                } else if (e.response?.status === 403) {
                    resolve(ForbidResult);
                } else {
                    console.log(e);
                    reject(e);
                }
            });
        });
    },

    /**
     * Create multiple transactions using a single request
     * @param transactions The transactions to be created
     * @returns An object containing information about transactions successfully created, those with errors and those with duplicate identifiers
     */
    createMany: async function (transactions: ModifyTransaction[]): Promise<{ succeeded: TransactionModel[], failed: ModifyTransaction[], duplicate: ModifyTransaction[] }> {
        return await new Promise<{ succeeded: TransactionModel[], failed: ModifyTransaction[], duplicate: ModifyTransaction[] }>((resolve, reject) => {
            axios.post<{ succeeded: ModifyTransaction[], failed: ModifyTransaction[], duplicate: ModifyTransaction[] }>(`${rootUrl}/api/v1/transaction/createmany`,
                transactions.map(transaction => ({
                    ...transaction,
                    total: undefined,
                    totalString: transaction.total.mul(new Decimal(10000)).round().toString(),
                    lines: transaction.lines.map(line => ({ ...line, amount: undefined, amountString: line.amount.mul(new Decimal(10000)).round().toString() }))
                })), {
                    headers: { authorization: "Bearer: " + token }
                }).then(result => resolve({
                succeeded: result.data.succeeded.map(t => fixTransaction(t) as any as TransactionModel),
                failed: result.data.failed.map(t => fixTransaction(t) as any as ModifyTransaction),
                duplicate: result.data.duplicate.map(t => fixTransaction(t) as any as ModifyTransaction)
            }))
                .catch(e => {
                    console.log(e);
                    reject(e);
                });
        });
    },

    /**
     * Updates a transaction
     * @param id The id of the transaction to update
     * @param transaction The changes to make
     * @returns The updated transaction
     */
    update: async function (id: number, transaction: ModifyTransaction): Promise<Ok<TransactionModel> | NotFound | Forbid | BadRequest> {
        return await new Promise<Ok<TransactionModel> | NotFound | Forbid | BadRequest>((resolve, reject) => {
            const { total, ...model } = transaction;
            axios.put<TransactionModel>(`${rootUrl}/api/v1/transaction/${id}`, {
                ...model,
                totalString: transaction.total.mul(new Decimal(10000)).round().toString(),
                lines: transaction.lines.map(line => ({
                    ...line,
                    amountString: line.amount.mul(new Decimal(10000)).round().toString(),
                    amount: undefined
                }))
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({ status: 200, data: fixTransaction(result.data) }))
                .catch((e: AxiosError) => {
                    switch (e.response?.status) {
                        case 404:
                            resolve(NotFoundResult);
                            break;
                        case 403:
                            resolve(ForbidResult);
                            break;
                        case 400:
                            resolve(e.response.data as BadRequest);
                            break;
                        default:
                            console.log(e);
                            reject(e);
                    }
                });
        });
    },

    /**
     * Deletes a transaction
     * @param id The id of the transaction to be deleted
     */
    delete: async function (id: number): Promise<void> {
        return await new Promise<void>((resolve, reject) => {
            axios.delete(`${rootUrl}/api/v1/transaction/${id}`, {
                headers: { authorization: "Bearer: " + token }
            }).then(() => resolve())
                .catch(e => {
                    console.log(e);
                    reject(e);
                });
        });
    },

    /**
     * Deletes all transactions matching the specified query
     * @param query A query describing which transactions to delete
     */
    deleteMultiple: async function (query: SearchGroup): Promise<void> {
        return await new Promise<void>((resolve, reject) => {
            axios.delete<TransactionModel>(`${rootUrl}/api/v1/transaction/deleteMultiple`, {
                data: serializeTransactionQuery(query),
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve())
                .catch(e => {
                    console.log(e);
                    reject(e);
                });
        });
    },

    /**
     * Check for duplicate identifiers
     * @param identifiers Identifiers to check if they are in use
     * @returns A list of identifiers that are already in use
     */
    findDuplicates: async function (identifiers: string[]): Promise<string[]> {
        return await new Promise<string[]>((resolve, reject) => {
            axios.post(`${rootUrl}/api/v1/transaction/findduplicates`, identifiers, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve(result.data))
                .catch(error => {
                    console.log(error);
                    reject(error);
                });
        });
    },

    search: async function (query: SearchRequest): Promise<SearchResponse<TransactionModel>> {
        return await new Promise<SearchResponse<TransactionModel>>((resolve, reject) => {
            const fixedQuery = query;
            if (query.query != null) {
                query.query = serializeTransactionQuery(query.query);
            }
            axios.post<SearchResponse<TransactionModel>>(`${rootUrl}/api/v1/transaction/search`, fixedQuery, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({ ...result.data, data: result.data.data.map(t => fixTransaction(t)) }))
                .catch(error => {
                    console.log(error);
                    reject(error);
                });
        });
    }
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const Automation = (token: string) => ({
    Transaction: {
        /**
         * Runs a transaction action a single time
         * @param action The action to run
         */
        runSingle: async function (action: TransactionAutomation): Promise<void> {
            return await new Promise<void>((resolve, reject) => {
                axios.post(`${rootUrl}/api/v1/automation/transaction/runSingle`, serializeTransactionAutomation(action), {
                    headers: { authorization: "Bearer: " + token }
                }).then(result => resolve(result.data))
                    .catch(error => {
                        console.log(error);
                        reject(error);
                    });
            });
        },

        /**
         * Get all transactions automations that the current user has access to
         */
        list: async function (): Promise<Ok<TransactionAutomationSummary[]>> {
            return await new Promise<Ok<TransactionAutomationSummary[]>>((resolve, reject) => {
                axios.get(`${rootUrl}/api/v1/automation/transaction`, {
                    headers: { authorization: "Bearer: " + token }
                }).then(result => {
                    resolve({ status: 200, data: result.data });
                }).catch(error => {
                    console.log(error);
                    reject(error);
                });
            });
        },

        /**
         * Get an automation byu id
         * @param id The id of the automation to get
         */
        get: async function (id: number): Promise<Ok<TransactionAutomation> | NotFound> {
            return await new Promise<Ok<TransactionAutomation> | NotFound>((resolve, reject) => {
                axios.get(`${rootUrl}/api/v1/automation/transaction/${id}`, {
                    headers: { authorization: "Bearer: " + token }
                }).then(result => resolve({ status: 200, data: result.data }))
                    .catch((error: AxiosError) => {
                        if (error.response?.status === 404) {
                            resolve(NotFoundResult);
                            return;
                        }
                        console.log(error);
                        reject(error);
                    });
            });
        },

        /**
         * Create a new transaction automation
         * @param automation The automation to create
         */
        create: async function (automation: TransactionAutomation): Promise<Ok<TransactionAutomation> | BadRequest> {
            return await new Promise<Ok<TransactionAutomation> | BadRequest>((resolve, reject) => {
                axios.post(`${rootUrl}/api/v1/automation/transaction`, serializeTransactionAutomation(automation), {
                    headers: { authorization: "Bearer: " + token }
                }).then(result => resolve({ status: 200, data: result.data }))
                    .catch((error: AxiosError) => {
                        if (error.response?.status === 400) {
                            resolve(error.response.data as BadRequest);
                            return;
                        }
                        console.log(error);
                        reject(error);
                    });
            });
        },

        /**
         * Modify an existing transaction
         * @param id The id of the automation to modify
         * @param automation The new automation
         */
        modify: async function (id: number, automation: TransactionAutomation): Promise<Ok<TransactionAutomation> | BadRequest | NotFound | Forbid> {
            return await new Promise<Ok<TransactionAutomation> | BadRequest | NotFound | Forbid>((resolve, reject) => {
                axios.put(`${rootUrl}/api/v1/automation/transaction/${id}`, serializeTransactionAutomation(automation), {
                    headers: { authorization: "Bearer: " + token }
                }).then(result => resolve({ status: 200, data: result.data }))
                    .catch((error: AxiosError) => {
                        switch (error.response?.status) {
                            case 400:
                                resolve(error.response.data as BadRequest);
                                return;
                            case 404:
                                resolve(NotFoundResult);
                                return;
                            case 403:
                                resolve(ForbidResult);
                                return;
                        }
                        console.log(error);
                        reject(error);
                    });
            });
        },

        /**
         * Delete a transaction automation
         * @param id The id of the automation to delete
         */
        delete: async function (id: number): Promise<Ok<undefined> | NotFound | Forbid> {
            return await new Promise<Ok<undefined> | NotFound | Forbid>((resolve, reject) => {
                axios.delete(`${rootUrl}/api/v1/automation/transaction/${id}`, {
                    headers: { authorization: "Bearer: " + token }
                }).then(result => resolve({ status: 200, data: undefined }))
                    .catch((error: AxiosError) => {
                        if (error.response?.status === 404) {
                            resolve(NotFoundResult);
                            return;
                        } else if (error.response?.status === 403) {
                            resolve(ForbidResult);
                            return;
                        }
                        console.log(error);
                        reject(error);
                    });
            });
        }
    }
});

/**
 * Converts fields from RAW json into complex javascript types
 * like decimal fields or date fields that are sent as string
 */
function fixTransaction (transaction: TransactionModel | ModifyTransaction): TransactionModel {
    const { totalString, ...rest } = transaction as TransactionModel & { totalString: string };
    return {
        ...rest,
        dateTime: DateTime.fromISO(transaction.dateTime as any as string),
        total: new Decimal(totalString).div(new Decimal(10000)),
        lines: (transaction.lines as Array<TransactionLine & { amountString: string }>).map(({ amountString, ...line }) => ({
            ...line,
            description: line.description ?? "",
            amount: new Decimal(amountString).div(new Decimal(10000))
        }))
    };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const Taxonomy = (token: string) => ({
    /**
     * Search for accounts
     * @param request Search request specifying which accounts to return
     * @returns A response object with the accounts matching the query
     */
    categoryAutocomplete: async function (prefix: string): Promise<string[]> {
        return await new Promise<string[]>((resolve, reject) => {
            axios.get<string[]>(rootUrl + "/api/v1/taxonomy/categoryautocomplete/" + prefix, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve(result.data);
            })
                .catch(e => {
                    console.log(e);
                    reject(e);
                });
        });
    }
});

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const ApiClient = (token: string) => ({
    User: User(token),
    Account: Account(token),
    Transaction: Transaction(token),
    Taxonomy: Taxonomy(token),
    Automation: Automation(token)
});
export default ApiClient;

export function useApi (): Api | null {
    const { user } = useContext(userContext);
    return React.useMemo(() => {
        if (user === "fetching") {
            return null;
        } else {
            return ApiClient(user.token);
        }
    }, [user === "fetching" ? "fetching" : user.token]);
}

export type Api = ReturnType<typeof ApiClient>;
