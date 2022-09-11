import axios from "axios";
import Decimal from "decimal.js";
import { DateTime } from "luxon";
import { Account as AccountModel, CreateAccount, GetMovementResponse, MovementItem, TimeResolution } from "../models/account";
import { Preferences as PreferencesModel } from "../models/preferences";
import { SearchGroup, SearchGroupType, SearchOperator, SearchRequest, SearchResponse } from "../models/search";
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
    get: function (id: number): Promise<AccountModel | null> {
        return new Promise<AccountModel | null>((resolve, reject) => {
            axios.get<AccountModel>(rootUrl + '/account/' + Number(id))
                .then(result => {
                    const data = result.data as AccountModel & { balanceString: string };
                    if (data) {
                        data.balance = new Decimal(data.balanceString).div(new Decimal(10000))
                        delete data.balanceString;
                        resolve(result.data);
                    } else {
                        resolve(null);
                    }
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

    /**
     * Counts transactions matching a query for the specified account
     * @param id Account id
     * @param query Query to filter transactions
     * @returns The transaction count
     */
     countTransactions: function (id: number, query?: SearchGroup): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            axios.post<number>(rootUrl + "/account/" + id + "/counttransactions", query).then(result => resolve(result.data))
                .catch(error => {
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
    getCategorySummary: function (accountId: number, query: SearchGroup): Promise<{ category: string, revenue: Decimal, expenses: Decimal }[]> {
        return new Promise<{ category: string, revenue: Decimal, expenses: Decimal }[]>((resolve, reject) => {
            axios.post<{ category: string, revenue: Decimal, expenses: Decimal }[]>(rootUrl + "/account/" + accountId + "/categorysummary", query)
            .then(result => resolve(result.data.map(obj => ({
                category: obj.category,
                revenue: new Decimal(obj.revenue).div(new Decimal(10000)),
                expenses: new Decimal(obj.expenses).div(new Decimal(10000))
            }))))
            .catch(error => {
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
            let fixedQuery = query;
            if (query.query) {
                query.query = fixQuery(query.query);
            }
            axios.post<SearchResponse<TransactionModel>>(rootUrl + "/transaction/search", fixedQuery)
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
};

const Taxonomy = {
    /**
     * Search for accounts
     * @param request Search request specifying which accounts to return
     * @returns A response object with the accounts matching the query
     */
    categoryAutocomplete: function (prefix: string): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            axios.get<string[]>(rootUrl + "/taxonomy/categoryautocomplete/" + prefix)
                .then(result => {
                    resolve(result.data);
                })
                .catch(e => {
                    console.log(e);
                    reject();
                });
        });
    }
}

const Api = {
    Preferences,
    Account,
    Transaction,
    Taxonomy,
};

export { Api };