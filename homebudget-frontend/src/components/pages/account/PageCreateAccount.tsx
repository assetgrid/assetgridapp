import * as React from "react";
import { useNavigate } from "react-router";
import { Api } from "../../../lib/ApiClient";
import { routes } from "../../../lib/routes";
import { Account, CreateAccount } from "../../../models/account";
import AccountLink from "../../account/AccountLink";
import { preferencesContext } from "../../App";
import Card from "../../common/Card";
import Hero from "../../common/Hero";
import InputButton from "../../input/InputButton";
import InputCheckbox from "../../input/InputCheckbox";
import InputText from "../../input/InputText";

const defaultAccount = {
    name: "",
    accountNumber: "",
    description: "",
    favorite: true,
    includeInNetWorth: true,
};

export default function () {
    const [value, setValue] = React.useState<CreateAccount>(defaultAccount);
    const [isCreating, setIsCreating] = React.useState(false);
    const { preferences, updatePreferences } = React.useContext(preferencesContext);
    const navigate = useNavigate();
    const [createdAccount, setCreatedAccount] = React.useState<Account | null>(null);

    const allowBack = window.history.state.usr?.allowBack === true;

    return <>
        <Hero title="Create new account" />
        <div className="p-3">
            <Card title="Account details" isNarrow={true}>
                {createdAccount && <article className="message is-link">
                    <div className="message-body">
                    Account has been created: <AccountLink account={createdAccount} />
                    </div>
                </article>}

                <InputText label="Name"
                    value={value.name}
                    onChange={e => setValue({ ...value, name: e.target.value })}
                    disabled={isCreating} />
                <InputText label="Description"
                    value={value.description}
                    onChange={e => setValue({ ...value, description: e.target.value })}
                    disabled={isCreating} />
                <InputText label="Account number"
                    value={value.accountNumber}
                    onChange={e => setValue({ ...value, accountNumber: e.target.value })}
                    disabled={isCreating} />
                <InputCheckbox label="Favorite"
                    value={value.favorite}
                    onChange={e => setValue({ ...value, favorite: e.target.checked })}
                    disabled={isCreating} />  
                <InputCheckbox label="Include in net worth"
                    value={value.includeInNetWorth}
                    onChange={e => setValue({ ...value, includeInNetWorth: e.target.checked })}
                    disabled={isCreating} />  

                <div className="buttons">
                    <InputButton className="is-primary" onClick={() => create(true)} disabled={isCreating}>Create and stay</InputButton>
                    <InputButton className="is-primary" onClick={() => create(false)} disabled={isCreating}>Create and view account</InputButton>
                    {allowBack && <InputButton onClick={() => navigate(-1)}>Cancel</InputButton>}
                </div>
            </Card>
        </div>
    </>;

    async function create(stay: boolean) {
        setIsCreating(true);
        setCreatedAccount(null);
        const result = await Api.Account.create(value);
        setIsCreating(false);
        if (result.favorite) {
            if (preferences === "fetching") {
                updatePreferences(null);
            } else {
                updatePreferences({
                    ...preferences,
                    favoriteAccounts: [...preferences.favoriteAccounts, result]
                });
            }
        }
        
        if (stay) {
            setValue(defaultAccount);
            setCreatedAccount(result);
        } else {
            navigate(routes.account(result.id.toString()));
        }
    }
}
