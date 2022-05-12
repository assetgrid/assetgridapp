export const routes = {
    dashboard: () => "/",
    importCsv: () => "/import/csv/",
    transactions: () => "/transactions/",
    createTransaction: () => "/transactions/create",
    account: (id: string) => "/account/" + id,
    preferences: () => "/preferences",
};
