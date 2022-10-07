export const routes = {
    dashboard: () => "/",
    importCsv: () => "/import/csv/",
    transactions: () => "/transactions/",
    transaction: (id: string) => "/transaction/" + id,
    transactionEditMultiple: () => "/transaction/editmultiple",
    transactionCreate: () => "/transaction/create",
    accounts: () => "/accounts/",
    account: (id: string) => "/account/" + id,
    accountCreate: () => "/account/create",
    accountDelete: (id: string) => "/account/" + id + "/delete",
    preferences: () => "/preferences",
    login: () => "/login",
    signup: () => "/signup",
    profile: () => "/user/profile"
};
