export const routes = {
    dashboard: () => "/",
    importCsv: () => "/import/csv/",
    transactions: () => "/transactions/",
    transaction: (id: string) => "/transaction/" + id,
    transactionEditMultiple: () => "/transaction/editmultiple",
    createTransaction: () => "/transactions/create",
    account: (id: string) => "/account/" + id,
    accounts: () => "/accounts/",
    accountDelete: (id: string) => "/account/" + id + "/delete",
    preferences: () => "/preferences",
};
