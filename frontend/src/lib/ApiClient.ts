import axios, { AxiosError } from "axios";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { Account as AccountModel, CreateAccount, GetMovementAllResponse, GetMovementResponse, MovementItem, TimeResolution } from "../models/account";
import { Preferences as PreferencesModel } from "../models/preferences";
import { User as UserModel } from "../models/user";
import { SearchGroup, SearchGroupType, SearchOperator, SearchRequest, SearchResponse } from "../models/search";
import { Transaction as TransactionModel, CreateTransaction, TransactionListResponse, TransactionLine, UpdateTransaction, Transaction } from "../models/transaction";
import { useContext } from "react";
import { userContext } from "../components/App";
import * as React from "react";
import { BadRequest, Forbid, ForbidResult, NotFound, NotFoundResult, Ok, Unauthorized, UnauthorizedResult } from "../models/api";

let rootUrl = 'https://localhost:7262';
if (process.env.NODE_ENV === 'production') {
    rootUrl = "";
}

/**
 * Get the currently signed in user
 */
export function getUser(): Promise<Ok<UserModel> | Unauthorized> {
    const token = localStorage.getItem("token");
    return new Promise<Ok<UserModel> | Unauthorized>((resolve, reject) => {
        if (token === null) {
            resolve(UnauthorizedResult);
        } else {
            axios.get<UserModel>(rootUrl + '/api/v1/user', {
                headers: { authorization: "Bearer: " + token }
            })
            .then(result => {
                resolve({ status: 200, data: { ...result.data, token: token } });
            }).catch((e: AxiosError) => {
                if (e.response?.status == 401) {
                    resolve(UnauthorizedResult);
                    return;
                }
                console.log(e);
                reject();
            });
        }
    })
}

/**
 * Sign in to new user
 */
export function authenticate(email: string, password: string): Promise<Ok<UserModel> | BadRequest> {
    return new Promise<Ok<UserModel> | BadRequest>((resolve, reject) => {
        axios.post<UserModel>(rootUrl + '/api/v1/user/authenticate', {
                email: email,
                password: password
        }).then(result => {
            localStorage.setItem("token", result.data.token);
            resolve({ status: 200, data: result.data });
        }).catch(e => {
            if (e.response?.status == 400) {
                resolve(e.response.data as BadRequest);
                return;
            }
            console.log(e);
            reject();
        });
    })
}

/**
 * Sign up new user
 */
export function signup(email: string, password: string): Promise<Ok<UserModel> | BadRequest> {
    return new Promise<Ok<UserModel> | BadRequest>((resolve, reject) => {
        axios.post<UserModel>(rootUrl + '/api/v1/user/createinitial', {
            email: email,
            password: password
        }).then(result => {
            localStorage.setItem("token", result.data.token);
            resolve({ status: 200, data: result.data });
        }).catch(e => {
            if (e.response?.status == 400) {
                resolve(e.response.data as BadRequest);
                return;
            }
            console.log(e);
            reject();
        });
    })
}

/**
 * Returns whether any users exist in this installation
 */
export function anyUsers(): Promise<Ok<boolean>> {
    return new Promise<Ok<boolean>>((resolve, reject) => {
        axios.get<boolean>(rootUrl + '/api/v1/user/any').then(result => resolve({ status: 200, data: result.data }))
            .catch(e => {
                console.log(e);
                reject();
            });
    });
}

const User = (token: string) => ({
    /**
     * Update preferences for the current user
     * @param preferences New preferences
     * @returns Updated preferences
     */
    updatePreferences: function (preferences: PreferencesModel): Promise<Ok<PreferencesModel>> {
        return new Promise<Ok<PreferencesModel>>((resolve, reject) => {
            axios.put<PreferencesModel>(rootUrl + '/api/v1/user/preferences', preferences, {
                    headers: { authorization: "Bearer: " + token }
                }).then(result => {
                    resolve({ status: 200, data: result.data });
                }).catch(e => {
                    console.log(e);
                    reject();
                });
        })
    },

    /**
     * Change the password for the current user
     * @param oldPassword The password currently used to sign in
     * @param newPassword The desired new password
     */
    changePassword: function (oldPassword: string, newPassword: string): Promise<Ok<null> | BadRequest> {
        return new Promise<Ok<null> | BadRequest>((resolve, reject) => {
            axios.put(rootUrl + '/api/v1/user/password', {
                oldPassword: oldPassword,
                newPassword: newPassword
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve({ status: 200, data: null });
            }).catch(e => {
                if (e.response?.status == 400) {
                    resolve(e.response.data as BadRequest);
                    return;
                }
                console.log(e);
                reject();
            });
        })
    },

    /**
     * Delete the current user
     */
    delete: function (): Promise<Ok<null>> {
        return new Promise<Ok<null>>((resolve, reject) => {
            axios.post(rootUrl + '/api/v1/user/delete', undefined, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve({ status: 200, data: null });
            }).catch(e => {
                console.log(e);
                reject();
            });
        })
    }
});

