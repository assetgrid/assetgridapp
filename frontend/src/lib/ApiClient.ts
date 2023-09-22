import axios, { AxiosError } from "axios";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { Account as AccountModel, CategorySummaryItem, CreateAccount, GetMovementAllResponse, GetMovementResponse, MovementItem, TimeResolution } from "../models/account";
import { Preferences as PreferencesModel } from "../models/preferences";
import { User as UserModel } from "../models/user";
import { SearchGroup, SearchRequest, SearchResponse } from "../models/search";
import { Transaction as TransactionModel, ModifyTransaction, TransactionListResponse, TransactionLine, deserializeTransaction } from "../models/transaction";
import * as React from "react";
import { BadRequest, Forbid, ForbidResult, NotFound, NotFoundResult, Ok, UnauthorizedResult } from "../models/api";
import { CsvImportProfile } from "../models/csvImportProfile";
import { serializeTransactionAutomation, TransactionAutomation, TransactionAutomationSummary } from "../models/automation/transactionAutomation";
import { CreateMetaField, MetaField, serializeSetMetaFieldValue } from "../models/meta";
import { useQuery } from "@tanstack/react-query";

let rootUrl = "http://localhost:5262";
if (process.env.NODE_ENV === "production") {
    rootUrl = "";
}

DateTime.prototype.toJSON = function () {
    return this.toISO({ includeOffset: false });
};

/**
 * Get the currently signed in user
 */
