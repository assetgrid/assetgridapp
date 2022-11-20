import * as React from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../../../../lib/ApiClient";
import { forget } from "../../../../lib/Utils";
import { Account } from "../../../../models/account";
import { CsvImportProfile } from "../../../../models/csvImportProfile";
import InputAccount from "../../../account/input/InputAccount";
import Card from "../../../common/Card";
import Table from "../../../common/Table";
import Tooltip from "../../../common/Tooltip";
import { CsvCreateTransaction } from "../importModels";

interface Props {
    options: CsvImportProfile
    transactions: CsvCreateTransaction[]
    accounts: Account[]
    setAccounts: (accounts: Account[]) => void
    setTableFilter: (message: string, filter: ((transaction: CsvCreateTransaction) => boolean)) => void
}

export default function AccountSelector (props: Props): React.ReactElement {
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const api = useApi();
    const { t } = useTranslation();

    const identifiers = React.useMemo(() => props.transactions
        .flatMap(x => [x.sourceText, x.destinationText])
        .map(x => x.trim())
        .filter(x => x !== "")
        .filter((a, index, array) => array.findIndex(b => b === a) === index), // Only unique
    [props.transactions]);

    if (identifiers.length === 0) {
        return <Card title={t("common.accounts")!} isNarrow={true}>
            <p>{t("import.no_accounts_found_in_csv")!}</p>
        </Card>;
    }

    return <Card title={t("common.accounts")!} isNarrow={true}>
        {t("import.the_following_account_identifiers_found_in_csv")!}
        <Table pageSize={10}
            renderItem={(identifier, i) => <tr key={identifier}>
                <td>
                    <Tooltip content={t("import.show_transactions_for_account")}>
                        <a onClick={() => filterTableForIdentifier(identifier)}>
                            {identifier}
                        </a>
                    </Tooltip>
                </td>
                <td>
                    <InputAccount value={props.accounts.find(x => x.identifiers.some(id => id === identifier))?.id ?? null}
                        disabled={api === null || isUpdating}
                        allowNull={true}
                        nullSelectedText={t("common.no_account")!}
                        onChange={forget(async value => await accountSelected(identifier, value))}
                        allowCreateNewAccount={true}
                    />
                </td>
            </tr>}
            page={page}
            goToPage={setPage}
            headings={<tr>
                <th>{t("account.identifier")!}</th>
                <th>{t("common.account")!}</th>
            </tr>} items={identifiers} />
    </Card>;

    function filterTableForIdentifier (identifier: string): void {
        props.setTableFilter(t("import.showing_transactions_with_identifier", { identifier }),
            x => x.sourceText === identifier || x.destinationText === identifier);
    }

    async function accountSelected (identifier: string, account: Account | null): Promise<void> {
        if (api === null) return;

        setIsUpdating(true);

        const newAccounts = [...props.accounts];
        const currentAccount = props.accounts.find(x => x.identifiers.some(id => id === identifier)) ?? null;
        if (currentAccount !== null) {
            // Remove this identifier from the currently selected account
            const result = await api.Account.update(currentAccount.id, {
                ...currentAccount,
                identifiers: currentAccount.identifiers.filter(x => x !== identifier)
            });

            // Update current accounts
            newAccounts.forEach(account => {
                if (account.id === result.id) {
                    account.identifiers = account.identifiers.filter(x => x !== identifier);
                }
            });
        }
        // Add the identifier to the newly selected account
        if (account !== null) {
            const result = await api.Account.update(account.id, {
                ...account,
                identifiers: account.identifiers.concat(identifier)
            });

            // Update current accounts
            const previousAccount = newAccounts.find(account => account.id === result.id);
            if (previousAccount != null) {
                previousAccount.identifiers = account.identifiers.concat(identifier);
            } else {
                newAccounts.push(result);
            }
        }

        setIsUpdating(false);
        props.setAccounts(newAccounts);
    }
}