const Account = (token: string) => ({
    /**
     * Search for accounts
     * @param request Search request specifying which accounts to return
     * @returns A response object with the accounts matching the query
     */
    search: function (request: SearchRequest): Promise<Ok<SearchResponse<AccountModel>>> {
        return new Promise<Ok<SearchResponse<AccountModel>>>((resolve, reject) => {
            axios.post<SearchResponse<AccountModel>>(rootUrl + "/api/v1/account/search", request, {
                    headers: { authorization: "Bearer: " + token }
                })
                .then(result => {
                    resolve({ status: 200, data: result.data });
                })
                .catch(e => {
                    console.log(e);
                    reject();
                });
        });
    },

    /**
     * Get a single account
     * @param id Account id
     * @returns The account with the specified id
     */
    get: function (id: number): Promise<Ok<AccountModel> | NotFound> {
        return new Promise<Ok<AccountModel> | NotFound>((resolve, reject) => {
            axios.get<AccountModel>(rootUrl + '/api/v1/account/' + Number(id), {
                    headers: { authorization: "Bearer: " + token }
                })
                .then(result => {
                    const data = result.data as AccountModel & { balanceString?: string };
                    data.balance = new Decimal(data.balanceString!).div(new Decimal(10000))
                    delete data.balanceString;
                    resolve({ status: 200, data: result.data });
                })
                .catch((e: AxiosError) => {
                    if (e.response?.status == 404) {
                        resolve(NotFoundResult);
                        return;
                    }
                    console.log(e);
                    reject();
                });
        });
    },

    /**
     * Update an existing account
     * @param id The id of the account
     * @param account The new account
     * @returns The updated account
     */
    update: function (id: number, updatedAccount: CreateAccount): Promise<Ok<AccountModel> | NotFound | Forbid> {
        return new Promise<Ok<AccountModel> | NotFound | Forbid>((resolve, reject) => {
            axios.put<AccountModel>(rootUrl + '/api/v1/account/' + Number(id), updatedAccount, {
                    headers: { authorization: "Bearer: " + token }
                })
                .then(result => {
                    resolve({ status: 200, data: result.data });
                })
                .catch((e: AxiosError) => {
                    if (e.response?.status === 404) {
                        resolve(NotFoundResult);
                        return;
                    } else if(e.response?.status === 403) {
                        resolve(ForbidResult);
                        return;
                    }
                    console.log(e);
                    reject();
                });
        });
    },

    /**
     * Create a new account
     * @param account The account to be created
     * @returns The newly created account
     */
    create: function (account: CreateAccount): Promise<Ok<AccountModel>> {
        return new Promise<Ok<AccountModel>>((resolve, reject) => {
            axios.post<AccountModel>(rootUrl + "/api/v1/account", account, {
                    headers: { authorization: "Bearer: " + token }
                })
                .then(result => {
                    resolve({ status: 200, data: result.data });
                })
                .catch(e => {
                    console.log(e);
                    reject();
                });
        });
    },

    /**
     * Deletes an Account
     * @param id The id of the account to delete
     */
     delete: function (id: number): Promise<Ok<null> | Forbid | NotFound> {
        return new Promise<Ok<null> | Forbid | NotFound>((resolve, reject) => {
            axios.delete<void>(rootUrl + "/api/v1/account/" + id, {
                    headers: { authorization: "Bearer: " + token }
                })
                .then(() => resolve({ status: 200, data: null }))
                .catch((e: AxiosError) => {
                    if (e.response?.status == 403) {
                        resolve(ForbidResult);
                        return;
                    } else if (e.response?.status === 404) {
                        resolve(NotFoundResult);
                        return;
                    }
                    console.log(e);
                    reject();
                })
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
    listTransactions: function (id: number, from: number, to: number, descending: boolean, query?: SearchGroup): Promise<Ok<TransactionListResponse> | NotFound> {
        return new Promise<Ok<TransactionListResponse> | NotFound>((resolve, reject) => {
            axios.post<TransactionListResponse>(rootUrl + "/api/v1/account/" + id + "/transactions", {
                from: from,
                to: to,
                descending: descending,
                query: query,
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({
                status: 200,
                data: {
                    ...result.data,
                    total: new Decimal((result.data as any).totalString).div(new Decimal(10000)),
                    data: (result.data.data as (TransactionModel & { totalString: string })[]).map(({ totalString, ...transaction }) => ({
                        ...transaction,
                        total: new Decimal(totalString).div(new Decimal(10000)),
                        dateTime: DateTime.fromISO(transaction.dateTime as any as string),
                        lines: (transaction.lines as (TransactionLine & { amountString: string })[]).map(({ amountString, ...line }) => ({
                            ...line,
                            amount: new Decimal(amountString).div(new Decimal(10000)),
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
     countTransactions: function (id: number, query?: SearchGroup): Promise<Ok<number> | NotFound> {
        return new Promise<Ok<number> | NotFound>((resolve, reject) => {
            axios.post<number>(rootUrl + "/api/v1/account/" + id + "/counttransactions", query, {
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
    getCategorySummary: function (accountId: number, query: SearchGroup): Promise<Ok<{ category: string, revenue: Decimal, expenses: Decimal }[]> | NotFound> {
        return new Promise<Ok<{ category: string, revenue: Decimal, expenses: Decimal }[]> | NotFound>((resolve, reject) => {
            axios.post<{ category: string, revenue: Decimal, expenses: Decimal }[]>(rootUrl + "/api/v1/account/" + accountId + "/categorysummary", query, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({
                status: 200,
                data: result.data.map(obj => ({
                    category: obj.category,
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
    getMovements: function (accountId: number, from: DateTime, to: DateTime, resolution: TimeResolution): Promise<Ok<GetMovementResponse> | NotFound> {
        return new Promise<Ok<GetMovementResponse> | NotFound>((resolve, reject) => {
            axios.post<GetMovementResponse>(rootUrl + "/api/v1/account/" + accountId + "/movements", {
                from: from,
                to: to,
                resolution: resolution
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({
                status: 200,
                data: {
                    ...result.data,
                    initialBalance: new Decimal((result.data as any).initialBalanceString).div(new Decimal(10000)),
                    items: (result.data.items as (MovementItem & { revenueString: string, expensesString: string })[]).map(({ revenueString, expensesString, ...item }) => ({
                        ...item,
                        dateTime: DateTime.fromISO(item.dateTime as any as string),
                        expenses: new Decimal(expensesString).div(new Decimal(10000)),
                        revenue: new Decimal(revenueString).div(new Decimal(10000)),
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
     getMovementsAll: function (from: DateTime, to: DateTime, resolution: TimeResolution): Promise<Ok<GetMovementAllResponse> | NotFound> {
        return new Promise<Ok<GetMovementAllResponse> | NotFound>((resolve, reject) => {
            axios.post<GetMovementAllResponse>(rootUrl + "/api/v1/account/movements", {
                from: from,
                to: to,
                resolution: resolution
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                Object.keys(result.data.items).forEach(key => {
                    let accountId = Number(key);
                    let item = result.data.items[accountId];
                    item.initialBalance = new Decimal((item as any).initialBalanceString).div(new Decimal(10000));
                    item.items = (item.items as (MovementItem & { revenueString: string, expensesString: string })[]).map(({ revenueString, expensesString, ...item }) => ({
                        ...item,
                        dateTime: DateTime.fromISO(item.dateTime as any as string),
                        expenses: new Decimal(expensesString).div(new Decimal(10000)),
                        revenue: new Decimal(revenueString).div(new Decimal(10000)),
                    }))
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

const Transaction = (token: string) => ({
    /**
     * Get a single transaction
     * @param id Transaction id
     * @returns The transaction with the specified id
     */
     get: function (id: number): Promise<Ok<Transaction> | NotFound> {
        return new Promise<Ok<Transaction> | NotFound>((resolve, reject) => {
            axios.get<Transaction>(rootUrl + '/api/v1/transaction/' + Number(id), {
                    headers: { authorization: "Bearer: " + token }
                })
                .then(result => {
                    resolve({ status: 200, data: fixTransaction(result.data) });
                })
                .catch((e: AxiosError) => {
                    if (e.response?.status == 404) {
                        resolve(NotFoundResult);
                    } else {
                        console.log(e);
                        reject();
                    }
                });
        });
    },

    /**
     * Create a new transaction
     * @param transaction The transaction to be created
     * @returns The newly created transaction
     */
    create: function (transaction: CreateTransaction): Promise<Ok<TransactionModel> | BadRequest | Forbid> {
        return new Promise<Ok<TransactionModel> | BadRequest | Forbid>((resolve, reject) => {
            const { total, ...model } = transaction;
            axios.post<TransactionModel>(rootUrl + '/api/v1/transaction', {
                ...model,
                totalString: total.mul(new Decimal(10000)).round().toString(),
                dateTime: DateTime.fromISO(transaction.dateTime as any as string),
                lines: transaction.lines.map(line => ({...line, amount: undefined, amountString: line.amount.mul(new Decimal(10000)).round().toString()}))
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                resolve({ status: 200, data: fixTransaction(result.data) });
            }).catch((e: AxiosError) => {
                if (e.response?.status == 400) {
                    resolve(e.response.data as BadRequest);
                } else if (e.response?.status == 403) {
                    resolve(ForbidResult);
                } else {
                    console.log(e);
                    reject();
                }
            });
        });
    },

    /**
     * Create multiple transactions using a single request
     * @param transactions The transactions to be created
     * @returns An object containing information about transactions successfully created, those with errors and those with duplicate identifiers
     */
    createMany: function (transactions: CreateTransaction[]): Promise<{ succeeded: CreateTransaction[], failed: CreateTransaction[], duplicate: CreateTransaction[] }> {
        return new Promise<{ succeeded: CreateTransaction[], failed: CreateTransaction[], duplicate: CreateTransaction[] }>((resolve, reject) => {
            axios.post<{ succeeded: CreateTransaction[], failed: CreateTransaction[], duplicate: CreateTransaction[] }>(rootUrl + "/api/v1/transaction/createmany",
                transactions.map(transaction => ({
                    ...transaction,
                    total: undefined,
                    totalString: transaction.total.mul(new Decimal(10000)).round().toString(),
                    lines: transaction.lines.map(line => ({...line, amount: undefined, amountString: line.amount.mul(new Decimal(10000)).round().toString()}))
                })), {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({
                    succeeded: result.data.succeeded.map(t => fixTransaction(t) as any as CreateTransaction),
                    failed: result.data.failed.map(t => fixTransaction(t) as any as CreateTransaction),
                    duplicate: result.data.duplicate.map(t => fixTransaction(t) as any as CreateTransaction),
                }))
                .catch(e => {
                    console.log(e);
                    reject();
                })
        });
    },

    /**
     * Updates a transaction
     * @param id The id of the transaction to update
     * @param transaction The changes to make
     * @returns The updated transaction
     */
    update: function (id: number, transaction: UpdateTransaction): Promise<Ok<Transaction> | NotFound | Forbid | BadRequest> {
        return new Promise<Ok<Transaction> | NotFound | Forbid | BadRequest>((resolve, reject) => {
            const { total, ...model } = transaction;
            axios.put<Transaction>(rootUrl + "/api/v1/transaction/" + id, {
                ...model,
                hasUniqueIdentifier: model.identifier !== undefined,
                totalString: transaction.total ? transaction.total.mul(new Decimal(10000)).round().toString() : undefined,
                lines: transaction.lines ? transaction.lines.map(line => ({
                    ...line,
                    amountString: line.amount.mul(new Decimal(10000)).round().toString(),
                    amount: undefined
                })) : undefined
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
                            reject();
                    }
                })
        });
    },

    /**
     * Updates all transactions matching the specified query
     * @param query A query describing which transactions to modify
     * @param transaction The changes to make
     */
     updateMultiple: function (query: SearchGroup, transaction: UpdateTransaction): Promise<Ok<null>> {
        return new Promise<Ok<null>>((resolve, reject) => {
            const { total, ...model } = transaction;
            axios.post<Transaction>(rootUrl + "/api/v1/transaction/updateMultiple", {
                query: query,
                model: {
                    ...model,
                    hasUniqueIdentifier: model.identifier !== undefined,
                    totalString: transaction.total ? transaction.total.mul(new Decimal(10000)).round().toString() : undefined,
                    lines: transaction.lines ? transaction.lines.map(line => ({
                        ...line,
                        amountString: line.amount.mul(new Decimal(10000)).round().toString(),
                        amount: undefined
                    })) : undefined
                }
            }, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({ status: 200, data: null }))
                .catch(e => {
                    console.log(e);
                    reject();
                })
        });
    },
     
    /**
     * Deletes a transaction
     * @param id The id of the transaction to be deleted
     */
    delete: function (id: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            axios.delete<void>(rootUrl + "/api/v1/transaction/" + id, {
                    headers: { authorization: "Bearer: " + token }
                }).then(() => resolve())
                .catch(e => {
                    console.log(e);
                    reject();
                })
        });
    },

    /**
     * Deletes all transactions matching the specified query
     * @param query A query describing which transactions to delete
     */
     deleteMultiple: function (query: SearchGroup): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            axios.delete<Transaction>(rootUrl + "/api/v1/transaction/deleteMultiple", {
                data: query,
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve())
                .catch(e => {
                    console.log(e);
                    reject();
                })
        });
    },

    /**
     * Check for duplicate identifiers
     * @param identifiers Identifiers to check if they are in use
     * @returns A list of identifiers that are already in use
     */
    findDuplicates: function (identifiers: string[]): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            axios.post(rootUrl + "/api/v1/transaction/findduplicates", identifiers, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve(result.data))
                .catch(error => {
                    console.log(error);
                    reject(error);
                });
        });
    },

    search: function (query: SearchRequest): Promise<SearchResponse<TransactionModel>> {
        return new Promise<SearchResponse<TransactionModel>>((resolve, reject) => {
            let fixedQuery = query;
            if (query.query) {
                query.query = fixQuery(query.query);
            }
            axios.post<SearchResponse<TransactionModel>>(rootUrl + "/api/v1/transaction/search", fixedQuery, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => resolve({ ...result.data, data: result.data.data.map(t => fixTransaction(t)) }))
                .catch(error => {
                    console.log(error);
                    reject();
                });
        });

        function fixQuery(query: SearchGroup): SearchGroup {
            switch (query.type) {
                case SearchGroupType.And:
                case SearchGroupType.Or:
                    return {
                        type: query.type,
                        children: query.children.map(child => fixQuery(child))
                    };
                case SearchGroupType.Query:
                    let result: SearchGroup = {
                        type: query.type,
                        query: {
                            ...query.query
                        }
                    };
                    if (query.query.column === "Total") {
                        if (query.query.operator === SearchOperator.In) {
                            result.query.value = (result.query.value as Decimal[]).map(number => number.times(10000).toNumber());
                        } else {
                            result.query.value = (result.query.value as Decimal).times(10000).toNumber();
                        }
                    }
                    return result;
            }
        }
    }
});

/**
 * Converts fields from RAW json into complex javascript types
 * like decimal fields or date fields that are sent as string
 */
function fixTransaction(transaction: Transaction | CreateTransaction): Transaction {
    let { totalString, ...rest } = transaction as Transaction & { totalString: string };
    return {
        ...rest,
        dateTime: DateTime.fromISO(transaction.dateTime as any as string),
        total: new Decimal(totalString).div(new Decimal(10000)),
        lines: (transaction.lines as (TransactionLine & { amountString: string })[]).map(({ amountString, ...line }) => ({
            ...line,
            description: line.description ?? "",
            amount: new Decimal(amountString).div(new Decimal(10000)),
        }))
    };
}

const Taxonomy = (token: string) => ({
    /**
     * Search for accounts
     * @param request Search request specifying which accounts to return
     * @returns A response object with the accounts matching the query
     */
    categoryAutocomplete: function (prefix: string): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            axios.get<string[]>(rootUrl + "/api/v1/taxonomy/categoryautocomplete/" + prefix, {
                headers: { authorization: "Bearer: " + token }
            }).then(result => {
                    resolve(result.data);
                })
                .catch(e => {
                    console.log(e);
                    reject();
                });
        });
    }
});

const ApiClient = (token: string) => ({
    User: User(token),
    Account: Account(token),
    Transaction: Transaction(token),
    Taxonomy: Taxonomy(token),
});
export default ApiClient;

export function useApi() {
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