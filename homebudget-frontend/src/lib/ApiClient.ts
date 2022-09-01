import axios from "axios";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { Account as AccountModel, CreateAccount, GetMovementResponse, MovementItem, TimeResolution } from "../models/account";
import { Preferences as PreferencesModel } from "../models/preferences";
import { SearchGroup, SearchRequest, SearchResponse } from "../models/search";
import { Transaction as TransactionModel, CreateTransaction, TransactionListResponse, TransactionLine, Transaction, UpdateTransaction } from "../models/transaction";

const rootUrl = 'https://localhost:7262';

const Preferences = {

    /**
     * Get preferences for the current user
     * @returns The preferences for the current user
     */
    get: function (): Promise<PreferencesModel> {
        return new Promise<PreferencesModel>((resolve, reject) => {
            axios.get<PreferencesModel>(rootUrl + '/user/preferences')
                .then(result => {
                    resolve(result.data);
                })
                .catch(e => {
                    console.log(e);
                    reject();
                });
        })
    },

    /**
     * Update preferences for the current user
     * @param preferences New preferences
     * @returns Updated preferences
     */
    update: function (preferences: PreferencesModel): Promise<PreferencesModel> {
        return new Promise<PreferencesModel>((resolve, reject) => {
            axios.put<PreferencesModel>(rootUrl + '/user/preferences', preferences)
                .then(result => {
                    resolve(result.data);
                })
                .catch(e => {
                    console.log(e);
                    reject();
                });
        })
    }
};