export async function getUser (): Promise<UserModel> {
    const token = localStorage.getItem("token");
    return await new Promise<UserModel>((resolve, reject) => {
        if (token === null) {
            reject(UnauthorizedResult);
            return;
        }

        axios.get<UserModel>(rootUrl + "/api/v1/user", {
            headers: { authorization: "Bearer: " + token }
        }).then(result => {
            resolve({ ...result.data, token });
        }).catch((e: AxiosError) => {
            if (e.response?.status === 401) {
                reject(UnauthorizedResult);
                return;
            }
            console.log(e);
            reject(e);
        });
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
    updatePreferences: async function (preferences: PreferencesModel): Promise<PreferencesModel> {
        return await new Promise<PreferencesModel>((resolve, reject) => {
            axios.put<PreferencesModel>(rootUrl + "/api/v1/user/preferences", preferences, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve(result.data);
            }).catch((e: AxiosError) => {
                if (e.response?.status === 400) {
                    reject(e.response.data);
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
    get: async function (id: number): Promise<AccountModel | null> {
        return await new Promise<AccountModel | null>((resolve, reject) => {
            axios.get<AccountModel>(`${rootUrl}/api/v1/account/${Number(id)}`, {
                headers: { authorization: "Bearer: " + token }
            })
                .then(result => {
                    const data = result.data as AccountModel & { balanceString?: string };
                    data.balance = new Decimal(data.balanceString!).div(new Decimal(10000));
                    delete data.balanceString;
                    resolve(result.data);
                })
                .catch((e: AxiosError) => {
                    switch (e.response?.status) {
                        case 400:
                            reject(e.response.data);
                            break;
                        case 404:
                            resolve(null);
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
    update: async function (id: number, updatedAccount: CreateAccount): Promise<AccountModel> {
        return await new Promise<AccountModel>((resolve, reject) => {
            axios.put<AccountModel>(`${rootUrl}/api/v1/account/${Number(id)}`, { ...updatedAccount, balance: 0 }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve(result.data);
            }).catch((e: AxiosError) => {
                switch (e.response?.status) {
                    case 400:
                        reject(e.response.data);
                        break;
                    case 403:
                        reject(ForbidResult);
                        break;
                    case 404:
                        reject(NotFoundResult);
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
    getCategorySummary: async function (accountId: number, query: SearchGroup): Promise<CategorySummaryItem[]> {
        return await new Promise<CategorySummaryItem[]>((resolve, reject) => {
            axios.post<CategorySummaryItem[]>(`${rootUrl}/api/v1/account/${accountId}/categorysummary`, query, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve(result.data.map(obj => ({
                category: obj.category,
                transfer: obj.transfer,
                revenue: new Decimal(obj.revenue).div(new Decimal(10000)),
                expenses: new Decimal(obj.expenses).div(new Decimal(10000))
            })))).catch((error: AxiosError) => {
                if (error.response?.status === 404) {
                    reject(NotFoundResult);
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
    getMovements: async function (accountId: number, from: DateTime, to: DateTime, resolution: TimeResolution): Promise<GetMovementResponse> {
        return await new Promise<GetMovementResponse>((resolve, reject) => {
            axios.post<GetMovementResponse>(`${rootUrl}/api/v1/account/${accountId}/movements`, {
                from,
                to,
                resolution
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({
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
            })).catch((error: AxiosError) => {
                if (error.response?.status === 404) {
                    reject(NotFoundResult);
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
    get: async function (id: number): Promise<TransactionModel | null> {
        return await new Promise<TransactionModel | null>((resolve, reject) => {
            axios.get<TransactionModel>(`${rootUrl}/api/v1/transaction/${Number(id)}`, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve(deserializeTransaction(result.data));
            }).catch((e: AxiosError) => {
                if (e.response?.status === 404) {
                    resolve(null);
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
                lines: transaction.lines.map(line => ({
                    ...line,
                    amount: undefined,
                    amountString: line.amount.mul(new Decimal(10000)).round().toString()
                })),
                metaData: model.metaData?.map(serializeSetMetaFieldValue)
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve({ status: 200, data: deserializeTransaction(result.data) });
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
                succeeded: result.data.succeeded.map(t => deserializeTransaction(t) as any as TransactionModel),
                failed: result.data.failed.map(t => deserializeTransaction(t) as any as ModifyTransaction),
                duplicate: result.data.duplicate.map(t => deserializeTransaction(t) as any as ModifyTransaction)
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
                })),
                metaData: model.metaData?.map(serializeSetMetaFieldValue)
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({ status: 200, data: deserializeTransaction(result.data) }))
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
                data: query,
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
            axios.post<SearchResponse<TransactionModel>>(`${rootUrl}/api/v1/transaction/search`, query, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({ ...result.data, data: result.data.data.map(t => deserializeTransaction(t)) }))
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const Meta = (token: string) => ({
    /**
     * Get all meta fields that the current user has access to
     */
    list: async function (): Promise<MetaField[]> {
        return await new Promise<MetaField[]>((resolve, reject) => {
            axios.get(`${rootUrl}/api/v1/meta`, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve(result.data);
            }).catch(error => {
                console.log(error);
                reject(error);
            });
        });
    },

    /**
     * Create a new meta field
     * @param model The meta field to create
     */
    create: async function (model: CreateMetaField): Promise<Ok<MetaField> | BadRequest> {
        return await new Promise<Ok<MetaField> | BadRequest>((resolve, reject) => {
            axios.post(`${rootUrl}/api/v1/meta`, model, {
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
     * Delete a meta field
     * @param id The id of the meta field to delete
     */
    delete: async function (id: number): Promise<Ok<undefined> | NotFound | Forbid> {
        return await new Promise<Ok<undefined> | NotFound | Forbid>((resolve, reject) => {
            axios.delete(`${rootUrl}/api/v1/meta/${id}`, {
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
    },

    /**
     * Uploads an attachment
     * @param id The id of the meta field to fill
     * @param type The type of object the meta field is associated to
     * @param objectId The id of the object to associate the attachment to
     * @param file The file to upload
     */
    uploadAttachment: async function (id: number, type: "transaction", objectId: number, file: File): Promise<Ok<{ name: string }> | NotFound> {
        const formData = new FormData();
        formData.append("file", file);
        return await new Promise<Ok<{ name: string }> | NotFound>((resolve, reject) => {
            axios.post<{ name: string }>(`${rootUrl}/api/v1/meta/${id}/${type}/attachment/${objectId}`, formData, {
                headers: {
                    authorization: "Bearer: " + token
                }
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
     * Creates a form and submits it to download the specified attachment
     * @param id The id of the meta field to download
     * @param type The type of object the meta field is associated to
     * @param objectId The id of the object with the attachment
     */
    openAttachment: function (id: string, type: "transaction"): void {
        const form = document.createElement("form");
        form.method = "post";
        form.target = "_blank";
        form.action = `${rootUrl}/api/v1/meta/${type}/attachment/`;
        form.innerHTML = `<input type="hidden" name="jwtToken" value="${token}"/>
                          <input type="hidden" name="attachmentId" value="${id}"/>`;

        console.log("form:", form);

        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }
});

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
            }).catch(e => {
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
    Automation: Automation(token),
    Meta: Meta(token)
});
export default ApiClient;

export function useApi (): Api {
    const { data: user } = useQuery({ queryKey: ["user"], queryFn: getUser, keepPreviousData: true });
    return React.useMemo(() => {
        if (user === undefined) {
            return ApiClient(localStorage.getItem("token") ?? "");
        } else {
            return ApiClient(user.token);
        }
    }, [user === undefined ? "fetching" : user.token]);
}

export type Api = ReturnType<typeof ApiClient>;
