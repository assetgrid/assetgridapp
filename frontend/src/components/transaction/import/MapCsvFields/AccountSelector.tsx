import * as React from "react";
import { useApi } from "../../../../lib/ApiClient";
import { Account } from "../../../../models/account";
import { CsvImportProfile } from "../../../../models/csvImportProfile";
import InputAccount from "../../../account/input/InputAccount";
import Card from "../../../common/Card";
import Tooltip from "../../../common/Tooltip";
import { CsvCreateTransaction } from "../importModels";

interface Props {
    options: CsvImportProfile;
    transactions: CsvCreateTransaction[];
    accounts: Account[];
    setAccounts: (accounts: Account[]) => void;
    setTableFilter: (message: string, filter: ((transaction: CsvCreateTransaction) => boolean)) => void;
}

export default function AccountSelector(props: Props): React.ReactElement {
    const [isUpdating, setIsUpdating] = React.useState(false);
    const api = useApi();

    const identifiers = props.transactions
        .flatMap(x => [x.sourceText, x.destinationText])
        .map(x => x.trim())
        .filter(x => x !== "")
        .filter((a, index, array) => array.findIndex(b => b == a) == index); // Only unique
    
    if (identifiers.length === 0) {
        return <Card title="Accounts" isNarrow={true}>
            <p>No accounts where found in your CSV file. Check that you have selected the correct columns.</p>
        </Card>;
    }
    
    return <Card title="Accounts" isNarrow={true}>
        The following account identifiers where found in the CSV file.
        <table className="table is-fullwidth">
            <thead>
                <tr>
                    <th>Identifier</th>
                    <th>Account</th>
                </tr>
            </thead>
            <tbody>
                {identifiers.map(identifier => <tr key={identifier}>
                    <td>
                        <Tooltip content="Show transactions with this account">
                            <a onClick={() => filterTableForIdentifier(identifier)}>
                                {identifier}
                            </a>
                        </Tooltip>
                    </td>
                    <td><InputAccount value={props.accounts.find(x => x.identifiers.some(id => id === identifier)) ?? null}
                        disabled={api === null || isUpdating}
                        allowNull={true}
                        nullSelectedText={"No account"}
                        onChange={value => accountSelected(identifier, value)}
                        allowCreateNewAccount={true} /></td>
                </tr>)}
            </tbody>
            <tfoot>
                <tr>
                    <th>Identifier</th>
                    <th>Account</th>
                </tr>
            </tfoot>
        </table>
    </Card>;

    function filterTableForIdentifier(identifier: string) {
        props.setTableFilter("Showing transactions with accounts with identifier '" + identifier + "'.",
            x => x.sourceText === identifier || x.destinationText === identifier)
    }
    
    async function accountSelected(identifier: string, account: Account | null) {
        if (api === null) return;
        
        setIsUpdating(true);

        let newAccounts = [...props.accounts];
        const currentAccount = props.accounts.find(x => x.identifiers.some(id => id === identifier)) ?? null;
        if (currentAccount !== null) {
            // Remove this identifier from the currently selected account
            const result = await api.Account.update(currentAccount.id, {
                ...currentAccount,
                identifiers: currentAccount.identifiers.filter(x => x != identifier)
            });
            
            // Update current accounts
            if (result.status === 200) {
                newAccounts.forEach(account => {
                    if (account.id === result.data.id) {
                        account.identifiers = account.identifiers.filter(x => x !== identifier);
                    }
                })
            }
        }
        // Add the identifier to the newly selected account
        if (account !== null) {
            const result = await api.Account.update(account.id, {
                ...account,
                identifiers: account.identifiers.concat(identifier)
            });

            // Update current accounts
            if (result.status === 200) {
                const previousAccount = newAccounts.find(account => account.id === result.data.id);
                if (previousAccount) {
                    previousAccount.identifiers = account.identifiers.concat(identifier);
                } else {
                    newAccounts.push(result.data);
                }
            }
        }

        setIsUpdating(false);
        props.setAccounts(newAccounts);
    }
}