const Account = {
    /**
     * Search for accounts
     * @param request Search request specifying which accounts to return
     * @returns A response object with the accounts matching the query
     */
    search: function (request: SearchRequest): Promise<SearchResponse<AccountModel>> {
        return new Promise<SearchResponse<AccountModel>>((resolve, reject) => {
            axios.post<SearchResponse<AccountModel>>(rootUrl + "/account/search", request)
                .then(result => {
                    resolve(result.data);
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
    get: function (id: number): Promise<AccountModel> {
        return new Promise<AccountModel>((resolve, reject) => {
            axios.get<AccountModel>(rootUrl + '/account/' + Number(id))
                .then(result => {
                    const data = result.data as AccountModel & { balanceString: string };
                    data.balance = new Decimal(data.balanceString).div(new Decimal(10000))
                    delete data.balanceString;
                    resolve(result.data);
                })
                .catch(e => {
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
    update: function (id: number, updatedAccount: CreateAccount): Promise<AccountModel> {
        return new Promise<AccountModel>((resolve, reject) => {
            axios.put<AccountModel>(rootUrl + '/account/' + Number(id), updatedAccount)
                .then(result => {
                    resolve(result.data);
                })
                .catch(e => {
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
    create: function (account: CreateAccount): Promise<AccountModel> {
        return new Promise<AccountModel>((resolve, reject) => {
            axios.post<AccountModel>(rootUrl + "/account", account)
                .then(result => {
                    resolve(result.data);
                })
                .catch(e => {
                    console.log(e);
                    reject();
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
    listTransactions: function (id: number, from: number, to: number, descending: boolean, query?: SearchGroup): Promise<TransactionListResponse> {
        return new Promise<TransactionListResponse>((resolve, reject) => {
            axios.post<TransactionListResponse>(rootUrl + "/account/" + id + "/transactions", {
                from: from,
                to: to,
                descending: descending,
                query: query,
            }).then(result => resolve({
                ...result.data,
                total: new Decimal((result.data as any).totalString).div(new Decimal(10000)),
                data: (result.data.data as (TransactionModel & { totalString: string })[]).map(({ totalString, ...transaction }) => ({
                    ...transaction,
                    total: new Decimal(totalString).div(new Decimal(10000)),
                    dateTime: DateTime.fromISO(transaction.dateTime as any as string),
                    lines: (transaction.lines as (TransactionLine & { amountString: string})[]).map(({ amountString, ...line }) => ({
                        ...line,
                        amount: new Decimal(amountString).div(new Decimal(10000)),
                    }))
                }))
            })).catch(error => {
                    console.log(error);
                    reject(error);
                });
        });
    },

    getMovements: function (accountId: number, from: DateTime, to: DateTime, resolution: TimeResolution): Promise<GetMovementResponse> {
        return new Promise<GetMovementResponse>((resolve, reject) => {
            axios.post<GetMovementResponse>(rootUrl + "/account/" + accountId + "/movements", {
                from: from,
                to: to,
                resolution: resolution
            }).then(result => resolve({
                ...result.data,
                initialBalance: new Decimal((result.data as any).initialBalanceString).div(new Decimal(10000)),
                items: (result.data.items as (MovementItem & { revenueString: string, expensesString: string })[]).map(({ revenueString, expensesString, ...item }) => ({
                    ...item,
                    dateTime: DateTime.fromISO(item.dateTime as any as string),
                    expenses: new Decimal(expensesString).div(new Decimal(10000)),
                    revenue: new Decimal(revenueString).div(new Decimal(10000)),
                }))
            })).catch(error => {
                    console.log(error);
                    reject(error);
                });
        });
    }
}

const Transaction = {
    /**
     * Create a new transaction
     * @param transaction The transaction to be created
     * @returns The newly created transaction
     */
    create: function (transaction: CreateTransaction): Promise<TransactionModel> {
        return new Promise<TransactionModel>((resolve, reject) => {
            axios.post<TransactionModel>(rootUrl + '/transaction', {
                ...transaction,
                lines: transaction.lines.map(line => ({...line, amount: undefined, amountString: line.amount.mul(new Decimal(10000)).round().toString()}))
            } as CreateTransaction)
                .then(result => {
                    resolve(result.data);
                })
                .catch(e => {
                    console.log(e);
                    reject();
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
            axios.post<{ succeeded: CreateTransaction[], failed: CreateTransaction[], duplicate: CreateTransaction[] }>(rootUrl + "/transaction/createmany",
                transactions.map(transaction => ({
                    ...transaction,
                    lines: transaction.lines.map(line => ({...line, amount: undefined, amountString: line.amount.mul(new Decimal(10000)).round().toString()}))
                }))
            ).then(result => resolve(result.data))
                .catch(e => {
                    console.log(e);
                    reject();
                })
        });
    },

    /**
     * Updates a transaction
     * @param transaction The transactions to be created
     * @returns The updated transaction
     */
    update: function (transaction: UpdateTransaction): Promise<Transaction> {
        return new Promise<Transaction>((resolve, reject) => {
            axios.put<Transaction>(rootUrl + "/transaction/" + transaction.id, {
                ...transaction,
            }).then(result => resolve(result.data))
                .catch(e => {
                    console.log(e);
                    reject();
                })
        });
    },
     
    /**
     * Deletes a transaction
     * @param transaction The transactions to be created
     * @returns The updated transaction
     */
    delete: function (id: number): Promise<Transaction> {
        return new Promise<Transaction>((resolve, reject) => {
            axios.delete<Transaction>(rootUrl + "/transaction/" + id)
                .then(result => resolve(result.data))
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
            axios.post(rootUrl + "/transaction/findduplicates", identifiers)
                .then(result => resolve(result.data))
                .catch(error => {
                    console.log(error);
                    reject(error);
                });
        });
    },

    search: function (query: SearchRequest): Promise<SearchResponse<TransactionModel>> {
        return new Promise<SearchResponse<TransactionModel>>((resolve, reject) => {
            axios.post<SearchResponse<TransactionModel>>(rootUrl + "/transaction/search", query)
                .then(result => {
                    result.data.data = (result.data.data as (TransactionModel & { totalString: string })[]).map(({ totalString, ...transaction }) => ({
                        ...transaction,
                        total: new Decimal(totalString).div(new Decimal(10000)),
                        lines: (transaction.lines as (TransactionLine & { amountString: string })[]).map(({ amountString, ...line }) => ({
                            ...line,
                            amount: new Decimal(amountString).div(new Decimal(10000)),
                        }))
                    }));
                    resolve(result.data)
                }).catch(error => {
                    console.log(error);
                    reject();
                });
        });
    }
};

const Api = {
    Preferences,
    Account,
    Transaction
};

export { Api };