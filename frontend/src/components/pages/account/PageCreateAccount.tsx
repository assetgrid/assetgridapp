import * as React from "react";
import { useNavigate } from "react-router";
import { useApi } from "../../../lib/ApiClient";
import { routes } from "../../../lib/routes";
import { forget } from "../../../lib/Utils";
import { Account, CreateAccount } from "../../../models/account";
import AccountLink from "../../account/AccountLink";
import { userContext } from "../../App";
import Card from "../../common/Card";
import Hero from "../../common/Hero";
import InputButton from "../../input/InputButton";
import InputCheckbox from "../../input/InputCheckbox";
import InputText from "../../input/InputText";
import InputTextMultiple from "../../input/InputTextMultiple";

const defaultAccount = {
    name: "",
    accountNumber: "",
    description: "",
    favorite: true,
    identifiers: [],
    includeInNetWorth: true
};

export default function PageCreateAccount (): React.ReactElement {
    const [value, setValue] = React.useState<CreateAccount>(defaultAccount);
    const [isCreating, setIsCreating] = React.useState(false);
    const { user, updateFavoriteAccounts } = React.useContext(userContext);
    const navigate = useNavigate();
    const [createdAccount, setCreatedAccount] = React.useState<Account | null>(null);
    const [errors, setErrors] = React.useState<{ [key: string]: string[] }>({});
    const api = useApi();

    const allowBack = window.history.state.usr?.allowBack === true;

    return <>
        <Hero title="Create new account" />
        <div className="p-3">
            <Card title="Account details" isNarrow={true}>
                {(createdAccount != null) && <article className="message is-link">
                    <div className="message-body">
                    Account has been created: <AccountLink account={createdAccount} />
                    </div>
                </article>}

                <InputText label="Name"
                    value={value.name}
                    onChange={e => setValue({ ...value, name: e.target.value })}
                    errors={errors.Name}
                    disabled={isCreating} />
                <InputText label="Description"
                    value={value.description}
                    onChange={e => setValue({ ...value, description: e.target.value })}
                    errors={errors.Description}
                    disabled={isCreating} />
                <InputTextMultiple label="Identifiers"
                    value={value.identifiers}
                    onChange={e => setValue({ ...value, identifiers: e })}
                    errors={errors.Identifiers}
                    disabled={isCreating} />
                <InputCheckbox label="Favorite"
                    value={value.favorite}
                    onChange={e => setValue({ ...value, favorite: e.target.checked })}
                    errors={errors.Favorite}
                    disabled={isCreating} />
                <InputCheckbox label="Include in net worth"
                    value={value.includeInNetWorth}
                    onChange={e => setValue({ ...value, includeInNetWorth: e.target.checked })}
                    errors={errors.IncludeInNetWorth}
                    disabled={isCreating} />

                <div className="buttons">
                    <InputButton className="is-primary" onClick={forget(async () => await create(true))} disabled={isCreating || api === null}>Create and stay</InputButton>
                    <InputButton className="is-primary" onClick={forget(async () => await create(false))} disabled={isCreating || api === null}>Create and view account</InputButton>
                    {allowBack && <InputButton onClick={() => navigate(-1)}>Cancel</InputButton>}
                </div>
            </Card>
        </div>
    </>;

    async function create (stay: boolean): Promise<void> {
        if (api === null) return;

        setIsCreating(true);
        setCreatedAccount(null);
        setErrors({});
        const result = await api.Account.create(value);
        setIsCreating(false);

        if (result.status === 200) {
            if (result.data.favorite) {
                if (user !== "fetching") {
                    updateFavoriteAccounts([...user.favoriteAccounts, result.data]);
                }
            }

            if (stay) {
                setValue(defaultAccount);
                setCreatedAccount(result.data);
            } else {
                navigate(routes.account(result.data.id.toString()));
            }
        } else if (result.status === 400) {
            setErrors(result.errors);
        }
    }
}
